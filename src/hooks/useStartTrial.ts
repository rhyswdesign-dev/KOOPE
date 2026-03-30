/**
 * useStartTrial — starts the 7-day PLUS trial and schedules all lifecycle notifications.
 *
 * Call this from the Paywall / pricing screen when the user taps "Start Free Trial".
 * The trial starts at PLUS tier for days 1–5; useFeatureAccess automatically
 * elevates to PRO on days 6–7 via useTrialStatus.
 */

import { useCallback } from 'react';
import { useUserTier } from '../store/useUserTier';
import { notificationService } from '../services/notificationService';
import { log } from '../lib/logger';

export function useStartTrial() {
  const { startTrial } = useUserTier();

  const beginTrial = useCallback(async () => {
    const now = new Date();

    // Set tier to PLUS for the warmup phase (days 1–5).
    // useFeatureAccess will elevate to PRO on days 6–7 via useTrialStatus.
    startTrial('PLUS', 7);

    // Schedule all 5 trial lifecycle push notifications.
    try {
      await notificationService.scheduleTrialNotifications(now);
    } catch (err) {
      // Notification scheduling is non-critical — trial still starts.
      log.warn('useStartTrial', 'Could not schedule trial notifications', err);
    }
  }, [startTrial]);

  return { beginTrial };
}
