/**
 * STREAK SERVICE
 * Manages daily/weekly streaks and engagement tracking
 * Encourages consistent app usage with streak mechanics
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { achievementService } from './achievementService';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string; // ISO date string (YYYY-MM-DD)
  totalDaysActive: number;
  streakHistory: StreakHistoryEntry[];
  weeklyActivity: WeeklyActivity;
}

export interface StreakHistoryEntry {
  date: string; // ISO date string
  activities: string[]; // List of activities performed that day
}

export interface WeeklyActivity {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

// Storage key
const STORAGE_KEY = '@streak_data';

class StreakService {
  private static instance: StreakService;
  private streakData: StreakData = {
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: '',
    totalDaysActive: 0,
    streakHistory: [],
    weeklyActivity: {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0,
    },
  };
  private listeners: Array<(streak: number) => void> = [];

  private constructor() {
    this.initialize();
  }

  public static getInstance(): StreakService {
    if (!StreakService.instance) {
      StreakService.instance = new StreakService();
    }
    return StreakService.instance;
  }

  /**
   * Initialize streak service
   */
  private async initialize(): Promise<void> {
    await this.loadStreakData();
    // Check if streak should be broken on app startup
    this.checkStreakStatus();
  }

  /**
   * Record activity for today
   */
  public async recordActivity(activity: string = 'app_open'): Promise<{
    streakIncreased: boolean;
    currentStreak: number;
    isNewRecord: boolean;
  }> {
    const today = this.getTodayDateString();
    const lastActivityDate = this.streakData.lastActivityDate;

    let streakIncreased = false;
    let isNewRecord = false;

    // Check if this is the first activity today
    if (lastActivityDate !== today) {
      const yesterday = this.getYesterdayDateString();

      // Update streak
      if (lastActivityDate === yesterday) {
        // Continue streak
        this.streakData.currentStreak += 1;
        streakIncreased = true;
      } else if (lastActivityDate === '') {
        // First ever activity
        this.streakData.currentStreak = 1;
        streakIncreased = true;
      } else {
        // Streak broken - check if we need to reset
        const daysSinceLastActivity = this.getDaysBetween(lastActivityDate, today);
        if (daysSinceLastActivity > 1) {
          this.streakData.currentStreak = 1;
          streakIncreased = false;
        } else {
          // Same day or consecutive day
          this.streakData.currentStreak += 1;
          streakIncreased = true;
        }
      }

      // Update longest streak
      if (this.streakData.currentStreak > this.streakData.longestStreak) {
        this.streakData.longestStreak = this.streakData.currentStreak;
        isNewRecord = true;
      }

      // Update last activity date
      this.streakData.lastActivityDate = today;

      // Increment total days active
      this.streakData.totalDaysActive += 1;

      // Update weekly activity
      this.updateWeeklyActivity();

      // Track in achievement service
      await achievementService.trackAction('currentStreak', this.streakData.currentStreak);

      // Notify listeners
      this.notifyListeners();

      // Save to storage
      await this.saveStreakData();
    }

    // Add activity to today's history
    this.addActivityToHistory(today, activity);

    return {
      streakIncreased,
      currentStreak: this.streakData.currentStreak,
      isNewRecord,
    };
  }

  /**
   * Check if streak should be broken
   */
  private checkStreakStatus(): void {
    const today = this.getTodayDateString();
    const yesterday = this.getYesterdayDateString();
    const lastActivityDate = this.streakData.lastActivityDate;

    // If last activity was not yesterday or today, streak is broken
    if (lastActivityDate !== today && lastActivityDate !== yesterday && lastActivityDate !== '') {
      const daysSinceLastActivity = this.getDaysBetween(lastActivityDate, today);
      if (daysSinceLastActivity > 1) {
        console.log('⚠️ Streak broken! Resetting to 0');
        this.streakData.currentStreak = 0;
        this.saveStreakData();
      }
    }
  }

  /**
   * Get current streak
   */
  public getCurrentStreak(): number {
    return this.streakData.currentStreak;
  }

  /**
   * Get longest streak
   */
  public getLongestStreak(): number {
    return this.streakData.longestStreak;
  }

  /**
   * Get total days active
   */
  public getTotalDaysActive(): number {
    return this.streakData.totalDaysActive;
  }

  /**
   * Get streak data
   */
  public getStreakData(): StreakData {
    return { ...this.streakData };
  }

  /**
   * Get weekly activity pattern
   */
  public getWeeklyActivity(): WeeklyActivity {
    return { ...this.streakData.weeklyActivity };
  }

  /**
   * Get streak history for last N days
   */
  public getStreakHistory(days: number = 30): StreakHistoryEntry[] {
    return this.streakData.streakHistory.slice(-days);
  }

  /**
   * Check if user was active today
   */
  public isActiveToday(): boolean {
    return this.streakData.lastActivityDate === this.getTodayDateString();
  }

  /**
   * Get days until streak breaks
   */
  public getDaysUntilStreakBreaks(): number {
    if (this.isActiveToday()) {
      return 1; // User has tomorrow to maintain streak
    }
    return 0; // Streak will break today if no activity
  }

  /**
   * Subscribe to streak changes
   */
  public addStreakListener(listener: (streak: number) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify listeners of streak change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.streakData.currentStreak));
  }

  /**
   * Update weekly activity pattern
   */
  private updateWeeklyActivity(): void {
    const dayOfWeek = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    const dayNames: Array<keyof WeeklyActivity> = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const dayName = dayNames[dayOfWeek];
    this.streakData.weeklyActivity[dayName] += 1;
  }

  /**
   * Add activity to history
   */
  private addActivityToHistory(date: string, activity: string): void {
    const existingEntry = this.streakData.streakHistory.find(e => e.date === date);
    if (existingEntry) {
      if (!existingEntry.activities.includes(activity)) {
        existingEntry.activities.push(activity);
      }
    } else {
      this.streakData.streakHistory.push({
        date,
        activities: [activity],
      });
    }

    // Keep only last 365 days of history
    if (this.streakData.streakHistory.length > 365) {
      this.streakData.streakHistory = this.streakData.streakHistory.slice(-365);
    }
  }

  /**
   * Get today's date as ISO string (YYYY-MM-DD)
   */
  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get yesterday's date as ISO string (YYYY-MM-DD)
   */
  private getYesterdayDateString(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  /**
   * Get number of days between two dates
   */
  private getDaysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Load streak data from storage
   */
  private async loadStreakData(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        this.streakData = JSON.parse(data);
        console.log(`📊 Loaded streak data: ${this.streakData.currentStreak} days`);
      }
    } catch (error) {
      console.error('Error loading streak data:', error);
    }
  }

  /**
   * Save streak data to storage
   */
  private async saveStreakData(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.streakData));
    } catch (error) {
      console.error('Error saving streak data:', error);
    }
  }

  /**
   * Reset streak (for testing)
   */
  public async resetStreak(): Promise<void> {
    this.streakData = {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: '',
      totalDaysActive: 0,
      streakHistory: [],
      weeklyActivity: {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0,
      },
    };
    await this.saveStreakData();
  }

  /**
   * Get streak calendar data (for visualization)
   * Returns activity status for each day in the last N days
   */
  public getStreakCalendar(days: number = 30): Array<{ date: string; hasActivity: boolean; activities: string[] }> {
    const calendar: Array<{ date: string; hasActivity: boolean; activities: string[] }> = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      const historyEntry = this.streakData.streakHistory.find(e => e.date === dateString);
      calendar.push({
        date: dateString,
        hasActivity: !!historyEntry,
        activities: historyEntry?.activities || [],
      });
    }

    return calendar;
  }

  /**
   * Get most active day of week
   */
  public getMostActiveDay(): keyof WeeklyActivity {
    let maxDay: keyof WeeklyActivity = 'monday';
    let maxCount = 0;

    for (const [day, count] of Object.entries(this.streakData.weeklyActivity)) {
      if (count > maxCount) {
        maxCount = count;
        maxDay = day as keyof WeeklyActivity;
      }
    }

    return maxDay;
  }

  /**
   * Get streak percentage (current / longest)
   */
  public getStreakPercentage(): number {
    if (this.streakData.longestStreak === 0) return 100;
    return (this.streakData.currentStreak / this.streakData.longestStreak) * 100;
  }
}

// Export singleton instance
export const streakService = StreakService.getInstance();
