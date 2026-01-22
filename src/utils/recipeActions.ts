import { Alert } from 'react-native';
import { getDetailedCocktail } from './cocktailDataTransformer';
import { usePersonalization } from '../store/usePersonalization';
import { log } from '../lib/logger';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';

/**
 * Global Recipe Action Utilities
 * Centralized functions for recipe card interactions
 */

interface Recipe {
  id: string;
  name: string;
  title?: string;
  subtitle?: string;
  description?: string;
  image: string;
  ingredients?: any[];
}

/**
 * Recipe view source types for analytics tracking
 */
export type RecipeViewSource =
  | 'featured'
  | 'search'
  | 'home_bar'
  | 'vault'
  | 'saved'
  | 'category'
  | 'related'
  | 'onboarding'
  | 'deep_link'
  | 'notification'
  | 'unknown';

/**
 * Handle recipe view navigation and behavior tracking
 * @param recipe - The recipe being viewed
 * @param navigation - Navigation object
 * @param source - Where the user discovered this recipe (for analytics)
 */
export const handleRecipeView = (
  recipe: Recipe,
  navigation: any,
  source: RecipeViewSource = 'unknown'
) => {
  // Track recipe view with source for analytics
  trackEvent(ANALYTICS_EVENTS.RECIPE_VIEWED, {
    [ANALYTICS_PROPS.RECIPE_ID]: recipe.id,
    [ANALYTICS_PROPS.RECIPE_NAME]: recipe.name || recipe.title,
    [ANALYTICS_PROPS.SOURCE]: source,
  });

  // Pass both cocktailId and the full cocktail object
  // This allows local recipes (like mocktails) to be displayed without Supabase lookup
  navigation.navigate('CocktailDetail', {
    cocktailId: recipe.id,
    cocktail: recipe
  });

  // Record user behavior for AI learning
  try {
    const { recordInteraction } = usePersonalization.getState();
    recordInteraction('cocktail_viewed', recipe.id, { recipe, source });
  } catch (error) {
    log.warn('recipeActions', 'Failed to record recipe view behavior', { error, recipeId: recipe.id });
  }
};

/**
 * Handle adding recipe to shopping cart
 */
export const handleCreateShoppingList = (
  recipe: Recipe,
  setSelectedRecipe: (recipe: Recipe) => void,
  setGroceryListVisible: (visible: boolean) => void
) => {
  // Try to get transformed recipe data with detailed ingredients
  const transformedRecipe = getDetailedCocktail(recipe.id);

  // Use transformed recipe if available, otherwise use original
  const recipeToUse = transformedRecipe || recipe;

  setSelectedRecipe(recipeToUse);
  setGroceryListVisible(true);

  // Record user behavior for AI learning
  recommendationEngine.recordBehavior({
    type: 'searched',
    query: `shopping_list_${recipe.name || recipe.title}`,
  }).catch(error => {
    log.warn('recipeActions', 'Failed to record shopping list behavior', { error, recipeId: recipe.id });
  });
};

/**
 * Handle recipe save/bookmark with AI tracking and subscription gating
 */
export const handleSaveRecipe = (
  recipe: Recipe,
  toggleSavedCocktail: (cocktail: any) => 'success' | 'limit_reached' | 'removed',
  isCocktailSaved: (id: string) => boolean,
  navigation?: any,
  showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
) => {
  const cocktailData = {
    id: recipe.id,
    name: recipe.name || recipe.title || 'Untitled Recipe',
    subtitle: recipe.description || recipe.subtitle || '',
    image: recipe.image
  };

  const wasSaved = isCocktailSaved(recipe.id);
  const result = toggleSavedCocktail(cocktailData);

  // Handle limit reached - redirect to paywall
  if (result === 'limit_reached') {
    log.info('recipeActions', 'Free recipe limit reached - redirecting to paywall', { recipeId: recipe.id });
    if (showToast) {
      showToast('Upgrade to save more recipes', 'warning');
    }
    if (navigation) {
      navigation.navigate('Paywall');
    }
    return;
  }

  // Show toast notification
  if (showToast) {
    if (result === 'removed') {
      showToast(`${cocktailData.name} removed from saved`, 'info');
    } else {
      showToast(`${cocktailData.name} saved!`, 'success');
    }
  }

  // Record user behavior for AI learning (only when saving, not unsaving)
  if (!wasSaved && result === 'success') {
    recommendationEngine.recordBehavior({
      type: 'favorited',
      itemId: recipe.id,
    }).catch(error => {
      log.warn('recipeActions', 'Failed to record recipe save behavior', { error, recipeId: recipe.id });
    });

    // Also record for personalization profile with spirit and flavor context
    try {
      const { recordInteraction } = usePersonalization.getState();
      recordInteraction('cocktail_saved', recipe.id, {
        recipe,
        spirit: (recipe as any).base?.toLowerCase() || (recipe as any).spirit?.toLowerCase(),
        flavors: extractFlavors(recipe),
      });
    } catch (error) {
      log.warn('recipeActions', 'Failed to record personalization interaction', { error, recipeId: recipe.id });
    }
  }
};

/**
 * Extract flavor keywords from recipe description
 */
const extractFlavors = (recipe: Recipe): string[] => {
  const flavorKeywords = ['citrus', 'herbal', 'bitter', 'sweet', 'smoky', 'floral', 'spiced', 'fruity', 'sour', 'spicy'];
  const text = `${recipe.description || ''} ${recipe.subtitle || ''}`.toLowerCase();

  return flavorKeywords.filter(flavor => text.includes(flavor));
};

/**
 * Handle recipe deletion with confirmation
 */
export const handleDeleteRecipe = async (
  recipe: Recipe,
  deleteRecipe: (id: string) => Promise<void>,
  refreshCallback?: () => Promise<void>
) => {
  if (!recipe.id) return;

  Alert.alert(
    'Delete Recipe',
    `Are you sure you want to delete "${recipe.name || recipe.title}"?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRecipe(recipe.id);
            if (refreshCallback) {
              await refreshCallback();
            }
            Alert.alert('Success', 'Recipe deleted successfully');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete recipe');
          }
        },
      },
    ]
  );
};

/**
 * Create props for RecipeCard component with default handlers
 */
export const createRecipeCardProps = (
  recipe: Recipe,
  navigation: any,
  options: {
    toggleSavedCocktail?: (cocktail: any) => void;
    isCocktailSaved?: (id: string) => boolean;
    setSelectedRecipe?: (recipe: Recipe) => void;
    setGroceryListVisible?: (visible: boolean) => void;
    deleteRecipe?: (id: string) => Promise<void>;
    refreshCallback?: () => Promise<void>;
    showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    showSaveButton?: boolean;
    showCartButton?: boolean;
    showDeleteButton?: boolean;
    source?: RecipeViewSource;
  } = {}
) => {
  const {
    toggleSavedCocktail,
    isCocktailSaved,
    setSelectedRecipe,
    setGroceryListVisible,
    deleteRecipe,
    refreshCallback,
    showToast,
    showSaveButton = true,
    showCartButton = true,
    showDeleteButton = false,
    source = 'unknown',
  } = options;

  return {
    recipe,
    onPress: (recipe: Recipe) => handleRecipeView(recipe, navigation, source),
    onSave: toggleSavedCocktail && isCocktailSaved
      ? (recipe: Recipe) => handleSaveRecipe(recipe, toggleSavedCocktail, isCocktailSaved, navigation, showToast)
      : undefined,
    onAddToCart: setSelectedRecipe && setGroceryListVisible
      ? (recipe: Recipe) => handleCreateShoppingList(recipe, setSelectedRecipe, setGroceryListVisible)
      : undefined,
    onDelete: deleteRecipe
      ? (recipe: Recipe) => handleDeleteRecipe(recipe, deleteRecipe, refreshCallback)
      : undefined,
    isSaved: isCocktailSaved ? isCocktailSaved(recipe.id) : false,
    showSaveButton,
    showCartButton,
    showDeleteButton,
  };
};