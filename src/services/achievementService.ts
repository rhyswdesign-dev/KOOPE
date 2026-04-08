/**
 * ACHIEVEMENT SERVICE
 * Manages user achievements, badges, and milestones
 * Tracks progress and unlocks rewards
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../lib/logger';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'recipe' | 'social' | 'knowledge' | 'collection' | 'streak';
  requirement: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: number;
  xpReward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserStats {
  recipesViewed: number;
  recipesMade: number;
  recipesCreated: number;
  recipesShared: number;
  cocktailsMade: number;
  favoriteCount: number;
  homeBarIngredients: number;
  bottlesScanned: number;
  lessonsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
  level: number;
  barsVisited: number;
  gamesPlayed: number;
}

// Storage keys
const STORAGE_KEYS = {
  ACHIEVEMENTS: '@achievements',
  USER_STATS: '@user_stats',
  STREAK_DATA: '@streak_data',
} as const;

// Achievement definitions
const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'progress' | 'unlocked' | 'unlockedAt'>[] = [
  // Recipe Achievements
  {
    id: 'first_recipe',
    title: 'First Cocktail',
    description: 'View your first recipe',
    icon: 'book-outline',
    category: 'recipe',
    requirement: 1,
    xpReward: 10,
    rarity: 'common',
  },
  {
    id: 'recipe_explorer',
    title: 'Recipe Explorer',
    description: 'View 10 different recipes',
    icon: 'compass-outline',
    category: 'recipe',
    requirement: 10,
    xpReward: 25,
    rarity: 'common',
  },
  {
    id: 'recipe_enthusiast',
    title: 'Recipe Enthusiast',
    description: 'View 50 different recipes',
    icon: 'telescope-outline',
    category: 'recipe',
    requirement: 50,
    xpReward: 100,
    rarity: 'rare',
  },
  {
    id: 'recipe_master',
    title: 'Recipe Master',
    description: 'View 100 different recipes',
    icon: 'trophy-outline',
    category: 'recipe',
    requirement: 100,
    xpReward: 250,
    rarity: 'epic',
  },
  {
    id: 'first_creation',
    title: 'Creative Mind',
    description: 'Create your first recipe',
    icon: 'create-outline',
    category: 'recipe',
    requirement: 1,
    xpReward: 50,
    rarity: 'rare',
  },
  {
    id: 'recipe_creator',
    title: 'Recipe Creator',
    description: 'Create 5 recipes',
    icon: 'bulb-outline',
    category: 'recipe',
    requirement: 5,
    xpReward: 150,
    rarity: 'epic',
  },

  // Collection Achievements
  {
    id: 'favorite_collector',
    title: 'Favorite Collector',
    description: 'Add 10 recipes to favorites',
    icon: 'heart-outline',
    category: 'collection',
    requirement: 10,
    xpReward: 25,
    rarity: 'common',
  },
  {
    id: 'home_bar_starter',
    title: 'Home Bar Starter',
    description: 'Add 5 ingredients to your home bar',
    icon: 'home-outline',
    category: 'collection',
    requirement: 5,
    xpReward: 30,
    rarity: 'common',
  },
  {
    id: 'home_bar_pro',
    title: 'Home Bar Pro',
    description: 'Add 20 ingredients to your home bar',
    icon: 'medal-outline',
    category: 'collection',
    requirement: 20,
    xpReward: 100,
    rarity: 'rare',
  },
  {
    id: 'full_bar',
    title: 'Fully Stocked Bar',
    description: 'Add 50 ingredients to your home bar',
    icon: 'ribbon-outline',
    category: 'collection',
    requirement: 50,
    xpReward: 300,
    rarity: 'epic',
  },

  // Knowledge Achievements
  {
    id: 'first_lesson',
    title: 'Student of Mixology',
    description: 'Complete your first lesson',
    icon: 'school-outline',
    category: 'knowledge',
    requirement: 1,
    xpReward: 25,
    rarity: 'common',
  },
  {
    id: 'dedicated_student',
    title: 'Dedicated Student',
    description: 'Complete 5 lessons',
    icon: 'library-outline',
    category: 'knowledge',
    requirement: 5,
    xpReward: 75,
    rarity: 'rare',
  },
  {
    id: 'master_mixologist',
    title: 'Master Mixologist',
    description: 'Complete 20 lessons',
    icon: 'flask-outline',
    category: 'knowledge',
    requirement: 20,
    xpReward: 500,
    rarity: 'legendary',
  },

  // Streak Achievements
  {
    id: 'consistent_3',
    title: 'Building Habits',
    description: 'Maintain a 3-day streak',
    icon: 'flame-outline',
    category: 'streak',
    requirement: 3,
    xpReward: 30,
    rarity: 'common',
  },
  {
    id: 'consistent_7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: 'flame',
    category: 'streak',
    requirement: 7,
    xpReward: 75,
    rarity: 'rare',
  },
  {
    id: 'consistent_30',
    title: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: 'bonfire-outline',
    category: 'streak',
    requirement: 30,
    xpReward: 300,
    rarity: 'epic',
  },
  {
    id: 'consistent_100',
    title: 'Century Club',
    description: 'Maintain a 100-day streak',
    icon: 'bonfire',
    category: 'streak',
    requirement: 100,
    xpReward: 1000,
    rarity: 'legendary',
  },

  // Advanced Recipe Achievements (for users who max out basics)
  {
    id: 'recipe_legend',
    title: 'Recipe Legend',
    description: 'View 250 different recipes',
    icon: 'star',
    category: 'recipe',
    requirement: 250,
    xpReward: 500,
    rarity: 'legendary',
  },
  {
    id: 'master_creator',
    title: 'Master Creator',
    description: 'Create 25 original recipes',
    icon: 'sparkles',
    category: 'recipe',
    requirement: 25,
    xpReward: 750,
    rarity: 'legendary',
  },

  // Cocktails Made Achievements
  {
    id: 'first_cocktail_made',
    title: 'First Mix',
    description: 'Make your first cocktail',
    icon: 'wine-outline',
    category: 'recipe',
    requirement: 1,
    xpReward: 20,
    rarity: 'common',
  },
  {
    id: 'home_bartender',
    title: 'Home Bartender',
    description: 'Make 10 cocktails',
    icon: 'wine',
    category: 'recipe',
    requirement: 10,
    xpReward: 100,
    rarity: 'rare',
  },
  {
    id: 'seasoned_mixologist',
    title: 'Seasoned Mixologist',
    description: 'Make 50 cocktails',
    icon: 'flask',
    category: 'recipe',
    requirement: 50,
    xpReward: 300,
    rarity: 'epic',
  },

  // Recipes Shared Achievements
  {
    id: 'first_share',
    title: 'Social Butterfly',
    description: 'Share your first recipe',
    icon: 'share-social-outline',
    category: 'social',
    requirement: 1,
    xpReward: 15,
    rarity: 'common',
  },
  {
    id: 'influencer',
    title: 'Influencer',
    description: 'Share 10 recipes',
    icon: 'megaphone-outline',
    category: 'social',
    requirement: 10,
    xpReward: 80,
    rarity: 'rare',
  },
  {
    id: 'viral_sensation',
    title: 'Viral Sensation',
    description: 'Share 25 recipes',
    icon: 'rocket-outline',
    category: 'social',
    requirement: 25,
    xpReward: 200,
    rarity: 'epic',
  },

  // Advanced Collection Achievements
  {
    id: 'ultimate_collector',
    title: 'Ultimate Collector',
    description: 'Add 100 ingredients to your home bar',
    icon: 'diamond',
    category: 'collection',
    requirement: 100,
    xpReward: 1000,
    rarity: 'legendary',
  },
  {
    id: 'favorites_master',
    title: 'Favorites Master',
    description: 'Add 50 recipes to favorites',
    icon: 'heart',
    category: 'collection',
    requirement: 50,
    xpReward: 200,
    rarity: 'epic',
  },

  // Advanced Knowledge Achievements
  {
    id: 'knowledge_completionist',
    title: 'Completionist',
    description: 'Complete ALL available lessons',
    icon: 'shield-checkmark',
    category: 'knowledge',
    requirement: 50, // Update based on total lessons
    xpReward: 2000,
    rarity: 'legendary',
  },
  {
    id: 'perfect_student',
    title: 'Perfect Student',
    description: 'Complete 10 lessons with 100% accuracy',
    icon: 'ribbon',
    category: 'knowledge',
    requirement: 10,
    xpReward: 500,
    rarity: 'epic',
  },

  // Advanced Streak Achievements
  {
    id: 'consistent_365',
    title: 'Year-Long Legend',
    description: 'Maintain a 365-day streak',
    icon: 'trophy',
    category: 'streak',
    requirement: 365,
    xpReward: 5000,
    rarity: 'legendary',
  },
  {
    id: 'streak_comeback',
    title: 'Comeback Kid',
    description: 'Rebuild a 30-day streak after breaking one',
    icon: 'refresh',
    category: 'streak',
    requirement: 30,
    xpReward: 250,
    rarity: 'epic',
  },

  // Social Achievements
  {
    id: 'bar_explorer',
    title: 'Bar Explorer',
    description: 'Visit 5 different bars',
    icon: 'location-outline',
    category: 'social',
    requirement: 5,
    xpReward: 50,
    rarity: 'common',
  },
  {
    id: 'bar_master',
    title: 'Bar Master',
    description: 'Visit all 15 bars in the app',
    icon: 'map',
    category: 'social',
    requirement: 15,
    xpReward: 300,
    rarity: 'legendary',
  },
  {
    id: 'game_player',
    title: 'Game Player',
    description: 'Play 5 drinking games',
    icon: 'game-controller-outline',
    category: 'social',
    requirement: 5,
    xpReward: 40,
    rarity: 'common',
  },

  // Scan / Collection Achievements
  {
    id: 'first_scan',
    title: 'First Scan',
    description: 'Scan your first bottle',
    icon: 'scan-outline',
    category: 'collection',
    requirement: 1,
    xpReward: 25,
    rarity: 'common',
  },
  {
    id: 'scanner',
    title: 'Scanner',
    description: 'Scan 5 different bottles',
    icon: 'barcode-outline',
    category: 'collection',
    requirement: 5,
    xpReward: 75,
    rarity: 'common',
  },
  {
    id: 'bottle_collector',
    title: 'Bottle Collector',
    description: 'Scan 25 different bottles',
    icon: 'wine-outline',
    category: 'collection',
    requirement: 25,
    xpReward: 250,
    rarity: 'rare',
  },
  {
    id: 'spirit_archivist',
    title: 'Spirit Archivist',
    description: 'Scan 100 bottles',
    icon: 'archive-outline',
    category: 'collection',
    requirement: 100,
    xpReward: 750,
    rarity: 'epic',
  },
];

class AchievementService {
  private static instance: AchievementService;
  private achievements: Achievement[] = [];
  private userStats: UserStats = {
    recipesViewed: 0,
    recipesMade: 0,
    recipesCreated: 0,
    recipesShared: 0,
    cocktailsMade: 0,
    favoriteCount: 0,
    homeBarIngredients: 0,
    bottlesScanned: 0,
    lessonsCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalXP: 0,
    level: 1,
    barsVisited: 0,
    gamesPlayed: 0,
  };
  private listeners: Array<(achievement: Achievement) => void> = [];

  private constructor() {
    this.initialize();
  }

  public static getInstance(): AchievementService {
    if (!AchievementService.instance) {
      AchievementService.instance = new AchievementService();
    }
    return AchievementService.instance;
  }

  /**
   * Initialize achievements and load from storage
   */
  private async initialize(): Promise<void> {
    await Promise.all([this.loadAchievements(), this.loadUserStats()]);
  }

  /**
   * Track an action and check for achievement unlocks
   * Increments the stat by the given value
   */
  public async trackAction(
    action: keyof UserStats,
    value: number = 1
  ): Promise<Achievement[]> {
    // Update user stats (increment)
    this.userStats[action] = (this.userStats[action] as number) + value;
    await this.saveUserStats();

    // Check and unlock achievements
    const unlockedAchievements = await this.checkAchievements();

    return unlockedAchievements;
  }

  /**
   * Set a stat to an absolute value (used for streaks which should be set, not incremented)
   */
  public async setStat(
    action: keyof UserStats,
    value: number
  ): Promise<Achievement[]> {
    this.userStats[action] = value;
    await this.saveUserStats();

    const unlockedAchievements = await this.checkAchievements();
    return unlockedAchievements;
  }

  /**
   * Check if any achievements should be unlocked
   */
  private async checkAchievements(): Promise<Achievement[]> {
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of this.achievements) {
      if (!achievement.unlocked) {
        // Get current progress based on achievement category
        const progress = this.getProgressForAchievement(achievement);
        achievement.progress = progress;

        // Check if achievement is completed
        if (progress >= achievement.requirement) {
          achievement.unlocked = true;
          achievement.unlockedAt = Date.now();

          // Award XP
          this.userStats.totalXP += achievement.xpReward;
          this.updateLevel();

          newlyUnlocked.push(achievement);

          // Notify listeners
          this.listeners.forEach(listener => listener(achievement));

          // Track achievement unlock in Mixpanel
          trackEvent(ANALYTICS_EVENTS.ACHIEVEMENT_UNLOCKED, {
            [ANALYTICS_PROPS.ACHIEVEMENT_ID]: achievement.id,
            [ANALYTICS_PROPS.ACHIEVEMENT_TITLE]: achievement.title,
            [ANALYTICS_PROPS.ACHIEVEMENT_CATEGORY]: achievement.category,
            [ANALYTICS_PROPS.ACHIEVEMENT_RARITY]: achievement.rarity,
            [ANALYTICS_PROPS.XP_REWARD]: achievement.xpReward,
            total_xp: this.userStats.totalXP,
            user_level: this.userStats.level,
          });

          log.info('AchievementService', 'Achievement unlocked', {
            title: achievement.title,
            xpReward: achievement.xpReward
          });
        }
      }
    }

    if (newlyUnlocked.length > 0) {
      await Promise.all([this.saveAchievements(), this.saveUserStats()]);
    }

    return newlyUnlocked;
  }

  /**
   * Get progress for a specific achievement
   */
  private getProgressForAchievement(achievement: Achievement): number {
    switch (achievement.id) {
      // Recipe achievements
      case 'first_recipe':
      case 'recipe_explorer':
      case 'recipe_enthusiast':
      case 'recipe_master':
      case 'recipe_legend':
        return this.userStats.recipesViewed;

      case 'first_creation':
      case 'recipe_creator':
      case 'master_creator':
        return this.userStats.recipesCreated;

      // Cocktails made achievements
      case 'first_cocktail_made':
      case 'home_bartender':
      case 'seasoned_mixologist':
        return this.userStats.cocktailsMade;

      // Recipes shared achievements
      case 'first_share':
      case 'influencer':
      case 'viral_sensation':
        return this.userStats.recipesShared;

      // Collection achievements
      case 'favorite_collector':
      case 'favorites_master':
        return this.userStats.favoriteCount;

      case 'home_bar_starter':
      case 'home_bar_pro':
      case 'full_bar':
      case 'ultimate_collector':
        return this.userStats.homeBarIngredients;

      // Knowledge achievements
      case 'first_lesson':
      case 'dedicated_student':
      case 'master_mixologist':
      case 'knowledge_completionist':
      case 'perfect_student':
        return this.userStats.lessonsCompleted;

      // Streak achievements
      case 'consistent_3':
      case 'consistent_7':
      case 'consistent_30':
      case 'consistent_100':
      case 'consistent_365':
      case 'streak_comeback':
        return this.userStats.currentStreak;

      // Social achievements
      case 'bar_explorer':
      case 'bar_master':
        return this.userStats.barsVisited;

      case 'game_player':
        return this.userStats.gamesPlayed;

      // Scan achievements
      case 'first_scan':
      case 'scanner':
      case 'bottle_collector':
      case 'spirit_archivist':
        return this.userStats.bottlesScanned;

      default:
        return 0;
    }
  }

  /**
   * Update user level based on XP
   */
  private updateLevel(): void {
    // XP required for each level: level * 100
    const newLevel = Math.floor(this.userStats.totalXP / 100) + 1;
    if (newLevel > this.userStats.level) {
      this.userStats.level = newLevel;
      log.info('AchievementService', 'Level up!', { newLevel });
    }
  }

  /**
   * Get all achievements
   */
  public getAchievements(): Achievement[] {
    return [...this.achievements];
  }

  /**
   * Get unlocked achievements
   */
  public getUnlockedAchievements(): Achievement[] {
    return this.achievements.filter(a => a.unlocked);
  }

  /**
   * Get achievements by category
   */
  public getAchievementsByCategory(category: Achievement['category']): Achievement[] {
    return this.achievements.filter(a => a.category === category);
  }

  /**
   * Get user stats
   */
  public getUserStats(): UserStats {
    return { ...this.userStats };
  }

  /**
   * Get next level XP requirement
   */
  public getNextLevelXP(): number {
    return this.userStats.level * 100;
  }

  /**
   * Get progress to next level (0-1)
   */
  public getLevelProgress(): number {
    const currentLevelXP = (this.userStats.level - 1) * 100;
    const xpIntoCurrentLevel = this.userStats.totalXP - currentLevelXP;
    const xpNeededForNextLevel = 100;
    return xpIntoCurrentLevel / xpNeededForNextLevel;
  }

  /**
   * Sync XP/level from the global XP system (useXPSystem)
   * This ensures achievements screen shows the same XP as the rest of the app
   */
  public syncXP(totalXP: number): void {
    this.userStats.totalXP = totalXP;
    this.userStats.level = Math.floor(totalXP / 100) + 1;
    this.saveUserStats();
  }

  /**
   * Subscribe to achievement unlocks
   */
  public addAchievementListener(listener: (achievement: Achievement) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Load achievements from storage
   */
  private async loadAchievements(): Promise<void> {
    try {
      const achievementsData = await AsyncStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);

      if (achievementsData) {
        this.achievements = JSON.parse(achievementsData);
      } else {
        // Initialize with defaults
        this.achievements = ACHIEVEMENT_DEFINITIONS.map(def => ({
          ...def,
          progress: 0,
          unlocked: false,
        }));
        await this.saveAchievements();
      }
    } catch (error) {
      log.error('AchievementService', 'Failed to load achievements', error);
      // Fallback to defaults
      this.achievements = ACHIEVEMENT_DEFINITIONS.map(def => ({
        ...def,
        progress: 0,
        unlocked: false,
      }));
    }
  }

  /**
   * Save achievements to storage
   */
  private async saveAchievements(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(this.achievements));
    } catch (error) {
      log.error('AchievementService', 'Failed to save achievements', error);
    }
  }

  /**
   * Load user stats from storage
   */
  private async loadUserStats(): Promise<void> {
    try {
      const statsData = await AsyncStorage.getItem(STORAGE_KEYS.USER_STATS);
      if (statsData) {
        const parsed = JSON.parse(statsData);
        // Merge with defaults to handle missing fields from older versions
        this.userStats = { ...this.userStats, ...parsed };
      }
    } catch (error) {
      log.error('AchievementService', 'Failed to load user stats', error);
    }
  }

  /**
   * Save user stats to storage
   */
  private async saveUserStats(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_STATS, JSON.stringify(this.userStats));
    } catch (error) {
      log.error('AchievementService', 'Failed to save user stats', error);
    }
  }

  /**
   * Reset all achievements (for testing)
   */
  public async resetAll(): Promise<void> {
    this.achievements = ACHIEVEMENT_DEFINITIONS.map(def => ({
      ...def,
      progress: 0,
      unlocked: false,
    }));
    this.userStats = {
      recipesViewed: 0,
      recipesMade: 0,
      recipesCreated: 0,
      recipesShared: 0,
      cocktailsMade: 0,
      favoriteCount: 0,
      homeBarIngredients: 0,
      bottlesScanned: 0,
      lessonsCompleted: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalXP: 0,
      level: 1,
      barsVisited: 0,
      gamesPlayed: 0,
    };
    await Promise.all([this.saveAchievements(), this.saveUserStats()]);
  }
}

// Export singleton instance
export const achievementService = AchievementService.getInstance();
