/**
 * User Profile Service
 * Handles Firebase operations for user profiles
 */

import { getFirestore, doc, setDoc, getDoc, updateDoc, Timestamp } from '@firebase/firestore';
import { EnhancedUserProfile, createDefaultUserProfile, surveyAnswersToProfile } from '../types/userProfile';

const db = getFirestore();
const USERS_COLLECTION = 'users';

/**
 * Create or update user profile in Firebase
 */
export async function saveUserProfile(profile: EnhancedUserProfile): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, profile.id);

    // Convert dates to Firestore Timestamps
    const firestoreProfile = {
      ...profile,
      createdAt: Timestamp.fromDate(profile.createdAt),
      lastActiveAt: Timestamp.fromDate(profile.lastActiveAt),
      barInventory: profile.barInventory?.map(item => ({
        ...item,
        addedAt: Timestamp.fromDate(item.addedAt),
      })),
      tasteProfile: profile.tasteProfile,
      interactionHistory: profile.interactionHistory ? {
        ...profile.interactionHistory,
        lastUpdated: Timestamp.fromDate(profile.interactionHistory.lastUpdated),
        viewedRecipes: profile.interactionHistory.viewedRecipes.map(interaction => ({
          ...interaction,
          timestamp: Timestamp.fromDate(interaction.timestamp),
        })),
        savedRecipes: profile.interactionHistory.savedRecipes.map(interaction => ({
          ...interaction,
          timestamp: Timestamp.fromDate(interaction.timestamp),
        })),
        completedRecipes: profile.interactionHistory.completedRecipes.map(interaction => ({
          ...interaction,
          timestamp: Timestamp.fromDate(interaction.timestamp),
        })),
      } : undefined,
    };

    await setDoc(userRef, firestoreProfile, { merge: true });
    console.log('User profile saved successfully');
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw new Error('Failed to save user profile');
  }
}

/**
 * Load user profile from Firebase
 */
export async function loadUserProfile(userId: string): Promise<EnhancedUserProfile | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const data = userSnap.data();

    // Convert Firestore Timestamps back to Dates
    const profile: EnhancedUserProfile = {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      lastActiveAt: data.lastActiveAt?.toDate() || new Date(),
      barInventory: data.barInventory?.map((item: any) => ({
        ...item,
        addedAt: item.addedAt?.toDate() || new Date(),
      })),
      interactionHistory: data.interactionHistory ? {
        ...data.interactionHistory,
        lastUpdated: data.interactionHistory.lastUpdated?.toDate() || new Date(),
        viewedRecipes: data.interactionHistory.viewedRecipes?.map((interaction: any) => ({
          ...interaction,
          timestamp: interaction.timestamp?.toDate() || new Date(),
        })) || [],
        savedRecipes: data.interactionHistory.savedRecipes?.map((interaction: any) => ({
          ...interaction,
          timestamp: interaction.timestamp?.toDate() || new Date(),
        })) || [],
        completedRecipes: data.interactionHistory.completedRecipes?.map((interaction: any) => ({
          ...interaction,
          timestamp: interaction.timestamp?.toDate() || new Date(),
        })) || [],
      } : undefined,
    } as EnhancedUserProfile;

    // CRITICAL: Ensure tasteProfile is always initialized to prevent runtime errors
    if (!profile.tasteProfile) {
      console.log('[UserProfile] Initializing missing tasteProfile with defaults');
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
  } catch (error) {
    console.error('Error loading user profile:', error);
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
    const userRef = doc(db, USERS_COLLECTION, userId);

    // Convert any Date fields to Timestamps
    const firestoreUpdates: any = { ...updates };
    if (updates.lastActiveAt) {
      firestoreUpdates.lastActiveAt = Timestamp.fromDate(updates.lastActiveAt);
    }

    await updateDoc(userRef, firestoreUpdates);
    console.log('User profile updated successfully');
  } catch (error) {
    console.error('Error updating user profile:', error);
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

    // Save to Firebase
    await saveUserProfile(profile);

    return profile;
  } catch (error) {
    console.error('Error initializing user profile from survey:', error);
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

    if (!profile.savedRecipes.includes(recipeId)) {
      profile.savedRecipes.push(recipeId);

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

      await saveUserProfile(profile);
    }
  } catch (error) {
    console.error('Error saving recipe to profile:', error);
    throw new Error('Failed to save recipe');
  }
}

/**
 * Remove recipe from user's saved recipes
 */
export async function unsaveRecipeFromProfile(userId: string, recipeId: string): Promise<void> {
  try {
    const profile = await loadUserProfile(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    profile.savedRecipes = profile.savedRecipes.filter(id => id !== recipeId);
    await saveUserProfile(profile);
  } catch (error) {
    console.error('Error removing recipe from profile:', error);
    throw new Error('Failed to remove recipe');
  }
}

/**
 * Add item to user's bar inventory (for photo recognition feature)
 */
export async function addToBarInventory(
  userId: string,
  item: Omit<import('../types/userProfile').BarInventoryItem, 'id'>
): Promise<void> {
  try {
    const profile = await loadUserProfile(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    if (!profile.barInventory) {
      profile.barInventory = [];
    }

    const newItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    profile.barInventory.push(newItem);
    await saveUserProfile(profile);
  } catch (error) {
    console.error('Error adding to bar inventory:', error);
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

    // Add to disliked recipes if feedback is negative
    if (feedback === 'disliked' && !profile.dislikedRecipes.includes(recipeId)) {
      profile.dislikedRecipes.push(recipeId);
    } else if (feedback !== 'disliked') {
      // Remove from disliked if feedback changes
      profile.dislikedRecipes = profile.dislikedRecipes.filter(id => id !== recipeId);
    }

    await saveUserProfile(profile);
  } catch (error) {
    console.error('Error updating taste profile:', error);
    throw new Error('Failed to update taste profile');
  }
}

/**
 * Track user activity (updates lastActiveAt)
 */
export async function trackUserActivity(userId: string): Promise<void> {
  try {
    await updateUserProfileFields(userId, {
      lastActiveAt: new Date(),
    });
  } catch (error) {
    console.error('Error tracking user activity:', error);
    // Don't throw - this is non-critical
  }
}
