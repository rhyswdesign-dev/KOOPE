/**
 * Feature Tooltip Hook
 * Manages showing educational tooltips on first visit to pages
 * Stores completion state in AsyncStorage
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../lib/logger';

const TOOLTIP_PREFIX = '@KOOPE:tooltip_seen_';

export function useFeatureTooltip(featureKey: string) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkTooltipStatus();
  }, [featureKey]);

  const checkTooltipStatus = async () => {
    try {
      const key = `${TOOLTIP_PREFIX}${featureKey}`;
      const seen = await AsyncStorage.getItem(key);

      if (seen !== 'true') {
        // First time visiting this feature - show tooltip
        log.info('useFeatureTooltip', 'First visit detected, showing tooltip', { featureKey });
        setShowTooltip(true);
      } else {
        log.debug('useFeatureTooltip', 'Feature tooltip already seen', { featureKey });
      }

      setIsLoading(false);
    } catch (error) {
      log.error('useFeatureTooltip', 'Error checking tooltip status', { error, featureKey });
      setIsLoading(false);
    }
  };

  const dismissTooltip = async () => {
    try {
      const key = `${TOOLTIP_PREFIX}${featureKey}`;
      await AsyncStorage.setItem(key, 'true');
      log.info('useFeatureTooltip', 'Tooltip dismissed and marked as seen', { featureKey });
      setShowTooltip(false);
    } catch (error) {
      log.error('useFeatureTooltip', 'Error dismissing tooltip', { error, featureKey });
      setShowTooltip(false);
    }
  };

  const resetTooltip = async () => {
    try {
      const key = `${TOOLTIP_PREFIX}${featureKey}`;
      await AsyncStorage.removeItem(key);
      log.info('useFeatureTooltip', 'Tooltip reset', { featureKey });
      setShowTooltip(false);
    } catch (error) {
      log.error('useFeatureTooltip', 'Error resetting tooltip', { error, featureKey });
    }
  };

  const resetAllTooltips = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const tooltipKeys = allKeys.filter(key => key.startsWith(TOOLTIP_PREFIX));
      await AsyncStorage.multiRemove(tooltipKeys);
      log.info('useFeatureTooltip', 'All tooltips reset');
    } catch (error) {
      log.error('useFeatureTooltip', 'Error resetting all tooltips', { error });
    }
  };

  return {
    showTooltip,
    isLoading,
    dismissTooltip,
    resetTooltip,
    resetAllTooltips,
  };
}
