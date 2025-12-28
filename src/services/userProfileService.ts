/**
 * User Profile Service
 * Handles user profile operations using Supabase
 * MIGRATED FROM FIREBASE
 */

import { log } from '../lib/logger';
import { EnhancedUserProfile, createDefaultUserProfile, surveyAnswersToProfile, BarInventoryItem } from '../types/userProfile';
import * as userRepo from '../repos/supabase/userRepo';

/**
 * Create or update user profile in Supabase
 */
export async function saveUserProfile(profile: EnhancedUserProfile): Promise<void> {
  try {
    await userRepo.saveUserProfile(profile);
    log.info('UserProfileService', 'User profile saved successfully', { userId: profile.id });
  } catch (error) {
    log.error('UserProfileService', 'Failed to save user profile', error);
    throw new Error('Failed to save user profile');
  }
}

/**
 * Load user profile from Supabase
 */
export async function loadUserProfile(userId: string): Promise<EnhancedUserProfile | null> {
  try {
    const profile = await userRepo.getUserProfile(userId);

    if (!profile) {
      return null;
    }

    // CRITICAL: Ensure tasteProfile is always initialized to prevent runtime errors
    if (!profile.tasteProfile) {
      log.info('UserProfileService', 'Initializing missing tasteProfile with defaults', { userId });
      profile.tasteProfile = {
        flavorWeights: {
          citrus: 0,
          herbal: 0,
          bitter: 0,
          sweet: 0,
          smoky: 0,
          floral: 0,
          spiced: 0,
        },
        spiritWeights: {
          tequila: 0,
          whiskey: 0,
          rum: 0,
          gin: 0,
          vodka: 0,
          brandy: 0,
          liqueurs: 0,
          'gin-alternative': 0,
          'rum-alternative': 0,
          none: 0,
        },
        preferredABV: profile.preferredABVRange || { min: 0, max: 40 },
        preferredComplexity: 0.5,
      };
    }

    // Ensure nested objects exist within tasteProfile
    if (profile.tasteProfile) {
      if (!profile.tasteProfile.spiritWeights) {
        profile.tasteProfile.spiritWeights = {
          tequila: 0,
          whiskey: 0,
          rum: 0,
          gin: 0,
          vodka: 0,
          brandy: 0,
          liqueurs: 0,
          'gin-alternative': 0,
          'rum-alternative': 0,
          none: 0,
        };
      }
      if (!profile.tasteProfile.flavorWeights) {
        profile.tasteProfile.flavorWeights = {
          citrus: 0,
          herbal: 0,
          bitter: 0,
          sweet: 0,
          smoky: 0,
          floral: 0,
          spiced: 0,
        };
      }
      if (!profile.tasteProfile.preferredABV) {
        profile.tasteProfile.preferredABV = profile.preferredABVRange || { min: 0, max: 40 };
      }
      if (profile.tasteProfile.preferredComplexity === undefined) {
        profile.tasteProfile.preferredComplexity = 0.5;
      }
    }

    return profile;
  } catch (error: any) {
    log.error('UserProfileService', 'Failed to load user profile', error, { userId });
    throw new Error('Failed to load user profile');
  }
}

/**
 * Update specific fields in user profile
 */
export async function updateUserProfileFields(
  userId: string,
  updates: Partial<EnhancedUserProfile>
): Promise<void> {
  try {
    await userRepo.updateUserProfileFields(userId, updates);
    log.info('UserProfileService', 'User profile updated successfully', { userId });
  } catch (error) {
    log.error('UserProfileService', 'Failed to update user profile', error, { userId });
    throw new Error('Failed to update user profile');
  }
}

/**
 * Initialize user profile from survey answers
 */
export async function initializeUserProfileFromSurvey(
  userId: string,
  surveyAnswers: { [questionId: string]: string | string[] },
  email?: string
): Promise<EnhancedUserProfile> {
  try {
    // Convert survey answers to profile
    const profileData = surveyAnswersToProfile(userId, surveyAnswers, email);

    // Create full profile
    const profile: EnhancedUserProfile = {
      ...createDefaultUserProfile(userId, email),
      ...profileData,
    };

    // Save to Supabase
    await saveUserProfile(profile);

    return profile;
  } catch (error) {
    log.error('UserProfileService', 'Failed to initialize user profile from survey', error, { userId });
    throw new Error('Failed to initialize user profile');
  }
}

/**
 * Add recipe to user's saved recipes
 */
export async function saveRecipeToProfile(userId: string, recipeId: string): Promise<void> {
  try {
    const profile = await loadUserProfile(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    // Ensure savedRecipes array exists
    if (!profile.savedRecipes) {
      profile.savedRecipes = [];
    }

    if (!profile.savedRecipes.includes(recipeId)) {
      // Update interaction history
      if (!profile.interactionHistory) {
        profile.interactionHistory = {
          viewedRecipes: [],
          savedRecipes: [],
          completedRecipes: [],
          searchQueries: [],
          lastUpdated: new Date(),
        };
      }

      profile.interactionHistory.savedRecipes.push({
        recipeId,
        timestamp: new Date(),
      });

      profile.interactionHistory.lastUpdated = new Date();

      // Use the repository method to add saved recipe
      await userRepo.addSavedRecipe(userId, recipeId);

      // Update interaction history separately
      await userRepo.updateUserProfileFields(userId, {
        interactionHistory: profile.interactionHistory,
      });
    }
  } catch (error) {
    log.error('UserProfileService', 'Failed to save recipe to profile', error, { userId, recipeId });
    throw new Error('Failed to save recipe');
  }
}

/**
 * Remove recipe from user's saved recipes
 */
export async function unsaveRecipeFromProfile(userId: string, recipeId: string): Promise<void> {
  try {
    await userRepo.removeSavedRecipe(userId, recipeId);
  } catch (error) {
    log.error('UserProfileService', 'Failed to remove recipe from profile', error, { userId, recipeId });
    throw new Error('Failed to remove recipe');
  }
}

/**
 * Add item to user's bar inventory (for photo recognition feature)
 */
export async function addToBarInventory(
  userId: string,
  item: Omit<BarInventoryItem, 'id'>
): Promise<void> {
  try {
    const profile = await loadUserProfile(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    if (!profile.barInventory) {
      profile.barInventory = [];
    }

    const newItem: BarInventoryItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    profile.barInventory.push(newItem);
    await saveUserProfile(profile);
  } catch (error) {
    log.error('UserProfileService', 'Failed to add to bar inventory', error, { userId });
    throw new Error('Failed to add to bar inventory');
  }
}

/**
 * Update user's taste profile based on interactions
 */
export async function updateTasteProfile(
  userId: string,
  recipeId: string,
  feedback: 'loved' | 'liked' | 'disliked' | 'skipped'
): Promise<void> {
  try {
    const profile = await loadUserProfile(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    // Initialize interaction history if needed
    if (!profile.interactionHistory) {
      profile.interactionHistory = {
        viewedRecipes: [],
        savedRecipes: [],
        completedRecipes: [],
        searchQueries: [],
        lastUpdated: new Date(),
      };
    }

    // Add or update interaction
    const existingIndex = profile.interactionHistory.viewedRecipes.findIndex(
      i => i.recipeId === recipeId
    );

    const interaction = {
      recipeId,
      timestamp: new Date(),
      feedback,
    };

    if (existingIndex >= 0) {
      profile.interactionHistory.viewedRecipes[existingIndex] = interaction;
    } else {
      profile.interactionHistory.viewedRecipes.push(interaction);
    }

    profile.interactionHistory.lastUpdated = new Date();

    // Ensure dislikedRecipes array exists
    if (!profile.dislikedRecipes) {
      profile.dislikedRecipes = [];
    }

    // Add to disliked recipes if feedback is negative
    if (feedback === 'disliked' && !profile.dislikedRecipes.includes(recipeId)) {
      profile.dislikedRecipes.push(recipeId);
    } else if (feedback !== 'disliked') {
      // Remove from disliked if feedback changes
      profile.dislikedRecipes = profile.dislikedRecipes.filter(id => id !== recipeId);
    }

    await saveUserProfile(profile);
  } catch (error) {
    log.error('UserProfileService', 'Failed to update taste profile', error, { userId, recipeId, feedback });
    throw new Error('Failed to update taste profile');
  }
}

/**
 * Track user activity (updates lastActiveAt)
 */
export async function trackUserActivity(userId: string): Promise<void> {
  try {
    await userRepo.updateLastActive(userId);
  } catch (error) {
    log.warn('UserProfileService', 'Failed to track user activity (non-critical)', error, { userId });
    // Don't throw - this is non-critical
  }
}
