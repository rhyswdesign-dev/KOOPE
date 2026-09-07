/**
 * Taste Vector Service — turns behaviour into the canonical taste profile.
 *
 * This is the layer the app was missing. All the parts existed already:
 *   - three event streams (made_events, scan_events, recipe_signals),
 *   - a decay/confidence engine (tasteGraphService),
 *   - a persisted profile column (users_profiles.taste_profile),
 * but nothing read the events and wrote the profile, so the engine ran on
 * data that was recreated from scratch on every screen load.
 *
 * Everything is expressed in the canonical 7-axis vocabulary — see
 * utils/flavorTaxonomy.ts for why that one won and how the richer scan
 * vocabulary maps down onto it.
 *
 * Spec: MixedMindOS/Products/KOOPE/Product/Taste-Learning-Redesign-2026-07.md
 */

import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';
import type { FlavorProfile, Spirit, TasteProfile } from '../types/userProfile';
import {
  CANONICAL_FLAVORS,
  CANONICAL_SPIRITS,
  bottleFlavorsToCanonical,
  extractRecipeFlavorVector,
} from '../utils/flavorTaxonomy';
import { getRecentRecipeSignals, type RecipeSignal } from './recipeSignalService';
import {
  hydrateTasteGraph,
  toPersistedTasteProfile,
  type TasteGraphData,
} from './tasteGraphService';
import { loadUserProfile, updateUserProfileFields } from './userProfileService';
import { ALL_COCKTAILS } from '../data/cocktails';
import { SPIRITS_DATABASE } from '../data/spiritsDatabase';
import { useWishlist } from '../store/useWishlist';

// Local catalogs keyed by id — the same fallback pattern makeLogService uses,
// because only user-created recipes live in the `recipes` table.
const COCKTAIL_BY_ID = new Map<string, any>(ALL_COCKTAILS.map((c: any) => [c.id, c]));
const SPIRIT_BY_ID = new Map<string, any>(SPIRITS_DATABASE.map((s: any) => [s.id, s]));

// ── Signal weights ───────────────────────────────────────────────────────────
//
// The hierarchy the spec calls for: made-it/rated >> saved >> shelf-add >>
// thumbs >> scan >> view. Negative signals carry real weight because dislike
// was previously almost never captured — a user who thumbs-downs three smoky
// drinks should stop being shown smoky drinks.

const SIGNAL_WEIGHTS: Record<string, number> = {
  made: 5,
  save: 3,
  owned: 3,
  scan_owned: 2.5,
  thumbs_up: 2,
  wanted: 1.5,
  scan_wanted: 1.5,
  scan: 0.5,
  view: 0.25,
  unsave: -2,
  scan_passed: -0.5,
  thumbs_down: -3,
  dismiss: -3,
};

/**
 * A 1-5 rating on a make modulates its weight: 5 stars is a much stronger
 * endorsement than a grudging 2. Unrated makes keep the base weight.
 */
function ratingMultiplier(rating: number | null | undefined): number {
  if (rating == null) return 1;
  // 1 -> -1.0, 2 -> -0.5, 3 -> 0.5, 4 -> 1.0, 5 -> 1.5
  const map: Record<number, number> = { 1: -1, 2: -0.5, 3: 0.5, 4: 1, 5: 1.5 };
  return map[rating] ?? 1;
}

/**
 * Recency weighting: a signal from today counts fully, one from six months
 * ago counts much less. Deliberately gentler than tasteGraphService's
 * read-time decay so the two don't compound into near-zero.
 */
function recencyWeight(isoDate: string): number {
  const days = (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
  if (!Number.isFinite(days) || days <= 0) return 1;
  return Math.max(0.25, Math.exp(-0.0075 * days));
}

interface Accumulator {
  flavors: Record<string, number>;
  spirits: Record<string, number>;
  flavorCounts: Record<string, number>;
  spiritCounts: Record<string, number>;
  flavorLastSeen: Record<string, string>;
  spiritLastSeen: Record<string, string>;
  total: number;
}

function emptyAccumulator(): Accumulator {
  return {
    flavors: {},
    spirits: {},
    flavorCounts: {},
    spiritCounts: {},
    flavorLastSeen: {},
    spiritLastSeen: {},
    total: 0,
  };
}

function addFlavor(acc: Accumulator, flavor: string, weight: number, at: string) {
  acc.flavors[flavor] = (acc.flavors[flavor] ?? 0) + weight;
  acc.flavorCounts[flavor] = (acc.flavorCounts[flavor] ?? 0) + 1;
  if (!acc.flavorLastSeen[flavor] || at > acc.flavorLastSeen[flavor]) {
    acc.flavorLastSeen[flavor] = at;
  }
}

function addSpirit(acc: Accumulator, spirit: string, weight: number, at: string) {
  acc.spirits[spirit] = (acc.spirits[spirit] ?? 0) + weight;
  acc.spiritCounts[spirit] = (acc.spiritCounts[spirit] ?? 0) + 1;
  if (!acc.spiritLastSeen[spirit] || at > acc.spiritLastSeen[spirit]) {
    acc.spiritLastSeen[spirit] = at;
  }
}

/** Apply one recipe-shaped event to the accumulator. */
function applyRecipeEvent(acc: Accumulator, recipeId: string, weight: number, at: string) {
  const recipe = COCKTAIL_BY_ID.get(recipeId);
  if (!recipe) return;

  const recency = recencyWeight(at);
  const effective = weight * recency;
  if (effective === 0) return;

  const vector = extractRecipeFlavorVector(recipe);
  for (const flavor of CANONICAL_FLAVORS) {
    const intensity = vector[flavor] ?? 0;
    if (intensity > 0) addFlavor(acc, flavor, effective * intensity, at);
  }

  const spirit = String(recipe.baseSpirit || recipe.base || '').toLowerCase();
  if (spirit) addSpirit(acc, spirit, effective, at);

  acc.total += 1;
}

/** Apply one scan event to the accumulator. */
function applyScanEvent(
  acc: Accumulator,
  bottleId: string | null,
  outcome: string | null,
  at: string,
) {
  const bottle = bottleId ? SPIRIT_BY_ID.get(bottleId) : null;
  if (!bottle) return;

  const key =
    outcome === 'owned'
      ? 'scan_owned'
      : outcome === 'wanted'
        ? 'scan_wanted'
        : outcome === 'passed'
          ? 'scan_passed'
          : 'scan';
  const effective = (SIGNAL_WEIGHTS[key] ?? 0) * recencyWeight(at);
  if (effective === 0) return;

  for (const flavor of bottleFlavorsToCanonical(bottle.flavorProfile || [])) {
    addFlavor(acc, flavor, effective, at);
  }

  const type = String(bottle.type || '').toLowerCase();
  if (type) addSpirit(acc, type, effective, at);

  acc.total += 1;
}

/**
 * Apply a bottle the user holds a standing position on — owns it, or wants it.
 *
 * Shelf and wishlist are read as STATE, not as events, and that is deliberate.
 * Instrumenting the add-action would only ever capture bottles added from now
 * on, and only via the paths we remembered to wire. Reading the standing list
 * captures the whole shelf — including bottles added manually, imported, or
 * added before any of this existed — so an established user gets a real
 * profile immediately instead of starting from nothing.
 *
 * It is also the truer signal: that you still own a bottle today says more
 * than the fact you once added it.
 */
function applyHoldingEvent(
  acc: Accumulator,
  bottleName: string,
  category: string | null | undefined,
  weightKey: 'owned' | 'wanted',
  at: string,
) {
  const weight = SIGNAL_WEIGHTS[weightKey] ?? 0;
  // Holdings decay far more slowly than a one-off interaction — a bottle on
  // your shelf is a continuing statement, not a moment.
  const effective = weight * Math.max(0.6, recencyWeight(at));
  if (effective === 0) return;

  // Resolve against the catalog by id or name; fall back to the free-text
  // category so a manually typed "Laphroaig 10" still lands as whisky.
  const bottle =
    SPIRIT_BY_ID.get(bottleName) ??
    SPIRITS_DATABASE.find(
      (s: any) => String(s.name || '').toLowerCase() === String(bottleName || '').toLowerCase(),
    );

  if (bottle) {
    for (const flavor of bottleFlavorsToCanonical(bottle.flavorProfile || [])) {
      addFlavor(acc, flavor, effective, at);
    }
  }

  const type = String(bottle?.type || category || '').toLowerCase();
  if (type) addSpirit(acc, type, effective, at);

  if (bottle || type) acc.total += 1;
}

/**
 * Normalise accumulated raw scores into 0-1 weights. Negative totals clamp to
 * zero — an actively disliked axis should sit at the floor, not go negative
 * and corrupt the cosine similarity in tasteMatchService.
 */
function normalise(scores: Record<string, number>, keys: string[]): Record<string, number> {
  const positive = keys.map((k) => Math.max(0, scores[k] ?? 0));
  const max = Math.max(...positive, 0);
  const out: Record<string, number> = {};
  keys.forEach((k, i) => {
    out[k] = max > 0 ? positive[i] / max : 0;
  });
  return out;
}

/**
 * Compute a TasteGraphData from the user's event history.
 *
 * `priorProfile` is blended in as a low-confidence seed so a brand-new user
 * still gets sensible recommendations: stated preference dominates until
 * behaviour accumulates, then behaviour takes over. Confidence per axis is
 * derived from interaction count, which is exactly what tasteGraphService's
 * radar chart already expects.
 */
export async function computeTasteVector(
  userId: string,
  priorProfile?: TasteProfile | null,
): Promise<TasteGraphData | null> {
  if (!userId) return null;

  const acc = emptyAccumulator();

  try {
    const [makes, scans, signals, inventory] = await Promise.all([
      supabase
        .from('made_events')
        .select('recipe_id, made_at, rating')
        .eq('user_id', userId)
        .order('made_at', { ascending: false })
        .limit(200)
        .then(({ data, error }) => (error ? [] : (data ?? [])))
        .then((d) => d as any[]),
      supabase
        .from('scan_events')
        .select('bottle_id, outcome, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200)
        .then(({ data, error }) => (error ? [] : (data ?? [])))
        .then((d) => d as any[]),
      getRecentRecipeSignals(userId, 200),
      // Standing holdings, read as state. See applyHoldingEvent.
      supabase
        .from('user_inventory')
        .select('item_name, category, added_at')
        .eq('user_id', userId)
        .limit(300)
        .then(({ data, error }) => (error ? [] : (data ?? [])))
        .then((d) => d as any[]),
    ]);

    for (const row of makes) {
      const weight = SIGNAL_WEIGHTS.made * ratingMultiplier(row.rating);
      applyRecipeEvent(acc, row.recipe_id, weight, row.made_at);
    }

    for (const row of scans) {
      applyScanEvent(acc, row.bottle_id ?? null, row.outcome ?? null, row.created_at);
    }

    for (const sig of signals) {
      const weight = SIGNAL_WEIGHTS[sig.signal as RecipeSignal] ?? 0;
      applyRecipeEvent(acc, sig.recipeId, weight, sig.createdAt);
    }

    // The shelf. Previously invisible unless the bottle arrived via a scan —
    // manually added bottles taught the profile nothing at all.
    for (const row of inventory) {
      applyHoldingEvent(acc, row.item_name, row.category, 'owned', row.added_at);
    }

    // The wishlist. Device-local (AsyncStorage, no server sync), so it is read
    // from the store here rather than fetched — this runs client-side.
    try {
      for (const item of useWishlist.getState().items) {
        applyHoldingEvent(acc, item.name, item.type, 'wanted', item.dateSaved);
      }
    } catch {
      // Store unavailable (e.g. running outside the app) — holdings are
      // additive, so skipping them degrades the profile rather than breaking it.
    }
  } catch (error) {
    log.error('tasteVectorService', 'Failed to read event streams', error as Error);
    return null;
  }

  if (acc.total === 0) return null; // No behaviour yet — leave the prior alone.

  const learnedFlavors = normalise(acc.flavors, CANONICAL_FLAVORS);
  const learnedSpirits = normalise(acc.spirits, CANONICAL_SPIRITS);

  // Confidence-blended priors: prior * (1 - c) + learned * c.
  //
  // `c` is deliberately GLOBAL (total interactions), not per-axis. Per-axis
  // confidence looks more precise but is actively wrong: an axis the user
  // never engages with would have count 0, hence confidence 0, hence keep its
  // onboarding answer forever. "I like citrus" said once at signup would
  // survive a year of making nothing but smoky drinks — exactly the
  // not-learning failure this service exists to fix.
  //
  // Given plenty of evidence overall, *absence* of engagement with an axis is
  // itself evidence about that axis. Per-axis counts are still tracked, and
  // still drive the radar chart's per-dimension confidence display.
  const confidence = Math.min(1, acc.total / 25);
  const blend = (prior: number, learned: number): number =>
    prior * (1 - confidence) + learned * confidence;

  const flavorWeights = {} as Record<FlavorProfile, number>;
  for (const flavor of CANONICAL_FLAVORS) {
    const prior = priorProfile?.flavorWeights?.[flavor] ?? 0.3;
    flavorWeights[flavor] = blend(prior, learnedFlavors[flavor] ?? 0);
  }

  const spiritWeights = {} as Record<Spirit, number>;
  for (const spirit of CANONICAL_SPIRITS) {
    const prior = priorProfile?.spiritWeights?.[spirit] ?? 0.25;
    spiritWeights[spirit] = blend(prior, learnedSpirits[spirit] ?? 0);
  }

  return {
    rawProfile: {
      flavorWeights,
      spiritWeights,
      preferredABV: priorProfile?.preferredABV ?? { min: 0, max: 40 },
      preferredComplexity: priorProfile?.preferredComplexity ?? 0.5,
    },
    timestamps: {
      flavors: acc.flavorLastSeen as any,
      spirits: acc.spiritLastSeen as any,
    },
    interactionCounts: {
      flavors: acc.flavorCounts as any,
      spirits: acc.spiritCounts as any,
      total: acc.total,
    },
  };
}

/**
 * Recompute the taste vector from behaviour and persist it.
 *
 * Called fire-and-forget after a signal is logged — at this scale a
 * client-side recompute is cheaper than standing up an Edge Function, and it
 * keeps the profile fresh without a scheduled job. Never throws.
 */
export async function recomputeAndPersistTasteVector(userId: string): Promise<void> {
  if (!userId) return;

  try {
    const existing = await loadUserProfile(userId).catch(() => null);
    const prior = existing?.tasteProfile ?? null;

    const graph = await computeTasteVector(userId, prior);
    if (!graph) return;

    // Preserve any PRO manual overrides the user has pinned — learned data
    // must never silently overwrite an explicit slider setting.
    const previousGraph = hydrateTasteGraph(prior);
    if (previousGraph?.overrides) graph.overrides = previousGraph.overrides;

    await updateUserProfileFields(userId, {
      tasteProfile: toPersistedTasteProfile(graph) as any,
    } as any);

    log.debug('tasteVectorService', 'Taste vector recomputed', {
      interactions: graph.interactionCounts.total,
    });
  } catch (error) {
    log.error('tasteVectorService', 'Failed to recompute taste vector', error as Error);
  }
}
