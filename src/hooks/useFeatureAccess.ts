/**
 * useFeatureAccess Hook — P4 Infrastructure
 *
 * Centralized hook for checking feature access and triggering paywalls.
 * Replaces individual gate functions with a single, consistent API.
 *
 * Usage:
 *   const { hasAccess, gate, requiredTier } = useFeatureAccess('remix_engine');
 *   // Check without side-effects:
 *   if (hasAccess) { ... }
 *   // Gate with paywall:
 *   gate(() => { navigation.navigate('RemixScreen'); });
 *   // Gate with a specific trigger (T1–T13):
 *   gateWithTrigger('T1', () => { addBottle(); });
 */

import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useUserTier, UserTier } from '../store/useUserTier';
import { useTrialStatus } from './useTrialStatus';
import { FeatureKey, FEATURE_REGISTRY, hasFeatureAccessByKey } from '../config/featureRegistry';
import { PAYWALL_TRIGGERS } from '../config/paywallTriggers';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';

interface FeatureAccessResult {
  /** Whether the user's current tier can access this feature */
  hasAccess: boolean;
  /** The minimum tier required */
  requiredTier: UserTier;
  /** The feature's display name */
  featureName: string;
  /** Gate function: runs onSuccess if allowed, shows paywall if not */
  gate: (onSuccess?: () => void, triggerId?: string) => boolean;
  /** Gate with a specific trigger ID for custom messaging */
  gateWithTrigger: (triggerId: string, onSuccess?: () => void) => boolean;
}

// Phase 0.7: only the four surviving desire-peak triggers get a default
// mapping. Feature keys not listed here still gate correctly (tier check
// is unaffected) — they just render the paywall without a bespoke
// contextual banner, which PaywallScreen treats as a no-op, not an error.
const DEFAULT_TRIGGER_BY_FEATURE: Partial<Record<FeatureKey, string>> = {
  inventory_unlimited: 'T1',
  hosting_basic: 'T6',
  party_scaling: 'T6',
  hosting_advanced: 'T6',
  batch_optimizer: 'T6',
  shopping_list_export: 'T_ALMOST_MAKEABLE',
};

/**
 * Hook for checking and gating feature access.
 * Reads user tier from Zustand store, looks up feature in the registry,
 * and provides a gate function that shows the paywall when needed.
 */
export function useFeatureAccess(featureKey: FeatureKey): FeatureAccessResult {
  const navigation = useNavigation<any>();
  const tier = useUserTier((s) => s.tier);
  const feature = FEATURE_REGISTRY[featureKey];
  const { isProPhase } = useTrialStatus();

  // During the trial's PRO phase (days 6–7) elevate access to PRO level.
  // During days 1–5 the trial tier (PLUS) is already set in the store.
  const effectiveTier: UserTier = isProPhase ? 'PRO' : tier;
  const hasAccess = hasFeatureAccessByKey(featureKey, effectiveTier);

  const gate = useCallback(
    (onSuccess?: () => void, triggerId?: string): boolean => {
      if (hasAccess) {
        onSuccess?.();
        return true;
      }

      // Look up trigger for custom messaging
      const resolvedTriggerId = triggerId ?? DEFAULT_TRIGGER_BY_FEATURE[featureKey];
      const trigger = resolvedTriggerId ? PAYWALL_TRIGGERS[resolvedTriggerId] : undefined;

      // Track the gate event
      trackEvent(trigger?.analyticsEvent ?? ANALYTICS_EVENTS.FEATURE_GATED, {
        [ANALYTICS_PROPS.FEATURE]: featureKey,
        [ANALYTICS_PROPS.REQUIRED_TIER]: feature.minTier,
        [ANALYTICS_PROPS.USER_TIER]: effectiveTier,
        ...(resolvedTriggerId ? { trigger_id: resolvedTriggerId } : {}),
      });

      // Unified behavior: all feature gates route directly to Paywall and block action.
      navigation.navigate('Paywall', {
        displayCloseButton: true,
        offering: (trigger?.requiredPlan ?? feature.paywallTarget) === 'pro' ? 'pro' : null,
        source: resolvedTriggerId ?? featureKey,
        triggerId: resolvedTriggerId,
      });

      return false;
    },
    [hasAccess, featureKey, feature, effectiveTier, navigation],
  );

  const gateWithTrigger = useCallback(
    (triggerId: string, onSuccess?: () => void): boolean => {
      return gate(onSuccess, triggerId);
    },
    [gate],
  );

  return {
    hasAccess,
    requiredTier: feature.minTier,
    featureName: feature.displayName,
    gate,
    gateWithTrigger,
  };
}

/**
 * Non-hook version for use outside of React components.
 * Does NOT show paywall — only checks access.
 */
export function checkFeatureAccess(featureKey: FeatureKey, userTier: UserTier): boolean {
  return hasFeatureAccessByKey(featureKey, userTier);
}
