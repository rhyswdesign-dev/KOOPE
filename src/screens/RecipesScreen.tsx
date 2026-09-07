import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Pressable,
  Alert,
  TextInput,
  Keyboard,
  FlatList,
  Dimensions,
  ListRenderItem,
  Modal,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import Animated, { FadeInDown, FadeIn, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { colors, spacing, radii, fonts, serif } from '../theme/tokens';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SectionHeader from '../components/SectionHeader';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { FREE_RECIPE_LIMIT, useSavedItems } from '../hooks/useSavedItems';
import { recipeService } from '../lib/supabaseData';
import { useAuth } from '../contexts/AuthContext';
import GroceryListModal from '../components/GroceryListModal';
import { AIRecipeFormatter, FormattedRecipe } from '../services/aiRecipeFormatter';
import { searchService, type FilterOptions } from '../services/searchService';
import AIRecipeSearch from '../components/AIRecipeSearch';
import AIRecipeModal from '../components/AIRecipeModal';
import RecipeCard from '../components/RecipeCard';
import { createRecipeCardProps } from '../utils/recipeActions';
import { StatusBar } from 'expo-status-bar';
import { log } from '../lib/logger';
import { RecipesRepository } from '../repos/supabase';
import { getCocktailImage } from '../../assets/images/cocktails';
import { usePersonalization } from '../store/usePersonalization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserRecipes } from '../store/useUserRecipes';
import RecipePreferencesModal from '../components/RecipePreferencesModal';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import RecipeCardSkeleton from '../components/RecipeCardSkeleton';
import SearchBar from '../components/SearchBar';
import FilterModal from '../components/FilterModal';
import ForYouFeed from '../components/ForYouFeed';
import { useUserTier } from '../store/useUserTier';
import { isCocktailAccessible, FREE_TIER_COCKTAILS, getUpgradeMessage } from '../config/tierAccess';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import LockedRecipeCard from '../components/LockedRecipeCard';
import VaultRailCard from '../components/VaultRailCard';
import { useXPSystem } from '../store/useXPSystem';
import CocktailUnlockSheet from '../components/CocktailUnlockSheet';
import XPBalanceModal from '../components/XPBalanceModal';
import { useEngagement } from '../store/useEngagement';
import {
  COCKTAIL_OF_THE_WEEK,
  COCKTAIL_MOODS,
  PARTY_SHOTS,
  ALL_SHOTS,
  sampleRecipes,
} from '../utils/recipesScreenData';
import HeroCard from '../components/HeroCard';
import { afStyles } from './RecipesScreen.afStyles';
import MainPageHeader from '../components/ui/MainPageHeader';
import {
  cocktailVariations,
  getVariationsForDisplay,
  getTechniquePlaybooksByType,
  getAllPlaybookTypes,
  getBartenderHacksForDisplay,
} from '../config/vaultContent';
import { getVaultVariationThumbnail, getVaultPlaybookThumbnail } from '../data/vaultImages';
import { useScrollHaptic, withHaptic } from '../lib/haptics';
import { ingredientListToSearchText } from '../utils/ingredientFormatting';
import { curriculumData } from '../utils/curriculumAdapter';
import { getCurriculumUnlockForRecipeId } from '../config/unlockContent';
import { loadUserProfile } from '../services/userProfileService';
import { hydrateTasteGraph } from '../services/tasteGraphService';
import { CANONICAL_FLAVORS, CANONICAL_SPIRITS } from '../utils/flavorTaxonomy';
import type { Spirit } from '../types/userProfile';
import {
  detectSeason,
  detectTimeOfDay,
  getPredictiveRecommendations,
} from '../services/predictiveEngine';
import { calculateTasteMatchPercent } from '../services/tasteMatchService';
import { InventoryService } from '../services/inventoryService';
import { toBottle } from '../types/database';
import { buildEnhancedProfileFallback } from '../services/enhancedProfileFallback';
import { getTonightsPick } from '../services/tonightsPickService';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const { width } = Dimensions.get('window');
const GUTTER = 12;
const GOLD = '#C9A15A'; // spotlight color

const tasteMatchBadgeStyle = {
  position: 'absolute' as const,
  top: 8,
  left: 8,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 3,
  backgroundColor: 'rgba(18,18,18,0.85)',
  borderRadius: 10,
  paddingHorizontal: 7,
  paddingVertical: 3,
};

const tasteMatchBadgeTextStyle = {
  fontSize: 10,
  fontWeight: '600' as const,
  color: GOLD,
};

// Vault rail: how many cards one visit shows, and the stand-in art for
// Bartender Hacks (the only Vault category with no per-item image — VaultScreen
// falls back to this same Unsplash photo for them).
const VAULT_RAIL_SAMPLE_SIZE = 7;
const VAULT_HACK_PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=400';

/** Fisher-Yates shuffle of a copy, then take the first `count`. */
function sampleRandom<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function uniqueById(items: any[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/* ------------------------- SCREEN ------------------------- */

export default function RecipesScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const {
    savedItems,
    toggleSavedCocktail,
    isCocktailSaved,
    savedCocktailCount,
    canSaveMoreCocktails,
  } = useSavedItems();
  // getPersonalizedMoodOrder/getFeaturedCocktails were removed from this
  // destructuring when the PLUS-tier recommendations below switched to
  // tasteMatchScores. scoreMoodCategory/recordInteraction were already dead
  // (destructured, never called) before this session's changes.
  const { profile } = usePersonalization();
  const { recipes: userRecipes, loadRecipes } = useUserRecipes();
  const { toast, showToast, hideToast } = useToast();
  const onScrollHaptic = useScrollHaptic('selection', 800);

  // Tier-based access control
  const tier = useUserTier((state) => state.tier);
  const { gateWithTrigger: saveGate } = useFeatureAccess('saved_cocktails_unlimited');
  const { gateWithTrigger: bringToPartyGate } = useFeatureAccess('bring_to_party');
  const { gateWithTrigger: predictiveEngineGate } = useFeatureAccess('predictive_engine');
  const { gateWithTrigger: flavorControlsGate } = useFeatureAccess('adjustable_flavor_controls');
  const { gateWithTrigger: advancedFilterGate } = useFeatureAccess('advanced_filters');
  const { gate: whatCanIMakeGate } = useFeatureAccess('what_can_i_make');

  // XP System
  const {
    balance: xpBalance,
    getCocktailCost,
    canAffordCocktail,
    unlockCocktail,
    isCocktailUnlockedWithXP,
    unlockedCocktails,
    unlockedVaultItems,
  } = useXPSystem();

  // Engagement System
  const { isRecipeUnlocked: isRecipeUnlockedWithEngagement } = useEngagement();

  // Vault rail — the Vault stack screen had no entry point on any main
  // surface, so nothing in it (playbooks, variations, hacks) was discoverable.
  // Sourced from the same live vaultContent pool VaultScreen renders, so the
  // ids line up with the unlock state the XP store persists. All three
  // categories are mixed together (Seasonal is deliberately left out for now).
  // Purely a discovery surface: taps open the Vault, where the existing
  // level/tier gating still applies.
  const vaultRailPool = useMemo(() => {
    const unlocked = new Set(unlockedVaultItems || []);
    const pool = [
      ...getVariationsForDisplay().map((item) => ({ item, kind: 'variation' as const })),
      ...getAllPlaybookTypes().flatMap((type) =>
        getTechniquePlaybooksByType(type).map((item) => ({ item, kind: 'playbook' as const })),
      ),
      ...getBartenderHacksForDisplay().map((item) => ({ item, kind: 'hack' as const })),
    ];
    return pool.map((entry) => ({ ...entry, isUnlocked: unlocked.has(entry.item.id) }));
  }, [unlockedVaultItems]);

  const [vaultRailItems, setVaultRailItems] = useState<typeof vaultRailPool>([]);

  // The rail shows a fresh random sample every time the screen regains focus,
  // so repeat visits surface different corners of the Vault. The pool is read
  // through a ref with an empty-dep callback on purpose: it keeps the focus
  // effect's identity stable (a changing callback would re-run — and re-roll —
  // on every render), and it also means the rail never reshuffles underneath a
  // user who is still looking at it.
  const vaultRailPoolRef = useRef(vaultRailPool);
  vaultRailPoolRef.current = vaultRailPool;
  useFocusEffect(
    useCallback(() => {
      setVaultRailItems(sampleRandom(vaultRailPoolRef.current, VAULT_RAIL_SAMPLE_SIZE));
    }, []),
  );

  // Daily-login XP is granted in App.tsx on app open — the single call site
  // after the 2026-08 XP-funnel pass. It used to also fire here, and because
  // App.tsx's grant bypassed checkDailyLogin's once-per-day dedupe, the two
  // together could pay the bonus twice on the same calendar day.

  // Unlock sheet state
  const [unlockSheetVisible, setUnlockSheetVisible] = useState(false);
  const [selectedCocktailForUnlock, setSelectedCocktailForUnlock] = useState<any>(null);

  // XP Balance modal state
  const [xpBalanceModalVisible, setXpBalanceModalVisible] = useState(false);

  // Supabase recipes state
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasteMatchScores, setTasteMatchScores] = useState<Record<string, number>>({});

  // View mode toggle - Browse All vs For You
  const [viewMode, setViewMode] = useState<'browse' | 'personalized'>('browse');
  const [personalizedRecommendations, setPersonalizedRecommendations] = useState<any[]>([]);

  // Tonight's Pick rail (Browse mode, all tiers) — independent of viewMode.
  // Typed `any[]` to match how every other rail in this file treats cocktail
  // data (ALL_COCKTAILS itself is `any[]`) rather than fighting PredictedRecipe's
  // stricter shape against createRecipeCardProps's local, looser Recipe type.
  const [tonightsPick, setTonightsPick] = useState<any[]>([]);
  const [tonightsPickHasInventory, setTonightsPickHasInventory] = useState(false);
  const [tonightsPickLoaded, setTonightsPickLoaded] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<Partial<FilterOptions>>({
    sortOrder: 'alphabetical-asc',
  });
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<any>(null);
  const [showBasicFilterModal, setShowBasicFilterModal] = useState(false);
  const [showAdvancedFilterModal, setShowAdvancedFilterModal] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showOnlyUnlocked, setShowOnlyUnlocked] = useState(false);
  const [browseQuickFilter, setBrowseQuickFilter] = useState<'all' | 'variations'>('all');

  // Modal states
  const [groceryListVisible, setGroceryListVisible] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  // AI-related states
  const [aiRecipeModalVisible, setAiRecipeModalVisible] = useState(false);
  const [currentAiRecipe, setCurrentAiRecipe] = useState<FormattedRecipe | null>(null);

  // Preferences modal
  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);

  // Load recipes from cache/network (instant with cache)
  useEffect(() => {
    async function loadRecipes() {
      try {
        // TEMPORARY: Force clear ALL caches to reload with local images
        // Remove this after images are working correctly
        await RecipesRepository.clearAllCaches();
        log.info('RecipesScreen', 'Cleared ALL recipe caches - will reload with local images');

        // This will fetch fresh data since cache is cleared
        const recipes = await RecipesRepository.getInitialRecipes(150);
        setAllRecipes(recipes);
        setRecipesLoading(false);
      } catch (error) {
        log.error('RecipesScreen', 'Error loading recipes', error);
        setRecipesLoading(false);
        showToast('Failed to load recipes. Please check your connection.', 'error');
      }
    }
    loadRecipes();
  }, []);

  // Compute taste match scores for PLUS/PRO users once recipes are loaded.
  // Reads the canonical profile directly — buildTasteProfileFromPersonalization
  // was a fallback for when this ran off the old 0-100 store, which no longer
  // has any bearing on taste. The canonical model's confidence-blended priors
  // mean there's always something sensible to score against, even for a
  // brand-new user with zero interactions.
  useEffect(() => {
    if (allRecipes.length === 0 || tier === 'FREE' || !user?.id) return;
    let cancelled = false;

    loadUserProfile(user.id)
      .then((dbProfile) => {
        if (cancelled) return;
        const graph = hydrateTasteGraph(dbProfile?.tasteProfile);
        if (!graph) return;

        const tasteProfile = graph.rawProfile;
        const scores: Record<string, number> = {};
        for (const recipe of allRecipes) {
          scores[recipe.id] = calculateTasteMatchPercent(tasteProfile, recipe as any);
        }
        setTasteMatchScores(scores);
      })
      .catch((error) => {
        log.warn('RecipesScreen', 'Failed to compute taste match scores', { error });
      });

    return () => {
      cancelled = true;
    };
  }, [allRecipes, tier, user?.id]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await RecipesRepository.clearAllCaches();
      const recipes = await RecipesRepository.getInitialRecipes(150);
      setAllRecipes(recipes);
      showToast('Recipes refreshed!', 'success');
    } catch (error) {
      log.error('RecipesScreen', 'Error refreshing recipes', error);
      showToast('Failed to refresh recipes', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [showToast]);

  // Separate syrups and cocktails
  const ESSENTIAL_SYRUPS = allRecipes.filter((r) => r.category?.toLowerCase() === 'syrups');

  const isMocktail = React.useCallback((recipe: any) => {
    const recipeCategory = recipe.category?.toLowerCase();
    const ingredientText = ingredientListToSearchText(recipe.ingredients || []).toLowerCase();
    return (
      recipeCategory === 'mocktails' ||
      ingredientText.includes('non-alcoholic') ||
      ingredientText.includes('zero-proof') ||
      ingredientText.includes('seedlip') ||
      ingredientText.includes('n/a') ||
      ingredientText.includes('alcohol-free')
    );
  }, []);

  const ALL_COCKTAILS = React.useMemo(() => {
    const map = new Map<string, any>();
    // include existing cocktails (non-syrups)
    allRecipes
      .filter((r) => r.category?.toLowerCase() !== 'syrups')
      .forEach((r) => map.set(r.id, r));
    // merge in mocktails if not already present
    sampleRecipes.forEach((mocktail) => {
      if (!map.has(mocktail.id)) {
        map.set(mocktail.id, mocktail);
      }
    });
    return Array.from(map.values());
  }, [allRecipes]);

  const ALL_MOCKTAILS = React.useMemo(
    () => ALL_COCKTAILS.filter(isMocktail),
    [ALL_COCKTAILS, isMocktail],
  );
  const VARIATION_BASE_RECIPE_ALIASES: Record<string, string[]> = {
    old_fashioned: ['old-fashioned', 'old-fashioned-classic'],
    whiskey_sour: ['whiskey-sour'],
    espresso_martini: ['espresso-martini'],
    daiquiri: ['daiquiri'],
    negroni: ['negroni'],
    manhattan: ['manhattan'],
    margarita: ['margarita', 'margarita-classic'],
  };
  const VARIATION_DETAIL_OVERRIDES: Record<
    string,
    { time: string; ingredients: string[]; instructions: string[] }
  > = {
    var_smoked_old_fashioned: {
      time: '6 min',
      ingredients: [
        '2 oz bourbon or rye whiskey',
        '1/4 oz rich simple syrup',
        '2 dashes Angostura bitters',
        'Orange peel',
        'Smoking wood chip (cherry or oak)',
      ],
      instructions: [
        'Stir whiskey, syrup, and bitters with ice.',
        'Strain over a large cube in a rocks glass.',
        'Express orange peel over drink.',
        'Trap smoke in glass with wood chip and cover for 10-15 seconds, then serve.',
      ],
    },
    var_spicy_margarita: {
      time: '5 min',
      ingredients: [
        '2 oz blanco tequila',
        '3/4 oz fresh lime juice',
        '1/2 oz orange liqueur',
        '1/2 oz agave syrup',
        '2-3 jalapeno slices',
      ],
      instructions: [
        'Lightly muddle jalapeno in shaker.',
        'Add tequila, lime, orange liqueur, and agave with ice.',
        'Shake hard and double strain over fresh ice.',
        'Garnish with jalapeno slice or chili salt rim.',
      ],
    },
    var_brown_butter_old_fashioned: {
      time: '8 min',
      ingredients: [
        '2 oz brown-butter-washed bourbon',
        '1/4 oz demerara syrup',
        '2 dashes Angostura bitters',
        'Orange peel',
      ],
      instructions: [
        'Combine all ingredients with ice in a mixing glass.',
        'Stir until chilled and properly diluted.',
        'Strain over a large cube.',
        'Express orange peel and garnish.',
      ],
    },
    var_clarified_whiskey_sour: {
      time: '12 min',
      ingredients: [
        '2 oz bourbon',
        '3/4 oz lemon juice',
        '1/2 oz simple syrup',
        '1/2 oz whole milk',
        'Optional: 1 egg white (pre-clarification style)',
      ],
      instructions: [
        'Build whiskey sour base and add milk for clarification.',
        'Let curds form, then fine strain through coffee filter.',
        'Serve over ice or up in coupe.',
        'Garnish with lemon oil.',
      ],
    },
    var_nitro_espresso_martini: {
      time: '7 min',
      ingredients: [
        '1 1/2 oz vodka',
        '1 oz fresh espresso',
        '3/4 oz coffee liqueur',
        '1/4 oz simple syrup',
        'Nitro charger system',
      ],
      instructions: [
        'Shake ingredients hard with ice.',
        'Fine strain into nitro vessel and charge.',
        'Dispense into chilled coupe.',
        'Finish with espresso crema and coffee bean garnish.',
      ],
    },
    var_oleo_saccharum_daiquiri: {
      time: '8 min',
      ingredients: [
        '2 oz white rum',
        '3/4 oz lime juice',
        '1/2 oz oleo saccharum syrup',
        '1/4 oz simple syrup (optional)',
      ],
      instructions: [
        'Add all ingredients to shaker with ice.',
        'Shake until cold and diluted.',
        'Double strain into chilled coupe.',
        'Adjust sweetness with simple if needed.',
      ],
    },
    var_split_base_negroni: {
      time: '5 min',
      ingredients: [
        '3/4 oz gin',
        '3/4 oz mezcal or aged rum',
        '1 oz sweet vermouth',
        '1 oz Campari',
        'Orange peel',
      ],
      instructions: [
        'Add all liquid ingredients to mixing glass with ice.',
        'Stir until chilled.',
        'Strain over large cube in rocks glass.',
        'Express orange peel and garnish.',
      ],
    },
    var_aged_manhattan: {
      time: '5 min',
      ingredients: [
        '2 oz barrel-aged Manhattan blend',
        '1 dash Angostura bitters',
        '1 dash orange bitters',
        'Brandied cherry',
      ],
      instructions: [
        'Stir blend and bitters with ice.',
        'Strain into chilled coupe.',
        'Garnish with brandied cherry.',
        'If needed, add 1/4 oz water to open aromatics.',
      ],
    },
    var_fermented_pineapple_margarita: {
      time: '7 min',
      ingredients: [
        '1 1/2 oz tequila',
        '1/2 oz mezcal',
        '3/4 oz lime juice',
        '3/4 oz fermented pineapple syrup',
        'Pinch of salt',
      ],
      instructions: [
        'Shake all ingredients with ice.',
        'Double strain over fresh ice.',
        'Add pinch of salt to sharpen fruit.',
        'Garnish with pineapple leaf or lime wheel.',
      ],
    },
    var_winter_spiced_negroni: {
      time: '5 min',
      ingredients: [
        '1 oz gin',
        '1 oz Campari',
        '1 oz spiced sweet vermouth',
        'Orange peel',
        'Optional star anise',
      ],
      instructions: [
        'Stir gin, Campari, and spiced vermouth with ice.',
        'Strain over large cube.',
        'Express orange peel.',
        'Optional: torch star anise briefly for aroma.',
      ],
    },
    var_summer_berry_daiquiri: {
      time: '5 min',
      ingredients: [
        '2 oz white rum',
        '3/4 oz lime juice',
        '1/2 oz berry syrup',
        '1/4 oz simple syrup',
        'Fresh berries',
      ],
      instructions: [
        'Shake ingredients with ice.',
        'Double strain into chilled coupe.',
        'Taste and adjust acid-sweet balance.',
        'Garnish with fresh berry.',
      ],
    },
  };
  const discoverVariationRecipes = useMemo(() => {
    const unlockedSet = new Set(unlockedVaultItems || []);
    return cocktailVariations
      .filter((variation) => unlockedSet.has(variation.id))
      .map((variation) => {
        const baseRecipeId = variation.baseClassicId.replace(/_/g, '-');
        const candidateIds = VARIATION_BASE_RECIPE_ALIASES[variation.baseClassicId] || [
          baseRecipeId,
        ];
        const baseRecipe = ALL_COCKTAILS.find((cocktail) => candidateIds.includes(cocktail.id));
        const override = VARIATION_DETAIL_OVERRIDES[variation.id];
        const difficultyLabel =
          variation.difficulty === 'technique_forward'
            ? 'Technique-Forward'
            : variation.difficulty === 'pro'
              ? 'Pro'
              : 'Simple';

        return {
          id: variation.id,
          name: variation.title,
          title: variation.title,
          subtitle: `Vault Variation • ${difficultyLabel}`,
          description: variation.shortDescription,
          image: getVaultVariationThumbnail(variation.id),
          difficulty: difficultyLabel,
          time: override?.time || baseRecipe?.time || '5 min',
          rating: baseRecipe?.rating || 4.8,
          category: 'Variations',
          tags: ['variation', ...(variation.tags || [])],
          ingredients: override?.ingredients?.length
            ? override.ingredients
            : baseRecipe?.ingredients || [],
          instructions: override?.instructions?.length
            ? override.instructions
            : baseRecipe?.instructions || [variation.shortDescription],
          glassware: baseRecipe?.glassware || 'Coupe',
          sourceRecipeId: baseRecipe?.id || baseRecipeId,
          isVaultVariation: true,
          baseClassicId: baseRecipeId,
        };
      });
  }, [unlockedVaultItems, ALL_COCKTAILS]);
  const DISCOVER_COCKTAILS = useMemo(
    () => [...discoverVariationRecipes, ...ALL_COCKTAILS],
    [discoverVariationRecipes, ALL_COCKTAILS],
  );

  // AI recipe handler
  const handleAiRecipeFound = useCallback((recipe: FormattedRecipe) => {
    setCurrentAiRecipe(recipe);
    setAiRecipeModalVisible(true);
  }, []);

  const handleSaveAiRecipe = useCallback(
    async (recipe: FormattedRecipe) => {
      try {
        // Save AI recipe to user's local store
        const { addRecipe } = useUserRecipes.getState();

        await addRecipe({
          name: recipe.title,
          type: 'ai_generated',
          description: recipe.description || 'AI-generated cocktail recipe',
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || [],
          image:
            'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=240&h=160&fit=crop',
          tags: recipe.tags || [],
        });

        log.info('RecipesScreen', 'AI recipe saved successfully', { title: recipe.title });

        // Refresh the recipes list to show the new recipe
        loadRecipes();
      } catch (error) {
        log.error('RecipesScreen', 'Error saving AI recipe', error, { title: recipe.title });
        showToast('Failed to save AI recipe', 'error');
      }
    },
    [loadRecipes],
  );

  // Handlers for ForYouFeed component
  const handleCocktailPress = useCallback(
    (cocktail: any) => {
      navigation.navigate('CocktailDetail', { cocktailId: cocktail.id });
    },
    [navigation],
  );

  const handleSaveRecipe = useCallback(
    (cocktail: any) => {
      const wasSaved = isCocktailSaved(cocktail.id);

      // Soft cap: FREE can save first 5 cocktails, 6th save triggers T3 paywall.
      if (!wasSaved && !canSaveMoreCocktails) {
        saveGate('T3');
        return;
      }

      const cocktailData = {
        id: cocktail.id,
        name: cocktail.name || cocktail.title || 'Untitled Recipe',
        subtitle: cocktail.description || cocktail.subtitle || '',
        image: getCocktailImage(cocktail.id, cocktail.image),
      };
      const result = toggleSavedCocktail(cocktailData);
      if (result === 'limit_reached') {
        saveGate('T3');
        return;
      }
      showToast(wasSaved ? 'Removed from saved' : 'Saved!', 'success');

      // After 5th successful save on FREE tier, soft-nudge toward Plus
      if (!wasSaved && tier === 'FREE' && result === 'success') {
        const newCount = (savedCocktailCount || 0) + 1;
        if (newCount === FREE_RECIPE_LIMIT) {
          saveGate('T3b');
        }
      }
    },
    [
      toggleSavedCocktail,
      isCocktailSaved,
      showToast,
      saveGate,
      canSaveMoreCocktails,
      tier,
      savedCocktailCount,
    ],
  );

  const handleAddToGroceryList = useCallback((cocktail: any) => {
    setSelectedRecipe(cocktail);
    setGroceryListVisible(true);
  }, []);

  const isRecipeVisibleInSearch = useCallback((recipe: any) => {
    return true;
  }, []);

  const getRecipeUnlockHint = useCallback(
    (recipe: any) => {
      if (!recipe?.id) return 'Unlock to view the full recipe';

      if (recipe.isVaultVariation) {
        return 'Unlock in Vault';
      }

      const curriculumUnlock = getCurriculumUnlockForRecipeId(recipe.id);
      if (curriculumUnlock) {
        const lesson = curriculumData.lessons.find(
          (entry) => entry.id === curriculumUnlock.lessonId,
        );
        return lesson ? `Unlock in ${lesson.title}` : `Unlock in ${curriculumUnlock.lessonId}`;
      }

      const xpCost = getCocktailCost(recipe.id);
      if (xpCost > 0) {
        return `Unlock with ${xpCost} XP or KOOPE+`;
      }

      return 'Unlock with KOOPE+';
    },
    [getCocktailCost],
  );

  // Get saved recipe IDs for ForYouFeed (as a Set for efficient lookup)
  const savedRecipeIds = useMemo(() => {
    const cocktails = savedItems.savedCocktails || [];
    return new Set(cocktails.map((item: any) => item.id));
  }, [savedItems]);

  // Search functionality with debouncing — searches DISCOVER_COCKTAILS directly
  // so vault variations and all cocktails are always reachable, with no result cap.
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (query.trim().length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      searchTimeoutRef.current = setTimeout(() => {
        try {
          const queryLower = query.toLowerCase().trim();
          const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 0);

          const scored = DISCOVER_COCKTAILS.filter(
            (cocktail) => cocktail.category?.toLowerCase() !== 'syrups',
          )
            .filter(isRecipeVisibleInSearch)
            .map((cocktail) => {
              const name = (cocktail.name || '').toLowerCase();
              const description = (cocktail.description || '').toLowerCase();
              const ingredientText = ingredientListToSearchText(
                cocktail.ingredients || [],
              ).toLowerCase();
              const tags = (cocktail.tags || []).join(' ').toLowerCase();
              // Every typed word must appear together in ONE field (name, or
              // ingredients, or tags, or description) — not just any single
              // word landing anywhere across the four fields OR'd together.
              // The old logic required only one term to match anywhere in the
              // combined blob, so e.g. searching "Rum Punch" would surface any
              // rum cocktail with no relation to "punch". There's also no
              // catch-all inclusion anymore (the old `else score += 10`) — a
              // cocktail that doesn't fully match on any single field is
              // excluded, not just ranked last.
              let score = 0;
              if (name === queryLower) score = 100;
              else if (name.startsWith(queryLower)) score = 80;
              else if (name.includes(queryLower)) score = 60;
              else if (queryTerms.every((term) => name.includes(term))) score = 55;
              else if (queryTerms.every((term) => ingredientText.includes(term))) score = 40;
              else if (queryTerms.every((term) => tags.includes(term))) score = 30;
              else if (queryTerms.every((term) => description.includes(term))) score = 20;
              else return null;

              return { cocktail, score };
            })
            .filter((item): item is { cocktail: any; score: number } => item !== null)
            .sort((a, b) => b.score - a.score)
            .map((item) => item.cocktail);

          setSearchResults(scored);
        } catch (error) {
          log.error('RecipesScreen', 'Search error', error, { query });
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 400);
    },
    [DISCOVER_COCKTAILS, isRecipeVisibleInSearch],
  );

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Hide tab bar while searching + focus input after overlay mounts.
  // Focus and the tab-bar-hide used to fire in the same tick (focus merely
  // delayed 50ms). Hiding the tab bar changes this screen's layout height at
  // roughly the same moment the keyboard's own ~250ms show animation is
  // still in flight — on some devices, typing the first character while that
  // animation is still settling caused iOS to treat it as an interrupted
  // gesture and dismiss the keyboard. Focusing immediately (the ref is
  // already attached by the time an effect runs, since effects fire after
  // commit) and pushing the tab-bar layout change out past the keyboard's own
  // animation window keeps the two from competing for the same frame.
  useEffect(() => {
    const tabNavigator = navigation.getParent();
    if (showSearchInput) {
      searchInputRef.current?.focus();
      const hideTabBarTimer = setTimeout(() => {
        tabNavigator?.setOptions({ tabBarStyle: { display: 'none' } });
      }, 300);
      return () => clearTimeout(hideTabBarTimer);
    } else {
      tabNavigator?.setOptions({
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: 'transparent' },
      });
      return undefined;
    }
  }, [showSearchInput]);

  // Tonight's Pick rail — inventory-aware recommendations for Browse mode,
  // all tiers. Uses useFocusEffect (not a plain mount effect) so the rail
  // silently refreshes when the user returns to this tab after scanning a
  // bottle elsewhere. tonightsPickLoaded is only reset by the initial state,
  // never back to false on refetch, so a returning user doesn't see a flicker.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const result = await getTonightsPick({
          userId: user?.id,
          profile,
          savedItems,
          allCocktails: ALL_COCKTAILS,
          limit: 10,
        });
        if (!cancelled) {
          setTonightsPick(result.recommendations);
          setTonightsPickHasInventory(result.hasInventory);
          setTonightsPickLoaded(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.id, profile, savedItems, ALL_COCKTAILS]),
  );

  // Load personalized recommendations when switching to "For You" mode
  useEffect(() => {
    if (viewMode !== 'personalized') {
      return undefined;
    }

    let cancelled = false;

    const loadPersonalizedRecommendations = async () => {
      try {
        const formattedSections: {
          title: string;
          reason: string;
          cocktails: any[];
        }[] = [];

        if (tier === 'PRO') {
          const loadedProfile = user?.id ? await loadUserProfile(user.id).catch(() => null) : null;
          const enhancedProfile =
            loadedProfile || buildEnhancedProfileFallback(user?.id, profile, savedItems);
          // Only reached if even the DB load failed — buildTasteProfileFromPersonalization
          // used to fall back to the old 0-100 store here, which no longer has any
          // bearing on taste. Fall back to the same flat neutral prior
          // tasteVectorService seeds new users with instead.
          enhancedProfile.tasteProfile = enhancedProfile.tasteProfile || {
            flavorWeights: Object.fromEntries(CANONICAL_FLAVORS.map((f) => [f, 0.3])) as Record<
              (typeof CANONICAL_FLAVORS)[number],
              number
            >,
            spiritWeights: Object.fromEntries(CANONICAL_SPIRITS.map((s) => [s, 0.25])) as Record<
              Spirit,
              number
            >,
            preferredABV: { min: 0, max: 40 },
            preferredComplexity: 0.5,
          };

          let inventoryBottles: any[] = [];
          if (user?.id) {
            const userInventory = await InventoryService.getUserInventory(user.id);
            inventoryBottles = userInventory.map((item: any) =>
              toBottle(item, {
                subcategory: item.subcategory || undefined,
                brand: item.brand || undefined,
                abv: item.abv || undefined,
                volume: item.volume || undefined,
                quantity: (item.quantity as any) || 'full',
                isFavorite: item.is_favorite || false,
                notes: item.notes || undefined,
                expiryDate: item.expiry_date || undefined,
                scanCount: item.scan_count || 1,
              }),
            );
          }

          // Hydrate rather than initialize — initializeTasteGraph() re-stamps all
          // timestamps as "now", which disables decay and confidence entirely.
          const tasteGraph = hydrateTasteGraph(enhancedProfile.tasteProfile)!;
          const predictions = getPredictiveRecommendations(
            ALL_COCKTAILS as any,
            enhancedProfile as any,
            tasteGraph,
            {
              timeOfDay: detectTimeOfDay(),
              season: detectSeason(),
              inventory: inventoryBottles,
              recentScans: inventoryBottles.slice(0, 5),
            },
            18,
          );

          const topPredictions = uniqueById(predictions.slice(0, 8));
          const makeTonight = uniqueById(
            predictions
              .filter((item) => item.signals?.some((signal) => signal.source === 'inventoryMatch'))
              .slice(0, 6),
          );
          const useYourBar = uniqueById(
            predictions
              .filter((item) =>
                item.signals?.some(
                  (signal) =>
                    signal.source === 'recentScans' || signal.source === 'quantityUrgency',
                ),
              )
              .slice(0, 6),
          );

          if (topPredictions.length > 0) {
            formattedSections.push({
              title: 'Top Picks For You',
              reason: 'Predicted from your palate, scans, and inventory.',
              cocktails: topPredictions,
            });
          }

          if (makeTonight.length > 0) {
            formattedSections.push({
              title: 'Make Tonight',
              reason: 'High-fit recommendations based on what you already have.',
              cocktails: makeTonight,
            });
          }

          if (useYourBar.length > 0) {
            formattedSections.push({
              title: 'Use Your Bottles',
              reason: 'Suggestions boosted by recent scans and inventory context.',
              cocktails: useYourBar,
            });
          }
        } else {
          // PLUS tier — was getFeaturedCocktails()/getPersonalizedMoodOrder(),
          // both fed by usePersonalization's separate, cruder scoring engine
          // (built from a handful of onboarding-survey answers). Nothing has
          // written to that engine's inputs since this session's taste-model
          // cleanup, so both silently went flat/empty. Reuses tasteMatchScores
          // instead — already computed above from the same canonical model
          // driving PRO's recommendations, not a second system.
          const featured = [...allRecipes]
            .filter((r) => (tasteMatchScores[r.id] ?? 0) > 0)
            .sort((a, b) => (tasteMatchScores[b.id] ?? 0) - (tasteMatchScores[a.id] ?? 0));

          if (featured.length > 0) {
            formattedSections.push({
              title: 'Top Picks For You',
              reason: 'Based on your palate and preferences',
              cocktails: featured.slice(0, 8),
            });
          }

          const moodOrder = COCKTAIL_MOODS.map((mood) => {
            const scores = mood.cocktails
              .map((id) => tasteMatchScores[id])
              .filter((score): score is number => typeof score === 'number');
            const avgScore = scores.length
              ? scores.reduce((sum, s) => sum + s, 0) / scores.length
              : 0;
            return { mood, avgScore };
          })
            .filter((entry) => entry.avgScore > 0)
            .sort((a, b) => b.avgScore - a.avgScore)
            .slice(0, 3);

          moodOrder.forEach(({ mood }) => {
            const cocktails = mood.cocktails
              .slice(0, 6)
              .map((id) => ALL_COCKTAILS.find((c) => c.id === id))
              .filter(Boolean);

            if (cocktails.length > 0) {
              formattedSections.push({
                title: `${mood.title} Favorites`,
                reason: `Based on your preference for ${mood.title.toLowerCase()} cocktails`,
                cocktails,
              });
            }
          });
        }

        if (formattedSections.length === 0) {
          const topRated = [...ALL_COCKTAILS]
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 8);

          if (topRated.length > 0) {
            formattedSections.push({
              title: 'Popular Picks',
              reason: 'Highly rated cocktails to try',
              cocktails: topRated,
            });
          }
        }

        if (!cancelled) {
          setPersonalizedRecommendations(formattedSections);
        }
      } catch (error) {
        log.error('RecipesScreen', 'Error loading personalized recommendations', error);
        if (!cancelled) {
          setPersonalizedRecommendations([]);
        }
      }
    };

    loadPersonalizedRecommendations();

    return () => {
      cancelled = true;
    };
  }, [viewMode, tier, user?.id, profile, savedItems, ALL_COCKTAILS, allRecipes, tasteMatchScores]);

  // Get current displayed recipes
  const getCurrentRecipes = () => {
    const toFilterArray = (value?: string[] | string): string[] => {
      if (Array.isArray(value)) return value.filter(Boolean);
      if (typeof value === 'string' && value.trim()) return [value.trim()];
      return [];
    };

    if (searchQuery.trim()) {
      return searchResults;
    }

    // Apply current filters to ALL_COCKTAILS
    let recipes = [...DISCOVER_COCKTAILS];

    // Filter by ingredients/spirits
    const selectedIngredients = toFilterArray(currentFilters.ingredients);
    if (selectedIngredients.length > 0) {
      recipes = recipes.filter((recipe) => {
        const recipeText =
          `${recipe.name} ${recipe.subtitle || ''} ${recipe.description || ''} ${ingredientListToSearchText(recipe.ingredients || [])}`.toLowerCase();
        return selectedIngredients.some((ingredient) =>
          recipeText.includes(ingredient.toLowerCase()),
        );
      });
    }

    // Filter by difficulty
    const selectedDifficulties = toFilterArray(
      currentFilters.difficulty ?? currentFilters.difficulties,
    );
    if (selectedDifficulties.length > 0) {
      recipes = recipes.filter((recipe) => {
        const recipeDifficulty = recipe.difficulty?.toLowerCase();
        return selectedDifficulties.some((diff) => diff === recipeDifficulty);
      });
    }

    // Filter by category (with fuzzy helpers for missing metadata)
    const selectedCategories = toFilterArray(currentFilters.category ?? currentFilters.categories);
    if (selectedCategories.length > 0) {
      recipes = recipes.filter((recipe) => {
        const recipeCategory = recipe.category?.toLowerCase();
        const recipeSubtitle = recipe.subtitle?.toLowerCase() || '';
        const recipeDescription = recipe.description?.toLowerCase() || '';
        const ingredientText = ingredientListToSearchText(recipe.ingredients || []).toLowerCase();

        return selectedCategories.some((cat) => {
          const categoryLower = cat.toLowerCase();
          if (categoryLower === 'variations') {
            return !!recipe.isVaultVariation || recipeCategory === 'variations';
          }
          if (categoryLower === 'mocktails') {
            return isMocktail(recipe);
          }
          if (categoryLower === 'fizzy') {
            const fizzyHits = [
              'soda',
              'sparkling',
              'tonic',
              'club soda',
              'seltzer',
              'prosecco',
              'champagne',
              'cava',
            ];
            return (
              recipeCategory === 'fizzy' ||
              fizzyHits.some((k) => ingredientText.includes(k) || recipeDescription.includes(k))
            );
          }
          // Check if category matches the recipe's category field or appears in subtitle/description
          return (
            recipeCategory === categoryLower ||
            recipeSubtitle.includes(categoryLower) ||
            recipeDescription.includes(categoryLower)
          );
        });
      });
    }

    if (browseQuickFilter === 'variations') {
      recipes = recipes.filter(
        (recipe) => !!recipe.isVaultVariation || recipe.category?.toLowerCase() === 'variations',
      );
    }

    // Filter by mood
    const selectedMoods = toFilterArray(currentFilters.mood);
    if (selectedMoods.length > 0) {
      recipes = recipes.filter((recipe) => {
        // Find which moods this recipe belongs to
        const recipeMoods = COCKTAIL_MOODS.filter((moodCategory) =>
          moodCategory.cocktails.includes(recipe.id),
        ).map((m) => m.title);

        // Check if recipe belongs to any of the selected moods
        return selectedMoods.some((selectedMood) => recipeMoods.includes(selectedMood));
      });
    }

    // Filter by unlocked status (only applies for FREE tier)
    if (showOnlyUnlocked && tier === 'FREE') {
      recipes = recipes.filter((recipe) => {
        const isUnlockedVariation = unlockedVaultItems?.includes(recipe.id);
        if (isUnlockedVariation) return true;
        const isTierAccessible = isCocktailAccessible(recipe.id, tier);
        const isXPUnlocked = isCocktailUnlockedWithXP(recipe.id);
        const isEngagementUnlocked = isRecipeUnlockedWithEngagement(recipe.id);
        return isTierAccessible || isXPUnlocked || isEngagementUnlocked;
      });
    }

    // Sort recipes
    if ((currentFilters.sortOrder as string | undefined) === 'taste-match' && tier !== 'FREE') {
      recipes = recipes.sort(
        (a, b) => (tasteMatchScores[b.id] ?? 0) - (tasteMatchScores[a.id] ?? 0),
      );
    } else if (currentFilters.sortOrder === 'alphabetical-asc') {
      recipes = recipes.sort((a, b) => a.name.localeCompare(b.name));
    } else if (currentFilters.sortOrder === 'alphabetical-desc') {
      recipes = recipes.sort((a, b) => b.name.localeCompare(a.name));
    } else if (currentFilters.sortOrder === 'rating-desc') {
      recipes = recipes.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (currentFilters.sortOrder === 'rating-asc') {
      recipes = recipes.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    }

    return recipes;
  };

  useEffect(() => {
    loadRecipes();
  }, []);

  const renderRecipeItem: ListRenderItem<any> = ({ item, index }) => {
    // Check if this cocktail is accessible for current tier, unlocked with XP, or unlocked with engagement
    const isTierAccessible = isCocktailAccessible(item.id, tier);
    const isXPUnlocked = isCocktailUnlockedWithXP(item.id);
    const isEngagementUnlocked = isRecipeUnlockedWithEngagement(item.id);
    const isUnlockedVariation = unlockedVaultItems?.includes(item.id);
    const isAccessible =
      isUnlockedVariation || isTierAccessible || isXPUnlocked || isEngagementUnlocked;

    // If locked, show LockedRecipeCard with unlock context
    if (!isAccessible) {
      const xpCost = getCocktailCost(item.id);
      const canAfford = canAffordCocktail(item.id);

      const handleUpgradePress = () => {
        // Show unlock sheet with XP and subscription options
        setSelectedCocktailForUnlock(item);
        setUnlockSheetVisible(true);
      };

      return (
        <Animated.View entering={FadeInDown.delay((index || 0) * 80).duration(500)}>
          <LockedRecipeCard
            image={typeof item.image === 'string' ? { uri: item.image } : item.image}
            onPress={handleUpgradePress}
            style={{ width: (width - spacing(2) * 2 - GUTTER) / 2, marginBottom: spacing(2) }}
            xpCost={tier === 'FREE' ? xpCost : undefined}
            canAfford={canAfford}
            title={item.name || item.title}
            subtitle={searchQuery.trim() ? getRecipeUnlockHint(item) : undefined}
          />
        </Animated.View>
      );
    }

    // If accessible, show normal RecipeCard
    const cardProps = createRecipeCardProps(item, navigation, {
      toggleSavedCocktail,
      isCocktailSaved,
      setSelectedRecipe,
      setGroceryListVisible,
      showToast,
      showSaveButton: false,
      showCartButton: false,
      showDeleteButton: false,
    });
    if (item.isVaultVariation) {
      cardProps.onPress = () => {
        navigation.navigate('CocktailDetail', { cocktailId: item.id, cocktail: item } as any);
      };
    }

    const matchScore = tasteMatchScores[item.id] ?? 0;
    const showTasteMatchBadge = tier !== 'FREE' && matchScore >= 75;

    return (
      <Animated.View
        entering={FadeInDown.delay((index || 0) * 80).duration(500)}
        style={{ position: 'relative' }}
      >
        <RecipeCard
          {...cardProps}
          style={{ width: (width - spacing(2) * 2 - GUTTER) / 2, marginBottom: spacing(2) }}
        />
        {showTasteMatchBadge && (
          <View style={tasteMatchBadgeStyle}>
            <Ionicons name="heart" size={10} color={colors.gold} />
            <Text style={tasteMatchBadgeTextStyle}>Matches your taste</Text>
          </View>
        )}
      </Animated.View>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    const currentRecipes = getCurrentRecipes() || [];
    const toFilterArray = (value?: string[] | string): string[] => {
      if (Array.isArray(value)) return value.filter(Boolean);
      if (typeof value === 'string' && value.trim()) return [value.trim()];
      return [];
    };
    const hasFilters =
      toFilterArray(currentFilters.ingredients).length > 0 ||
      toFilterArray(currentFilters.difficulty ?? currentFilters.difficulties).length > 0 ||
      toFilterArray(currentFilters.category ?? currentFilters.categories).length > 0 ||
      toFilterArray(currentFilters.mood).length > 0;

    if (searchQuery.trim()) {
      return (
        <EmptyState
          icon="magnify"
          title="No Results Found"
          message={`No cocktails found for "${searchQuery}". Try a different search term.`}
          actionLabel="Clear Search"
          onAction={() => setSearchQuery('')}
        />
      );
    }

    if (hasFilters && currentRecipes.length === 0) {
      return (
        <EmptyState
          icon="filter-off"
          title="No Matching Cocktails"
          message="No cocktails match your current filters. Try adjusting your filter settings."
          actionLabel="Clear Filters"
          onAction={() => {
            setCurrentFilters({
              ingredients: [],
              difficulty: [],
              category: [],
              mood: [],
              sortOrder: 'alphabetical-asc',
            });
          }}
        />
      );
    }

    return null;
  };

  // Show loading state while recipes load
  if (recipesLoading) {
    const skeletonCardWidth = (width - spacing(2) * 2 - GUTTER) / 2;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="light" />
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            paddingHorizontal: spacing(2),
            paddingTop: spacing(2),
            gap: GUTTER,
          }}
        >
          {[...Array(8)].map((_, i) => (
            <RecipeCardSkeleton key={i} style={{ width: skeletonCardWidth }} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <MainPageHeader
        title="Discover"
        subtitle="Cocktails & recipes"
        rightActions={[
          {
            icon: 'add',
            onPress: () => navigation.navigate('AddRecipe'),
            accessibilityLabel: 'Add new recipe',
          },
        ]}
      />
      <FlatList
        data={!showSearchInput && viewMode === 'browse' ? getCurrentRecipes() || [] : []}
        keyExtractor={(item) => item.id}
        renderItem={renderRecipeItem}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={onScrollHaptic}
        contentContainerStyle={{ paddingBottom: spacing(8), flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListHeaderComponent={
          showSearchInput ? null : (
            <View>
              {/* View Mode Toggle */}
              {
                <Animated.View
                  entering={FadeIn.duration(400)}
                  style={{
                    marginHorizontal: spacing(2),
                    marginTop: spacing(2),
                    marginBottom: spacing(1.5),
                    flexDirection: 'row',
                    backgroundColor: colors.card,
                    borderRadius: radii.lg,
                    padding: 4,
                  }}
                >
                  <Pressable
                    onPress={withHaptic(() => setViewMode('browse'), 'selection')}
                    style={{
                      flex: 1,
                      paddingVertical: spacing(1),
                      borderRadius: radii.md,
                      backgroundColor: viewMode === 'browse' ? colors.accent : 'transparent',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: viewMode === 'browse' ? colors.bg : colors.muted,
                        fontWeight: viewMode === 'browse' ? '700' : '600',
                        fontSize: 15,
                      }}
                    >
                      Browse
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={withHaptic(() => setViewMode('personalized'), 'selection')}
                    style={{
                      flex: 1,
                      paddingVertical: spacing(1),
                      borderRadius: radii.md,
                      backgroundColor: viewMode === 'personalized' ? colors.accent : 'transparent',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: viewMode === 'personalized' ? colors.bg : colors.muted,
                        fontWeight: viewMode === 'personalized' ? '700' : '600',
                        fontSize: 15,
                      }}
                    >
                      For You
                    </Text>
                  </Pressable>
                </Animated.View>
              }

              {/* Simplified Search/Filter Row - Hidden by default, accessible via header icons */}

              {/* Browse All Content */}
              {viewMode === 'browse' && (
                <>
                  {/* Only show featured content when not searching */}
                  {!searchQuery.trim() && (
                    <>
                      {/* What Can I Make — ported from the retired HomeScreen */}
                      <TouchableOpacity
                        style={{
                          backgroundColor: colors.card,
                          borderRadius: radii.lg,
                          borderWidth: 1,
                          borderColor: colors.gold,
                          marginHorizontal: spacing(2),
                          marginTop: spacing(1),
                          marginBottom: spacing(3),
                          padding: spacing(2.5),
                        }}
                        onPress={() => whatCanIMakeGate(() => navigation.navigate('WhatCanIMake'))}
                        activeOpacity={0.82}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, minWidth: 0, paddingRight: spacing(2) }}>
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '700',
                                color: colors.gold,
                                letterSpacing: 1,
                                textTransform: 'uppercase',
                                marginBottom: spacing(0.75),
                              }}
                            >
                              Your Bar
                            </Text>
                            <Text
                              style={{
                                fontSize: 22,
                                fontWeight: '700',
                                color: colors.text,
                                fontFamily: serif,
                                lineHeight: 27,
                                marginBottom: spacing(1),
                              }}
                            >
                              What can I make tonight?
                            </Text>
                            <Text
                              style={{
                                fontSize: 13,
                                color: colors.subtext,
                                marginBottom: spacing(2),
                              }}
                            >
                              Ideas based on what's in your bar.
                            </Text>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                alignSelf: 'flex-start',
                                backgroundColor: colors.gold,
                                borderRadius: radii.pill,
                                paddingHorizontal: spacing(2.5),
                                paddingVertical: spacing(1.25),
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: '700',
                                  color: colors.goldText,
                                }}
                              >
                                See Matches
                              </Text>
                            </View>
                          </View>
                          <Image
                            source={getCocktailImage('old-fashioned')}
                            style={{
                              width: 90,
                              height: 90,
                              borderRadius: radii.md,
                              flexShrink: 0,
                            }}
                            resizeMode="cover"
                          />
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={colors.gold}
                          style={{ position: 'absolute', right: spacing(2), bottom: spacing(2) }}
                        />
                      </TouchableOpacity>

                      {/* Tonight's Pick — inventory-aware, all tiers */}
                      {!tonightsPickLoaded ? (
                        <>
                          <SectionHeader title="Tonight's Pick" />
                          <ScrollView
                            horizontal
                            nestedScrollEnabled
                            showsHorizontalScrollIndicator={false}
                            style={{ paddingLeft: spacing(2), marginBottom: spacing(2) }}
                          >
                            {[0, 1, 2].map((i) => (
                              <RecipeCardSkeleton key={i} style={{ width: 240, marginRight: 16 }} />
                            ))}
                          </ScrollView>
                        </>
                      ) : !tonightsPickHasInventory ? (
                        <>
                          <SectionHeader title="Tonight's Pick" />
                          <TouchableOpacity
                            style={{
                              width: '100%',
                              backgroundColor: colors.card,
                              borderRadius: radii.lg,
                              borderWidth: 1,
                              borderColor: colors.gold,
                              marginHorizontal: spacing(2),
                              marginBottom: spacing(3),
                            }}
                            onPress={() => navigation.navigate('Camera' as any)}
                            activeOpacity={0.82}
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: spacing(2.5),
                                paddingVertical: spacing(2),
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 15,
                                  fontWeight: '600',
                                  color: colors.text,
                                  flex: 1,
                                }}
                              >
                                Scan a bottle to unlock Tonight's Pick
                              </Text>
                              <Ionicons name="chevron-forward" size={20} color={colors.gold} />
                            </View>
                          </TouchableOpacity>
                        </>
                      ) : tonightsPick.length > 0 ? (
                        <>
                          <SectionHeader title="Tonight's Pick" />
                          <ScrollView
                            horizontal
                            nestedScrollEnabled
                            showsHorizontalScrollIndicator={false}
                            style={{ paddingLeft: spacing(2), marginBottom: spacing(2) }}
                          >
                            {tonightsPick.map((cocktail, index) => {
                              const cardProps = createRecipeCardProps(cocktail, navigation, {
                                toggleSavedCocktail,
                                isCocktailSaved,
                                setSelectedRecipe,
                                setGroceryListVisible,
                                showToast,
                                showSaveButton: false,
                                showCartButton: false,
                                showDeleteButton: false,
                              });
                              return (
                                <Animated.View
                                  key={cocktail.id}
                                  entering={FadeInRight.delay(index * 100).duration(500)}
                                >
                                  <RecipeCard
                                    {...cardProps}
                                    style={{ width: 240, marginRight: 16 }}
                                  />
                                </Animated.View>
                              );
                            })}
                          </ScrollView>
                        </>
                      ) : null}

                      {/* Vault — discovery rail into the Vault stack screen */}
                      {vaultRailItems.length > 0 && (
                        <>
                          <SectionHeader
                            title="Vault"
                            onPress={() => navigation.navigate('Vault')}
                          />
                          <ScrollView
                            horizontal
                            nestedScrollEnabled
                            showsHorizontalScrollIndicator={false}
                            style={{ paddingLeft: spacing(2), marginBottom: spacing(2) }}
                          >
                            {vaultRailItems.map(({ item, kind, isUnlocked }, index) => {
                              // Hacks ship without art, so they borrow the same
                              // placeholder photo VaultScreen uses for them.
                              const image =
                                kind === 'variation'
                                  ? getVaultVariationThumbnail(item.id)
                                  : kind === 'playbook'
                                    ? getVaultPlaybookThumbnail(item.id)
                                    : { uri: VAULT_HACK_PLACEHOLDER_IMAGE };
                              const levelLabel = item.requiredTier
                                ? `Level ${item.requiredLevel} · ${item.requiredTier}`
                                : `Level ${item.requiredLevel}`;
                              return (
                                <Animated.View
                                  key={item.id}
                                  entering={FadeInRight.delay(index * 100).duration(500)}
                                >
                                  <VaultRailCard
                                    image={image}
                                    title={item.title}
                                    levelLabel={levelLabel}
                                    isUnlocked={isUnlocked}
                                    onPress={() => navigation.navigate('Vault')}
                                    style={{ marginRight: 16 }}
                                  />
                                </Animated.View>
                              );
                            })}
                          </ScrollView>
                        </>
                      )}

                      {/* Cocktail of the Week */}
                      <View style={{ marginTop: spacing(1) }}>
                        <HeroCard
                          cocktail={COCKTAIL_OF_THE_WEEK}
                          onPress={withHaptic(() =>
                            navigation.navigate('CocktailDetail', {
                              cocktailId: COCKTAIL_OF_THE_WEEK.id,
                            }),
                          )}
                        />
                      </View>

                      {/* Shots */}
                      <SectionHeader
                        title="Shots"
                        onPress={() => {
                          // Ensure we only pass string IDs
                          const shotIds = ALL_SHOTS.map((shot) => shot.id).filter(
                            (id) => typeof id === 'string',
                          );
                          bringToPartyGate('T8', () => {
                            navigation.navigate('CocktailList', {
                              title: 'Shots',
                              cocktailIds: shotIds,
                              category: 'shots',
                            });
                          });
                        }}
                      />
                      <ScrollView
                        horizontal
                        nestedScrollEnabled
                        showsHorizontalScrollIndicator={false}
                        style={{ paddingLeft: spacing(2), marginBottom: spacing(2) }}
                      >
                        {PARTY_SHOTS?.slice(0, 5).map((shot, index) => {
                          const cardProps = createRecipeCardProps(shot, navigation, {
                            toggleSavedCocktail,
                            isCocktailSaved,
                            setSelectedRecipe,
                            setGroceryListVisible,
                            showToast,
                            showSaveButton: false,
                            showCartButton: false,
                            showDeleteButton: false,
                          });
                          return (
                            <Animated.View
                              key={shot.id}
                              entering={FadeInRight.delay(index * 100).duration(500)}
                            >
                              <RecipeCard {...cardProps} style={{ width: 240, marginRight: 16 }} />
                            </Animated.View>
                          );
                        })}
                      </ScrollView>

                      {/* Mocktails */}
                      <SectionHeader
                        title="Mocktails"
                        onPress={() => {
                          navigation.navigate('CocktailList', {
                            title: 'Mocktails',
                            cocktailIds: ALL_MOCKTAILS.map((recipe) => recipe.id),
                            category: 'mocktails',
                          });
                        }}
                      />

                      {/* Mocktails Horizontal Scroll Preview */}
                      <ScrollView
                        horizontal
                        nestedScrollEnabled
                        showsHorizontalScrollIndicator={false}
                        style={{ paddingLeft: spacing(2), marginBottom: spacing(2) }}
                      >
                        {ALL_MOCKTAILS.slice(0, 6).map((mocktail, index) => {
                          const cardProps = createRecipeCardProps(mocktail, navigation, {
                            toggleSavedCocktail,
                            isCocktailSaved,
                            setSelectedRecipe,
                            setGroceryListVisible,
                            showToast,
                            showSaveButton: false,
                            showCartButton: false,
                            showDeleteButton: false,
                          });
                          return (
                            <Animated.View
                              key={mocktail.id}
                              entering={FadeInRight.delay(index * 100).duration(500)}
                            >
                              <RecipeCard {...cardProps} style={{ width: 240, marginRight: 16 }} />
                            </Animated.View>
                          );
                        })}
                      </ScrollView>

                      {/* Essential Syrups */}
                      <SectionHeader title="Essential Syrups" />
                      <ScrollView
                        horizontal
                        nestedScrollEnabled
                        showsHorizontalScrollIndicator={false}
                        style={{ paddingLeft: spacing(2), marginBottom: spacing(2) }}
                      >
                        {ESSENTIAL_SYRUPS.map((syrup, index) => {
                          const cardProps = createRecipeCardProps(syrup, navigation, {
                            toggleSavedCocktail,
                            isCocktailSaved,
                            setSelectedRecipe,
                            setGroceryListVisible,
                            showToast,
                            showSaveButton: true,
                            showCartButton: false,
                            showDeleteButton: false,
                          });
                          return (
                            <Animated.View
                              key={syrup.id}
                              entering={FadeInRight.delay(index * 100).duration(500)}
                              style={{
                                width: (width - spacing(2) * 2 - GUTTER) / 2,
                                marginRight: 16,
                              }}
                            >
                              <RecipeCard {...cardProps} />
                            </Animated.View>
                          );
                        })}
                      </ScrollView>

                      {/* My Recipes */}
                      <SectionHeader
                        title="My Recipes"
                        onPress={() => navigation.navigate('ProfileSavedItems' as any)}
                      />
                      <ScrollView
                        horizontal
                        nestedScrollEnabled
                        showsHorizontalScrollIndicator={false}
                        style={{ paddingLeft: spacing(2), marginBottom: spacing(2) }}
                      >
                        {userRecipes.length > 0 ? (
                          userRecipes.slice(0, 5).map((recipe, index) => {
                            const firstAmount = recipe.ingredients?.[0]?.amount?.trim?.() || '';
                            const amountLabel = firstAmount
                              ? /\b(oz|ml|dash|dashes|tsp|tbsp|cl|cup|part|parts)\b/i.test(
                                  firstAmount,
                                )
                                ? firstAmount
                                : `${firstAmount} oz`
                              : '';
                            // Convert UserRecipe to cocktail format for createRecipeCardProps
                            const cocktailData = {
                              id: recipe.id,
                              name: recipe.name,
                              subtitle: amountLabel
                                ? `${amountLabel} • ${recipe.type === 'ai_generated' ? 'AI Generated' : recipe.type === 'modified' ? 'Modified Recipe' : 'My Creation'}`
                                : recipe.type === 'ai_generated'
                                  ? 'AI Generated'
                                  : recipe.type === 'modified'
                                    ? 'Modified Recipe'
                                    : 'My Creation',
                              description: recipe.description || 'Custom recipe',
                              image:
                                recipe.thumbnailImage ||
                                recipe.headerImage ||
                                recipe.image ||
                                'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=240&h=160&fit=crop',
                              tags: recipe.tags || [],
                            };

                            const cardProps = createRecipeCardProps(cocktailData, navigation, {
                              toggleSavedCocktail,
                              isCocktailSaved,
                              setSelectedRecipe,
                              setGroceryListVisible,
                              showToast,
                              showSaveButton: false,
                              showCartButton: false,
                              showDeleteButton: false,
                            });

                            // Keep user-created recipes on the unified CocktailDetail template
                            cardProps.onPress = () => {
                              navigation.navigate('CocktailDetail', {
                                cocktailId: recipe.id,
                                cocktail: recipe,
                              } as any);
                            };

                            return (
                              <Animated.View
                                key={recipe.id}
                                entering={FadeInRight.delay(index * 100).duration(500)}
                              >
                                <RecipeCard
                                  {...cardProps}
                                  style={{ width: 240, marginRight: 16 }}
                                />
                              </Animated.View>
                            );
                          })
                        ) : (
                          <Pressable
                            style={{
                              width: 240,
                              height: 160,
                              marginRight: 16,
                              backgroundColor: colors.card,
                              borderRadius: radii.lg,
                              justifyContent: 'center',
                              alignItems: 'center',
                              borderWidth: 2,
                              borderColor: colors.border,
                              borderStyle: 'dashed',
                            }}
                            onPress={withHaptic(() => navigation.navigate('AddRecipe'))}
                          >
                            <Ionicons name="add-circle-outline" size={32} color={colors.muted} />
                            <Text
                              style={{ color: colors.muted, marginTop: 8, textAlign: 'center' }}
                            >
                              Create your first{'\n'}custom recipe
                            </Text>
                          </Pressable>
                        )}
                      </ScrollView>
                    </>
                  )}
                </>
              )}

              {/* Personalized Feed - For You View */}
              {viewMode === 'personalized' && (
                <ForYouFeed
                  onCocktailPress={handleCocktailPress}
                  onSaveCocktail={handleSaveRecipe}
                  onAddToCart={handleAddToGroceryList}
                  savedRecipeIds={savedRecipeIds}
                  onRefineProfile={() =>
                    flavorControlsGate('T12', () => navigation.navigate('RefineYourTaste'))
                  }
                />
              )}

              {/* All Cocktails Header - Browse mode only (search has its own full-screen overlay) */}
              {!showSearchInput && viewMode === 'browse' && (
                <View
                  style={{
                    marginHorizontal: spacing(2),
                    marginTop: spacing(2),
                    marginBottom: spacing(1.5),
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 24,
                      fontWeight: '900',
                      marginBottom: spacing(1.5),
                    }}
                  >
                    All Cocktails
                  </Text>

                  {/* Horizontal Filter Buttons */}
                  {!searchQuery.trim() && !showSearchInput && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: spacing(1) }}
                    >
                      <Pressable
                        onPress={withHaptic(() => setShowSearchInput(true), 'selection')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: colors.bg,
                          paddingHorizontal: spacing(2),
                          paddingVertical: spacing(1),
                          borderRadius: radii.pill,
                          borderWidth: 1,
                          borderColor: colors.line,
                        }}
                      >
                        <Ionicons
                          name="search"
                          size={16}
                          color={colors.accent}
                          style={{ marginRight: spacing(0.5) }}
                        />
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 14,
                            fontWeight: '600',
                          }}
                        >
                          Search
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={withHaptic(() => setShowBasicFilterModal(true), 'selection')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: colors.bg,
                          paddingHorizontal: spacing(2),
                          paddingVertical: spacing(1),
                          borderRadius: radii.pill,
                          borderWidth: 1,
                          borderColor: colors.line,
                        }}
                      >
                        <Ionicons
                          name="filter"
                          size={16}
                          color={colors.accent}
                          style={{ marginRight: spacing(0.5) }}
                        />
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 14,
                            fontWeight: '600',
                          }}
                        >
                          Basic Filter
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={withHaptic(
                          () => advancedFilterGate('T2', () => setShowAdvancedFilterModal(true)),
                          'selection',
                        )}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: colors.bg,
                          paddingHorizontal: spacing(2),
                          paddingVertical: spacing(1),
                          borderRadius: radii.pill,
                          borderWidth: 1,
                          borderColor: colors.line,
                        }}
                      >
                        <Ionicons
                          name={tier === 'FREE' ? 'lock-closed' : 'options'}
                          size={16}
                          color={colors.accent}
                          style={{ marginRight: spacing(0.5) }}
                        />
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 14,
                            fontWeight: '600',
                          }}
                        >
                          Advanced
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={withHaptic(
                          () =>
                            setBrowseQuickFilter((prev) =>
                              prev === 'variations' ? 'all' : 'variations',
                            ),
                          'selection',
                        )}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor:
                            browseQuickFilter === 'variations' ? colors.gold : colors.bg,
                          paddingHorizontal: spacing(2),
                          paddingVertical: spacing(1),
                          borderRadius: radii.pill,
                          borderWidth: 1,
                          borderColor:
                            browseQuickFilter === 'variations' ? colors.gold : colors.line,
                        }}
                      >
                        <Ionicons
                          name={
                            browseQuickFilter === 'variations' ? 'sparkles' : 'sparkles-outline'
                          }
                          size={16}
                          color={browseQuickFilter === 'variations' ? colors.bg : colors.accent}
                          style={{ marginRight: spacing(0.5) }}
                        />
                        <Text
                          style={{
                            color: browseQuickFilter === 'variations' ? colors.bg : colors.text,
                            fontSize: 14,
                            fontWeight: '600',
                          }}
                        >
                          Variation
                          {discoverVariationRecipes.length > 0
                            ? ` (${discoverVariationRecipes.length})`
                            : ''}
                        </Text>
                      </Pressable>

                      {tier === 'FREE' && (
                        <Pressable
                          onPress={withHaptic(
                            () => setShowOnlyUnlocked(!showOnlyUnlocked),
                            'selection',
                          )}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: showOnlyUnlocked ? colors.accent : colors.bg,
                            paddingHorizontal: spacing(2),
                            paddingVertical: spacing(1),
                            borderRadius: radii.pill,
                            borderWidth: 1,
                            borderColor: showOnlyUnlocked ? colors.accent : colors.line,
                          }}
                        >
                          <Ionicons
                            name={showOnlyUnlocked ? 'checkmark-circle' : 'lock-open'}
                            size={16}
                            color={showOnlyUnlocked ? colors.white : colors.accent}
                            style={{ marginRight: spacing(0.5) }}
                          />
                          <Text
                            style={{
                              color: showOnlyUnlocked ? colors.white : colors.text,
                              fontSize: 14,
                              fontWeight: '600',
                            }}
                          >
                            Unlocked
                          </Text>
                        </Pressable>
                      )}

                      {tier === 'FREE' && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: colors.bg,
                            paddingHorizontal: spacing(2),
                            paddingVertical: spacing(1),
                            borderRadius: radii.pill,
                            borderWidth: 1,
                            borderColor: colors.line,
                          }}
                        >
                          <Ionicons
                            name="bookmark-outline"
                            size={16}
                            color={colors.accent}
                            style={{ marginRight: spacing(0.5) }}
                          />
                          <Text
                            style={{
                              color: colors.text,
                              fontSize: 14,
                              fontWeight: '600',
                            }}
                          >
                            Saves {savedCocktailCount}/{FREE_RECIPE_LIMIT}
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Advanced Filter Modal */}
              <Modal
                visible={showAdvancedFilterModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowAdvancedFilterModal(false)}
              >
                <Pressable
                  style={afStyles.backdrop}
                  onPress={() => setShowAdvancedFilterModal(false)}
                />
                <SafeAreaViewContext style={afStyles.container} edges={['bottom']}>
                  {/* Drag handle */}
                  <View style={afStyles.handle} />

                  {/* Header */}
                  <View style={afStyles.header}>
                    <Text style={afStyles.headerTitle}>Advanced Filters</Text>
                    <Pressable
                      onPress={() => setShowAdvancedFilterModal(false)}
                      style={afStyles.closeBtn}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={18} color={colors.text} />
                    </Pressable>
                  </View>

                  <ScrollView
                    style={afStyles.scroll}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={afStyles.scrollContent}
                  >
                    {/* Spirit */}
                    <View style={afStyles.section}>
                      <View style={afStyles.sectionHead}>
                        <Text style={afStyles.sectionLabel}>SPIRIT</Text>
                        <View style={afStyles.sectionRule} />
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={afStyles.pillRow}
                      >
                        {[
                          'All',
                          'Brandy',
                          'Cognac',
                          'Gin',
                          'Mezcal',
                          'Rum',
                          'Tequila',
                          'Vodka',
                          'Whiskey',
                        ].map((spirit) => {
                          const isSelected =
                            currentFilters.ingredients?.includes(spirit.toLowerCase()) ||
                            (spirit === 'All' && !currentFilters.ingredients?.length);
                          return (
                            <Pressable
                              key={spirit}
                              onPress={() => {
                                if (spirit === 'All') {
                                  setCurrentFilters({ ...currentFilters, ingredients: [] });
                                } else {
                                  const ingredients = currentFilters.ingredients || [];
                                  const newIngredients = ingredients.includes(spirit.toLowerCase())
                                    ? ingredients.filter((i) => i !== spirit.toLowerCase())
                                    : [spirit.toLowerCase()];
                                  setCurrentFilters({
                                    ...currentFilters,
                                    ingredients: newIngredients,
                                  });
                                }
                              }}
                              style={[afStyles.pill, isSelected && afStyles.pillSelected]}
                            >
                              <Text
                                style={[afStyles.pillText, isSelected && afStyles.pillTextSelected]}
                              >
                                {spirit}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>

                    {/* Difficulty */}
                    <View style={afStyles.section}>
                      <View style={afStyles.sectionHead}>
                        <Text style={afStyles.sectionLabel}>DIFFICULTY</Text>
                        <View style={afStyles.sectionRule} />
                      </View>
                      <View style={afStyles.pillWrap}>
                        {['All', 'Easy', 'Medium', 'Hard'].map((difficulty) => {
                          const isSelected =
                            currentFilters.difficulty?.includes(difficulty.toLowerCase()) ||
                            (difficulty === 'All' && !currentFilters.difficulty?.length);
                          return (
                            <Pressable
                              key={difficulty}
                              onPress={() => {
                                if (difficulty === 'All') {
                                  setCurrentFilters({ ...currentFilters, difficulty: [] });
                                } else {
                                  const difficulties = currentFilters.difficulty || [];
                                  const newDifficulties = difficulties.includes(
                                    difficulty.toLowerCase(),
                                  )
                                    ? difficulties.filter((d) => d !== difficulty.toLowerCase())
                                    : [difficulty.toLowerCase()];
                                  setCurrentFilters({
                                    ...currentFilters,
                                    difficulty: newDifficulties,
                                  });
                                }
                              }}
                              style={[afStyles.pill, isSelected && afStyles.pillSelected]}
                            >
                              <Text
                                style={[afStyles.pillText, isSelected && afStyles.pillTextSelected]}
                              >
                                {difficulty}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    {/* Category */}
                    <View style={afStyles.section}>
                      <View style={afStyles.sectionHead}>
                        <Text style={afStyles.sectionLabel}>CATEGORY</Text>
                        <View style={afStyles.sectionRule} />
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={afStyles.pillRow}
                      >
                        {[
                          'All',
                          'Variations',
                          'Bitter',
                          'Classic',
                          'Coffee',
                          'Creamy',
                          'Fizzy',
                          'Fruity',
                          'Herbal',
                          'Italian',
                          'Minty',
                          'Mocktails',
                          'Modern',
                          'Refreshing',
                          'Shots',
                          'Sour',
                          'Spicy',
                          'Sweet',
                          'Tiki',
                          'Tropical',
                        ].map((category) => {
                          const isSelected =
                            currentFilters.category?.includes(category.toLowerCase()) ||
                            (category === 'All' && !currentFilters.category?.length);
                          return (
                            <Pressable
                              key={category}
                              onPress={() => {
                                if (category === 'All') {
                                  setCurrentFilters({ ...currentFilters, category: [] });
                                } else {
                                  const categories = currentFilters.category || [];
                                  const newCategories = categories.includes(category.toLowerCase())
                                    ? categories.filter((c) => c !== category.toLowerCase())
                                    : [category.toLowerCase()];
                                  setCurrentFilters({ ...currentFilters, category: newCategories });
                                }
                              }}
                              style={[afStyles.pill, isSelected && afStyles.pillSelected]}
                            >
                              <Text
                                style={[afStyles.pillText, isSelected && afStyles.pillTextSelected]}
                              >
                                {category}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>

                    {/* Moods */}
                    <View style={afStyles.section}>
                      <View style={afStyles.sectionHead}>
                        <Text style={afStyles.sectionLabel}>YOUR MOODS</Text>
                        <View style={afStyles.sectionRule} />
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={afStyles.pillRow}
                      >
                        {[
                          'All',
                          'Bold & Serious',
                          'Romantic & Elegant',
                          'Fun & Playful',
                          'Adventurous & Exotic',
                          'Chill & Refreshing',
                          'Cozy & Warm',
                        ].map((mood) => {
                          const isSelected =
                            currentFilters.mood?.includes(mood) ||
                            (mood === 'All' && !currentFilters.mood?.length);
                          return (
                            <Pressable
                              key={mood}
                              onPress={() => {
                                if (mood === 'All') {
                                  setCurrentFilters({ ...currentFilters, mood: [] });
                                } else {
                                  const moods = currentFilters.mood || [];
                                  const newMoods = moods.includes(mood)
                                    ? moods.filter((m) => m !== mood)
                                    : [mood];
                                  setCurrentFilters({ ...currentFilters, mood: newMoods });
                                }
                              }}
                              style={[afStyles.pill, isSelected && afStyles.pillSelected]}
                            >
                              <Text
                                style={[afStyles.pillText, isSelected && afStyles.pillTextSelected]}
                              >
                                {mood}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>

                    {/* Sort By */}
                    <View style={afStyles.section}>
                      <View style={afStyles.sectionHead}>
                        <Text style={afStyles.sectionLabel}>SORT BY</Text>
                        <View style={afStyles.sectionRule} />
                      </View>
                      <View style={afStyles.pillWrap}>
                        {[
                          ...(tier !== 'FREE'
                            ? [
                                {
                                  label: 'Matches Your Taste',
                                  value: 'taste-match',
                                  icon: 'star-outline' as const,
                                },
                              ]
                            : []),
                          {
                            label: 'A → Z',
                            value: 'alphabetical-asc',
                            icon: 'arrow-up-outline' as const,
                          },
                          {
                            label: 'Z → A',
                            value: 'alphabetical-desc',
                            icon: 'arrow-down-outline' as const,
                          },
                          {
                            label: 'Rating ↑',
                            value: 'rating-desc',
                            icon: 'trending-up-outline' as const,
                          },
                          {
                            label: 'Rating ↓',
                            value: 'rating-asc',
                            icon: 'trending-down-outline' as const,
                          },
                        ].map((sortOption) => {
                          const isSelected = currentFilters.sortOrder === sortOption.value;
                          return (
                            <Pressable
                              key={sortOption.value}
                              onPress={() => {
                                setCurrentFilters({
                                  ...currentFilters,
                                  sortOrder: isSelected
                                    ? undefined
                                    : (sortOption.value as FilterOptions['sortOrder']),
                                });
                              }}
                              style={[afStyles.pill, isSelected && afStyles.pillSelected]}
                            >
                              <Ionicons
                                name={sortOption.icon}
                                size={12}
                                color={isSelected ? colors.goldText : colors.subtext}
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                style={[afStyles.pillText, isSelected && afStyles.pillTextSelected]}
                              >
                                {sortOption.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    {/* Clear All */}
                    <Pressable
                      style={afStyles.clearBtn}
                      onPress={() => setCurrentFilters({ sortOrder: 'alphabetical-asc' })}
                    >
                      <Text style={afStyles.clearBtnText}>Clear All Filters</Text>
                    </Pressable>
                  </ScrollView>

                  {/* Apply */}
                  <View style={afStyles.footer}>
                    <Pressable
                      style={afStyles.applyBtn}
                      onPress={() => setShowAdvancedFilterModal(false)}
                    >
                      <Text style={afStyles.applyBtnText}>Apply Filters</Text>
                    </Pressable>
                  </View>
                </SafeAreaViewContext>
              </Modal>
            </View>
          )
        }
        ListEmptyComponent={renderEmptyState}
        columnWrapperStyle={{ paddingHorizontal: spacing(2), columnGap: GUTTER }}
      />

      {/* Modals */}

      <GroceryListModal
        visible={groceryListVisible}
        recipeName={selectedRecipe?.name || selectedRecipe?.title || 'Recipe'}
        ingredients={selectedRecipe?.ingredients || []}
        recipeId={selectedRecipe?.id}
        onClose={() => {
          setGroceryListVisible(false);
          setSelectedRecipe(null);
        }}
      />

      {/* AI Recipe Modal */}
      <AIRecipeModal
        visible={aiRecipeModalVisible}
        onClose={() => {
          setAiRecipeModalVisible(false);
          setCurrentAiRecipe(null);
        }}
        recipe={currentAiRecipe}
        onSave={handleSaveAiRecipe}
        navigation={navigation}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showBasicFilterModal}
        onClose={() => setShowBasicFilterModal(false)}
        filters={currentFilters}
        onApplyFilters={(filters) => {
          setCurrentFilters((prev) => ({ ...prev, ...filters }));
          // Re-trigger search with new filters if there's a query
          if (searchQuery.trim()) {
            handleSearch(searchQuery);
          }
        }}
      />

      {/* Recipe Preferences Modal */}
      <RecipePreferencesModal
        visible={preferencesModalVisible}
        onClose={() => setPreferencesModalVisible(false)}
      />

      {/* Full-screen Search Overlay */}
      {showSearchInput && (
        <View
          style={{
            position: 'absolute',
            top: 86,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.bg,
            zIndex: 1000,
          }}
        >
          {/* Search Input */}
          <View
            style={{
              paddingHorizontal: spacing(2),
              paddingTop: spacing(2),
              paddingBottom: spacing(1.5),
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: searchQuery ? colors.gold + '33' : colors.line,
            }}
          >
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 14,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing(2),
                borderWidth: 1,
                borderColor: searchQuery ? colors.gold + '55' : 'rgba(255,255,255,0.1)',
                shadowColor: searchQuery ? colors.gold : 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.2,
                shadowRadius: 10,
              }}
            >
              <Ionicons
                name="search"
                size={17}
                color={searchQuery ? colors.gold : colors.muted}
                style={{ marginRight: spacing(1.5) }}
              />
              <TextInput
                ref={searchInputRef}
                value={searchQuery}
                onChangeText={handleSearch}
                placeholder="Name, spirit, or ingredient..."
                placeholderTextColor={colors.muted}
                style={{
                  flex: 1,
                  color: colors.text,
                  fontSize: 15,
                  paddingVertical: spacing(1.75),
                }}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardAppearance="dark"
              />
              {searchQuery ? (
                <Pressable
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  hitSlop={10}
                >
                  <Ionicons name="close-circle" size={18} color={colors.muted} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => {
                    setShowSearchInput(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  hitSlop={10}
                >
                  <Ionicons name="close" size={18} color={colors.muted} />
                </Pressable>
              )}
            </View>
            {/* Always reserve this space — conditional rendering here causes layout shift that dismisses iOS keyboard */}
            <View
              style={{
                marginTop: spacing(1),
                height: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {searchQuery.trim() &&
                (isSearching ? (
                  <ActivityIndicator size="small" color={colors.gold} />
                ) : (
                  <Text
                    style={{
                      color: searchResults.length > 0 ? colors.gold : colors.muted,
                      fontSize: 12,
                      fontWeight: '500',
                    }}
                  >
                    {searchResults.length > 0
                      ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`
                      : `No results for "${searchQuery}"`}
                  </Text>
                ))}
            </View>
          </View>

          {/* Search Results — always render FlatList to avoid keyboard dismiss on first keypress */}
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={renderRecipeItem}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: spacing(2),
              paddingTop: spacing(2),
              paddingBottom: spacing(10),
              flexGrow: 1,
            }}
            columnWrapperStyle={{ gap: GUTTER }}
            ListEmptyComponent={
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingBottom: spacing(16),
                }}
              >
                {isSearching ? (
                  <ActivityIndicator size="large" color={colors.gold} />
                ) : searchQuery.trim() ? (
                  <>
                    <Ionicons name="search-outline" size={44} color={colors.muted} />
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 16,
                        fontWeight: '600',
                        marginTop: spacing(2),
                      }}
                    >
                      No cocktails found
                    </Text>
                    <Text
                      style={{
                        color: colors.muted,
                        fontSize: 14,
                        marginTop: spacing(1),
                        textAlign: 'center',
                      }}
                    >
                      Try a different name, spirit, or ingredient
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="search-outline" size={40} color={colors.muted} />
                    <Text style={{ color: colors.muted, fontSize: 15, marginTop: spacing(2) }}>
                      Search by name, spirit, or ingredient
                    </Text>
                  </>
                )}
              </View>
            }
          />
        </View>
      )}

      {/* Cocktail Unlock Sheet */}
      <CocktailUnlockSheet
        visible={unlockSheetVisible}
        onClose={() => {
          setUnlockSheetVisible(false);
          setSelectedCocktailForUnlock(null);
        }}
        cocktailName={selectedCocktailForUnlock?.name || 'This Cocktail'}
        unlockHint={
          selectedCocktailForUnlock ? getRecipeUnlockHint(selectedCocktailForUnlock) : undefined
        }
        xpCost={selectedCocktailForUnlock ? getCocktailCost(selectedCocktailForUnlock.id) : 0}
        currentXP={xpBalance}
        canAfford={
          selectedCocktailForUnlock ? canAffordCocktail(selectedCocktailForUnlock.id) : false
        }
        onUnlockWithXP={() => {
          if (selectedCocktailForUnlock) {
            const cost = getCocktailCost(selectedCocktailForUnlock.id);
            const success = unlockCocktail(selectedCocktailForUnlock.id, cost);
            if (success) {
              showToast(`Unlocked ${selectedCocktailForUnlock.name}!`, 'success');
              setUnlockSheetVisible(false);
              setSelectedCocktailForUnlock(null);
            } else {
              showToast('Not enough XP to unlock', 'error');
            }
          }
        }}
        onUpgradeSubscription={() => {
          setUnlockSheetVisible(false);
          setSelectedCocktailForUnlock(null);
          navigation.navigate('Paywall', { offering: null, displayCloseButton: true });
        }}
      />

      {/* XP Balance Modal */}
      <XPBalanceModal
        visible={xpBalanceModalVisible}
        onClose={() => setXpBalanceModalVisible(false)}
      />

      {/* Toast Notification */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </SafeAreaView>
  );
}
