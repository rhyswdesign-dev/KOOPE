/**
 * CONSENT MANAGEMENT HOOK
 * React hook for managing user consent choices and privacy preferences
 * Provides real-time consent status for analytics gating
 */

import { useState, useEffect, useCallback } from 'react';
import { ConsentChoices, ConsentCategory } from '../types/consent';
import {
  getConsentChoices,
  saveConsentChoices,
  needsConsentPrompt,
  hasSeenPrivacyVersion,
  hasAcceptedTermsVersion,
  markPrivacyVersionSeen,
  markTermsAccepted,
} from '../lib/consentStore';
import { DEFAULT_CONSENT } from '../../config/privacy';
import { log } from '../lib/logger';

interface UseConsentReturn {
  // Current consent state
  choices: ConsentChoices;
  loading: boolean;
  error: string | null;

  // Consent management
  updateConsent: (category: ConsentCategory, enabled: boolean) => Promise<void>;
  saveAllConsent: (choices: ConsentChoices) => Promise<void>;
  acceptAllConsent: () => Promise<void>;
  rejectAllConsent: () => Promise<void>;

  // Convenience getters
  hasConsent: (category: ConsentCategory) => boolean;
  canTrack: (category: ConsentCategory) => boolean;

  // Version management
  needsPrompt: boolean;
  promptReasons: string[];
  markPrivacySeen: () => Promise<void>;
  markTermsAccepted: () => Promise<void>;

  // Status checks
  hasSeenCurrentPrivacy: boolean;
  hasAcceptedCurrentTerms: boolean;

  // Actions
  refresh: () => Promise<void>;
}

/**
 * Hook for managing user consent preferences
 * Handles consent storage, version tracking, and compliance checks
 */
export function useConsent(): UseConsentReturn {
  const [choices, setChoices] = useState<ConsentChoices>(DEFAULT_CONSENT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPrompt, setNeedsPrompt] = useState(false);
  const [promptReasons, setPromptReasons] = useState<string[]>([]);
  const [hasSeenCurrentPrivacy, setHasSeenCurrentPrivacy] = useState(false);
  const [hasAcceptedCurrentTerms, setHasAcceptedCurrentTerms] = useState(false);

  /**
   * Load consent data from secure storage
   */
  const loadConsentData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load current consent choices
      const currentChoices = await getConsentChoices();
      setChoices(currentChoices);

      // Check if prompt is needed
      const promptCheck = await needsConsentPrompt();
      setNeedsPrompt(promptCheck.needsPrompt);
      setPromptReasons(promptCheck.reasons);

      // Check version status
      const seenPrivacy = await hasSeenPrivacyVersion();
      const acceptedTerms = await hasAcceptedTermsVersion();
      setHasSeenCurrentPrivacy(seenPrivacy);
      setHasAcceptedCurrentTerms(acceptedTerms);

    } catch (err) {
      log.error('useConsent', 'Failed to load consent data', err);
      setError('Failed to load privacy preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadConsentData();
  }, [loadConsentData]);

  /**
   * Update a single consent category
   */
  const updateConsent = useCallback(async (category: ConsentCategory, enabled: boolean) => {
    if (category === 'essential') {
      log.warn('useConsent', 'Cannot modify essential consent - always required', { category });
      return;
    }

    try {
      const newChoices = { ...choices, [category]: enabled };
      await saveConsentChoices(newChoices);
      setChoices(newChoices);
    } catch (err) {
      log.error('useConsent', 'Failed to update consent', err, { category, enabled });
      setError('Failed to save privacy preferences');
      throw err;
    }
  }, [choices]);

  /**
   * Save all consent choices at once
   */
  const saveAllConsent = useCallback(async (newChoices: ConsentChoices) => {
    try {
      await saveConsentChoices(newChoices);
      setChoices(newChoices);

      // Update prompt status after saving
      const promptCheck = await needsConsentPrompt();
      setNeedsPrompt(promptCheck.needsPrompt);
      setPromptReasons(promptCheck.reasons);
    } catch (err) {
      log.error('useConsent', 'Failed to save all consent', err);
      setError('Failed to save privacy preferences');
      throw err;
    }
  }, []);

  /**
   * Accept all non-essential tracking
   */
  const acceptAllConsent = useCallback(async () => {
    const allAccepted: ConsentChoices = {
      essential: true,
      analytics: true,
      crash: true,
      marketing: true,
    };
    await saveAllConsent(allAccepted);
  }, [saveAllConsent]);

  /**
   * Reject all non-essential tracking
   */
  const rejectAllConsent = useCallback(async () => {
    const allRejected: ConsentChoices = {
      essential: true,
      analytics: false,
      crash: false,
      marketing: false,
    };
    await saveAllConsent(allRejected);
  }, [saveAllConsent]);

  /**
   * Check if user has consented to a specific category
   */
  const hasConsent = useCallback((category: ConsentCategory): boolean => {
    return choices[category] === true;
  }, [choices]);

  /**
   * Check if tracking is allowed for a category (alias for hasConsent)
   */
  const canTrack = useCallback((category: ConsentCategory): boolean => {
    return hasConsent(category);
  }, [hasConsent]);

  /**
   * Mark current privacy policy as seen
   */
  const markPrivacySeen = useCallback(async () => {
    try {
      await markPrivacyVersionSeen();
      setHasSeenCurrentPrivacy(true);

      // Update prompt status
      const promptCheck = await needsConsentPrompt();
      setNeedsPrompt(promptCheck.needsPrompt);
      setPromptReasons(promptCheck.reasons);
    } catch (err) {
      log.error('useConsent', 'Failed to mark privacy seen', err);
    }
  }, []);

  /**
   * Mark current terms as accepted
   */
  const markTermsAcceptedHook = useCallback(async () => {
    try {
      await markTermsAccepted();
      setHasAcceptedCurrentTerms(true);

      // Update prompt status
      const promptCheck = await needsConsentPrompt();
      setNeedsPrompt(promptCheck.needsPrompt);
      setPromptReasons(promptCheck.reasons);
    } catch (err) {
      log.error('useConsent', 'Failed to mark terms accepted', err);
    }
  }, []);

  /**
   * Refresh all consent data
   */
  const refresh = useCallback(async () => {
    await loadConsentData();
  }, [loadConsentData]);

  return {
    // State
    choices,
    loading,
    error,

    // Actions
    updateConsent,
    saveAllConsent,
    acceptAllConsent,
    rejectAllConsent,

    // Getters
    hasConsent,
    canTrack,

    // Version management
    needsPrompt,
    promptReasons,
    markPrivacySeen,
    markTermsAccepted: markTermsAcceptedHook,

    // Status
    hasSeenCurrentPrivacy,
    hasAcceptedCurrentTerms,

    // Utils
    refresh,
  };
}