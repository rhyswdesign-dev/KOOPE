/**
 * Bottle Detail Screen
 * Shows detailed information about a scanned spirit bottle
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Share,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import type { CameraStackParamList } from '../navigation/CameraStack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { getPriceTierDisplay } from '../data/spiritsDatabase';
import { useXPSystem } from '../store/useXPSystem';
import * as Localization from 'expo-localization';
import { supabase } from '../lib/supabase';
import { InventoryService } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { sortByMatch, getMatchMessage } from '../utils/recipeMatching';
import type { RecipeMatch } from '../utils/recipeMatching';
import { RecipesRepository } from '../repos/supabase';
import { useUserTier } from '../store/useUserTier';
import { isCocktailAccessible, TIER_LIMITS, SPIRIT_STARTER_MAP } from '../config/tierAccess';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import type { UserInventoryItem } from '../types/database';
import { BottleServeService } from '../services/bottleServeService';
import { useEngagement } from '../store/useEngagement';
import { getCocktailImage } from '../../assets/images/cocktails';
import RecipeCard from '../components/RecipeCard';
import { ScanHistoryService } from '../services/scanHistoryService';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';

type BottleDetailScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<CameraStackParamList, 'BottleDetail'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const SPIRIT_ALIAS_MAP: Record<string, string> = {
  whisky: 'whiskey',
  bourbon: 'whiskey',
  scotch: 'whiskey',
  rye: 'whiskey',
  cognac: 'brandy',
};

// ─── Spirit-category fallbacks ────────────────────────────────────────────────
// Used when a specific bottle lacks flavor profile or tasting notes data.
// Ensures every scan returns useful, contextually accurate information.

interface SpiritCategoryDefaults {
  flavorProfile: string[];
  tastingNotes: string;
  origin: string;
}

const SPIRIT_CATEGORY_DEFAULTS: Record<string, SpiritCategoryDefaults> = {
  gin: {
    flavorProfile: ['Juniper', 'Citrus', 'Botanical'],
    tastingNotes: 'A London Dry-style gin with classic juniper at the fore, bright citrus notes, and a layered botanical finish. Crisp and dry.',
    origin: 'United Kingdom',
  },
  vodka: {
    flavorProfile: ['Clean', 'Smooth', 'Neutral'],
    tastingNotes: 'A clean, neutral spirit with a smooth palate and a crisp finish. Subtle grain sweetness makes it exceptionally versatile.',
    origin: 'Europe',
  },
  whiskey: {
    flavorProfile: ['Caramel', 'Vanilla', 'Oak'],
    tastingNotes: 'Rich caramel and vanilla upfront, underpinned by toasted oak and a hint of dried fruit. Warm, rounded finish.',
    origin: 'United States',
  },
  rum: {
    flavorProfile: ['Vanilla', 'Tropical Fruit', 'Caramel'],
    tastingNotes: 'Sweet vanilla and tropical fruit on the nose, with warm caramel and a touch of molasses on the palate. Smooth finish.',
    origin: 'Caribbean',
  },
  tequila: {
    flavorProfile: ['Agave', 'Citrus', 'Pepper'],
    tastingNotes: '100% agave character — fresh vegetal notes, bright citrus, and white pepper. Clean, smooth, and true to the plant.',
    origin: 'Mexico',
  },
  mezcal: {
    flavorProfile: ['Smoke', 'Agave', 'Earthy'],
    tastingNotes: 'Artisanal smoke from slow-roasted agave hearts, with earthy mineral notes and a long, complex finish.',
    origin: 'Mexico',
  },
  brandy: {
    flavorProfile: ['Dried Fruit', 'Oak', 'Vanilla'],
    tastingNotes: 'Warm dried fruit and toasted oak with vanilla undertones. Smooth and balanced with a gentle warming finish.',
    origin: 'France',
  },
  liqueur: {
    flavorProfile: ['Sweet', 'Fruit', 'Herbal'],
    tastingNotes: 'A sweet, approachable liqueur with fruit and herbal character. Versatile as a modifier in cocktails or over ice.',
    origin: 'Europe',
  },
  other: {
    flavorProfile: ['Complex', 'Aromatic', 'Distinct'],
    tastingNotes: 'A distinctive spirit with its own character. Explore neat first to understand its personality before building cocktails.',
    origin: 'International',
  },
};

function getSpiritCategoryDefaults(bottle: any): SpiritCategoryDefaults {
  const type = normalizeSpiritToken((bottle as any).type || (bottle as any).category);
  return SPIRIT_CATEGORY_DEFAULTS[type] ?? SPIRIT_CATEGORY_DEFAULTS.other;
}

function normalizeSpiritToken(value: string | undefined | null): string {
  const token = (value || '').toLowerCase().trim();
  if (!token) return '';
  return SPIRIT_ALIAS_MAP[token] || token;
}

function getRespectThisBottleScore(
  recipe: any,
  spiritName: string,
  bottle: any,
  serveRecommendation: ReturnType<typeof BottleServeService.getRecommendation>
): number {
  const tags = Array.isArray(recipe.tags) ? recipe.tags.map((tag: string) => String(tag).toLowerCase()) : [];
  const category = String(recipe.category || '').toLowerCase();
  const name = String(recipe.name || '').toLowerCase();
  const description = String(recipe.description || '').toLowerCase();
  const difficulty = String(recipe.difficulty || '').toLowerCase();
  const ingredientsCount = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.length
    : typeof recipe.ingredients === 'string'
      ? recipe.ingredients.split(/[,|]/).filter(Boolean).length
      : 0;

  let score = 0;

  if (tags.includes('classic')) score += 10;
  if (tags.includes('stirred')) score += 12;
  if (tags.includes('spirit-forward')) score += 18;
  if (tags.includes('smoky') && serveRecommendation.spiritFamily === 'scotch') score += 10;
  if (tags.includes('agave') && serveRecommendation.spiritFamily === 'tequila') score += 10;
  if (['old fashioned', 'manhattan', 'sazerac'].some((needle) => name.includes(needle))) score += 18;
  if (['boozy', 'spirit-forward', 'minimal dilution'].some((needle) => description.includes(needle))) score += 10;
  if (category.includes('old fashioned') || category.includes('martini')) score += 8;
  if (difficulty === 'easy') score += 4;
  if (ingredientsCount > 0 && ingredientsCount <= 4) score += 10;
  if (ingredientsCount >= 7) score -= 15;
  if (tags.includes('tiki')) score -= 25;
  if (tags.includes('tropical')) score -= 20;
  if (tags.includes('creamy')) score -= 18;
  if (tags.includes('frozen')) score -= 25;
  if (tags.includes('brunch')) score -= 10;
  if (tags.includes('dessert')) score -= 12;
  if (tags.includes('equal-parts')) score -= 8;
  if (tags.includes('sour')) score -= 6;
  if (tags.includes('highball')) score -= 4;

  if (spiritName === 'whiskey' && tags.includes('whiskey')) score += 6;
  if (spiritName === 'tequila' && tags.includes('tequila')) score += 6;
  if (spiritName === 'mezcal' && tags.includes('mezcal')) score += 8;
  if (spiritName === 'brandy' && (tags.includes('cognac') || tags.includes('brandy'))) score += 8;
  if (String(bottle.name || '').toLowerCase().includes('scotch') && tags.includes('scotch')) score += 10;

  return score;
}

function normalizeInventoryName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function formatDisplayDate(value?: string | null): string {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getSuggestedDrinkingWindow(bottle: any): { start: string; end: string; note: string } {
  const bottleType = String(bottle.type || bottle.category || '').toLowerCase();
  const priceTier = String(bottle.priceTier || '').toLowerCase();

  if (['vermouth', 'cream liqueur', 'liqueur'].some((token) => bottleType.includes(token))) {
    return {
      start: 'Now',
      end: 'Within 6 months',
      note: 'Best enjoyed on the fresher side. Once opened, keep an eye on oxidation and sweetness flattening.',
    };
  }

  if (priceTier === 'luxury' || priceTier === 'premium') {
    return {
      start: 'Now',
      end: '2-5 years',
      note: 'This bottle can sit in the cellar for special pours. Track fill level and heat exposure more than age.',
    };
  }

  return {
    start: 'Now',
    end: '1-3 years',
    note: 'Most spirits are shelf-stable, but premium texture and aromatics hold best when stored upright and cool.',
  };
}

function getCellarValuation(bottle: any, currency: 'USD' | 'CAD' | 'GBP', purchasePrice?: number | null): number {
  const estimate = bottle?.priceEstimate?.[currency];
  const midpoint = estimate ? (estimate.min + estimate.max) / 2 : 0;
  const priceTier = String(bottle?.priceTier || '').toLowerCase();
  const multiplier =
    priceTier === 'luxury' ? 1.16 :
    priceTier === 'premium' ? 1.08 :
    priceTier === 'mid' ? 1.02 :
    0.96;

  if (purchasePrice && purchasePrice > 0) {
    return Number((purchasePrice * multiplier).toFixed(2));
  }

  return Number((midpoint * multiplier).toFixed(2));
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.42;

export default function BottleDetailScreen() {
  const navigation = useNavigation<BottleDetailScreenNavigationProp>();
  const route = useRoute<RouteProp<CameraStackParamList, 'BottleDetail'>>();
  const insets = useSafeAreaInsets();
  const { earnScanXP, isCocktailUnlockedWithXP } = useXPSystem();
  const { isRecipeUnlocked: isRecipeUnlockedWithEngagement } = useEngagement();
  const { user } = useAuth();
  const { tier } = useUserTier();
  const { gateWithTrigger: inventoryGate } = useFeatureAccess('inventory_unlimited');
  const { hasAccess: hasPremiumServeEducation } = useFeatureAccess('premium_serve_education');
  const { hasAccess: hasPremiumServePersonalization } = useFeatureAccess('premium_serve_personalization');
  const { hasAccess: hasCellarMode, gateWithTrigger: cellarModeGate } = useFeatureAccess('cellar_mode');
  const { bottle, imageUri } = route.params;
  const [userCurrency, setUserCurrency] = useState<'USD' | 'CAD' | 'GBP'>('USD');
  const [userRegion, setUserRegion] = useState<string>('');
  const [suggestedCocktails, setSuggestedCocktails] = useState<Array<any & { match: RecipeMatch }>>([]);
  const [lockedCocktailCount, setLockedCocktailCount] = useState(0);
  const [lockedCocktailTeaser, setLockedCocktailTeaser] = useState<{ name: string; subtitle: string } | null>(null);
  const [loadingCocktails, setLoadingCocktails] = useState(true);
  const [inventoryItem, setInventoryItem] = useState<UserInventoryItem | null>(null);
  const [cellarModalVisible, setCellarModalVisible] = useState(false);
  const [savingCellar, setSavingCellar] = useState(false);
  const [cellarExpanded, setCellarExpanded] = useState(false);
  const [purchasePriceInput, setPurchasePriceInput] = useState('');
  const [acquiredAtInput, setAcquiredAtInput] = useState('');
  const [windowStartInput, setWindowStartInput] = useState('');
  const [windowEndInput, setWindowEndInput] = useState('');
  const [cellarNotesInput, setCellarNotesInput] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState<'full' | 'half' | 'low' | 'empty'>('full');
  const serveRecommendation = useMemo(
    () => BottleServeService.getRecommendation(bottle, tier),
    [bottle, tier]
  );

  // Merge bottle-specific data with spirit-category defaults so every scan
  // shows a complete profile — even if individual bottle data is sparse.
  const bottleProfile = useMemo(() => {
    const defaults = getSpiritCategoryDefaults(bottle);
    return {
      flavorProfile: bottle.flavorProfile?.length > 0 ? bottle.flavorProfile : defaults.flavorProfile,
      tastingNotes: bottle.tastingNotes?.trim() ? bottle.tastingNotes : defaults.tastingNotes,
      origin: bottle.origin?.trim() ? bottle.origin : defaults.origin,
      isFlavorFallback: !(bottle.flavorProfile?.length > 0),
      isTastingFallback: !bottle.tastingNotes?.trim(),
    };
  }, [bottle]);

  const suggestedCellarWindow = useMemo(() => getSuggestedDrinkingWindow(bottle), [bottle]);
  const cellarValuation = useMemo(
    () => getCellarValuation(bottle, userCurrency, inventoryItem?.purchase_price ?? null),
    [bottle, userCurrency, inventoryItem?.purchase_price]
  );

  const openCellarModal = () => {
    if (!inventoryItem) return;
    setPurchasePriceInput(
      inventoryItem.purchase_price !== null && inventoryItem.purchase_price !== undefined
        ? String(inventoryItem.purchase_price)
        : ''
    );
    setAcquiredAtInput(
      inventoryItem.acquired_at
        ? String(inventoryItem.acquired_at).slice(0, 10)
        : String(inventoryItem.added_at || '').slice(0, 10)
    );
    setWindowStartInput(inventoryItem.drinking_window_start || suggestedCellarWindow.start);
    setWindowEndInput(inventoryItem.drinking_window_end || suggestedCellarWindow.end);
    setCellarNotesInput(inventoryItem.cellar_notes || '');
    setSelectedQuantity(((inventoryItem.quantity as any) || 'full') as 'full' | 'half' | 'low' | 'empty');
    setCellarModalVisible(true);
  };

  const handleSaveCellar = async () => {
    if (!inventoryItem) return;

    const parsedPrice = purchasePriceInput.trim().length > 0 ? Number(purchasePriceInput) : null;
    if (parsedPrice !== null && Number.isNaN(parsedPrice)) {
      Alert.alert('Invalid Price', 'Enter a valid number for purchase price.');
      return;
    }

    setSavingCellar(true);
    const nextValuation = getCellarValuation(bottle, userCurrency, parsedPrice);
    const success = await InventoryService.updateInventoryItem(inventoryItem.id, {
      quantity: selectedQuantity,
      purchasePrice: parsedPrice,
      acquiredAt: acquiredAtInput.trim() || null,
      drinkingWindowStart: windowStartInput.trim() || null,
      drinkingWindowEnd: windowEndInput.trim() || null,
      cellarNotes: cellarNotesInput.trim() || null,
      valuationEstimate: nextValuation,
    });
    setSavingCellar(false);

    if (!success) {
      Alert.alert('Save Failed', 'Unable to update this bottle in Cellar Mode right now.');
      return;
    }

    setInventoryItem((prev) => prev ? {
      ...prev,
      quantity: selectedQuantity,
      purchase_price: parsedPrice,
      acquired_at: acquiredAtInput.trim() || null,
      drinking_window_start: windowStartInput.trim() || null,
      drinking_window_end: windowEndInput.trim() || null,
      cellar_notes: cellarNotesInput.trim() || null,
      valuation_estimate: nextValuation,
    } : prev);
    setCellarModalVisible(false);
    Alert.alert('Cellar Updated', 'Your collector details have been saved for this bottle.');

    // Fire or cancel low stock alert based on the saved quantity
    if (selectedQuantity === 'low' || selectedQuantity === 'empty') {
      notificationService.scheduleLowStockAlert(inventoryItem.id, bottle.name).catch(() => {});
    } else {
      notificationService.cancelLowStockAlert(inventoryItem.id).catch(() => {});
    }
  };

  useEffect(() => {
    // Record this bottle to the user's scan history journal
    ScanHistoryService.recordScan(bottle, imageUri).catch(() => {});

    // Fire funnel analytics — scan is the first step in the conversion funnel
    trackEvent(ANALYTICS_EVENTS.SCAN_SUCCESS, {
      [ANALYTICS_PROPS.ITEM_NAME]: bottle.name,
      [ANALYTICS_PROPS.SCAN_TYPE]: 'bottle',
      spirit_type: bottle.type || bottle.category || 'unknown',
    });
  }, [bottle.id]);

  useEffect(() => {
    // Detect user's currency based on locale
    const locale = Localization.getLocales()[0];
    const region = locale.regionCode || '';
    setUserRegion(region);

    // Map region to currency
    if (region === 'CA') {
      setUserCurrency('CAD');
    } else if (region === 'GB' || region === 'UK') {
      setUserCurrency('GBP');
    } else {
      setUserCurrency('USD'); // Default to USD
    }
  }, []);

  useEffect(() => {
    // Show recipes relevant to the scanned bottle from the user's currently
    // accessible pool. Free sees up to 3 suggestions; paid tiers see more.
    const fetchCocktails = async () => {
      setLoadingCocktails(true);
      try {
        // 1. Fetch user's inventory
        const userInventory = user ? await InventoryService.getUserInventory(user.id) : [];
        const matchedInventoryItem = userInventory.find((item) =>
          normalizeInventoryName(item.item_name) === normalizeInventoryName(bottle.name)
        ) || null;
        setInventoryItem(matchedInventoryItem);

        // 1.5. Create combined inventory including the scanned bottle
        // This allows match calculation to consider cocktails you can make WITH this bottle
        const combinedInventory: UserInventoryItem[] = [
          ...userInventory,
          {
            id: 'temp-scanned-bottle',
            user_id: user?.id || '',
            item_name: bottle.name,
            item_type: 'spirit' as const,
            category: bottle.type || null,
            image_url: null,
            added_at: new Date().toISOString(),
            scanned_at: new Date().toISOString(),
            user_searched_nearby: false,
            last_used_at: null,
          },
        ];

        // 2. Load full recipes so ingredient-based match scoring is accurate.
        // Using initial/lite recipes can produce empty-ingredient ties and poor ranking.
        const recipesData = await RecipesRepository.getAllRecipes(0, 300);

        // 3. Resolve scanned spirit (canonical token)
        let spiritName = normalizeSpiritToken((bottle as any).type || (bottle as any).category);

        // Fallback: Extract spirit type from bottle name if category is missing
        if (!spiritName && bottle.name) {
          const bottleName = bottle.name.toLowerCase();
          const spiritTypes = ['vodka', 'gin', 'rum', 'tequila', 'whiskey', 'whisky', 'bourbon', 'scotch', 'brandy', 'cognac', 'mezcal', 'rye'];

          for (const spirit of spiritTypes) {
            if (bottleName.includes(spirit)) {
              spiritName = normalizeSpiritToken(spirit);
              console.log(`BottleDetailScreen: Extracted spirit "${spiritName}" from bottle name "${bottle.name}"`);
              break;
            }
          }
        }

        // If no spirit category detected, show no suggestions
        if (!spiritName) {
          console.log('BottleDetailScreen: No spirit name detected from category or name');
          setSuggestedCocktails([]);
          setLoadingCocktails(false);
          return;
        }

        console.log('BottleDetailScreen: Filtering cocktails for spirit:', spiritName);
        console.log('BottleDetailScreen: Total recipes to check:', recipesData.length);
        if (recipesData.length > 0) {
          console.log('Sample recipe structure:', {
            name: recipesData[0].name,
            baseSpirit: recipesData[0].baseSpirit,
            category: recipesData[0].category,
            tags: recipesData[0].tags
          });
        }

        let matchedData = recipesData.filter((recipe) => {
          const baseSpirit = normalizeSpiritToken(recipe.baseSpirit);
          const spiritsUsed = (recipe.spiritsUsed || []).map((s) => normalizeSpiritToken(s));

          if (baseSpirit === spiritName) return true;
          if (spiritsUsed.includes(spiritName)) return true;

          // Fallback only for legacy/incomplete rows where spirit fields are empty
          if (!baseSpirit && spiritsUsed.length === 0) {
            const tags = Array.isArray(recipe.tags)
              ? recipe.tags.map((t) => normalizeSpiritToken(t))
              : [];
            const category = normalizeSpiritToken(recipe.category);
            return tags.includes(spiritName) || category === spiritName;
          }

          return false;
        });

        console.log(`BottleDetailScreen: Found ${matchedData.length} recipes matching "${spiritName}"`);
        if (matchedData.length > 0 && matchedData.length <= 3) {
          console.log('Sample matched recipes:', matchedData.slice(0, 3).map(r => ({ name: r.name, baseSpirit: r.baseSpirit })));
        }

        // 3.5. For Free tier: split into accessible and locked pools so we can
        // show the best 3 accessible recipes plus a teaser card for locked ones.
        const rankRecipes = (data: typeof matchedData) => {
          const withMatch = sortByMatch(data as any[], combinedInventory);
          return [...withMatch].sort((a, b) => {
            if (serveRecommendation.cocktailPlacement !== 'secondary') {
              return b.match.matchPercentage - a.match.matchPercentage;
            }
            const aRespect = getRespectThisBottleScore(a, spiritName, bottle, serveRecommendation);
            const bRespect = getRespectThisBottleScore(b, spiritName, bottle, serveRecommendation);
            if (bRespect !== aRespect) return bRespect - aRespect;
            if (b.match.matchPercentage !== a.match.matchPercentage) {
              return b.match.matchPercentage - a.match.matchPercentage;
            }
            return String(a.name || '').localeCompare(String(b.name || ''));
          });
        };

        if (tier === 'FREE') {
          // Accessible: free 9 + any XP/engagement unlocks
          const accessibleData = matchedData.filter(recipe =>
            isCocktailAccessible(recipe.id, tier) ||
            isCocktailUnlockedWithXP(recipe.id) ||
            isRecipeUnlockedWithEngagement(recipe.id)
          );
          // Boost starter recipes for this spirit to the front of accessible results
          const starterIds = SPIRIT_STARTER_MAP[spiritName] || [];
          const starterFirst = [
            ...accessibleData.filter(r => starterIds.includes(r.id)),
            ...accessibleData.filter(r => !starterIds.includes(r.id)),
          ];
          const ranked = rankRecipes(starterFirst);
          const topMatches = ranked.slice(0, 3);
          setSuggestedCocktails(topMatches);

          // Locked: everything else that matched the spirit but isn't accessible
          const lockedData = matchedData.filter(recipe =>
            !isCocktailAccessible(recipe.id, tier) &&
            !isCocktailUnlockedWithXP(recipe.id) &&
            !isRecipeUnlockedWithEngagement(recipe.id)
          );
          const rankedLocked = rankRecipes(lockedData);
          setLockedCocktailCount(lockedData.length);
          setLockedCocktailTeaser(
            rankedLocked[0]
              ? { name: rankedLocked[0].name, subtitle: rankedLocked[0].subtitle || 'Classic recipe' }
              : null
          );
        } else {
          // 4. Paid tiers: rank and show top 5
          const ranked = rankRecipes(matchedData);
          const topMatches = ranked.slice(0, 5);
          setSuggestedCocktails(topMatches);
          setLockedCocktailCount(0);
          setLockedCocktailTeaser(null);
        }
      } catch (error) {
        console.error('Error fetching cocktails:', error);
        setInventoryItem(null);
        setSuggestedCocktails([]);
        setLockedCocktailCount(0);
        setLockedCocktailTeaser(null);
      } finally {
        setLoadingCocktails(false);
      }
    };

    fetchCocktails();
  }, [bottle, bottle.type, bottle.name, user, tier, isCocktailUnlockedWithXP, isRecipeUnlockedWithEngagement, serveRecommendation]);

  const handleAddToInventory = async () => {
    // Check if user is signed in
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to add bottles to your inventory.',
        [
          { text: 'Sign In', onPress: () => navigation.navigate('Settings') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    // T1: Check inventory limit for free users
    if (tier === 'FREE') {
      const count = await InventoryService.getInventoryCount(user.id);
      if (count >= TIER_LIMITS.FREE.maxBottles) {
        inventoryGate('T1');
        return;
      }
    }

    // Add bottle to Supabase inventory
    const result = await InventoryService.addToInventory({
      userId: user.id,
      itemType: 'spirit',
      itemName: bottle.name,
      category: bottle.type === 'liqueur' ? 'liqueur' : 'spirit',
      imageUrl: imageUri || undefined,
      subcategory: bottle.type,
      brand: bottle.brand,
      abv: bottle.abv,
      volume: 750,
      region: bottleProfile.origin,
      flavorTags: bottleProfile.flavorProfile,
      tastingNotes: bottleProfile.tastingNotes,
      serveGuidance: `${serveRecommendation.heroTitle}. ${serveRecommendation.why} ${serveRecommendation.cocktailUse}`.trim(),
    });

    if (result.duplicate) {
      Alert.alert(
        'Already in Inventory',
        `${bottle.name} is already in your inventory!`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (!result.success) {
      Alert.alert(
        'Error',
        'Failed to add to inventory. Please try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Award XP for scanning/adding this bottle (50 XP first time, 5 XP repeats)
    const { xpEarned } = earnScanXP(bottle.id);
    const xpLine = xpEarned > 0 ? `\n\n+${xpEarned} XP earned` : '';

    Alert.alert(
      'Added to Inventory!',
      `${bottle.name} has been added to your inventory.${xpLine}`,
      [
        {
          text: 'View Inventory',
          onPress: () => navigation.navigate('HomeBar'),
        },
        {
          text: 'Scan Another',
          onPress: () => navigation.navigate('SmartScan'),
        },
        {
          text: 'OK',
        },
      ]
    );
  };

  const handleFindNearby = async () => {
    // Track brand data: user clicked "Find Nearby"
    if (user) {
      // Mark in inventory that user searched nearby for this item
      await InventoryService.markSearchedNearby(user.id, bottle.name);

      // Find and update the most recent scan for this bottle
      try {
        const { data: recentScan } = await supabase
          .from('user_scans')
          .select('id')
          .eq('user_id', user.id)
          .eq('item_name', bottle.name)
          .order('scanned_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentScan) {
          await InventoryService.trackFindStoresClick(recentScan.id);
        }
      } catch (error) {
        // Non-critical error, just log it
        console.error('Error tracking find stores click:', error);
      }
    }

    // Open Google Maps search for the bottle
    const searchQuery = encodeURIComponent(`${bottle.name} near me`);
    const url = `https://www.google.com/maps/search/${searchQuery}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open maps');
    });
  };

  const handleLearnMore = () => {
    // Search for the bottle online
    const searchQuery = encodeURIComponent(bottle.name);
    const url = `https://www.google.com/search?q=${searchQuery}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open browser');
    });
  };

  const handleShareFind = async () => {
    const topRecipe = suggestedCocktails[0];
    const priceLine = bottle.priceEstimate
      ? ` · ${userCurrency === 'GBP' ? '£' : '$'}${bottle.priceEstimate[userCurrency].min}–${userCurrency === 'GBP' ? '£' : '$'}${bottle.priceEstimate[userCurrency].max}`
      : '';
    const recipeLine = topRecipe ? ` · Makes a great ${topRecipe.name}` : '';
    const message = `Found on KOOPE: ${bottle.name} by ${bottle.brand}${priceLine}${recipeLine}. Try KOOPE — the bartender's scanning app.`;
    try {
      await Share.share({ message });
    } catch {
      // Share dismissed — no-op
    }
  };

  const handleTryAnother = () => {
    // Navigate back to SmartScan to scan another bottle
    navigation.navigate('SmartScan');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, spacing(3)) + spacing(8) },
        ]}
      >
        {/* Full-bleed hero header */}
        <View style={styles.heroContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroImageFallback} />
          )}

          {/* Deep gradient overlay for legibility */}
          <LinearGradient
            colors={['transparent', 'rgba(10,5,3,0.55)', 'rgba(10,5,3,0.97)']}
            locations={[0.3, 0.65, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Back / close button */}
          <TouchableOpacity
            style={[styles.heroBackButton, { top: insets.top + spacing(1) }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Identified badge */}
          <View style={[styles.heroBadge, { top: insets.top + spacing(1) }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.gold} />
            <Text style={styles.heroBadgeText}>Identified</Text>
          </View>

          {/* Bottle name & stats anchored to bottom of hero */}
          <View style={styles.heroContent}>
            {!imageUri && (
              <View style={styles.heroIconFallback}>
                <Ionicons name="wine" size={48} color={colors.gold} />
              </View>
            )}
            <Text style={styles.heroBottleName} numberOfLines={2}>{bottle.name}</Text>
            <Text style={styles.heroBottleBrand}>{bottle.brand}</Text>

            {/* Inline stat pills */}
            <View style={styles.heroPills}>
              <View style={styles.heroPill}>
                <Ionicons name="flash" size={13} color={colors.gold} />
                <Text style={styles.heroPillText}>{bottle.abv}% ABV</Text>
              </View>
              <View style={styles.heroPillDivider} />
              <View style={styles.heroPill}>
                <Ionicons name="location" size={13} color={colors.gold} />
                <Text style={styles.heroPillText}>{bottleProfile.origin}</Text>
              </View>
              <View style={styles.heroPillDivider} />
              <View style={styles.heroPill}>
                <Ionicons name="pricetag" size={13} color={colors.gold} />
                <Text style={styles.heroPillText}>{getPriceTierDisplay(bottle.priceTier)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Body content — padded */}
        <View style={styles.bodyContent}>

        {/* Price Estimate */}
        <View style={styles.priceCard}>
          <View style={styles.priceHeader}>
            <Ionicons name="cash-outline" size={20} color={colors.accent} />
            <Text style={styles.priceTitle}>Typical Price Range</Text>
            {userRegion && (
              <Text style={styles.regionBadge}>{userRegion}</Text>
            )}
          </View>
          <Text style={styles.priceText}>
            {userCurrency === 'GBP' ? '£' : '$'}
            {bottle.priceEstimate[userCurrency].min} - {userCurrency === 'GBP' ? '£' : '$'}
            {bottle.priceEstimate[userCurrency].max} {userCurrency}
          </Text>
          <Text style={styles.priceDisclaimer}>
            * Prices vary by location and retailer
          </Text>
        </View>

        <View style={[
          styles.serveCard,
          serveRecommendation.isPremiumExperience && styles.serveCardPremium,
        ]}>
          <View style={styles.serveHeader}>
            <View style={styles.serveHeaderCopy}>
              <Text style={styles.serveEyebrow}>
                {serveRecommendation.isPremiumExperience ? 'Premium Bottle Guidance' : 'Serve Guidance'}
              </Text>
              <Text style={styles.serveTitle}>{serveRecommendation.heroTitle}</Text>
              <Text style={styles.serveSubtitle}>{serveRecommendation.heroSubtitle}</Text>
            </View>
            <View style={styles.firstPourBadge}>
              <Text style={styles.firstPourLabel}>Start With</Text>
              <Text style={styles.firstPourValue}>
                {serveRecommendation.serveModes.find((mode) => mode.mode === serveRecommendation.firstPour)?.label || 'Neat'}
              </Text>
            </View>
          </View>

          <Text style={styles.serveWhy}>{serveRecommendation.why}</Text>

          <FlatList
            horizontal
            data={serveRecommendation.serveModes}
            keyExtractor={(mode) => mode.mode}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.serveModesRail}
            ItemSeparatorComponent={() => <View style={styles.serveModeSeparator} />}
            renderItem={({ item: mode }) => (
              <View style={styles.serveModeCard}>
                <View style={styles.serveModeIcon}>
                  <Ionicons
                    name={
                      mode.mode === 'neat'
                        ? 'wine-outline'
                        : mode.mode === 'water-drops'
                          ? 'water-outline'
                          : mode.mode === 'large-rock'
                            ? 'cube-outline'
                            : 'sparkles-outline'
                    }
                    size={18}
                    color={colors.gold}
                  />
                </View>
                <Text style={styles.serveModeLabel}>{mode.label}</Text>
                <Text style={styles.serveModeDescription}>{mode.description}</Text>
              </View>
            )}
          />

          <View style={styles.serveFootnote}>
            <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
            <Text style={styles.serveFootnoteText}>{serveRecommendation.cocktailUse}</Text>
          </View>

        </View>

        {/* Flavor Profile */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Flavor Profile</Text>
            {bottleProfile.isFlavorFallback && (
              <Text style={styles.categoryDefaultBadge}>{bottle.type} profile</Text>
            )}
          </View>
          <View style={styles.flavorTags}>
            {bottleProfile.flavorProfile.map((flavor, index) => (
              <View key={index} style={styles.flavorTag}>
                <Text style={styles.flavorText}>{flavor}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tasting Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Tasting Notes</Text>
            {bottleProfile.isTastingFallback && (
              <Text style={styles.categoryDefaultBadge}>{bottle.type} profile</Text>
            )}
          </View>
          <Text style={styles.tastingNotes}>{bottleProfile.tastingNotes}</Text>
        </View>

        {/* Cocktails You Can Make */}
        {!loadingCocktails && suggestedCocktails.length > 0 && (
          <View style={styles.section}>
            <View style={styles.cocktailsHeader}>
              <Ionicons name="sparkles" size={24} color={colors.gold} />
              <View style={styles.cocktailsHeaderCopy}>
                <Text style={styles.cocktailsTitle}>
                  {serveRecommendation.cocktailPlacement === 'secondary'
                    ? 'Cocktails That Respect This Bottle'
                    : 'Cocktails You Can Make'}
                </Text>
                <Text style={styles.cocktailsSubtitle}>
                  {tier === 'FREE'
                    ? 'Up to 3 matches from your free and unlocked recipe pool.'
                    : 'Best matches from your current recipe access.'}
                </Text>
              </View>
            </View>
            <FlatList
              horizontal
              data={suggestedCocktails}
              keyExtractor={(cocktail) => cocktail.id}
              renderItem={({ item: cocktail }) => {
                const displayRecipe = {
                  ...cocktail,
                  image: getCocktailImage(cocktail.id, cocktail.image),
                  subtitle: cocktail.match?.canMake
                    ? 'You can make this'
                    : cocktail.match?.almostCanMake
                      ? getMatchMessage(cocktail.match)
                      : cocktail.subtitle || 'Worth a closer look',
                };

                return (
                  <RecipeCard
                    recipe={displayRecipe}
                    onPress={() => navigation.navigate('CocktailDetail', { cocktailId: cocktail.id })}
                    showSaveButton={false}
                    showCartButton={false}
                    showDeleteButton={false}
                    style={styles.discoveryRecipeCard}
                  />
                );
              }}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cocktailsRail}
              ItemSeparatorComponent={() => <View style={styles.cocktailRailSeparator} />}
              ListFooterComponent={
                tier === 'FREE' && lockedCocktailCount > 0 ? (
                  <TouchableOpacity
                    style={styles.lockedRecipeTeaser}
                    activeOpacity={0.88}
                    onPress={() => inventoryGate('T1')}
                  >
                    <View style={styles.lockedRecipeTeaserContent}>
                      <View style={styles.lockedRecipeLockBadge}>
                        <Ionicons name="lock-closed" size={16} color={colors.accent} />
                      </View>
                      <Text style={styles.lockedRecipeTeaserName} numberOfLines={2}>
                        {lockedCocktailTeaser?.name ?? 'More recipes'}
                      </Text>
                      <Text style={styles.lockedRecipeTeaserSub} numberOfLines={1}>
                        {lockedCocktailTeaser?.subtitle ?? 'Unlock with KOOPE+'}
                      </Text>
                      <View style={styles.lockedRecipeTeaserDivider} />
                      <Text style={styles.lockedRecipeTeaserCta}>
                        +{lockedCocktailCount} more with KOOPE+
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : null
              }
              nestedScrollEnabled
              removeClippedSubviews={false}
            />
          </View>
        )}

        {/* Actions */}
        <View style={[styles.actions, { marginBottom: Math.max(insets.bottom, spacing(2)) }]}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAddToInventory}
          >
            <Ionicons name="add-circle" size={20} color={colors.white} />
            <Text style={styles.primaryButtonText}>Add to Inventory</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tryAnotherButton}
            onPress={handleTryAnother}
          >
            <Ionicons name="camera" size={20} color={colors.text} />
            <Text style={styles.tryAnotherButtonText}>Try Another</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleFindNearby}
            >
              <Ionicons name="location-outline" size={20} color={colors.accent} />
              <Text style={styles.secondaryButtonText}>Find Nearby</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleShareFind}
            >
              <Ionicons name="share-outline" size={20} color={colors.accent} />
              <Text style={styles.secondaryButtonText}>Share Find</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleLearnMore}
            >
              <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
              <Text style={styles.secondaryButtonText}>Learn More</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[
          styles.cellarCard,
          hasCellarMode ? styles.cellarCardActive : styles.cellarCardLocked,
        ]}>
          <View style={styles.cellarHeader}>
            <View style={styles.cellarHeaderCopy}>
              <Text style={styles.cellarEyebrow}>Collector Layer</Text>
              <Text style={styles.cellarTitle}>Cellar Mode</Text>
              <Text style={styles.cellarSubtitle}>
                {hasCellarMode
                  ? 'A secondary collector view for bottles you want to track more deliberately.'
                  : 'Optional PRO tracking for value, drinking windows, and collector notes once a bottle is in inventory.'}
              </Text>
            </View>
            <View style={styles.cellarHeaderActions}>
              <View style={styles.cellarBadge}>
                <Text style={styles.cellarBadgeText}>{hasCellarMode ? 'PRO Active' : 'PRO'}</Text>
              </View>
              <TouchableOpacity
                style={styles.cellarCollapseButton}
                activeOpacity={0.85}
                onPress={() => setCellarExpanded((value) => !value)}
              >
                <Text style={styles.cellarCollapseButtonText}>
                  {cellarExpanded ? 'Hide' : 'Expand'}
                </Text>
                <Ionicons
                  name={cellarExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.accent}
                />
              </TouchableOpacity>
            </View>
          </View>

          {hasCellarMode ? (
            inventoryItem ? (
              <>
                <View style={styles.cellarSummaryRow}>
                  <View style={styles.cellarSummaryPill}>
                    <Text style={styles.cellarSummaryLabel}>Value</Text>
                    <Text style={styles.cellarSummaryValue}>
                      {userCurrency === 'GBP' ? '£' : '$'}{(inventoryItem.valuation_estimate ?? cellarValuation).toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.cellarSummaryPill}>
                    <Text style={styles.cellarSummaryLabel}>Window</Text>
                    <Text style={styles.cellarSummaryValue}>
                      {(inventoryItem.drinking_window_end || suggestedCellarWindow.end)}
                    </Text>
                  </View>
                  <View style={styles.cellarSummaryPill}>
                    <Text style={styles.cellarSummaryLabel}>Qty</Text>
                    <Text style={styles.cellarSummaryValue}>{String(inventoryItem.quantity || 'full').toUpperCase()}</Text>
                  </View>
                </View>

                {cellarExpanded ? (
                  <>
                    <View style={styles.cellarMetricsRow}>
                      <View style={styles.cellarMetric}>
                        <Text style={styles.cellarMetricLabel}>Estimated Value</Text>
                        <Text style={styles.cellarMetricValue}>
                          {userCurrency === 'GBP' ? '£' : '$'}{(inventoryItem.valuation_estimate ?? cellarValuation).toFixed(0)}
                        </Text>
                      </View>
                      <View style={styles.cellarMetric}>
                        <Text style={styles.cellarMetricLabel}>Acquired</Text>
                        <Text style={styles.cellarMetricValue}>{formatDisplayDate(inventoryItem.acquired_at || inventoryItem.added_at)}</Text>
                      </View>
                      <View style={styles.cellarMetric}>
                        <Text style={styles.cellarMetricLabel}>Quantity</Text>
                        <Text style={styles.cellarMetricValue}>{String(inventoryItem.quantity || 'full').toUpperCase()}</Text>
                      </View>
                    </View>

                    <View style={styles.cellarWindowCard}>
                      <Text style={styles.cellarWindowTitle}>Suggested Drinking Window</Text>
                      <Text style={styles.cellarWindowValue}>
                        {(inventoryItem.drinking_window_start || suggestedCellarWindow.start)} to {(inventoryItem.drinking_window_end || suggestedCellarWindow.end)}
                      </Text>
                      <Text style={styles.cellarWindowNote}>{suggestedCellarWindow.note}</Text>
                    </View>

                    <View style={styles.cellarNotesCard}>
                      <Text style={styles.cellarNotesTitle}>Collector Notes</Text>
                      <Text style={styles.cellarNotesBody}>
                        {inventoryItem.cellar_notes || 'No collector notes yet. Use Cellar Mode to log purchase context, special occasions, or why this bottle is worth holding.'}
                      </Text>
                    </View>
                  </>
                ) : null}

                <TouchableOpacity style={styles.cellarButton} onPress={openCellarModal}>
                  <Ionicons name="library-outline" size={18} color={colors.white} />
                  <Text style={styles.cellarButtonText}>
                    {cellarExpanded ? 'Update Cellar Record' : 'Open Cellar Record'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cellarSecondaryButton}
                  onPress={() => navigation.navigate('TheWineCellar')}
                >
                  <Ionicons name="wine-outline" size={18} color={colors.accent} />
                  <Text style={styles.cellarSecondaryButtonText}>Open Cellar Portfolio</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.cellarEmptyState}>
                <Text style={styles.cellarEmptyTitle}>Add this bottle to inventory first</Text>
                <Text style={styles.cellarEmptyBody}>
                  Once it’s in your bar, Cellar Mode can track acquisition date, value, drinking window, and collector notes.
                </Text>
              </View>
            )
          ) : (
            <>
              {cellarExpanded ? (
                <View style={styles.cellarWindowCard}>
                  <Text style={styles.cellarWindowTitle}>Why it matters</Text>
                  <Text style={styles.cellarWindowNote}>
                    PRO turns premium bottles into tracked collector references with purchase context, value, and opening guidance.
                  </Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={styles.cellarUpgradeButton}
                onPress={() => cellarModeGate('T11')}
              >
                <Ionicons name="diamond-outline" size={18} color={colors.accent} />
                <Text style={styles.cellarUpgradeButtonText}>Unlock Cellar Mode</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* end bodyContent */}
        </View>
      </ScrollView>

      <Modal visible={cellarModalVisible} transparent animationType="fade" onRequestClose={() => setCellarModalVisible(false)}>
        <View style={styles.cellarModalBackdrop}>
          <View style={styles.cellarModalCard}>
            <Text style={styles.cellarModalTitle}>Update Cellar Record</Text>
            <Text style={styles.cellarModalSubtitle}>
              Capture what you paid, when you bought it, and how you want to treat this bottle in your collection.
            </Text>

            <Text style={styles.cellarInputLabel}>Purchase Price ({userCurrency})</Text>
            <TextInput
              value={purchasePriceInput}
              onChangeText={setPurchasePriceInput}
              placeholder="e.g. 68"
              placeholderTextColor={colors.subtext}
              keyboardType="decimal-pad"
              style={styles.cellarInput}
            />

            <Text style={styles.cellarInputLabel}>Acquired Date</Text>
            <TextInput
              value={acquiredAtInput}
              onChangeText={setAcquiredAtInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.subtext}
              style={styles.cellarInput}
            />

            <Text style={styles.cellarInputLabel}>Drinking Window</Text>
            <View style={styles.cellarWindowInputs}>
              <TextInput
                value={windowStartInput}
                onChangeText={setWindowStartInput}
                placeholder="Start"
                placeholderTextColor={colors.subtext}
                style={[styles.cellarInput, styles.cellarWindowInput]}
              />
              <TextInput
                value={windowEndInput}
                onChangeText={setWindowEndInput}
                placeholder="End"
                placeholderTextColor={colors.subtext}
                style={[styles.cellarInput, styles.cellarWindowInput]}
              />
            </View>

            <Text style={styles.cellarInputLabel}>Quantity</Text>
            <View style={styles.quantityRow}>
              {(['full', 'half', 'low', 'empty'] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.quantityChip,
                    selectedQuantity === level && styles.quantityChipActive,
                  ]}
                  onPress={() => setSelectedQuantity(level)}
                >
                  <Text
                    style={[
                      styles.quantityChipText,
                      selectedQuantity === level && styles.quantityChipTextActive,
                    ]}
                  >
                    {level.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.cellarInputLabel}>Collector Notes</Text>
            <TextInput
              value={cellarNotesInput}
              onChangeText={setCellarNotesInput}
              placeholder="Why you bought it, when to open it, who it’s for..."
              placeholderTextColor={colors.subtext}
              multiline
              style={[styles.cellarInput, styles.cellarNotesInput]}
            />

            <View style={styles.cellarModalActions}>
              <TouchableOpacity style={styles.cellarModalSecondary} onPress={() => setCellarModalVisible(false)}>
                <Text style={styles.cellarModalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cellarModalPrimary} onPress={handleSaveCellar} disabled={savingCellar}>
                {savingCellar ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.cellarModalPrimaryText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingTop: 0,
  },
  // ── Hero ──────────────────────────────────────────────────────────────────
  heroContainer: {
    width: '100%',
    height: HERO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: spacing(3),
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImageFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1A0A06',
  },
  heroBackButton: {
    position: 'absolute',
    left: spacing(2),
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  heroBadge: {
    position: 'absolute',
    right: spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.md,
    zIndex: 10,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 0.3,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(3),
  },
  heroIconFallback: {
    marginBottom: spacing(1.5),
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.gold}15`,
    borderWidth: 2,
    borderColor: `${colors.gold}40`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottleName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: spacing(0.5),
  },
  heroBottleBrand: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    marginBottom: spacing(2),
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroPills: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  heroPillText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
  heroPillDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: spacing(1.5),
  },
  bodyContent: {
    paddingHorizontal: spacing(3),
  },
  // (kept for any remaining references)
  capturedImageContainer: { display: 'none' },
  capturedImage: { display: 'none' },
  headerBadgeText: { display: 'none' },
  iconContainer: { display: 'none' },
  iconBadge: { display: 'none' },
  bottleName: { display: 'none' },
  bottleBrand: { display: 'none' },
  statsContainer: { display: 'none' },
  statCard: { display: 'none' },
  statValue: { display: 'none' },
  statLabel: { display: 'none' },
  header: { display: 'none' },
  headerBadge: { display: 'none' },
  priceCard: {
    backgroundColor: `${colors.accent}10`,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(3),
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginBottom: spacing(1.5),
  },
  priceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  regionBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    backgroundColor: `${colors.accent}20`,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },
  priceText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing(0.5),
  },
  priceDisclaimer: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: spacing(1),
    fontStyle: 'italic',
  },
  serveCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(1.5),
  },
  serveCardPremium: {
    backgroundColor: `${colors.gold}10`,
    borderColor: `${colors.gold}35`,
  },
  serveHeader: {
    flexDirection: 'row',
    gap: spacing(2),
    alignItems: 'flex-start',
  },
  serveHeaderCopy: {
    flex: 1,
    gap: spacing(0.5),
  },
  serveEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  serveTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  serveSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
  },
  firstPourBadge: {
    minWidth: 92,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderRadius: radii.md,
    backgroundColor: `${colors.gold}18`,
    borderWidth: 1,
    borderColor: `${colors.gold}30`,
    alignItems: 'flex-start',
  },
  firstPourLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gold,
    textTransform: 'uppercase',
  },
  firstPourValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(0.25),
  },
  serveWhy: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
  },
  serveModesRail: {
    paddingRight: spacing(1),
  },
  serveModeSeparator: {
    width: spacing(1.5),
  },
  serveModeCard: {
    width: 188,
    backgroundColor: `${colors.bg}90`,
    borderRadius: radii.md,
    padding: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(0.5),
  },
  serveModeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.gold}12`,
    marginBottom: spacing(0.5),
  },
  serveModeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  serveModeDescription: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
  },
  serveFootnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  serveFootnoteText: {
    flex: 1,
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 17,
  },
  serveUpgradeText: {
    fontSize: 12,
    color: colors.accent,
    lineHeight: 17,
  },
  section: {
    marginBottom: spacing(3),
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1.5),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    marginBottom: spacing(1.5),
  },
  categoryDefaultBadge: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.subtext,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(1),
    paddingVertical: 2,
    borderRadius: radii.sm,
    textTransform: 'capitalize',
    opacity: 0.7,
  },
  flavorTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
  },
  flavorTag: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
    borderRadius: radii.md,
  },
  flavorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.goldText,
  },
  tastingNotes: {
    fontSize: 15,
    color: colors.subtext,
    lineHeight: 22,
  },
  cellarCard: {
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(3),
    borderWidth: 1,
    gap: spacing(1.5),
  },
  cellarCardActive: {
    backgroundColor: `${colors.gold}10`,
    borderColor: `${colors.gold}36`,
  },
  cellarCardLocked: {
    backgroundColor: colors.card,
    borderColor: colors.line,
  },
  cellarHeader: {
    flexDirection: 'row',
    gap: spacing(1.5),
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cellarHeaderActions: {
    alignItems: 'flex-end',
    gap: spacing(0.75),
  },
  cellarHeaderCopy: {
    flex: 1,
    gap: spacing(0.5),
  },
  cellarEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cellarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  cellarSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
  },
  cellarBadge: {
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.75),
    borderRadius: radii.full,
    backgroundColor: `${colors.bg}99`,
    borderWidth: 1,
    borderColor: `${colors.gold}28`,
  },
  cellarBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
  },
  cellarCollapseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.4),
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.55),
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: `${colors.accent}35`,
    backgroundColor: `${colors.accent}10`,
  },
  cellarCollapseButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  cellarSummaryRow: {
    flexDirection: 'row',
    gap: spacing(0.9),
  },
  cellarSummaryPill: {
    flex: 1,
    backgroundColor: `${colors.bg}88`,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(1.2),
    paddingVertical: spacing(1),
    gap: spacing(0.3),
  },
  cellarSummaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  cellarSummaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  cellarMetricsRow: {
    flexDirection: 'row',
    gap: spacing(1.25),
  },
  cellarMetric: {
    flex: 1,
    backgroundColor: `${colors.bg}90`,
    borderRadius: radii.md,
    padding: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(0.5),
  },
  cellarMetricLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
    color: colors.subtext,
  },
  cellarMetricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  cellarWindowCard: {
    backgroundColor: `${colors.bg}85`,
    borderRadius: radii.md,
    padding: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(0.5),
  },
  cellarWindowTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cellarWindowValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cellarWindowNote: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
  },
  cellarNotesCard: {
    backgroundColor: `${colors.bg}70`,
    borderRadius: radii.md,
    padding: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(0.5),
  },
  cellarNotesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  cellarNotesBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
  },
  cellarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(1.75),
  },
  cellarButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  cellarSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.75),
    borderRadius: radii.lg,
    paddingVertical: spacing(1.5),
    borderWidth: 1,
    borderColor: `${colors.accent}40`,
    backgroundColor: `${colors.accent}10`,
  },
  cellarSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
  cellarUpgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.75),
    borderRadius: radii.lg,
    paddingVertical: spacing(1.5),
    borderWidth: 1,
    borderColor: `${colors.accent}50`,
    backgroundColor: `${colors.accent}10`,
  },
  cellarUpgradeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
  cellarEmptyState: {
    gap: spacing(0.75),
  },
  cellarEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  cellarEmptyBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
  },
  cellarModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing(3),
  },
  cellarModalCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
  },
  cellarModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  cellarModalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
    marginBottom: spacing(2),
  },
  cellarInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing(0.75),
    marginTop: spacing(1.25),
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cellarInput: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
    color: colors.text,
    fontSize: 15,
  },
  cellarWindowInputs: {
    flexDirection: 'row',
    gap: spacing(1),
  },
  cellarWindowInput: {
    flex: 1,
  },
  quantityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
  },
  quantityChip: {
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.9),
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  quantityChipActive: {
    borderColor: `${colors.accent}50`,
    backgroundColor: `${colors.accent}15`,
  },
  quantityChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtext,
  },
  quantityChipTextActive: {
    color: colors.accent,
  },
  cellarNotesInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  cellarModalActions: {
    flexDirection: 'row',
    gap: spacing(1.5),
    marginTop: spacing(2.5),
  },
  cellarModalSecondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    paddingVertical: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
  },
  cellarModalSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cellarModalPrimary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    paddingVertical: spacing(1.5),
    backgroundColor: colors.accent,
  },
  cellarModalPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  cocktailsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(1),
    marginBottom: spacing(2),
  },
  cocktailsHeaderCopy: {
    flex: 1,
  },
  cocktailsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  cocktailsSubtitle: {
    marginTop: spacing(0.5),
    fontSize: 12,
    color: colors.subtext,
  },
  cocktailsRail: {
    paddingLeft: spacing(0.25),
    paddingRight: spacing(2),
  },
  cocktailRailSeparator: {
    width: spacing(2),
  },
  discoveryRecipeCard: {
    width: 240,
  },
  lockedRecipeTeaser: {
    width: 200,
    marginLeft: spacing(2),
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.22)',
    backgroundColor: 'rgba(20,13,9,0.92)',
  },
  lockedRecipeTeaserContent: {
    flex: 1,
    padding: spacing(2),
    justifyContent: 'center',
    minHeight: 220,
  },
  lockedRecipeLockBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(214,138,56,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(1.25),
  },
  lockedRecipeTeaserName: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(246,236,228,0.5)',
    lineHeight: 22,
    marginBottom: spacing(0.5),
  },
  lockedRecipeTeaserSub: {
    fontSize: 12,
    color: 'rgba(160,140,128,0.6)',
    marginBottom: spacing(1.5),
  },
  lockedRecipeTeaserDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing(1.25),
  },
  lockedRecipeTeaserCta: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  actions: {
    gap: spacing(2),
    marginTop: spacing(2),
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    padding: spacing(2),
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  tryAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 2,
    borderColor: colors.accent,
  },
  tryAnotherButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
