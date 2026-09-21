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
  TouchableOpacity,
  Alert,
  Linking,
  Image,
  Modal,
  Share,
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
import { styles } from './BottleDetailScreen.styles';
import type { CameraStackParamList } from '../navigation/CameraStack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { getPriceTierDisplay } from '../data/spiritsDatabase';
import { useXPSystem } from '../store/useXPSystem';
import * as Localization from 'expo-localization';
import {
  useCurrencyPreference,
  convertFromUSD,
  formatPriceRange,
  type SupportedCurrency,
} from '../store/useCurrencyPreference';
import { supabase } from '../lib/supabase';
import { InventoryService } from '../services/inventoryService';
import { challengeProgressService } from '../services/challengeProgressService';
import { useAuth } from '../contexts/AuthContext';
import { sortByMatch } from '../utils/recipeMatching';
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
import { ScanHistoryService } from '../services/scanHistoryService';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';
import { useWishlist, WISHLIST_FREE_CAP } from '../store/useWishlist';
import { notificationService } from '../services/notificationService';
import { useTasteModel } from '../store/useTasteModel';
import {
  logScanEvent,
  updateScanOutcome,
  shouldRecordPassOnExit,
} from '../services/scanContextService';
import { log } from '../lib/logger';
import SpiritEducationPanel from '../components/SpiritEducationPanel';
import GiftModePanel from '../components/bottle/GiftModePanel';
import TastePromptPanel from '../components/bottle/TastePromptPanel';
import ScanFeedbackPanel from '../components/bottle/ScanFeedbackPanel';
import CocktailHookRail from '../components/bottle/CocktailHookRail';
import {
  computeGiftVerdict,
  filterRecipesForGift,
  type GiftPreference,
} from '../services/giftVerdictService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FlavorProfile, Spirit } from '../types/userProfile';
import { useTasteSummary } from '../hooks/useTasteSummary';
import {
  hydrateTasteGraph,
  initializeTasteGraph,
  toPersistedTasteProfile,
} from '../services/tasteGraphService';
import { loadUserProfile, updateUserProfileFields } from '../services/userProfileService';
import { CANONICAL_FLAVORS, CANONICAL_SPIRITS } from '../utils/flavorTaxonomy';
import ValueLine from '../components/bottle/ValueLine';
import CurrencyPickerModal from '../components/CurrencyPickerModal';
import PriceSpottedPromptModal from '../components/PriceSpottedPromptModal';
import { useSpottedPrices } from '../store/useSpottedPrices';
import { logSpottedPrice } from '../services/spottedPriceService';
import { parseLocalePrice } from '../utils/priceInput';
import { computeValueVerdict } from '../services/valueVerdictService';
import {
  getSpiritCategoryDefaults,
  normalizeSpiritToken,
  getRespectThisBottleScore,
  normalizeInventoryName,
} from '../utils/bottleDetailHelpers';

type BottleDetailScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<CameraStackParamList, 'BottleDetail'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const DOCUMENT_DIRECTORY =
  (FileSystem as unknown as { documentDirectory?: string }).documentDirectory ?? '';

// Phase 1.6 onboarding inversion: one-time, free "what do you like" prompt
// shown after a new user's first suggested-recipes moment. Distinct from
// AGE_VERIFIED_KEY/ONBOARDING_COMPLETED_KEY in useSimpleOnboarding.ts —
// this fires later, inside the app, not during the pre-main-app flow.
const TASTE_PROMPT_SHOWN_KEY = '@KOOPE:taste_prompt_shown';

export default function BottleDetailScreen() {
  const navigation = useNavigation<BottleDetailScreenNavigationProp>();
  const route = useRoute<RouteProp<CameraStackParamList, 'BottleDetail'>>();
  const insets = useSafeAreaInsets();
  const { earnScanXP, earnScanCorrectedXP, isCocktailUnlockedWithXP } = useXPSystem();
  const { isRecipeUnlocked: isRecipeUnlockedWithEngagement } = useEngagement();
  const { user } = useAuth();
  const tasteSummary = useTasteSummary(user?.id);
  const { tier } = useUserTier();
  const { gateWithTrigger: inventoryGate } = useFeatureAccess('inventory_unlimited');
  const { hasAccess: hasPremiumServeEducation } = useFeatureAccess('premium_serve_education');
  const { hasAccess: hasPremiumServePersonalization } = useFeatureAccess(
    'premium_serve_personalization',
  );
  const { bottle, imageUri, scanConfidence, scannedBarcode, scanSource, returnTo } = route.params;
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
  // Phase 1.5 scan-context: one scan_events row per Answer Card visit,
  // created here and updated by the 3 actions below (or 'passed' on exit
  // via the beforeRemove listener further down).
  const [scanEventId, setScanEventId] = useState<string | null>(null);
  const scanOutcomeRecordedRef = useRef(false);
  // True when this bottle was ALREADY on the want-list when the screen
  // opened (e.g. re-opened from the Shelf/Want grid). Browsing your own
  // want-list is not a fresh purchase decision, so the exit listener below
  // must not resolve that visit to 'passed' — doing so overwrote real
  // 'wanted' signal with noise and inverted the want-conversion metric.
  const wasWishlistedOnEntryRef = useRef(false);
  // The base scan reward is paid once per Answer Card visit, when the scan
  // resolves — whatever the outcome. It used to fire only from the
  // shelf-add handler, so wanting or price-checking a bottle paid 0 XP even
  // though the scan itself had already happened. Owning still carries the
  // bigger downstream reward; this is just the acknowledgement of the scan.
  const scanXPAwardedRef = useRef(false);
  const awardScanXPOnce = () => {
    if (scanXPAwardedRef.current) return;
    scanXPAwardedRef.current = true;
    earnScanXP(bottle.id);
  };
  // Phase 1.6: free, one-time "what do you like" prompt (see
  // TastePromptPanel) — mutually exclusive with Gift mode's own panel.
  const [showTastePrompt, setShowTastePrompt] = useState(false);
  const [tasteSpiritHint, setTasteSpiritHint] = useState<string | undefined>(undefined);
  const [tasteFlavorHint, setTasteFlavorHint] = useState<FlavorProfile | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);
  // "See more" jump target — used by the truncated hero story line (down to
  // the full Tasting Notes) and by the low-confidence nudge (down to the
  // scan-feedback panel). Everything below the fold is gated behind
  // `expanded`, but the toggle itself sits at a fixed position whether
  // expanded or not, so it's safe to measure and scroll to immediately.
  const scrollViewRef = useRef<ScrollView>(null);
  const seeMoreRef = useRef<View>(null);
  const openSeeMoreFold = () => {
    setExpanded(true);
    seeMoreRef.current?.measureLayout(
      scrollViewRef.current as unknown as number,
      (_x, y) =>
        scrollViewRef.current?.scrollTo({ y: Math.max(y - spacing(2), 0), animated: true }),
      () => {},
    );
  };

  // Phase 1.5: log the scan_events row once, on mount. Fire-and-forget —
  // doesn't block render, and no-ops if there's no signed-in user or
  // analytics consent isn't granted (see scanContextService.ts).
  useEffect(() => {
    let cancelled = false;
    logScanEvent({
      userId: user?.id,
      bottleId: bottle.id,
      bottleName: bottle.name,
      brandName: bottle.brand,
      scanSource,
    }).then((id) => {
      if (!cancelled) setScanEventId(id);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the user leaves the Answer Card without Add-to-Bar/Want-it ever
  // firing, the scan resolves to 'passed' — every scan eventually gets
  // exactly one of owned/wanted/passed.
  //
  // Two exceptions, both of which used to poison the want-conversion metric:
  //   - an outcome was already recorded on this visit (scanOutcomeRecordedRef)
  //   - the bottle was already want-listed when the screen opened
  //     (wasWishlistedOnEntryRef) — re-opening a bottle you already want is
  //     not a pass, and logging it as one buried the real signal.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      const shouldPass = shouldRecordPassOnExit({
        hasScanEvent: !!scanEventId,
        outcomeAlreadyRecorded: scanOutcomeRecordedRef.current,
        wasWishlistedOnEntry: wasWishlistedOnEntryRef.current,
      });
      if (scanEventId && shouldPass) {
        updateScanOutcome({ scanEventId, outcome: 'passed' });
        awardScanXPOnce();
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, scanEventId]);

  // returnTo === 'shelf' means this screen was entered cross-tab (from the
  // Shelf/Want grid, which lives in a different bottom-tab stack) —
  // intercept every removal path (button tap, swipe-back gesture, Android
  // hardware back), not just the on-screen button, so all of them return
  // to the Shelf tab instead of popping to CameraHub underneath.
  useEffect(() => {
    if (returnTo !== 'shelf') return;
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      (navigation as any).navigate('Shelf');
    });
    return unsubscribe;
  }, [navigation, returnTo]);

  // Phase 1.6: offer the free taste prompt once, right after the first
  // suggested-recipes moment — only for users with no taste signal yet
  // (so it doesn't re-nag someone who's already built up a profile from
  // behavior or RefineYourTaste), and never alongside Gift mode's own panel.
  //
  // This is currently the ONLY taste-onboarding input anywhere in the app —
  // real onboarding asks zero questions by design. What's picked here is
  // written as a one-time, low-confidence PRIOR straight into the canonical
  // profile (see handleTasteSpiritSelect/handleTasteFlavorSelect below), not
  // into the old personalization store.
  useEffect(() => {
    if (loadingCocktails || suggestedCocktails.length === 0 || giftMode) return;
    if (tasteSummary.loading || tasteSummary.ready) return;

    let cancelled = false;
    AsyncStorage.getItem(TASTE_PROMPT_SHOWN_KEY).then((shown) => {
      if (!cancelled && !shown) setShowTastePrompt(true);
    });
    return () => {
      cancelled = true;
    };
  }, [
    loadingCocktails,
    suggestedCocktails.length,
    giftMode,
    tasteSummary.loading,
    tasteSummary.ready,
  ]);

  const dismissTastePrompt = () => {
    setShowTastePrompt(false);
    AsyncStorage.setItem(TASTE_PROMPT_SHOWN_KEY, 'true');
  };

  /**
   * Seed a single flavor/spirit pick into the canonical profile as a low
   * weight prior — the same role an onboarding answer used to play. Not a
   * mirror overwrite (this only ever fires once, before any real behavior
   * exists) and not steering (there's nothing to bias yet). Merges into
   * whatever graph already exists rather than clobbering it, since a user
   * with e.g. a scan or two already has a thin real profile to build on.
   */
  const seedTastePrior = async (patch: { flavor?: FlavorProfile; spirit?: string }) => {
    if (!user?.id) return;
    try {
      const existing = await loadUserProfile(user.id).catch(() => null);
      const graph =
        hydrateTasteGraph(existing?.tasteProfile) ??
        initializeTasteGraph({
          flavorWeights: Object.fromEntries(CANONICAL_FLAVORS.map((f) => [f, 0])) as Record<
            (typeof CANONICAL_FLAVORS)[number],
            number
          >,
          spiritWeights: Object.fromEntries(CANONICAL_SPIRITS.map((s) => [s, 0])) as Record<
            Spirit,
            number
          >,
          preferredABV: { min: 0, max: 40 },
          preferredComplexity: 0.5,
        });

      const SEED_WEIGHT = 0.45; // a nudge, not a declaration — behavior still dominates from here
      if (patch.flavor) {
        graph.rawProfile.flavorWeights[patch.flavor] = Math.max(
          graph.rawProfile.flavorWeights[patch.flavor] ?? 0,
          SEED_WEIGHT,
        );
      }
      if (patch.spirit) {
        const spiritKey = patch.spirit as keyof typeof graph.rawProfile.spiritWeights;
        graph.rawProfile.spiritWeights[spiritKey] = Math.max(
          graph.rawProfile.spiritWeights[spiritKey] ?? 0,
          SEED_WEIGHT,
        );
      }

      await updateUserProfileFields(user.id, {
        tasteProfile: toPersistedTasteProfile(graph) as any,
      });
    } catch (error) {
      log.warn('BottleDetailScreen', 'Failed to seed taste prior from prompt', { error });
    }
  };

  const handleTasteSpiritSelect = (value: string | undefined) => {
    setTasteSpiritHint(value);
    if (value) seedTastePrior({ spirit: value });
    AsyncStorage.setItem(TASTE_PROMPT_SHOWN_KEY, 'true');
  };

  const handleTasteFlavorSelect = (value: FlavorProfile | undefined) => {
    setTasteFlavorHint(value);
    if (value) seedTastePrior({ flavor: value });
    AsyncStorage.setItem(TASTE_PROMPT_SHOWN_KEY, 'true');
  };

  // Taste model — write-only now. Scans and ownership reach the unified
  // profile via scan_events and the shelf read in tasteVectorService.
  //
  // recordThumbsUp/recordThumbsDown existed on useTasteModel with no UI ever
  // wired to them — no thumbs button has ever rendered on a bottle. Removed
  // as dead scaffolding rather than built out, since a bottle-level thumbs
  // affordance is a real product decision (mirroring the recipe thumbs flow),
  // not a bug fix. Flagged as a follow-up, not built here.
  const { recordScan } = useTasteModel();
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Wishlist
  const { saveToWishlist, isWishlisted, removeFromWishlist, addPriceEntry } = useWishlist();
  const bottleWishlistId =
    bottle.id || `${bottle.name}_${bottle.brand}`.toLowerCase().replace(/\s+/g, '_');
  const [wishlisted, setWishlisted] = useState(() => isWishlisted(bottleWishlistId));
  // Snapshot the entry state once (see wasWishlistedOnEntryRef above). Reads
  // `wishlisted`'s lazy initial value, so it's the value at mount, not after
  // a Want-it tap during this visit.
  useEffect(() => {
    wasWishlistedOnEntryRef.current = isWishlisted(bottleWishlistId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    // First sentences got noticeably longer/denser once tastingNotes was
    // expanded from a 1-2 sentence blurb into a full paragraph — this teaser
    // sits under the hero pills at numberOfLines={2}, so cap it by length
    // (word-boundary + ellipsis) rather than trusting sentence length to
    // reliably fit two lines.
    const STORY_LINE_MAX = 110;
    const truncated =
      firstSentence.length > STORY_LINE_MAX
        ? `${firstSentence.slice(0, STORY_LINE_MAX).replace(/\s+\S*$/, '')}…`
        : firstSentence;
    return giftMode ? `A crowd-pleasing choice — ${truncated}` : truncated;
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

    // bottle.type only carries the catalog's SpiritType union (gin/vodka/
    // rum/whiskey/tequila/mezcal/brandy/liqueur/other) — it has no 'wine'
    // option at all, so a straight `=== 'liqueur'` check silently wrote
    // every vermouth, amaro, and champagne to the shelf as category
    // 'spirit'. Check the name/type text for the wine and liqueur families
    // this catalog can't express before falling back to spirit.
    const shelfHaystack = `${bottle.type || ''} ${bottle.name || ''}`.toLowerCase();
    const shelfCategory = /(vermouth|champagne|prosecco|cava|sparkling wine|sherry|port wine)/.test(
      shelfHaystack,
    )
      ? 'wine'
      : bottle.type === 'liqueur' ||
          /(liqueur|triple sec|cointreau|campari|aperol|amaretto|chartreuse|kahl[uú]a|fernet|cynar|amaro)/.test(
            shelfHaystack,
          )
        ? 'liqueur'
        : 'spirit';

    const result = await InventoryService.addToInventory({
      userId: user.id,
      itemType: 'spirit',
      itemName: bottle.name,
      category: shelfCategory,
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
      scanOutcomeRecordedRef.current = true;
      awardScanXPOnce();
      if (scanEventId) {
        updateScanOutcome({ scanEventId, outcome: 'owned', context: 'home' });
      }
      return;
    }

    if (!result.success) {
      Alert.alert('Error', 'Failed to add to shelf. Please try again.');
      return;
    }

    // Silently update shelf state — no modal, no XP celebration
    setInventoryItem({ id: 'added', item_name: bottle.name } as any);
    challengeProgressService.trackAddToInventory(user.id, bottle.id || bottle.name);
    scanOutcomeRecordedRef.current = true;
    awardScanXPOnce();
    if (scanEventId) {
      updateScanOutcome({ scanEventId, outcome: 'owned', context: 'home' });
    }
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

    // The want-conversion signal is recorded HERE, on the tap — not inside
    // handleSavePriceEntry. It used to live there, which meant dismissing
    // the price prompt (the common case) left the scan to resolve to
    // 'passed' via the exit listener: the metric was inverted. The price
    // prompt below is now purely an optional enrichment.
    scanOutcomeRecordedRef.current = true;
    awardScanXPOnce();
    if (scanEventId) {
      updateScanOutcome({ scanEventId, outcome: 'wanted', context: 'store' });
    }

    setShowPricePrompt(true);
  };

  const handleRemoveFromWishlist = () => {
    removeFromWishlist(bottleWishlistId);
    setWishlisted(false);
  };

  const handleSavePriceEntry = () => {
    const price = parseLocalePrice(priceInput);
    if (!(price > 0) || !locationInput.trim()) {
      Alert.alert(
        'Missing info',
        !(price > 0)
          ? 'Enter a valid price to save this entry.'
          : 'Enter a store or location to save this entry.',
      );
      return;
    }
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
    // Enrichment only — the 'wanted' outcome was already written when the
    // user tapped Want it (handleSaveToWishlist). All this adds is the price
    // they saw and the store context that a price sighting implies.
    if (scanEventId) {
      scanOutcomeRecordedRef.current = true;
      updateScanOutcome({ scanEventId, context: 'store', priceSeen: price });
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

  // Re-scan the bottle. There is no "scan the barcode instead" variant — the
  // scan screen has one mode, and its silent decoder will pick a barcode up on
  // its own if one happens to be in frame (scanner spec A.0).
  const handleCorrectionRescan = async () => {
    await invalidateCacheEntry();
    navigation.navigate('SmartScan');
  };

  const handleCorrectionSearchLibrary = async () => {
    await invalidateCacheEntry();
    navigation.navigate('BottleSearch', { initialQuery: bottle.name });
  };

  const handleCorrectionSubmit = async (name: string, correctionBrand: string) => {
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

      // 5. Reward it. scanCorrected (75 XP) has been defined since the
      // monetization spec with zero call sites — this is the flow it was
      // written for, and correcting a bad identification is the single most
      // useful thing a user can do for the scan model.
      earnScanCorrectedXP();
    } catch {
      /* silent — correction is best-effort */
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        ref={scrollViewRef}
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

          {/* Back / close button — returnTo==='shelf' redirect handled
              centrally in the beforeRemove listener below, so it also
              covers the swipe-back gesture and Android hardware back. */}
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

            <TouchableOpacity onPress={openSeeMoreFold} activeOpacity={0.7}>
              <Text style={styles.heroStoryLine} numberOfLines={2}>
                {storyLine}
              </Text>
              <Text style={styles.heroStoryLineSeeMore}>See more</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Body content — padded */}
        <View style={styles.bodyContent}>
          {/* Low-confidence nudge — the full "is this right?" + correction
              flow now lives below the fold (Answer Card spec §B.4), but a
              best-match identification is worth flagging before the user
              acts on it, so a one-line tap-target jumps down to it. */}
          {imageUri && isLowConfidence && (
            <TouchableOpacity
              style={styles.lowConfidenceNudge}
              onPress={openSeeMoreFold}
              activeOpacity={0.8}
            >
              <Ionicons name="help-circle-outline" size={16} color={colors.warning} />
              <Text style={styles.lowConfidenceNudgeText}>Not this bottle? Fix it</Text>
              <Ionicons name="chevron-down" size={14} color={colors.warning} />
            </TouchableOpacity>
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
            onLogPrice={(price, locationLabel) =>
              logSpottedPrice({
                bottleId: bottleWishlistId,
                price,
                currency: userCurrency,
                // Optional at this capture point by design — see ValueLine's
                // docblock. Previously always null here, which threw away the
                // most commercially useful column in spotted_prices.
                locationLabel,
                capturePoint: 'at_scan',
                userId: user?.id,
              })
            }
          />

          {/* Currency picker modal */}
          <CurrencyPickerModal
            visible={showCurrencyPicker}
            onClose={() => setShowCurrencyPicker(false)}
            currentCurrency={userCurrency}
            onSelectCurrency={(c) => {
              setCurrency(c);
              setShowCurrencyPicker(false);
            }}
          />

          {/* The Hook — recipe unlock, promoted above serve guidance / full
              tasting notes. The paywalled recipe is a real 4th card inside
              the row, not a footer teaser (spec §B.4 item 3). */}
          {!loadingCocktails && (
            <CocktailHookRail
              cocktails={giftMode ? giftFilteredCocktails : suggestedCocktails}
              lockedCount={lockedCocktailCount}
              lockedTeaser={lockedCocktailTeaser}
              showLockedCard={tier === 'FREE'}
              hasGiftHint={giftMode && !!giftPreference.flavorHint}
              respectFirst={serveRecommendation.cocktailPlacement === 'secondary'}
              onPressRecipe={(cocktailId) => navigation.navigate('CocktailDetail', { cocktailId })}
              onPressLocked={() => inventoryGate('T15')}
            />
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
                  // Phase 1.5: gift mode is a context modifier, not an
                  // outcome — only write when turning it ON.
                  if (next && scanEventId) {
                    updateScanOutcome({ scanEventId, context: 'gift' });
                  }
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

          {/* Free "what do you like" prompt (Phase 1.6) — one-time, never alongside Gift mode */}
          {!giftMode && showTastePrompt && (
            <TastePromptPanel
              spiritHint={tasteSpiritHint}
              flavorHint={tasteFlavorHint}
              onSpiritSelect={handleTasteSpiritSelect}
              onFlavorSelect={handleTasteFlavorSelect}
              onDismiss={dismissTastePrompt}
            />
          )}

          {/* See more — everything else lives below this fold */}
          <TouchableOpacity
            ref={seeMoreRef}
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
              {/* Scan feedback + correction — real functionality, but it
                  belongs under the decision content, not above it. */}
              {imageUri && (
                <ScanFeedbackPanel
                  isLowConfidence={isLowConfidence}
                  onConfirm={handleFeedbackYes}
                  onCorrectViaRescan={handleCorrectionRescan}
                  onCorrectViaLibrary={handleCorrectionSearchLibrary}
                  onSubmitCorrection={handleCorrectionSubmit}
                />
              )}

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
      <PriceSpottedPromptModal
        visible={showPricePrompt}
        // Just closes a modal. Dismissing it does NOT change the scan
        // outcome — 'wanted' was already recorded on the Want-it tap.
        onClose={() => setShowPricePrompt(false)}
        currency={userCurrency}
        priceInput={priceInput}
        onPriceInputChange={setPriceInput}
        locationInput={locationInput}
        onLocationInputChange={setLocationInput}
        onSave={handleSavePriceEntry}
      />
    </SafeAreaView>
  );
}
