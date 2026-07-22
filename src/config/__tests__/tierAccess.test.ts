/**
 * Money-path coverage (Phase 0.9): tierAccess.ts gates what a paying vs.
 * free user can do. The Phase 0.7 tier collapse merged PRO into PLUS —
 * these tests exist to catch a future edit that accidentally reintroduces
 * a PRO-only feature/limit (the exact regression tierAccess.ts's own doc
 * comments warn against).
 */
import { describe, it, expect } from 'vitest';
import {
  TIER_LIMITS,
  TIER_FEATURES,
  FREE_TIER_COCKTAILS,
  ANSWER_CARD_FREE_RECIPE_COUNT,
  isCocktailAccessible,
  hasFeatureAccess,
  getUpgradeMessage,
} from '../tierAccess';

describe('tierAccess — Phase 0.7 tier collapse invariant', () => {
  it('TIER_LIMITS.PRO is identical to TIER_LIMITS.PLUS', () => {
    expect(TIER_LIMITS.PRO).toEqual(TIER_LIMITS.PLUS);
  });

  it('TIER_FEATURES.PRO is identical to TIER_FEATURES.PLUS', () => {
    expect(TIER_FEATURES.PRO).toEqual(TIER_FEATURES.PLUS);
  });

  it('FREE never matches PLUS/PRO limits or features', () => {
    expect(TIER_LIMITS.FREE).not.toEqual(TIER_LIMITS.PLUS);
    expect(TIER_FEATURES.FREE).not.toEqual(TIER_FEATURES.PLUS);
  });

  it('PLUS grants everything PRO used to grant exclusively (spot checks)', () => {
    // These were PRO-exclusive `true` flags before the 0.7 collapse.
    expect(TIER_FEATURES.PLUS.remixEngine).toBe(true);
    expect(TIER_FEATURES.PLUS.ratioBalancing).toBe(true);
    expect(TIER_FEATURES.PLUS.hostingAdvanced).toBe(true);
    expect(TIER_FEATURES.PLUS.hostingPlanner).toBe(true);
    expect(TIER_FEATURES.PLUS.deadBottleDetection).toBe(true);
    expect(TIER_FEATURES.PLUS.vaultProDrops).toBe(true);
    expect(TIER_FEATURES.PLUS.whatCanIMake).toBe('full-catalog');
    expect(TIER_FEATURES.PLUS.partyScaling).toBe('full');
  });
});

describe('tierAccess — FREE tier contract (workplan 0.7: "FREE keeps...")', () => {
  it('FREE tier has exactly the 9 classic cocktails', () => {
    expect(FREE_TIER_COCKTAILS).toHaveLength(9);
    expect(FREE_TIER_COCKTAILS).toContain('old-fashioned');
    expect(FREE_TIER_COCKTAILS).toContain('margarita');
  });

  it('bottle cap is 10 for FREE, unlimited for PLUS', () => {
    expect(TIER_LIMITS.FREE.maxBottles).toBe(10);
    expect(TIER_LIMITS.PLUS.maxBottles).toBe(Infinity);
  });

  it('scans are unlimited for every tier (XP diminishing returns is the gate, not a count cap)', () => {
    expect(TIER_LIMITS.FREE.maxScansPerMonth).toBe(Infinity);
    expect(TIER_LIMITS.PLUS.maxScansPerMonth).toBe(Infinity);
  });

  it('post-scan Answer Card shows exactly 3 free recipe matches', () => {
    expect(ANSWER_CARD_FREE_RECIPE_COUNT).toBe(3);
  });

  it('a FREE-tier classic cocktail is accessible on FREE', () => {
    expect(isCocktailAccessible('old-fashioned', 'FREE')).toBe(true);
  });

  it('a non-classic cocktail is not accessible on FREE without an XP unlock', () => {
    expect(isCocktailAccessible('some-locked-signature-drink', 'FREE')).toBe(false);
  });

  it('PLUS and PRO unlock every cocktail regardless of the classics list', () => {
    expect(isCocktailAccessible('some-locked-signature-drink', 'PLUS')).toBe(true);
    expect(isCocktailAccessible('some-locked-signature-drink', 'PRO')).toBe(true);
  });
});

describe('tierAccess — hasFeatureAccess', () => {
  it('FREE cannot access a PLUS-gated feature', () => {
    expect(hasFeatureAccess('remixEngine', 'FREE')).toBe(false);
  });

  it('PLUS can access what used to be PRO-only', () => {
    expect(hasFeatureAccess('remixEngine', 'PLUS')).toBe(true);
  });

  it('PRO (legacy value) still resolves to the same access as PLUS', () => {
    expect(hasFeatureAccess('remixEngine', 'PRO')).toBe(true);
  });

  it('every tier can earn XP', () => {
    expect(hasFeatureAccess('xpEarn', 'FREE')).toBe(true);
    expect(hasFeatureAccess('xpEarn', 'PLUS')).toBe(true);
  });
});

describe('tierAccess — getUpgradeMessage', () => {
  it('FREE users are pointed at KŌOPE+, not a two-step PRO upsell', () => {
    const message = getUpgradeMessage('FREE');
    expect(message).toMatch(/KŌOPE\+/);
  });
});
