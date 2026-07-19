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
import * as FileSystem from 'expo-file-system';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FlavorIcon } from '../components/FlavorIcon';
import { colors, spacing, radii } from '../theme/tokens';
import type { CameraStackParamList } from '../navigation/CameraStack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { getPriceTierDisplay } from '../data/spiritsDatabase';
import { useXPSystem } from '../store/useXPSystem';
import * as Localization from 'expo-localization';
import {
  useCurrencyPreference,
  convertFromUSD,
  formatPriceRange,
  CURRENCY_META,
  type SupportedCurrency,
} from '../store/useCurrencyPreference';
import { supabase } from '../lib/supabase';
import { InventoryService } from '../services/inventoryService';
import { challengeProgressService } from '../services/challengeProgressService';
import { useAuth } from '../contexts/AuthContext';
import { sortByMatch, getMatchMessage } from '../utils/recipeMatching';
import type { RecipeMatch } from '../utils/recipeMatching';
import { RecipesRepository } from '../repos/supabase';
import { useUserTier } from '../store/useUserTier';
import {
  isCocktailAccessible,
  TIER_LIMITS,
  SPIRIT_STARTER_MAP,
  ANSWER_CARD_FREE_RECIPE_COUNT,
} from '../config/tierAccess';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import type { UserInventoryItem } from '../types/database';
import { BottleServeService } from '../services/bottleServeService';
import { useEngagement } from '../store/useEngagement';
import { getCocktailImage } from '../../assets/images/cocktails';
import RecipeCard from '../components/RecipeCard';
import LockedRecipeCard from '../components/LockedRecipeCard';
import { ScanHistoryService } from '../services/scanHistoryService';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';
import { useWishlist, WISHLIST_FREE_CAP } from '../store/useWishlist';
import { notificationService } from '../services/notificationService';
import { useTasteModel } from '../store/useTasteModel';
import type { FlavourTag } from '../store/useTasteModel';
import { getTasteSignalLine } from '../utils/tasteSignal';
import SpiritEducationPanel from '../components/SpiritEducationPanel';
import GiftModePanel from '../components/bottle/GiftModePanel';
import {
  computeGiftVerdict,
  filterRecipesForGift,
  type GiftPreference,
} from '../services/giftVerdictService';
import ValueLine from '../components/bottle/ValueLine';
import { useSpottedPrices } from '../store/useSpottedPrices';
import { logSpottedPrice } from '../services/spottedPriceService';
import { computeValueVerdict } from '../services/valueVerdictService';

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

const DOCUMENT_DIRECTORY =
  (FileSystem as unknown as { documentDirectory?: string }).documentDirectory ?? '';

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
    tastingNotes:
      'A London Dry-style gin with classic juniper at the fore, bright citrus notes, and a layered botanical finish. Crisp and dry.',
    origin: 'United Kingdom',
  },
  vodka: {
    flavorProfile: ['Clean', 'Smooth', 'Neutral'],
    tastingNotes:
      'A clean, neutral spirit with a smooth palate and a crisp finish. Subtle grain sweetness makes it exceptionally versatile.',
    origin: 'Europe',
  },
  whiskey: {
    flavorProfile: ['Caramel', 'Vanilla', 'Oak'],
    tastingNotes:
      'Rich caramel and vanilla upfront, underpinned by toasted oak and a hint of dried fruit. Warm, rounded finish.',
    origin: 'United States',
  },
  rum: {
    flavorProfile: ['Vanilla', 'Tropical Fruit', 'Caramel'],
    tastingNotes:
      'Sweet vanilla and tropical fruit on the nose, with warm caramel and a touch of molasses on the palate. Smooth finish.',
    origin: 'Caribbean',
  },
  tequila: {
    flavorProfile: ['Agave', 'Citrus', 'Pepper'],
    tastingNotes:
      '100% agave character — fresh vegetal notes, bright citrus, and white pepper. Clean, smooth, and true to the plant.',
    origin: 'Mexico',
  },
  mezcal: {
    flavorProfile: ['Smoke', 'Agave', 'Earthy'],
    tastingNotes:
      'Artisanal smoke from slow-roasted agave hearts, with earthy mineral notes and a long, complex finish.',
    origin: 'Mexico',
  },
  brandy: {
    flavorProfile: ['Dried Fruit', 'Oak', 'Vanilla'],
    tastingNotes:
      'Warm dried fruit and toasted oak with vanilla undertones. Smooth and balanced with a gentle warming finish.',
    origin: 'France',
  },
  liqueur: {
    flavorProfile: ['Sweet', 'Fruit', 'Herbal'],
    tastingNotes:
      'A sweet, approachable liqueur with fruit and herbal character. Versatile as a modifier in cocktails or over ice.',
    origin: 'Europe',
  },
  other: {
    flavorProfile: ['Complex', 'Aromatic', 'Distinct'],
    tastingNotes:
      'A distinctive spirit with its own character. Explore neat first to understand its personality before building cocktails.',
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
  serveRecommendation: ReturnType<typeof BottleServeService.getRecommendation>,
): number {
  const tags = Array.isArray(recipe.tags)
    ? recipe.tags.map((tag: string) => String(tag).toLowerCase())
    : [];
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
  if (['old fashioned', 'manhattan', 'sazerac'].some((needle) => name.includes(needle)))
    score += 18;
  if (
    ['boozy', 'spirit-forward', 'minimal dilution'].some((needle) => description.includes(needle))
  )
    score += 10;
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
  if (
    String(bottle.name || '')
      .toLowerCase()
      .includes('scotch') &&
    tags.includes('scotch')
  )
    score += 10;

  return score;
}

function normalizeInventoryName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
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
  const { hasAccess: hasPremiumServePersonalization } = useFeatureAccess(
    'premium_serve_personalization',
  );
  const { bottle, imageUri, scanConfidence, scannedBarcode, scanSource } = route.params;
  const isLowConfidence =
    imageUri != null && typeof scanConfidence === 'number' && scanConfidence < 0.8;
  const { currency: userCurrency, setCurrency } = useCurrencyPreference();
  const [userRegion, setUserRegion] = useState<string>('');
  const [suggestedCocktails, setSuggestedCocktails] = useState<(any & { match: RecipeMatch })[]>(
    [],
  );
  const [lockedCocktailCount, setLockedCocktailCount] = useState(0);
  const [lockedCocktailTeaser, setLockedCocktailTeaser] = useState<
    (any & { match?: RecipeMatch }) | null
  >(null);
  const [loadingCocktails, setLoadingCocktails] = useState(true);
  const [inventoryItem, setInventoryItem] = useState<UserInventoryItem | null>(null);
  const [persistedImageUri, setPersistedImageUri] = useState<string | undefined>(undefined);
  const [giftMode, setGiftMode] = useState(false);
  const [giftPreference, setGiftPreference] = useState<GiftPreference>({});
  const [expanded, setExpanded] = useState(false);
  // Stage 10 — scan feedback
  const [feedbackState, setFeedbackState] = useState<
    'pending' | 'confirmed' | 'correcting' | 'typing' | 'dismissed'
  >('pending');
  const [correctionName, setCorrectionName] = useState('');
  const [correctionBrand, setCorrectionBrand] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // Taste model
  const {
    recordScan,
    recordThumbsUp,
    recordThumbsDown,
    totalScans,
    dominantCluster,
    profileVisible,
  } = useTasteModel();
  const [thumbsState, setThumbsState] = useState<'idle' | 'up' | 'down'>('idle');
  const [showCorrectionPills, setShowCorrectionPills] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Wishlist
  const { saveToWishlist, isWishlisted, removeFromWishlist, addPriceEntry } = useWishlist();
  const bottleWishlistId =
    bottle.id || `${bottle.name}_${bottle.brand}`.toLowerCase().replace(/\s+/g, '_');
  const [wishlisted, setWishlisted] = useState(() => isWishlisted(bottleWishlistId));
  const [showPricePrompt, setShowPricePrompt] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const serveRecommendation = useMemo(
    () => BottleServeService.getRecommendation(bottle, tier),
    [bottle, tier],
  );

  // Value line — fair-price range estimate (Phase 1.2 adds the source
  // label, the spotted-price verdict, and at-scan capture via ValueLine).
  const priceRangeEstimate = useMemo(() => {
    const nativeCurrencies: SupportedCurrency[] = ['USD', 'CAD', 'GBP'];
    if (nativeCurrencies.includes(userCurrency)) {
      return bottle.priceEstimate?.[userCurrency as 'USD' | 'CAD' | 'GBP'] ?? null;
    }
    if (!bottle.priceEstimate?.USD) return null;
    return {
      min: convertFromUSD(bottle.priceEstimate.USD.min, userCurrency),
      max: convertFromUSD(bottle.priceEstimate.USD.max, userCurrency),
    };
  }, [bottle.priceEstimate, userCurrency]);

  // Every value names its source (Phase 1.2 acceptance rule). scanSource
  // comes from bottle-recognize via route params; absent = barcode/library
  // paths, whose bottles come from the bundled catalog.
  const valueSourceLabel = useMemo(() => {
    switch (scanSource) {
      case 'cache':
        return 'Community-verified estimate';
      case 'claude-vision':
        return 'AI estimate';
      case 'catalog':
      default:
        return 'KŌOPE catalog estimate';
    }
  }, [scanSource]);

  // The user's price journal entry for this bottle — drives the verdict.
  const spottedEntries = useSpottedPrices((s) => s.entries);
  const spottedForBottle = useMemo(
    () => spottedEntries.find((e) => e.bottleId === bottleWishlistId),
    [spottedEntries, bottleWishlistId],
  );

  // Merge bottle-specific data with spirit-category defaults so every scan
  // shows a complete profile — even if individual bottle data is sparse.
  const bottleProfile = useMemo(() => {
    const defaults = getSpiritCategoryDefaults(bottle);
    return {
      flavorProfile:
        bottle.flavorProfile?.length > 0 ? bottle.flavorProfile : defaults.flavorProfile,
      tastingNotes: bottle.tastingNotes?.trim() ? bottle.tastingNotes : defaults.tastingNotes,
      origin: bottle.origin?.trim() ? bottle.origin : defaults.origin,
      isFlavorFallback: !(bottle.flavorProfile?.length > 0),
      isTastingFallback: !bottle.tastingNotes?.trim(),
    };
  }, [bottle]);

  const storyLine = useMemo(() => {
    const notes = bottleProfile.tastingNotes || '';
    const firstSentence = notes.split(/(?<=[.!?])\s+/)[0] || notes;
    return giftMode ? `A crowd-pleasing choice — ${firstSentence}` : firstSentence;
  }, [bottleProfile.tastingNotes, giftMode]);

  // Gift mode: re-rank the already-fetched, already-tier-gated Hook data by
  // the recipient's flavor hint rather than fetching/ranking anything new.
  const giftFilteredCocktails = useMemo(
    () => filterRecipesForGift(suggestedCocktails, giftPreference),
    [suggestedCocktails, giftPreference],
  );

  useEffect(() => {
    // Record this bottle to the user's scan history journal.
    // Camera URIs are temporary — copy to documentDirectory first so the
    // thumbnail survives app restarts and OS cache eviction.
    const recordWithPersistedImage = async () => {
      let persistedUri = imageUri;
      if (imageUri) {
        try {
          const scansDir = `${DOCUMENT_DIRECTORY}scans/`;
          await FileSystem.makeDirectoryAsync(scansDir, { intermediates: true });
          const bottleKey = (bottle.id || bottle.name).replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const dest = `${scansDir}${bottleKey}.jpg`;
          await FileSystem.copyAsync({ from: imageUri, to: dest });
          persistedUri = dest;
        } catch {
          // If copy fails (e.g. URI already persisted or invalid), keep original
        }
      }
      setPersistedImageUri(persistedUri || undefined);
      ScanHistoryService.recordScan(bottle, persistedUri).catch(() => {});
    };
    recordWithPersistedImage();

    // Record to taste model — only on scan results (imageUri present), not shelf taps
    if (imageUri) {
      recordScan(bottle, false); // addedToShelf updated later in handleAddToShelf
    }

    // Fire funnel analytics — scan is the first step in the conversion funnel
    trackEvent(ANALYTICS_EVENTS.SCAN_SUCCESS, {
      [ANALYTICS_PROPS.ITEM_NAME]: bottle.name,
      [ANALYTICS_PROPS.SCAN_TYPE]: 'bottle',
      spirit_type: bottle.type || 'unknown',
    });

    // Value-on-scan acceptance metric (Phase 1.2): VALUE_LINE_SHOWN /
    // SCAN_SUCCESS is the "% of scans that show a value line" ratio.
    if (priceRangeEstimate) {
      trackEvent(ANALYTICS_EVENTS.VALUE_LINE_SHOWN, {
        [ANALYTICS_PROPS.VALUE_SOURCE]: scanSource ?? 'catalog',
        [ANALYTICS_PROPS.CURRENCY]: userCurrency,
      });
      if (spottedForBottle) {
        const verdict = computeValueVerdict(
          { price: spottedForBottle.price, currency: spottedForBottle.currency },
          { ...priceRangeEstimate, currency: userCurrency },
        );
        if (verdict) {
          trackEvent(ANALYTICS_EVENTS.VALUE_VERDICT_SHOWN, {
            [ANALYTICS_PROPS.VERDICT]: verdict.verdict,
            [ANALYTICS_PROPS.VALUE_SOURCE]: scanSource ?? 'catalog',
          });
        }
      }
    }
  }, [bottle.id]);

  useEffect(() => {
    const locale = Localization.getLocales()[0];
    setUserRegion(locale?.regionCode || '');
  }, []);

  useEffect(() => {
    // Show recipes relevant to the scanned bottle from the user's currently
    // accessible pool. Free sees up to 3 suggestions; paid tiers see more.
    const fetchCocktails = async () => {
      setLoadingCocktails(true);
      try {
        // 1. Fetch user's inventory
        const userInventory = user ? await InventoryService.getUserInventory(user.id) : [];
        const matchedInventoryItem =
          userInventory.find(
            (item) =>
              normalizeInventoryName(item.item_name) === normalizeInventoryName(bottle.name),
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
          const spiritTypes = [
            'vodka',
            'gin',
            'rum',
            'tequila',
            'whiskey',
            'whisky',
            'bourbon',
            'scotch',
            'brandy',
            'cognac',
            'mezcal',
            'rye',
          ];

          for (const spirit of spiritTypes) {
            if (bottleName.includes(spirit)) {
              spiritName = normalizeSpiritToken(spirit);
              console.log(
                `BottleDetailScreen: Extracted spirit "${spiritName}" from bottle name "${bottle.name}"`,
              );
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

        // Secondary token: the bottle's own name/id, used to match cocktails that
        // reference a specific product (e.g. 'campari') rather than a broad type
        // (e.g. 'liqueur'). Distinct from spiritName so both are checked.
        const bottleNameToken = normalizeSpiritToken((bottle as any).id || bottle.name);

        console.log('BottleDetailScreen: Filtering cocktails for spirit:', spiritName);
        console.log('BottleDetailScreen: Total recipes to check:', recipesData.length);
        if (recipesData.length > 0) {
          console.log('Sample recipe structure:', {
            name: recipesData[0].name,
            baseSpirit: recipesData[0].baseSpirit,
            category: recipesData[0].category,
            tags: recipesData[0].tags,
          });
        }

        let matchedData = recipesData.filter((recipe) => {
          const baseSpirit = normalizeSpiritToken(recipe.baseSpirit);
          const spiritsUsed = (recipe.spiritsUsed || []).map((s) => normalizeSpiritToken(s));

          if (baseSpirit === spiritName) return true;
          if (spiritsUsed.includes(spiritName)) return true;

          // Match by specific bottle name (e.g. 'campari') so liqueurs and other
          // named products surface cocktails that call them out directly.
          if (bottleNameToken && bottleNameToken !== spiritName) {
            if (baseSpirit === bottleNameToken) return true;
            if (spiritsUsed.includes(bottleNameToken)) return true;
          }

          // Ingredient text fallback: when spiritsUsed is unpopulated, scan ingredient
          // names directly so recipes like Negroni (base: gin, uses Campari) still surface.
          if (spiritsUsed.length === 0 && bottleNameToken) {
            const ingredientNames = Array.isArray(recipe.ingredients)
              ? recipe.ingredients.map((ing: any) =>
                  typeof ing === 'string' ? ing : ing?.name || ing?.ingredient || '',
                )
              : [];
            if (ingredientNames.some((n: string) => n.toLowerCase().includes(bottleNameToken))) {
              return true;
            }
          }

          // Fallback only for legacy/incomplete rows where spirit fields are empty
          if (!baseSpirit && spiritsUsed.length === 0) {
            const tags = Array.isArray(recipe.tags)
              ? recipe.tags.map((t) => normalizeSpiritToken(t))
              : [];
            const category = normalizeSpiritToken(recipe.category);
            if (tags.includes(spiritName) || category === spiritName) return true;
            if (bottleNameToken && bottleNameToken !== spiritName) {
              return tags.includes(bottleNameToken) || category === bottleNameToken;
            }
          }

          return false;
        });

        console.log(
          `BottleDetailScreen: Found ${matchedData.length} recipes matching "${spiritName}"`,
        );
        if (matchedData.length > 0 && matchedData.length <= 3) {
          console.log(
            'Sample matched recipes:',
            matchedData.slice(0, 3).map((r) => ({ name: r.name, baseSpirit: r.baseSpirit })),
          );
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
          const accessibleData = matchedData.filter(
            (recipe) =>
              isCocktailAccessible(recipe.id, tier) ||
              isCocktailUnlockedWithXP(recipe.id) ||
              isRecipeUnlockedWithEngagement(recipe.id),
          );
          // Boost starter recipes for this spirit to the front of accessible results
          const starterIds =
            SPIRIT_STARTER_MAP[spiritName] || SPIRIT_STARTER_MAP[bottleNameToken] || [];
          const starterFirst = [
            ...accessibleData.filter((r) => starterIds.includes(r.id)),
            ...accessibleData.filter((r) => !starterIds.includes(r.id)),
          ];
          const ranked = rankRecipes(starterFirst);
          const topMatches = ranked.slice(0, ANSWER_CARD_FREE_RECIPE_COUNT);
          setSuggestedCocktails(topMatches);

          // Locked: everything else that matched the spirit but isn't accessible
          const lockedData = matchedData.filter(
            (recipe) =>
              !isCocktailAccessible(recipe.id, tier) &&
              !isCocktailUnlockedWithXP(recipe.id) &&
              !isRecipeUnlockedWithEngagement(recipe.id),
          );
          const rankedLocked = rankRecipes(lockedData);
          setLockedCocktailCount(lockedData.length);
          setLockedCocktailTeaser(rankedLocked[0] || null);
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
  }, [
    bottle,
    bottle.type,
    bottle.name,
    user,
    tier,
    isCocktailUnlockedWithXP,
    isRecipeUnlockedWithEngagement,
    serveRecommendation,
  ]);

  const handleAddToShelf = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to add bottles to your shelf.', [
        { text: 'Sign In', onPress: () => navigation.navigate('Settings') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    if (tier === 'FREE') {
      const count = await InventoryService.getInventoryCount(user.id);
      if (count >= TIER_LIMITS.FREE.maxBottles) {
        inventoryGate('T1');
        return;
      }
    }

    const result = await InventoryService.addToInventory({
      userId: user.id,
      itemType: 'spirit',
      itemName: bottle.name,
      category: bottle.type === 'liqueur' ? 'liqueur' : 'spirit',
      imageUrl: persistedImageUri || imageUri || undefined,
      subcategory: bottle.type,
      brand: bottle.brand,
      abv: bottle.abv,
      volume: 750,
      region: bottleProfile.origin,
      flavorTags: bottleProfile.flavorProfile,
      tastingNotes: bottleProfile.tastingNotes,
      serveGuidance:
        `${serveRecommendation.heroTitle}. ${serveRecommendation.why} ${serveRecommendation.cocktailUse}`.trim(),
    });

    if (result.duplicate) {
      // Already there — just reflect that in state silently
      setInventoryItem({ id: 'existing', item_name: bottle.name } as any);
      return;
    }

    if (!result.success) {
      Alert.alert('Error', 'Failed to add to shelf. Please try again.');
      return;
    }

    // Silently update shelf state — no modal, no XP celebration
    setInventoryItem({ id: 'added', item_name: bottle.name } as any);
    challengeProgressService.trackAddToInventory(user.id, bottle.id || bottle.name);
    earnScanXP(bottle.id);
    // Boost taste model with shelf signal
    recordScan(bottle, true);
    // Strengthen cache — adding to shelf is the strongest confirmation signal
    try {
      const lookupKey = (bottle.id || bottle.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      await supabase
        .from('spirits_cache')
        .upsert({ lookup_key: lookupKey, confidence: 1.0 }, { onConflict: 'lookup_key' });
    } catch {
      /* silent — shelf add already succeeded */
    }
  };

  const handleSaveToWishlist = () => {
    const result = saveToWishlist({
      id: bottle.id,
      name: bottle.name,
      brand: bottle.brand,
      type: bottle.type,
      imageUri: persistedImageUri || imageUri,
    });
    if (result === 'cap_reached') {
      Alert.alert(
        'Wishlist Full',
        `You can save up to ${WISHLIST_FREE_CAP} bottles on the free plan. Upgrade for unlimited.`,
        [
          {
            text: 'Upgrade',
            onPress: () => (navigation as any).navigate('Paywall', { triggerId: 'T1' }),
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }
    setWishlisted(true);
    setShowPricePrompt(true);
  };

  const handleRemoveFromWishlist = () => {
    removeFromWishlist(bottleWishlistId);
    setWishlisted(false);
  };

  const handleSavePriceEntry = () => {
    const price = parseFloat(priceInput.replace(/[^0-9.]/g, ''));
    if (!isNaN(price) && price > 0 && locationInput.trim()) {
      addPriceEntry(bottleWishlistId, {
        price,
        currency: userCurrency,
        locationLabel: locationInput.trim(),
      });
      // Phase 1.2: also feed the journal + community sync (one write path).
      logSpottedPrice({
        bottleId: bottleWishlistId,
        price,
        currency: userCurrency,
        locationLabel: locationInput.trim(),
        capturePoint: 'post_wishlist',
        userId: user?.id,
      });
    }
    setPriceInput('');
    setLocationInput('');
    setShowPricePrompt(false);
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
    const nativePriceEstimate =
      bottle.priceEstimate?.[userCurrency as 'USD' | 'CAD' | 'GBP'] ??
      (bottle.priceEstimate?.USD
        ? {
            min: convertFromUSD(bottle.priceEstimate.USD.min, userCurrency),
            max: convertFromUSD(bottle.priceEstimate.USD.max, userCurrency),
          }
        : null);
    const priceLine = nativePriceEstimate
      ? ` · ${formatPriceRange(nativePriceEstimate.min, nativePriceEstimate.max, userCurrency)}`
      : '';
    const recipeLine = topRecipe ? ` · Makes a great ${topRecipe.name}` : '';
    const message = `Found on KOOPE: ${bottle.name} by ${bottle.brand}${priceLine}${recipeLine}. Try KOOPE — the bartender's scanning app.`;
    try {
      await Share.share({ message });
      if (user?.id) {
        challengeProgressService.trackShareMoment(user.id, bottle.id);
      }
    } catch {
      // Share dismissed — no-op
    }
  };

  const handleTryAnother = () => {
    navigation.navigate('SmartScan');
  };

  const handleWrongResult = () => {
    Alert.alert(
      'Wrong Bottle?',
      'This will remove the cached result so the next scan gets a fresh lookup. Scan again for a better result.',
      [
        {
          text: 'Yes, clear it',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from spirits_cache by lookup_key (bottle id / name slug)
              const lookupKey = (bottle.id || bottle.name)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, ' ')
                .trim();
              await supabase.from('spirits_cache').delete().eq('lookup_key', lookupKey);
              Alert.alert('Cache Cleared', 'Scan the bottle again for a fresh identification.', [
                { text: 'Scan Again', onPress: () => navigation.navigate('SmartScan') },
              ]);
            } catch {
              Alert.alert('Error', 'Could not clear cache. Please try again.');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleFeedbackYes = async () => {
    setFeedbackState('confirmed');
    try {
      const lookupKey = (bottle.id || bottle.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      // Full upsert: creates the cache entry if it doesn't exist yet (e.g. local DB match),
      // or raises confidence on an existing Claude result to 1.0.
      // source='user_confirmed' makes these the highest-priority cache hits.
      await supabase.from('spirits_cache').upsert(
        {
          lookup_key: lookupKey,
          name: bottle.name,
          brand: bottle.brand,
          spirit_type: bottle.type,
          abv: bottle.abv,
          price_tier: bottle.priceTier,
          price_usd_min: bottle.priceEstimate?.USD?.min ?? null,
          price_usd_max: bottle.priceEstimate?.USD?.max ?? null,
          price_cad_min: bottle.priceEstimate?.CAD?.min ?? null,
          price_cad_max: bottle.priceEstimate?.CAD?.max ?? null,
          price_gbp_min: bottle.priceEstimate?.GBP?.min ?? null,
          price_gbp_max: bottle.priceEstimate?.GBP?.max ?? null,
          flavor_profile: bottle.flavorProfile,
          tasting_notes: bottle.tastingNotes,
          origin: bottle.origin,
          search_terms: bottle.searchTerms,
          confidence: 1.0,
          source: 'user_confirmed',
        },
        { onConflict: 'lookup_key' },
      );
    } catch {
      // Feedback failure is silent — result is still shown
    }
  };

  const invalidateCacheEntry = async () => {
    try {
      const lookupKey = (bottle.id || bottle.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      await supabase.from('spirits_cache').delete().eq('lookup_key', lookupKey);
    } catch {
      /* silent */
    }
  };

  const handleFeedbackNo = () => {
    // Show the 3-option correction picker
    setFeedbackState('correcting');
  };

  const handleCorrectionBarcode = async () => {
    await invalidateCacheEntry();
    setFeedbackState('dismissed');
    navigation.navigate('SmartScan', { barcodeOnly: true });
  };

  const handleCorrectionSearchLibrary = async () => {
    await invalidateCacheEntry();
    setFeedbackState('dismissed');
    navigation.navigate('BottleSearch', { initialQuery: bottle.name });
  };

  const handleCorrectionSubmit = async () => {
    const name = correctionName.trim();
    if (!name) return;

    setSubmittingCorrection(true);
    try {
      // 1. Invalidate the wrong cache entry so the next scan re-identifies cleanly
      await invalidateCacheEntry();

      // 2. Write the correction to Supabase for future model review
      await supabase.from('scan_corrections').insert({
        identified_name: bottle.name,
        identified_brand: bottle.brand || null,
        corrected_name: name,
        corrected_brand: correctionBrand.trim() || null,
        image_uri: imageUri || null,
      });

      // 3. Update the local scan history record with the corrected name
      await ScanHistoryService.recordScan(
        { id: bottle.id, name, brand: correctionBrand.trim() || bottle.brand, type: bottle.type },
        imageUri,
      );

      // 4. Feed the weighted anti-fraud correction pipeline so the community
      // consensus (bottle_barcode_mappings) actually gets populated — only
      // possible when this scan started from a known barcode.
      if (scannedBarcode && user?.id) {
        await InventoryService.submitScanCorrection({
          userId: user.id,
          barcode: scannedBarcode,
          correctBottleId: null,
          newBottleData: {
            name,
            brand: correctionBrand.trim() || bottle.brand,
            type: bottle.type,
          },
        });
      }
    } catch {
      /* silent — correction is best-effort */
    }

    setSubmittingCorrection(false);
    setFeedbackState('dismissed');
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

          {/* Identified / Low-confidence badge */}
          <View
            style={[
              styles.heroBadge,
              isLowConfidence && styles.heroBadgeLowConfidence,
              { top: insets.top + spacing(1) },
            ]}
          >
            <Ionicons
              name={isLowConfidence ? 'help-circle' : 'checkmark-circle'}
              size={16}
              color={isLowConfidence ? colors.warning : colors.gold}
            />
            <Text
              style={[styles.heroBadgeText, isLowConfidence && styles.heroBadgeTextLowConfidence]}
            >
              {isLowConfidence ? 'Best match' : 'Identified'}
            </Text>
          </View>

          {/* Bottle name & stats anchored to bottom of hero */}
          <View style={styles.heroContent}>
            {!imageUri && (
              <View style={styles.heroIconFallback}>
                <Ionicons name="wine" size={48} color={colors.gold} />
              </View>
            )}
            <Text style={styles.heroBottleName} numberOfLines={2}>
              {bottle.name}
            </Text>
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

            <Text style={styles.heroStoryLine} numberOfLines={2}>
              {storyLine}
            </Text>
          </View>
        </View>

        {/* Body content — padded */}
        <View style={styles.bodyContent}>
          {/* Stage 10 — Is this correct? feedback strip (only shown for scanned bottles) */}
          {imageUri && feedbackState !== 'dismissed' && (
            <View
              style={[
                styles.feedbackStrip,
                isLowConfidence && styles.feedbackStripProminent,
                (feedbackState === 'correcting' || feedbackState === 'typing') &&
                  styles.feedbackStripCorrection,
              ]}
            >
              {feedbackState === 'confirmed' ? (
                <>
                  <Ionicons name="checkmark-circle" size={18} color={colors.gold} />
                  <Text style={styles.feedbackConfirmedText}>Thanks — noted!</Text>
                </>
              ) : feedbackState === 'correcting' ? (
                <>
                  <Text style={styles.correctionLabel}>Help us get it right</Text>
                  <TouchableOpacity
                    style={styles.correctionOption}
                    onPress={handleCorrectionBarcode}
                  >
                    <View style={styles.correctionOptionIcon}>
                      <Ionicons name="barcode-outline" size={20} color={colors.gold} />
                    </View>
                    <View style={styles.correctionOptionBody}>
                      <Text style={styles.correctionOptionTitle}>Scan the barcode</Text>
                      <Text style={styles.correctionOptionSub}>
                        Fastest — point at the barcode on the bottle
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.correctionOption}
                    onPress={handleCorrectionSearchLibrary}
                  >
                    <View style={styles.correctionOptionIcon}>
                      <Ionicons name="search-outline" size={20} color={colors.accent} />
                    </View>
                    <View style={styles.correctionOptionBody}>
                      <Text style={styles.correctionOptionTitle}>Search the library</Text>
                      <Text style={styles.correctionOptionSub}>
                        Find it by name from our database
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.correctionOption}
                    onPress={() => setFeedbackState('typing')}
                  >
                    <View style={styles.correctionOptionIcon}>
                      <Ionicons name="create-outline" size={20} color={colors.subtext} />
                    </View>
                    <View style={styles.correctionOptionBody}>
                      <Text style={styles.correctionOptionTitle}>Type it in</Text>
                      <Text style={styles.correctionOptionSub}>Enter the name manually</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.correctionCancel}
                    onPress={() => setFeedbackState('dismissed')}
                  >
                    <Text style={styles.correctionCancelText}>Skip</Text>
                  </TouchableOpacity>
                </>
              ) : feedbackState === 'typing' ? (
                <>
                  <Text style={styles.correctionLabel}>What's the right bottle?</Text>
                  <TextInput
                    style={styles.correctionInput}
                    placeholder="Bottle name"
                    placeholderTextColor={colors.subtext}
                    value={correctionName}
                    onChangeText={setCorrectionName}
                    autoFocus
                    returnKeyType="next"
                  />
                  <TextInput
                    style={styles.correctionInput}
                    placeholder="Brand (optional)"
                    placeholderTextColor={colors.subtext}
                    value={correctionBrand}
                    onChangeText={setCorrectionBrand}
                    returnKeyType="done"
                    onSubmitEditing={handleCorrectionSubmit}
                  />
                  <View style={styles.correctionActions}>
                    <TouchableOpacity
                      style={[styles.correctionSubmit, !correctionName.trim() && { opacity: 0.5 }]}
                      onPress={handleCorrectionSubmit}
                      disabled={!correctionName.trim() || submittingCorrection}
                    >
                      {submittingCorrection ? (
                        <ActivityIndicator size="small" color="#1A120D" />
                      ) : (
                        <Text style={styles.correctionSubmitText}>Submit</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.correctionCancel}
                      onPress={() => setFeedbackState('correcting')}
                    >
                      <Text style={styles.correctionCancelText}>Back</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text
                    style={[
                      styles.feedbackQuestion,
                      isLowConfidence && styles.feedbackQuestionProminent,
                    ]}
                  >
                    Is this the right bottle?
                  </Text>
                  <View style={styles.feedbackButtons}>
                    <TouchableOpacity style={styles.feedbackYes} onPress={handleFeedbackYes}>
                      <Ionicons name="thumbs-up-outline" size={15} color={colors.gold} />
                      <Text style={styles.feedbackYesText}>Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.feedbackNo} onPress={handleFeedbackNo}>
                      <Ionicons name="thumbs-down-outline" size={15} color={colors.subtext} />
                      <Text style={styles.feedbackNoText}>No</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Identity — Flavor Profile (quick glance; full tasting notes live below the fold) */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeaderRow}>
              <Text style={styles.infoCardTitle}>Flavor Profile</Text>
              {bottleProfile.isFlavorFallback && (
                <Text style={styles.categoryDefaultBadge}>{bottle.type} profile</Text>
              )}
            </View>
            <View style={styles.flavorGrid}>
              {bottleProfile.flavorProfile.map((flavor, index) => (
                <View key={index} style={styles.flavorIconCell}>
                  <View style={styles.flavorIconCircle}>
                    <FlavorIcon flavor={flavor} size={26} color={colors.goldText} />
                  </View>
                  <Text style={styles.flavorIconLabel} numberOfLines={2}>
                    {flavor}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Value line — sourced range + spotted-price verdict + at-scan capture (Phase 1.2) */}
          <ValueLine
            range={priceRangeEstimate}
            currency={userCurrency}
            sourceLabel={valueSourceLabel}
            spotted={spottedForBottle}
            giftMode={giftMode}
            onOpenCurrencyPicker={() => setShowCurrencyPicker(true)}
            onLogPrice={(price) =>
              logSpottedPrice({
                bottleId: bottleWishlistId,
                price,
                currency: userCurrency,
                capturePoint: 'at_scan',
                userId: user?.id,
              })
            }
          />

          {/* Currency picker modal */}
          <Modal
            visible={showCurrencyPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowCurrencyPicker(false)}
          >
            <TouchableOpacity
              style={styles.currencyModalOverlay}
              activeOpacity={1}
              onPress={() => setShowCurrencyPicker(false)}
            >
              <View style={styles.currencyModalSheet}>
                <View style={styles.currencyModalHandle} />
                <Text style={styles.currencyModalTitle}>Price Currency</Text>
                {(Object.keys(CURRENCY_META) as SupportedCurrency[]).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.currencyOption,
                      c === userCurrency && styles.currencyOptionActive,
                    ]}
                    onPress={() => {
                      setCurrency(c);
                      setShowCurrencyPicker(false);
                    }}
                  >
                    <Text style={styles.currencyOptionFlag}>{CURRENCY_META[c].flag}</Text>
                    <View style={styles.currencyOptionLabels}>
                      <Text
                        style={[
                          styles.currencyOptionCode,
                          c === userCurrency && styles.currencyOptionCodeActive,
                        ]}
                      >
                        {c}
                      </Text>
                      <Text style={styles.currencyOptionName}>{CURRENCY_META[c].label}</Text>
                    </View>
                    {c === userCurrency && (
                      <Ionicons name="checkmark" size={18} color={colors.gold} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* The Hook — recipe unlock, promoted above serve guidance / full tasting notes */}
          {!loadingCocktails && suggestedCocktails.length > 0 && (
            <View style={styles.section}>
              <View style={styles.cocktailsHeader}>
                <Ionicons name="sparkles" size={24} color={colors.gold} />
                <View style={styles.cocktailsHeaderCopy}>
                  <Text style={styles.cocktailsTitle}>
                    {giftMode && giftPreference.flavorHint
                      ? `They could make ${giftFilteredCocktails.length} cocktails with this bottle`
                      : tier === 'FREE' && lockedCocktailCount > 0
                        ? `Owning this unlocks ${suggestedCocktails.length + lockedCocktailCount} cocktails with your shelf`
                        : serveRecommendation.cocktailPlacement === 'secondary'
                          ? 'Cocktails That Respect This Bottle'
                          : 'Cocktails You Can Make'}
                  </Text>
                  <Text style={styles.cocktailsSubtitle}>
                    {giftMode && giftPreference.flavorHint
                      ? 'Matched to how they like it'
                      : tier === 'FREE'
                        ? lockedCocktailCount > 0
                          ? `${ANSWER_CARD_FREE_RECIPE_COUNT} free now — the rest with KŌOPE+`
                          : 'From your free and unlocked recipe pool.'
                        : 'Best matches from your current recipe access.'}
                  </Text>
                </View>
              </View>
              <FlatList
                horizontal
                data={giftMode ? giftFilteredCocktails : suggestedCocktails}
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
                      onPress={() =>
                        navigation.navigate('CocktailDetail', { cocktailId: cocktail.id })
                      }
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
                  tier === 'FREE' && lockedCocktailCount > 0 && lockedCocktailTeaser ? (
                    <LockedRecipeCard
                      image={getCocktailImage(lockedCocktailTeaser.id, lockedCocktailTeaser.image)}
                      title={lockedCocktailTeaser.name}
                      subtitle={
                        lockedCocktailCount > 1
                          ? `+${lockedCocktailCount - 1} more with KŌOPE+`
                          : 'Unlock with KŌOPE+'
                      }
                      onPress={() => inventoryGate('T15')}
                      style={styles.lockedRecipeCardInRail}
                    />
                  ) : null
                }
                nestedScrollEnabled
                removeClippedSubviews={false}
              />
            </View>
          )}

          {/* Actions row — three peers */}
          <View style={[styles.secondaryActions, { marginTop: spacing(2) }]}>
            <TouchableOpacity
              style={[styles.secondaryButton, !!inventoryItem && styles.secondaryButtonActive]}
              onPress={handleAddToShelf}
              disabled={!!inventoryItem}
            >
              <Ionicons
                name={inventoryItem ? 'checkmark-circle' : 'add-circle-outline'}
                size={20}
                color={inventoryItem ? colors.gold : colors.accent}
              />
              <Text style={styles.secondaryButtonText}>
                {inventoryItem ? 'In Bar' : 'Add to Bar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, wishlisted && styles.secondaryButtonActive]}
              onPress={wishlisted ? handleRemoveFromWishlist : handleSaveToWishlist}
            >
              <Ionicons
                name={wishlisted ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={wishlisted ? colors.gold : colors.accent}
              />
              <Text style={styles.secondaryButtonText}>{wishlisted ? 'Wanted' : 'Want it'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, giftMode && styles.secondaryButtonActive]}
              onPress={() => {
                setGiftMode((value) => {
                  const next = !value;
                  if (!next) setGiftPreference({});
                  return next;
                });
              }}
            >
              <Ionicons
                name={giftMode ? 'gift' : 'gift-outline'}
                size={20}
                color={giftMode ? colors.gold : colors.accent}
              />
              <Text style={styles.secondaryButtonText}>Gift</Text>
            </TouchableOpacity>
          </View>

          {/* Gift mode — 2-tap "who's this for" + verdict (Phase 1.1) */}
          {giftMode && (
            <GiftModePanel
              preference={giftPreference}
              onPreferenceChange={setGiftPreference}
              verdict={
                giftPreference.spiritHint || giftPreference.flavorHint
                  ? computeGiftVerdict({
                      spiritToken: normalizeSpiritToken(bottle.type || (bottle as any).category),
                      flavorWords: bottleProfile.flavorProfile,
                      priceRange: priceRangeEstimate,
                      preference: giftPreference,
                    })
                  : null
              }
            />
          )}

          {/* See more — everything else lives below this fold */}
          <TouchableOpacity
            style={styles.seeMoreToggle}
            onPress={() => setExpanded((value) => !value)}
            activeOpacity={0.8}
          >
            <Text style={styles.seeMoreToggleText}>{expanded ? 'See less' : 'See more'}</Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.accent}
            />
          </TouchableOpacity>

          {expanded && (
            <>
              {/* Tasting Notes */}
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeaderRow}>
                  <Text style={styles.infoCardTitle}>Tasting Notes</Text>
                  {bottleProfile.isTastingFallback && (
                    <Text style={styles.categoryDefaultBadge}>{bottle.type} profile</Text>
                  )}
                </View>
                <Text style={styles.tastingNotes}>{bottleProfile.tastingNotes}</Text>
              </View>

              {/* Serve Guidance */}
              <View
                style={[
                  styles.serveCard,
                  serveRecommendation.isPremiumExperience && styles.serveCardPremium,
                  styles.infoCard,
                ]}
              >
                <View style={styles.serveHeader}>
                  <View style={styles.serveHeaderCopy}>
                    <Text style={styles.serveEyebrow}>
                      {serveRecommendation.isPremiumExperience
                        ? 'Premium Bottle Guidance'
                        : 'Serve Guidance'}
                    </Text>
                    <Text style={styles.serveTitle}>{serveRecommendation.heroTitle}</Text>
                    <Text style={styles.serveSubtitle}>{serveRecommendation.heroSubtitle}</Text>
                  </View>
                  <View style={styles.firstPourBadge}>
                    <Text style={styles.firstPourLabel}>Start With</Text>
                    <Text style={styles.firstPourValue}>
                      {serveRecommendation.serveModes.find(
                        (mode) => mode.mode === serveRecommendation.firstPour,
                      )?.label || 'Neat'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.serveWhy}>{serveRecommendation.why}</Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.serveModesRail}
                  contentContainerStyle={styles.serveModesRailContent}
                >
                  {serveRecommendation.serveModes.map((mode, index) => (
                    <React.Fragment key={mode.mode}>
                      {index > 0 && <View style={styles.serveModeSeparator} />}
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
                    </React.Fragment>
                  ))}
                </ScrollView>

                <View style={styles.serveFootnote}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
                  <Text style={styles.serveFootnoteText}>{serveRecommendation.cocktailUse}</Text>
                </View>
              </View>

              {/* About This Spirit */}
              <View style={[styles.infoCard, { marginBottom: spacing(3) }]}>
                <SpiritEducationPanel
                  bottle={bottle}
                  serveRecommendation={serveRecommendation}
                  alwaysExpanded={true}
                  inCard
                />
              </View>

              {/* Secondary actions row */}
              <View
                style={[
                  styles.secondaryActions,
                  { marginTop: spacing(1), marginBottom: spacing(1) },
                ]}
              >
                <TouchableOpacity style={styles.secondaryButton} onPress={handleTryAnother}>
                  <Ionicons name="camera-outline" size={20} color={colors.accent} />
                  <Text style={styles.secondaryButtonText}>Scan Again</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={handleFindNearby}>
                  <Ionicons name="location-outline" size={20} color={colors.accent} />
                  <Text style={styles.secondaryButtonText}>Find Nearby</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={handleShareFind}>
                  <Ionicons name="share-outline" size={20} color={colors.accent} />
                  <Text style={styles.secondaryButtonText}>Share</Text>
                </TouchableOpacity>
              </View>

              {/* Wrong Result — small text link */}
              <TouchableOpacity style={styles.wrongResultLink} onPress={handleWrongResult}>
                <Text style={styles.wrongResultLinkText}>Wrong bottle? Clear result</Text>
              </TouchableOpacity>
            </>
          )}

          {/* end bodyContent */}
        </View>
      </ScrollView>

      {/* Sticky shelf confirmation bar — only shown once added; the primary
          "Add to Bar" action now lives in the in-screen actions row */}
      {inventoryItem && (
        <View
          style={[styles.stickyShelfBar, { paddingBottom: Math.max(insets.bottom, spacing(2)) }]}
        >
          <View style={styles.stickyShelfConfirmed}>
            <Ionicons name="checkmark-circle" size={18} color={colors.gold} />
            <Text style={styles.stickyShelfConfirmedText}>In your shelf</Text>
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('Shelf')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.shelfActionViewLink}>View shelf →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Price prompt — appears after saving to wishlist */}
      <Modal
        visible={showPricePrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPricePrompt(false)}
      >
        <View style={styles.pricePromptOverlay}>
          <View style={styles.pricePromptCard}>
            <Text style={styles.pricePromptTitle}>Seen a price?</Text>
            <Text style={styles.pricePromptSubtitle}>
              Log where you spotted it and how much — you can compare stores later.
            </Text>

            <TextInput
              style={styles.pricePromptInput}
              value={priceInput}
              onChangeText={setPriceInput}
              placeholder={`Price (${userCurrency})`}
              placeholderTextColor={colors.subtext}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
            <TextInput
              style={styles.pricePromptInput}
              value={locationInput}
              onChangeText={setLocationInput}
              placeholder="Store or location (e.g. Total Wine, Miami)"
              placeholderTextColor={colors.subtext}
              returnKeyType="done"
              onSubmitEditing={handleSavePriceEntry}
            />

            <View style={styles.pricePromptActions}>
              <TouchableOpacity
                style={styles.pricePromptSkip}
                onPress={() => setShowPricePrompt(false)}
              >
                <Text style={styles.pricePromptSkipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pricePromptSave} onPress={handleSavePriceEntry}>
                <Text style={styles.pricePromptSaveText}>Save</Text>
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
  heroBadgeLowConfidence: {
    backgroundColor: 'rgba(255,152,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.4)',
  },
  heroBadgeTextLowConfidence: {
    color: colors.warning,
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
  heroStoryLine: {
    marginTop: spacing(1),
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.82)',
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
    marginHorizontal: -spacing(2),
  },
  serveModesRailContent: {
    flexDirection: 'row',
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(0.5),
    gap: spacing(1.5),
  },
  serveModeSeparator: {
    width: 0,
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
  flavorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1.5),
    marginTop: spacing(0.5),
  },
  flavorIconCell: {
    width: '30%',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  flavorIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flavorIconLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 14,
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
  lockedRecipeCardInRail: {
    width: 240,
    height: 320,
    marginLeft: spacing(2),
  },
  seeMoreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.5),
    paddingVertical: spacing(2),
  },
  seeMoreToggleText: {
    fontSize: 14,
    fontWeight: '600',
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
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  secondaryButtonActive: {
    backgroundColor: `${colors.gold}14`,
    borderColor: colors.gold,
  },
  invConfirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(4),
  },
  invConfirmCard: {
    width: '100%',
    backgroundColor: '#1A1108',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.25)',
    padding: spacing(4),
    alignItems: 'center',
  },
  invConfirmIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(214,138,56,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
  },
  invConfirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  invConfirmBottleName: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: spacing(1.5),
  },
  invConfirmXP: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: 'rgba(214,138,56,0.1)',
    borderRadius: radii.sm,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    marginBottom: spacing(3),
  },
  invConfirmXPText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold,
  },
  invConfirmActions: {
    flexDirection: 'row',
    gap: spacing(2),
    width: '100%',
    marginBottom: spacing(2),
  },
  invConfirmSecondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.75),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  invConfirmSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  invConfirmPrimary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.75),
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
  },
  invConfirmPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  invConfirmDismiss: {
    paddingVertical: spacing(1),
  },
  invConfirmDismissText: {
    fontSize: 14,
    color: colors.subtext,
  },
  feedbackStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${colors.accent}12`,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    marginBottom: spacing(3),
    gap: spacing(2),
  },
  feedbackQuestion: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.subtext,
  },
  feedbackStripProminent: {
    backgroundColor: 'rgba(255,152,0,0.1)',
    borderColor: 'rgba(255,152,0,0.35)',
  },
  feedbackStripCorrection: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing(1),
  },
  correctionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  correctionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    paddingVertical: spacing(1.25),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  correctionOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctionOptionBody: {
    flex: 1,
    gap: 2,
  },
  correctionOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  correctionOptionSub: {
    fontSize: 11,
    color: colors.subtext,
  },
  correctionInput: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    fontSize: 14,
    color: colors.text,
  },
  correctionActions: {
    flexDirection: 'row',
    gap: spacing(1),
    marginTop: spacing(0.5),
  },
  correctionSubmit: {
    flex: 1,
    backgroundColor: colors.gold,
    borderRadius: radii.sm,
    paddingVertical: spacing(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctionSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A120D',
  },
  correctionCancel: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctionCancelText: {
    fontSize: 13,
    color: colors.subtext,
  },
  feedbackQuestionProminent: {
    color: colors.text,
    fontWeight: '600',
  },
  feedbackConfirmedText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold,
    marginLeft: spacing(1),
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: spacing(1),
  },
  feedbackYes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: `${colors.accent}20`,
    borderRadius: radii.sm,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderWidth: 1,
    borderColor: `${colors.accent}40`,
  },
  feedbackYesText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold,
  },
  feedbackNo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderWidth: 1,
    borderColor: colors.line,
  },
  feedbackNoText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
  },
  // ── Flavour strip ──────────────────────────────────────────────────────────
  flavourStrip: {
    marginBottom: spacing(2),
  },
  flavourStripContent: {
    paddingHorizontal: spacing(2),
    gap: spacing(1),
    flexDirection: 'row',
  },
  flavourPill: {
    backgroundColor: `${colors.accent}18`,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: `${colors.accent}35`,
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(0.6),
  },
  flavourPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold,
  },
  // ── What else do I need ────────────────────────────────────────────────────
  missingSection: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(2),
    gap: spacing(1.5),
  },
  missingSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  missingRow: {
    gap: spacing(0.75),
  },
  missingRecipeName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  missingIngredients: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.75),
  },
  missingPill: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.4),
  },
  missingPillText: {
    fontSize: 12,
    color: colors.text,
  },
  missingMore: {
    fontSize: 12,
    color: colors.subtext,
    alignSelf: 'center',
  },
  // ── Sticky shelf action bar ────────────────────────────────────────────────
  stickyShelfBar: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(3),
    paddingTop: spacing(1.5),
  },
  stickyShelfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    paddingVertical: spacing(1.75),
    borderRadius: radii.lg,
    backgroundColor: colors.gold,
  },
  stickyShelfButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.goldText,
  },
  stickyShelfConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.75),
    paddingVertical: spacing(1.75),
  },
  stickyShelfConfirmedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gold,
    flex: 1,
  },
  // ── Legacy shelf action (kept for shelfActionViewLink ref) ─────────────────
  shelfAction: {
    alignItems: 'center',
    paddingTop: spacing(2),
    paddingHorizontal: spacing(4),
  },
  shelfActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(6),
    paddingVertical: spacing(2),
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  shelfActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  shelfActionConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  shelfActionConfirmedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gold,
    flex: 1,
  },
  shelfActionViewLink: {
    fontSize: 12,
    color: colors.accent,
  },
  // ── Wrong result link ──────────────────────────────────────────────────────
  wrongResultLink: {
    alignItems: 'center',
    paddingVertical: spacing(1.5),
  },
  wrongResultLinkText: {
    fontSize: 12,
    color: colors.subtext,
    textDecorationLine: 'underline',
  },
  // ── Wishlist ──────────────────────────────────────────────────────────────
  wishlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    paddingVertical: spacing(1),
  },
  wishlistLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  wishlistLinkText: {
    fontSize: 12,
    color: colors.subtext,
  },
  wishlistSavedText: {
    fontSize: 12,
    color: colors.accent,
  },
  wishlistRemoveText: {
    fontSize: 12,
    color: colors.subtext,
    textDecorationLine: 'underline',
  },
  // ── Price prompt modal ────────────────────────────────────────────────────
  pricePromptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(3),
  },
  pricePromptCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing(3),
    width: '100%',
    gap: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
  },
  pricePromptTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  pricePromptSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
  },
  pricePromptInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    fontSize: 14,
    color: colors.text,
  },
  pricePromptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing(2),
    marginTop: spacing(0.5),
  },
  pricePromptSkip: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.5),
  },
  pricePromptSkipText: {
    fontSize: 14,
    color: colors.subtext,
  },
  pricePromptSave: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2.5),
  },
  pricePromptSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.bg,
  },
  // ── Horizontal info cards (flavor/tasting + serve/about) ──────────────────
  infoCardsScroll: {
    marginBottom: spacing(3),
  },
  infoCardsContent: {
    gap: 0,
  },
  infoCard: {
    width: Dimensions.get('window').width - spacing(3) * 2,
    marginBottom: 0,
  },
  infoCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    marginBottom: spacing(1.5),
  },
  infoCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  infoCardDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(1),
    marginBottom: spacing(3),
    marginTop: spacing(1),
  },
  infoCardsDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(1),
    marginBottom: spacing(1.5),
  },
  infoCardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
  },
  infoCardDotActive: {
    backgroundColor: colors.gold,
    width: 16,
  },
  // ── Currency picker ────────────────────────────────────────────────────────
  regionBadgeTappable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.accent}20`,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },
  regionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  currencyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  currencyModalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing(3),
    paddingBottom: spacing(5),
    gap: spacing(0.5),
  },
  currencyModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginBottom: spacing(2),
  },
  currencyModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1.5),
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1),
    borderRadius: radii.md,
  },
  currencyOptionActive: {
    backgroundColor: `${colors.gold}15`,
  },
  currencyOptionFlag: {
    fontSize: 24,
  },
  currencyOptionLabels: {
    flex: 1,
    gap: 2,
  },
  currencyOptionCode: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  currencyOptionCodeActive: {
    color: colors.gold,
  },
  currencyOptionName: {
    fontSize: 12,
    color: colors.subtext,
  },
  // ── Taste signal + thumbs ─────────────────────────────────────────────────
  tasteSignalLine: {
    fontSize: 13,
    color: colors.subtext,
    marginHorizontal: spacing(4),
    marginTop: spacing(0.5),
    marginBottom: spacing(1),
    lineHeight: 18,
  },
  thumbsRow: {
    flexDirection: 'row',
    gap: spacing(2),
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(1),
  },
  thumbsButton: {
    padding: spacing(0.5),
  },
  correctionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(1.5),
  },
  correctionPill: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  correctionPillText: {
    fontSize: 12,
    color: colors.subtext,
  },
});
