/**
 * Survey Prompt Hook
 * Manages showing the survey prompt modal on second+ app open
 * Awards XP when survey is completed
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../lib/logger';

const APP_OPEN_COUNT_KEY = '@KOOPE:app_open_count';
const SURVEY_COMPLETED_KEY = '@KOOPE:survey_completed';
const SURVEY_DISMISSED_COUNT_KEY = '@KOOPE:survey_dismissed_count';

export function useSurveyPrompt() {
  const [showSurveyPrompt, setShowSurveyPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAndShowSurveyPrompt();
  }, []);

  const checkAndShowSurveyPrompt = async () => {
    try {
      // Increment app open count
      const appOpenCountStr = await AsyncStorage.getItem(APP_OPEN_COUNT_KEY);
      const appOpenCount = appOpenCountStr ? parseInt(appOpenCountStr, 10) : 0;
      const newOpenCount = appOpenCount + 1;
      await AsyncStorage.setItem(APP_OPEN_COUNT_KEY, newOpenCount.toString());

      // Check if survey has been completed
      const surveyCompleted = await AsyncStorage.getItem(SURVEY_COMPLETED_KEY);
      if (surveyCompleted === 'true') {
        log.info('useSurveyPrompt', 'Survey already completed, not showing prompt');
        setIsLoading(false);
        return;
      }

      // Check dismiss count
      const dismissedCountStr = await AsyncStorage.getItem(SURVEY_DISMISSED_COUNT_KEY);
      const dismissedCount = dismissedCountStr ? parseInt(dismissedCountStr, 10) : 0;

      // Show survey prompt on 2nd+ app open (but not if dismissed more than 3 times)
      if (newOpenCount >= 2 && dismissedCount < 3) {
        log.info('useSurveyPrompt', 'Showing survey prompt', { appOpenCount: newOpenCount, dismissedCount });
        setShowSurveyPrompt(true);
      } else {
        log.info('useSurveyPrompt', 'Not showing survey prompt', {
          appOpenCount: newOpenCount,
          dismissedCount,
          reason: dismissedCount >= 3 ? 'dismissed_too_many_times' : 'first_time_user'
        });
      }

      setIsLoading(false);
    } catch (error) {
      log.error('useSurveyPrompt', 'Error checking survey prompt status', { error });
      setIsLoading(false);
    }
  };

  const dismissSurveyPrompt = async () => {
    try {
      // Increment dismiss count
      const dismissedCountStr = await AsyncStorage.getItem(SURVEY_DISMISSED_COUNT_KEY);
      const dismissedCount = dismissedCountStr ? parseInt(dismissedCountStr, 10) : 0;
      const newDismissedCount = dismissedCount + 1;
      await AsyncStorage.setItem(SURVEY_DISMISSED_COUNT_KEY, newDismissedCount.toString());

      log.info('useSurveyPrompt', 'Survey prompt dismissed', { dismissedCount: newDismissedCount });
      setShowSurveyPrompt(false);
    } catch (error) {
      log.error('useSurveyPrompt', 'Error dismissing survey prompt', { error });
      setShowSurveyPrompt(false);
    }
  };

  const completeSurvey = async () => {
    try {
      // Mark survey as completed
      await AsyncStorage.setItem(SURVEY_COMPLETED_KEY, 'true');
      log.info('useSurveyPrompt', 'Survey marked as completed');
      setShowSurveyPrompt(false);
    } catch (error) {
      log.error('useSurveyPrompt', 'Error marking survey as completed', { error });
      setShowSurveyPrompt(false);
    }
  };

  const resetSurveyPrompt = async () => {
    try {
      await AsyncStorage.multiRemove([
        APP_OPEN_COUNT_KEY,
        SURVEY_COMPLETED_KEY,
        SURVEY_DISMISSED_COUNT_KEY,
      ]);
      log.info('useSurveyPrompt', 'Survey prompt status reset');
      setShowSurveyPrompt(false);
    } catch (error) {
      log.error('useSurveyPrompt', 'Error resetting survey prompt', { error });
    }
  };

  return {
    showSurveyPrompt,
    isLoading,
    dismissSurveyPrompt,
    completeSurvey,
    resetSurveyPrompt,
  };
}
