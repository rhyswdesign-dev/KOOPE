/**
 * NOTIFICATION SERVICE
 * Comprehensive push notification and in-app notification system
 * Handles scheduling, delivery, and user preferences
 */

import { log } from '../lib/logger';
import React from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useUser } from '../store/useUser';

// Notification types for the app
export type NotificationType =
  | 'lesson_reminder'
  | 'vault_item_available'
  | 'xp_milestone'
  | 'streak_reminder'
  | 'event_reminder'
  | 'daily_challenge'
  | 'hearts_refilled';

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

// Notification preferences
export interface NotificationPreferences {
  enabled: boolean;
  lessons: boolean;
  vault: boolean;
  events: boolean;
  marketing: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
}

// Storage keys
const STORAGE_KEYS = {
  PREFERENCES: 'notification_preferences',
  IN_APP_NOTIFICATIONS: 'in_app_notifications',
  PUSH_TOKEN: 'push_token',
} as const;

// Default preferences
const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  lessons: true,
  vault: true,
  events: true,
  marketing: false,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
};

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
   * Initialize the notification service
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

      // Register for push notifications
      if (this.preferences.enabled) {
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

  /**
   * Register for push notifications
   */
  private async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        log.warn('NotificationService', 'Push notifications require a physical device');
        return null;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        log.warn('NotificationService', 'Permission not granted for push notifications');
        return null;
      }

      const projectId = this.getExpoProjectId();
      if (!projectId) {
        log.warn(
          'NotificationService',
          'Skipping push token registration: missing or invalid EAS projectId'
        );
        return null;
      }

      // Get push token
      const token = await Notifications.getExpoPushTokenAsync({ projectId });

      this.pushToken = token.data;
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token.data);

      log.info('NotificationService', 'Push token obtained', { token: token.data });
      return token.data;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.toLowerCase().includes('projectid') || errorMessage.toLowerCase().includes('validation_error')) {
        log.warn('NotificationService', 'Push registration skipped due to project configuration issue', {
          error: errorMessage,
        });
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
      log.info('NotificationService', 'Notification received', { id: notification.request.identifier });
      this.handleIncomingNotification(notification);
    });

    // Handle notification response (user tapped notification)
    Notifications.addNotificationResponseReceivedListener((response) => {
      log.info('NotificationService', 'Notification tapped', { id: response.notification.request.identifier });
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Handle incoming notification while app is active
   */
  private async handleIncomingNotification(notification: Notifications.Notification) {
    const appNotification: AppNotification = {
      id: notification.request.identifier,
      type: (notification.request.content.data?.type as NotificationType) || 'lesson_reminder',
      title: notification.request.content.title || '',
      body: notification.request.content.body || '',
      data: notification.request.content.data,
      timestamp: Date.now(),
      read: false,
      actionUrl: typeof notification.request.content.data?.actionUrl === 'string'
        ? notification.request.content.data.actionUrl
        : undefined,
    };

    // Add to in-app notifications
    this.inAppNotifications.unshift(appNotification);
    await this.saveInAppNotifications();

    // Update badge count
    await this.updateBadgeCount();
  }

  /**
   * Handle notification tap/response
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data;

    if (typeof data?.actionUrl === 'string') {
      // Handle deep link navigation
      log.nav('NotificationService', data.actionUrl, { data });
      // You would integrate with your navigation service here
    }

    // Mark notification as read
    const notificationId = response.notification.request.identifier;
    this.markAsRead(notificationId);
  }

  /**
   * Schedule a lesson reminder notification
   */
  public async scheduleLessonReminder(lessonId: string, delayMinutes: number = 60) {
    if (!this.preferences.lessons || !this.preferences.enabled) {
      return;
    }

    const identifier = `lesson_reminder_${lessonId}_${Date.now()}`;

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: "🍸 Time for your bartending lesson!",
        body: "Your next lesson is ready. Let's keep learning!",
        data: {
          type: 'lesson_reminder',
          lessonId,
          actionUrl: `homegameadvantage://lessons/${lessonId}`,
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delayMinutes * 60,
      },
    });

    log.info('NotificationService', 'Lesson reminder scheduled', { lessonId, delayMinutes });
  }

  /**
   * Schedule hearts refilled notification
   */
  public async scheduleHeartsRefilled() {
    if (!this.preferences.vault || !this.preferences.enabled) {
      return;
    }

    const identifier = `hearts_refilled_${Date.now()}`;

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: "❤️ Your hearts have been refilled!",
        body: "You're ready to continue learning. Jump back in!",
        data: {
          type: 'hearts_refilled',
          actionUrl: 'homegameadvantage://lessons',
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60, // 1 minute delay for immediate feedback
      },
    });

    log.info('NotificationService', 'Hearts refilled notification scheduled');
  }

  /**
   * Schedule XP milestone celebration
   */
  public async scheduleXPMilestone(xp: number, level: number) {
    if (!this.preferences.vault || !this.preferences.enabled) {
      return;
    }

    const identifier = `xp_milestone_${xp}_${Date.now()}`;

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: `🎉 Level ${level} achieved!`,
        body: `Congratulations! You've earned ${xp} XP and reached a new level!`,
        data: {
          type: 'xp_milestone',
          xp,
          level,
          actionUrl: 'homegameadvantage://profile',
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2, // Almost immediate for celebration
      },
    });

    log.info('NotificationService', 'XP milestone notification scheduled', { xp, level });
  }

  /**
   * Schedule daily streak reminder
   */
  public async scheduleStreakReminder() {
    if (!this.preferences.lessons || !this.preferences.enabled) {
      return;
    }

    // Cancel existing streak reminders
    await this.cancelNotificationsByType('streak_reminder');

    const identifier = `streak_reminder_${Date.now()}`;

    // Schedule for tomorrow at 7 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: "🔥 Don't break your streak!",
        body: "Complete a lesson today to keep your learning streak alive!",
        data: {
          type: 'streak_reminder',
          actionUrl: 'homegameadvantage://lessons',
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: tomorrow,
      },
    });

    log.info('NotificationService', 'Streak reminder scheduled for tomorrow');
  }

  /**
   * Send immediate in-app notification
   */
  public async sendInAppNotification(
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>
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
    return this.inAppNotifications.filter(n => !n.read).length;
  }

  /**
   * Mark notification as read
   */
  public async markAsRead(notificationId: string) {
    const notification = this.inAppNotifications.find(n => n.id === notificationId);
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
    this.inAppNotifications.forEach(n => n.read = true);
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

    log.info('NotificationService', 'Notification preferences updated', { enabled: newPreferences.enabled });
  }

  /**
   * Get current preferences
   */
  public getPreferences(): NotificationPreferences {
    return this.preferences;
  }

  /**
   * Load preferences from storage
   */
  private async loadPreferences() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (stored) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
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
        JSON.stringify(this.inAppNotifications)
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
   * Schedule a certification unlock celebration notification
   */
  public async scheduleCertificationUnlocked(certTitle: string) {
    const identifier = `cert_unlock_${certTitle.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: `Certification Earned: ${certTitle}`,
        body: 'Open KOOPE to see your new identity badge and share it with the world.',
        data: {
          type: 'xp_milestone',
          certTitle,
          actionUrl: 'homegameadvantage://profile',
        },
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
    });

    log.info('NotificationService', 'Certification unlock notification scheduled', { certTitle });
  }

  /**
   * Schedule a low stock reminder for a bottle the user has marked as low or empty.
   * Uses a stable identifier per item so repeated saves replace rather than stack.
   */
  public async scheduleLowStockAlert(itemId: string, itemName: string) {
    const identifier = `low_stock_${itemId}`;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: 'Running Low',
        body: `Time to restock ${itemName} — add it to your shopping list before you need it.`,
        data: {
          type: 'low_stock',
          itemId,
          actionUrl: 'homegameadvantage://home-bar',
        },
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 60 * 60 * 24 }, // 24 hours
    });
    log.info('NotificationService', 'Low stock alert scheduled', { itemId, itemName });
  }

  /**
   * Cancel a low stock alert (e.g. when restocked to full or half)
   */
  public async cancelLowStockAlert(itemId: string) {
    await Notifications.cancelScheduledNotificationAsync(`low_stock_${itemId}`).catch(() => {});
  }

  /**
   * Schedule all 5 trial lifecycle notifications from the trial start date.
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
    ) => {
      const fireAt = new Date(trialStartDate);
      fireAt.setDate(fireAt.getDate() + daysFromStart);
      fireAt.setHours(hourOfDay, 0, 0, 0);
      const secondsFromNow = Math.floor((fireAt.getTime() - Date.now()) / 1000);
      if (secondsFromNow <= 0) return; // already past
      await Notifications.scheduleNotificationAsync({
        identifier: `trial_notification_day${daysFromStart}`,
        content: { title, body, data: { type: 'trial' }, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsFromNow },
      }).catch((err) => log.warn('NotificationService', 'Trial notif failed', err));
    };

    await scheduleAt(4, 19,
      '2 days left on your trial',
      'PRO features unlock for you tomorrow — Vault drops, recipe builder, and hosting tools.',
    );
    await scheduleAt(5, 9,
      'PRO is now active',
      'Explore the Vault, remix recipes, and plan your next hosting session. 48 hours to try it all.',
    );
    await scheduleAt(6, 19,
      'Last day of your trial',
      "Your trial ends tonight. Keep everything you've built.",
    );
    await scheduleAt(7, 9,
      'Your trial has ended',
      'Choose the plan that fits your bar — PLUS from $6.99 or go PRO from $12.99.',
    );

    log.info('NotificationService', 'Trial notifications scheduled', { trialStartDate });
  }

  /**
   * Cancel all pending trial lifecycle notifications.
   */
  public async cancelTrialNotifications() {
    const ids = ['trial_notification_day4', 'trial_notification_day5', 'trial_notification_day6', 'trial_notification_day7'];
    await Promise.allSettled(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  }

  /**
   * Test notification (for development)
   */
  public async sendTestNotification() {
    if (__DEV__) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🧪 Test Notification",
          body: "This is a test notification from your bartending app!",
          data: { type: 'test' },
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
      });
    }
  }
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
    notificationService.getPreferences()
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
