/**
 * "Made It" completion flow for CocktailDetailScreen — the modal where a
 * user logs that they made a drink (with brand/substitution/technique
 * notes) and the follow-up rating prompt. Extracted verbatim from
 * CocktailDetailScreen.tsx (Phase 5, god-file breakup): this is a
 * self-contained concern with a clear boundary (state + the four functions
 * that touch it), separate from the recipe-resolution logic above it and
 * the render tree below it.
 */
import { useState } from 'react';
import { Alert } from 'react-native';
import {
  logRecipeCompletion,
  updateCompletionRating,
  syncCompletionToSupabase,
} from '../services/recipeCompletionService';
import { logMadeIt } from '../services/makeLogService';
import { loadUserProfile, updateUserProfileFields } from '../services/userProfileService';
import type { RecipeCompletionDetails } from '../types/userProfile';
import { log } from '../lib/logger';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';

interface MadeItFlowIngredient {
  key: string;
  name: string;
  amount: string;
}

interface UseMadeItFlowParams {
  cocktail: any;
  userId: string | undefined;
  isPro: boolean;
  isPrestige: boolean;
  showToast: (message: string, kind: 'success' | 'error') => void;
  earnCocktailLoggedXP: (isDetailed: boolean, title: string) => void;
  earnRecipeRatingXP: (title: string) => void;
  makeFlowIngredients: MadeItFlowIngredient[];
}

export function useMadeItFlow({
  cocktail,
  userId,
  isPro,
  isPrestige,
  showToast,
  earnCocktailLoggedXP,
  earnRecipeRatingXP,
  makeFlowIngredients,
}: UseMadeItFlowParams) {
  const [hasMadeIt, setHasMadeIt] = useState(false);
  // Phase 0.8 scaffold: "made Nx" card data (full card treatment is Phase 3).
  const [timesMade, setTimesMade] = useState(0);
  const [makeFlowVisible, setMakeFlowVisible] = useState(false);
  const [ratingFlowVisible, setRatingFlowVisible] = useState(false);
  const [brandSelections, setBrandSelections] = useState<Record<string, string>>({});
  const [substitutions, setSubstitutions] = useState('');
  const [techniqueVariations, setTechniqueVariations] = useState('');
  const [personalModifications, setPersonalModifications] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [selectedRating, setSelectedRating] = useState(0);
  const [lastCompletionId, setLastCompletionId] = useState<string | null>(null);
  const [isSavingCompletion, setIsSavingCompletion] = useState(false);

  const syncRecipeCompletionToProfile = async (
    rating?: number,
    isRatingUpdate: boolean = false,
    completionDetails?: RecipeCompletionDetails,
    completionId?: string,
  ) => {
    try {
      if (!userId || !cocktail?.id) return;

      const profile = await loadUserProfile(userId);
      if (!profile) return;

      const interactionHistory = profile.interactionHistory || {
        viewedRecipes: [],
        savedRecipes: [],
        completedRecipes: [],
        searchQueries: [],
        lastUpdated: new Date(),
      };

      if (isRatingUpdate) {
        const latestIdx = [...interactionHistory.completedRecipes]
          .reverse()
          .findIndex((entry) => entry.recipeId === cocktail.id);

        if (latestIdx >= 0) {
          const actualIdx = interactionHistory.completedRecipes.length - 1 - latestIdx;
          interactionHistory.completedRecipes[actualIdx] = {
            ...interactionHistory.completedRecipes[actualIdx],
            rating: rating || undefined,
            feedback: rating
              ? rating >= 4
                ? 'loved'
                : rating >= 3
                  ? 'liked'
                  : 'disliked'
              : undefined,
            completionId:
              completionId || interactionHistory.completedRecipes[actualIdx].completionId,
            completionDetails:
              completionDetails || interactionHistory.completedRecipes[actualIdx].completionDetails,
            timestamp: new Date(),
          };
        }
      } else {
        interactionHistory.completedRecipes.push({
          recipeId: cocktail.id,
          timestamp: new Date(),
          rating: rating || undefined,
          feedback: rating
            ? rating >= 4
              ? 'loved'
              : rating >= 3
                ? 'liked'
                : 'disliked'
            : undefined,
          completionId: completionId || undefined,
          completionDetails: completionDetails || undefined,
        });
      }

      interactionHistory.lastUpdated = new Date();
      await updateUserProfileFields(userId, { interactionHistory });
    } catch (error) {
      log.warn(
        'CocktailDetailScreen',
        'Failed to sync completion to profile (non-blocking)',
        error,
      );
    }
  };

  const openMadeItFlow = () => {
    if (!cocktail || hasMadeIt) return;
    setBrandSelections({});
    setSubstitutions('');
    setTechniqueVariations('');
    setPersonalModifications('');
    setCompletionNotes('');
    setSelectedRating(0);
    setMakeFlowVisible(true);
  };

  const handleLogCompletion = async () => {
    if (!cocktail) return;

    try {
      setIsSavingCompletion(true);
      const ingredientBrands = makeFlowIngredients.map((ingredient) => ({
        ingredient: ingredient.name,
        amount: ingredient.amount || undefined,
        brandUsed: (brandSelections[ingredient.key] || '').trim() || 'Not specified',
      }));

      const completion = await logRecipeCompletion({
        userId,
        recipeId: cocktail.id,
        recipeName: cocktail.title,
        userTier: isPro || isPrestige ? 'pro' : 'free',
        ingredientBrands,
        substitutions: substitutions.trim() || undefined,
        techniqueVariations: techniqueVariations.trim() || undefined,
        personalModifications: personalModifications.trim() || undefined,
      });

      // Sync brand data to Supabase for all tiers (feeds the brand partnership pipeline)
      syncCompletionToSupabase(completion);
      const completionDetails: RecipeCompletionDetails = {
        ingredientBrands,
        substitutions: substitutions.trim() || undefined,
        techniqueVariations: techniqueVariations.trim() || undefined,
        personalModifications: personalModifications.trim() || undefined,
      };

      setLastCompletionId(completion.id);
      setHasMadeIt(true);
      setMakeFlowVisible(false);

      const isDetailed =
        ingredientBrands.some((item) => item.brandUsed !== 'Not specified') ||
        Boolean(substitutions.trim()) ||
        Boolean(techniqueVariations.trim()) ||
        Boolean(personalModifications.trim());

      trackEvent(ANALYTICS_EVENTS.RECIPE_MADE, {
        [ANALYTICS_PROPS.RECIPE_ID]: cocktail.id,
        [ANALYTICS_PROPS.RECIPE_NAME]: cocktail.title,
        [ANALYTICS_PROPS.RECIPE_CATEGORY]: cocktail.subtitle,
      });

      // North Star sensor (Phase 0.8) — one durable, queryable "made it"
      // event. Additive to the analytics event above and the brand
      // completion log below, not a replacement for either.
      if (userId) {
        logMadeIt({
          userId,
          recipeId: cocktail.id,
          recipeName: cocktail.title,
          source: 'recipe_detail',
          substitutionsUsed: substitutions.trim() ? { notes: substitutions.trim() } : null,
        })
          .then((result) => setTimesMade(result.timesMade))
          .catch((error) =>
            log.warn('CocktailDetailScreen', 'logMadeIt failed (non-blocking)', { error }),
          );
      }

      earnCocktailLoggedXP(isDetailed, cocktail.title);
      await syncRecipeCompletionToProfile(undefined, false, completionDetails, completion.id);

      showToast(`Great job making ${cocktail.title}! +${isDetailed ? 75 : 50} XP`, 'success');
      Alert.alert('Logged', `${cocktail.title} added to your made drinks.`, [
        { text: 'Done', style: 'cancel' },
        { text: 'How was it?', onPress: () => setRatingFlowVisible(true) },
      ]);
    } catch (error) {
      log.error('CocktailDetailScreen', 'Failed to log completion', error);
      Alert.alert('Error', 'Could not log this drink. Please try again.');
    } finally {
      setIsSavingCompletion(false);
    }
  };

  const handleSaveRating = async () => {
    if (!lastCompletionId || selectedRating <= 0 || !cocktail) {
      setRatingFlowVisible(false);
      return;
    }

    try {
      await updateCompletionRating(
        lastCompletionId,
        selectedRating,
        completionNotes.trim() || undefined,
      );
      await syncRecipeCompletionToProfile(
        selectedRating,
        true,
        completionNotes.trim()
          ? {
              notes: completionNotes.trim(),
            }
          : undefined,
        lastCompletionId,
      );
      earnRecipeRatingXP(cocktail.title);
      setRatingFlowVisible(false);
      showToast('Feedback saved. Thanks!', 'success');
    } catch (error) {
      log.error('CocktailDetailScreen', 'Failed to save completion rating', error);
      Alert.alert('Error', 'Could not save rating. Please try again.');
    }
  };

  return {
    hasMadeIt,
    timesMade,
    setTimesMade,
    makeFlowVisible,
    setMakeFlowVisible,
    ratingFlowVisible,
    setRatingFlowVisible,
    brandSelections,
    setBrandSelections,
    substitutions,
    setSubstitutions,
    techniqueVariations,
    setTechniqueVariations,
    personalModifications,
    setPersonalModifications,
    completionNotes,
    setCompletionNotes,
    selectedRating,
    setSelectedRating,
    lastCompletionId,
    isSavingCompletion,
    openMadeItFlow,
    handleLogCompletion,
    handleSaveRating,
  };
}
