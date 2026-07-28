/**
 * Regression coverage for the bug this whole phase exists to fix.
 *
 * tasteGraphService implements read-time decay and per-dimension confidence,
 * but every read site called initializeTasteGraph() on load, which stamps
 * every timestamp as "now" and zeroes every interaction count. Decay
 * therefore never decayed and confidence was always ~0 — the feature was
 * decorative. These tests pin the hydrate/persist round-trip that makes the
 * maths run on real history.
 */
import { describe, it, expect } from 'vitest';
import {
  hydrateTasteGraph,
  toPersistedTasteProfile,
  initializeTasteGraph,
  generateRadarChart,
  applyDecay,
  getEffectiveTasteProfile,
  steeringInfluence,
  type TasteGraphData,
} from '../tasteGraphService';
import type { TasteProfile } from '../../types/userProfile';

const baseProfile: TasteProfile = {
  flavorWeights: {
    citrus: 0.8,
    herbal: 0.2,
    bitter: 0.1,
    sweet: 0.5,
    smoky: 0.9,
    floral: 0.1,
    spiced: 0.3,
  },
  spiritWeights: {
    tequila: 0.7,
    whiskey: 0.9,
    rum: 0.2,
    gin: 0.4,
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

describe('taste graph persistence', () => {
  it('round-trips timestamps and interaction counts', () => {
    const original: TasteGraphData = {
      rawProfile: baseProfile,
      timestamps: {
        flavors: { smoky: daysAgo(200), citrus: daysAgo(5) },
        spirits: { whiskey: daysAgo(200) },
      },
      interactionCounts: {
        flavors: { smoky: 30, citrus: 4 },
        spirits: { whiskey: 12 },
        total: 46,
      },
    };

    const rehydrated = hydrateTasteGraph(toPersistedTasteProfile(original));

    expect(rehydrated).not.toBeNull();
    expect(rehydrated!.timestamps).toEqual(original.timestamps);
    expect(rehydrated!.interactionCounts).toEqual(original.interactionCounts);
    expect(rehydrated!.rawProfile.flavorWeights).toEqual(baseProfile.flavorWeights);
  });

  it('preserves PRO manual overrides across the round-trip', () => {
    const withOverrides: TasteGraphData = {
      rawProfile: baseProfile,
      timestamps: { flavors: {}, spirits: {} },
      interactionCounts: { flavors: {}, spirits: {}, total: 0 },
      overrides: {
        flavors: { smoky: 0.25 },
        spirits: {},
        lastModified: daysAgo(1),
      },
    };

    const rehydrated = hydrateTasteGraph(toPersistedTasteProfile(withOverrides));
    expect(rehydrated!.overrides?.flavors.smoky).toBe(0.25);
  });

  it('keeps the four TasteProfile fields at the top level for existing readers', () => {
    // tasteMatchService and friends read .flavorWeights directly off
    // taste_profile — the graph metadata must ride alongside, not nest them.
    const persisted = toPersistedTasteProfile(initializeTasteGraph(baseProfile)) as any;

    expect(persisted.flavorWeights).toEqual(baseProfile.flavorWeights);
    expect(persisted.spiritWeights).toEqual(baseProfile.spiritWeights);
    expect(persisted.preferredABV).toEqual(baseProfile.preferredABV);
    expect(persisted.preferredComplexity).toBe(baseProfile.preferredComplexity);
  });

  it('degrades legacy rows (no graph metadata) instead of throwing', () => {
    const legacy = hydrateTasteGraph(baseProfile);

    expect(legacy).not.toBeNull();
    expect(legacy!.rawProfile.flavorWeights).toEqual(baseProfile.flavorWeights);
    expect(legacy!.interactionCounts.total).toBe(0);
  });

  it('returns null for a missing profile', () => {
    expect(hydrateTasteGraph(null)).toBeNull();
    expect(hydrateTasteGraph(undefined)).toBeNull();
  });

  it('lets decay actually decay once timestamps survive', () => {
    // The core regression: an old timestamp must produce a decayed weight.
    const fresh = applyDecay(1, daysAgo(0));
    const stale = applyDecay(1, daysAgo(300));

    expect(fresh).toBeCloseTo(1, 5);
    expect(stale).toBeLessThan(fresh);
    expect(stale).toBeGreaterThanOrEqual(0.3); // floor holds
  });

  it('produces nonzero confidence from persisted interaction counts', () => {
    // Previously always ~0 because counts were zeroed on every load.
    const graph = hydrateTasteGraph(
      toPersistedTasteProfile({
        rawProfile: baseProfile,
        timestamps: { flavors: { smoky: daysAgo(1) }, spirits: { whiskey: daysAgo(1) } },
        interactionCounts: {
          flavors: { smoky: 20 },
          spirits: { whiskey: 10 },
          total: 30,
        },
      }),
    )!;

    const radar = generateRadarChart(graph);
    const smoky = radar.flavorPoints.find((p) => p.label === 'Smoky');
    const whiskey = radar.spiritPoints.find((p) => p.label === 'Whiskey');

    expect(smoky!.confidence).toBe(1);
    expect(whiskey!.confidence).toBe(1);
    expect(radar.dataConfidence).toBeGreaterThan(0);
    expect(radar.engagementScore).toBeGreaterThan(0);
  });

  describe('steering vs the mirror', () => {
    const steered = (value: number, setAt: string): TasteGraphData => ({
      rawProfile: baseProfile,
      timestamps: { flavors: {}, spirits: {} },
      interactionCounts: { flavors: {}, spirits: {}, total: 0 },
      overrides: { flavors: { citrus: value }, spirits: {}, lastModified: setAt },
    });

    it('biases a weight toward the steer without replacing it', () => {
      // The old behaviour returned the steer verbatim (1.0), erasing the
      // learned value entirely. It must now sit between the two.
      const effective = getEffectiveTasteProfile(steered(1, daysAgo(0)));
      const learnedCitrus = baseProfile.flavorWeights.citrus;

      expect(effective.flavorWeights.citrus).toBeGreaterThan(0);
      // Normalisation makes absolute comparison meaningless, so compare the
      // steered graph against the same graph with no steer at all.
      const unsteered = getEffectiveTasteProfile({
        rawProfile: baseProfile,
        timestamps: { flavors: {}, spirits: {} },
        interactionCounts: { flavors: {}, spirits: {}, total: 0 },
      });
      expect(effective.flavorWeights.citrus).toBeGreaterThan(unsteered.flavorWeights.citrus);
      expect(learnedCitrus).toBeLessThan(1);
    });

    it('never mutates the mirror', () => {
      const graph = steered(1, daysAgo(0));
      getEffectiveTasteProfile(graph);

      // The whole point: behaviour stays recoverable underneath the steer.
      expect(graph.rawProfile.flavorWeights.citrus).toBe(baseProfile.flavorWeights.citrus);
    });

    it('fades a steer as it ages', () => {
      const fresh = getEffectiveTasteProfile(steered(1, daysAgo(0)));
      const old = getEffectiveTasteProfile(steered(1, daysAgo(60)));

      expect(fresh.flavorWeights.citrus).toBeGreaterThan(old.flavorWeights.citrus);
    });

    it('ignores a steer once it has fully lapsed', () => {
      // An aspiration set eight months ago should not still bend the feed.
      const lapsed = getEffectiveTasteProfile(steered(1, daysAgo(240)));
      const none = getEffectiveTasteProfile({
        rawProfile: baseProfile,
        timestamps: { flavors: {}, spirits: {} },
        interactionCounts: { flavors: {}, spirits: {}, total: 0 },
      });

      expect(lapsed.flavorWeights.citrus).toBeCloseTo(none.flavorWeights.citrus, 5);
    });

    it('reports influence between 1 and 0 over the fade window', () => {
      expect(steeringInfluence(daysAgo(0))).toBeCloseTo(1, 2);
      expect(steeringInfluence(daysAgo(45))).toBeGreaterThan(0);
      expect(steeringInfluence(daysAgo(45))).toBeLessThan(1);
      expect(steeringInfluence(daysAgo(200))).toBe(0);
      expect(steeringInfluence(undefined)).toBe(0);
    });
  });

  it('confidence stays zero for a freshly initialized graph', () => {
    // Contrast case — proves the previous test is measuring persistence,
    // not something incidental.
    const radar = generateRadarChart(initializeTasteGraph(baseProfile));
    expect(radar.dataConfidence).toBe(0);
  });
});
