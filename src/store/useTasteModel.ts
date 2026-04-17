/**
 * Taste Model Store
 *
 * Built from scan behaviour — parallel to TasteGraphService (which is
 * recipe-interaction based). This model tracks what you scan and add to
 * your shelf to infer your flavour preferences without any manual setup.
 *
 * Score rules:
 *   - Each scan of a bottle:          +2 to all matching flavour tags
 *   - Add to shelf (owned):           +3 additional to matching tags
 *   - Thumbs up:                      +3 to matching tags
 *   - Thumbs down + correction tag:   -5 off identified tag, +2 on correction
 *
 * Scores are clamped 0–100.
 * dominantCluster: top 2–3 tags by score, recalculated on each update.
 * profileVisible: true once totalScans >= 5.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Spirit } from '../data/spiritsDatabase';

// ── Canonical flavour tags ────────────────────────────────────────────────────

export type FlavourTag =
  | 'smoky' | 'peaty' | 'citrus' | 'floral' | 'sweet' | 'bitter'
  | 'herbal' | 'spiced' | 'aged' | 'rich' | 'light' | 'botanical'
  | 'fruity' | 'nutty' | 'creamy' | 'earthy' | 'briny' | 'dry';

export const ALL_FLAVOUR_TAGS: FlavourTag[] = [
  'smoky', 'peaty', 'citrus', 'floral', 'sweet', 'bitter',
  'herbal', 'spiced', 'aged', 'rich', 'light', 'botanical',
  'fruity', 'nutty', 'creamy', 'earthy', 'briny', 'dry',
];

// ── Normalise bottle flavour strings → canonical tags ────────────────────────
// Maps common profile words (from spiritsDatabase.flavorProfile) to our tags.

export const FLAVOUR_NORMALISE_MAP: Record<string, FlavourTag> = {
  // Smoky / Peaty
  smoke: 'smoky', smoky: 'smoky', smoked: 'smoky',
  peat: 'peaty', peaty: 'peaty', peatsmoke: 'peaty',
  // Citrus
  citrus: 'citrus', lemon: 'citrus', lime: 'citrus', orange: 'citrus',
  grapefruit: 'citrus', zesty: 'citrus',
  // Floral
  floral: 'floral', flower: 'floral', rose: 'floral', violet: 'floral', lavender: 'floral',
  // Sweet
  sweet: 'sweet', honey: 'sweet', vanilla: 'sweet', caramel: 'sweet',
  toffee: 'sweet', chocolate: 'sweet', maple: 'sweet', molasses: 'sweet',
  // Bitter
  bitter: 'bitter', bittersweet: 'bitter', dark: 'bitter', espresso: 'bitter',
  coffee: 'bitter', cocoa: 'bitter',
  // Herbal
  herbal: 'herbal', herb: 'herbal', mint: 'herbal', eucalyptus: 'herbal',
  green: 'herbal', grassy: 'herbal', vegetal: 'herbal',
  // Spiced
  spiced: 'spiced', spice: 'spiced', pepper: 'spiced', cinnamon: 'spiced',
  clove: 'spiced', nutmeg: 'spiced', ginger: 'spiced', anise: 'spiced',
  // Aged / Oak
  aged: 'aged', oak: 'aged', woody: 'aged', toasted: 'aged', wood: 'aged',
  cedar: 'aged',
  // Rich
  rich: 'rich', full: 'rich', heavy: 'rich', robust: 'rich', dense: 'rich',
  // Light
  light: 'light', clean: 'light', crisp: 'light', delicate: 'light',
  neutral: 'light', smooth: 'light',
  // Botanical
  botanical: 'botanical', juniper: 'botanical', cardamom: 'botanical',
  coriander: 'botanical', angelica: 'botanical',
  // Fruity
  fruity: 'fruity', fruit: 'fruity', apple: 'fruity', pear: 'fruity',
  peach: 'fruity', tropical: 'fruity', berry: 'fruity', cherry: 'fruity',
  banana: 'fruity', mango: 'fruity', pineapple: 'fruity', dried: 'fruity',
  // Nutty
  nutty: 'nutty', nut: 'nutty', almond: 'nutty', walnut: 'nutty',
  hazelnut: 'nutty',
  // Creamy
  creamy: 'creamy', cream: 'creamy', buttery: 'creamy', silky: 'creamy',
  // Earthy
  earthy: 'earthy', earth: 'earthy', mineral: 'earthy', soil: 'earthy',
  mushroom: 'earthy',
  // Briny
  briny: 'briny', brine: 'briny', saline: 'briny', coastal: 'briny',
  maritime: 'briny', salty: 'briny', sea: 'briny',
  // Dry
  dry: 'dry', tart: 'dry', tannic: 'dry', astringent: 'dry',
};

export function normaliseFlavours(rawTags: string[]): FlavourTag[] {
  const result = new Set<FlavourTag>();
  for (const raw of rawTags) {
    const key = raw.toLowerCase().replace(/[^a-z]/g, '');
    const mapped = FLAVOUR_NORMALISE_MAP[key];
    if (mapped) result.add(mapped);
  }
  return Array.from(result);
}

// ── Thumbs signal ─────────────────────────────────────────────────────────────

interface ThumbsSignal {
  bottleId: string;
  direction: 'up' | 'down';
  correctionTag?: FlavourTag;
  recordedAt: string; // ISO
}

// ── Store shape ───────────────────────────────────────────────────────────────

export interface TasteModel {
  flavourScores: Partial<Record<FlavourTag, number>>;
  totalScans: number;
  shelfScans: number;       // scans where user added to shelf
  discoveryScans: number;   // scans without shelf add
  thumbsSignals: ThumbsSignal[];
  dominantCluster: FlavourTag[];
  profileVisible: boolean;  // true once totalScans >= 5
}

interface TasteModelState extends TasteModel {
  recordScan: (bottle: Spirit | { flavorProfile: string[] }, addedToShelf: boolean) => void;
  recordThumbsUp: (bottle: Spirit | { flavorProfile: string[] }) => void;
  recordThumbsDown: (bottle: Spirit | { flavorProfile: string[] }, correctionTag: FlavourTag, bottleId?: string) => void;
  getDominantCluster: () => FlavourTag[];
  reset: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function applyDeltas(
  scores: Partial<Record<FlavourTag, number>>,
  tags: FlavourTag[],
  delta: number
): Partial<Record<FlavourTag, number>> {
  const next = { ...scores };
  for (const tag of tags) {
    next[tag] = clamp((next[tag] ?? 0) + delta);
  }
  return next;
}

function computeDominantCluster(scores: Partial<Record<FlavourTag, number>>): FlavourTag[] {
  return (Object.entries(scores) as [FlavourTag, number][])
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([tag]) => tag);
}

const INITIAL_STATE: TasteModel = {
  flavourScores: {},
  totalScans: 0,
  shelfScans: 0,
  discoveryScans: 0,
  thumbsSignals: [],
  dominantCluster: [],
  profileVisible: false,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useTasteModel = create<TasteModelState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      recordScan: (bottle, addedToShelf) => {
        set((state) => {
          const tags = normaliseFlavours(bottle.flavorProfile || []);
          let scores = applyDeltas(state.flavourScores, tags, 2);
          if (addedToShelf) {
            scores = applyDeltas(scores, tags, 3);
          }
          const totalScans = state.totalScans + 1;
          const dominantCluster = computeDominantCluster(scores);
          return {
            flavourScores: scores,
            totalScans,
            shelfScans: addedToShelf ? state.shelfScans + 1 : state.shelfScans,
            discoveryScans: !addedToShelf ? state.discoveryScans + 1 : state.discoveryScans,
            dominantCluster,
            profileVisible: totalScans >= 5,
          };
        });
      },

      recordThumbsUp: (bottle) => {
        set((state) => {
          const tags = normaliseFlavours(bottle.flavorProfile || []);
          const scores = applyDeltas(state.flavourScores, tags, 3);
          const dominantCluster = computeDominantCluster(scores);
          const signal: ThumbsSignal = {
            bottleId: (bottle as any).id || 'unknown',
            direction: 'up',
            recordedAt: new Date().toISOString(),
          };
          return {
            flavourScores: scores,
            dominantCluster,
            thumbsSignals: [...state.thumbsSignals.slice(-49), signal],
          };
        });
      },

      recordThumbsDown: (bottle, correctionTag, bottleId) => {
        set((state) => {
          const tags = normaliseFlavours(bottle.flavorProfile || []);
          // Penalise the dominant tags of this bottle
          let scores = applyDeltas(state.flavourScores, tags, -5);
          // Boost in the direction the user corrected toward
          scores = applyDeltas(scores, [correctionTag], 2);
          const dominantCluster = computeDominantCluster(scores);
          const signal: ThumbsSignal = {
            bottleId: bottleId || (bottle as any).id || 'unknown',
            direction: 'down',
            correctionTag,
            recordedAt: new Date().toISOString(),
          };
          return {
            flavourScores: scores,
            dominantCluster,
            thumbsSignals: [...state.thumbsSignals.slice(-49), signal],
          };
        });
      },

      getDominantCluster: () => get().dominantCluster,

      reset: () => set(INITIAL_STATE),
    }),
    {
      name: 'koope_taste_model',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
