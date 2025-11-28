/**
 * Simple Onboarding Hook
 *
 * Manages the onboarding flow for new users. The flow is:
 * 1. Splash screen
 * 2. Bartending Welcome screen ("Learn Bartending at Your Own Pace")
 * 3. Welcome Carousel (app features overview)
 * 4. Auth/Account Setup screen (can be skipped)
 * 5. Survey screen (taste preferences)
 * 6. Main app
 *
 * For returning users (who have completed onboarding before):
 * - Skips all onboarding screens after splash
 * - Goes directly to main app
 *
 * Onboarding completion is stored in AsyncStorage and persists across app restarts.
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';

type AppState = 'loading' | 'splash' | 'bartending_welcome' | 'welcome' | 'onboarding' | 'survey' | 'xp_reminder' | 'main';

const ONBOARDING_COMPLETED_KEY = '@KOOPE:onboarding_completed';

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

      // DEV MODE: Clear onboarding completion to always show full flow
      // TODO: Remove this line in production
      await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
      console.log('DEV MODE: Cleared onboarding status for fresh flow');

      // Show splash screen
      setAppState('splash');
    } catch (error) {
      console.log('Error initializing app:', error);
      setAppState('splash');
    }
  };

  const clearSavedItems = async () => {
    try {
      await AsyncStorage.removeItem('savedItems');
      console.log('Cleared saved items for new session');
    } catch (error) {
      console.log('Error clearing saved items:', error);
    }
  };

  const handleSplashFinish = async () => {
    try {
      // Check if user has completed onboarding before
      const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);

      if (onboardingCompleted === 'true') {
        // Returning user - go directly to main app
        console.log('Returning user detected, skipping onboarding');
        setAppState('main');
      } else {
        // New user - start onboarding flow
        console.log('New user detected, starting onboarding');
        trackEvent(ANALYTICS_EVENTS.ONBOARDING_STARTED);
        setAppState('bartending_welcome');
      }
    } catch (error) {
      console.log('Error checking onboarding status:', error);
      // On error, assume new user and show onboarding
      setAppState('bartending_welcome');
    }
  };

  const completeBartendingWelcome = () => {
    // After bartending welcome, show welcome carousel
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, {
      [ANALYTICS_PROPS.STEP_NUMBER]: 1,
      [ANALYTICS_PROPS.STEP_NAME]: 'bartending_welcome',
    });
    setAppState('welcome');
  };

  const completeWelcome = () => {
    // After welcome carousel, show account setup
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, {
      [ANALYTICS_PROPS.STEP_NUMBER]: 2,
      [ANALYTICS_PROPS.STEP_NAME]: 'welcome_carousel',
    });
    setAppState('onboarding');
  };

  const completeOnboarding = () => {
    // After account setup, show survey
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, {
      [ANALYTICS_PROPS.STEP_NUMBER]: 3,
      [ANALYTICS_PROPS.STEP_NAME]: 'account_setup',
    });
    setAppState('survey');
  };

  const completeSurvey = async () => {
    try {
      // Mark onboarding as completed in AsyncStorage
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      console.log('Onboarding completed and saved');

      // Track onboarding completion
      trackEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED);
    } catch (error) {
      console.log('Error saving onboarding completion status:', error);
    }

    // After survey, go to main app
    setAppState('main');
  };

  const skipToXPReminder = () => {
    // When user skips account setup, show XP reminder
    console.log('skipToXPReminder called');
    setAppState('xp_reminder');
  };

  const completeXPReminder = async () => {
    // After XP reminder, show survey (no need to save onboarding completion here as survey will do it)
    setAppState('survey');
  };

  const goBackToOnboarding = () => {
    // Go back from XP reminder to account setup
    setAppState('onboarding');
  };

  const resetOnboarding = async () => {
    try {
      // Clear onboarding completion status
      await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
      console.log('Onboarding status reset');
    } catch (error) {
      console.log('Error resetting onboarding status:', error);
    }

    // Restart onboarding flow
    setAppState('bartending_welcome');
  };

  return {
    appState,
    handleSplashFinish,
    completeBartendingWelcome,
    completeWelcome,
    completeOnboarding,
    completeSurvey,
    skipToXPReminder,
    completeXPReminder,
    goBackToOnboarding,
    resetOnboarding,
  };
}