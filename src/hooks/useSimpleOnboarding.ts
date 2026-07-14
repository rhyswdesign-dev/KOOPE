/**
 * Simple Onboarding Hook
 *
 * Manages the onboarding flow for new users (Master Plan Phase 1.4 inversion,
 * shipped in audit/sprint-1): age gate -> one welcome card -> camera.
 *
 * 1. Splash screen
 * 2. Age gate (legal access check)
 * 3. Welcome Carousel — the single onboarding card
 * 4. Main app (camera opens immediately; App.tsx handles the handoff)
 *
 * Sign-in, the questionnaire, and the survey are no longer pre-camera gates.
 * The questionnaire now runs post-first-value via the RefineYourTaste screen;
 * sign-in moves to the first save/sync moment.
 *
 * For returning users (who have completed onboarding before):
 * - Skips all onboarding screens after splash
 * - Goes directly to main app
 *
 * Onboarding completion is stored in AsyncStorage and persists across app restarts.
 */

import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';
import { log } from '../lib/logger';
import {
  AGE_VERIFICATION_RULE_VERSION,
  AGE_VERIFICATION_STORAGE_KEY,
  AgeVerificationPayload,
} from '../services/ageVerificationService';

type AppState =
  | 'loading'
  | 'splash'
  | 'age_gate'
  | 'welcome'
  | 'main';

const ONBOARDING_COMPLETED_KEY = '@KOOPE:onboarding_completed';
const AGE_VERIFIED_KEY = '@KOOPE:age_verified';

export function useSimpleOnboarding() {
  const [appState, setAppState] = useState<AppState>('loading');
  // Defense-in-depth double-fire guard for completeWelcome (audit/sprint-1
  // review, finding #5): WelcomeCarouselScreen already guards its own CTAs,
  // but this stops a second completion from re-running the AsyncStorage
  // write + analytics events even if it's ever invoked from elsewhere.
  const welcomeCompletedRef = useRef(false);

  useEffect(() => {
    // Initialize app state
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Clear saved items for fresh session
      await clearSavedItems();

      // Show splash screen
      setAppState('splash');
    } catch (error) {
      log.warn('useSimpleOnboarding', 'Error initializing app', { error });
      setAppState('splash');
    }
  };

  const clearSavedItems = async () => {
    try {
      await AsyncStorage.removeItem('savedItems');
      log.info('useSimpleOnboarding', 'Cleared saved items for new session');
    } catch (error) {
      log.warn('useSimpleOnboarding', 'Error clearing saved items', { error });
    }
  };

  const handleSplashFinish = async () => {
    try {
      const storedAgeVerification = await AsyncStorage.getItem(AGE_VERIFICATION_STORAGE_KEY);
      const parsedAgeVerification = storedAgeVerification ? JSON.parse(storedAgeVerification) as AgeVerificationPayload : null;
      if (
        !parsedAgeVerification ||
        parsedAgeVerification.isOfLegalAge !== true ||
        parsedAgeVerification.ruleVersion !== AGE_VERIFICATION_RULE_VERSION
      ) {
        log.info('useSimpleOnboarding', 'Age gate required before onboarding');
        setAppState('age_gate');
        return;
      }

      // Check if user has completed onboarding before
      const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);

      if (onboardingCompleted === 'true') {
        // Returning user - go directly to main app
        log.info('useSimpleOnboarding', 'Returning user detected, skipping onboarding');
        setAppState('main');
      } else {
        // New user - show the single welcome card
        log.info('useSimpleOnboarding', 'New user detected, starting onboarding');
        trackEvent(ANALYTICS_EVENTS.ONBOARDING_STARTED);
        setAppState('welcome');
      }
    } catch (error) {
      log.warn('useSimpleOnboarding', 'Error checking onboarding status', { error });
      // On error, fall back to the legal access gate before showing onboarding
      setAppState('age_gate');
    }
  };

  const completeAgeGate = async (payload: AgeVerificationPayload) => {
    try {
      await AsyncStorage.setItem(AGE_VERIFIED_KEY, 'true');
      await AsyncStorage.setItem(AGE_VERIFICATION_STORAGE_KEY, JSON.stringify(payload));
      log.info('useSimpleOnboarding', 'Age gate completed');
      trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, {
        [ANALYTICS_PROPS.STEP_NUMBER]: 0,
        [ANALYTICS_PROPS.STEP_NAME]: 'age_gate',
      });
      setAppState('welcome');
    } catch (error) {
      log.warn('useSimpleOnboarding', 'Error saving age gate status', { error });
      setAppState('welcome');
    }
  };

  const completeWelcome = async () => {
    // Master Plan Phase 1.4 onboarding inversion: age gate -> one welcome card -> camera.
    // The welcome carousel is the single onboarding card. On completion we mark
    // onboarding done and go straight to the main app, where App.tsx launches the
    // camera (SmartScan). Sign-in, the questionnaire, and the survey now happen
    // post-first-value (via the RefineYourTaste screen), not as pre-camera gates.
    if (welcomeCompletedRef.current) return;
    welcomeCompletedRef.current = true;
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, {
      [ANALYTICS_PROPS.STEP_NUMBER]: 1,
      [ANALYTICS_PROPS.STEP_NAME]: 'welcome_carousel',
    });
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      trackEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED);
      log.info('useSimpleOnboarding', 'Onboarding completed after welcome card');
    } catch (error) {
      log.warn('useSimpleOnboarding', 'Error saving onboarding completion status', { error });
    }
    setAppState('main');
  };

  const resetOnboarding = async () => {
    try {
      // Clear onboarding completion status
      await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
      await AsyncStorage.removeItem(AGE_VERIFIED_KEY);
      await AsyncStorage.removeItem(AGE_VERIFICATION_STORAGE_KEY);
      log.info('useSimpleOnboarding', 'Onboarding status reset');
    } catch (error) {
      log.warn('useSimpleOnboarding', 'Error resetting onboarding status', { error });
    }

    // Restart onboarding flow from the legal access gate
    setAppState('age_gate');
  };

  return {
    appState,
    handleSplashFinish,
    completeAgeGate,
    completeWelcome,
    resetOnboarding,
  };
}
