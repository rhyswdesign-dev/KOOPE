/**
 * Analytics Service
 * Event tracking with multiple sink support (Memory, PostHog, Segment)
 */

import { log } from '../lib/logger';

export type AnalyticsEvent =
  | { type: 'onboarding.completed'; level: string; track: string; spirits: string[]; sessionMinutes: number }
  | { type: 'lesson.start'; lessonId: string }
  | { type: 'lesson.complete'; lessonId: string; durationMs: number; itemsAttempted: number; correctCount: number }
  | { type: 'item.attempted'; itemId: string; result: 'correct' | 'incorrect'; msToAnswer: number; exerciseType: 'mcq' | 'order' | 'short' }
  | { type: 'scheduler.plan'; moduleId: string; mix: { current: number; review: number; older: number }; expectedMinutes: number }
  | { type: 'progress.xpAwarded'; amount: number }
  | { type: 'streak.updated'; value: number }
  | { type: 'badge.unlocked'; name: string }
  | { type: 'screen.viewed'; screenName: string; properties?: Record<string, any> }
  | { type: 'audio.played'; soundType: string; context?: string }
  | { type: 'vault.item.viewed'; itemId: string; category: string; rarity: string }
  | { type: 'vault.item.unlocked'; itemId: string; xpSpent: number; cashSpent?: number }
  | { type: 'vault.purchase.completed'; itemId: string; amount: number; currency: string }
  | { type: 'search.performed'; query: string; category?: string; resultsCount: number }
  | { type: 'user.identified'; userId: string; traits?: Record<string, any> };

export interface AnalyticsSink {
  init(cfg: any): Promise<void>;
  track(ev: AnalyticsEvent): Promise<void>;
  flush?(): Promise<void>;
}

/**
 * In-memory analytics sink for development and testing
 */
export class MemorySink implements AnalyticsSink {
  private events: Array<AnalyticsEvent & { timestamp: number }> = [];

  async init(cfg: any): Promise<void> {
    log.info('MemorySink', 'Initialized');
  }

  async track(ev: AnalyticsEvent): Promise<void> {
    const eventWithTimestamp = {
      ...ev,
      timestamp: Date.now()
    };

    this.events.push(eventWithTimestamp);
    log.debug('MemorySink', 'Event tracked', { eventType: ev.type, event: ev });
  }

  async flush(): Promise<void> {
    log.debug('MemorySink', 'Flush', { eventCount: this.events.length });
  }

  // Helper methods for testing
  getEvents(): Array<AnalyticsEvent & { timestamp: number }> {
    return [...this.events];
  }

  getEventsByType(type: string): Array<AnalyticsEvent & { timestamp: number }> {
    return this.events.filter(e => e.type === type);
  }

  clear(): void {
    this.events = [];
  }

  getEventCount(): number {
    return this.events.length;
  }
}

/**
 * PostHog analytics sink (import actual implementation)
 */
export class PostHogSink implements AnalyticsSink {
  private adapter: any = null;

  async init(cfg: { apiKey: string; host?: string }): Promise<void> {
    try {
      const { PostHogAdapter } = await import('./analytics.posthog');
      this.adapter = new PostHogAdapter();
      await this.adapter.init(cfg);
    } catch (error) {
      log.warn('PostHogSink', 'Initialization failed', { error });
    }
  }

  async track(ev: AnalyticsEvent): Promise<void> {
    if (this.adapter) {
      await this.adapter.track(ev);
    }
  }

  async flush(): Promise<void> {
    if (this.adapter?.flush) {
      await this.adapter.flush();
    }
  }
}

/**
 * Segment analytics sink (import actual implementation)
 */
export class SegmentSink implements AnalyticsSink {
  private adapter: any = null;

  async init(cfg: { writeKey: string }): Promise<void> {
    try {
      const { SegmentAdapter } = await import('./analytics.segment');
      this.adapter = new SegmentAdapter();
      await this.adapter.init(cfg);
    } catch (error) {
      log.warn('SegmentSink', 'Initialization failed', { error });
    }
  }

  async track(ev: AnalyticsEvent): Promise<void> {
    if (this.adapter) {
      await this.adapter.track(ev);
    }
  }

  async flush(): Promise<void> {
    if (this.adapter?.flush) {
      await this.adapter.flush();
    }
  }
}

// Global analytics state
let sink: AnalyticsSink = new MemorySink();

/**
 * Set the analytics sink (call during app initialization)
 */
export async function setAnalyticsSink(s: AnalyticsSink): Promise<void> {
  sink = s;
}

/**
 * Track an analytics event
 */
export async function track(ev: AnalyticsEvent): Promise<void> {
  try {
    await sink.track(ev);
  } catch (error) {
    log.error('Analytics', 'Tracking error', { error, event: ev });
  }
}

/**
 * Flush pending analytics events
 */
export async function flush(): Promise<void> {
  if (sink.flush) {
    try {
      await sink.flush();
    } catch (error) {
      log.error('Analytics', 'Flush error', { error });
    }
  }
}

/**
 * Initialize analytics with configuration
 */
export async function initAnalytics(config: {
  provider: 'memory' | 'posthog' | 'segment';
  apiKey?: string;
  writeKey?: string;
  host?: string;
}): Promise<void> {
  let newSink: AnalyticsSink;

  switch (config.provider) {
    case 'posthog':
      newSink = new PostHogSink();
      await newSink.init({
        apiKey: config.apiKey!,
        host: config.host
      });
      break;
    
    case 'segment':
      newSink = new SegmentSink();
      await newSink.init({
        writeKey: config.writeKey!
      });
      break;
    
    case 'memory':
    default:
      newSink = new MemorySink();
      await newSink.init({});
      break;
  }

  await setAnalyticsSink(newSink);
}

/**
 * Helper functions for common event tracking
 */
export const trackOnboardingCompleted = (level: string, userTrack: string, spirits: string[], sessionMinutes: number) => {
  return track({
    type: 'onboarding.completed',
    level,
    track: userTrack,
    spirits,
    sessionMinutes
  });
};

export const trackLessonStart = (lessonId: string) => {
  return track({
    type: 'lesson.start',
    lessonId
  });
};

export const trackLessonComplete = (lessonId: string, durationMs: number, itemsAttempted: number, correctCount: number) => {
  return track({
    type: 'lesson.complete',
    lessonId,
    durationMs,
    itemsAttempted,
    correctCount
  });
};

export const trackItemAttempted = (itemId: string, result: 'correct' | 'incorrect', msToAnswer: number, exerciseType: 'mcq' | 'order' | 'short') => {
  return track({
    type: 'item.attempted',
    itemId,
    result,
    msToAnswer,
    exerciseType
  });
};

export const trackSchedulerPlan = (moduleId: string, mix: { current: number; review: number; older: number }, expectedMinutes: number) => {
  return track({
    type: 'scheduler.plan',
    moduleId,
    mix,
    expectedMinutes
  });
};

export const trackXPAwarded = (amount: number) => {
  return track({
    type: 'progress.xpAwarded',
    amount
  });
};

export const trackStreakUpdated = (value: number) => {
  return track({
    type: 'streak.updated',
    value
  });
};

export const trackBadgeUnlocked = (name: string) => {
  return track({
    type: 'badge.unlocked',
    name
  });
};