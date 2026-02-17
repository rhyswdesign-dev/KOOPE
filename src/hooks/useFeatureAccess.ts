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
import { Alert } from 'react-native';
import { useUserTier, UserTier } from '../store/useUserTier';
import {
  FeatureKey,
  FEATURE_REGISTRY,
  hasFeatureAccessByKey,
} from '../config/featureRegistry';
import {
  PAYWALL_TRIGGERS,
  WallMode,
} from '../config/paywallTriggers';
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

/**
 * Hook for checking and gating feature access.
 * Reads user tier from Zustand store, looks up feature in the registry,
 * and provides a gate function that shows the paywall when needed.
 */
export function useFeatureAccess(featureKey: FeatureKey): FeatureAccessResult {
  const navigation = useNavigation<any>();
  const tier = useUserTier(s => s.tier);
  const feature = FEATURE_REGISTRY[featureKey];

  const hasAccess = hasFeatureAccessByKey(featureKey, tier);

  const gate = useCallback(
    (onSuccess?: () => void, triggerId?: string): boolean => {
      if (hasAccess) {
        onSuccess?.();
        return true;
      }

      // Look up trigger for custom messaging
      const trigger = triggerId ? PAYWALL_TRIGGERS[triggerId] : undefined;
      const wallMode: WallMode = trigger?.mode ?? 'hard';

      // Track the gate event
      trackEvent(trigger?.analyticsEvent ?? ANALYTICS_EVENTS.FEATURE_GATED, {
        [ANALYTICS_PROPS.FEATURE]: featureKey,
        [ANALYTICS_PROPS.REQUIRED_TIER]: feature.minTier,
        [ANALYTICS_PROPS.USER_TIER]: tier,
        ...(triggerId ? { trigger_id: triggerId } : {}),
      });

      // Soft mode: show nudge but still allow the action
      if (wallMode === 'soft') {
        const targetTier = (trigger?.requiredPlan ?? feature.paywallTarget) === 'pro' ? 'KŌOPE PRO' : 'KŌOPE+';

        Alert.alert(
          feature.displayName,
          trigger?.message ?? `${feature.description} Upgrade to ${targetTier}.`,
          [
            {
              text: 'Not Now',
              style: 'cancel',
              onPress: () => onSuccess?.(),
            },
            {
              text: trigger?.ctaText ?? `Upgrade to ${targetTier}`,
              onPress: () => {
                navigation.navigate('Paywall', {
                  displayCloseButton: true,
                  offering: (trigger?.requiredPlan ?? feature.paywallTarget) === 'pro' ? 'pro' : null,
                });
              },
            },
          ]
        );
        // Soft mode: action still succeeds
        return true;
      }

      // Hard / Preview mode: block the action
      const targetTier = (trigger?.requiredPlan ?? feature.paywallTarget) === 'pro' ? 'KŌOPE PRO' : 'KŌOPE+';

      Alert.alert(
        feature.displayName,
        trigger?.message ?? `${feature.description} Upgrade to ${targetTier}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: trigger?.ctaText ?? `Upgrade to ${targetTier}`,
            onPress: () => {
              navigation.navigate('Paywall', {
                displayCloseButton: true,
                offering: (trigger?.requiredPlan ?? feature.paywallTarget) === 'pro' ? 'pro' : null,
              });
            },
          },
        ]
      );

      return false;
    },
    [hasAccess, featureKey, feature, tier, navigation]
  );

  const gateWithTrigger = useCallback(
    (triggerId: string, onSuccess?: () => void): boolean => {
      return gate(onSuccess, triggerId);
    },
    [gate]
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
