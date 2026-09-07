/**
 * DEEP LINKING UTILITIES
 * Handles deep links to policy documents with anchor support
 * Supports: myapp://policy?doc=privacy&anchor=tracking&lang=en
 * Also handles shared URLs from social media for recipe import
 */

import { Linking } from 'react-native';
import type { PolicyDeepLink } from '../types/consent';
import { log } from './logger';
import { navigateWhenReady } from './navigationRef';
import { checkFeatureAccess } from '../hooks/useFeatureAccess';
import type { FeatureKey } from '../config/featureRegistry';
import { useUserTier } from '../store/useUserTier';

/**
 * Deep link URL patterns
 */
const DEEP_LINK_PATTERNS = {
  POLICY: /^(?:.*:\/\/)?policy\?(.*)$/,
  APP_SCHEME: 'koope', // Updated to match app.json
} as const;

/**
 * Legacy scheme retired when the app was renamed HomeGameAdvantage -> KŌOPE.
 * Links persisted in old scheduled notifications still carry it, so the
 * notification router normalizes it away rather than dropping the tap.
 */
const LEGACY_APP_SCHEME = 'homegameadvantage';

/**
 * Notification deep-link targets (Notification Playbook §1, law 2: every
 * notification deep-links to exactly one action). The path is the contract —
 * `actionUrl` values scheduled anywhere in the app must be one of these, and
 * each maps to a route that exists in RootNavigator.
 *
 * Values are resolved lazily against the query string so a single path can
 * carry a focus hint (e.g. `koope://hosting?focus=shopping`).
 */
type NotificationRoute = { name: string; params?: Record<string, any> };

const NOTIFICATION_ROUTES: Record<string, (params: URLSearchParams) => NotificationRoute> = {
  'what-can-i-make': () => ({ name: 'WhatCanIMake' }),
  hosting: (params) => ({ name: 'Hosting', params: { focus: params.get('focus') ?? undefined } }),
  'home-bar': () => ({ name: 'HomeBar' }),
  profile: () => ({ name: 'Profile' }),
  vault: () => ({ name: 'Vault' }),
  paywall: () => ({ name: 'Paywall' }),
  notifications: () => ({ name: 'NotificationCenter' }),
  recipes: () => ({ name: 'Main', params: { screen: 'Recipes' } }),
  shelf: () => ({ name: 'Main', params: { screen: 'Shelf' } }),
  lessons: () => ({
    name: 'Main',
    params: { screen: 'Profile', params: { screen: 'Lessons' } },
  }),
};

/**
 * Social media URL patterns for recipe import
 */
const SOCIAL_MEDIA_PATTERNS = [
  /instagram\.com/i,
  /instagr\.am/i,
  /pinterest\.com/i,
  /pin\.it/i,
  /twitter\.com/i,
  /x\.com/i,
  /tiktok\.com/i,
  /vm\.tiktok\.com/i,
  /youtube\.com/i,
  /youtu\.be/i,
];
const HTTP_URL_PATTERN = /(https?:\/\/[^\s"'<>]+)/i;

function detectSocialPlatform(url: string): string {
  if (/instagram\.com|instagr\.am/i.test(url)) return 'instagram';
  if (/pinterest\.com|pin\.it/i.test(url)) return 'pinterest';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  if (/tiktok\.com|vm\.tiktok\.com/i.test(url)) return 'tiktok';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  return 'other';
}

function extractRecipeUrlFromPayload(raw: string): string | null {
  if (!raw) return null;

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }

  try {
    const parsed = new URL(raw);
    const explicitUrl = parsed.searchParams.get('url') || parsed.searchParams.get('link');
    if (explicitUrl && (explicitUrl.startsWith('http://') || explicitUrl.startsWith('https://'))) {
      return decodeURIComponent(explicitUrl);
    }

    const text = parsed.searchParams.get('text') || parsed.searchParams.get('message') || '';
    const textMatch = text.match(HTTP_URL_PATTERN);
    if (textMatch?.[1]) return textMatch[1];
  } catch {
    // Ignore malformed URL payload and try generic text extraction below
  }

  const directMatch = raw.match(HTTP_URL_PATTERN);
  if (directMatch?.[1]) return directMatch[1];

  return null;
}

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
 * Routes that lead to a paid feature. The in-app buttons that normally reach
 * these screens gate through useFeatureAccess first, but a deep link
 * (notification tap, widget, share sheet) skips that button entirely — so
 * every resolved route is re-checked against the user's tier here, and swapped
 * for the paywall when the destination isn't unlocked.
 */
const GATED_ROUTES: Partial<Record<string, FeatureKey>> = {
  WhatCanIMake: 'what_can_i_make',
};

function applyFeatureGate(route: NotificationRoute): NotificationRoute {
  const featureKey = GATED_ROUTES[route.name];
  if (!featureKey) return route;

  const tier = useUserTier.getState().tier;
  if (checkFeatureAccess(featureKey, tier)) return route;

  return {
    name: 'Paywall',
    params: { displayCloseButton: true, source: featureKey },
  };
}

/**
 * Resolve a notification `actionUrl` to a concrete navigator route.
 * Returns null when the URL isn't one of the notification targets above —
 * callers then fall through to the generic deep-link handler.
 */
export function resolveNotificationRoute(url: string): NotificationRoute | null {
  if (!url) return null;

  try {
    const normalized = url.replace(
      `${LEGACY_APP_SCHEME}://`,
      `${DEEP_LINK_PATTERNS.APP_SCHEME}://`,
    );

    // Only our own scheme (or a bare path) routes here — an https:// link that
    // happens to contain "/hosting" belongs to the web/share handlers below.
    const schemeMatch = normalized.match(/^([a-z][a-z0-9+.-]*):\/\//i);
    if (schemeMatch && schemeMatch[1].toLowerCase() !== DEEP_LINK_PATTERNS.APP_SCHEME) return null;

    const withoutScheme = schemeMatch ? normalized.slice(schemeMatch[0].length) : normalized;
    const [pathPart, queryPart = ''] = withoutScheme.split('?');
    const segment = pathPart.split('/').filter(Boolean)[0];
    if (!segment) return null;

    const resolver = NOTIFICATION_ROUTES[segment];
    if (!resolver) return null;

    return resolver(new URLSearchParams(queryPart));
  } catch (error) {
    log.error('DeepLinking', 'Failed to resolve notification route', error, { url });
    return null;
  }
}

/**
 * Navigate to a notification `actionUrl` using the app-wide navigation ref.
 * Safe to call from a cold start — navigateWhenReady queues until the
 * NavigationContainer mounts. Returns true if a route was matched.
 */
export function navigateToActionUrl(url: string): boolean {
  const resolved = resolveNotificationRoute(url);
  if (!resolved) {
    log.warn('DeepLinking', 'No route for notification actionUrl', { url });
    return false;
  }

  const route = applyFeatureGate(resolved);
  log.nav('DeepLinking', route.name, { url, params: route.params });
  navigateWhenReady(route.name, route.params);
  return true;
}

/**
 * Check if URL is a social media URL that could contain a recipe
 */
export function isSocialMediaUrl(url: string): boolean {
  return SOCIAL_MEDIA_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Handle incoming deep link URL
 */
export function handleDeepLink(url: string, navigation: any): boolean {
  try {
    log.info('DeepLinking', 'Handling deep link', { url });

    // Check for policy deep links first
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
        navigation.navigate('TermsOfService', {
          anchor: policyLink.anchor,
          lang: policyLink.lang,
        });
        return true;
      }
    }

    // Notification / in-app deep links (koope://hosting, koope://what-can-i-make, ...)
    const resolvedRoute = resolveNotificationRoute(url);
    if (resolvedRoute) {
      const notificationRoute = applyFeatureGate(resolvedRoute);
      log.info('DeepLinking', 'Notification deep link detected', { notificationRoute });
      navigation.navigate(notificationRoute.name, notificationRoute.params);
      return true;
    }

    // Handle shared payloads and recipe links.
    const extractedRecipeUrl = extractRecipeUrlFromPayload(url);
    if (extractedRecipeUrl) {
      const platform = isSocialMediaUrl(extractedRecipeUrl)
        ? detectSocialPlatform(extractedRecipeUrl)
        : 'web';

      log.info('DeepLinking', 'Shared URL detected for recipe import', {
        inbound: url,
        extractedRecipeUrl,
        platform,
      });

      navigation.navigate('Main', {
        screen: 'Camera',
        params: { screen: 'RecipeURLImport', params: { url: extractedRecipeUrl } },
      });
      return true;
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
  terms: (anchor?: string, lang?: string) => generatePolicyDeepLink({ doc: 'terms', anchor, lang }),

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
 * URL scheme configuration — mirrors app.json's `expo.scheme`.
 *
 * {
 *   "expo": {
 *     "scheme": "koope",
 *     "web": {
 *       "bundler": "metro"
 *     }
 *   }
 * }
 *
 * The retired `homegameadvantage://` scheme is normalized to this one by
 * resolveNotificationRoute so links baked into older scheduled notifications
 * still land.
 */
export const EXPO_CONFIG_SCHEME = DEEP_LINK_PATTERNS.APP_SCHEME;
