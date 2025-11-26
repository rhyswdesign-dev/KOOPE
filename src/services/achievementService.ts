/**
 * ACHIEVEMENT SERVICE
 * Manages user achievements, badges, and milestones
 * Tracks progress and unlocks rewards
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

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
  favoriteCount: number;
  homeBarIngredients: number;
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
    id: 'game_player',
    title: 'Game Player',
    description: 'Play 5 drinking games',
    icon: 'game-controller-outline',
    category: 'social',
    requirement: 5,
    xpReward: 40,
    rarity: 'common',
  },
];

class AchievementService {
  private static instance: AchievementService;
  private achievements: Achievement[] = [];
  private userStats: UserStats = {
    recipesViewed: 0,
    recipesMade: 0,
    recipesCreated: 0,
    favoriteCount: 0,
    homeBarIngredients: 0,
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
   */
  public async trackAction(
    action: keyof UserStats,
    value: number = 1
  ): Promise<Achievement[]> {
    // Update user stats
    this.userStats[action] = (this.userStats[action] as number) + value;
    await this.saveUserStats();

    // Check and unlock achievements
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

          console.log(`🏆 Achievement unlocked: ${achievement.title}`);
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
        return this.userStats.recipesViewed;

      case 'first_creation':
      case 'recipe_creator':
        return this.userStats.recipesCreated;

      // Collection achievements
      case 'favorite_collector':
        return this.userStats.favoriteCount;

      case 'home_bar_starter':
      case 'home_bar_pro':
      case 'full_bar':
        return this.userStats.homeBarIngredients;

      // Knowledge achievements
      case 'first_lesson':
      case 'dedicated_student':
      case 'master_mixologist':
        return this.userStats.lessonsCompleted;

      // Streak achievements
      case 'consistent_3':
      case 'consistent_7':
      case 'consistent_30':
      case 'consistent_100':
        return this.userStats.currentStreak;

      // Social achievements
      case 'bar_explorer':
        return this.userStats.barsVisited;

      case 'game_player':
        return this.userStats.gamesPlayed;

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
      console.log(`🎉 Level up! Now level ${newLevel}`);
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
      console.error('Error loading achievements:', error);
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
      console.error('Error saving achievements:', error);
    }
  }

  /**
   * Load user stats from storage
   */
  private async loadUserStats(): Promise<void> {
    try {
      const statsData = await AsyncStorage.getItem(STORAGE_KEYS.USER_STATS);
      if (statsData) {
        this.userStats = JSON.parse(statsData);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }

  /**
   * Save user stats to storage
   */
  private async saveUserStats(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_STATS, JSON.stringify(this.userStats));
    } catch (error) {
      console.error('Error saving user stats:', error);
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
      favoriteCount: 0,
      homeBarIngredients: 0,
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
