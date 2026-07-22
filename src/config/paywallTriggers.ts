/**
 * Paywall Trigger Definitions
 *
 * Phase 0.7 (tier collapse): T1-T15 collapsed to the four desire-peak
 * triggers the workplan specifies — bottle-cap, post-scan locked recipe,
 * almost-makeable recipe, and the hosting gate. Every other feature gate
 * (advanced filters, save limit, exports, mastery lessons, vault drops,
 * flavor controls, predictive tools, etc.) still blocks correctly via
 * useFeatureAccess's tier check — it just no longer gets a bespoke
 * contextual banner on the Paywall screen (PaywallScreen.tsx only renders
 * that banner when `route.params.triggerId` resolves to an entry here;
 * an unresolved ID is a no-op, not an error — verified in PaywallScreen.tsx
 * before this collapse).
 *
 * IDs T1/T6/T15 are kept stable (not renamed) so the real call sites that
 * already reference them — BottleDetailScreen, HomeBarScreen,
 * ManualBottleEntryScreen (T1), RecipeDetailScreen, HostingScreen,
 * HomeBarScreen (T6) — didn't need touching. Call sites elsewhere in the
 * app that still pass a since-removed ID (T2-T5, T7-T14) resolve to
 * `undefined` here and safely fall through to a generic, un-bannered
 * paywall — that's the "removed" half of the workplan's ask, not a bug.
 *
 * Open question for the Founder, not decided here: existing PRO
 * subscribers. This pass makes KŌOPE+ (PLUS) functionally equal to what
 * PRO used to grant, but the PRO product/entitlement itself, its price,
 * and whether current PRO subscribers get downgraded, grandfathered, or
 * migrated is unchanged in code and unresolved — that's a pricing/legal
 * decision (App Store Connect / Google Play / RevenueCat dashboard side),
 * not something to infer from the workplan text.
 */

import { FeatureKey } from './featureRegistry';

// ============================================================================
// TYPES
// ============================================================================

export type WallMode = 'hard' | 'preview' | 'soft';
export type RequiredPlan = 'plus' | 'pro';

export interface PaywallTrigger {
  /** Unique trigger identifier */
  id: string;
  /** Feature key this trigger is associated with */
  featureKey: FeatureKey;
  /** Which plan is required to pass this trigger */
  requiredPlan: RequiredPlan;
  /** How aggressively this trigger blocks */
  mode: WallMode;
  /** User-facing message shown in the paywall */
  message: string;
  /** CTA button text */
  ctaText: string;
  /** Analytics event name for tracking */
  analyticsEvent: string;
}

// ============================================================================
// TRIGGER DEFINITIONS — the four desire-peak moments
// ============================================================================

export const PAYWALL_TRIGGERS: Record<string, PaywallTrigger> = {
  // Bottle-cap trigger — hitting the FREE 10-bottle shelf limit.
  T1: {
    id: 'T1',
    featureKey: 'inventory_unlimited',
    requiredPlan: 'plus',
    mode: 'hard',
    message:
      'Your bar has room to grow. KŌOPE+ removes the shelf limit and unlocks your full recipe library — no compromises.',
    ctaText: 'Unlock KŌOPE+',
    analyticsEvent: 'paywall_trigger_bottle_cap',
  },

  // Hosting gate — Host tab / party scaling / batch optimizer.
  T6: {
    id: 'T6',
    featureKey: 'hosting_basic',
    requiredPlan: 'plus',
    mode: 'hard',
    message:
      'KŌOPE+ is where your bar becomes host-ready with scaled recipes, lists, and planning tools for any size party.',
    ctaText: 'Unlock Hosting',
    analyticsEvent: 'paywall_trigger_hosting_gate',
  },

  // Almost-makeable recipe — missing 1-2 ingredients, upgrade to add them
  // straight to the shopping list instead of just seeing what's missing.
  T_ALMOST_MAKEABLE: {
    id: 'T_ALMOST_MAKEABLE',
    featureKey: 'shopping_list_export',
    requiredPlan: 'plus',
    mode: 'hard',
    message:
      "You're close on this one. KŌOPE+ adds what you're missing straight to your shopping list.",
    ctaText: 'Unlock KŌOPE+',
    analyticsEvent: 'paywall_trigger_almost_makeable',
  },

  // What Can I Make — smart substitution swap ideas on an almost-makeable
  // card (distinct from T_ALMOST_MAKEABLE, which is specifically the
  // shopping-list-export upsell). Phase 2.2: kept the existing free
  // substitution feature on CocktailDetailScreen untouched — this only
  // gates the NEW inventory-planning surface, per the founder's call that
  // "plan your whole bar" (what this screen sells) is the KŌOPE+ wedge,
  // not the reactive single-recipe swap already shipped free elsewhere.
  T_SUBSTITUTIONS: {
    id: 'T_SUBSTITUTIONS',
    featureKey: 'smart_substitutions',
    requiredPlan: 'plus',
    mode: 'hard',
    message: 'KŌOPE+ shows swap ideas ranked by what you already own.',
    ctaText: 'Unlock KŌOPE+',
    analyticsEvent: 'paywall_trigger_substitutions',
  },

  // Post-scan Answer Card recipe hook — tap on the locked 4th recipe card.
  T15: {
    id: 'T15',
    featureKey: 'inventory_unlimited',
    requiredPlan: 'plus',
    mode: 'hard',
    message:
      'This bottle unlocks even more cocktails with KŌOPE+ — your full recipe library, matched to your shelf.',
    ctaText: 'Unlock KŌOPE+',
    analyticsEvent: 'paywall_trigger_recipe_hook',
  },
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get a specific trigger by ID.
 */
export function getTrigger(id: string): PaywallTrigger | undefined {
  return PAYWALL_TRIGGERS[id];
}

/**
 * Get all triggers associated with a specific feature key.
 */
export function getTriggersForFeature(featureKey: FeatureKey): PaywallTrigger[] {
  return Object.values(PAYWALL_TRIGGERS).filter((t) => t.featureKey === featureKey);
}
