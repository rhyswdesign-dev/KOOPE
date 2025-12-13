/**
 * ANALYTICS GUARD
 * Consent-aware wrapper for analytics and crash reporting SDKs
 * Gates all tracking behind user consent choices
 */

import React from 'react';
import { useConsent } from '../hooks/useConsent';
import type { ConsentCategory } from '../types/consent';
import { log } from './logger';

/**
 * Analytics event interface
 */
interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
}

/**
 * Crash report interface
 */
interface CrashReport {
  error: Error;
  context?: Record<string, any>;
  userId?: string;
}

/**
 * Marketing event interface
 */
interface MarketingEvent {
  campaign?: string;
  source?: string;
  medium?: string;
  content?: string;
  properties?: Record<string, any>;
}

/**
 * Analytics Guard class - singleton for consent-aware tracking
 */
class AnalyticsGuard {
  private static instance: AnalyticsGuard;
  private consentHook: ReturnType<typeof useConsent> | null = null;
  private initialized = false;

  // SDK instances (replace with your actual SDKs)
  private analytics: any = null;
  private crashReporter: any = null;
  private marketingSDK: any = null;

  private constructor() {}

  public static getInstance(): AnalyticsGuard {
    if (!AnalyticsGuard.instance) {
      AnalyticsGuard.instance = new AnalyticsGuard();
    }
    return AnalyticsGuard.instance;
  }

  /**
   * Initialize analytics guard with consent hook
   * Call this in your app's root component
   */
  public initialize(consentHook: ReturnType<typeof useConsent>) {
    this.consentHook = consentHook;
    this.initialized = true;

    // Initialize SDKs based on current consent
    this.initializeSDKs();

    log.info('AnalyticsGuard', 'Initialized with consent state', { choices: consentHook.choices });
  }

  /**
   * Initialize SDKs based on current consent choices
   */
  private initializeSDKs() {
    if (!this.consentHook) return;

    const { canTrack } = this.consentHook;

    // Initialize analytics SDK if consent given
    if (canTrack('analytics') && !this.analytics) {
      this.initializeAnalytics();
    }

    // Initialize crash reporting if consent given
    if (canTrack('crash') && !this.crashReporter) {
      this.initializeCrashReporting();
    }

    // Initialize marketing SDK if consent given
    if (canTrack('marketing') && !this.marketingSDK) {
      this.initializeMarketingSDK();
    }

    // Disable SDKs if consent withdrawn
    if (!canTrack('analytics') && this.analytics) {
      this.disableAnalytics();
    }

    if (!canTrack('crash') && this.crashReporter) {
      this.disableCrashReporting();
    }

    if (!canTrack('marketing') && this.marketingSDK) {
      this.disableMarketingSDK();
    }
  }

  /**
   * Initialize analytics SDK (replace with your actual SDK)
   */
  private initializeAnalytics() {
    try {
      // Example: Initialize your analytics SDK here
      // this.analytics = new AnalyticsSDK({
      //   apiKey: 'your-api-key',
      //   debugMode: __DEV__,
      // });

      // For demo purposes, we'll use a mock implementation
      this.analytics = {
        track: (event: string, properties?: any) => {
          log.info('AnalyticsGuard', 'Analytics tracked', { event, properties });
        },
        identify: (userId: string, traits?: any) => {
          log.info('AnalyticsGuard', 'User identified', { userId, traits });
        },
        screen: (screenName: string, properties?: any) => {
          log.info('AnalyticsGuard', 'Screen tracked', { screenName, properties });
        },
      };

      log.info('AnalyticsGuard', 'Analytics SDK initialized');
    } catch (error) {
      log.error('AnalyticsGuard', 'Failed to initialize analytics SDK', error);
    }
  }

  /**
   * Initialize crash reporting SDK (replace with your actual SDK)
   */
  private initializeCrashReporting() {
    try {
      // Example: Initialize Sentry or similar
      // import * as Sentry from '@sentry/react-native';
      // Sentry.init({
      //   dsn: 'your-sentry-dsn',
      // });

      // For demo purposes, we'll use a mock implementation
      this.crashReporter = {
        captureException: (error: Error, context?: any) => {
          log.error('AnalyticsGuard', 'Crash report captured', error, { context });
        },
        setUser: (user: any) => {
          log.info('AnalyticsGuard', 'Crash reporter user set', { user });
        },
        addBreadcrumb: (breadcrumb: any) => {
          log.debug('AnalyticsGuard', 'Breadcrumb added', { breadcrumb });
        },
      };

      log.info('AnalyticsGuard', 'Crash reporting SDK initialized');
    } catch (error) {
      log.error('AnalyticsGuard', 'Failed to initialize crash reporting SDK', error);
    }
  }

  /**
   * Initialize marketing/advertising SDK
   */
  private initializeMarketingSDK() {
    try {
      // Example: Initialize marketing/advertising SDK
      // this.marketingSDK = new MarketingSDK({
      //   apiKey: 'your-marketing-api-key',
      // });

      // For demo purposes, we'll use a mock implementation
      this.marketingSDK = {
        trackCampaign: (campaign: string, properties?: any) => {
          log.info('AnalyticsGuard', 'Marketing campaign tracked', { campaign, properties });
        },
        trackConversion: (event: string, value?: number) => {
          log.info('AnalyticsGuard', 'Conversion tracked', { event, value });
        },
      };

      log.info('AnalyticsGuard', 'Marketing SDK initialized');
    } catch (error) {
      log.error('AnalyticsGuard', 'Failed to initialize marketing SDK', error);
    }
  }

  /**
   * Disable analytics SDK
   */
  private disableAnalytics() {
    this.analytics = null;
    log.info('AnalyticsGuard', 'Analytics SDK disabled');
  }

  /**
   * Disable crash reporting SDK
   */
  private disableCrashReporting() {
    this.crashReporter = null;
    log.info('AnalyticsGuard', 'Crash reporting SDK disabled');
  }

  /**
   * Disable marketing SDK
   */
  private disableMarketingSDK() {
    this.marketingSDK = null;
    log.info('AnalyticsGuard', 'Marketing SDK disabled');
  }

  /**
   * Check if tracking is allowed for a category
   */
  private canTrack(category: ConsentCategory): boolean {
    if (!this.initialized || !this.consentHook) {
      log.warn('AnalyticsGuard', 'Not initialized');
      return false;
    }

    return this.consentHook.canTrack(category);
  }

  /**
   * Track analytics event (consent-gated)
   */
  public trackEvent(event: AnalyticsEvent) {
    if (!this.canTrack('analytics') || !this.analytics) {
      log.info('AnalyticsGuard', 'Analytics tracking blocked by consent');
      return;
    }

    try {
      this.analytics.track(event.name, event.properties);
    } catch (error) {
      log.error('AnalyticsGuard', 'Failed to track analytics event', error);
    }
  }

  /**
   * Track screen view (consent-gated)
   */
  public trackScreen(screenName: string, properties?: Record<string, any>) {
    if (!this.canTrack('analytics') || !this.analytics) {
      log.info('AnalyticsGuard', 'Screen tracking blocked by consent');
      return;
    }

    try {
      this.analytics.screen(screenName, properties);
    } catch (error) {
      log.error('AnalyticsGuard', 'Failed to track screen', error);
    }
  }

  /**
   * Identify user (consent-gated)
   */
  public identifyUser(userId: string, traits?: Record<string, any>) {
    if (!this.canTrack('analytics') || !this.analytics) {
      log.info('AnalyticsGuard', 'User identification blocked by consent');
      return;
    }

    try {
      this.analytics.identify(userId, traits);
    } catch (error) {
      log.error('AnalyticsGuard', 'Failed to identify user', error);
    }
  }

  /**
   * Report crash/error (consent-gated)
   */
  public reportCrash(report: CrashReport) {
    if (!this.canTrack('crash') || !this.crashReporter) {
      log.info('AnalyticsGuard', 'Crash reporting blocked by consent');
      return;
    }

    try {
      this.crashReporter.captureException(report.error, report.context);
    } catch (error) {
      log.error('AnalyticsGuard', 'Failed to report crash', error);
    }
  }

  /**
   * Track marketing event (consent-gated)
   */
  public trackMarketing(event: MarketingEvent) {
    if (!this.canTrack('marketing') || !this.marketingSDK) {
      log.info('AnalyticsGuard', 'Marketing tracking blocked by consent');
      return;
    }

    try {
      if (event.campaign) {
        this.marketingSDK.trackCampaign(event.campaign, event.properties);
      }
    } catch (error) {
      log.error('AnalyticsGuard', 'Failed to track marketing event', error);
    }
  }

  /**
   * Update consent and reinitialize SDKs
   * Call this when consent choices change
   */
  public updateConsent(newConsentHook: ReturnType<typeof useConsent>) {
    this.consentHook = newConsentHook;
    this.initializeSDKs();
    log.info('AnalyticsGuard', 'Consent updated', { choices: newConsentHook.choices });
  }
}

// Export singleton instance
export const analyticsGuard = AnalyticsGuard.getInstance();

/**
 * React hook for consent-aware analytics
 */
export function useAnalyticsGuard() {
  const consentHook = useConsent();

  // Update analytics guard with current consent state
  React.useEffect(() => {
    if (consentHook && !consentHook.loading) {
      analyticsGuard.updateConsent(consentHook);
    }
  }, [consentHook.choices, consentHook.loading]);

  return {
    trackEvent: analyticsGuard.trackEvent.bind(analyticsGuard),
    trackScreen: analyticsGuard.trackScreen.bind(analyticsGuard),
    identifyUser: analyticsGuard.identifyUser.bind(analyticsGuard),
    reportCrash: analyticsGuard.reportCrash.bind(analyticsGuard),
    trackMarketing: analyticsGuard.trackMarketing.bind(analyticsGuard),
    canTrack: consentHook.canTrack,
  };
}

/**
 * Helper functions for common tracking scenarios
 */
export const Analytics = {
  /**
   * Track lesson completion
   */
  lessonCompleted: (lessonId: string, score: number, duration: number) => {
    analyticsGuard.trackEvent({
      name: 'Lesson Completed',
      properties: {
        lessonId,
        score,
        duration,
        timestamp: new Date().toISOString(),
      },
    });
  },

  /**
   * Track user progress
   */
  progressUpdated: (level: number, xp: number, streak: number) => {
    analyticsGuard.trackEvent({
      name: 'Progress Updated',
      properties: {
        level,
        xp,
        streak,
        timestamp: new Date().toISOString(),
      },
    });
  },

  /**
   * Track feature usage
   */
  featureUsed: (feature: string, context?: Record<string, any>) => {
    analyticsGuard.trackEvent({
      name: 'Feature Used',
      properties: {
        feature,
        ...context,
        timestamp: new Date().toISOString(),
      },
    });
  },

  /**
   * Track errors (non-crashes)
   */
  errorOccurred: (error: Error, context?: Record<string, any>) => {
    analyticsGuard.reportCrash({
      error,
      context: {
        type: 'non_fatal_error',
        ...context,
      },
    });
  },
};

export default analyticsGuard;