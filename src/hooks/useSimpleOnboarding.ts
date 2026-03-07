/**
 * Simple Onboarding Hook
 *
 * Manages the onboarding flow for new users. The flow is:
 * 1. Splash screen
 * 2. Welcome Carousel (starts with "Welcome to KŌOPE")
 * 3. Auth/Account Setup screen (can be skipped)
 * 4. Bartending Welcome screen ("Learn Bartending at Your Own Pace")
 * 5. Questionnaire + trial offer + payoff + first action
 * 6. Main app
 *
 * For returning users (who have completed onboarding before):
 * - Skips all onboarding screens after splash
 * - Goes directly to main app
 * - May see survey prompt modal if they haven't completed it yet
 *
 * Onboarding completion is stored in AsyncStorage and persists across app restarts.
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';
import { log } from '../lib/logger';

type AppState =
  | 'loading'
  | 'splash'
  | 'age_gate'
  | 'bartending_welcome'
  | 'welcome'
  | 'onboarding'
  | 'questionnaire'
  | 'survey'
  | 'xp_reminder'
  | 'main';

const ONBOARDING_COMPLETED_KEY = '@KOOPE:onboarding_completed';
const AGE_VERIFIED_KEY = '@KOOPE:age_verified';

export function useSimpleOnboarding() {
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    // Initialize app state
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Clear saved items for fresh session
      await clearSavedItems();

      // DEV MODE: Uncomment to reset on every reload (currently OFF to preserve sign-in)
      // await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
      // await supabase.auth.signOut();
      // log.info('useSimpleOnboarding', 'DEV MODE: Cleared onboarding status and signed out for fresh flow');

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
      const ageVerified = await AsyncStorage.getItem(AGE_VERIFIED_KEY);
      if (ageVerified !== 'true') {
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
        // New user - start onboarding flow with Welcome Carousel first
        log.info('useSimpleOnboarding', 'New user detected, starting onboarding');
        trackEvent(ANALYTICS_EVENTS.ONBOARDING_STARTED);
        setAppState('welcome');
      }
    } catch (error) {
      log.warn('useSimpleOnboarding', 'Error checking onboarding status', { error });
      // On error, assume new user and show onboarding
      setAppState('bartending_welcome');
    }
  };

  const completeWelcome = () => {
    // After welcome carousel, show account setup
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, {
      [ANALYTICS_PROPS.STEP_NUMBER]: 1,
      [ANALYTICS_PROPS.STEP_NAME]: 'welcome_carousel',
    });
    setAppState('onboarding');
  };

  const completeAgeGate = async () => {
    try {
      await AsyncStorage.setItem(AGE_VERIFIED_KEY, 'true');
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

  const completeOnboarding = () => {
    // After account setup, show bartending welcome
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, {
      [ANALYTICS_PROPS.STEP_NUMBER]: 2,
      [ANALYTICS_PROPS.STEP_NAME]: 'account_setup',
    });
    setAppState('bartending_welcome');
  };

  const completeBartendingWelcome = async () => {
    // After bartending welcome, continue onboarding questionnaire flow
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, {
      [ANALYTICS_PROPS.STEP_NUMBER]: 3,
      [ANALYTICS_PROPS.STEP_NAME]: 'bartending_welcome',
    });
    setAppState('questionnaire');
  };

  const completeSurvey = async () => {
    try {
      // Mark onboarding as completed in AsyncStorage
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      log.info('useSimpleOnboarding', 'Onboarding completed and saved');

      // Track onboarding completion
      trackEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED);
    } catch (error) {
      log.warn('useSimpleOnboarding', 'Error saving onboarding completion status', { error });
    }

    // After survey, go to main app
    setAppState('main');
  };

  const skipToXPReminder = () => {
    // When user skips account setup, show XP reminder
    log.info('useSimpleOnboarding', 'User skipped to XP reminder');
    setAppState('xp_reminder');
  };

  const completeXPReminder = async () => {
    // Continue onboarding questionnaire after XP reminder
    setAppState('questionnaire');
  };

  const goBackToOnboarding = () => {
    // Go back from XP reminder to account setup
    setAppState('onboarding');
  };

  const completeQuestionnaire = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      log.info('useSimpleOnboarding', 'Onboarding questionnaire completed and saved');
      trackEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED);
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
      log.info('useSimpleOnboarding', 'Onboarding status reset');
    } catch (error) {
      log.warn('useSimpleOnboarding', 'Error resetting onboarding status', { error });
    }

    // Restart onboarding flow
    setAppState('bartending_welcome');
  };

  return {
    appState,
    handleSplashFinish,
    completeAgeGate,
    completeBartendingWelcome,
    completeWelcome,
    completeOnboarding,
    completeSurvey,
    completeQuestionnaire,
    skipToXPReminder,
    completeXPReminder,
    goBackToOnboarding,
    resetOnboarding,
  };
}
