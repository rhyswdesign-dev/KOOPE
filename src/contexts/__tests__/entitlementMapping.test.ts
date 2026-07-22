/**
 * Money-path coverage (Phase 0.9): the RevenueCat-entitlements -> KŌOPE-tier
 * mapping. This is the one function that decides, from a real purchase
 * receipt, whether someone is FREE/PLUS/PRO/Prestige — bugs here mean
 * either a paying user gets locked out or a free user gets full access.
 *
 * Extracted from SubscriptionContext.tsx's updateSubscriptionState (Phase
 * 0.7/0.9) into src/contexts/entitlementMapping.ts specifically so this
 * logic could be tested without rendering the provider or mocking the
 * entire react-native-purchases/react-native import chain.
 */
import { describe, it, expect } from 'vitest';
import { deriveEntitlementState } from '../entitlementMapping';
import { SUBSCRIPTION_ENTITLEMENTS } from '../../constants/subscriptions';

type ActiveEntitlements = Parameters<typeof deriveEntitlementState>[0];

function activeEntitlement(overrides: Partial<{ isActive: boolean }> = {}) {
  return { isActive: true, ...overrides } as any;
}

describe('deriveEntitlementState', () => {
  it('no active entitlements -> FREE, not a subscriber', () => {
    const result = deriveEntitlementState({} as ActiveEntitlements);

    expect(result.tier).toBe('FREE');
    expect(result.isSubscriber).toBe(false);
    expect(result.isKoopePro).toBe(false);
    expect(result.hasProEntitlement).toBe(false);
    expect(result.prestigeActive).toBe(false);
    expect(result.subscriptionTier).toBe('free');
    expect(result.subscriptionStatus).toBe('inactive');
  });

  it('KOOPE_PLUS active -> PLUS tier, koopePro true, hasProEntitlement false', () => {
    const result = deriveEntitlementState({
      [SUBSCRIPTION_ENTITLEMENTS.KOOPE_PLUS]: activeEntitlement(),
    } as ActiveEntitlements);

    expect(result.tier).toBe('PLUS');
    expect(result.koopePlus).toBe(true);
    expect(result.isKoopePro).toBe(true); // KŌOPE+ also grants "koopePro" UI status
    expect(result.hasProEntitlement).toBe(false); // but not the PRO-specific flag
    expect(result.isSubscriber).toBe(true);
    expect(result.subscriptionTier).toBe('plus');
    expect(result.subscriptionStatus).toBe('active');
  });

  it('KOOPE_PRO active -> PRO tier (legacy value; useUserTier normalizes to PLUS on write)', () => {
    const result = deriveEntitlementState({
      [SUBSCRIPTION_ENTITLEMENTS.KOOPE_PRO]: activeEntitlement(),
    } as ActiveEntitlements);

    expect(result.tier).toBe('PRO');
    expect(result.hasProEntitlement).toBe(true);
    expect(result.isKoopePro).toBe(true);
    expect(result.isSubscriber).toBe(true);
    expect(result.subscriptionTier).toBe('pro');
  });

  it('KOOPE_PRO_ALT (alternate PRO entitlement id) is treated the same as KOOPE_PRO', () => {
    const result = deriveEntitlementState({
      [SUBSCRIPTION_ENTITLEMENTS.KOOPE_PRO_ALT]: activeEntitlement(),
    } as ActiveEntitlements);

    expect(result.tier).toBe('PRO');
    expect(result.hasProEntitlement).toBe(true);
  });

  it('PRESTIGE active alone -> subscriber, but tier stays FREE (Prestige is not in the FREE/PLUS ladder)', () => {
    const result = deriveEntitlementState({
      [SUBSCRIPTION_ENTITLEMENTS.PRESTIGE]: activeEntitlement(),
    } as ActiveEntitlements);

    expect(result.prestigeActive).toBe(true);
    expect(result.isSubscriber).toBe(true);
    expect(result.subscriptionTier).toBe('prestige');
    // NOTE: this is an intentionally-documented open question, not a typo —
    // see paywallTriggers.ts's Phase 0.7 header comment: Prestige's
    // relationship to the FREE/KŌOPE+ collapse was never specified in the
    // workplan, so `tier` (the app-side gating value) does not grant
    // anything from a Prestige-only entitlement. Flagged for the Founder.
    expect(result.tier).toBe('FREE');
  });

  it('an inactive entitlement (isActive: false) does not count as active', () => {
    const result = deriveEntitlementState({
      [SUBSCRIPTION_ENTITLEMENTS.KOOPE_PLUS]: activeEntitlement({ isActive: false }),
    } as ActiveEntitlements);

    expect(result.koopePlus).toBe(false);
    expect(result.tier).toBe('FREE');
    expect(result.isSubscriber).toBe(false);
  });

  it('PRO entitlement outranks a simultaneously-active PLUS entitlement for `tier`', () => {
    const result = deriveEntitlementState({
      [SUBSCRIPTION_ENTITLEMENTS.KOOPE_PLUS]: activeEntitlement(),
      [SUBSCRIPTION_ENTITLEMENTS.KOOPE_PRO]: activeEntitlement(),
    } as ActiveEntitlements);

    expect(result.tier).toBe('PRO');
    expect(result.koopePlus).toBe(true);
    expect(result.hasProEntitlement).toBe(true);
  });
});
