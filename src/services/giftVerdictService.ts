/**
 * Gift Verdict Service
 *
 * Pure, synchronous helpers backing the Answer Card's Gift mode (Phase 1.1).
 * No store/network access — everything here is computed from values the
 * caller (BottleDetailScreen) already has: the bottle's normalized spirit
 * token, its flavor-profile words, the already-computed price range, and
 * the two answers from the lightweight "who's this for" chip questionnaire.
 *
 * Deliberately v1-simple: this is framing copy and a client-side recipe
 * re-filter, not a scoring model. Nothing here blocks an action or requires
 * new data — see docs/KOOPE-SCANNER-ANSWER-CARD-SPEC.md Part B and
 * KOOPE-ENGINEERING-WORKPLAN.md's 1.1 for the product intent.
 */

import type { FlavorProfile } from '../types/userProfile';

export interface GiftPreference {
  /** Normalized spirit token from Q1 ("What do they usually drink?"), e.g. 'whiskey'. */
  spiritHint?: string;
  /** FlavorProfile tag from Q2 ("How do they like it?"). */
  flavorHint?: FlavorProfile;
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface GiftVerdictInput {
  spiritToken: string;
  /** Bottle's flavor-profile display words (e.g. ["Juniper", "Citrus", "Botanical"]). */
  flavorWords: string[];
  priceRange: PriceRange | null;
  preference: GiftPreference;
}

export interface GiftVerdict {
  headline: string;
  body: string;
}

/**
 * Does any of the bottle's flavor-profile words plausibly match a
 * FlavorProfile tag? Simple case-insensitive substring check — the bottle's
 * words are free-text display strings (from spiritsDatabase / Claude lookup),
 * not already normalized to the 7-tag taxonomy, so exact equality would miss
 * real matches (e.g. a gin's "Citrus" word vs. the 'citrus' tag).
 */
function flavorWordsMatchTag(flavorWords: string[], tag: FlavorProfile): boolean {
  return flavorWords.some((word) => word.toLowerCase().includes(tag));
}

function priceTierFraming(priceRange: PriceRange | null): string | null {
  if (!priceRange) return null;
  if (priceRange.max <= 30) return 'a great low-key gift';
  if (priceRange.max >= 80) return 'a thoughtful splurge';
  return 'a safe crowd-pleaser';
}

export function computeGiftVerdict({
  spiritToken,
  flavorWords,
  priceRange,
  preference,
}: GiftVerdictInput): GiftVerdict {
  const spiritMatch = Boolean(preference.spiritHint && preference.spiritHint === spiritToken);
  const flavorMatch = Boolean(
    preference.flavorHint && flavorWordsMatchTag(flavorWords, preference.flavorHint),
  );
  const tierFraming = priceTierFraming(priceRange);

  let headline: string;
  if (spiritMatch && flavorMatch) {
    headline = 'A great pick — right in their lane.';
  } else if (spiritMatch || flavorMatch) {
    headline = 'Good instincts — this lines up with what they like.';
  } else if (preference.spiritHint || preference.flavorHint) {
    headline = "A safe bet, even if it's not their usual.";
  } else {
    headline = 'A solid gift bottle.';
  }

  const bodyParts: string[] = [];
  if (tierFraming) bodyParts.push(tierFraming.charAt(0).toUpperCase() + tierFraming.slice(1) + '.');
  if (!spiritMatch && !flavorMatch && (preference.spiritHint || preference.flavorHint)) {
    bodyParts.push("Different from what they usually reach for, but that's part of a good gift.");
  }

  return {
    headline,
    body: bodyParts.join(' ') || 'A dependable choice for most tastes.',
  };
}

export function filterRecipesForGift<T extends { flavorProfiles?: FlavorProfile[] }>(
  recipes: T[],
  preference: GiftPreference,
): T[] {
  if (!preference.flavorHint) return recipes;
  const matches = recipes.filter((recipe) =>
    recipe.flavorProfiles?.includes(preference.flavorHint as FlavorProfile),
  );
  return matches.length > 0 ? matches : recipes;
}
