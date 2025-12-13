/**
 * PostHog Analytics Integration
 * Safe wrapper with fallbacks
 */

import { log } from '../lib/logger';
import { AnalyticsSink, AnalyticsEvent } from './analytics';

export class PostHogAdapter implements AnalyticsSink {
  private client: any = null;
  private config: any = null;

  async init(cfg: { apiKey: string; host?: string }): Promise<void> {
    this.config = cfg;
    
    try {
      const PostHog = require('posthog-react-native').default;
      
      this.client = new PostHog(cfg.apiKey, {
        host: cfg.host || 'https://app.posthog.com',
        captureApplicationLifecycleEvents: false,
        debug: __DEV__,
        flushAt: 5, // Flush after 5 events
        flushInterval: 30000, // Flush every 30 seconds
      });

      log.info('PostHogAdapter', 'Initialized successfully');

    } catch (error) {
      log.warn('PostHogAdapter', 'Initialization failed - falling back to console logging', { error });
      this.client = null;
    }
  }

  async track(ev: AnalyticsEvent): Promise<void> {
    if (!this.client) {
      // Fallback to console logging
      log.debug('PostHogAdapter', 'Fallback track', { eventType: ev.type, event: ev });
      return;
    }

    try {
      // Map our events to PostHog format
      const properties = { ...ev };
      delete (properties as any).type;

      this.client.capture(ev.type, properties);
      log.debug('PostHogAdapter', 'Event tracked', { eventType: ev.type, properties });

    } catch (error) {
      log.error('PostHogAdapter', 'Track error', { error, event: ev });
    }
  }

  async flush(): Promise<void> {
    if (this.client?.flush) {
      try {
        await this.client.flush();
        log.debug('PostHogAdapter', 'Flush completed');
      } catch (error) {
        log.error('PostHogAdapter', 'Flush error', { error });
      }
    }
  }

  // Helper method to identify users
  async identify(userId: string, traits?: Record<string, any>): Promise<void> {
    if (!this.client) return;

    try {
      this.client.identify(userId, traits);
      log.info('PostHogAdapter', 'User identified', { userId, traits });
    } catch (error) {
      log.error('PostHogAdapter', 'Identify error', { error, userId });
    }
  }

  // Helper method to set user properties
  async setPersonProperties(properties: Record<string, any>): Promise<void> {
    if (!this.client) return;

    try {
      this.client.setPersonProperties(properties);
      log.debug('PostHogAdapter', 'Person properties set', { properties });
    } catch (error) {
      log.error('PostHogAdapter', 'Set person properties error', { error });
    }
  }
}

/**
 * Create and configure PostHog analytics sink
 */
export function createPostHogSink(apiKey: string, host?: string): PostHogAdapter {
  return new PostHogAdapter();
}

/**
 * PostHog feature flags integration (future)
 */
export class PostHogFeatureFlags {
  private client: any = null;

  constructor(client: any) {
    this.client = client;
  }

  async isFeatureEnabled(flag: string, userId?: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      // TODO: Implement when PostHog is available
      // return await this.client.isFeatureEnabled(flag, userId);
      log.debug('PostHogFeatureFlags', 'Check feature flag', { flag, userId });
      return false;
    } catch (error) {
      log.error('PostHogFeatureFlags', 'Feature flag error', { error, flag, userId });
      return false;
    }
  }

  async getFeatureFlag(flag: string, userId?: string): Promise<string | boolean> {
    if (!this.client) return false;

    try {
      // TODO: Implement when PostHog is available
      // return await this.client.getFeatureFlag(flag, userId);
      log.debug('PostHogFeatureFlags', 'Get feature flag', { flag, userId });
      return false;
    } catch (error) {
      log.error('PostHogFeatureFlags', 'Get feature flag error', { error, flag, userId });
      return false;
    }
  }
}