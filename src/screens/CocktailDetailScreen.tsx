// @ts-nocheck
import React, { useState, useLayoutEffect, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  Alert,
  Pressable,
  RefreshControl,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { FREE_RECIPE_LIMIT, useSavedItems } from '../hooks/useSavedItems';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { RecipesRepository } from '../repos/supabase';
import type { Recipe } from '../types/recipe';
import { ShoppingListStore } from '../services/shoppingListStore';
import { GroceryListService } from '../services/groceryListService';
import { getDetailedCocktail } from '../utils/cocktailDataTransformer';
import GroceryListModal from '../components/GroceryListModal';
import { getCocktailImage } from '../../assets/images/cocktails';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import CocktailDetailSkeleton from '../components/CocktailDetailSkeleton';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { log } from '../lib/logger';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';
import { useXPSystem } from '../store/useXPSystem';
import { useUserTier } from '../store/useUserTier';
import { InventoryService } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { hasIngredient, parseIngredients } from '../utils/recipeMatching';
import { getMissingWithSubstitutions, getSubstitutionMessage } from '../utils/spiritSubstitutions';
import type { UserInventoryItem } from '../types/database';
import { getTimesMade } from '../services/makeLogService';
import MadeItButton from '../components/MadeItButton';
import MethodSection from '../components/recipe/MethodSection';
import {
  resolveMethodRenderMode,
  buildCondensedSteps,
  buildMethodSpecLine,
} from '../utils/methodFading';
import { getCompletionPromptConfig } from '../lib/completions/brandCapture';
import { useScrollHaptic, withHaptic } from '../lib/haptics';
import { useUserRecipes } from '../store/useUserRecipes';
import { useMadeItFlow } from '../hooks/useMadeItFlow';
import { styles } from './CocktailDetailScreen.styles';
import SubstituteIngredientsModal, {
  type SubstituteRow,
} from '../components/SubstituteIngredientsModal';
import MakeItModal from '../components/MakeItModal';
import RatingModal from '../components/RatingModal';
import {
  DETAIL_FALLBACK_IMAGE,
  TASTING_NOTE_OVERRIDES,
  trimSentence,
  slugifyRecipeKey,
  normalizeDetailIngredient,
  isWeakTastingNote,
  buildHeroKicker,
  ensureSentenceEnding,
  normalizeMethodStep,
  deriveTastingNote,
  deriveBestFor,
  isLikelySpiritIngredient,
  enhanceTips,
} from '../utils/cocktailDetailCopy';
import { cocktailData, getNonAlcoholicRecipeData } from '../utils/cocktailDetailFallbackData';

type CocktailDetailScreenRouteProp = {
  params: {
    cocktailId: string;
    cocktail?: any; // Optional: Pass full cocktail object for local recipes
  };
};

const referenceDisplayFont = Platform.select({
  ios: 'Georgia-Bold',
  android: 'serif',
  default: 'serif',
});
const referenceSerifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

export default function CocktailDetailScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<CocktailDetailScreenRouteProp>();
  const { toggleSavedCocktail, isCocktailSaved, savedCocktailCount, canSaveMoreCocktails } =
    useSavedItems();
  const { toast, showToast, hideToast } = useToast();
  const { isPro, isPrestige } = useSubscription();
  const completionConfig = getCompletionPromptConfig(isPro || isPrestige ? 'pro' : 'free');
  const { gateWithTrigger: saveGate } = useFeatureAccess('saved_cocktails_unlimited');
  const tier = useUserTier((state) => state.tier);
  const { earnCocktailLoggedXP, earnRecipeRatingXP } = useXPSystem();
  const { user } = useAuth();
  const getUserRecipeById = useUserRecipes((state) => state.getRecipeById);
  const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

  const [remoteRecipe, setRemoteRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groceryListVisible, setGroceryListVisible] = useState(false);
  const [userInventory, setUserInventory] = useState<UserInventoryItem[]>([]);
  const [missingIngredientNames, setMissingIngredientNames] = useState<string[]>([]);
  const [substituteRows, setSubstituteRows] = useState<SubstituteRow[]>([]);
  const [substituteModalVisible, setSubstituteModalVisible] = useState(false);
  const onScrollHaptic = useScrollHaptic('selection', 800);
  const viewStartTime = React.useRef<number>(Date.now());

  // Fetch user inventory for substitution suggestions
  useEffect(() => {
    const loadInventory = async () => {
      if (user) {
        log.info('CocktailDetailScreen', 'Loading user inventory', { userId: user.id });
        const inventory = await InventoryService.getUserInventory(user.id);
        log.info('CocktailDetailScreen', 'Inventory loaded', {
          inventoryCount: inventory.length,
          items: inventory.map((i) => i.item_name).slice(0, 10),
        });
        setUserInventory(inventory);
      } else {
        log.warn('CocktailDetailScreen', 'No user found - cannot load inventory');
      }
    };
    loadInventory();
  }, [user]);

  // Always fetch full recipe from Supabase to get complete data (ingredients, instructions)
  // Passed cocktail object may be lite-loaded with empty ingredients
  useEffect(() => {
    const loadRecipe = async () => {
      try {
        // Always fetch from Supabase to get complete data
        const recipe = await RecipesRepository.getRecipeById(route.params.cocktailId);
        if (recipe) {
          setRemoteRecipe(recipe);
        }
      } catch (error) {
        log.error('CocktailDetailScreen', 'Error loading recipe', error);
        // Only show error if we don't have fallback data
        if (!route.params.cocktail) {
          showToast('Failed to load recipe details', 'error');
        }
      } finally {
        setLoading(false);
      }
    };

    loadRecipe();
  }, [route.params.cocktailId]);

  // Track engagement time when user leaves the screen
  useEffect(() => {
    viewStartTime.current = Date.now();

    return () => {
      const viewDurationSeconds = Math.round((Date.now() - viewStartTime.current) / 1000);

      // Only track if user spent meaningful time (at least 3 seconds)
      if (viewDurationSeconds >= 3) {
        trackEvent(ANALYTICS_EVENTS.RECIPE_ENGAGEMENT, {
          [ANALYTICS_PROPS.RECIPE_ID]: route.params.cocktailId,
          [ANALYTICS_PROPS.RECIPE_NAME]:
            route.params.cocktail?.title || route.params.cocktail?.name || 'Unknown',
          [ANALYTICS_PROPS.VIEW_DURATION_SECONDS]: viewDurationSeconds,
        });
      }
    };
  }, [route.params.cocktailId]);

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const recipe = await RecipesRepository.getRecipeById(route.params.cocktailId);
      setRemoteRecipe(recipe);
      showToast('Recipe refreshed!', 'success');
    } catch (error) {
      log.error('CocktailDetailScreen', 'Error refreshing recipe', error);
      showToast('Failed to refresh recipe', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Check data sources in priority order:
  // 1. Passed cocktail object (for local recipes like mocktails)
  // 2. Non-alcoholic recipes
  // 3. Remote (Supabase) user-created recipes
  // 4. Hardcoded premium cocktails (original 11)
  // 5. Transformed centralized cocktails (new 81)

  // Transform passed cocktail if it exists and needs transformation
  const passedCocktail = route.params.cocktail
    ? (() => {
        const raw = route.params.cocktail;
        const normalizedBase = {
          ...raw,
          title: raw.title || raw.name || 'Custom Recipe',
          subtitle: raw.subtitle || 'Custom Recipe',
          img:
            raw.img ||
            raw.image ||
            raw.thumbnailImage ||
            raw.headerImage ||
            'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=1200&q=60',
          difficulty: raw.difficulty || 'Easy',
          time: raw.time || (raw.prepTime ? `${raw.prepTime} min` : '5 min'),
        };

        // If it already has properly formatted ingredients, use as-is
        if (
          raw.ingredients &&
          Array.isArray(raw.ingredients) &&
          raw.ingredients.length > 0 &&
          typeof raw.ingredients[0] === 'object' &&
          raw.ingredients[0].name
        ) {
          return normalizedBase;
        }

        // If it has string ingredients, transform them
        if (raw.ingredients && Array.isArray(raw.ingredients) && raw.ingredients.length > 0) {
          return {
            ...normalizedBase,
            ingredients: raw.ingredients.map((ing: any) => {
              if (typeof ing === 'string') {
                return { name: ing, note: undefined };
              }
              return ing;
            }),
          };
        }

        // If no ingredients, use the transformer to get them from centralized data
        return getDetailedCocktail(raw.id) || normalizedBase;
      })()
    : null;
  const localUserRecipe = getUserRecipeById(route.params.cocktailId);
  const localUserRecipeCocktail = localUserRecipe
    ? {
        id: localUserRecipe.id,
        title: localUserRecipe.name,
        subtitle: localUserRecipe.type === 'ai_generated' ? 'AI Generated' : 'Custom Recipe',
        description: localUserRecipe.description || 'Custom cocktail recipe',
        img:
          localUserRecipe.image ||
          localUserRecipe.thumbnailImage ||
          localUserRecipe.headerImage ||
          'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=1200&q=60',
        image:
          localUserRecipe.image || localUserRecipe.thumbnailImage || localUserRecipe.headerImage,
        difficulty: localUserRecipe.difficulty || 'Easy',
        time: localUserRecipe.prepTime ? `${localUserRecipe.prepTime} min` : '5 min',
        ingredients: localUserRecipe.ingredients || [],
        instructions: localUserRecipe.instructions || [],
        tips: localUserRecipe.tags || [],
        isLocalUserRecipe: true,
      }
    : null;

  const nonAlcoholicRecipe = getNonAlcoholicRecipeData(route.params.cocktailId);
  const hardcodedCocktail = cocktailData[route.params.cocktailId as keyof typeof cocktailData];
  const transformedCocktail = getDetailedCocktail(route.params.cocktailId);

  // Convert Supabase recipe to cocktail format if available
  const remoteCocktail = remoteRecipe
    ? (() => {
        // Check if it's an AI-formatted recipe first
        if (remoteRecipe.aiFormattedData) {
          return {
            id: remoteRecipe.id,
            title: remoteRecipe.aiFormattedData.title || remoteRecipe.title || 'Untitled Recipe',
            subtitle: `Custom Recipe • ${remoteRecipe.aiFormattedData.tags?.[0] || 'Mixed'}`,
            description:
              remoteRecipe.aiFormattedData.description ||
              'Custom recipe created with AI assistance',
            img:
              remoteRecipe.imageUrl ||
              'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=1200&q=60',
            difficulty: remoteRecipe.aiFormattedData.difficulty || 'Medium',
            time: remoteRecipe.aiFormattedData.time || '5 min',
            ingredients:
              remoteRecipe.aiFormattedData.ingredients?.map((ing: any) => ({
                name: `${ing.amount || ''} ${ing.name || ''}`.trim(),
                note: ing.notes || '',
              })) || [],
            instructions: remoteRecipe.aiFormattedData.instructions || [],
            tips:
              remoteRecipe.aiFormattedData.tags?.map((tag: string) => `Tagged as: ${tag}`) || [],
            glassware: remoteRecipe.aiFormattedData.glassware,
            kitAvailable: false,
            kitPrice: 0,
            isRemoteRecipe: true,
          };
        }

        // Otherwise, it's a Supabase recipe - convert it to display format
        return {
          id: remoteRecipe.id,
          title: remoteRecipe.title || 'Untitled Recipe',
          subtitle: `${remoteRecipe.category || 'Classic'} • ${remoteRecipe.baseSpirit || 'Mixed'}-based`,
          description:
            remoteRecipe.description && remoteRecipe.description.length > 50
              ? remoteRecipe.description
              : `A classic ${remoteRecipe.baseSpirit || 'cocktail'} recipe.`,
          img:
            remoteRecipe.image ||
            remoteRecipe.imageUrl ||
            'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=1200&q=60',
          difficulty:
            remoteRecipe.difficulty === 'beginner'
              ? 'Easy'
              : remoteRecipe.difficulty === 'intermediate'
                ? 'Medium'
                : remoteRecipe.difficulty === 'advanced'
                  ? 'Hard'
                  : 'Medium',
          time: remoteRecipe.time || `${remoteRecipe.preparationTime || 5} min`,
          ingredients:
            remoteRecipe.ingredients?.map((ing: any) => {
              // Handle different ingredient formats
              if (typeof ing === 'string') {
                return { name: ing, note: undefined };
              }
              // Supabase format: { item: "White Rum", amount: "1 oz", type: "spirit" }
              if (ing.item && ing.amount) {
                return {
                  name: `${ing.amount} ${ing.item}`,
                  note: ing.notes || undefined,
                };
              }
              // Legacy format with amount: { name: "White Rum", amount: "1 oz" }
              if (ing.name && ing.amount && ing.amount.trim()) {
                return {
                  name: `${ing.amount} ${ing.name}`,
                  note: ing.notes || undefined,
                };
              }
              // Format where full ingredient is in name field: { name: "1 oz White Rum", amount: "" }
              if (ing.name && (!ing.amount || !ing.amount.trim())) {
                return {
                  name: ing.name,
                  note: ing.notes || undefined,
                };
              }
              // Fallback - try to convert to string safely
              if (typeof ing === 'object' && ing !== null) {
                return { name: ing.name || JSON.stringify(ing), note: undefined };
              }
              return { name: String(ing), note: undefined };
            }) || [],
          instructions: remoteRecipe.instructions || [],
          tips: remoteRecipe.tags?.slice(0, 3) || [],
          glassware: remoteRecipe.glassware,
          kitAvailable: true,
          kitPrice: undefined,
          isSupabaseRecipe: true,
        };
      })()
    : null;

  // Priority order: Prefer complete data sources (with ingredients)
  // 1. Non-alcoholic recipes (local, always complete)
  // 2. Supabase data (if it has ingredients)
  // 3. Passed cocktail (only if it has ingredients)
  // 4. Hardcoded cocktails
  // 5. Transformed centralized cocktails
  const cocktail = (() => {
    if (localUserRecipeCocktail) return localUserRecipeCocktail;
    // Non-alcoholic recipes are always complete
    if (nonAlcoholicRecipe) return nonAlcoholicRecipe;

    // Check if remote data is complete (has ingredients)
    if (remoteCocktail) {
      const hasValidIngredients =
        remoteCocktail.ingredients && remoteCocktail.ingredients.length > 0;
      const hasValidInstructions =
        remoteCocktail.instructions && remoteCocktail.instructions.length > 0;

      // If remote data is complete, use it (this is the primary source of truth)
      if (hasValidIngredients && hasValidInstructions) {
        return remoteCocktail;
      }

      // If remote data is incomplete, try to merge with transformed data
      if (transformedCocktail) {
        return {
          ...remoteCocktail,
          // Use remote data for basic info, but get ingredients/instructions from local if missing
          ingredients: hasValidIngredients
            ? remoteCocktail.ingredients
            : transformedCocktail.ingredients,
          instructions: hasValidInstructions
            ? remoteCocktail.instructions
            : transformedCocktail.instructions,
          tips: remoteCocktail.tips?.length > 0 ? remoteCocktail.tips : transformedCocktail.tips,
          glassware: remoteCocktail.glassware || transformedCocktail.glassware,
        };
      }
    }

    // Only use passed cocktail if it has actual ingredients (not lite-loaded)
    if (passedCocktail && passedCocktail.ingredients && passedCocktail.ingredients.length > 0) {
      return passedCocktail;
    }

    // Fallback to hardcoded or transformed local data
    if (hardcodedCocktail) return hardcodedCocktail;
    if (transformedCocktail) return transformedCocktail;

    // Last resort: return remote data even if incomplete, or passed cocktail
    return remoteCocktail || passedCocktail || localUserRecipeCocktail || null;
  })();

  // Parse ingredients into consistent format for rendering
  const parsedIngredients = React.useMemo(() => {
    if (!cocktail || !cocktail.ingredients) return [];

    if (typeof cocktail.ingredients === 'string') {
      // Supabase format: split string but preserve original formatting for display
      const separator = cocktail.ingredients.includes('|') ? '|' : ',';
      const ingredientStrings = cocktail.ingredients
        .split(separator)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      return ingredientStrings.map((name) => normalizeDetailIngredient(name));
    } else if (Array.isArray(cocktail.ingredients)) {
      return cocktail.ingredients.map((ingredient) => normalizeDetailIngredient(ingredient));
    }

    return [];
  }, [cocktail]);

  // Calculate ingredient ownership stats from normalized ingredient rows
  const ingredientStats = React.useMemo(() => {
    if (!parsedIngredients.length) {
      return { owned: 0, total: 0, missing: [] as string[] };
    }

    let owned = 0;
    const missing: string[] = [];

    parsedIngredients.forEach((ingredient: any) => {
      const ingredientName = String(ingredient.matchName || ingredient.name || '').trim();
      if (!ingredientName) return;

      const hasIt = hasIngredient(userInventory, ingredientName);
      if (hasIt) {
        owned++;
      } else {
        missing.push(ingredientName);
      }
    });

    return {
      owned,
      total: parsedIngredients.length,
      missing,
    };
  }, [parsedIngredients, userInventory]);

  const makeFlowIngredients = React.useMemo(
    () =>
      parsedIngredients.map((ingredient: any, index: number) => ({
        key: `${index}_${String(ingredient.matchName || ingredient.name || '').toLowerCase()}`,
        name: String(ingredient.name || ''),
        amount: String(ingredient.amount || ''),
      })),
    [parsedIngredients],
  );

  const ownedIngredientNames = React.useMemo(() => {
    // Ingredient highlighting is a Bartender (PLUS) feature
    if (tier === 'FREE') return new Set<string>();
    return new Set(
      parsedIngredients
        .filter((ingredient: any) =>
          hasIngredient(userInventory, String(ingredient.matchName || ingredient.name || '')),
        )
        .map((ingredient: any) => String(ingredient.matchName || ingredient.name || '')),
    );
  }, [parsedIngredients, userInventory, tier]);

  const normalizeText = (value: string): string =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const isGarnishLike = (value: string): boolean => {
    const t = normalizeText(value);
    return [
      'garnish',
      'sprig',
      'slice',
      'wheel',
      'wedge',
      'twist',
      'peel',
      'leaf',
      'mint',
      'basil',
      'thyme',
      'rosemary',
      'coffee bean',
      'cherry',
      'olive',
    ].some((token) => t.includes(token));
  };

  const getSuggestionsForIngredient = (ingredientName: string): string[] => {
    const needle = normalizeText(ingredientName);
    if (!needle) return [];
    const tokens = needle.split(' ').filter(Boolean);
    const garnishMode = isGarnishLike(ingredientName);

    return userInventory
      .map((item) => item.item_name)
      .filter((name): name is string => Boolean(name))
      .filter((name) => {
        if (!garnishMode) return true;
        return isGarnishLike(name);
      })
      .filter((name) => {
        const normalizedName = normalizeText(name);
        if (normalizedName.includes(needle)) return true;
        return tokens.some((token) => token.length >= 4 && normalizedName.includes(token));
      })
      .slice(0, 5);
  };

  const {
    hasMadeIt,
    timesMade,
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
  } = useMadeItFlow({
    cocktail,
    userId: user?.id,
    isPro,
    isPrestige,
    showToast,
    earnCocktailLoggedXP,
    earnRecipeRatingXP,
    makeFlowIngredients,
  });

  // Parse instructions into consistent format for rendering
  const parsedInstructions = React.useMemo(() => {
    if (!cocktail || !cocktail.instructions) return [];

    if (typeof cocktail.instructions === 'string') {
      // Supabase format: split string into array of steps
      // Split by period followed by space, newline, or numbered steps
      const steps = cocktail.instructions
        .split(/\.\s+|\n+/)
        .map((step) => step.trim())
        .filter((step) => step.length > 0)
        .map((step) => {
          // Remove leading numbers like "1. ", "2) ", etc.
          return step.replace(/^\d+[\.\)]\s*/, '');
        });
      return steps.map((step) => normalizeMethodStep(step)).filter(Boolean);
    } else if (Array.isArray(cocktail.instructions)) {
      // Remote format: already an array
      return cocktail.instructions
        .map((step) => normalizeMethodStep(String(step || '')))
        .filter(Boolean);
    }

    return [];
  }, [cocktail]);

  // Parse tips into consistent format for rendering
  const parsedTips = React.useMemo(() => {
    if (!cocktail) return [];

    let rawTips: string[] = [];
    if (typeof cocktail.tips === 'string') {
      rawTips = cocktail.tips
        .split(/\n+|•/)
        .map((tip) => tip.trim())
        .filter((tip) => tip.length > 0);
    } else if (Array.isArray(cocktail.tips)) {
      rawTips = cocktail.tips.map((tip) => String(tip || '').trim()).filter(Boolean);
    }

    return enhanceTips(cocktail, parsedIngredients, parsedInstructions, rawTips);
  }, [cocktail, parsedIngredients, parsedInstructions]);

  // Debug log to check cocktail data
  useEffect(() => {
    if (cocktail) {
      log.debug('CocktailDetailScreen', 'Cocktail data loaded', {
        id: cocktail.id,
        title: cocktail.title,
        hasIngredients: !!cocktail.ingredients,
        ingredientsLength: cocktail.ingredients?.length || 0,
        ingredientsType: typeof cocktail.ingredients,
        firstIngredient: cocktail.ingredients?.[0],
        source: passedCocktail
          ? 'passed'
          : nonAlcoholicRecipe
            ? 'nonAlcoholic'
            : remoteCocktail
              ? 'remote'
              : hardcodedCocktail
                ? 'hardcoded'
                : 'transformed',
      });
    }
  }, [cocktail]);

  // Check subscription requirement and redirect if needed
  useEffect(() => {
    if (!loading && cocktail) {
      // Check if cocktail requires Pro subscription
      const requiresProAccess = (cocktail as any).requiresPro && !isPro && !isPrestige;

      if (requiresProAccess) {
        log.info('CocktailDetailScreen', 'Pro subscription required - redirecting to Paywall');
        nav.navigate('Paywall');
      }
    }
  }, [loading, cocktail, isPro, isPrestige, nav]);

  // GLOBAL IMAGE RESOLVER: Use local images if available
  const resolvedImage = React.useMemo(() => {
    if (!cocktail) return { uri: DETAIL_FALLBACK_IMAGE };

    const candidateKeys = [
      route.params.cocktailId,
      cocktail.id,
      slugifyRecipeKey(cocktail.id),
      slugifyRecipeKey(cocktail.title),
      slugifyRecipeKey(String(cocktail.title || '').replace(/\s+shot$/i, '-shot')),
    ].filter(Boolean) as string[];

    for (const key of candidateKeys) {
      const localImage = getCocktailImage(key);
      if (localImage) return localImage;
    }

    const remoteImage =
      cocktail.img || cocktail.image || cocktail.thumbnailImage || cocktail.headerImage || '';
    return remoteImage ? { uri: remoteImage } : { uri: DETAIL_FALLBACK_IMAGE };
  }, [cocktail, route.params.cocktailId]);

  const isSaved = isCocktailSaved(route.params.cocktailId);
  const isFreeTier = tier === 'FREE';
  const showProTips = !isFreeTier;
  const useRecipeCardLayout = true;
  const detailEyebrow = cocktail?.isVaultVariation
    ? 'Variation'
    : cocktail?.isNonAlcoholic
      ? 'Zero-Proof Recipe'
      : 'Recipe';
  const heroKicker = React.useMemo(() => buildHeroKicker(cocktail), [cocktail]);
  const tastingNote = React.useMemo(() => {
    const recipeId = String(cocktail?.id || route.params.cocktailId || '').toLowerCase();
    const override = TASTING_NOTE_OVERRIDES[recipeId];
    if (override) return override;

    const authored = String(cocktail?.tastingNote || '').trim();
    if (authored && !isWeakTastingNote(authored)) return authored;

    const description = String(cocktail?.description || '').trim();
    if (!isWeakTastingNote(description)) return description;

    const subtitle = String(cocktail?.subtitle || '').trim();
    if (subtitle && !isWeakTastingNote(subtitle)) {
      return `${subtitle}.`;
    }

    return deriveTastingNote(cocktail, parsedIngredients, parsedInstructions, parsedTips);
  }, [cocktail, parsedIngredients, parsedInstructions, parsedTips, route.params.cocktailId]);
  const bestFor = React.useMemo(() => {
    const authored = String(cocktail?.bestFor || '').trim();
    if (authored) return ensureSentenceEnding(authored);
    return deriveBestFor(cocktail, parsedIngredients, parsedInstructions, parsedTips);
  }, [cocktail, parsedIngredients, parsedInstructions, parsedTips]);
  const displayedInstructions = React.useMemo(() => {
    if (!isFreeTier) return parsedInstructions;

    return parsedInstructions
      .slice(0, 2)
      .map((step) => trimSentence(String(step || ''), 96))
      .filter(Boolean);
  }, [isFreeTier, parsedInstructions]);

  // Phase 3.4: fading scaffold — Plus/Pro only. Free keeps the fixed
  // 2-step teaser above regardless of make count.
  const [timesMadeThisRecipe, setTimesMadeThisRecipe] = useState(0);
  const [showFullMethod, setShowFullMethod] = useState(false);

  useEffect(() => {
    if (isFreeTier || !user?.id || !cocktail?.id) return;
    let cancelled = false;
    getTimesMade(user.id, String(cocktail.id)).then((count) => {
      if (!cancelled) setTimesMadeThisRecipe(count);
    });
    return () => {
      cancelled = true;
    };
  }, [isFreeTier, user?.id, cocktail?.id]);

  const methodRenderMode = React.useMemo(
    () => resolveMethodRenderMode({ isFreeTier, showFullMethod, timesMade: timesMadeThisRecipe }),
    [isFreeTier, showFullMethod, timesMadeThisRecipe],
  );

  const methodSteps = React.useMemo(() => {
    if (isFreeTier) return displayedInstructions;
    if (methodRenderMode === 'condensed') return buildCondensedSteps(parsedInstructions);
    return parsedInstructions;
  }, [isFreeTier, methodRenderMode, parsedInstructions, displayedInstructions]);

  const methodSpecLine = React.useMemo(
    () => buildMethodSpecLine(parsedInstructions),
    [parsedInstructions],
  );
  const displayedTastingNote = React.useMemo(() => {
    if (!tastingNote) return '';
    return isFreeTier ? trimSentence(tastingNote, 120) : tastingNote;
  }, [isFreeTier, tastingNote]);
  const displayedBestFor = React.useMemo(() => {
    if (!bestFor) return '';
    return isFreeTier ? trimSentence(bestFor, 120) : bestFor;
  }, [isFreeTier, bestFor]);

  const handleShare = async () => {
    if (!cocktail) return;
    try {
      const result = await Share.share({
        message: `Check out this amazing ${cocktail.title} recipe! Perfect for any occasion.`,
        title: `${cocktail.title} - Cocktail Recipe`,
      });

      // Track share event
      if (result.action === Share.sharedAction) {
        trackEvent(ANALYTICS_EVENTS.RECIPE_SHARED, {
          [ANALYTICS_PROPS.RECIPE_ID]: cocktail.id,
          [ANALYTICS_PROPS.RECIPE_NAME]: cocktail.title,
          [ANALYTICS_PROPS.SHARE_METHOD]: result.activityType || 'unknown',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to share at this time');
    }
  };

  const handleSave = async () => {
    if (!cocktail) return;

    const wasSaved = isCocktailSaved(route.params.cocktailId);

    // Soft cap: FREE can save first 5 cocktails, 6th save triggers T3 paywall.
    if (!wasSaved && !canSaveMoreCocktails) {
      saveGate('T3');
      showToast(`Free tier allows ${FREE_RECIPE_LIMIT} saved cocktails.`, 'info');
      return;
    }

    const result = toggleSavedCocktail({
      id: route.params.cocktailId,
      name: cocktail.title,
      subtitle: cocktail.subtitle,
      image: cocktail.img || cocktail.image || cocktail.thumbnailImage || cocktail.headerImage,
    });
    if (result === 'limit_reached') {
      saveGate('T3');
      showToast(`Free tier allows ${FREE_RECIPE_LIMIT} saved cocktails.`, 'info');
      return;
    }

    // Show toast notification
    if (wasSaved) {
      showToast(`${cocktail.title} removed from saved`, 'info');
    } else {
      const nextCount = savedCocktailCount + 1;
      showToast(
        tier === 'FREE'
          ? `${cocktail.title} saved! (${nextCount}/${FREE_RECIPE_LIMIT} free)`
          : `${cocktail.title} saved!`,
        'success',
      );
    }
  };

  const handleAddToCart = () => {
    if (!cocktail || !cocktail.kitAvailable) return;

    // Check if ingredients exist
    const ingredients = cocktail.ingredients || [];
    if (ingredients.length === 0) {
      Alert.alert('No Ingredients', 'This cocktail has no ingredients listed.');
      return;
    }

    // Set missing ingredients for pre-selection in modal
    setMissingIngredientNames(ingredientStats.missing);

    // Show the grocery list modal
    setGroceryListVisible(true);
  };

  const handleDownload = () => {
    if (!cocktail) return;
    Alert.alert('Download Recipe', `${cocktail.title} recipe downloaded!`);
  };

  const handleMadeIt = () => {
    openMadeItFlow();
  };

  const handleFindSubstitutes = () => {
    if (!parsedIngredients.length) {
      Alert.alert('Substitutes', 'No ingredients listed for this recipe yet.');
      return;
    }

    const missing = ingredientStats.missing;

    const available = userInventory
      .map((item) => String(item.item_name || '').trim())
      .filter(Boolean);
    const availableLower = available.map((name) => name.toLowerCase());
    const targetIngredients = missing.length
      ? missing
      : parsedIngredients
          .map((ingredient: any) => String(ingredient.matchName || ingredient.name || '').trim())
          .filter(Boolean);
    const suggestions = getMissingWithSubstitutions(targetIngredients, available);

    const rows: SubstituteRow[] = suggestions.map((entry) => {
      if (!entry.substitutions || entry.substitutions.substitutes.length === 0) {
        const shelfIdeas = getSuggestionsForIngredient(entry.ingredient);
        if (shelfIdeas.length > 0) {
          return {
            ingredient: entry.ingredient,
            suggestion: shelfIdeas[0],
            note: 'Closest match from your shelf.',
            confidence: 'low',
            inInventory: true,
            isSpirit: isLikelySpiritIngredient(entry.ingredient),
            alternatives: shelfIdeas.slice(1, 3).join(', ') || undefined,
          };
        }
        return {
          ingredient: entry.ingredient,
          suggestion: null,
          note: 'Use original ingredient when possible.',
          confidence: 'low',
          inInventory: false,
          isSpirit: isLikelySpiritIngredient(entry.ingredient),
        };
      }

      const preferred = entry.canSubstitute
        ? entry.substitutions.substitutes.find((sub) =>
            availableLower.some(
              (name) =>
                name.includes(sub.name.toLowerCase()) || sub.name.toLowerCase().includes(name),
            ),
          ) || entry.substitutions.substitutes[0]
        : entry.substitutions.substitutes[0];

      const ranked = [...entry.substitutions.substitutes].sort((a, b) => {
        const aIn = availableLower.some(
          (name) => name.includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(name),
        );
        const bIn = availableLower.some(
          (name) => name.includes(b.name.toLowerCase()) || b.name.toLowerCase().includes(name),
        );
        if (aIn !== bIn) return aIn ? -1 : 1;
        const score = { high: 0, medium: 1, low: 2 } as const;
        return score[a.confidence] - score[b.confidence];
      });

      const top = ranked[0];
      const inInventory = availableLower.some(
        (name) => name.includes(top.name.toLowerCase()) || top.name.toLowerCase().includes(name),
      );
      const alternatives = ranked
        .slice(1, 3)
        .map((sub) => sub.name)
        .join(', ');

      return {
        ingredient: entry.ingredient,
        suggestion: top.name,
        note: getSubstitutionMessage(entry.ingredient, [top]).replace(
          /^Try\s+.+?\s+instead\s+-\s+/i,
          '',
        ),
        confidence: top.confidence,
        inInventory,
        isSpirit: isLikelySpiritIngredient(entry.ingredient),
        alternatives: alternatives || undefined,
      };
    });

    setSubstituteRows(rows);
    setSubstituteModalVisible(true);
  };

  useLayoutEffect(() => {
    nav.setOptions({
      headerShown: false,
    });
  }, [nav]);

  if (loading) {
    return <CocktailDetailSkeleton />;
  }

  if (!cocktail) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Recipe not found</Text>
          <Text style={styles.errorSubtext}>This recipe may have been deleted or moved.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const spiritSubstituteRows = substituteRows.filter((row) => row.isSpirit);
  const otherSubstituteRows = substituteRows.filter((row) => !row.isSpirit);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={onScrollHaptic}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* --- Hero Section --- */}
        <View style={styles.heroContainer}>
          <Image
            source={typeof resolvedImage === 'string' ? { uri: resolvedImage } : resolvedImage}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={['transparent', 'transparent', 'rgba(26, 18, 13, 0.8)', '#1A120D']}
            style={styles.heroGradient}
          >
            <View style={styles.heroLabelRow}>
              <View style={styles.heroTypePill}>
                <Ionicons
                  name={cocktail.isVaultVariation ? 'sparkles-outline' : 'ribbon-outline'}
                  size={12}
                  color={colors.accent}
                />
                <Text style={styles.heroTypePillText}>{detailEyebrow}</Text>
              </View>
              <Text style={styles.heroWatermark}>KOOPE</Text>
            </View>

            <Text style={[styles.heroKicker, { fontFamily: serifFont }]}>{heroKicker}</Text>
            <Text style={[styles.heroTitle, { fontFamily: serifFont }]}>{cocktail.title}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.subtext} />
                <Text style={styles.metaText}>{cocktail.time}</Text>
              </View>

              <Text style={styles.metaDot}>•</Text>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="chart-bar" size={16} color={colors.subtext} />
                <Text style={styles.metaText}>{cocktail.difficulty}</Text>
              </View>

              {(cocktail.glassware || cocktail.glass) && (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons
                      name="glass-cocktail"
                      size={16}
                      color={colors.subtext}
                    />
                    <Text style={styles.metaText}>{cocktail.glassware || cocktail.glass}</Text>
                  </View>
                </>
              )}
            </View>

            {ingredientStats.total > 0 && (
              <View style={styles.ingredientStatsRow}>
                <MaterialCommunityIcons
                  name="checkbox-marked-circle-outline"
                  size={16}
                  color={
                    ingredientStats.owned === ingredientStats.total ? colors.success : colors.accent
                  }
                />
                <Text
                  style={[
                    styles.ingredientStatsText,
                    ingredientStats.owned === ingredientStats.total && { color: colors.success },
                  ]}
                >
                  You have {ingredientStats.owned}/{ingredientStats.total} ingredients
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* Back Button (Absolute) */}
          <TouchableOpacity
            style={styles.backButtonAbsolute}
            onPress={withHaptic(() => nav.goBack(), 'selection')}
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>

          {/* Actions (Absolute Top Right) */}
          <View style={styles.topActionsAbsolute}>
            <TouchableOpacity style={styles.iconButton} onPress={withHaptic(handleShare)}>
              <Ionicons name="share-outline" size={22} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={withHaptic(handleSave)}>
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={colors.white}
              />
            </TouchableOpacity>
            {Boolean(
              (route.params as any)?.cocktail?.id?.startsWith?.('recipe_') ||
              (route.params as any)?.cocktail?.type,
            ) && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={withHaptic(() =>
                  nav.navigate('AddRecipe', {
                    recipe: (route.params as any)?.cocktail || cocktail,
                    isEdit: true,
                  }),
                )}
              >
                <Ionicons name="create-outline" size={20} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={useRecipeCardLayout && styles.referenceContentShell}>
          {/* --- Action Buttons --- */}
          <View
            style={[
              styles.actionButtonsContainer,
              useRecipeCardLayout && styles.referenceActionButtonsContainer,
            ]}
          >
            {cocktail.kitAvailable ? (
              <TouchableOpacity
                style={[styles.primaryButton, useRecipeCardLayout && styles.referencePrimaryButton]}
                onPress={handleAddToCart}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    useRecipeCardLayout && styles.referencePrimaryButtonText,
                  ]}
                >
                  {ingredientStats.missing.length === 0
                    ? 'Add All Ingredients to Cart'
                    : ingredientStats.missing.length === ingredientStats.total
                      ? 'Add All Ingredients to Cart'
                      : `Add Missing Ingredients (${ingredientStats.missing.length})`}
                </Text>
              </TouchableOpacity>
            ) : (
              <MadeItButton
                hasMadeIt={hasMadeIt}
                onPress={handleMadeIt}
                style={[styles.primaryButton, useRecipeCardLayout && styles.referencePrimaryButton]}
                textStyle={[
                  styles.primaryButtonText,
                  useRecipeCardLayout && styles.referencePrimaryButtonText,
                ]}
                label="I made this drink"
                madeLabel={timesMade > 1 ? `Made ${timesMade}×` : 'You Made It!'}
              />
            )}

            {cocktail.kitAvailable && (
              <MadeItButton
                hasMadeIt={hasMadeIt}
                onPress={handleMadeIt}
                madeLabel={timesMade > 1 ? `Made ${timesMade}×` : 'You Made It!'}
                style={[
                  styles.secondaryButton,
                  useRecipeCardLayout && styles.referenceSecondaryButton,
                ]}
                textStyle={[
                  styles.secondaryButtonText,
                  useRecipeCardLayout && styles.referenceSecondaryButtonText,
                ]}
                label="How did you make it?"
                xpLabel="+50 XP"
                xpLabelStyle={[
                  styles.secondaryButtonXP,
                  useRecipeCardLayout && styles.referenceSecondaryButtonXP,
                ]}
              />
            )}

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                useRecipeCardLayout && styles.referenceSecondaryButton,
              ]}
              onPress={handleFindSubstitutes}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  useRecipeCardLayout && styles.referenceSecondaryButtonText,
                ]}
              >
                Find Ingredient Substitutes
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.recipeEditorialShell,
              useRecipeCardLayout && styles.referenceRecipeEditorialShell,
            ]}
          >
            <View
              style={[
                styles.recipeEditorialInner,
                useRecipeCardLayout && styles.referenceRecipeEditorialInner,
              ]}
            >
              {useRecipeCardLayout ? (
                <View style={styles.referenceSectionHeaderRow}>
                  <Text style={styles.referenceSectionEyebrow}>Ingredients</Text>
                  <View style={styles.referenceSectionRule} />
                </View>
              ) : null}
              <View style={[styles.specTable, useRecipeCardLayout && styles.referenceSpecTable]}>
                {parsedIngredients && parsedIngredients.length > 0 ? (
                  parsedIngredients.map((ingredient, index) => {
                    const isOwnedIngredient = ownedIngredientNames.has(
                      String(ingredient.matchName || ingredient.name || ''),
                    );
                    const rightSideValue = String(
                      ingredient.amount || ingredient.note || '',
                    ).trim();
                    return (
                      <View
                        key={`ingredient-${index}`}
                        style={[
                          styles.specRow,
                          useRecipeCardLayout && styles.referenceSpecRow,
                          isOwnedIngredient && styles.specRowOwned,
                          isOwnedIngredient && useRecipeCardLayout && styles.referenceSpecRowOwned,
                          index === parsedIngredients.length - 1 && styles.specRowLast,
                        ]}
                      >
                        <View style={styles.specNameWrap}>
                          <Text
                            style={[
                              styles.specName,
                              useRecipeCardLayout && styles.referenceSpecName,
                              isOwnedIngredient && styles.specNameOwned,
                              isOwnedIngredient &&
                                useRecipeCardLayout &&
                                styles.referenceSpecNameOwned,
                            ]}
                          >
                            {ingredient.name}
                          </Text>
                          {isOwnedIngredient ? (
                            <MaterialCommunityIcons
                              name="check-circle"
                              size={16}
                              color={colors.success}
                              style={styles.specOwnedIcon}
                            />
                          ) : null}
                        </View>
                        <View style={styles.specAmountWrap}>
                          <Text
                            style={[
                              styles.specAmount,
                              useRecipeCardLayout && styles.referenceSpecAmount,
                              isOwnedIngredient && styles.specAmountOwned,
                              isOwnedIngredient &&
                                useRecipeCardLayout &&
                                styles.referenceSpecAmountOwned,
                            ]}
                          >
                            {rightSideValue}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.emptyRecipeCardText}>No ingredients listed.</Text>
                )}
              </View>

              {(methodRenderMode === 'spec'
                ? methodSpecLine.length > 0
                : methodSteps.length > 0) && (
                <MethodSection
                  mode={methodRenderMode}
                  steps={methodSteps}
                  specLine={methodSpecLine}
                  showEscapeHatch={!isFreeTier && methodRenderMode !== 'full'}
                  onShowEverything={() => setShowFullMethod(true)}
                  sectionStyle={[
                    styles.recipeEditorialSection,
                    useRecipeCardLayout && styles.referenceRecipeEditorialSection,
                  ]}
                  titleStyle={[
                    styles.recipeEditorialTitle,
                    { fontFamily: useRecipeCardLayout ? referenceSerifFont : serifFont },
                    useRecipeCardLayout && styles.referenceRecipeEditorialTitle,
                  ]}
                  listStyle={[styles.methodList, useRecipeCardLayout && styles.referenceMethodList]}
                  rowStyle={[styles.methodRow, useRecipeCardLayout && styles.referenceMethodRow]}
                  indexStyle={[
                    styles.methodIndex,
                    { fontFamily: useRecipeCardLayout ? referenceDisplayFont : serifFont },
                    useRecipeCardLayout && styles.referenceMethodIndex,
                  ]}
                  textStyle={[styles.methodText, useRecipeCardLayout && styles.referenceMethodText]}
                />
              )}

              {displayedTastingNote || displayedBestFor ? (
                <View style={[styles.recipeEditorialSection, styles.recipeEditorialSectionLast]}>
                  <Text
                    style={[
                      styles.recipeEditorialTitle,
                      { fontFamily: useRecipeCardLayout ? referenceSerifFont : serifFont },
                      useRecipeCardLayout && styles.referenceRecipeEditorialTitle,
                    ]}
                  >
                    Taste & Fit
                  </Text>
                  {displayedTastingNote ? (
                    <>
                      <Text
                        style={[
                          styles.tastingSubhead,
                          useRecipeCardLayout && styles.referenceTastingSubhead,
                        ]}
                      >
                        Tasting Note
                      </Text>
                      <Text
                        style={[
                          styles.tastingNoteText,
                          useRecipeCardLayout && styles.referenceTastingNoteText,
                        ]}
                      >
                        {displayedTastingNote}
                      </Text>
                    </>
                  ) : null}
                  {displayedBestFor ? (
                    <>
                      <Text
                        style={[
                          styles.tastingSubhead,
                          useRecipeCardLayout && styles.referenceTastingSubhead,
                        ]}
                      >
                        Best For
                      </Text>
                      <Text
                        style={[
                          styles.tastingNoteText,
                          useRecipeCardLayout && styles.referenceTastingNoteText,
                        ]}
                      >
                        {displayedBestFor}
                      </Text>
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* --- Pro Tips --- */}
        {showProTips && parsedTips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>Notes</Text>
            <View style={styles.proTipsContainer}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}
              >
                <MaterialCommunityIcons name="lightbulb-on" size={20} color={colors.accent} />
                <Text style={[styles.proTipsTitle, { fontFamily: serifFont }]}>
                  {cocktail.isNonAlcoholic ? 'Flavor Profile' : 'Pro Tips'}
                </Text>
              </View>
              {parsedTips.map((tip, idx) => (
                <Text key={idx} style={styles.proTipsText}>
                  • {tip}
                </Text>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Grocery List Modal */}
      {cocktail && (
        <GroceryListModal
          visible={groceryListVisible}
          onClose={() => setGroceryListVisible(false)}
          recipeName={cocktail.title}
          ingredients={parsedIngredients}
          recipeId={cocktail.id}
          preSelectedIngredients={missingIngredientNames}
        />
      )}

      <SubstituteIngredientsModal
        visible={substituteModalVisible}
        onClose={() => setSubstituteModalVisible(false)}
        hasMissingIngredients={ingredientStats.missing.length > 0}
        spiritRows={spiritSubstituteRows}
        otherRows={otherSubstituteRows}
      />

      <MakeItModal
        visible={makeFlowVisible}
        onClose={() => setMakeFlowVisible(false)}
        completionConfig={completionConfig}
        ingredients={makeFlowIngredients}
        getSuggestionsForIngredient={getSuggestionsForIngredient}
        brandSelections={brandSelections}
        onBrandSelectionChange={(key, value) =>
          setBrandSelections((prev) => ({ ...prev, [key]: value }))
        }
        substitutions={substitutions}
        onSubstitutionsChange={setSubstitutions}
        techniqueVariations={techniqueVariations}
        onTechniqueVariationsChange={setTechniqueVariations}
        personalModifications={personalModifications}
        onPersonalModificationsChange={setPersonalModifications}
        isSaving={isSavingCompletion}
        onSubmit={handleLogCompletion}
      />

      <RatingModal
        visible={ratingFlowVisible}
        onClose={() => setRatingFlowVisible(false)}
        selectedRating={selectedRating}
        onSelectRating={setSelectedRating}
        notes={completionNotes}
        onNotesChange={setCompletionNotes}
        onSave={handleSaveRating}
      />

      {/* Toast Notification */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </View>
  );
}
