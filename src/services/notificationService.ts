/**
 * NOTIFICATION SERVICE
 * Comprehensive push notification and in-app notification system
 * Handles scheduling, delivery, and user preferences
 *
 * Layering (KOOPE-NOTIFICATION-PLAYBOOK.md §1):
 *   L1 transactional — trial lifecycle, low stock, celebrations, hosting
 *      countdown. Earned by a user action, uncapped, scheduled directly here.
 *   L2/L3/L4 — habit loop, appointment content, lifecycle. These NEVER call
 *      this service's schedulers directly; they go through
 *      `notificationPlanner`, the single frequency governor.
 *
 * Every send goes through `scheduleSend`, which applies the preference gate,
 * stamps the `actionUrl` deep link, and mirrors `Notification Scheduled` to
 * Mixpanel with { type, layer, slot } (Playbook §3 step 5).
 */

import { log } from '../lib/logger';
import React from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackEvent, ANALYTICS_EVENTS } from '../lib/analytics';
import { navigateToActionUrl } from '../lib/deepLinking';
import type { NotificationLayer } from './notificationBudget';

// Notification types for the app
export type NotificationType =
  // L1 — transactional
  | 'lesson_reminder'
  | 'vault_item_available'
  | 'xp_milestone'
  | 'streak_reminder'
  | 'event_reminder'
  | 'daily_challenge'
  | 'hearts_refilled'
  | 'low_stock'
  | 'trial'
  | 'hosting_countdown'
  | 'hosting_post_event'
  // L2 — habit loop (planner-owned)
  | 'friday_maker_prompt'
  | 'weekend_host_seed'
  // L3 — appointment content (planner-owned)
  | 'weekly_drop'
  // L4 — lifecycle (planner-owned)
  | 'onboarding'
  | 'winback'
  | 'seasonal';

/**
 * User-facing preference groups (Playbook §2). Four buckets mapped onto the
 * taxonomy — not one toggle per notification type.
 */
export type PreferenceCategory = 'myEvents' | 'myProgress' | 'weeklyDrops' | 'occasions';

/** Which user-facing group each send belongs to. */
const CATEGORY_FOR_TYPE: Record<NotificationType, PreferenceCategory> = {
  // My events — L1 hosting
  hosting_countdown: 'myEvents',
  hosting_post_event: 'myEvents',
  event_reminder: 'myEvents',
  // My progress — L1 celebrations + L2 habit loop
  xp_milestone: 'myProgress',
  hearts_refilled: 'myProgress',
  vault_item_available: 'myProgress',
  lesson_reminder: 'myProgress',
  streak_reminder: 'myProgress',
  daily_challenge: 'myProgress',
  low_stock: 'myProgress',
  trial: 'myProgress',
  friday_maker_prompt: 'myProgress',
  weekend_host_seed: 'myProgress',
  // Weekly drops — L3
  weekly_drop: 'weeklyDrops',
  // Occasions & featured — L4 seasonal (defaults off)
  seasonal: 'occasions',
  // Onboarding/winback ride "My progress": they're about the user's own setup,
  // not marketing content.
  onboarding: 'myProgress',
  winback: 'myProgress',
};

// Notification data interface
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  timestamp: number;
  read: boolean;
  actionUrl?: string; // Deep link to specific screen
}

/**
 * Notification preferences.
 *
 * The four categories replace the old lessons/vault/events/marketing flags;
 * `loadPreferences` migrates stored legacy shapes. `occasions` defaults off,
 * inheriting the old `marketing: false` default (Playbook standing decision 4).
 */
export interface NotificationPreferences {
  enabled: boolean;
  /** L1 hosting countdown + event reminders. */
  myEvents: boolean;
  /** L1 celebrations + L2 habit loop. */
  myProgress: boolean;
  /** L3 appointment content. */
  weeklyDrops: boolean;
  /** L4 seasonal + Category of the Month. Default off. */
  occasions: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
}

/** Legacy preference shape, still present in AsyncStorage on upgraded installs. */
interface LegacyNotificationPreferences {
  lessons?: boolean;
  vault?: boolean;
  events?: boolean;
  marketing?: boolean;
}

// Storage keys
const STORAGE_KEYS = {
  PREFERENCES: 'notification_preferences',
  IN_APP_NOTIFICATIONS: 'in_app_notifications',
  PUSH_TOKEN: 'push_token',
  PERMISSION_ASKED: 'notification_permission_asked_count',
} as const;

// Default preferences
const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  myEvents: true,
  myProgress: true,
  weeklyDrops: true,
  occasions: false,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
};

/**
 * Everything needed to schedule one send. `layer` and `slot` exist so the
 * Mixpanel mirror can compute tap rate per recurring send.
 */
export interface ScheduleSendRequest {
  identifier: string;
  type: NotificationType;
  layer: NotificationLayer;
  slot: string;
  title: string;
  body: string;
  /** Playbook law 2 — every notification deep-links to exactly one action. */
  actionUrl: string;
  trigger: Notifications.NotificationTriggerInput;
  data?: Record<string, any>;
}

function isValidProjectId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Main notification service class
 */
class NotificationService {
  private static instance: NotificationService;
  private inAppNotifications: AppNotification[] = [];
  private preferences: NotificationPreferences = DEFAULT_PREFERENCES;
  private pushToken: string | null = null;
  private initialized = false;

  private constructor() {}

  private getExpoProjectId(): string | null {
    const possibleProjectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId ||
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
      null;

    if (!possibleProjectId) return null;
    if (!isValidProjectId(possibleProjectId)) return null;
    return possibleProjectId;
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service.
   *
   * Playbook §2: we never ask for permission on launch. Initialization only
   * *reuses* an already-granted permission; the OS dialog is raised later by
   * `requestPermissionAtValueMoment` once the user has hit a first value
   * moment (first scan, first What Can I Make result, first hosting plan).
   */
  public async initialize(): Promise<boolean> {
    try {
      log.info('NotificationService', 'Initializing notification service');

      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => {
          // Check if we're in quiet hours
          const inQuietHours = await this.isInQuietHours();

          return {
            shouldShowAlert: !inQuietHours,
            shouldShowBanner: !inQuietHours,
            shouldShowList: !inQuietHours,
            shouldPlaySound: !inQuietHours,
            shouldSetBadge: true,
          };
        },
      });

      // Load preferences and notifications
      await this.loadPreferences();
      await this.loadInAppNotifications();

      // Register only if the user has already granted permission — no dialog.
      if (this.preferences.enabled && (await this.hasPermission())) {
        await this.registerForPushNotifications();
      }

      // Set up notification listeners
      this.setupNotificationListeners();

      this.initialized = true;
      log.info('NotificationService', 'Notification service initialized successfully');
      return true;
    } catch (error) {
      log.error('NotificationService', 'Failed to initialize notification service', error);
      return false;
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Has the OS already granted notification permission?
   */
  public async hasPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Raise the OS permission dialog, at a value moment (Playbook §2).
   *
   * Callers own the primer shown *before* this — the ask is framed as service,
   * tied to what the user just did. Returns true once permission is granted
   * ("already granted" is a no-op true).
   *
   * Capped at two asks total: the initial one and exactly one re-prime, per
   * the Playbook's "if declined, re-prime exactly once".
   */
  public async requestPermissionAtValueMoment(source: string): Promise<boolean> {
    try {
      if (await this.hasPermission()) return true;

      const askedRaw = await AsyncStorage.getItem(STORAGE_KEYS.PERMISSION_ASKED);
      const asked = Number(askedRaw ?? 0);
      if (asked >= 2) {
        log.info('NotificationService', 'Permission ask suppressed (already re-primed)', {
          source,
        });
        return false;
      }

      trackEvent(ANALYTICS_EVENTS.NOTIFICATION_PERMISSION_PRIMED, {
        source,
        ask_number: asked + 1,
      });
      await AsyncStorage.setItem(STORAGE_KEYS.PERMISSION_ASKED, String(asked + 1));

      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';
      trackEvent(ANALYTICS_EVENTS.NOTIFICATION_PERMISSION_RESULT, { source, granted });

      if (granted) {
        await this.registerForPushNotifications();
      }
      return granted;
    } catch (error) {
      log.warn('NotificationService', 'Permission request failed', { source, error });
      return false;
    }
  }

  /**
   * Register for push notifications. Assumes permission is already granted —
   * never raises the OS dialog itself.
   */
  private async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        log.warn('NotificationService', 'Push notifications require a physical device');
        return null;
      }

      if (!(await this.hasPermission())) {
        log.warn('NotificationService', 'Permission not granted for push notifications');
        return null;
      }

      const projectId = this.getExpoProjectId();
      if (!projectId) {
        log.warn(
          'NotificationService',
          'Skipping push token registration: missing or invalid EAS projectId',
        );
        return null;
      }

      // Get push token. Phase A is local-first: the token stays on device.
      // (Playbook §3 Phase B moves it to Supabase — deliberately not built yet.)
      const token = await Notifications.getExpoPushTokenAsync({ projectId });

      this.pushToken = token.data;
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token.data);

      log.info('NotificationService', 'Push token obtained', { token: token.data });
      return token.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.toLowerCase().includes('projectid') ||
        errorMessage.toLowerCase().includes('validation_error')
      ) {
        log.warn(
          'NotificationService',
          'Push registration skipped due to project configuration issue',
          {
            error: errorMessage,
          },
        );
      } else {
        log.error('NotificationService', 'Failed to register for push notifications', error);
      }
      return null;
    }
  }

  /**
   * Set up notification event listeners
   */
  private setupNotificationListeners() {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      log.info('NotificationService', 'Notification received', {
        id: notification.request.identifier,
      });
      this.handleIncomingNotification(notification);
    });

    // Handle notification response (user tapped notification)
    Notifications.addNotificationResponseReceivedListener((response) => {
      log.info('NotificationService', 'Notification tapped', {
        id: response.notification.request.identifier,
      });
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Pull { type, layer, slot } off a notification payload for the Mixpanel
   * mirror. Notifications scheduled before Phase A carry no layer/slot — they
   * report 'unknown' rather than dropping the event.
   */
  private measurementProps(data: Record<string, any> | undefined) {
    return {
      type: (data?.type as string) || 'unknown',
      layer: (data?.layer as string) || 'unknown',
      slot: (data?.slot as string) || 'unknown',
    };
  }

  /**
   * Handle incoming notification while app is active
   */
  private async handleIncomingNotification(notification: Notifications.Notification) {
    const data = notification.request.content.data as Record<string, any> | undefined;

    const appNotification: AppNotification = {
      id: notification.request.identifier,
      type: (data?.type as NotificationType) || 'lesson_reminder',
      title: notification.request.content.title || '',
      body: notification.request.content.body || '',
      data,
      timestamp: Date.now(),
      read: false,
      actionUrl: typeof data?.actionUrl === 'string' ? data.actionUrl : undefined,
    };

    trackEvent(ANALYTICS_EVENTS.NOTIFICATION_RECEIVED, this.measurementProps(data));

    // Add to in-app notifications
    this.inAppNotifications.unshift(appNotification);
    await this.saveInAppNotifications();

    // Update badge count
    await this.updateBadgeCount();
  }

  /**
   * Handle notification tap/response — routes to the screen named by
   * `actionUrl` via the app-wide navigation ref (queued if the container
   * hasn't mounted yet, which is the cold-start case).
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data as Record<string, any> | undefined;

    trackEvent(ANALYTICS_EVENTS.NOTIFICATION_TAPPED, this.measurementProps(data));

    if (typeof data?.actionUrl === 'string') {
      navigateToActionUrl(data.actionUrl);
    }

    // Mark notification as read
    const notificationId = response.notification.request.identifier;
    this.markAsRead(notificationId);
  }

  // ==========================================================================
  // SCHEDULING
  // ==========================================================================

  /**
   * The single scheduling entry point. Applies the preference gate, attaches
   * the deep link and measurement metadata, and mirrors the send to Mixpanel.
   *
   * This does NOT apply the frequency budget — that lives in
   * `notificationPlanner`, the only caller allowed to pass L2/L3/L4. L1 sends
   * bypass the budget by design (Playbook §1: "uncapped (earned)").
   *
   * Returns true if the notification was actually scheduled.
   */
  public async scheduleSend(request: ScheduleSendRequest): Promise<boolean> {
    if (!this.preferences.enabled) return false;
    if (!this.isCategoryEnabled(request.type)) return false;

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: request.identifier,
        content: {
          title: request.title,
          body: request.body,
          data: {
            ...request.data,
            type: request.type,
            layer: request.layer,
            slot: request.slot,
            actionUrl: request.actionUrl,
          },
          sound: true,
        },
        trigger: request.trigger,
      });

      trackEvent(ANALYTICS_EVENTS.NOTIFICATION_SCHEDULED, {
        type: request.type,
        layer: request.layer,
        slot: request.slot,
      });

      log.info('NotificationService', 'Notification scheduled', {
        identifier: request.identifier,
        type: request.type,
        layer: request.layer,
        slot: request.slot,
      });
      return true;
    } catch (error) {
      log.warn('NotificationService', 'Failed to schedule notification', {
        identifier: request.identifier,
        error,
      });
      return false;
    }
  }

  /** Is the user-facing preference group for this send switched on? */
  public isCategoryEnabled(type: NotificationType): boolean {
    if (!this.preferences.enabled) return false;
    const category = CATEGORY_FOR_TYPE[type];
    return category ? this.preferences[category] !== false : true;
  }

  /** Convert an absolute fire time to a trigger, or null if it's already past. */
  private triggerAt(fireAt: number): Notifications.NotificationTriggerInput | null {
    const seconds = Math.floor((fireAt - Date.now()) / 1000);
    if (seconds <= 0) return null;
    return { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds };
  }

  /**
   * Schedule a lesson reminder notification (L1 — the user left a lesson open).
   */
  public async scheduleLessonReminder(lessonId: string, delayMinutes: number = 60) {
    await this.scheduleSend({
      identifier: `lesson_reminder_${lessonId}_${Date.now()}`,
      type: 'lesson_reminder',
      layer: 'L1',
      slot: 'lesson_resume',
      title: 'Pick up where you left off',
      body: 'Your next technique is a 4-minute read.',
      actionUrl: 'koope://lessons',
      data: { lessonId },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delayMinutes * 60,
      },
    });
  }

  /**
   * Schedule hearts refilled notification
   */
  public async scheduleHeartsRefilled() {
    await this.scheduleSend({
      identifier: `hearts_refilled_${Date.now()}`,
      type: 'hearts_refilled',
      layer: 'L1',
      slot: 'hearts_refill',
      title: 'Your hearts are back',
      body: 'Full set, ready when you are.',
      actionUrl: 'koope://lessons',
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60, // 1 minute delay for immediate feedback
      },
    });
  }

  /**
   * Schedule XP milestone celebration
   */
  public async scheduleXPMilestone(xp: number, level: number) {
    await this.scheduleSend({
      identifier: `xp_milestone_${xp}_${Date.now()}`,
      type: 'xp_milestone',
      layer: 'L1',
      slot: 'xp_milestone',
      title: `Level ${level}`,
      body: `${xp} XP behind the bar. Your badge just changed.`,
      actionUrl: 'koope://profile',
      data: { xp, level },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2, // Almost immediate for celebration
      },
    });
  }

  /**
   * Schedule a certification unlock celebration notification (L1)
   */
  public async scheduleCertificationUnlocked(certTitle: string) {
    await this.scheduleSend({
      identifier: `cert_unlock_${certTitle.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
      type: 'xp_milestone',
      layer: 'L1',
      slot: 'certification',
      title: `Certified: ${certTitle}`,
      body: 'Your badge is on your profile. Worth showing someone.',
      actionUrl: 'koope://profile',
      data: { certTitle },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
    });
  }

  /**
   * Schedule a low stock reminder for a bottle the user has marked as low or empty.
   * Uses a stable identifier per item so repeated saves replace rather than stack.
   */
  public async scheduleLowStockAlert(itemId: string, itemName: string) {
    await this.scheduleSend({
      identifier: `low_stock_${itemId}`,
      type: 'low_stock',
      layer: 'L1',
      slot: 'low_stock',
      title: 'Running low',
      body: `${itemName} is nearly out — worth adding to the list before your next run.`,
      actionUrl: 'koope://home-bar',
      data: { itemId },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60 * 60 * 24,
      }, // 24 hours
    });
  }

  /**
   * Cancel a low stock alert (e.g. when restocked to full or half)
   */
  public async cancelLowStockAlert(itemId: string) {
    await Notifications.cancelScheduledNotificationAsync(`low_stock_${itemId}`).catch(() => {});
  }

  // ==========================================================================
  // L1 — HOSTING COUNTDOWN (Playbook §1: the flagship sequence)
  // ==========================================================================

  /**
   * Schedule the full hosting countdown for one event: T-72h, T-24h, day-of,
   * and post-event next morning. Pure L1 — user-triggered by creating the
   * event, uncapped, no planner arbitration.
   *
   * Idempotent per event: identifiers derive from `eventId`, so re-saving the
   * same plan replaces the sequence rather than stacking it. Steps already in
   * the past are skipped.
   */
  public async scheduleHostingCountdown(params: {
    eventId: string;
    eventName: string;
    eventDate: Date;
    shoppingItemCount?: number;
  }): Promise<number> {
    const { eventId, eventName, eventDate, shoppingItemCount } = params;

    await this.cancelHostingCountdown(eventId);

    const eventTime = eventDate.getTime();
    const HOUR = 60 * 60 * 1000;

    // Day-of and post-event fire at fixed friendly hours, not at event o'clock.
    const dayOf = new Date(eventTime);
    dayOf.setHours(10, 0, 0, 0);

    const nextMorning = new Date(eventTime);
    nextMorning.setDate(nextMorning.getDate() + 1);
    nextMorning.setHours(10, 30, 0, 0);

    const weekday = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
    const listLine =
      typeof shoppingItemCount === 'number' && shoppingItemCount > 0
        ? `Your list is ${shoppingItemCount} item${shoppingItemCount === 1 ? '' : 's'}. Shop it in one pass.`
        : 'Your shopping list is ready. Shop it in one pass.';

    const steps: {
      suffix: string;
      slot: string;
      fireAt: number;
      type: NotificationType;
      title: string;
      body: string;
      actionUrl: string;
    }[] = [
      {
        suffix: 't72',
        slot: 'hosting_t72',
        fireAt: eventTime - 72 * HOUR,
        type: 'hosting_countdown',
        title: `${weekday}'s ${eventName}`,
        body: listLine,
        actionUrl: 'koope://hosting?focus=shopping',
      },
      {
        suffix: 't24',
        slot: 'hosting_t24',
        fireAt: eventTime - 24 * HOUR,
        type: 'hosting_countdown',
        title: 'Tomorrow night',
        body: 'Two things are worth doing today. Your prep timeline has them in order.',
        actionUrl: 'koope://hosting?focus=prep',
      },
      {
        suffix: 'dayof',
        slot: 'hosting_day_of',
        fireAt: dayOf.getTime(),
        type: 'hosting_countdown',
        title: 'Tonight',
        body: `Your ${eventName} menu is set. Open it when guests ask what you're pouring.`,
        actionUrl: 'koope://hosting?focus=menu',
      },
      {
        suffix: 'post',
        slot: 'hosting_post_event',
        fireAt: nextMorning.getTime(),
        type: 'hosting_post_event',
        title: "How'd last night pour?",
        body: 'Log what you made — your taste graph is listening.',
        actionUrl: 'koope://recipes',
      },
    ];

    let scheduled = 0;
    for (const step of steps) {
      const trigger = this.triggerAt(step.fireAt);
      if (!trigger) continue; // already past

      const ok = await this.scheduleSend({
        identifier: `hosting_${eventId}_${step.suffix}`,
        type: step.type,
        layer: 'L1',
        slot: step.slot,
        title: step.title,
        body: step.body,
        actionUrl: step.actionUrl,
        data: { eventId, eventName },
        trigger,
      });
      if (ok) scheduled += 1;
    }

    log.info('NotificationService', 'Hosting countdown scheduled', {
      eventId,
      eventDate: eventDate.toISOString(),
      scheduled,
    });
    return scheduled;
  }

  /** Cancel every step of one event's countdown (event deleted or moved). */
  public async cancelHostingCountdown(eventId: string) {
    const suffixes = ['t72', 't24', 'dayof', 'post'];
    await Promise.allSettled(
      suffixes.map((suffix) =>
        Notifications.cancelScheduledNotificationAsync(`hosting_${eventId}_${suffix}`),
      ),
    );
  }

  /**
   * Schedule the trial lifecycle notifications from the trial start date.
   * Call this immediately when the user starts their trial.
   *
   * Timeline:
   *   Day 5 evening  — "PRO unlocks tomorrow" preview
   *   Day 6 morning  — "PRO is now active"
   *   Day 7 evening  — "Last day of trial"
   *   Day 8 morning  — "Trial has ended"
   */
  public async scheduleTrialNotifications(trialStartDate: Date) {
    await this.cancelTrialNotifications();

    const scheduleAt = async (
      daysFromStart: number,
      hourOfDay: number,
      title: string,
      body: string,
      actionUrl: string,
    ) => {
      const fireAt = new Date(trialStartDate);
      fireAt.setDate(fireAt.getDate() + daysFromStart);
      fireAt.setHours(hourOfDay, 0, 0, 0);
      const trigger = this.triggerAt(fireAt.getTime());
      if (!trigger) return; // already past

      await this.scheduleSend({
        identifier: `trial_notification_day${daysFromStart}`,
        type: 'trial',
        layer: 'L1',
        slot: `trial_day${daysFromStart}`,
        title,
        body,
        actionUrl,
        trigger,
      });
    };

    await scheduleAt(
      4,
      19,
      '2 days left on your trial',
      'PRO features unlock for you tomorrow — Vault drops, recipe builder, and hosting tools.',
      'koope://vault',
    );
    await scheduleAt(
      5,
      9,
      'PRO is now active',
      'Explore the Vault, remix recipes, and plan your next hosting session. 48 hours to try it all.',
      'koope://vault',
    );
    await scheduleAt(
      6,
      19,
      'Last day of your trial',
      "Your trial ends tonight. Keep everything you've built.",
      'koope://paywall',
    );
    await scheduleAt(
      7,
      9,
      'Your trial has ended',
      'Choose the plan that fits your bar — PLUS from $6.99 or go PRO from $12.99.',
      'koope://paywall',
    );

    log.info('NotificationService', 'Trial notifications scheduled', { trialStartDate });
  }

  /**
   * Cancel all pending trial lifecycle notifications.
   */
  public async cancelTrialNotifications() {
    const ids = [
      'trial_notification_day4',
      'trial_notification_day5',
      'trial_notification_day6',
      'trial_notification_day7',
    ];
    await Promise.allSettled(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  }

  // ==========================================================================
  // IN-APP INBOX
  // ==========================================================================

  /**
   * Send immediate in-app notification
   */
  public async sendInAppNotification(
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    const notification: AppNotification = {
      id: `in_app_${Date.now()}`,
      type,
      title,
      body,
      data,
      timestamp: Date.now(),
      read: false,
    };

    this.inAppNotifications.unshift(notification);
    await this.saveInAppNotifications();
    await this.updateBadgeCount();

    log.info('NotificationService', 'In-app notification sent', { type, title });
  }

  /**
   * Get all in-app notifications
   */
  public getInAppNotifications(): AppNotification[] {
    return this.inAppNotifications;
  }

  /**
   * Get unread notification count
   */
  public getUnreadCount(): number {
    return this.inAppNotifications.filter((n) => !n.read).length;
  }

  /**
   * Mark notification as read
   */
  public async markAsRead(notificationId: string) {
    const notification = this.inAppNotifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
      await this.saveInAppNotifications();
      await this.updateBadgeCount();
    }
  }

  /**
   * Mark all notifications as read
   */
  public async markAllAsRead() {
    this.inAppNotifications.forEach((n) => (n.read = true));
    await this.saveInAppNotifications();
    await this.updateBadgeCount();
  }

  /**
   * Clear old notifications (keep last 50)
   */
  public async clearOldNotifications() {
    this.inAppNotifications = this.inAppNotifications.slice(0, 50);
    await this.saveInAppNotifications();
  }

  /**
   * Cancel notifications by type
   */
  public async cancelNotificationsByType(type: NotificationType) {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduledNotifications) {
      if (notification.content.data?.type === type) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }

  /**
   * Cancel every currently scheduled notification whose identifier starts with
   * one of the given prefixes. The planner uses this to clear its whole 7-day
   * window before rescheduling, without touching L1 sends.
   */
  public async cancelScheduledByPrefix(prefixes: string[]): Promise<number> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const doomed = scheduled.filter((n) => prefixes.some((p) => n.identifier.startsWith(p)));
    await Promise.allSettled(
      doomed.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
    return doomed.length;
  }

  /**
   * Update app badge count
   */
  private async updateBadgeCount() {
    const unreadCount = this.getUnreadCount();
    await Notifications.setBadgeCountAsync(unreadCount);
  }

  /**
   * Check if current time is in quiet hours
   */
  private async isInQuietHours(): Promise<boolean> {
    if (!this.preferences.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const { start, end } = this.preferences.quietHours;

    // Handle cases where quiet hours span midnight
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    } else {
      return currentTime >= start && currentTime <= end;
    }
  }

  /**
   * Update notification preferences
   */
  public async updatePreferences(newPreferences: Partial<NotificationPreferences>) {
    this.preferences = { ...this.preferences, ...newPreferences };
    await AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(this.preferences));

    // Re-register if enabled status changed
    if (newPreferences.enabled !== undefined) {
      if (newPreferences.enabled) {
        await this.registerForPushNotifications();
      } else {
        // Cancel all scheduled notifications
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
    }

    log.info('NotificationService', 'Notification preferences updated', {
      enabled: newPreferences.enabled,
    });
  }

  /**
   * Get current preferences
   */
  public getPreferences(): NotificationPreferences {
    return this.preferences;
  }

  /**
   * Load preferences from storage, migrating the pre-Playbook
   * lessons/vault/events/marketing shape onto the four user-facing groups.
   */
  private async loadPreferences() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (stored) {
        this.preferences = migratePreferences(JSON.parse(stored));
      }
    } catch (error) {
      log.error('NotificationService', 'Failed to load notification preferences', error);
    }
  }

  /**
   * Load in-app notifications from storage
   */
  private async loadInAppNotifications() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.IN_APP_NOTIFICATIONS);
      if (stored) {
        this.inAppNotifications = JSON.parse(stored);
      }
    } catch (error) {
      log.error('NotificationService', 'Failed to load in-app notifications', error);
    }
  }

  /**
   * Save in-app notifications to storage
   */
  private async saveInAppNotifications() {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.IN_APP_NOTIFICATIONS,
        JSON.stringify(this.inAppNotifications),
      );
    } catch (error) {
      log.error('NotificationService', 'Failed to save in-app notifications', error);
    }
  }

  /**
   * Get push token for backend integration
   */
  public getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Test notification (for development)
   */
  public async sendTestNotification() {
    if (__DEV__) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test notification',
          body: 'Rails are live. This one is from the dev build.',
          data: { type: 'test' },
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
      });
    }
  }
}

/**
 * Fold a stored preferences blob (either shape) onto the current four
 * categories. Exported for tests; the mapping mirrors CATEGORY_FOR_TYPE.
 */
export function migratePreferences(
  stored: Partial<NotificationPreferences> & LegacyNotificationPreferences,
): NotificationPreferences {
  const hasNewShape =
    typeof stored.myProgress === 'boolean' || typeof stored.myEvents === 'boolean';

  if (hasNewShape) {
    return {
      ...DEFAULT_PREFERENCES,
      ...stored,
      quietHours: { ...DEFAULT_PREFERENCES.quietHours, ...stored.quietHours },
    };
  }

  return {
    ...DEFAULT_PREFERENCES,
    enabled: stored.enabled ?? DEFAULT_PREFERENCES.enabled,
    // "My events" inherits the old events flag (hosting / event reminders).
    myEvents: stored.events ?? DEFAULT_PREFERENCES.myEvents,
    // "My progress" is the union of the old lessons + vault channels: it only
    // switches off if the user had silenced both.
    myProgress: (stored.lessons ?? true) || (stored.vault ?? true),
    weeklyDrops: stored.vault ?? DEFAULT_PREFERENCES.weeklyDrops,
    // "Occasions & featured" inherits the marketing opt-in — default off.
    occasions: stored.marketing ?? DEFAULT_PREFERENCES.occasions,
    quietHours: { ...DEFAULT_PREFERENCES.quietHours, ...stored.quietHours },
  };
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

/**
 * React hook for notification management
 */
export function useNotifications() {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [preferences, setPreferences] = React.useState<NotificationPreferences>(
    notificationService.getPreferences(),
  );

  // Update state when notifications change
  React.useEffect(() => {
    const updateState = () => {
      setUnreadCount(notificationService.getUnreadCount());
      setNotifications(notificationService.getInAppNotifications());
      setPreferences(notificationService.getPreferences());
    };

    // Initial update
    updateState();

    // Set up interval to check for updates
    const interval = setInterval(updateState, 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    unreadCount,
    preferences,
    markAsRead: notificationService.markAsRead.bind(notificationService),
    markAllAsRead: notificationService.markAllAsRead.bind(notificationService),
    updatePreferences: notificationService.updatePreferences.bind(notificationService),
    sendTestNotification: notificationService.sendTestNotification.bind(notificationService),
  };
}

export default notificationService;
