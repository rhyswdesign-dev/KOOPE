/**
 * Pins the two numbers PRO users actually read on screen.
 *
 * Both the "Taste Graph" card (ForYouFeed) and the Refine Your Taste hero
 * render exactly these expressions:
 *     confidence -> Math.round(radar.dataConfidence * 100)
 *     signals    -> radar.engagementScore
 *
 * Before the persistence fix these were provably always 0 — every screen
 * called initializeTasteGraph() on load, which zeroes the interaction counts
 * the two values are derived from. Users saw "Confidence 0% / Signals 0"
 * under microcopy promising the number would grow.
 *
 * These tests reproduce the full screen path (persisted profile -> hydrate ->
 * generateRadarChart -> displayed value) rather than the maths in isolation,
 * so a regression anywhere along that chain fails here.
 *
 * NB: this is not a substitute for looking at the rendered screen — it proves
 * the values reaching the JSX, not that they are laid out correctly.
 */
import { describe, it, expect } from 'vitest';
import {
  hydrateTasteGraph,
  toPersistedTasteProfile,
  initializeTasteGraph,
  generateRadarChart,
} from '../tasteGraphService';
import type { TasteProfile } from '../../types/userProfile';

const profile: TasteProfile = {
  flavorWeights: {
    citrus: 0.4,
    herbal: 0.3,
    bitter: 0.2,
    sweet: 0.5,
    smoky: 0.9,
    floral: 0.1,
    spiced: 0.6,
  },
  spiritWeights: {
    tequila: 0.3,
    whiskey: 0.9,
    rum: 0.2,
    gin: 0.5,
    vodka: 0.1,
    brandy: 0.1,
    liqueurs: 0.2,
    'gin-alternative': 0,
    'rum-alternative': 0,
    none: 0,
  },
  preferredABV: { min: 15, max: 100 },
  preferredComplexity: 0.6,
};

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

/** Exactly what the two screens compute for display. */
function displayedValues(persisted: any) {
  const radar = generateRadarChart(hydrateTasteGraph(persisted)!);
  return {
    confidence: Math.round(radar.dataConfidence * 100),
    signals: radar.engagementScore,
  };
}

describe('PRO taste screen display values', () => {
  it('reproduces the old bug: a freshly initialized graph shows 0% and 0', () => {
    // This is what every PRO user saw, every load, before the fix.
    const radar = generateRadarChart(initializeTasteGraph(profile));

    expect(Math.round(radar.dataConfidence * 100)).toBe(0);
    expect(radar.engagementScore).toBe(0);
  });

  it('shows a non-zero confidence and signal count for a user with history', () => {
    const persisted = toPersistedTasteProfile({
      rawProfile: profile,
      timestamps: {
        flavors: { smoky: daysAgo(2), spiced: daysAgo(9) },
        spirits: { whiskey: daysAgo(2) },
      },
      interactionCounts: {
        flavors: { smoky: 14, spiced: 6 },
        spirits: { whiskey: 9 },
        total: 29,
      },
    });

    const { confidence, signals } = displayedValues(persisted);

    expect(confidence).toBeGreaterThan(0);
    expect(signals).toBeGreaterThan(0);
  });

  it("grows confidence as the user interacts more — the microcopy's promise", () => {
    // "Confidence grows as you save, view, make, and tune more drinks."
    const build = (n: number) =>
      toPersistedTasteProfile({
        rawProfile: profile,
        timestamps: { flavors: { smoky: daysAgo(1) }, spirits: { whiskey: daysAgo(1) } },
        interactionCounts: {
          flavors: { smoky: n },
          spirits: { whiskey: n },
          total: n * 2,
        },
      });

    const light = displayedValues(build(2));
    const heavy = displayedValues(build(18));

    expect(heavy.confidence).toBeGreaterThan(light.confidence);
    expect(heavy.signals).toBeGreaterThan(light.signals);
  });

  it('keeps both values inside their display ranges', () => {
    // Guards the layout: confidence is a percentage, signals is capped at 100,
    // so neither can overflow its metric card with a runaway number.
    const persisted = toPersistedTasteProfile({
      rawProfile: profile,
      timestamps: { flavors: { smoky: daysAgo(1) }, spirits: { whiskey: daysAgo(1) } },
      interactionCounts: {
        flavors: { smoky: 5000 },
        spirits: { whiskey: 5000 },
        total: 99999,
      },
    });

    const { confidence, signals } = displayedValues(persisted);

    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(100);
    expect(signals).toBeLessThanOrEqual(100);
  });

  it('survives the real round-trip through the profile column', () => {
    // The screens read taste_profile straight off users_profiles, so the
    // values must survive JSON serialisation, not just an in-memory pass.
    const persisted = toPersistedTasteProfile({
      rawProfile: profile,
      timestamps: { flavors: { smoky: daysAgo(3) }, spirits: { whiskey: daysAgo(3) } },
      interactionCounts: { flavors: { smoky: 20 }, spirits: { whiskey: 20 }, total: 40 },
    });

    const throughDb = JSON.parse(JSON.stringify(persisted));
    const { confidence, signals } = displayedValues(throughDb);

    expect(confidence).toBeGreaterThan(0);
    expect(signals).toBeGreaterThan(0);
  });
});
