/**
 * Recommendation Engine
 * Calculates personalized recipe scores based on user preferences
 * NO AI REQUIRED - Pure algorithm-based recommendations
 */

import { EnhancedUserProfile, Spirit, FlavorProfile, RecipeInteraction } from '../types/userProfile';
import { Recipe, RecipeWithUserData, RecipeFilters, getIngredientCount } from '../types/recipe';
import { calculateTasteMatchPercent } from './tasteMatchService';

export interface RecommendationScore {
  recipeId: string;
  score: number; // 0-100
  reasons: string[]; // Why this was recommended
  matchFactors: {
    spiritMatch: number;
    flavorMatch: number;
    skillMatch: number;
    abvMatch: number;
    toolsMatch: number;
    occasionMatch: number;
    completionMatch: number;
  };
}

export class RecommendationEngine {
  /**
   * Calculate recommendation score for a recipe based on user profile
   */
  static calculateScore(
    recipe: Recipe,
    userProfile: EnhancedUserProfile
  ): RecommendationScore {
    const reasons: string[] = [];
    const matchFactors = {
      spiritMatch: 0,
      flavorMatch: 0,
      skillMatch: 0,
      abvMatch: 0,
      toolsMatch: 0,
      occasionMatch: 0,
      completionMatch: 0,
    };

    // 1. Spirit Match (weight: 30 points)
    matchFactors.spiritMatch = this.calculateSpiritMatch(
      recipe,
      userProfile,
      reasons
    );

    // 2. Flavor Profile Match (weight: 25 points)
    matchFactors.flavorMatch = this.calculateFlavorMatch(
      recipe,
      userProfile,
      reasons
    );

    // 3. Skill Level Match (weight: 15 points)
    matchFactors.skillMatch = this.calculateSkillMatch(
      recipe,
      userProfile,
      reasons
    );

    // 4. ABV Match (weight: 15 points)
    matchFactors.abvMatch = this.calculateABVMatch(
      recipe,
      userProfile,
      reasons
    );

    // 5. Tools Match (weight: 10 points)
    matchFactors.toolsMatch = this.calculateToolsMatch(
      recipe,
      userProfile,
      reasons
    );

    // 6. Occasion/Context Match (weight: 5 points)
    matchFactors.occasionMatch = this.calculateOccasionMatch(
      recipe,
      userProfile,
      reasons
    );

    // 7. Completion behavior match (bonus: 10 points)
    matchFactors.completionMatch = this.calculateCompletionMatch(
      recipe,
      userProfile,
      reasons
    );

    // Calculate total score
    const totalScore =
      matchFactors.spiritMatch +
      matchFactors.flavorMatch +
      matchFactors.skillMatch +
      matchFactors.abvMatch +
      matchFactors.toolsMatch +
      matchFactors.occasionMatch +
      matchFactors.completionMatch;

    return {
      recipeId: recipe.id,
      score: Math.min(100, Math.max(0, totalScore)),
      reasons,
      matchFactors,
    };
  }

  /**
   * Spirit matching (30 points max)
   */
  private static calculateSpiritMatch(
    recipe: Recipe,
    userProfile: EnhancedUserProfile,
    reasons: string[]
  ): number {
    let score = 0;

    // Perfect match: base spirit is user's favorite (20 points)
    if (recipe.baseSpirit && recipe.baseSpirit === userProfile.favoriteSpirit) {
      score += 20;
      reasons.push(`Made with your favorite spirit: ${recipe.baseSpirit}`);
    }
    // Good match: base spirit in user's preferences (15 points)
    else if (
      recipe.baseSpirit &&
      userProfile.spiritPreferences.includes(recipe.baseSpirit)
    ) {
      score += 15;
      reasons.push(`Uses ${recipe.baseSpirit} from your preferences`);
    }

    // Any spirit match (5 points each, max 10)
    const matchingSpirits = recipe.spiritsUsed.filter((spirit) =>
      userProfile.spiritPreferences.includes(spirit)
    );
    if (matchingSpirits.length > 0) {
      score += Math.min(10, matchingSpirits.length * 5);
    }

    return score;
  }

  /**
   * Flavor profile matching (25 points max)
   */
  private static calculateFlavorMatch(
    recipe: Recipe,
    userProfile: EnhancedUserProfile,
    reasons: string[]
  ): number {
    if (userProfile.flavorProfiles.length === 0) return 10; // Neutral score

    let score = 0;
    const matchingFlavors = recipe.flavorProfiles.filter((flavor) =>
      userProfile.flavorProfiles.includes(flavor)
    );

    if (matchingFlavors.length > 0) {
      // Each matching flavor = 8 points (up to 25 for 3+ matches)
      score = Math.min(25, matchingFlavors.length * 8);
      reasons.push(`Matches your ${matchingFlavors.join(', ')} flavor preferences`);
    }

    return score;
  }

  /**
   * Skill level matching (15 points max)
   */
  private static calculateSkillMatch(
    recipe: Recipe,
    userProfile: EnhancedUserProfile,
    reasons: string[]
  ): number {
    const skillLevels = {
      beginner: 1,
      intermediate: 2,
      advanced: 3,
      expert: 4,
    };

    const userSkillLevel = skillLevels[userProfile.skillLevel];
    const recipeSkillLevel = skillLevels[recipe.difficulty];

    // Perfect match: recipe matches user skill (15 points)
    if (recipeSkillLevel === userSkillLevel) {
      reasons.push(`Perfect difficulty for your ${userProfile.skillLevel} level`);
      return 15;
    }

    // One level easier: still good (12 points)
    if (recipeSkillLevel === userSkillLevel - 1) {
      reasons.push(`Easy ${recipe.difficulty} recipe for your skill level`);
      return 12;
    }

    // One level harder: challenge (10 points)
    if (recipeSkillLevel === userSkillLevel + 1) {
      reasons.push(`${recipe.difficulty} challenge to grow your skills`);
      return 10;
    }

    // Two levels different: lower score
    if (Math.abs(recipeSkillLevel - userSkillLevel) === 2) {
      return 5;
    }

    // Too different
    return 0;
  }

  /**
   * ABV matching (15 points max)
   */
  private static calculateABVMatch(
    recipe: Recipe,
    userProfile: EnhancedUserProfile,
    reasons: string[]
  ): number {
    const userABVRange = userProfile.preferredABVRange;
    if (!userABVRange) return 10; // Neutral score

    const recipeABV = recipe.abv;

    // Perfect match: within preferred range
    if (recipeABV >= userABVRange.min && recipeABV <= userABVRange.max) {
      if (userProfile.alcoholPreference === 'zero-proof') {
        reasons.push('Alcohol-free cocktail');
      } else if (userProfile.alcoholPreference === 'low-abv') {
        reasons.push('Low-alcohol option');
      }
      return 15;
    }

    // Close to range (within 5%)
    if (
      Math.abs(recipeABV - userABVRange.min) <= 5 ||
      Math.abs(recipeABV - userABVRange.max) <= 5
    ) {
      return 8;
    }

    // Outside range
    return 0;
  }

  /**
   * Tools matching (10 points max)
   */
  private static calculateToolsMatch(
    recipe: Recipe,
    userProfile: EnhancedUserProfile,
    reasons: string[]
  ): number {
    // If user has no tools or hasn't specified
    if (
      userProfile.availableTools.length === 0 ||
      userProfile.availableTools.includes('none')
    ) {
      // Favor recipes that need no tools
      if (recipe.tools.length === 0 || recipe.tools.includes('none')) {
        reasons.push('No special tools needed');
        return 10;
      }
      return 2; // Low score but not zero
    }

    // Check if user has all required tools
    const missingTools = recipe.tools.filter(
      (tool) => !userProfile.availableTools.includes(tool) && tool !== 'none'
    );

    if (missingTools.length === 0) {
      reasons.push('You have all the tools needed');
      return 10;
    }

    if (missingTools.length === 1) {
      return 5; // Only missing one tool
    }

    return 2; // Missing multiple tools
  }

  /**
   * Occasion/Context matching (5 points max)
   */
  private static calculateOccasionMatch(
    recipe: Recipe,
    userProfile: EnhancedUserProfile,
    reasons: string[]
  ): number {
    // This could be enhanced with time-of-day, season, etc.
    // For now, just give neutral score
    return 3;
  }

  /**
   * Completion behavior matching (10 points max)
   * Learns from "how user actually made drinks" logs.
   */
  private static calculateCompletionMatch(
    recipe: Recipe,
    userProfile: EnhancedUserProfile,
    reasons: string[]
  ): number {
    const completed = userProfile.interactionHistory?.completedRecipes || [];
    if (completed.length === 0) return 0;

    const recent = completed
      .filter((entry) => this.isRecent(entry.timestamp, 90))
      .slice(-30);
    if (recent.length === 0) return 0;

    let score = 0;

    const sameRecipeCompletions = recent.filter((entry) => entry.recipeId === recipe.id);
    if (sameRecipeCompletions.length > 0) {
      score += Math.min(4, sameRecipeCompletions.length * 2);
      reasons.push('You have made this recipe before');
    }

    const ratingMatches = recent.filter((entry) => {
      const rating = entry.rating || 0;
      return rating >= 4 && this.completionLooksLikeSpirit(recipe.baseSpirit, entry);
    });
    if (ratingMatches.length > 0) {
      score += 3;
      reasons.push('Based on your high ratings for similar builds');
    }

    const detailSignals = recent.filter((entry) => {
      const details = entry.completionDetails;
      if (!details) return false;
      if (details.substitutions || details.techniqueVariations || details.personalModifications) {
        return true;
      }
      return (details.ingredientBrands || []).some((brand) => {
        const haystack = `${brand.ingredient} ${brand.brandUsed}`.toLowerCase();
        return this.recipeIngredientKeywords(recipe).some((keyword) => haystack.includes(keyword));
      });
    });
    if (detailSignals.length > 0) {
      score += 3;
      reasons.push('Adapted to your preferred brands and modifications');
    }

    return Math.min(10, score);
  }

  private static isRecent(value: Date, windowDays: number): boolean {
    const date = value instanceof Date ? value : new Date(value as any);
    if (Number.isNaN(date.getTime())) return false;
    const ageMs = Date.now() - date.getTime();
    return ageMs <= windowDays * 24 * 60 * 60 * 1000;
  }

  private static completionLooksLikeSpirit(baseSpirit: Recipe['baseSpirit'], entry: RecipeInteraction): boolean {
    if (!baseSpirit) return false;
    const details = entry.completionDetails;
    if (!details) return false;

    const spiritKeywords: Record<string, string[]> = {
      whiskey: ['whiskey', 'whisky', 'bourbon', 'rye', 'scotch'],
      gin: ['gin'],
      vodka: ['vodka'],
      rum: ['rum', 'rhum', 'cachaca'],
      tequila: ['tequila', 'mezcal'],
      brandy: ['brandy', 'cognac', 'armagnac'],
      liqueurs: ['liqueur', 'amaro', 'aperitif'],
      'gin-alternative': ['gin alternative', 'zero proof gin'],
      'rum-alternative': ['rum alternative', 'zero proof rum'],
      none: ['non-alcoholic', 'zero proof', '0.0'],
    };

    const keywords = spiritKeywords[baseSpirit] || [];
    if (keywords.length === 0) return false;

    return (details.ingredientBrands || []).some((brand) => {
      const haystack = `${brand.ingredient} ${brand.brandUsed}`.toLowerCase();
      return keywords.some((keyword) => haystack.includes(keyword));
    });
  }

  private static recipeIngredientKeywords(recipe: Recipe): string[] {
    const names = (recipe.ingredients || []).map((ingredient) => ingredient.name?.toLowerCase?.() || '');
    return names
      .flatMap((name) => name.split(/\s+/))
      .filter((token) => token.length >= 3);
  }

  /**
   * Filter recipes by user's disliked recipes and preferences
   */
  static filterRecipes(
    recipes: Recipe[],
    userProfile: EnhancedUserProfile,
    filters?: RecipeFilters
  ): Recipe[] {
    return recipes.filter((recipe) => {
      // Exclude disliked recipes
      if (userProfile.dislikedRecipes.includes(recipe.id)) {
        return false;
      }

      // Apply custom filters if provided
      if (filters) {
        // Spirit filter
        if (filters.spirits && filters.spirits.length > 0) {
          const hasMatchingSpirit = recipe.spiritsUsed.some((spirit) =>
            filters.spirits!.includes(spirit)
          );
          if (!hasMatchingSpirit) return false;
        }

        // Flavor profile filter
        if (filters.flavorProfiles && filters.flavorProfiles.length > 0) {
          const hasMatchingFlavor = recipe.flavorProfiles.some((flavor) =>
            filters.flavorProfiles!.includes(flavor)
          );
          if (!hasMatchingFlavor) return false;
        }

        // Difficulty filter
        if (filters.difficulty && filters.difficulty.length > 0) {
          if (!filters.difficulty.includes(recipe.difficulty)) return false;
        }

        // ABV range filter
        if (filters.abvRange) {
          if (
            recipe.abv < filters.abvRange.min ||
            recipe.abv > filters.abvRange.max
          ) {
            return false;
          }
        }

        // Preparation time filter
        if (filters.preparationTimeMax) {
          if (recipe.preparationTime > filters.preparationTimeMax) return false;
        }

        // Required tools filter
        if (filters.requiredTools && filters.requiredTools.length > 0) {
          const hasAllTools = recipe.tools.every(
            (tool) => filters.requiredTools!.includes(tool) || tool === 'none'
          );
          if (!hasAllTools) return false;
        }

        // KOOPE+ advanced filters
        if (filters.maxIngredients) {
          if (getIngredientCount(recipe) > filters.maxIngredients) return false;
        }

        if (filters.sugarLevel && filters.sugarLevel.length > 0) {
          const recipeSugar = recipe.sugarLevel || 'medium';
          if (!filters.sugarLevel.includes(recipeSugar as any)) return false;
        }

        if (filters.recipeType && filters.recipeType.length > 0) {
          if (!filters.recipeType.includes(recipe.recipeType as any)) return false;
        }
      }

      return true;
    });
  }

  /**
   * Get top N recommendations for user
   */
  static getTopRecommendations(
    recipes: Recipe[],
    userProfile: EnhancedUserProfile,
    limit: number = 10,
    filters?: RecipeFilters
  ): RecipeWithUserData[] {
    // Filter recipes first
    const filteredRecipes = this.filterRecipes(recipes, userProfile, filters);

    // Calculate scores for all filtered recipes
    const scoredRecipes = filteredRecipes.map((recipe) => {
      const scoreData = this.calculateScore(recipe, userProfile);

      // Compute Taste Match % if user has a taste profile
      let tasteMatchPercent: number | undefined;
      if (userProfile.tasteProfile) {
        tasteMatchPercent = calculateTasteMatchPercent(userProfile.tasteProfile, recipe);
      }

      return {
        ...recipe,
        isSaved: userProfile.savedRecipes.includes(recipe.id),
        isFavorite: userProfile.favoriteRecipes.includes(recipe.id),
        recommendationScore: scoreData.score,
        tasteMatchPercent,
        userRating: undefined,
        userFeedback: undefined,
      } as RecipeWithUserData;
    });

    // Sort by score descending
    scoredRecipes.sort((a, b) => {
      const scoreA = a.recommendationScore || 0;
      const scoreB = b.recommendationScore || 0;
      return scoreB - scoreA;
    });

    // Return top N
    return scoredRecipes.slice(0, limit);
  }

  /**
   * Get recommendations based on what's in user's bar (from photo recognition)
   */
  static getRecommendationsFromBarInventory(
    recipes: Recipe[],
    userProfile: EnhancedUserProfile,
    limit: number = 10
  ): RecipeWithUserData[] {
    if (!userProfile.barInventory || userProfile.barInventory.length === 0) {
      return this.getTopRecommendations(recipes, userProfile, limit);
    }

    // Extract spirits from bar inventory
    const availableSpirits = userProfile.barInventory.map((item) => item.type);

    // Filter recipes that can be made with available spirits
    const makableRecipes = recipes.filter((recipe) => {
      // Check if recipe's base spirit is available
      if (recipe.baseSpirit && availableSpirits.includes(recipe.baseSpirit)) {
        return true;
      }

      // Or if most of the spirits are available
      const matchingSpirits = recipe.spiritsUsed.filter((spirit) =>
        availableSpirits.includes(spirit)
      );

      return matchingSpirits.length >= recipe.spiritsUsed.length * 0.7; // 70% match
    });

    // Get top recommendations from makable recipes
    return this.getTopRecommendations(makableRecipes, userProfile, limit);
  }

  /**
   * Get "stretch" recommendations - recipes slightly above user's skill level
   */
  static getChallengingRecommendations(
    recipes: Recipe[],
    userProfile: EnhancedUserProfile,
    limit: number = 5
  ): RecipeWithUserData[] {
    const skillLevels = {
      beginner: 1,
      intermediate: 2,
      advanced: 3,
      expert: 4,
    };

    const userSkillLevel = skillLevels[userProfile.skillLevel];
    const targetDifficulties: string[] = [];

    // Get next level up
    for (const [difficulty, level] of Object.entries(skillLevels)) {
      if (level === userSkillLevel + 1) {
        targetDifficulties.push(difficulty);
      }
    }

    if (targetDifficulties.length === 0) {
      // Already at max level
      return this.getTopRecommendations(recipes, userProfile, limit);
    }

    // Filter to challenging recipes
    const challengingRecipes = recipes.filter((recipe) =>
      targetDifficulties.includes(recipe.difficulty)
    );

    return this.getTopRecommendations(challengingRecipes, userProfile, limit);
  }
}

/**
 * Get personalized recipe feed for user
 */
export async function getPersonalizedFeed(
  recipes: Recipe[],
  userProfile: EnhancedUserProfile
): Promise<{
  forYou: RecipeWithUserData[];
  trending: RecipeWithUserData[];
  challenging: RecipeWithUserData[];
  fromYourBar?: RecipeWithUserData[];
}> {
  // Main personalized recommendations
  const forYou = RecommendationEngine.getTopRecommendations(
    recipes,
    userProfile,
    20
  );

  // Trending (most popular/saved) - could be enhanced with real data
  const trending = recipes
    .filter((r) => !userProfile.dislikedRecipes.includes(r.id))
    .sort((a, b) => (b.saves || 0) - (a.saves || 0))
    .slice(0, 10)
    .map((recipe) => ({
      ...recipe,
      isSaved: userProfile.savedRecipes.includes(recipe.id),
      isFavorite: userProfile.favoriteRecipes.includes(recipe.id),
    })) as RecipeWithUserData[];

  // Challenging recipes
  const challenging = RecommendationEngine.getChallengingRecommendations(
    recipes,
    userProfile,
    10
  );

  // From your bar (if inventory exists)
  let fromYourBar: RecipeWithUserData[] | undefined;
  if (userProfile.barInventory && userProfile.barInventory.length > 0) {
    fromYourBar = RecommendationEngine.getRecommendationsFromBarInventory(
      recipes,
      userProfile,
      10
    );
  }

  return {
    forYou,
    trending,
    challenging,
    fromYourBar,
  };
}
