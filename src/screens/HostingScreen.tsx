import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, serif, spacing } from '../theme/tokens';
import MainPageHeader from '../components/ui/MainPageHeader';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../contexts/AuthContext';
import { InventoryService } from '../services/inventoryService';
import { type BarIngredient, type HomeBar, HomeBarService } from '../services/homeBarService';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { ShoppingListStore } from '../services/shoppingListStore';
import { useUserTier } from '../store/useUserTier';
import { isCocktailAccessible } from '../config/tierAccess';
import { trackEvent, ANALYTICS_EVENTS } from '../lib/analytics';
import { getCocktailImage } from '../../assets/images/cocktails';
import { useXPSystem } from '../store/useXPSystem';
import { useEngagement } from '../store/useEngagement';
import { RecipesRepository } from '../repos/supabase/recipesRepo';
import { ALL_COCKTAILS as FALLBACK_COCKTAILS } from '../data/cocktails';
import { HOSTING_RECIPE_SUPPLEMENTS } from '../data/hostingSupplements';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type EventVibe = 'casual' | 'dinner' | 'party';
type WizardStep = 0 | 1 | 2;
type SpiritFilter = 'any' | 'vodka' | 'gin' | 'rum' | 'whiskey' | 'tequila' | 'mezcal' | 'brandy' | 'mocktail';

interface HostingPlanFilters {
  spirit: SpiritFilter;
  ingredients: string[];
}

interface HostingPlan {
  id: string;
  guestCount: number;
  vibe: EventVibe;
  preferences: {
    lowABV: boolean;
    noCitrus: boolean;
    spiritForward: boolean;
    mocktails: boolean;
  };
  filters?: HostingPlanFilters;
  selectedRecipeName?: string;
  createdAt: string;
}

interface MenuCocktail {
  recipeId: string;
  name: string;
  ingredients: string[];
  normalizedIngredients?: string[];
  missingIngredients: string[];
  canMake: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  id: string;
  unlocked: boolean;
  confidence: 'high' | 'medium';
  why: string;
  imageSource?: any;
  baseSpirit?: string;
  subtitle?: string;
  recipeType?: string;
  tags?: string[];
}

const HOSTING_PLANS_KEY = '@koope_hosting_plans';

function slugifyCocktailName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getHostingThumbnail(cocktailName: string) {
  const id = slugifyCocktailName(cocktailName);
  const aliases: Record<string, string> = {
    'rum-punch': 'planters-punch',
    martini: 'dry-martini',
  };
  const aliasId = aliases[id];
  return getCocktailImage(id) || (aliasId ? getCocktailImage(aliasId) : null) || getCocktailImage('old-fashioned');
}

const HOSTING_TO_RECIPE_IDS: Record<string, string[]> = {
  'old fashioned': ['old-fashioned', 'old-fashioned-classic'],
  manhattan: ['manhattan'],
  negroni: ['negroni'],
  'gin tonic': ['gin-tonic'],
  martini: ['martini', 'dry-martini'],
  mojito: ['mojito'],
  daiquiri: ['daiquiri'],
  'rum punch': ['rum-punch', 'planters-punch'],
  margarita: ['margarita'],
  'moscow mule': ['moscow-mule'],
  'whiskey sour': ['whiskey-sour'],
};

function normalizeCocktailKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getHostingRecipeCandidateIds(cocktailName: string) {
  const key = normalizeCocktailKey(cocktailName);
  const mapped = HOSTING_TO_RECIPE_IDS[key] || [];
  const slug = slugifyCocktailName(cocktailName);
  return Array.from(new Set([slug, ...mapped]));
}

function getRecipeDisplayName(recipe: any): string {
  return recipe?.name || recipe?.title || 'Untitled Cocktail';
}

function extractRecipeIngredientNames(ingredients: any): string[] {
  let source: any[] = [];

  if (Array.isArray(ingredients)) {
    source = ingredients;
  } else if (typeof ingredients === 'string') {
    try {
      const parsed = JSON.parse(ingredients);
      source = Array.isArray(parsed) ? parsed : Object.values(parsed || {});
    } catch {
      source = ingredients.split(',').map((part) => part.trim()).filter(Boolean);
    }
  } else if (ingredients && typeof ingredients === 'object') {
    source = Array.isArray((ingredients as any).items)
      ? (ingredients as any).items
      : Object.values(ingredients);
  }

  return source
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const name =
          item.name ||
          item.ingredient ||
          item.ingredient_name ||
          item.title ||
          item.item ||
          item.text;
        if (!name || typeof name !== 'string') return null;
        const amount =
          typeof item.amount === 'string' || typeof item.amount === 'number'
            ? String(item.amount)
            : typeof item.quantity === 'string' || typeof item.quantity === 'number'
              ? String(item.quantity)
              : '';
        const unit =
          typeof item.unit === 'string'
            ? item.unit
            : typeof item.measure === 'string'
              ? item.measure
              : '';
        const combined = [amount, unit, name].filter(Boolean).join(' ').trim();
        return combined.length > 0 ? combined : name;
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function normalizeIngredientToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b\d+([./]\d+)?\s*(oz|ml|dash(es)?|barspoon|tbsp|tsp|cup(s)?)\b/g, '')
    .replace(/\b(fresh|garnish|for garnish|optional|to taste)\b/g, '')
    .replace(/[(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAlcoholicSignals(baseSpirit?: string, ingredients: string[] = [], text: string = '') {
  const spiritPattern =
    /(vodka|gin|rum|whiskey|bourbon|rye|tequila|mezcal|brandy|cognac|campari|liqueur|vermouth|scotch|aperol|amaro|triple sec|cointreau)/i;
  if (baseSpirit && spiritPattern.test(baseSpirit)) return true;
  if (ingredients.some((i) => spiritPattern.test(i))) return true;
  if (spiritPattern.test(text)) return true;
  return false;
}

function isRecipeBatchable(recipe: {
  id?: string;
  name?: string;
  title?: string;
  category?: string;
  recipeType?: string;
  tags?: string[];
}) {
  const text = [
    recipe.id || '',
    recipe.name || '',
    recipe.title || '',
    recipe.category || '',
    recipe.recipeType || '',
    ...(recipe.tags || []),
  ]
    .join(' ')
    .toLowerCase();

  if (/\bshot(s)?\b/.test(text)) return false;
  if (/\bjagerbomb\b/.test(text)) return false;
  return true;
}

function mapDifficulty(raw: string | undefined): 'easy' | 'medium' | 'hard' {
  const value = (raw || '').toLowerCase();
  if (value.includes('beginner') || value.includes('easy')) return 'easy';
  if (value.includes('hard') || value.includes('advanced') || value.includes('expert')) return 'hard';
  return 'medium';
}

function toImageSource(image: any, id: string) {
  if (typeof image === 'number') return image;
  if (image && typeof image === 'object') return image;
  if (typeof image === 'string' && image.length > 0) return { uri: image };
  return getCocktailImage(id) || getCocktailImage('old-fashioned');
}

function mergeRecipesWithMocktails(recipes: any[]) {
  const byId = new Map<string, any>();
  [...recipes, ...HOSTING_RECIPE_SUPPLEMENTS].forEach((recipe) => {
    const id = recipe?.id || slugifyCocktailName(getRecipeDisplayName(recipe));
    if (!id) return;
    if (!byId.has(id)) byId.set(id, recipe);
  });
  return Array.from(byId.values());
}

function hapticSelection() {
  Haptics.selectionAsync().catch(() => {});
}

function hapticSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

function hapticWarning() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

function mapItemToBarIngredient(item: any, index: number): BarIngredient {
  return {
    id: item?.id || `inventory-${index}`,
    name: item?.item_name || item?.name || 'Unknown',
    category:
      item?.item_type === 'spirit' || item?.category === 'spirit'
        ? 'spirit'
        : item?.category === 'mixer'
          ? 'mixer'
          : item?.category === 'garnish'
            ? 'garnish'
            : item?.category === 'bitters'
              ? 'bitters'
              : item?.category === 'syrup'
                ? 'syrup'
                : item?.category === 'liqueur'
                  ? 'liqueur'
                  : 'ingredient',
    subcategory: item?.subcategory || undefined,
    brand: item?.brand || undefined,
    addedAt: item?.added_at ? new Date(item.added_at) : new Date(),
    isFavorite: false,
    tags: [],
  };
}

function inferGroceryCategory(name: string): 'spirits_liquors' | 'mixers' | 'garnish' | 'bitters' | 'syrup' | 'other' {
  const n = name.toLowerCase();
  if (/(vodka|gin|rum|whiskey|bourbon|rye|tequila|mezcal|vermouth|liqueur|cointreau|campari|brandy)/.test(n)) return 'spirits_liquors';
  if (/(bitters|angostura|peychaud)/.test(n)) return 'bitters';
  if (/(syrup|grenadine|orgeat|agave|falernum)/.test(n)) return 'syrup';
  if (/(lime|lemon|orange|mint|olive|cherry|salt|sugar|peel)/.test(n)) return 'garnish';
  if (/(juice|soda|tonic|ginger beer|cola|water)/.test(n)) return 'mixers';
  return 'other';
}

function estimateIngredientOz(name: string): number {
  const n = name.toLowerCase();
  if (/(vodka|gin|rum|whiskey|bourbon|rye|tequila|mezcal|brandy|cognac|vermouth|campari|liqueur|cointreau)/.test(n)) return 1.5;
  if (/(juice|soda|tonic|ginger beer|cola|water)/.test(n)) return 2.0;
  if (/(bitters)/.test(n)) return 0.05;
  if (/(syrup|grenadine|agave|orgeat|falernum)/.test(n)) return 0.5;
  if (/(lime|lemon|orange)/.test(n)) return 0.5;
  return 0.25;
}

export default function HostingScreen() {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const { tier } = useUserTier();
  const { isCocktailUnlockedWithXP } = useXPSystem();
  const { isRecipeUnlocked: isRecipeUnlockedWithEngagement } = useEngagement();
  const scrollRef = useRef<ScrollView | null>(null);

  const { hasAccess: hasAdvancedHosting, gateWithTrigger: advancedHostingGate } = useFeatureAccess('hosting_advanced');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<BarIngredient[]>([]);
  const [savedPlans, setSavedPlans] = useState<HostingPlan[]>([]);
  const [recipeCatalog, setRecipeCatalog] = useState<any[]>([]);

  const [step, setStep] = useState<WizardStep>(0);
  const [selectedRecipe, setSelectedRecipe] = useState<MenuCocktail | null>(null);
  const [guestCount, setGuestCount] = useState(4);
  const [vibe, setVibe] = useState<EventVibe>('casual');
  const [preferences, setPreferences] = useState({
    lowABV: false,
    noCitrus: false,
    spiritForward: false,
    mocktails: false,
  });
  const [planFilters, setPlanFilters] = useState<HostingPlanFilters>({ spirit: 'any', ingredients: [] });
  const [menuFiltersVisible, setMenuFiltersVisible] = useState(false);
  const [menuFilterInput, setMenuFilterInput] = useState('');
  const [menuSearchVisible, setMenuSearchVisible] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [isViewingSavedPlan, setIsViewingSavedPlan] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setError(null);
      try {
        const stored = await HomeBarService.getStoredIngredients();
        let mergedInventory: BarIngredient[] = [...stored];

        if (user?.id) {
          const userInventory = await InventoryService.getUserInventory(user.id);
          const mapped = userInventory.map(mapItemToBarIngredient);
          const deduped = new Map<string, BarIngredient>();
          [...stored, ...mapped].forEach((item) => deduped.set(item.name.toLowerCase(), item));
          mergedInventory = Array.from(deduped.values());
        }

        const rawPlans = await AsyncStorage.getItem(HOSTING_PLANS_KEY);
        const parsedPlans: HostingPlan[] = rawPlans ? JSON.parse(rawPlans) : [];
        let loadedRecipes: any[] = [];
        try {
          loadedRecipes = await RecipesRepository.getAllRecipes(0, 400);
        } catch {
          loadedRecipes = [];
        }
        if (!loadedRecipes.length) loadedRecipes = FALLBACK_COCKTAILS as any[];
        loadedRecipes = mergeRecipesWithMocktails(loadedRecipes);

        if (mounted) {
          setInventory(mergedInventory);
          setSavedPlans(parsedPlans.slice(0, 8));
          setRecipeCatalog(loadedRecipes);
        }
      } catch {
        if (mounted) setError('Could not load hosting planner data.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    trackEvent(ANALYTICS_EVENTS.HOSTING_MODE_OPENED, { source: 'hosting_screen' });

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!selectedRecipe) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedRecipe]);

  const homeBar: HomeBar = useMemo(
    () => ({
      id: 'hosting',
      userId: user?.id || 'local',
      name: 'My Bar',
      ingredients: inventory,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: true,
    }),
    [inventory, user?.id]
  );

  const buildRankedMenu = (
    nextPreferences: HostingPlan['preferences'],
    nextVibe: EventVibe,
    nextRejectedIds: Set<string>,
    nextFilters: HostingPlanFilters,
    searchQuery: string
  ): MenuCocktail[] => {
    const inventoryNames = homeBar.ingredients.map((i) => i.name.toLowerCase());

    const isMocktailCocktail = (cocktail: {
      recipeId?: string;
      name: string;
      category?: string;
      baseSpirit?: string;
      recipeType?: string;
      tags?: string[];
      ingredients?: string[];
      subtitle?: string;
      description?: string;
    }) => {
      const category = (cocktail.category || '').toLowerCase();
      const baseSpirit = (cocktail.baseSpirit || '').toLowerCase();
      const recipeType = (cocktail.recipeType || '').toLowerCase();
      const tags = (cocktail.tags || []).join(' ').toLowerCase();
      const id = (cocktail.recipeId || '').toLowerCase();
      const name = (cocktail.name || '').toLowerCase();
      const subtitle = (cocktail.subtitle || '').toLowerCase();
      const description = (cocktail.description || '').toLowerCase();
      const textSignals = `${id} ${name} ${subtitle} ${description} ${tags}`;
      const alcoholic = hasAlcoholicSignals(cocktail.baseSpirit, cocktail.ingredients || [], textSignals);

      if (alcoholic) return false;
      if (recipeType === 'mocktail') return true;
      if (/(mocktail|non[- ]?alcoholic|zero[- ]?proof|alcohol[- ]?free)/.test(category)) return true;
      if (baseSpirit === 'none' || baseSpirit === 'non-alcoholic' || baseSpirit === 'mocktail') return true;
      if (/(virgin|mocktail|zero[- ]?proof|non[- ]?alcoholic|alcohol[- ]?free)/.test(textSignals)) return true;
      return false;
    };

    const matchesVibe = (cocktail: { category?: string; ingredients: string[]; baseSpirit?: string; name: string; subtitle?: string; description?: string }, next: EventVibe) => {
      const haystack = [
        cocktail.name,
        cocktail.category || '',
        cocktail.baseSpirit || '',
        cocktail.subtitle || '',
        cocktail.description || '',
        ...(cocktail.ingredients || []),
      ]
        .join(' ')
        .toLowerCase();

      if (next === 'casual') return /(gin|vodka|rum|highball|collins|spritz|mule|mojito|daiquiri|paloma|mocktail)/.test(haystack);
      if (next === 'dinner') return /(whiskey|bourbon|rye|manhattan|martini|negroni|old fashioned|stirred|spirit)/.test(haystack);
      return /(party|tequila|rum|vodka|tiki|punch|shot|spritz|margarita|mojito|paloma)/.test(haystack);
    };

    const isUnlockedInRecipeSystem = (recipeId: string, cocktailName: string) => {
      const candidateIds = Array.from(new Set([recipeId, ...getHostingRecipeCandidateIds(cocktailName)]));
      return candidateIds.some((id) =>
        isCocktailAccessible(id, tier) ||
        isCocktailUnlockedWithXP(id) ||
        isRecipeUnlockedWithEngagement(id)
      );
    };

    const candidates = recipeCatalog
      .filter((recipe) => (recipe?.category || '').toLowerCase() !== 'syrups')
      .filter((recipe) => isRecipeBatchable(recipe))
      .map((recipe) => {
        const ingredientLines = extractRecipeIngredientNames(recipe.ingredients);
        const normalizedRequired = ingredientLines.map(normalizeIngredientToken).filter(Boolean);
        const missingIngredients = normalizedRequired.filter(
          (required) =>
            !inventoryNames.some((available) => {
              const normAvailable = normalizeIngredientToken(available);
              return normAvailable.includes(required) || required.includes(normAvailable);
            })
        );
        return {
          recipeId: recipe.id || slugifyCocktailName(getRecipeDisplayName(recipe)),
          name: getRecipeDisplayName(recipe),
          subtitle: recipe.subtitle,
          category: recipe.category || 'Cocktails',
          baseSpirit: recipe.baseSpirit || recipe.base_spirit,
          recipeType: recipe.recipeType,
          tags: recipe.tags || [],
          description: recipe.description,
          ingredients: ingredientLines,
          normalizedIngredients: normalizedRequired,
          missingIngredients,
          canMake: missingIngredients.length === 0,
          difficulty: mapDifficulty(recipe.difficulty),
          imageSource: toImageSource(recipe.image, recipe.id),
        };
      });

    const filtered = candidates.filter((c) => {
      if (nextPreferences.noCitrus) {
        const hasCitrus = (c.normalizedIngredients || c.ingredients).some((i) =>
          /(fresh lime juice|fresh lemon juice|orange juice|grapefruit juice|citrus juice|lime juice|lemon juice)/i.test(i)
        );
        if (hasCitrus) return false;
      }
      if (nextPreferences.lowABV) {
        const spiritLike = (c.normalizedIngredients || c.ingredients).filter((i) =>
          /(vodka|gin|rum|whiskey|bourbon|rye|tequila|mezcal|brandy|cognac|campari|liqueur|vermouth)/i.test(i)
        ).length;
        const hasMixer = (c.normalizedIngredients || c.ingredients).some((i) =>
          /(juice|soda|tonic|ginger beer|cola|water|prosecco|champagne|sparkling|coconut)/i.test(i)
        );
        if (spiritLike > 1 || !hasMixer) return false;
      }
      if (nextPreferences.spiritForward) {
        const spiritCount = (c.normalizedIngredients || c.ingredients).filter((i) =>
          /(vodka|gin|rum|whiskey|bourbon|rye|tequila|mezcal|brandy|cognac|campari|liqueur)/i.test(i)
        ).length;
        if (spiritCount < 2) return false;
      }
      if (nextPreferences.mocktails && !isMocktailCocktail(c)) return false;
      if (nextFilters.spirit !== 'any') {
        if (nextFilters.spirit === 'mocktail') {
          if (!isMocktailCocktail(c)) return false;
        } else {
          const spiritTerm = nextFilters.spirit.toLowerCase();
          const spiritMatch = (c.baseSpirit || '').toLowerCase().includes(spiritTerm) ||
            (c.normalizedIngredients || c.ingredients).some((i) => i.toLowerCase().includes(spiritTerm));
          if (!spiritMatch) return false;
        }
      }
      if (nextFilters.ingredients.length > 0) {
        const haystack = [
          c.name,
          c.subtitle || '',
          c.category || '',
          c.baseSpirit || '',
          ...(c.normalizedIngredients || c.ingredients),
        ]
          .join(' ')
          .toLowerCase();
        const allTermsMatch = nextFilters.ingredients.every((term) =>
          haystack.includes(normalizeIngredientToken(term))
        );
        if (!allTermsMatch) return false;
      }
      const query = (searchQuery || '').trim().toLowerCase();
      if (query) {
        const haystack = [
          c.name,
          c.subtitle || '',
          c.category || '',
          c.baseSpirit || '',
          ...(c.ingredients || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    const scored = filtered
      .map((c) => {
        const id = c.recipeId || slugifyCocktailName(c.name);
        const unlocked = tier !== 'FREE' ? true : isUnlockedInRecipeSystem(id, c.name);
        const isMocktail = isMocktailCocktail(c);
        const inVibeCategory = matchesVibe(c, nextVibe);
        const categoryPref = inVibeCategory ? 36 : 0;
        const mocktailBonus = nextPreferences.mocktails && isMocktail ? 36 : 0;
        const nearBonus = c.canMake ? 24 : Math.max(0, 16 - c.missingIngredients.length * 4);
        const difficultyBonus = c.difficulty === 'easy' ? 6 : c.difficulty === 'medium' ? 3 : 0;
        const unlockBonus = unlocked ? 14 : 0;
        const score = categoryPref + mocktailBonus + nearBonus + difficultyBonus + unlockBonus;
        const confidence: 'high' | 'medium' = c.canMake ? 'high' : 'medium';
        const why = [
          c.canMake ? 'Ready with current inventory' : `${c.missingIngredients.length} missing ingredient${c.missingIngredients.length === 1 ? '' : 's'}`,
          inVibeCategory ? `Fits ${nextVibe} vibe` : 'Good alternate fit',
          isMocktail ? 'Zero-proof friendly' : 'Alcoholic build',
          c.difficulty === 'easy' ? 'Low prep complexity' : 'Moderate prep complexity',
        ].join(' • ');

        return { ...c, id, unlocked, confidence, why, _score: score, _inVibeCategory: inVibeCategory } as MenuCocktail & { _score: number; _inVibeCategory: boolean };
      })
      .filter((c) => !nextRejectedIds.has(c.id));

    const vibeFirst = scored
      .sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        if (a.canMake !== b.canMake) return a.canMake ? -1 : 1;
        if (a._inVibeCategory !== b._inVibeCategory) return a._inVibeCategory ? -1 : 1;
        return b._score - a._score;
      })
      .slice(0, 10)
      .map(({ _score, _inVibeCategory, ...rest }) => rest);

    return vibeFirst;
  };

  const menu = useMemo<MenuCocktail[]>(() => {
    return buildRankedMenu(preferences, vibe, rejectedIds, planFilters, menuSearchQuery);
  }, [homeBar, preferences, vibe, rejectedIds, planFilters, menuSearchQuery, tier, isCocktailUnlockedWithXP, isRecipeUnlockedWithEngagement, recipeCatalog]);

  const shoppingGaps = useMemo(() => {
    const almost = menu.filter((c) => c.unlocked && !c.canMake).slice(0, 6);
    const allMissing = almost.flatMap((c) => c.missingIngredients);
    const countMap = new Map<string, number>();
    allMissing.forEach((ing) => {
      const key = ing.toLowerCase();
      countMap.set(key, (countMap.get(key) || 0) + 1);
    });
    return Array.from(countMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [menu]);

  const unlockCounts = useMemo(() => {
    const unlocked = menu.filter((c) => c.unlocked).length;
    return { unlocked, locked: Math.max(0, menu.length - unlocked) };
  }, [menu]);

  const checklist = useMemo(() => {
    if (!selectedRecipe) return [];
    return [
      { title: '24h before', steps: ['Confirm guest count', 'Check ice and glassware', 'Buy missing ingredients'] },
      { title: '2h before', steps: ['Pre-batch non-carbonated components', 'Prep garnishes', 'Chill mixers and glassware'] },
      { title: 'Serve time', steps: ['Add ice fresh per round', 'Top with carbonated mixers last', 'Taste first pour before serving all'] },
    ];
  }, [selectedRecipe]);

  const baseServings = Math.max(guestCount, 1);
  const batchMultiplier = Math.max(1, Math.ceil(guestCount / 2));
  const safetyNetGuests = guestCount + 2;

  const selectedRecipeIngredients = useMemo(() => {
    if (!selectedRecipe) return [];
    return selectedRecipe.ingredients.map((name) => {
      const perServeOz = estimateIngredientOz(name);
      return {
        name,
        perServeOz,
        totalOz: perServeOz * baseServings,
        totalMl: perServeOz * baseServings * 29.57,
      };
    });
  }, [selectedRecipe, baseServings]);

  const servingsPerBottle = useMemo(() => {
    if (!selectedRecipe) return null;
    const spiritPerServeOz = selectedRecipe.ingredients.reduce((sum, ing) => {
      const n = ing.toLowerCase();
      if (/(vodka|gin|rum|whiskey|bourbon|rye|tequila|mezcal|brandy|cognac|campari|liqueur|vermouth)/.test(n)) {
        return sum + estimateIngredientOz(ing);
      }
      return sum;
    }, 0);
    if (spiritPerServeOz <= 0) return null;
    const totalBottleOz = 750 / 29.57;
    return Math.floor(totalBottleOz / spiritPerServeOz);
  }, [selectedRecipe]);

  const selectedRecipeIsMocktail = useMemo(() => {
    if (!selectedRecipe) return false;
    const textSignals = `${selectedRecipe.recipeId || ''} ${selectedRecipe.name || ''} ${selectedRecipe.subtitle || ''} ${
      selectedRecipe.why || ''
    } ${(selectedRecipe.tags || []).join(' ')}`;
    const alcoholic = hasAlcoholicSignals(selectedRecipe.baseSpirit, selectedRecipe.ingredients || [], textSignals);
    const category = (selectedRecipe.category || '').toLowerCase();
    const recipeType = (selectedRecipe.recipeType || '').toLowerCase();
    if (alcoholic) return false;
    return (
      recipeType === 'mocktail' ||
      /(mocktail|non[- ]?alcoholic|zero[- ]?proof|alcohol[- ]?free)/.test(category) ||
      /(virgin|mocktail|zero[- ]?proof|non[- ]?alcoholic|alcohol[- ]?free)/.test(textSignals)
    );
  }, [selectedRecipe]);

  const dilutionEstimate = useMemo(() => {
    if (!selectedRecipe) return null;
    if (selectedRecipeIsMocktail) return null;
    const hasJuiceOrEgg = selectedRecipe.ingredients.some((ing) =>
      /(juice|egg|pineapple|orange|lemon|lime|cream)/i.test(ing)
    );
    const dilutionPerServeOz = hasJuiceOrEgg ? 0.8 : 0.5;
    const totalDilutionOz = dilutionPerServeOz * baseServings;
    const totalDilutionMl = totalDilutionOz * 29.57;
    return { dilutionPerServeOz, totalDilutionOz, totalDilutionMl };
  }, [selectedRecipe, baseServings, selectedRecipeIsMocktail]);

  const totalsEstimate = useMemo(() => {
    const preDilutionOz = selectedRecipeIngredients.reduce((sum, ing) => sum + ing.totalOz, 0);
    const dilutionOz = dilutionEstimate?.totalDilutionOz || 0;
    const finalOz = preDilutionOz + dilutionOz;
    return {
      preDilutionOz,
      finalOz,
      preDilutionMl: preDilutionOz * 29.57,
      finalMl: finalOz * 29.57,
    };
  }, [selectedRecipeIngredients, dilutionEstimate]);

  const savePlan = async () => {
    try {
      const plan: HostingPlan = {
        id: `plan_${Date.now()}`,
        guestCount,
        vibe,
        preferences: { ...preferences },
        filters: { ...planFilters },
        selectedRecipeName: selectedRecipe?.name,
        createdAt: new Date().toISOString(),
      };
      const next = [plan, ...savedPlans].slice(0, 8);
      setSavedPlans(next);
      await AsyncStorage.setItem(HOSTING_PLANS_KEY, JSON.stringify(next));
      hapticSuccess();
      Alert.alert('Plan Saved', 'Saved to your hosting plans.');
    } catch {
      hapticWarning();
      Alert.alert('Could Not Save', 'Please try again.');
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      const next = savedPlans.filter((p) => p.id !== planId);
      setSavedPlans(next);
      await AsyncStorage.setItem(HOSTING_PLANS_KEY, JSON.stringify(next));
      hapticSelection();
    } catch {
      hapticWarning();
      Alert.alert('Could Not Delete', 'Please try again.');
    }
  };

  const clearAllPlans = () => {
    Alert.alert('Delete Saved Plans', 'Remove all saved hosting plans?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All',
        style: 'destructive',
        onPress: async () => {
          try {
            setSavedPlans([]);
            await AsyncStorage.setItem(HOSTING_PLANS_KEY, JSON.stringify([]));
          } catch {
            Alert.alert('Could Not Delete', 'Please try again.');
          }
        },
      },
    ]);
  };

  const applyPlan = (plan: HostingPlan) => {
    hapticSelection();
    const planRejected = new Set<string>();
    const normalizedPreferences = {
      lowABV: !!plan.preferences?.lowABV,
      noCitrus: !!plan.preferences?.noCitrus,
      spiritForward: !!plan.preferences?.spiritForward,
      mocktails: !!plan.preferences?.mocktails,
    };
    const normalizedFilters: HostingPlanFilters = {
      spirit: (plan.filters?.spirit as SpiritFilter) || 'any',
      ingredients: Array.isArray(plan.filters?.ingredients) ? plan.filters!.ingredients : [],
    };
    const planMenu = buildRankedMenu(normalizedPreferences, plan.vibe, planRejected, normalizedFilters, '');
    const savedMatch = plan.selectedRecipeName
      ? planMenu.find((item) => item.name.toLowerCase() === plan.selectedRecipeName!.toLowerCase())
      : null;

    setRejectedIds(planRejected);
    setGuestCount(plan.guestCount);
    setVibe(plan.vibe);
    setPreferences(normalizedPreferences);
    setPlanFilters(normalizedFilters);
    setMenuFilterInput('');
    setMenuSearchQuery('');

    if (savedMatch) {
      if (!savedMatch.unlocked) {
        hapticWarning();
        setIsViewingSavedPlan(false);
        setSelectedRecipe(null);
        setStep(2);
        Alert.alert('Recipe Locked', 'This saved menu is currently locked on your tier.');
        return;
      }
      setIsViewingSavedPlan(true);
      setSelectedRecipe(savedMatch);
      setStep(2);
      hapticSuccess();
      return;
    }

    setIsViewingSavedPlan(false);
    setSelectedRecipe(null);
    setStep(2);
    if (plan.selectedRecipeName) {
      Alert.alert('Saved Menu Unavailable', 'That saved recipe is not currently in your top menu matches. You can reselect it from Step 3.');
    }
  };

  const rejectCocktail = (cocktail: MenuCocktail) => {
    hapticSelection();
    setRejectedIds((prev) => new Set(prev).add(cocktail.id));
    trackEvent('Hosting Recipe Rejected', { cocktail_id: cocktail.id, cocktail_name: cocktail.name, vibe });
  };

  const chooseCocktail = (cocktail: MenuCocktail) => {
    if (!cocktail.unlocked) {
      hapticWarning();
      Alert.alert('Locked Recipe', 'This recipe is locked on your current tier.');
      return;
    }
    hapticSuccess();
    setIsViewingSavedPlan(false);
    setSelectedRecipe(cocktail);
    trackEvent('Hosting Recipe Selected', { cocktail_id: cocktail.id, cocktail_name: cocktail.name, guest_count: guestCount });
  };

  const updateGuestCount = (next: number) => {
    if (next <= 4) {
      hapticSelection();
      setGuestCount(Math.max(1, next));
      trackEvent(ANALYTICS_EVENTS.PARTY_SCALED, { guest_count: Math.max(1, next), tier });
      return;
    }
    advancedHostingGate('T7', () => {
      hapticSelection();
      setGuestCount(Math.max(1, next));
      trackEvent(ANALYTICS_EVENTS.PARTY_SCALED, { guest_count: Math.max(1, next), tier });
    });
  };

  const addMissingToCart = async () => {
    if (shoppingGaps.length === 0) {
      hapticWarning();
      Alert.alert('No Missing Items', 'You already have what you need for top suggestions.');
      return;
    }

    try {
      const consolidated = await ShoppingListStore.getConsolidatedShoppingItems();
      const existing = new Set(consolidated.allItems.map((i) => i.name.toLowerCase()));

      const starterSuggestions = HomeBarService.getStarterBarIngredients();
      const brandMap = new Map<string, string>();
      starterSuggestions.forEach((s) => {
        if (s.commonBrands?.[0]) {
          brandMap.set(s.name.toLowerCase(), s.commonBrands[0]);
        }
      });

      let added = 0;
      for (const gap of shoppingGaps) {
        if (existing.has(gap.name.toLowerCase())) continue;
        await ShoppingListStore.addItemToShoppingList(
          {
            name: gap.name.replace(/\b\w/g, (m) => m.toUpperCase()),
            category: inferGroceryCategory(gap.name),
            brand: brandMap.get(gap.name.toLowerCase()),
            size: inferGroceryCategory(gap.name) === 'spirits_liquors' ? '750ml' : undefined,
            checked: false,
          } as any,
          'Hosting Planner',
          user?.id || 'default'
        );
        added += 1;
      }
      hapticSuccess();
      Alert.alert('Shopping List Updated', added > 0 ? `Added ${added} item${added === 1 ? '' : 's'}.` : 'All missing items are already in your cart.');
    } catch {
      hapticWarning();
      Alert.alert('Could Not Add', 'Please try again.');
    }
  };

  const addIngredientFilterTerms = (raw: string) => {
    const terms = raw
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    if (!terms.length) return;
    setPlanFilters((prev) => {
      const next = new Set(prev.ingredients);
      terms.forEach((term) => next.add(term));
      return { ...prev, ingredients: Array.from(next) };
    });
    setMenuFilterInput('');
  };

  const removeIngredientFilterTerm = (term: string) => {
    setPlanFilters((prev) => ({ ...prev, ingredients: prev.ingredients.filter((t) => t !== term) }));
  };

  const renderWizard = () => {
    if (step === 0) {
      return (
        <View style={[styles.sectionCard, styles.wizardCardCentered]}>
          <View style={styles.stepHeaderRow}>
            <Text style={styles.sectionTitle}>Step 1: Guest Count</Text>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>Target {safetyNetGuests}-{guestCount + 3}</Text>
            </View>
          </View>
          <Text style={styles.stepSubtitle}>Set your expected guest count, then pad for party pace.</Text>

          <View style={styles.guestRow}>
            <TouchableOpacity style={styles.adjustButton} onPress={() => updateGuestCount(guestCount - 1)}>
              <Ionicons name="remove" size={18} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.guestPill}>
              <Text style={styles.guestValue}>{guestCount}</Text>
              <Text style={styles.guestLabel}>people</Text>
            </View>
            <TouchableOpacity style={styles.adjustButton} onPress={() => updateGuestCount(guestCount + 1)}>
              <Ionicons name="add" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.batchHint}>Batch baseline: {batchMultiplier}x</Text>
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={15} color={colors.accent} />
            <Text style={styles.noticeText}>
              Party rule: guests rarely stop at one drink. Plan for 2-3 extra people as a safety net.
            </Text>
          </View>

          {!hasAdvancedHosting && (
            <View style={styles.lockRow}>
              <Ionicons name="lock-closed-outline" size={14} color={colors.accent} />
              <Text style={styles.lockText}>5+ guests requires PRO (advanced hosting).</Text>
            </View>
          )}

          <TouchableOpacity style={styles.primaryCta} onPress={() => { hapticSelection(); setStep(1); }}>
            <Text style={styles.primaryCtaText}>Continue</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 1) {
      return (
        <View style={[styles.sectionCard, styles.wizardCardCentered]}>
          <View style={styles.stepHeaderRow}>
            <Text style={styles.sectionTitle}>Step 2: Vibe & Preferences</Text>
            <TouchableOpacity
              style={[styles.stepFilterButton, menuFiltersVisible && styles.stepFilterButtonActive]}
              onPress={() => {
                hapticSelection();
                setMenuFiltersVisible((prev) => !prev);
              }}
            >
              <Ionicons name="search" size={15} color={menuFiltersVisible ? colors.bg : colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.stepSubtitle}>Choose the mood, then tune how the menu gets ranked.</Text>

          <View style={styles.groupCard}>
            <Text style={styles.groupTitle}>Event Vibe</Text>
            <View style={styles.vibeRow}>
              {([
                { key: 'casual', label: 'Casual', icon: 'cafe-outline' },
                { key: 'dinner', label: 'Dinner', icon: 'restaurant-outline' },
                { key: 'party', label: 'Party', icon: 'sparkles-outline' },
              ] as const).map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.vibeChip, vibe === option.key && styles.vibeChipActive]}
                    onPress={() => { hapticSelection(); setVibe(option.key); }}
                  >
                  <Ionicons
                    name={option.icon}
                    size={14}
                    color={vibe === option.key ? colors.bg : colors.subtext}
                    style={styles.vibeIcon}
                  />
                  <Text style={[styles.vibeText, vibe === option.key && styles.vibeTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.groupCard}>
            <Text style={styles.groupTitle}>Preference Filters</Text>
            <View style={styles.prefGroup}>
              {[
                { key: 'lowABV', label: 'Lower ABV', hint: 'Prioritize lighter drinks' },
                { key: 'noCitrus', label: 'No Citrus', hint: 'Avoid lemon/lime-forward drinks' },
                { key: 'spiritForward', label: 'Spirit-Forward', hint: 'Prioritize bolder builds' },
                { key: 'mocktails', label: 'Mocktails', hint: 'Show zero-proof menu options' },
              ].map((pref) => {
                const active = (preferences as any)[pref.key];
                return (
                  <TouchableOpacity
                    key={pref.key}
                    style={[styles.prefChip, active && styles.prefChipActive]}
                    onPress={() => { hapticSelection(); setPreferences((prev) => ({ ...prev, [pref.key]: !active })); }}
                  >
                    <View style={styles.prefTextWrap}>
                      <Text style={[styles.prefText, active && styles.prefTextActive]}>{pref.label}</Text>
                      <Text style={styles.prefHint}>{pref.hint}</Text>
                    </View>
                    <Ionicons
                      name={active ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={active ? colors.accent : colors.subtext}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {menuFiltersVisible && (
            <View style={styles.groupCard}>
              <View style={styles.filterInputRow}>
                <TextInput
                  value={menuFilterInput}
                  onChangeText={setMenuFilterInput}
                  onSubmitEditing={() => addIngredientFilterTerms(menuFilterInput)}
                  placeholder="Search by spirit or ingredient (comma separated)"
                  placeholderTextColor={colors.subtext}
                  style={[styles.filterInput, styles.filterInputFlex]}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={styles.addTermButton}
                  onPress={() => {
                    hapticSelection();
                    addIngredientFilterTerms(menuFilterInput);
                  }}
                >
                  <Ionicons name="add" size={16} color={colors.bg} />
                </TouchableOpacity>
              </View>

              {planFilters.ingredients.length > 0 && (
                <View style={styles.termList}>
                  {planFilters.ingredients.map((term) => (
                    <TouchableOpacity
                      key={term}
                      style={styles.termChip}
                      onPress={() => {
                        hapticSelection();
                        removeIngredientFilterTerm(term);
                      }}
                    >
                      <Text style={styles.termChipText}>{term}</Text>
                      <Ionicons name="close" size={12} color={colors.text} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.selectionSummaryCard}>
            <Text style={styles.selectionSummaryTitle}>Current Selection</Text>
            <Text style={styles.selectionSummaryText}>Guests: {guestCount}</Text>
            <Text style={styles.selectionSummaryText}>Vibe: {vibe.charAt(0).toUpperCase() + vibe.slice(1)}</Text>
            <Text style={styles.selectionSummaryText}>
              Search terms: {planFilters.ingredients.length ? planFilters.ingredients.join(', ') : 'None'}
            </Text>
            <Text style={styles.selectionSummaryText}>
              Filters:{' '}
              {preferences.lowABV || preferences.noCitrus || preferences.spiritForward || preferences.mocktails
                ? [
                    preferences.lowABV ? 'Lower ABV' : null,
                    preferences.noCitrus ? 'No Citrus' : null,
                    preferences.spiritForward ? 'Spirit-Forward' : null,
                    preferences.mocktails ? 'Mocktails' : null,
                  ]
                    .filter(Boolean)
                    .join(', ')
                : 'None'}
            </Text>
          </View>

          <View style={styles.wizardActions}>
            <TouchableOpacity style={styles.secondaryCta} onPress={() => { hapticSelection(); setStep(0); }}>
              <Text style={styles.secondaryCtaText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryCtaCompact} onPress={() => { hapticSelection(); setStep(2); }}>
              <Text style={styles.primaryCtaText}>See Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.sectionCard}>
        <View style={styles.step3HeaderRow}>
          <Text style={styles.sectionTitle}>Step 3: Menu You Can Make</Text>
          <TouchableOpacity
            style={styles.searchToggleButton}
            onPress={() => {
              hapticSelection();
              setMenuSearchVisible((prev) => {
                const next = !prev;
                if (!next) setMenuSearchQuery('');
                return next;
              });
            }}
          >
            <Ionicons name={menuSearchVisible ? 'close' : 'search'} size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
        {menuSearchVisible ? (
          <TextInput
            value={menuSearchQuery}
            onChangeText={setMenuSearchQuery}
            placeholder="Search cocktail or spirit..."
            placeholderTextColor={colors.subtext}
            style={styles.filterInput}
          />
        ) : null}
        <Text style={styles.stepSubtitleCentered}>
          {guestCount} guests • {vibe.charAt(0).toUpperCase() + vibe.slice(1)} vibe •{' '}
          {preferences.lowABV || preferences.noCitrus || preferences.spiritForward || preferences.mocktails
            ? [
                preferences.lowABV ? 'Lower ABV' : null,
                preferences.noCitrus ? 'No Citrus' : null,
                preferences.spiritForward ? 'Spirit-Forward' : null,
                preferences.mocktails ? 'Mocktails' : null,
              ]
                .filter(Boolean)
                .join(', ')
            : 'No filters'}
        </Text>
        <Text style={styles.ingredientLegend}>Green = ingredients already in your bar</Text>
        <Text style={styles.unlockLegend}>
          {unlockCounts.unlocked} unlocked • {unlockCounts.locked} locked
        </Text>
        {menu.length === 0 ? (
          <Text style={styles.emptyText}>No menu matches yet. Try changing vibe or preferences.</Text>
        ) : (
          menu.map((c) => (
            <View key={c.id} style={[styles.menuCard, !c.unlocked && styles.menuCardLocked]}>
              <TouchableOpacity onPress={() => chooseCocktail(c)} activeOpacity={0.85}>
                {(() => {
                  const missingSet = new Set(c.missingIngredients.map((i) => i.toLowerCase()));
                  const topIngredients = c.ingredients.slice(0, 6);
                  return (
                    <>
                      <View style={styles.menuBodyRow}>
                        <Image source={c.imageSource || getHostingThumbnail(c.name)} style={styles.menuThumb} />
                        <View style={styles.menuContent}>
                          <View style={styles.menuHeaderRow}>
                            <Text style={styles.menuName}>{c.name}</Text>
                            {c.unlocked ? <Text style={styles.unlockedBadge}>Unlocked</Text> : <Text style={styles.lockBadge}>Locked</Text>}
                          </View>
                          <Text style={styles.menuMeta}>{c.category} • {c.difficulty} • {c.confidence} confidence</Text>
                          <Text style={styles.whyText}>{c.why}</Text>
                        </View>
                      </View>
                      <View style={styles.ingredientRow}>
                        {topIngredients.map((ing) => {
                          const hasIngredient = !missingSet.has(ing.toLowerCase());
                          return (
                            <View key={`${c.id}-${ing}`} style={[styles.ingredientChip, hasIngredient && styles.ingredientChipOwned]}>
                              <Text style={[styles.ingredientChipText, hasIngredient && styles.ingredientChipTextOwned]} numberOfLines={1}>
                                {ing}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </>
                  );
                })()}
              </TouchableOpacity>
              <View style={styles.menuActions}>
                <TouchableOpacity style={styles.rejectButton} onPress={() => rejectCocktail(c)}>
                  <Text style={styles.rejectButtonText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.selectButton} onPress={() => chooseCocktail(c)}>
                  <Text style={styles.selectButtonText}>Choose</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={styles.wizardActions}>
          <TouchableOpacity style={styles.secondaryCta} onPress={() => { hapticSelection(); setStep(1); }}>
            <Text style={styles.secondaryCtaText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryCtaCompact} onPress={savePlan}>
            <Text style={styles.primaryCtaText}>Save Plan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCalculator = () => (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Batch Calculator</Text>
        <TouchableOpacity
          style={styles.editSetupButton}
          onPress={() => {
            hapticSelection();
            setIsViewingSavedPlan(false);
            setSelectedRecipe(null);
            setStep(0);
          }}
        >
          <Ionicons name="create-outline" size={14} color={colors.bg} />
          <Text style={styles.editSetupButtonText}>Edit Setup</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{selectedRecipe?.name}</Text>
        <Text style={styles.heroSubtitle}>{guestCount} guests • {batchMultiplier}x batch baseline</Text>
        <Text style={styles.heroSubtitle}>Safer prep target: {safetyNetGuests}-{guestCount + 3} guests</Text>
        {servingsPerBottle ? (
          <Text style={styles.bottleEstimate}>~{servingsPerBottle} servings per 750ml spirit bottle</Text>
        ) : null}
      </View>

      {selectedRecipeIngredients.map((ing) => (
        <View key={ing.name} style={styles.calcRow}>
          <Text style={styles.calcName}>{ing.name}</Text>
          <Text style={styles.calcAmount}>{ing.totalOz.toFixed(1)} oz ({Math.round(ing.totalMl)} ml)</Text>
        </View>
      ))}

      {dilutionEstimate ? (
        <>
          <View style={styles.calcRow}>
            <Text style={styles.calcName}>Dilution (water from shaking/stirring)</Text>
            <Text style={styles.calcAmount}>
              {dilutionEstimate.totalDilutionOz.toFixed(1)} oz ({Math.round(dilutionEstimate.totalDilutionMl)} ml)
            </Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcName}>Pre-dilution batch total</Text>
            <Text style={styles.calcAmount}>
              {totalsEstimate.preDilutionOz.toFixed(1)} oz ({Math.round(totalsEstimate.preDilutionMl)} ml)
            </Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcName}>Final batch volume (with dilution)</Text>
            <Text style={styles.calcAmount}>
              {totalsEstimate.finalOz.toFixed(1)} oz ({Math.round(totalsEstimate.finalMl)} ml)
            </Text>
          </View>
          <Text style={styles.dilutionNote}>
            Dilution estimate uses ~{dilutionEstimate.dilutionPerServeOz.toFixed(1)} oz water per drink.
          </Text>
        </>
      ) : selectedRecipeIsMocktail ? (
        <Text style={styles.dilutionNote}>Mocktail selected: no dilution estimate applied.</Text>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prep Checklist</Text>
        {checklist.map((block) => (
          <View key={block.title} style={styles.checklistCard}>
            <Text style={styles.checklistTitle}>{block.title}</Text>
            {block.steps.map((s) => (
              <Text key={`${block.title}-${s}`} style={styles.checklistStep}>• {s}</Text>
            ))}
          </View>
        ))}
      </View>

      {!isViewingSavedPlan ? (
        <View style={styles.wizardActions}>
          <TouchableOpacity style={styles.secondaryCta} onPress={() => { hapticSelection(); setSelectedRecipe(null); }}>
            <Text style={styles.secondaryCtaText}>Choose Another</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryCtaCompact} onPress={savePlan}>
            <Text style={styles.primaryCtaText}>Save Plan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.savedPlanLockNote}>
          Loaded from Saved Plan. Use Edit Setup to change recipe or save a new plan.
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <MainPageHeader title="Hosting Planner" subtitle="Loading..." showBackButton onBackPress={() => nav.goBack()} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
          <View style={styles.skeletonCard} />
          <View style={styles.skeletonCard} />
          <View style={styles.skeletonCard} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <MainPageHeader title="Hosting Planner" subtitle="Could not load data" showBackButton onBackPress={() => nav.goBack()} />
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.primaryCtaCompact} onPress={() => nav.goBack()}>
            <Text style={styles.primaryCtaText}>Back to Inventory</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const shouldShowMissingItems = selectedRecipe !== null || step === 2;
  const showSavedPlans = savedPlans.length > 0 && !selectedRecipe && step === 0;
  const isCenteredWizard = !selectedRecipe && (step === 0 || step === 1);

  return (
    <SafeAreaView style={styles.container}>
      <MainPageHeader
        title="Hosting Planner"
        subtitle={selectedRecipe ? 'Recipe Batch Mode' : `Step ${step + 1} of 3`}
        showBackButton
        onBackPress={() => nav.goBack()}
        rightActions={[{ icon: 'cart-outline', onPress: () => nav.navigate('ShoppingCart'), accessibilityLabel: 'Open shopping cart' }]}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {!selectedRecipe ? (
          <View style={isCenteredWizard ? styles.centerStage : undefined}>{renderWizard()}</View>
        ) : (
          renderCalculator()
        )}

        {shouldShowMissingItems && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Missing Items To Host Better</Text>
              <TouchableOpacity style={styles.addAllButton} onPress={addMissingToCart}>
                <Ionicons name="cart-outline" size={14} color={colors.bg} />
                <Text style={styles.addAllText}>Add All</Text>
              </TouchableOpacity>
            </View>
            {shoppingGaps.length === 0 ? (
              <Text style={styles.emptyText}>No critical gaps. Your bar is in strong shape for this plan.</Text>
            ) : (
              shoppingGaps.map((gap) => (
                <View key={gap.name} style={styles.gapRow}>
                  <View style={styles.gapLeft}>
                    <Ionicons name="alert-circle-outline" size={15} color={colors.accent} />
                    <Text style={styles.gapName}>{gap.name.replace(/\b\w/g, (m) => m.toUpperCase())}</Text>
                  </View>
                  <Text style={styles.gapCount}>Needed in {gap.count}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {showSavedPlans && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Saved Hosting Plans</Text>
              <TouchableOpacity style={styles.clearPlansButton} onPress={clearAllPlans}>
                <Ionicons name="trash-outline" size={14} color={colors.subtext} />
                <Text style={styles.clearPlansText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.savedPlansDescription}>
              Reuse previous setups quickly. Tap a saved plan to restore guest count, vibe, filters, and jump straight into its saved batch recipe.
            </Text>
            <View style={styles.savedPlanGrid}>
              {savedPlans.map((plan) => (
                <View key={plan.id} style={styles.savedPlanCard}>
                  <TouchableOpacity style={styles.savedPlanBody} onPress={() => applyPlan(plan)}>
                    <Text style={styles.savedPlanTitle}>{plan.guestCount} guests • {plan.vibe}</Text>
                    <Text style={styles.savedPlanRecipe}>
                      Menu: {plan.selectedRecipeName || 'No recipe saved'}
                    </Text>
                    <Text style={styles.savedPlanMeta}>{new Date(plan.createdAt).toLocaleDateString()}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.savedPlanDelete}
                    onPress={() => deletePlan(plan.id)}
                    accessibilityLabel="Delete saved plan"
                  >
                    <Ionicons name="close" size={14} color={colors.subtext} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
  contentContainer: {
    paddingHorizontal: spacing(2.5),
    paddingBottom: spacing(5),
    paddingTop: spacing(2),
    flexGrow: 1,
  },
  centerStage: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(3),
    gap: spacing(1.25),
  },
  skeletonCard: {
    width: '100%',
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  section: { marginBottom: spacing(2.5) },
  sectionCard: {
    marginBottom: spacing(2.5),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    padding: spacing(1.4),
  },
  wizardCardCentered: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 560,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(0.9),
    minHeight: 28,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 0,
    fontFamily: serif,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(1),
    minHeight: 30,
    marginBottom: spacing(0.75),
  },
  stepFilterButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepFilterButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  stepSubtitle: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing(1.25),
    textAlign: 'center',
  },
  stepSubtitleCentered: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing(1.25),
    textAlign: 'center',
  },
  ingredientLegend: {
    color: '#A7EDB0',
    fontSize: 11,
    marginTop: -spacing(0.35),
    marginBottom: spacing(0.9),
    textAlign: 'center',
    fontWeight: '600',
  },
  unlockLegend: {
    color: colors.subtext,
    fontSize: 11,
    marginTop: -spacing(0.45),
    marginBottom: spacing(0.9),
    textAlign: 'center',
    fontWeight: '600',
  },
  stepBadge: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.4)',
    backgroundColor: 'rgba(214,138,56,0.14)',
    paddingHorizontal: spacing(0.9),
    paddingVertical: spacing(0.35),
    alignSelf: 'center',
  },
  stepBadgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  hero: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(2),
  },
  heroTitle: { color: colors.text, fontSize: 22, fontFamily: serif, fontWeight: '700' },
  heroSubtitle: { color: colors.subtext, fontSize: 13, marginTop: spacing(0.5), lineHeight: 18 },
  bottleEstimate: { color: colors.accent, fontSize: 12, marginTop: spacing(0.75), fontWeight: '600' },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.5),
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestPill: {
    minWidth: 110,
    paddingVertical: spacing(1),
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  guestValue: { fontSize: 20, color: colors.text, fontWeight: '800' },
  guestLabel: { fontSize: 11, color: colors.subtext },
  batchHint: { marginTop: spacing(1), textAlign: 'center', color: colors.subtext, fontSize: 12 },
  noticeCard: {
    marginTop: spacing(1),
    flexDirection: 'row',
    gap: spacing(0.7),
    alignItems: 'flex-start',
    backgroundColor: 'rgba(214,138,56,0.12)',
    borderColor: 'rgba(214,138,56,0.35)',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.8),
  },
  noticeText: { color: colors.subtext, fontSize: 12, lineHeight: 17, flex: 1 },
  lockRow: {
    marginTop: spacing(1),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.6),
    backgroundColor: 'rgba(214,138,56,0.12)',
    borderColor: 'rgba(214,138,56,0.35)',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing(1.2),
    paddingVertical: spacing(0.8),
  },
  lockText: { color: colors.subtext, fontSize: 12 },
  groupCard: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(1),
    marginBottom: spacing(1),
  },
  groupTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing(0.8),
    letterSpacing: 0.3,
  },
  vibeRow: { flexDirection: 'row', gap: spacing(0.8) },
  vibeChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingVertical: spacing(0.85),
    paddingHorizontal: spacing(0.5),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  vibeChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  vibeIcon: { marginRight: spacing(0.4) },
  vibeText: { fontSize: 13, fontWeight: '600', color: colors.subtext },
  vibeTextActive: { color: colors.bg },
  spiritFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(0.6) },
  spiritChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(0.9),
    paddingVertical: spacing(0.55),
  },
  spiritChipActive: { borderColor: colors.accent, backgroundColor: 'rgba(214,138,56,0.18)' },
  spiritChipText: { color: colors.subtext, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  spiritChipTextActive: { color: colors.text },
  filterInput: {
    marginTop: spacing(0.85),
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 13,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.75),
  },
  filterInputRow: {
    marginTop: spacing(0.85),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.6),
  },
  filterInputFlex: {
    flex: 1,
    marginTop: 0,
  },
  addTermButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termList: {
    marginTop: spacing(0.75),
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.55),
  },
  termChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.35),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(0.75),
    paddingVertical: spacing(0.35),
  },
  termChipText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  prefGroup: { gap: spacing(0.7) },
  prefChip: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.75),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prefChipActive: { borderColor: colors.accent, backgroundColor: 'rgba(214,138,56,0.18)' },
  prefTextWrap: { flex: 1, paddingRight: spacing(1) },
  prefText: { color: colors.subtext, fontSize: 12, fontWeight: '700' },
  prefTextActive: { color: colors.text },
  prefHint: { color: colors.subtext, fontSize: 11, marginTop: 2, opacity: 0.92 },
  selectionSummaryCard: {
    marginBottom: spacing(0.6),
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(214,138,56,0.08)',
    padding: spacing(1),
  },
  selectionSummaryTitle: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing(0.45),
  },
  selectionSummaryText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  step3HeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(1),
  },
  searchToggleButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardActions: { flexDirection: 'row', gap: spacing(1), marginTop: spacing(1.25) },
  primaryCta: {
    marginTop: spacing(1.5),
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.2),
    alignItems: 'center',
  },
  primaryCtaCompact: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.1),
    alignItems: 'center',
  },
  primaryCtaText: { color: colors.bg, fontSize: 13, fontWeight: '700' },
  secondaryCta: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.1),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  secondaryCtaText: { color: colors.subtext, fontSize: 13, fontWeight: '700' },
  menuCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: spacing(1.4),
    marginBottom: spacing(1),
  },
  menuCardLocked: { opacity: 0.55 },
  menuBodyRow: { flexDirection: 'row', gap: spacing(1), alignItems: 'center' },
  menuThumb: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#120B07',
  },
  menuContent: { flex: 1 },
  menuHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  lockBadge: {
    fontSize: 10,
    color: colors.bg,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(0.8),
    paddingVertical: spacing(0.3),
    borderRadius: radii.pill,
    overflow: 'hidden',
    fontWeight: '700',
  },
  unlockedBadge: {
    fontSize: 10,
    color: '#0B1B10',
    backgroundColor: '#7EE08B',
    paddingHorizontal: spacing(0.8),
    paddingVertical: spacing(0.3),
    borderRadius: radii.pill,
    overflow: 'hidden',
    fontWeight: '700',
  },
  menuMeta: { color: colors.subtext, fontSize: 12, marginTop: spacing(0.25) },
  whyText: { color: colors.subtext, fontSize: 12, marginTop: spacing(0.6), lineHeight: 18 },
  ingredientRow: {
    marginTop: spacing(0.9),
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.5),
  },
  ingredientChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(0.8),
    paddingVertical: spacing(0.35),
    maxWidth: '48%',
  },
  ingredientChipOwned: {
    backgroundColor: 'rgba(60, 181, 75, 0.2)',
    borderColor: 'rgba(60, 181, 75, 0.65)',
  },
  ingredientChipText: {
    color: colors.subtext,
    fontSize: 11,
    fontWeight: '600',
  },
  ingredientChipTextOwned: {
    color: '#A7EDB0',
  },
  menuActions: { marginTop: spacing(1), flexDirection: 'row', gap: spacing(0.8), justifyContent: 'flex-end' },
  rejectButton: {
    paddingHorizontal: spacing(1.3),
    paddingVertical: spacing(0.7),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  rejectButtonText: { color: colors.subtext, fontSize: 12, fontWeight: '600' },
  selectButton: {
    paddingHorizontal: spacing(1.3),
    paddingVertical: spacing(0.7),
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  selectButtonText: { color: colors.bg, fontSize: 12, fontWeight: '700' },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(1),
    marginBottom: spacing(0.75),
  },
  calcName: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1, marginRight: spacing(1) },
  calcAmount: { color: colors.subtext, fontSize: 12 },
  dilutionNote: {
    color: colors.subtext,
    fontSize: 11,
    marginBottom: spacing(1.1),
    marginTop: spacing(0.2),
  },
  savedPlanLockNote: {
    color: colors.subtext,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing(0.8),
  },
  checklistCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: spacing(1.2),
    marginBottom: spacing(0.8),
  },
  checklistTitle: { color: colors.accent, fontSize: 12, fontWeight: '700', marginBottom: spacing(0.45) },
  checklistStep: { color: colors.subtext, fontSize: 12, lineHeight: 18 },
  addAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.6),
    borderRadius: radii.pill,
  },
  addAllText: { color: colors.bg, fontSize: 12, fontWeight: '700' },
  editSetupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.45),
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(1.1),
    paddingVertical: spacing(0.55),
    borderRadius: radii.pill,
  },
  editSetupButtonText: { color: colors.bg, fontSize: 11, fontWeight: '700' },
  gapRow: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(1),
    marginBottom: spacing(0.75),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gapLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.75), flex: 1 },
  gapName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  gapCount: { color: colors.subtext, fontSize: 11, marginLeft: spacing(1) },
  emptyText: { color: colors.subtext, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  clearPlansButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
  },
  clearPlansText: { color: colors.subtext, fontSize: 11, fontWeight: '700' },
  savedPlansDescription: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing(0.9),
  },
  savedPlanGrid: { gap: spacing(0.8) },
  savedPlanCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedPlanBody: {
    flex: 1,
    paddingHorizontal: spacing(1.1),
    paddingVertical: spacing(0.9),
  },
  savedPlanTitle: { color: colors.text, fontSize: 12, fontWeight: '700' },
  savedPlanRecipe: { color: colors.subtext, fontSize: 11, marginTop: 2 },
  savedPlanMeta: { color: colors.subtext, fontSize: 11, marginTop: 2 },
  savedPlanDelete: {
    width: 36,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
  },
});
