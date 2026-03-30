/**
 * useTrialStatus — computes structured trial state from the user tier store.
 *
 * Trial phases:
 *   Days 1–5  → PLUS features only (warmup)
 *   Days 6–7  → PRO features unlocked (step-up window)
 *   Day  8+   → trial expired, paywall shown
 */

import { useUserTier } from '../store/useUserTier';

export interface TrialStatus {
  /** Trial is active and not yet expired */
  isInTrial: boolean;
  /** 1-indexed day within the trial (0 if not in trial) */
  trialDay: number;
  /** Calendar days remaining including today (0 if not in trial) */
  daysRemaining: number;
  /** True on trial days 6–7 — PRO features surface */
  isProPhase: boolean;
  /** True on day 6 specifically — used to trigger the unlock card once */
  isFirstProPhaseDay: boolean;
  /** Trial was started but has now passed its end date */
  trialExpired: boolean;
}

export function useTrialStatus(): TrialStatus {
  const { isTrialActive, trialStartDate, trialEndDate } = useUserTier();

  const now = new Date();
  const start = trialStartDate ? new Date(trialStartDate) : null;
  const end = trialEndDate ? new Date(trialEndDate) : null;

  const isCurrentlyInTrial = isTrialActive && !!end && end > now;
  const trialExpired = isTrialActive && !!end && end <= now;

  const trialDay =
    start && isCurrentlyInTrial
      ? Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 0;

  const daysRemaining =
    end && isCurrentlyInTrial
      ? Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  const isProPhase = isCurrentlyInTrial && trialDay >= 6;
  const isFirstProPhaseDay = isCurrentlyInTrial && trialDay === 6;

  return {
    isInTrial: isCurrentlyInTrial,
    trialDay,
    daysRemaining,
    isProPhase,
    isFirstProPhaseDay,
    trialExpired,
  };
}
