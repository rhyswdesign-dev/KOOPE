/**
 * Paywall Trigger Definitions — v2 Strategy
 *
 * Defines the 13 paywall triggers (T1–T13) from the monetization strategy.
 * Each trigger maps a user action to a paywall with specific messaging,
 * wall mode, and analytics tracking.
 *
 * Wall modes:
 *   - hard:    Blocks the action entirely until upgrade
 *   - preview: Shows a teaser of the feature, then blocks
 *   - soft:    Non-blocking nudge (action still succeeds)
 */

import { FeatureKey } from './featureRegistry';

// ============================================================================
// TYPES
// ============================================================================

export type WallMode = 'hard' | 'preview' | 'soft';
export type RequiredPlan = 'plus' | 'pro';

export interface PaywallTrigger {
  /** Unique trigger identifier (T1–T13) */
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
// TRIGGER DEFINITIONS
// ============================================================================

export const PAYWALL_TRIGGERS: Record<string, PaywallTrigger> = {
  // T1 — Inventory Cap
  T1: {
    id: 'T1',
    featureKey: 'inventory_unlimited',
    requiredPlan: 'plus',
    mode: 'hard',
    message: 'You\'ve hit your 10-bottle limit. Upgrade to KŌOPE+ for unlimited inventory.',
    ctaText: 'Unlock Unlimited Bottles',
    analyticsEvent: 'paywall_trigger_inventory_cap',
  },

  // T2 — Advanced Filter Attempt
  T2: {
    id: 'T2',
    featureKey: 'advanced_filters',
    requiredPlan: 'plus',
    mode: 'hard',
    message: 'Advanced filters are a KŌOPE+ feature. Filter by ingredient count, low sugar, and more.',
    ctaText: 'Unlock Advanced Filters',
    analyticsEvent: 'paywall_trigger_advanced_filter',
  },

  // T3 — Save Attempt
  T3: {
    id: 'T3',
    featureKey: 'saved_cocktails_unlimited',
    requiredPlan: 'plus',
    mode: 'hard',
    message: 'Saving cocktails is a KŌOPE+ feature. Upgrade to save unlimited favorites.',
    ctaText: 'Unlock Unlimited Saves',
    analyticsEvent: 'paywall_trigger_save_attempt',
  },

  // T4 — Optimize My Bar
  T4: {
    id: 'T4',
    featureKey: 'optimize_my_bar',
    requiredPlan: 'plus',
    mode: 'preview',
    message: 'See what to buy next to unlock the most cocktails. Upgrade to KŌOPE+ for full analysis.',
    ctaText: 'Unlock Bar Optimizer',
    analyticsEvent: 'paywall_trigger_optimize_bar',
  },

  // T5 — Export Shopping List
  T5: {
    id: 'T5',
    featureKey: 'shopping_list_export',
    requiredPlan: 'plus',
    mode: 'hard',
    message: 'Exporting your shopping list requires KŌOPE+. Upgrade to share and print your list.',
    ctaText: 'Unlock Export',
    analyticsEvent: 'paywall_trigger_export_list',
  },

  // T6 — Host Tab Access
  T6: {
    id: 'T6',
    featureKey: 'hosting_basic',
    requiredPlan: 'plus',
    mode: 'preview',
    message: 'Hosting tools help you plan the perfect gathering. Upgrade to KŌOPE+ to get started.',
    ctaText: 'Unlock Hosting',
    analyticsEvent: 'paywall_trigger_host_tab',
  },

  // T7 — Group 5+ Guests
  T7: {
    id: 'T7',
    featureKey: 'hosting_advanced',
    requiredPlan: 'pro',
    mode: 'hard',
    message: 'Hosting for 5+ guests requires KŌOPE PRO. Unlock batch optimizer, timelines, and more.',
    ctaText: 'Upgrade to PRO',
    analyticsEvent: 'paywall_trigger_group_5plus',
  },

  // T8 — Bring to Party
  T8: {
    id: 'T8',
    featureKey: 'bring_to_party',
    requiredPlan: 'pro',
    mode: 'hard',
    message: 'Get smart suggestions for what to bring. Upgrade to KŌOPE PRO.',
    ctaText: 'Upgrade to PRO',
    analyticsEvent: 'paywall_trigger_bring_to_party',
  },

  // T9 — Predictive Engine
  T9: {
    id: 'T9',
    featureKey: 'predictive_engine',
    requiredPlan: 'pro',
    mode: 'hard',
    message: 'The predictive engine learns your taste over time. Upgrade to KŌOPE PRO to unlock.',
    ctaText: 'Unlock Predictive AI',
    analyticsEvent: 'paywall_trigger_predictive',
  },

  // T10 — Mastery Lessons
  T10: {
    id: 'T10',
    featureKey: 'mastery_lessons',
    requiredPlan: 'pro',
    mode: 'hard',
    message: 'Mastery lessons and certifications are PRO exclusive. Level up your bartending skills.',
    ctaText: 'Unlock Mastery',
    analyticsEvent: 'paywall_trigger_mastery',
  },

  // T11 — Vault Pro Drops
  T11: {
    id: 'T11',
    featureKey: 'vault_pro_drops',
    requiredPlan: 'pro',
    mode: 'preview',
    message: 'This vault drop is exclusive to KŌOPE PRO members.',
    ctaText: 'Unlock PRO Vault',
    analyticsEvent: 'paywall_trigger_vault_pro',
  },

  // T12 — Flavor Sliders
  T12: {
    id: 'T12',
    featureKey: 'adjustable_flavor_controls',
    requiredPlan: 'pro',
    mode: 'hard',
    message: 'Flavor sliders let you fine-tune your taste profile. Upgrade to KŌOPE PRO.',
    ctaText: 'Unlock Flavor Controls',
    analyticsEvent: 'paywall_trigger_flavor_sliders',
  },

  // T13 — Predictive Restock
  T13: {
    id: 'T13',
    featureKey: 'predictive_restock',
    requiredPlan: 'pro',
    mode: 'soft',
    message: 'KŌOPE PRO can predict when you need to restock based on your usage.',
    ctaText: 'Learn About PRO',
    analyticsEvent: 'paywall_trigger_restock',
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
  return Object.values(PAYWALL_TRIGGERS).filter(t => t.featureKey === featureKey);
}
