/**
 * PRIVACY CONFIGURATION
 * Central configuration for legal compliance features
 * Update these flags based on your app's target markets and user base
 */

import { AppPrivacyConfig } from '../src/types/consent';

/**
 * Current policy versions - UPDATE THESE WHEN POLICIES CHANGE
 * Use YYYY-MM-DD format for easy comparison and sorting
 */
export const PRIVACY_VERSION = '2025-09-20';
export const TERMS_VERSION = '2026-05-31';

/**
 * Regional compliance configuration
 * Enable flags based on where your users are located
 */
export const privacyConfig: AppPrivacyConfig = {
  // GDPR compliance for EU residents
  // When true: defaults non-essential toggles OFF, requires explicit opt-in
  enforceGDPR: false,

  // CPRA compliance for California residents
  // When true: adds "Do Not Sell" link and enhanced data rights
  enforceCPRA: false,

  // Quebec Law 25 compliance for Quebec residents
  // When true: requires explicit opt-in for non-essential tracking
  enforceQuebecLaw25: true, // Canada-first compliance

  // Contact information for privacy inquiries
  contact: {
    // Privacy officer info (required under Quebec Law 25 if enforceQuebecLaw25 = true)
    privacyOfficer: {
      name: 'Privacy Officer',
      email: 'privacy@homegameadvantage.com',
      // address: '123 Main St, Montreal, QC H1A 1A1', // Optional
      // phone: '+1-555-PRIVACY', // Optional
    },

    // General contact emails
    dataProtectionEmail: 'privacy@homegameadvantage.com',
    supportEmail: 'support@homegameadvantage.com',
  },
};

/**
 * Default consent choices for new users
 * Essential is always true and non-toggleable
 */
export const DEFAULT_CONSENT = {
  essential: true as const,
  analytics: !privacyConfig.enforceGDPR && !privacyConfig.enforceQuebecLaw25, // Default OFF for strict regions
  crash: true, // Generally acceptable for app stability
  marketing: false, // Always require explicit opt-in
};

/**
 * Consent category descriptions for UI
 * Used in consent center and modal explanations
 */
export const CONSENT_CATEGORIES = {
  essential: {
    title: 'Essential',
    description: 'Required for core app functionality like user accounts and settings. Cannot be disabled.',
    examples: ['User authentication', 'App preferences', 'Security features'],
    required: true,
  },
  analytics: {
    title: 'Analytics',
    description: 'Helps us understand how you use the app to improve performance and features.',
    examples: ['Usage statistics', 'Performance metrics', 'Feature adoption'],
    required: false,
  },
  crash: {
    title: 'Crash Reporting',
    description: 'Automatically reports app crashes and errors to help us fix bugs faster.',
    examples: ['Error logs', 'Crash reports', 'Debug information'],
    required: false,
  },
  marketing: {
    title: 'Marketing & Ads',
    description: 'Enables personalized content and advertising based on your interests.',
    examples: ['Advertising ID', 'Personalized ads', 'Marketing campaigns'],
    required: false,
  },
} as const;

/**
 * Tracking technologies used by the app
 * Disclosed in privacy policy and consent center
 */
export const TRACKING_TECHNOLOGIES = {
  deviceIdentifiers: 'Unique device and installation identifiers',
  analyticsSDKs: 'Analytics and performance monitoring SDKs',
  crashLogs: 'Automated crash and error reporting',
  advertisingIds: 'Platform advertising identifiers (iOS IDFA, Android Ad ID)',
  permissions: 'Device permissions and capabilities access',
} as const;

/**
 * Helper function to check if user is in a strict privacy region
 * Used to determine default consent and UI behavior
 */
export function isStrictPrivacyRegion(): boolean {
  return privacyConfig.enforceGDPR ||
         privacyConfig.enforceQuebecLaw25 ||
         privacyConfig.enforceCPRA;
}

/**
 * Get applicable privacy laws based on configuration
 * Used for consent receipt generation
 */
export function getApplicableLaws() {
  return {
    gdpr: privacyConfig.enforceGDPR,
    cpra: privacyConfig.enforceCPRA,
    law25: privacyConfig.enforceQuebecLaw25,
  };
}
