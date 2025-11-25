import { Alert } from 'react-native';
import { getDetailedCocktail } from './cocktailDataTransformer';
import { usePersonalization } from '../store/usePersonalization';

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
 * Handle recipe view navigation and behavior tracking
 */
export const handleRecipeView = (
  recipe: Recipe,
  navigation: any
) => {
  navigation.navigate('CocktailDetail', { cocktailId: recipe.id });

  // Record user behavior for AI learning
  try {
    const { recordInteraction } = usePersonalization.getState();
    recordInteraction('cocktail_viewed', recipe.id, { recipe });
  } catch (error) {
    console.warn('Failed to record recipe view behavior:', error);
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
    console.warn('Failed to record shopping list behavior:', error);
  });
};

/**
 * Handle recipe save/bookmark with AI tracking
 */
export const handleSaveRecipe = (
  recipe: Recipe,
  toggleSavedCocktail: (cocktail: any) => void,
  isCocktailSaved: (id: string) => boolean,
  showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
) => {
  const cocktailData = {
    id: recipe.id,
    name: recipe.name || recipe.title || 'Untitled Recipe',
    subtitle: recipe.description || recipe.subtitle || '',
    image: recipe.image
  };

  const wasSaved = isCocktailSaved(recipe.id);
  toggleSavedCocktail(cocktailData);

  // Show toast notification
  if (showToast) {
    if (wasSaved) {
      showToast(`${cocktailData.name} removed from saved`, 'info');
    } else {
      showToast(`${cocktailData.name} saved!`, 'success');
    }
  }

  // Record user behavior for AI learning (only when saving, not unsaving)
  if (!wasSaved) {
    recommendationEngine.recordBehavior({
      type: 'favorited',
      itemId: recipe.id,
    }).catch(error => {
      console.warn('Failed to record recipe save behavior:', error);
    });
  }
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
  } = options;

  return {
    recipe,
    onPress: (recipe: Recipe) => handleRecipeView(recipe, navigation),
    onSave: toggleSavedCocktail && isCocktailSaved
      ? (recipe: Recipe) => handleSaveRecipe(recipe, toggleSavedCocktail, isCocktailSaved, showToast)
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