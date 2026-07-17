/**
 * RevenueCat entitlements -> KŌOPE tier mapping (Phase 0.7/0.9).
 *
 * Pulled out of SubscriptionContext.tsx into its own module with zero
 * React/React Native imports so this money-path logic is unit-testable
 * without pulling in react-native's runtime (which vitest's node
 * environment can't transform) or mocking the whole react-native-purchases
 * SDK. Only `PurchasesEntitlementInfo`'s shape is needed here, imported as
 * a type only — erased at build time, no runtime dependency on the SDK.
 */
import type { PurchasesEntitlementInfo } from 'react-native-purchases';
import { SUBSCRIPTION_ENTITLEMENTS } from '../constants/subscriptions';

/** Matches CustomerInfo['entitlements']['active'] without importing CustomerInfo's full type tree. */
export type ActiveEntitlements = Record<string, PurchasesEntitlementInfo | undefined>;

/**
 * Check if an entitlement is active. Pure function of its argument.
 */
export function isEntitlementActive(entitlement: PurchasesEntitlementInfo | undefined): boolean {
  return entitlement?.isActive === true;
}

/**
 * Result of mapping a RevenueCat CustomerInfo's active entitlements to
 * KŌOPE's tier/subscription concepts.
 */
export interface DerivedEntitlementState {
  koopePlus: boolean;
  hasProEntitlement: boolean;
  prestigeActive: boolean;
  isKoopePro: boolean;
  isSubscriber: boolean;
  /** Analytics label — kept as 'pro'/'prestige' even post-0.7 collapse so
   * historical funnels can still distinguish which RevenueCat entitlement
   * a subscriber actually holds. Not the same as the app-side UserTier,
   * which only ever gates at FREE/PLUS (see tierAccess.ts). */
  subscriptionTier: 'prestige' | 'pro' | 'plus' | 'free';
  subscriptionStatus: 'active' | 'inactive';
  /** App-side tier (tierAccess.ts / useUserTier.ts) this entitlement state
   * maps to. 'PRO' is written here for a real PRO entitlement holder, but
   * useUserTier.setTier() normalizes it to 'PLUS' on write (Phase 0.7) —
   * gating behavior is identical either way.
   *
   * NOTE (documented, not fixed — see paywallTriggers.ts's Phase 0.7
   * header comment): a Prestige-only entitlement does NOT elevate `tier`
   * above 'FREE'. This is pre-existing behavior (unchanged by 0.7, verify
   * via deriveEntitlementState.test.ts), not a new regression — Prestige's
   * relationship to the FREE/KŌOPE+ collapse was never specified in the
   * workplan. Code that only reads useUserTier().tier (bypassing
   * SubscriptionContext's isPro/isPrestige booleans) will not see a
   * Prestige subscriber as elevated. Flagged for the Founder.
   */
  tier: 'FREE' | 'PLUS' | 'PRO';
}

/**
 * Money-path entitlement mapping: the one function that decides, from a
 * real RevenueCat purchase receipt, whether someone is FREE/PLUS/PRO/
 * Prestige. Keep this function pure — no setState, no logging, no side
 * effects — SubscriptionContext.updateSubscriptionState is what applies
 * the result to component state.
 */
export function deriveEntitlementState(entitlements: ActiveEntitlements): DerivedEntitlementState {
  const koopePlus = isEntitlementActive(entitlements[SUBSCRIPTION_ENTITLEMENTS.KOOPE_PLUS]);
  const koopePro = isEntitlementActive(entitlements[SUBSCRIPTION_ENTITLEMENTS.KOOPE_PRO]);
  const koopeProAlt = isEntitlementActive(entitlements[SUBSCRIPTION_ENTITLEMENTS.KOOPE_PRO_ALT]);
  const prestigeActive = isEntitlementActive(entitlements[SUBSCRIPTION_ENTITLEMENTS.PRESTIGE]);

  const hasProEntitlement = koopePro || koopeProAlt;
  const isKoopePro = koopePlus || hasProEntitlement;
  const isSubscriber = koopePlus || hasProEntitlement || prestigeActive;

  const subscriptionTier: DerivedEntitlementState['subscriptionTier'] = prestigeActive
    ? 'prestige'
    : hasProEntitlement
      ? 'pro'
      : koopePlus
        ? 'plus'
        : 'free';

  const tier: DerivedEntitlementState['tier'] = hasProEntitlement
    ? 'PRO'
    : koopePlus
      ? 'PLUS'
      : 'FREE';

  return {
    koopePlus,
    hasProEntitlement,
    prestigeActive,
    isKoopePro,
    isSubscriber,
    subscriptionTier,
    subscriptionStatus: isSubscriber ? 'active' : 'inactive',
    tier,
  };
}
