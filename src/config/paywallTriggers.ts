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
 *
 * Phase 0.7 (tier collapse) — PARTIAL, see the workplan's 0.7 section:
 * every `requiredPlan: 'pro'` here was flipped to 'plus' for consistency
 * with featureRegistry.ts's PRO->PLUS minTier collapse — a former-PRO
 * gate (T7-T13) now correctly pre-selects the KŌOPE+ tab on the Paywall
 * instead of steering a user toward the pricier, no-longer-necessary PRO
 * plan (see PaywallScreen.tsx's `offering === 'pro' ? 'koope_pro' :
 * 'koope_plus'` selection logic).
 *
 * NOT done in this pass: the workplan's fuller ask is T1–T13 collapsing
 * down to *three* desire-peak triggers (greyed 4th post-scan recipe,
 * almost-makeable recipe, hosting gate) plus a bottle-cap trigger, with
 * every other `navigate('Paywall')` call site (27 across the app —
 * screens, RequirePro.tsx/RequirePrestige.tsx/SubscriptionGate.tsx gate
 * components, useFeatureAccess.ts) either routed through those four or
 * removed, and PaywallScreen.tsx redesigned to a single-tier, annual-first
 * layout driven by RevenueCat offering metadata instead of the current
 * koope_plus/koope_pro tab UI. That's a real UI redesign across ~30 files
 * with no way to visually or runtime-verify the result in this
 * environment (no device/simulator, no live RevenueCat sandbox) — it also
 * depends on what happens to the PRO product itself (see below), which is
 * a business call. Left for a dedicated, testable pass.
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
  // T1 — Inventory Cap / Locked Recipe Access
  T1: {
    id: 'T1',
    featureKey: 'inventory_unlimited',
    requiredPlan: 'plus',
    mode: 'hard',
    message:
      'Your bar has room to grow. KŌOPE+ removes the shelf limit and unlocks your full recipe library — no compromises.',
    ctaText: 'Unlock KŌOPE+',
    analyticsEvent: 'paywall_trigger_inventory_cap',
  },

  // T2 — Advanced Filter Attempt
  T2: {
    id: 'T2',
    featureKey: 'advanced_filters',
    requiredPlan: 'plus',
    mode: 'hard',
    message:
      'Advanced filters are part of the Bartender tier. Filter by ingredient count, sugar, ABV, and occasion with KŌOPE+.',
    ctaText: 'Unlock Advanced Filters',
    analyticsEvent: 'paywall_trigger_advanced_filter',
  },

  // T3 — Save Attempt (5-recipe limit hit)
  T3: {
    id: 'T3',
    featureKey: 'saved_cocktails_unlimited',
    requiredPlan: 'plus',
    mode: 'hard',
    message:
      "You've saved 5 recipes — your free limit. KŌOPE+ gives you unlimited saves so your library can grow with you.",
    ctaText: 'Unlock Unlimited Saves',
    analyticsEvent: 'paywall_trigger_save_attempt',
  },

  // T3b — 5th Save Soft Nudge (non-blocking, fires after successful 5th save)
  T3b: {
    id: 'T3b',
    featureKey: 'saved_cocktails_unlimited',
    requiredPlan: 'plus',
    mode: 'soft',
    message: "That's 5 saves — one away from your free limit. KŌOPE+ gives you unlimited saves.",
    ctaText: 'See KŌOPE+',
    analyticsEvent: 'paywall_trigger_save_nudge_5th',
  },

  // T4 — Optimize My Bar
  T4: {
    id: 'T4',
    featureKey: 'optimize_my_bar',
    requiredPlan: 'plus',
    mode: 'hard',
    message:
      'Your bar is ready for the next step. KŌOPE+ shows what to buy next for the biggest cocktail reach.',
    ctaText: 'Unlock Bar Optimizer',
    analyticsEvent: 'paywall_trigger_optimize_bar',
  },

  // T5 — Export Shopping List
  T5: {
    id: 'T5',
    featureKey: 'shopping_list_export',
    requiredPlan: 'plus',
    mode: 'hard',
    message:
      'Shopping-list export is part of KŌOPE+ so your bar plan can leave the app and actually get stocked.',
    ctaText: 'Unlock Export',
    analyticsEvent: 'paywall_trigger_export_list',
  },

  // T6 — Host Tab Access
  T6: {
    id: 'T6',
    featureKey: 'hosting_basic',
    requiredPlan: 'plus',
    mode: 'hard',
    message:
      'KŌOPE+ is where your bar becomes host-ready with scaled recipes, lists, and planning tools for small groups.',
    ctaText: 'Unlock Hosting',
    analyticsEvent: 'paywall_trigger_host_tab',
  },

  // T7 — Group 5+ Guests
  T7: {
    id: 'T7',
    featureKey: 'hosting_advanced',
    requiredPlan: 'plus',
    mode: 'hard',
    message:
      'Big-group hosting is a KŌOPE+ feature — 5+ guest planning, batch optimization, and prep flow.',
    ctaText: 'Unlock KŌOPE+',
    analyticsEvent: 'paywall_trigger_group_5plus',
  },

  // T8 — Bring to Party
  T8: {
    id: 'T8',
    featureKey: 'bring_to_party',
    requiredPlan: 'plus',
    mode: 'hard',
    message:
      'Bring-the-right-bottle intelligence is part of KŌOPE+, where KŌOPE starts to feel personal and prestige-driven.',
    ctaText: 'Unlock KŌOPE+',
    analyticsEvent: 'paywall_trigger_bring_to_party',
  },

  // T9 — Predictive Engine
  T9: {
    id: 'T9',
    featureKey: 'predictive_engine',
    requiredPlan: 'plus',
    mode: 'hard',
    message:
      'Your Taste Graph is already taking shape. KŌOPE+ unlocks full predictive recommendations and weekly For You drops.',
    ctaText: 'Unlock Predictive AI',
    analyticsEvent: 'paywall_trigger_predictive',
  },

  // T10 — Mastery Lessons
  T10: {
    id: 'T10',
    featureKey: 'mastery_lessons',
    requiredPlan: 'plus',
    mode: 'hard',
    message:
      'KŌOPE+ is where progress turns into identity: mastery lessons, certifications, and prestige-level unlocks live here.',
    ctaText: 'Unlock Mastery',
    analyticsEvent: 'paywall_trigger_mastery',
  },

  // T11 — Vault Pro Drops
  T11: {
    id: 'T11',
    featureKey: 'vault_pro_drops',
    requiredPlan: 'plus',
    mode: 'hard',
    message:
      'This Vault drop is part of the KŌOPE+ collector layer with premium references, seasonal drops, and prestige content.',
    ctaText: 'Unlock KŌOPE+ Vault',
    analyticsEvent: 'paywall_trigger_vault_pro',
  },

  // T12 — Flavor Sliders
  T12: {
    id: 'T12',
    featureKey: 'adjustable_flavor_controls',
    requiredPlan: 'plus',
    mode: 'hard',
    message:
      'Flavor sliders are a KŌOPE+ control surface for shaping your taste identity, not just browsing recipes.',
    ctaText: 'Unlock Flavor Controls',
    analyticsEvent: 'paywall_trigger_flavor_sliders',
  },

  // T13 — Predictive Restock
  T13: {
    id: 'T13',
    featureKey: 'predictive_restock',
    requiredPlan: 'plus',
    mode: 'hard',
    message:
      'Predictive restock belongs in KŌOPE+, where KŌOPE understands your habits and manages your bar around them.',
    ctaText: 'Learn About KŌOPE+',
    analyticsEvent: 'paywall_trigger_restock',
  },

  // T14 — Weekly Drop (soft nudge after 3rd unclaimed drop)
  T14: {
    id: 'T14',
    featureKey: 'weekly_drops',
    requiredPlan: 'plus',
    mode: 'soft',
    message:
      "You've missed 3 weekly drops. KŌOPE+ members claim curated recipe drops every week — don't leave them unclaimed.",
    ctaText: 'Claim Drops with KŌOPE+',
    analyticsEvent: 'paywall_trigger_weekly_drop_nudge',
  },

  // T15 — Post-scan Answer Card recipe hook (tap on the locked 4th recipe card)
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
