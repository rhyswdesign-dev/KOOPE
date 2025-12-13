/**
 * Segment Analytics Integration
 * Safe wrapper with fallbacks
 */

import { log } from '../lib/logger';
import { AnalyticsSink, AnalyticsEvent } from './analytics';

export class SegmentAdapter implements AnalyticsSink {
  private client: any = null;
  private config: any = null;

  async init(cfg: { writeKey: string }): Promise<void> {
    this.config = cfg;
    
    try {
      const { createClient } = require('@segment/analytics-react-native');
      
      this.client = createClient({
        writeKey: cfg.writeKey,
        debug: __DEV__,
        trackAppLifecycleEvents: false,
        flushAt: 5, // Flush after 5 events
        flushInterval: 30000, // Flush every 30 seconds
      });

      log.info('SegmentAdapter', 'Initialized successfully');

    } catch (error) {
      log.warn('SegmentAdapter', 'Initialization failed - falling back to console logging', { error });
      this.client = null;
    }
  }

  async track(ev: AnalyticsEvent): Promise<void> {
    if (!this.client) {
      // Fallback to console logging
      log.debug('SegmentAdapter', 'Fallback track', { eventType: ev.type, event: ev });
      return;
    }

    try {
      // Map our events to Segment format
      const properties = { ...ev };
      delete (properties as any).type;

      this.client.track(ev.type, properties);
      log.debug('SegmentAdapter', 'Event tracked', { eventType: ev.type, properties });

    } catch (error) {
      log.error('SegmentAdapter', 'Track error', { error, event: ev });
    }
  }

  async flush(): Promise<void> {
    if (this.client?.flush) {
      try {
        await this.client.flush();
        log.debug('SegmentAdapter', 'Flush completed');
      } catch (error) {
        log.error('SegmentAdapter', 'Flush error', { error });
      }
    }
  }

  // Helper method to identify users
  async identify(userId: string, traits?: Record<string, any>): Promise<void> {
    if (!this.client) return;

    try {
      this.client.identify(userId, traits);
      log.info('SegmentAdapter', 'User identified', { userId, traits });
    } catch (error) {
      log.error('SegmentAdapter', 'Identify error', { error, userId });
    }
  }

  // Helper method to track screen views
  async screen(name: string, properties?: Record<string, any>): Promise<void> {
    if (!this.client) return;

    try {
      this.client.screen(name, properties);
      log.debug('SegmentAdapter', 'Screen tracked', { name, properties });
    } catch (error) {
      log.error('SegmentAdapter', 'Screen error', { error, name });
    }
  }

  // Helper method to set user context
  async group(groupId: string, traits?: Record<string, any>): Promise<void> {
    if (!this.client) return;

    try {
      this.client.group(groupId, traits);
      log.debug('SegmentAdapter', 'Group set', { groupId, traits });
    } catch (error) {
      log.error('SegmentAdapter', 'Group error', { error, groupId });
    }
  }
}

/**
 * Create and configure Segment analytics sink
 */
export function createSegmentSink(writeKey: string): SegmentAdapter {
  return new SegmentAdapter();
}

/**
 * Segment destination-specific helpers
 */
export class SegmentDestinations {
  private client: any = null;

  constructor(client: any) {
    this.client = client;
  }

  // Send events to specific destinations
  async trackToDestination(
    event: string, 
    properties: Record<string, any>, 
    destinations: string[]
  ): Promise<void> {
    if (!this.client) return;

    try {
      // TODO: Implement when Segment is available
      // const integrations = destinations.reduce((acc, dest) => {
      //   acc[dest] = true;
      //   return acc;
      // }, {} as Record<string, boolean>);
      //
      // this.client.track(event, properties, { integrations });
      
      log.debug('SegmentDestinations', 'Track to destinations', { event, properties, destinations });
    } catch (error) {
      log.error('SegmentDestinations', 'Destination tracking error', { error, event });
    }
  }

  // Disable specific destinations for an event
  async trackExcludingDestinations(
    event: string,
    properties: Record<string, any>,
    excludeDestinations: string[]
  ): Promise<void> {
    if (!this.client) return;

    try {
      // TODO: Implement when Segment is available
      // const integrations = excludeDestinations.reduce((acc, dest) => {
      //   acc[dest] = false;
      //   return acc;
      // }, {} as Record<string, boolean>);
      //
      // this.client.track(event, properties, { integrations });

      log.debug('SegmentDestinations', 'Track excluding destinations', { event, properties, excludeDestinations });
    } catch (error) {
      log.error('SegmentDestinations', 'Exclude destinations error', { error, event });
    }
  }
}