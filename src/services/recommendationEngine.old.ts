/**
 * RECOMMENDATION ENGINE
 * AI-powered cocktail and content recommendation system
 * Provides personalized suggestions based on user behavior, preferences, and learning progress
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchService, SearchableItem } from './searchService';
import { searchHistoryService } from './searchHistoryService';
import { log } from '../lib/logger';

export interface UserPreferences {
  favoriteSpirits: string[];
  flavorProfiles: string[]; // sweet, sour, bitter, smoky, spicy, etc.
  difficultyPreference: 'easy' | 'medium' | 'hard' | 'mixed';
  sessionPreference: 'quick' | 'standard' | 'extended'; // based on time available
  allergies: string[];
  dislikes: string[];
  preferredCategories: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface UserBehavior {
  completedRecipes: string[];
  favoriteRecipes: string[];
  skippedRecipes: string[];
  searchPatterns: string[];
  sessionDurations: number[];
  timeOfDayPreferences: string[]; // morning, afternoon, evening, night
  weekdayActivity: boolean[];
  lastActiveTime: number;
}

export interface RecommendationContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number; // 0-6, Sunday = 0
  availableTime: 'quick' | 'standard' | 'extended';
  currentSkillLevel: number; // 1-10
  recentActivity: string[];
  mood?: 'energetic' | 'relaxed' | 'adventurous' | 'nostalgic';
}

export interface Recommendation {
  id: string;
  item: SearchableItem;
  score: number;
  reasons: string[];
  category: 'suggested' | 'trending' | 'personalized' | 'similar' | 'challenge';
  confidence: number; // 0-100
  metadata?: {
    estimatedTime?: number;
    newIngredients?: string[];
    skillGain?: number;
  };
}

export interface RecommendationSet {
  featured: Recommendation[];
  quickPicks: Recommendation[];
  trending: Recommendation[];
  forYou: Recommendation[];
  challenges: Recommendation[];
  similar: Recommendation[];
  metadata: {
    totalRecommendations: number;
    generatedAt: number;
    userContext: Partial<RecommendationContext>;
  };
}

// Storage keys
const STORAGE_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  USER_BEHAVIOR: 'user_behavior',
  RECOMMENDATION_CACHE: 'recommendation_cache',
} as const;

// Default preferences for new users
const DEFAULT_PREFERENCES: UserPreferences = {
  favoriteSpirits: [],
  flavorProfiles: [],
  difficultyPreference: 'mixed',
  sessionPreference: 'standard',
  allergies: [],
  dislikes: [],
  preferredCategories: ['recipe'],
  experienceLevel: 'beginner',
};

const DEFAULT_BEHAVIOR: UserBehavior = {
  completedRecipes: [],
  favoriteRecipes: [],
  skippedRecipes: [],
  searchPatterns: [],
  sessionDurations: [],
  timeOfDayPreferences: [],
  weekdayActivity: [true, true, true, true, true, true, true],
  lastActiveTime: Date.now(),
};

class RecommendationEngine {
  private static instance: RecommendationEngine;
  private userPreferences: UserPreferences = DEFAULT_PREFERENCES;
  private userBehavior: UserBehavior = DEFAULT_BEHAVIOR;
  private cachedRecommendations: RecommendationSet | null = null;
  private cacheExpiry = 15 * 60 * 1000; // 15 minutes

  private constructor() {
    this.loadUserData();
  }

  public static getInstance(): RecommendationEngine {
    if (!RecommendationEngine.instance) {
      RecommendationEngine.instance = new RecommendationEngine();
    }
    return RecommendationEngine.instance;
  }

  /**
   * Get personalized recommendations
   */
  public async getRecommendations(
    context?: Partial<RecommendationContext>
  ): Promise<RecommendationSet> {
    // Check cache first
    if (this.cachedRecommendations && this.isCacheValid()) {
      return this.cachedRecommendations;
    }

    const currentContext = this.buildContext(context);
    const recommendations = await this.generateRecommendations(currentContext);

    // Cache the results
    this.cachedRecommendations = recommendations;
    await this.saveCacheToStorage();

    return recommendations;
  }

  /**
   * Update user preferences
   */
  public async updatePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    this.userPreferences = { ...this.userPreferences, ...preferences };
    await this.saveUserData();
    this.invalidateCache();
  }

  /**
   * Record user behavior
   */
  public async recordBehavior(action: {
    type: 'completed' | 'favorited' | 'skipped' | 'searched' | 'session_end';
    itemId?: string;
    query?: string;
    duration?: number;
  }): Promise<void> {
    const { type, itemId, query, duration } = action;

    switch (type) {
      case 'completed':
        if (itemId && !this.userBehavior.completedRecipes.includes(itemId)) {
          this.userBehavior.completedRecipes.push(itemId);
        }
        break;

      case 'favorited':
        if (itemId && !this.userBehavior.favoriteRecipes.includes(itemId)) {
          this.userBehavior.favoriteRecipes.push(itemId);
        }
        break;

      case 'skipped':
        if (itemId && !this.userBehavior.skippedRecipes.includes(itemId)) {
          this.userBehavior.skippedRecipes.push(itemId);
        }
        break;

      case 'searched':
        if (query) {
          this.userBehavior.searchPatterns.push(query);
          // Keep only last 50 searches
          if (this.userBehavior.searchPatterns.length > 50) {
            this.userBehavior.searchPatterns = this.userBehavior.searchPatterns.slice(-50);
          }
        }
        break;

      case 'session_end':
        if (duration) {
          this.userBehavior.sessionDurations.push(duration);
          // Keep only last 30 sessions
          if (this.userBehavior.sessionDurations.length > 30) {
            this.userBehavior.sessionDurations = this.userBehavior.sessionDurations.slice(-30);
          }
        }
        break;
    }

    this.userBehavior.lastActiveTime = Date.now();
    await this.saveUserData();
    this.invalidateCache();
  }

  /**
   * Get user insights
   */
  public getUserInsights(): {
    experienceLevel: string;
    favoriteSpirits: string[];
    preferredDifficulty: string;
    activityPattern: string;
    improvementAreas: string[];
    achievements: string[];
  } {
    const totalCompleted = this.userBehavior.completedRecipes.length;
    const averageSessionTime = this.userBehavior.sessionDurations.length > 0
      ? this.userBehavior.sessionDurations.reduce((a, b) => a + b, 0) / this.userBehavior.sessionDurations.length
      : 0;

    // Determine experience level based on behavior
    let experienceLevel = 'beginner';
    if (totalCompleted > 20) experienceLevel = 'intermediate';
    if (totalCompleted > 50) experienceLevel = 'advanced';

    // Activity pattern analysis
    const recentActivity = this.userBehavior.lastActiveTime > Date.now() - (7 * 24 * 60 * 60 * 1000);
    const activityPattern = recentActivity ? 'active' : 'occasional';

    // Improvement areas based on skipped recipes
    const improvementAreas = this.userBehavior.skippedRecipes.length > 5
      ? ['Consider trying easier recipes', 'Practice basic techniques']
      : ['Experiment with new spirits', 'Try advanced techniques'];

    // Achievements
    const achievements = [];
    if (totalCompleted >= 5) achievements.push('First Steps');
    if (totalCompleted >= 15) achievements.push('Getting Serious');
    if (totalCompleted >= 30) achievements.push('Cocktail Enthusiast');
    if (this.userBehavior.favoriteRecipes.length >= 10) achievements.push('Curator');

    return {
      experienceLevel,
      favoriteSpirits: this.userPreferences.favoriteSpirits,
      preferredDifficulty: this.userPreferences.difficultyPreference,
      activityPattern,
      improvementAreas,
      achievements,
    };
  }

  /**
   * Generate recommendations based on context
   */
  private async generateRecommendations(
    context: RecommendationContext
  ): Promise<RecommendationSet> {
    // Get all available items
    const allItems = await searchService.search('');

    // Generate different recommendation categories
    const [featured, quickPicks, trending, forYou, challenges, similar] = await Promise.all([
      this.generateFeaturedRecommendations(allItems, context),
      this.generateQuickPickRecommendations(allItems, context),
      this.generateTrendingRecommendations(allItems, context),
      this.generatePersonalizedRecommendations(allItems, context),
      this.generateChallengeRecommendations(allItems, context),
      this.generateSimilarRecommendations(allItems, context),
    ]);

    return {
      featured: featured.slice(0, 3),
      quickPicks: quickPicks.slice(0, 6),
      trending: trending.slice(0, 5),
      forYou: forYou.slice(0, 8),
      challenges: challenges.slice(0, 3),
      similar: similar.slice(0, 6),
      metadata: {
        totalRecommendations: featured.length + quickPicks.length + trending.length +
                             forYou.length + challenges.length + similar.length,
        generatedAt: Date.now(),
        userContext: context,
      },
    };
  }

  /**
   * Generate featured recommendations (editor's picks)
   */
  private async generateFeaturedRecommendations(
    items: SearchableItem[],
    context: RecommendationContext
  ): Promise<Recommendation[]> {
    const recipes = items.filter(item => item.category === 'recipe');

    // Pick high-quality, diverse recipes
    const featured = recipes
      .filter(item => (item.popularity || 0) > 85)
      .slice(0, 5)
      .map(item => ({
        id: `featured_${item.id}`,
        item,
        score: 95,
        reasons: ['Editor\'s pick', 'High quality recipe', 'Popular choice'],
        category: 'suggested' as const,
        confidence: 90,
      }));

    return this.diversifyRecommendations(featured);
  }

  /**
   * Generate quick pick recommendations (easy, fast recipes)
   */
  private async generateQuickPickRecommendations(
    items: SearchableItem[],
    context: RecommendationContext
  ): Promise<Recommendation[]> {
    const quickRecipes = items
      .filter(item =>
        item.category === 'recipe' &&
        (item.time || 0) <= 5 &&
        item.difficulty === 'easy'
      )
      .map(item => ({
        id: `quick_${item.id}`,
        item,
        score: this.calculateQuickPickScore(item, context),
        reasons: ['Quick to make', 'Easy difficulty', 'Perfect for busy moments'],
        category: 'suggested' as const,
        confidence: 85,
        metadata: {
          estimatedTime: item.time,
        },
      }))
      .sort((a, b) => b.score - a.score);

    return quickRecipes.slice(0, 8);
  }

  /**
   * Generate trending recommendations
   */
  private async generateTrendingRecommendations(
    items: SearchableItem[],
    context: RecommendationContext
  ): Promise<Recommendation[]> {
    const trendingSearches = searchHistoryService.getTrendingSearches();
    const trendingItems = [];

    for (const trend of trendingSearches.slice(0, 10)) {
      const matchingItems = items.filter(item =>
        item.title.toLowerCase().includes(trend.query.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(trend.query.toLowerCase()))
      );

      trendingItems.push(...matchingItems.map(item => ({
        id: `trending_${item.id}`,
        item,
        score: 80 + trend.count,
        reasons: ['Trending search', `${trend.count} recent searches`],
        category: 'trending' as const,
        confidence: 75,
      })));
    }

    return trendingItems
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }

  /**
   * Generate personalized recommendations
   */
  private async generatePersonalizedRecommendations(
    items: SearchableItem[],
    context: RecommendationContext
  ): Promise<Recommendation[]> {
    const recommendations = items
      .filter(item =>
        item.category === 'recipe' &&
        !this.userBehavior.completedRecipes.includes(item.id) &&
        !this.userBehavior.skippedRecipes.includes(item.id)
      )
      .map(item => ({
        id: `personalized_${item.id}`,
        item,
        score: this.calculatePersonalizedScore(item, context),
        reasons: this.generatePersonalizedReasons(item),
        category: 'personalized' as const,
        confidence: this.calculateConfidence(item),
      }))
      .sort((a, b) => b.score - a.score);

    return recommendations.slice(0, 10);
  }

  /**
   * Generate challenge recommendations
   */
  private async generateChallengeRecommendations(
    items: SearchableItem[],
    context: RecommendationContext
  ): Promise<Recommendation[]> {
    const userLevel = this.userPreferences.experienceLevel;
    const targetDifficulty = userLevel === 'beginner' ? 'medium' : 'hard';

    const challenges = items
      .filter(item =>
        item.category === 'recipe' &&
        item.difficulty === targetDifficulty &&
        !this.userBehavior.completedRecipes.includes(item.id)
      )
      .map(item => ({
        id: `challenge_${item.id}`,
        item,
        score: this.calculateChallengeScore(item, context),
        reasons: ['Level up your skills', `${targetDifficulty} difficulty`, 'Learn new techniques'],
        category: 'challenge' as const,
        confidence: 70,
        metadata: {
          skillGain: targetDifficulty === 'medium' ? 2 : 3,
        },
      }))
      .sort((a, b) => b.score - a.score);

    return challenges.slice(0, 4);
  }

  /**
   * Generate similar recommendations based on favorites
   */
  private async generateSimilarRecommendations(
    items: SearchableItem[],
    context: RecommendationContext
  ): Promise<Recommendation[]> {
    if (this.userBehavior.favoriteRecipes.length === 0) {
      return [];
    }

    const favoriteItems = items.filter(item =>
      this.userBehavior.favoriteRecipes.includes(item.id)
    );

    const similar = [];
    for (const favorite of favoriteItems) {
      const similarItems = items.filter(item =>
        item.id !== favorite.id &&
        !this.userBehavior.completedRecipes.includes(item.id) &&
        (
          item.tags.some(tag => favorite.tags.includes(tag)) ||
          item.difficulty === favorite.difficulty ||
          (item.data?.ingredients && favorite.data?.ingredients &&
           this.hasCommonIngredients(item.data.ingredients, favorite.data.ingredients))
        )
      );

      similar.push(...similarItems.map(item => ({
        id: `similar_${item.id}`,
        item,
        score: this.calculateSimilarityScore(item, favorite),
        reasons: [`Similar to ${favorite.title}`, 'Based on your favorites'],
        category: 'similar' as const,
        confidence: 80,
      })));
    }

    return similar
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }

  /**
   * Calculate personalized recommendation score
   */
  private calculatePersonalizedScore(
    item: SearchableItem,
    context: RecommendationContext
  ): number {
    let score = item.popularity || 50;

    // Prefer user's favorite spirits
    if (item.data?.ingredients) {
      const hasPreferredSpirit = this.userPreferences.favoriteSpirits.some(spirit =>
        item.data.ingredients.some((ing: string) =>
          ing.toLowerCase().includes(spirit.toLowerCase())
        )
      );
      if (hasPreferredSpirit) score += 20;
    }

    // Difficulty preference
    if (item.difficulty === this.userPreferences.difficultyPreference ||
        this.userPreferences.difficultyPreference === 'mixed') {
      score += 15;
    }

    // Time context
    if (context.availableTime === 'quick' && (item.time || 0) <= 5) score += 10;
    if (context.availableTime === 'extended' && (item.time || 0) > 10) score += 10;

    // Category preference
    if (this.userPreferences.preferredCategories.includes(item.category)) {
      score += 10;
    }

    // Search pattern matching
    const matchesSearchPattern = this.userBehavior.searchPatterns.some(pattern =>
      item.title.toLowerCase().includes(pattern.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(pattern.toLowerCase()))
    );
    if (matchesSearchPattern) score += 15;

    return Math.min(score, 100);
  }

  /**
   * Generate personalized reasons
   */
  private generatePersonalizedReasons(item: SearchableItem): string[] {
    const reasons = [];

    if (item.data?.ingredients) {
      const hasPreferredSpirit = this.userPreferences.favoriteSpirits.some(spirit =>
        item.data.ingredients.some((ing: string) =>
          ing.toLowerCase().includes(spirit.toLowerCase())
        )
      );
      if (hasPreferredSpirit) {
        reasons.push('Features your favorite spirits');
      }
    }

    if (item.difficulty === this.userPreferences.difficultyPreference) {
      reasons.push('Matches your preferred difficulty');
    }

    if ((item.popularity || 0) > 85) {
      reasons.push('Highly rated by the community');
    }

    if (reasons.length === 0) {
      reasons.push('Recommended for you');
    }

    return reasons;
  }

  /**
   * Calculate other scoring methods
   */
  private calculateQuickPickScore(item: SearchableItem, context: RecommendationContext): number {
    let score = (item.popularity || 50) + 20; // Base bonus for quick picks
    if ((item.time || 0) <= 3) score += 15; // Extra quick
    if (item.difficulty === 'easy') score += 10;
    return score;
  }

  private calculateChallengeScore(item: SearchableItem, context: RecommendationContext): number {
    let score = (item.popularity || 50) + 10;
    if (item.difficulty === 'hard') score += 20;
    if (item.difficulty === 'medium') score += 15;
    return score;
  }

  private calculateSimilarityScore(item: SearchableItem, favorite: SearchableItem): number {
    let score = item.popularity || 50;

    // Tag similarity
    const commonTags = item.tags.filter(tag => favorite.tags.includes(tag));
    score += commonTags.length * 10;

    // Difficulty match
    if (item.difficulty === favorite.difficulty) score += 15;

    // Ingredient similarity
    if (item.data?.ingredients && favorite.data?.ingredients) {
      const commonIngredients = this.getCommonIngredients(
        item.data.ingredients,
        favorite.data.ingredients
      );
      score += commonIngredients.length * 5;
    }

    return score;
  }

  private calculateConfidence(item: SearchableItem): number {
    let confidence = 60;
    if ((item.popularity || 0) > 80) confidence += 20;
    if (this.userBehavior.completedRecipes.length > 10) confidence += 10;
    if (this.userPreferences.favoriteSpirits.length > 0) confidence += 10;
    return Math.min(confidence, 100);
  }

  /**
   * Helper methods
   */
  private buildContext(context?: Partial<RecommendationContext>): RecommendationContext {
    const now = new Date();
    const hour = now.getHours();

    let timeOfDay: RecommendationContext['timeOfDay'] = 'evening';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 17) timeOfDay = 'afternoon';
    else if (hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    return {
      timeOfDay,
      dayOfWeek: now.getDay(),
      availableTime: 'standard',
      currentSkillLevel: this.userBehavior.completedRecipes.length <= 5 ? 3 :
                        this.userBehavior.completedRecipes.length <= 20 ? 6 : 9,
      recentActivity: this.userBehavior.searchPatterns.slice(-5),
      ...context,
    };
  }

  private diversifyRecommendations(recommendations: Recommendation[]): Recommendation[] {
    // Ensure variety in spirits, difficulty, and styles
    const diverse = [];
    const usedSpirits = new Set();
    const usedDifficulties = new Set();

    for (const rec of recommendations) {
      const spirit = rec.item.data?.ingredients?.[0] || 'unknown';
      const difficulty = rec.item.difficulty || 'unknown';

      if (!usedSpirits.has(spirit) || !usedDifficulties.has(difficulty)) {
        diverse.push(rec);
        usedSpirits.add(spirit);
        usedDifficulties.add(difficulty);
      }
    }

    // Fill remaining slots if needed
    while (diverse.length < 3 && diverse.length < recommendations.length) {
      const remaining = recommendations.filter(rec => !diverse.includes(rec));
      if (remaining.length > 0) {
        diverse.push(remaining[0]);
      } else {
        break;
      }
    }

    return diverse;
  }

  private hasCommonIngredients(ingredients1: string[], ingredients2: string[]): boolean {
    return ingredients1.some(ing1 =>
      ingredients2.some(ing2 =>
        ing1.toLowerCase().includes(ing2.toLowerCase()) ||
        ing2.toLowerCase().includes(ing1.toLowerCase())
      )
    );
  }

  private getCommonIngredients(ingredients1: string[], ingredients2: string[]): string[] {
    return ingredients1.filter(ing1 =>
      ingredients2.some(ing2 =>
        ing1.toLowerCase().includes(ing2.toLowerCase()) ||
        ing2.toLowerCase().includes(ing1.toLowerCase())
      )
    );
  }

  private isCacheValid(): boolean {
    return this.cachedRecommendations !== null &&
           (Date.now() - this.cachedRecommendations.metadata.generatedAt) < this.cacheExpiry;
  }

  private invalidateCache(): void {
    this.cachedRecommendations = null;
  }

  /**
   * Storage methods
   */
  private async loadUserData(): Promise<void> {
    try {
      const [prefsData, behaviorData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES),
        AsyncStorage.getItem(STORAGE_KEYS.USER_BEHAVIOR),
      ]);

      if (prefsData) {
        this.userPreferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(prefsData) };
      }

      if (behaviorData) {
        this.userBehavior = { ...DEFAULT_BEHAVIOR, ...JSON.parse(behaviorData) };
      }
    } catch (error) {
      log.error('RecommendationEngine', 'Failed to load user data', error);
    }
  }

  private async saveUserData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(this.userPreferences)),
        AsyncStorage.setItem(STORAGE_KEYS.USER_BEHAVIOR, JSON.stringify(this.userBehavior)),
      ]);
    } catch (error) {
      log.error('RecommendationEngine', 'Failed to save user data', error);
    }
  }

  private async saveCacheToStorage(): Promise<void> {
    try {
      if (this.cachedRecommendations) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.RECOMMENDATION_CACHE,
          JSON.stringify(this.cachedRecommendations)
        );
      }
    } catch (error) {
      log.error('RecommendationEngine', 'Failed to save recommendation cache', error);
    }
  }
}

// Export singleton instance
export const recommendationEngine = RecommendationEngine.getInstance();