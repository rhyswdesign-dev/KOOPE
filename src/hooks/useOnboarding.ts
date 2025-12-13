import { useState, useEffect } from 'react';
import { log } from '../lib/logger';

type AppState = 'loading' | 'splash' | 'onboarding' | 'main';

const ONBOARDING_KEY = '@HomeGameAdvantage:onboarding_completed';

// Safe AsyncStorage with fallback
let AsyncStorage: any;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  log.warn('useOnboarding', 'AsyncStorage not available, using memory fallback');
  // Memory fallback for development
  const memoryStorage: { [key: string]: string } = {};
  AsyncStorage = {
    getItem: (key: string) => Promise.resolve(memoryStorage[key] || null),
    setItem: (key: string, value: string) => Promise.resolve(memoryStorage[key] = value),
    removeItem: (key: string) => Promise.resolve(delete memoryStorage[key]),
  };
}

export function useOnboarding() {
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (completed === 'true') {
        setAppState('splash'); // Show splash then go to main
      } else {
        setAppState('splash'); // Show splash then go to onboarding
      }
    } catch (error) {
      log.warn('useOnboarding', 'Error checking onboarding status', { error });
      setAppState('splash'); // Default to showing splash
    }
  };

  const handleSplashFinish = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (completed === 'true') {
        setAppState('main');
      } else {
        setAppState('onboarding');
      }
    } catch (error) {
      log.warn('useOnboarding', 'Error handling splash finish', { error });
      setAppState('onboarding'); // Default to onboarding if error
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setAppState('main');
    } catch (error) {
      log.warn('useOnboarding', 'Error completing onboarding', { error });
      setAppState('main'); // Still proceed to main app
    }
  };

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
      setAppState('onboarding');
    } catch (error) {
      log.warn('useOnboarding', 'Error resetting onboarding', { error });
    }
  };

  return {
    appState,
    handleSplashFinish,
    completeOnboarding,
    resetOnboarding,
  };
}