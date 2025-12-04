/**
 * AI Prompt Service
 * Handles daily limits, rewards, and learning from AI prompts
 */

import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from '@firebase/firestore';
import { loadUserProfile, saveUserProfile } from './userProfileService';
import OpenAI from 'openai';

const db = getFirestore();
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
});

// Daily limits
const FREE_DAILY_LIMIT = 1;
const PREMIUM_UNLIMITED = 999;

export interface AIPromptUsage {
  userId: string;
  date: string; // YYYY-MM-DD
  promptsUsed: number;
  isPremium: boolean;
  lastPromptAt: Date;
}

export interface AICocktailSuggestion {
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  baseSpirit?: string;
  flavorProfiles: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedABV: number;
}

/**
 * Get user's remaining prompts for today
 */
export async function getRemainingPrompts(userId: string, isPremium: boolean): Promise<number> {
  if (isPremium) {
    return PREMIUM_UNLIMITED;
  }

  try {
    const today = getTodayString();
    const usageRef = doc(db, 'aiPromptUsage', `${userId}_${today}`);
    const usageSnap = await getDoc(usageRef);

    if (!usageSnap.exists()) {
      return FREE_DAILY_LIMIT;
    }

    const usage = usageSnap.data() as AIPromptUsage;
    return Math.max(0, FREE_DAILY_LIMIT - usage.promptsUsed);
  } catch (error: any) {
    // Handle offline gracefully
    if (error?.message?.includes('offline') || error?.code === 'unavailable') {
      console.log('[AIPrompt] Offline - allowing free daily limit');
      return FREE_DAILY_LIMIT;
    }
    console.error('Error getting remaining prompts:', error);
    return FREE_DAILY_LIMIT;
  }
}

/**
 * Use a prompt (decrement daily limit)
 */
async function usePrompt(userId: string, isPremium: boolean): Promise<boolean> {
  const remaining = await getRemainingPrompts(userId, isPremium);

  if (remaining <= 0) {
    return false; // No prompts left
  }

  try {
    const today = getTodayString();
    const usageRef = doc(db, 'aiPromptUsage', `${userId}_${today}`);

    const usageSnap = await getDoc(usageRef);

    if (!usageSnap.exists()) {
      // Create new usage record
      await setDoc(usageRef, {
        userId,
        date: today,
        promptsUsed: 1,
        isPremium,
        lastPromptAt: new Date(),
      });
    } else {
      // Increment usage
      await updateDoc(usageRef, {
        promptsUsed: increment(1),
        lastPromptAt: new Date(),
      });
    }

    return true;
  } catch (error: any) {
    // Handle offline gracefully - allow usage but warn
    if (error?.message?.includes('offline') || error?.code === 'unavailable') {
      console.log('[AIPrompt] Offline - allowing prompt usage without tracking');
      return true; // Allow usage when offline
    }
    console.error('Error using prompt:', error);
    return false;
  }
}

/**
 * Generate cocktail suggestions from AI
 */
export async function generateCocktailSuggestions(
  userId: string,
  prompt: string,
  isPremium: boolean
): Promise<{
  success: boolean;
  suggestions?: AICocktailSuggestion[];
  error?: string;
  xpEarned?: number;
}> {
  try {
    // Check and use daily limit
    const canUse = await usePrompt(userId, isPremium);
    if (!canUse) {
      return {
        success: false,
        error: 'Daily limit reached. Upgrade to Premium for unlimited prompts!',
      };
    }

    // Load user profile for context
    const profile = await loadUserProfile(userId);

    // Build context-aware prompt
    const systemPrompt = `You are a professional mixologist AI. Generate 3 creative cocktail suggestions based on the user's request.

User preferences:
- Favorite spirit: ${profile?.favoriteSpirit || 'none specified'}
- Skill level: ${profile?.skillLevel || 'beginner'}
- Flavor preferences: ${profile?.flavorProfiles?.join(', ') || 'none specified'}
- Alcohol preference: ${profile?.alcoholPreference || 'alcoholic'}

Return ONLY a valid JSON array with 3 cocktails in this exact format:
[
  {
    "name": "Cocktail Name",
    "description": "Brief description",
    "ingredients": ["2 oz Spirit", "1 oz Mixer", "..."],
    "instructions": ["Step 1", "Step 2", "..."],
    "baseSpirit": "gin/vodka/rum/tequila/whiskey/etc",
    "flavorProfiles": ["citrus", "sweet", "herbal", etc],
    "difficulty": "beginner/intermediate/advanced",
    "estimatedABV": 25
  }
]`;

    const userPrompt = `User request: "${prompt}"

Generate 3 cocktail suggestions that match this request.`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    const suggestions = JSON.parse(responseText) as AICocktailSuggestion[];

    // Award XP
    const xpEarned = 50;
    await awardXPForPrompt(userId, xpEarned);

    // Learn from the prompt
    await learnFromPrompt(userId, prompt, suggestions);

    return {
      success: true,
      suggestions,
      xpEarned,
    };
  } catch (error: any) {
    console.error('Error generating cocktail suggestions:', error);

    // Handle specific errors
    if (error.message?.includes('quota') || error.message?.includes('429')) {
      return {
        success: false,
        error: 'API quota exceeded. Please try again later.',
      };
    }

    return {
      success: false,
      error: 'Failed to generate suggestions. Please try again.',
    };
  }
}

/**
 * Award XP for using AI prompt
 */
async function awardXPForPrompt(userId: string, xpAmount: number): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      xp: increment(xpAmount),
    });
    console.log(`✅ Awarded ${xpAmount} XP for AI prompt`);
  } catch (error: any) {
    // Handle offline gracefully
    if (error?.message?.includes('offline') || error?.code === 'unavailable') {
      console.log('[AIPrompt] Offline - XP award will sync when online');
      return;
    }
    console.error('Error awarding XP:', error);
  }
}

/**
 * Learn from AI prompt and update user's taste profile
 */
async function learnFromPrompt(
  userId: string,
  prompt: string,
  suggestions: AICocktailSuggestion[]
): Promise<void> {
  try {
    const profile = await loadUserProfile(userId);
    if (!profile) {
      console.log('No profile found for user, skipping learning');
      return;
    }

    // Initialize tasteProfile if it doesn't exist
    if (!profile.tasteProfile) {
      profile.tasteProfile = {
        flavorWeights: {
          citrus: 0, herbal: 0, bitter: 0, sweet: 0,
          smoky: 0, floral: 0, spiced: 0,
        },
        spiritWeights: {
          tequila: 0, whiskey: 0, rum: 0, gin: 0,
          vodka: 0, brandy: 0, liqueurs: 0,
          'gin-alternative': 0, 'rum-alternative': 0, none: 0,
        },
        preferredABV: { min: 10, max: 40 },
        preferredComplexity: 0.5,
      };
    }

    const promptLower = prompt.toLowerCase();

    // Extract spirits mentioned in prompt
    const spiritKeywords = {
      tequila: ['tequila', 'mezcal'],
      whiskey: ['whiskey', 'whisky', 'bourbon', 'rye', 'scotch'],
      rum: ['rum'],
      gin: ['gin'],
      vodka: ['vodka'],
      brandy: ['brandy', 'cognac'],
    };

    // Extract flavors mentioned in prompt
    const flavorKeywords = {
      citrus: ['citrus', 'lemon', 'lime', 'orange', 'grapefruit', 'refreshing'],
      sweet: ['sweet', 'fruity', 'dessert'],
      herbal: ['herbal', 'mint', 'basil', 'rosemary'],
      bitter: ['bitter', 'complex', 'sophisticated'],
      smoky: ['smoky', 'smoke', 'mezcal'],
      spiced: ['spicy', 'spice', 'ginger', 'cinnamon'],
      floral: ['floral', 'lavender', 'rose', 'elderflower'],
    };

    // Update spirit weights based on prompt
    for (const [spirit, keywords] of Object.entries(spiritKeywords)) {
      if (keywords.some(kw => promptLower.includes(kw))) {
        const key = spirit as keyof typeof profile.tasteProfile.spiritWeights;
        const current = profile.tasteProfile.spiritWeights[key] || 0;
        profile.tasteProfile.spiritWeights[key] = Math.min(1, current + 0.05);
      }
    }

    // Update flavor weights based on prompt
    for (const [flavor, keywords] of Object.entries(flavorKeywords)) {
      if (keywords.some(kw => promptLower.includes(kw))) {
        const key = flavor as keyof typeof profile.tasteProfile.flavorWeights;
        const current = profile.tasteProfile.flavorWeights[key] || 0;
        profile.tasteProfile.flavorWeights[key] = Math.min(1, current + 0.05);
      }
    }

    // Also learn from the AI's suggestions
    suggestions.forEach(suggestion => {
      if (suggestion.baseSpirit) {
        const key = suggestion.baseSpirit as keyof typeof profile.tasteProfile.spiritWeights;
        const current = profile.tasteProfile!.spiritWeights[key] || 0;
        profile.tasteProfile!.spiritWeights[key] = Math.min(1, current + 0.02);
      }

      suggestion.flavorProfiles.forEach(flavor => {
        const weights = profile.tasteProfile!.flavorWeights;
        if (flavor in weights) {
          const key = flavor as keyof typeof weights;
          const current = weights[key] || 0;
          weights[key] = Math.min(1, current + 0.02);
        }
      });
    });

    await saveUserProfile(profile);
    console.log('✅ Learned from AI prompt:', { prompt, suggestions: suggestions.length });
  } catch (error: any) {
    // Handle offline gracefully
    if (error?.message?.includes('offline') || error?.code === 'unavailable') {
      console.log('[AIPrompt] Offline - learning will sync when online');
      return;
    }
    console.error('Error learning from prompt:', error);
  }
}

/**
 * Award bonus life when user saves AI-suggested cocktail
 */
export async function awardLifeForSavingAISuggestion(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      lives: increment(1),
    });
    console.log('✅ Awarded +1 Life for saving AI suggestion');
  } catch (error: any) {
    // Handle offline gracefully
    if (error?.message?.includes('offline') || error?.code === 'unavailable') {
      console.log('[AIPrompt] Offline - life award will sync when online');
      return;
    }
    console.error('Error awarding life:', error);
  }
}

/**
 * Helper: Get today's date string (YYYY-MM-DD)
 */
function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}
