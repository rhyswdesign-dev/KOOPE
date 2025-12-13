/**
 * CONSENT STORAGE UTILITIES
 * Secure storage and management of user consent choices
 * Uses expo-secure-store for sensitive privacy data
 */

import * as SecureStore from 'expo-secure-store';
import { ConsentChoices, ConsentReceipt } from '../types/consent';
import { DEFAULT_CONSENT, PRIVACY_VERSION, TERMS_VERSION, getApplicableLaws } from '../../config/privacy';
import { getLocales } from 'expo-localization';
import Constants from 'expo-constants';
import { log } from './logger';

// Storage keys for secure store
const STORAGE_KEYS = {
  CONSENT_CHOICES: 'consent.choices',
  CONSENT_RECEIPTS: 'consent.receipts',
  PRIVACY_VERSION_SEEN: 'policy.privacyVersionSeen',
  TERMS_ACCEPTED_VERSION: 'policy.termsAcceptedVersion',
} as const;

/**
 * Get current user consent choices
 * Returns defaults if no consent has been given yet
 */
export async function getConsentChoices(): Promise<ConsentChoices> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEYS.CONSENT_CHOICES);
    if (stored) {
      return JSON.parse(stored) as ConsentChoices;
    }
    return DEFAULT_CONSENT;
  } catch (error) {
    log.warn('ConsentStore', 'Failed to read consent choices', error);
    return DEFAULT_CONSENT;
  }
}

/**
 * Save user consent choices and generate receipt
 * Creates audit trail for compliance requirements
 */
export async function saveConsentChoices(choices: ConsentChoices): Promise<void> {
  try {
    // Save the choices
    await SecureStore.setItemAsync(STORAGE_KEYS.CONSENT_CHOICES, JSON.stringify(choices));

    // Generate and store consent receipt
    const receipt = await generateConsentReceipt(choices);
    await saveConsentReceipt(receipt);

    log.info('ConsentStore', 'Consent choices saved successfully');
  } catch (error) {
    log.error('ConsentStore', 'Failed to save consent choices', error);
    throw error;
  }
}

/**
 * Generate a consent receipt for audit trail
 * Required for compliance with privacy regulations
 */
async function generateConsentReceipt(choices: ConsentChoices): Promise<ConsentReceipt> {
  const locales = getLocales();
  const primaryLocale = locales[0]?.languageTag || 'en-CA';

  return {
    timestamp: new Date().toISOString(),
    appVersion: Constants.expoConfig?.version || '1.0.0',
    locale: primaryLocale,
    regionFlags: getApplicableLaws(),
    policyVersions: {
      privacy: PRIVACY_VERSION,
      terms: TERMS_VERSION,
    },
    choices,
  };
}

/**
 * Save consent receipt to secure storage
 * Maintains array of receipts for audit purposes
 */
async function saveConsentReceipt(receipt: ConsentReceipt): Promise<void> {
  try {
    const existingReceipts = await getConsentReceipts();
    const updatedReceipts = [...existingReceipts, receipt];

    // Keep only last 10 receipts to avoid storage bloat
    const trimmedReceipts = updatedReceipts.slice(-10);

    await SecureStore.setItemAsync(
      STORAGE_KEYS.CONSENT_RECEIPTS,
      JSON.stringify(trimmedReceipts)
    );
  } catch (error) {
    log.error('ConsentStore', 'Failed to save consent receipt', error);
  }
}

/**
 * Get all consent receipts for audit purposes
 */
export async function getConsentReceipts(): Promise<ConsentReceipt[]> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEYS.CONSENT_RECEIPTS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    log.warn('ConsentStore', 'Failed to read consent receipts', error);
    return [];
  }
}

/**
 * Check if user has seen the current privacy policy version
 */
export async function hasSeenPrivacyVersion(version: string = PRIVACY_VERSION): Promise<boolean> {
  try {
    const seenVersion = await SecureStore.getItemAsync(STORAGE_KEYS.PRIVACY_VERSION_SEEN);
    return seenVersion === version;
  } catch (error) {
    log.warn('ConsentStore', 'Failed to check privacy version', error);
    return false;
  }
}

/**
 * Mark privacy policy version as seen
 */
export async function markPrivacyVersionSeen(version: string = PRIVACY_VERSION): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.PRIVACY_VERSION_SEEN, version);
  } catch (error) {
    log.error('ConsentStore', 'Failed to mark privacy version seen', error);
  }
}

/**
 * Check if user has accepted the current terms version
 */
export async function hasAcceptedTermsVersion(version: string = TERMS_VERSION): Promise<boolean> {
  try {
    const acceptedVersion = await SecureStore.getItemAsync(STORAGE_KEYS.TERMS_ACCEPTED_VERSION);
    return acceptedVersion === version;
  } catch (error) {
    log.warn('ConsentStore', 'Failed to check terms version', error);
    return false;
  }
}

/**
 * Mark terms version as accepted with timestamp
 */
export async function markTermsAccepted(version: string = TERMS_VERSION): Promise<void> {
  try {
    const acceptanceRecord = JSON.stringify({
      version,
      acceptedAt: new Date().toISOString(),
    });
    await SecureStore.setItemAsync(STORAGE_KEYS.TERMS_ACCEPTED_VERSION, acceptanceRecord);
  } catch (error) {
    log.error('ConsentStore', 'Failed to mark terms accepted', error);
  }
}

/**
 * Check if user needs to be prompted for consent
 * Based on first run, version changes, or regional requirements
 */
export async function needsConsentPrompt(): Promise<{
  needsPrompt: boolean;
  reasons: string[];
}> {
  const reasons: string[] = [];

  try {
    // Check if this is first run (no consent choices saved)
    const hasExistingChoices = await SecureStore.getItemAsync(STORAGE_KEYS.CONSENT_CHOICES);
    if (!hasExistingChoices) {
      reasons.push('first_run');
    }

    // Check if privacy policy version has changed
    const hasSeenPrivacy = await hasSeenPrivacyVersion();
    if (!hasSeenPrivacy) {
      reasons.push('privacy_updated');
    }

    // Check if terms have changed and need re-acceptance
    const hasAcceptedTerms = await hasAcceptedTermsVersion();
    if (!hasAcceptedTerms) {
      reasons.push('terms_updated');
    }

    return {
      needsPrompt: reasons.length > 0,
      reasons,
    };
  } catch (error) {
    log.error('ConsentStore', 'Failed to check consent prompt requirements', error);
    return {
      needsPrompt: true,
      reasons: ['error_checking'],
    };
  }
}

/**
 * Clear all consent data (for testing or data deletion requests)
 */
export async function clearAllConsentData(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.CONSENT_CHOICES),
      SecureStore.deleteItemAsync(STORAGE_KEYS.CONSENT_RECEIPTS),
      SecureStore.deleteItemAsync(STORAGE_KEYS.PRIVACY_VERSION_SEEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.TERMS_ACCEPTED_VERSION),
    ]);
    log.info('ConsentStore', 'All consent data cleared');
  } catch (error) {
    log.error('ConsentStore', 'Failed to clear consent data', error);
    throw error;
  }
}