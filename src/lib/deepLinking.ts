/**
 * DEEP LINKING UTILITIES
 * Handles deep links to policy documents with anchor support
 * Supports: myapp://policy?doc=privacy&anchor=tracking&lang=en
 */

import { Linking } from 'react-native';
import type { PolicyDeepLink } from '../types/consent';
import { log } from './logger';

/**
 * Deep link URL patterns
 */
const DEEP_LINK_PATTERNS = {
  POLICY: /^(?:.*:\/\/)?policy\?(.*)$/,
  APP_SCHEME: 'homegameadvantage', // Change this to your app's URL scheme
} as const;

/**
 * Parse policy deep link URL
 */
export function parsePolicyDeepLink(url: string): PolicyDeepLink | null {
  try {
    const match = url.match(DEEP_LINK_PATTERNS.POLICY);
    if (!match) return null;

    const queryString = match[1];
    const params = new URLSearchParams(queryString);

    const doc = params.get('doc');
    if (!doc || !['privacy', 'terms'].includes(doc)) {
      return null;
    }

    return {
      doc: doc as 'privacy' | 'terms',
      anchor: params.get('anchor') || undefined,
      lang: params.get('lang') || undefined,
    };
  } catch (error) {
    log.error('DeepLinking', 'Failed to parse policy deep link', error);
    return null;
  }
}

/**
 * Generate policy deep link URL
 */
export function generatePolicyDeepLink(params: PolicyDeepLink): string {
  const baseUrl = `${DEEP_LINK_PATTERNS.APP_SCHEME}://policy`;
  const searchParams = new URLSearchParams();

  searchParams.set('doc', params.doc);

  if (params.anchor) {
    searchParams.set('anchor', params.anchor);
  }

  if (params.lang) {
    searchParams.set('lang', params.lang);
  }

  return `${baseUrl}?${searchParams.toString()}`;
}

/**
 * Handle incoming deep link URL
 */
export function handleDeepLink(url: string, navigation: any): boolean {
  try {
    log.info('DeepLinking', 'Handling deep link', { url });

    const policyLink = parsePolicyDeepLink(url);
    if (policyLink) {
      log.info('DeepLinking', 'Policy deep link detected', { policyLink });

      // Navigate to appropriate policy screen
      if (policyLink.doc === 'privacy') {
        navigation.navigate('PrivacyPolicy', {
          anchor: policyLink.anchor,
          lang: policyLink.lang,
        });
        return true;
      } else if (policyLink.doc === 'terms') {
        navigation.navigate('Terms', {
          anchor: policyLink.anchor,
          lang: policyLink.lang,
        });
        return true;
      }
    }

    // Add other deep link patterns here
    log.info('DeepLinking', 'Unhandled deep link pattern', { url });
    return false;

  } catch (error) {
    log.error('DeepLinking', 'Failed to handle deep link', error);
    return false;
  }
}

/**
 * Set up deep link listeners
 */
export function setupDeepLinking(navigation: any) {
  // Handle app opened via deep link
  const handleInitialURL = async () => {
    try {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        log.info('DeepLinking', 'App opened with deep link', { initialUrl });
        handleDeepLink(initialUrl, navigation);
      }
    } catch (error) {
      log.error('DeepLinking', 'Failed to handle initial URL', error);
    }
  };

  // Handle deep links while app is running
  const handleUrlChange = (event: { url: string }) => {
    log.info('DeepLinking', 'Deep link received while app running', { url: event.url });
    handleDeepLink(event.url, navigation);
  };

  // Set up listeners
  handleInitialURL();
  const subscription = Linking.addEventListener('url', handleUrlChange);

  // Return cleanup function
  return () => {
    subscription?.remove();
  };
}

/**
 * Open external URL with user confirmation
 */
export function openExternalURL(url: string, confirmationTitle = 'Open External Link') {
  try {
    // Check if URL can be opened
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        // For external URLs, you might want to show a confirmation first
        Linking.openURL(url);
      } else {
        log.warn('DeepLinking', 'Cannot open URL', { url });
      }
    });
  } catch (error) {
    log.error('DeepLinking', 'Failed to open external URL', error, { url });
  }
}

/**
 * Share policy link
 */
export function sharePolicyLink(params: PolicyDeepLink): string {
  const deepLink = generatePolicyDeepLink(params);

  // You could use React Native Share API here
  log.info('DeepLinking', 'Sharing policy link', { deepLink });

  return deepLink;
}

/**
 * Common deep link helpers
 */
export const DeepLinks = {
  /**
   * Link to privacy policy with specific section
   */
  privacyPolicy: (anchor?: string, lang?: string) =>
    generatePolicyDeepLink({ doc: 'privacy', anchor, lang }),

  /**
   * Link to terms & conditions
   */
  terms: (anchor?: string, lang?: string) =>
    generatePolicyDeepLink({ doc: 'terms', anchor, lang }),

  /**
   * Link to tracking technologies section
   */
  trackingTechnologies: (lang?: string) =>
    generatePolicyDeepLink({ doc: 'privacy', anchor: 'tracking-technologies', lang }),

  /**
   * Link to data rights section
   */
  dataRights: (lang?: string) =>
    generatePolicyDeepLink({ doc: 'privacy', anchor: 'your-privacy-rights', lang }),

  /**
   * Link to contact information
   */
  contact: (lang?: string) =>
    generatePolicyDeepLink({ doc: 'privacy', anchor: 'contact-us', lang }),
};

/**
 * Validation helpers
 */
export function isValidPolicyAnchor(anchor: string): boolean {
  // List of valid anchor IDs in your policy documents
  const validAnchors = [
    'introduction',
    'information-we-collect',
    'tracking-technologies',
    'information-sharing',
    'your-privacy-rights',
    'data-retention',
    'security',
    'contact-us',
    'changes-to-policy',
    'essential-functions',
    'analytics-and-improvement',
    'marketing-and-ads',
  ];

  return validAnchors.includes(anchor);
}

export function isValidLanguageCode(lang: string): boolean {
  // Supported language codes
  const supportedLanguages = ['en', 'fr', 'en-CA', 'fr-CA'];
  return supportedLanguages.includes(lang);
}

/**
 * URL scheme configuration for app.json/app.config.js
 * Add this to your Expo configuration:
 *
 * {
 *   "expo": {
 *     "scheme": "homegameadvantage",
 *     "web": {
 *       "bundler": "metro"
 *     }
 *   }
 * }
 */
export const EXPO_CONFIG_SCHEME = DEEP_LINK_PATTERNS.APP_SCHEME;