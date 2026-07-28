/**
 * Home Bar Screen
 * Clean, card-based design for managing home bar inventory
 */

import React, { useState, useLayoutEffect, useCallback, useMemo } from 'react';
import {
  ScrollView,
  FlatList,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, radii, fonts, serif } from '../theme/tokens';
import { Heading, MainPageHeader } from '../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { FlavorIcon } from '../components/FlavorIcon';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { HomeBar, BarIngredient, HomeBarService } from '../services/homeBarService';
import { InventoryService } from '../services/inventoryService';
import { challengeProgressService } from '../services/challengeProgressService';
import EmptyState from '../components/EmptyState';
import { log } from '../lib/logger';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useUserTier } from '../store/useUserTier';
import { TIER_LIMITS } from '../config/tierAccess';
import { useScrollHaptic, withHaptic } from '../lib/haptics';
import { SPIRITS_DATABASE, findSpirit } from '../data/spiritsDatabase';
import { BottleServeService } from '../services/bottleServeService';
import { CellarService } from '../services/cellarService';
import { notificationService } from '../services/notificationService';
import { FeedbackPromptModal } from '../components/FeedbackPromptModal';
import { useWishlist, WISHLIST_FREE_CAP } from '../store/useWishlist';
import { useSpottedPrices } from '../store/useSpottedPrices';
import { useCurrencyPreference } from '../store/useCurrencyPreference';
import { logSpottedPrice } from '../services/spottedPriceService';
import { parseLocalePrice } from '../utils/priceInput';
import { buyIngredient } from '../services/affiliateService';
import { useTasteModel, ALL_FLAVOUR_TAGS } from '../store/useTasteModel';
import { flavourTagLabel } from '../utils/tasteSignal';

// Import images from assets
import * as Images from '../../assets/images';

// Category definitions
type InventoryCategory =
  'spirits' | 'mixers' | 'garnishes' | 'ingredients' | 'liqueur' | 'bitters' | 'syrup' | 'other';

interface InventoryItem extends BarIngredient {
  purchase_price?: number | null;
  valuation_estimate?: number | null;
  drinking_window_start?: string | null;
  drinking_window_end?: string | null;
  cellar_notes?: string | null;
  scanned_at?: string | null;
  region?: string | null;
  flavor_tags?: string[] | null;
  tasting_notes?: string | null;
  serve_guidance?: string | null;
  quantity?: 'full' | 'half' | 'low' | 'empty' | null;
}

function hasCellarRecord(item: InventoryItem): boolean {
  return Boolean(
    item.purchase_price != null ||
    item.valuation_estimate != null ||
    item.drinking_window_start ||
    item.drinking_window_end ||
    item.cellar_notes,
  );
}

// Empty initialiser — prevents null state on mount. Ingredients are loaded from Supabase.
const mockHomeBar: HomeBar = {
  id: 'default',
  userId: '',
  name: 'My Home Bar',
  description: '',
  ingredients: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  isDefault: true,
};

export default function HomeBarScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const { tier } = useUserTier();
  const { gateWithTrigger: upgradeGate } = useFeatureAccess('inventory_unlimited');
  const { gateWithTrigger: hostingBasicGate } = useFeatureAccess('hosting_basic');
  const { gateWithTrigger: optimizeMyBarGate } = useFeatureAccess('optimize_my_bar');
  const { hasAccess: hasCellarMode, gateWithTrigger: cellarModeGate } =
    useFeatureAccess('cellar_mode');
  const { gate: expiryAlertsGate } = useFeatureAccess('expiry_alerts');
  const { gate: barHealthGate } = useFeatureAccess('bar_health_score');
  const { user } = useAuth();
  const { items: wishlistItems, removeFromWishlist, addPriceEntry } = useWishlist();
  const sortedWishlistItems = useMemo(
    () => [...wishlistItems].sort((a, b) => a.name.localeCompare(b.name)),
    [wishlistItems],
  );
  const spottedPriceEntries = useSpottedPrices((s) => s.entries);
  const { currency: userCurrency } = useCurrencyPreference();
  const { dominantCluster, flavourScores, profileVisible } = useTasteModel();
  const [palateExpanded, setPalateExpanded] = useState(false);
  const [logPriceItem, setLogPriceItem] = useState<
    import('../store/useWishlist').WishlistItem | null
  >(null);
  const [logPriceValue, setLogPriceValue] = useState('');
  const [logPriceLocation, setLogPriceLocation] = useState('');

  // Defined after gate hooks so closures capture the latest gate functions.
  // Using a flat array + FlatList (not nested ScrollView) avoids gesture conflicts.
  const FEATURE_CARDS = useMemo(
    () => [
      {
        key: 'hosting',
        title: 'Hosting',
        subtitle: 'Guest menu planner',
        icon: 'people-outline' as const,
        onPress: () => hostingBasicGate('T6', () => nav.navigate('Hosting')),
      },
      {
        key: 'optimize',
        title: 'Optimize',
        subtitle: 'What to buy next',
        icon: 'bar-chart-outline' as const,
        onPress: () => optimizeMyBarGate('T4', () => nav.navigate('BarOptimizer')),
      },
      {
        key: 'expiry',
        title: 'Expiry Alerts',
        subtitle: 'Use-first list',
        icon: 'time-outline' as const,
        onPress: () =>
          expiryAlertsGate(() => nav.navigate('InventoryInsights', { mode: 'expiry' })),
      },
      {
        key: 'health',
        title: 'Bar Health',
        subtitle: 'Coverage score',
        icon: 'analytics-outline' as const,
        onPress: () => barHealthGate(() => nav.navigate('InventoryInsights', { mode: 'health' })),
      },
    ],
    [hostingBasicGate, optimizeMyBarGate, expiryAlertsGate, barHealthGate, nav],
  );
  const [cartFeedbackVisible, setCartFeedbackVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<InventoryCategory | 'all'>('all');
  // Owned vs Want — top-level view switch (1.4c). Previously this was a
  // 'saved' sentinel inside activeCategory, one chip among Spirits/Mixers/etc.
  const [inventoryView, setInventoryView] = useState<'owned' | 'want'>('owned');
  const [homeBar, setHomeBar] = useState<HomeBar>({ ...mockHomeBar, ingredients: [] });
  // True only until the first load resolves. Without this, `ingredients`
  // starts at [] and sections gated on `ingredients.length > 0` (e.g. the
  // Feature Cards row below) are indistinguishable from "bar is actually
  // empty" during the fetch — they pop in once data arrives instead of
  // being there from first paint, which reads as the screen jumping.
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  // Tracks a failed/broken image load for the detail modal — without this,
  // a stale or unreachable imageUrl just renders as an empty colored box
  // (inventoryDetailImage's backgroundColor) with no icon fallback.
  const [detailImageFailed, setDetailImageFailed] = useState(false);
  const [itemNoteDraft, setItemNoteDraft] = useState('');
  const [showItemOptionsModal, setShowItemOptionsModal] = useState(false);
  const [showInventorySwitcher, setShowInventorySwitcher] = useState(false);
  const [showCellarIntakeModal, setShowCellarIntakeModal] = useState(false);
  const [cellarIntakePrice, setCellarIntakePrice] = useState('');
  const [cellarIntakeValuation, setCellarIntakeValuation] = useState('');
  const [cellarIntakeWindowStart, setCellarIntakeWindowStart] = useState('');
  const [cellarIntakeWindowEnd, setCellarIntakeWindowEnd] = useState('');
  const [cellarIntakeNotes, setCellarIntakeNotes] = useState('');
  const [cellarIntakeQuantity, setCellarIntakeQuantity] = useState<
    'full' | 'half' | 'low' | 'empty'
  >('full');
  const [savingCellarIntake, setSavingCellarIntake] = useState(false);
  const [editMode, setEditMode] = useState(false);
  // Separate from editMode (which is rename-only: name/brand/category) — this
  // gates Bar Note / Cellar Mode / Add to Shopping List / Remove from Bar,
  // reached via the "..." icon rather than the pencil. Mutually exclusive
  // with editMode so the modal only ever shows one extra concern at a time,
  // not the full stack (that stacking was the original complaint).
  const [showManageActions, setShowManageActions] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editCategory, setEditCategory] = useState<BarIngredient['category']>('spirit');
  const onScrollHaptic = useScrollHaptic('selection', 800);

  useLayoutEffect(() => {
    nav.setOptions({
      headerShown: false,
    });
  }, [nav]);

  // Load stored ingredients when component mounts or when focused.
  // Guard prevents re-entrant calls and redundant reloads within 3s of the last fetch.
  const lastLoadTimeRef = React.useRef(0);
  const isLoadingRef = React.useRef(false);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (isLoadingRef.current || now - lastLoadTimeRef.current < 3000) return;
      isLoadingRef.current = true;
      lastLoadTimeRef.current = now;
      loadStoredIngredients().finally(() => {
        isLoadingRef.current = false;
        setInitialLoading(false);
      });
    }, []),
  );

  // Opens a bottle's manage modal when BottleSearchScreen routes here for an
  // owned item (see BottleSearchScreen.tsx's handleSelect) — the combined
  // search screen can't open this screen's local modal state directly, so it
  // hands off via a route param instead. Cleared immediately so re-focusing
  // this tab later (without a fresh param) doesn't reopen the same item.
  useFocusEffect(
    useCallback(() => {
      const openItemId = route.params?.openItemId as string | undefined;
      if (!openItemId) return;
      nav.setParams({ openItemId: undefined } as any);
      const item = homeBar.ingredients.find((i) => i.id === openItemId);
      if (item) handleItemPress(item);
    }, [route.params?.openItemId, homeBar.ingredients]),
  );

  const loadStoredIngredients = async () => {
    try {
      if (!user) return;
      await HomeBarService.migrateLegacyImageUrisOnce();

      const remoteItems = await InventoryService.getUserInventory(user.id);
      const mappedRemote: InventoryItem[] = remoteItems.map((item) => {
        const rawName = String(item.item_name || '').trim();
        let parsedName = rawName;
        let parsedBrand = item.brand || undefined;
        const rawSubcategory = item.subcategory || undefined;
        const validCategories: BarIngredient['category'][] = [
          'spirit',
          'liqueur',
          'mixer',
          'bitters',
          'syrup',
          'garnish',
          'ingredient',
          'other',
        ];
        const rawCategory = String(item.category || '').toLowerCase();
        const inferredCategory = validCategories.includes(rawCategory as BarIngredient['category'])
          ? (rawCategory as BarIngredient['category'])
          : item.item_type === 'spirit'
            ? 'spirit'
            : 'ingredient';

        if (!parsedBrand && rawName.includes(' - ')) {
          const [maybeBrand, ...rest] = rawName.split(' - ');
          const remainingName = rest.join(' - ').trim();
          if (maybeBrand?.trim() && remainingName) {
            parsedBrand = maybeBrand.trim();
            parsedName = remainingName;
          }
        }

        if (!parsedBrand && rawSubcategory) {
          const withoutSubcategory = rawName
            .replace(new RegExp(`\\b${rawSubcategory}\\b`, 'i'), '')
            .trim();
          if (withoutSubcategory && withoutSubcategory !== rawName) {
            parsedBrand = withoutSubcategory.replace(/\s{2,}/g, ' ').trim();
          }
        }

        return {
          id: item.id,
          name: parsedName,
          category: inferredCategory,
          subcategory: rawSubcategory,
          brand: parsedBrand,
          abv: item.abv || undefined,
          notes: item.notes || undefined,
          volume: item.volume || 750,
          imageUrl: item.image_url || undefined,
          imageUri: item.image_url || undefined,
          addedAt: item.added_at ? new Date(item.added_at) : new Date(),
          isFavorite: item.is_favorite || false,
          tags: item.flavor_tags || [],
          region: item.region,
          flavor_tags: item.flavor_tags,
          tasting_notes: item.tasting_notes,
          serve_guidance: item.serve_guidance,
          purchase_price: item.purchase_price,
          valuation_estimate: item.valuation_estimate,
          drinking_window_start: item.drinking_window_start,
          drinking_window_end: item.drinking_window_end,
          cellar_notes: item.cellar_notes,
          scanned_at: item.scanned_at,
        };
      });

      const storedIngredients = await HomeBarService.getStoredIngredients();
      const combined = [...mappedRemote];
      const seen = new Map(
        combined.map((i, index) => [
          `${i.name.toLowerCase()}|${(i.category || '').toLowerCase()}`,
          index,
        ]),
      );

      for (const item of storedIngredients) {
        const key = `${item.name.toLowerCase()}|${(item.category || '').toLowerCase()}`;
        const existingIndex = seen.get(key);
        if (existingIndex !== undefined) {
          const existing = combined[existingIndex];
          combined[existingIndex] = {
            ...existing,
            imageUrl: existing.imageUrl || item.imageUri || item.imageUrl,
            imageUri: (existing as any).imageUri || item.imageUri || item.imageUrl,
            notes: existing.notes || item.notes,
            brand: existing.brand || item.brand,
          };
          continue;
        }

        combined.push(item as InventoryItem);
        seen.set(key, combined.length - 1);
      }

      // Merge cellar record quantity onto inventory items so the Low Stock
      // section reflects what the user has actually tracked.
      try {
        const cellarRecords = await CellarService.getRecords();
        for (const item of combined) {
          const record = cellarRecords[item.id];
          if (record?.quantity) {
            (item as InventoryItem).quantity = record.quantity as InventoryItem['quantity'];
          }
        }
      } catch {
        // Non-fatal: low stock section just won't populate offline
      }

      setHomeBar((prev) => ({
        ...prev,
        ingredients: combined,
      }));
    } catch (error) {
      log.error('HomeBarScreen', 'Failed to load stored ingredients', error as Error);
    }
  };

  const categories: { key: InventoryCategory | 'all'; label: string; icon: any }[] = [
    { key: 'all', label: 'All', icon: 'apps' },
    { key: 'spirits', label: 'Spirits', icon: 'wine' },
    { key: 'liqueur', label: 'Liqueurs', icon: 'wine-outline' },
    { key: 'mixers', label: 'Mixers', icon: 'water' },
    { key: 'garnishes', label: 'Garnishes', icon: 'leaf' },
    { key: 'ingredients', label: 'Ingredients', icon: 'nutrition' },
  ];

  const getFilteredInventory = () => {
    let filtered = homeBar.ingredients;

    // Filter by category
    if (activeCategory !== 'all') {
      if (activeCategory === 'spirits') {
        filtered = filtered.filter((item) => item.category === 'spirit');
      } else if (activeCategory === 'liqueur') {
        filtered = filtered.filter((item) => item.category === 'liqueur');
      } else if (activeCategory === 'mixers') {
        filtered = filtered.filter((item) => item.category === 'mixer');
      } else if (activeCategory === 'garnishes') {
        filtered = filtered.filter((item) => item.category === 'garnish');
      } else if (activeCategory === 'ingredients') {
        filtered = filtered.filter((item) => item.category === 'ingredient');
      } else {
        filtered = filtered.filter((item) => item.category === activeCategory);
      }
    }

    // Filter by search
    if (searchQuery.trim()) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Alphabetical — easier to scan/find a specific bottle than insertion order.
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

    // FREE tier visibility cap mirrors the hard add limit, applied after filters.
    if (tier === 'FREE') {
      filtered = filtered.slice(0, TIER_LIMITS.FREE.maxBottles);
    }

    return { all: filtered };
  };

  const { all } = getFilteredInventory();

  const favoriteItems = useMemo(
    () => homeBar.ingredients.filter((item) => item.isFavorite).slice(0, 6),
    [homeBar.ingredients],
  );

  const handleSeeRecipes = () => {
    nav.navigate('WhatCanIMake');
  };

  const handleAddIngredient = () => {
    // Shelf items are added only via scan — route to SmartScan.
    (nav as any).navigate('Camera', { screen: 'SmartScan' });
  };

  const handleInventoryHeaderMenu = () => {
    setShowInventorySwitcher((prev) => !prev);
  };

  const handleItemPress = (item: InventoryItem) => {
    setSelectedItem(item);
    setDetailImageFailed(false);
    setItemNoteDraft(item.notes || '');
    setEditMode(false);
    setShowManageActions(false);
    setEditName(item.name);
    setEditBrand(item.brand || '');
    setEditCategory((item.category as BarIngredient['category']) || 'spirit');
    setShowItemOptionsModal(true);
  };

  const handleSaveItemEdit = async () => {
    if (!selectedItem) return;
    const trimmedName = editName.trim();
    if (!trimmedName) return;
    const updates: Partial<InventoryItem> = {
      name: trimmedName,
      brand: editBrand.trim() || undefined,
      notes: itemNoteDraft.trim() || undefined,
      category: editCategory,
    };
    await syncItemMetadata(selectedItem, updates);
    if (user?.id) {
      const serviceUpdates: Parameters<typeof InventoryService.updateInventoryItem>[1] = {};
      if (itemNoteDraft.trim() !== (selectedItem.notes || '')) {
        serviceUpdates.notes = itemNoteDraft.trim() || undefined;
      }
      if (editCategory !== selectedItem.category) {
        serviceUpdates.category = editCategory;
      }
      if (Object.keys(serviceUpdates).length > 0) {
        await InventoryService.updateInventoryItem(selectedItem.id, serviceUpdates).catch(() => {});
      }
    }
    setEditMode(false);
  };

  const syncItemMetadata = async (item: InventoryItem, updates: Partial<InventoryItem>) => {
    const nextItem = { ...item, ...updates };

    setHomeBar((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((entry) => (entry.id === item.id ? nextItem : entry)),
    }));
    setSelectedItem(nextItem);

    const remoteUpdated = user?.id
      ? await InventoryService.updateInventoryItem(item.id, {
          isFavorite: updates.isFavorite,
          notes: updates.notes,
        })
      : false;

    if (!remoteUpdated) {
      await HomeBarService.updateStoredIngredient(item.name, item.category, {
        isFavorite: updates.isFavorite,
        notes: updates.notes,
      }).catch(() => undefined);
    }
  };

  const handleToggleFavorite = async () => {
    if (!selectedItem) return;
    const nextFavorite = !selectedItem.isFavorite;
    await syncItemMetadata(selectedItem, { isFavorite: nextFavorite });
  };

  const handleSaveItemNotes = async () => {
    if (!selectedItem) return;
    const trimmedNotes = itemNoteDraft.trim();
    await syncItemMetadata(selectedItem, { notes: trimmedNotes || undefined });
    Alert.alert(
      'Notes Saved',
      trimmedNotes ? 'Your bar note was updated.' : 'Your note was cleared.',
    );
  };

  const handleOpenCellarIntake = () => {
    if (!selectedItem) return;
    setCellarIntakePrice(
      selectedItem.purchase_price != null ? String(selectedItem.purchase_price) : '',
    );
    setCellarIntakeValuation(
      selectedItem.valuation_estimate != null ? String(selectedItem.valuation_estimate) : '',
    );
    setCellarIntakeWindowStart(selectedItem.drinking_window_start || '');
    setCellarIntakeWindowEnd(selectedItem.drinking_window_end || '');
    setCellarIntakeNotes(selectedItem.cellar_notes || '');
    setCellarIntakeQuantity(
      ((selectedItem as any).quantity as 'full' | 'half' | 'low' | 'empty') || 'full',
    );
    setShowCellarIntakeModal(true);
  };

  const handleSaveCellarIntake = async () => {
    if (!selectedItem || !user) return;

    const parsedPrice = cellarIntakePrice.trim() ? Number(cellarIntakePrice) : null;
    if (parsedPrice !== null && Number.isNaN(parsedPrice)) {
      Alert.alert('Invalid Price', 'Enter a valid number for purchase price.');
      return;
    }
    const parsedValuation = cellarIntakeValuation.trim() ? Number(cellarIntakeValuation) : null;
    if (parsedValuation !== null && Number.isNaN(parsedValuation)) {
      Alert.alert('Invalid Value', 'Enter a valid number for current estimated value.');
      return;
    }

    setSavingCellarIntake(true);
    const drinkingWindowStart = cellarIntakeWindowStart.trim() || 'Now';
    const drinkingWindowEnd = cellarIntakeWindowEnd.trim() || 'Review';
    const cellarNotes = cellarIntakeNotes.trim() || null;

    try {
      await CellarService.saveRecord({
        inventoryItemId: selectedItem.id,
        itemName: selectedItem.name,
        createdAt: new Date().toISOString(),
        imageUrl: selectedItem.imageUrl || null,
        brand: selectedItem.brand || null,
        type:
          selectedBottleDetails?.type || selectedItem.subcategory || selectedItem.category || null,
        abv: selectedBottleDetails?.abv || selectedItem.abv || null,
        region: selectedBottleDetails?.region || selectedItem.region || null,
        flavorProfile: selectedBottleDetails?.flavorProfile || selectedItem.flavor_tags || [],
        tastingNotes: selectedBottleDetails?.tastingNotes || selectedItem.tasting_notes || null,
        serveGuidance: selectedBottleDetails?.serveGuidance || selectedItem.serve_guidance || null,
        quantity: cellarIntakeQuantity,
        purchasePrice: parsedPrice,
        valuationEstimate:
          parsedValuation ?? parsedPrice ?? selectedItem.valuation_estimate ?? null,
        drinkingWindowStart,
        drinkingWindowEnd,
        cellarNotes,
      });
    } catch {
      setSavingCellarIntake(false);
      Alert.alert(
        'Unable to Track',
        'We could not create a cellar record for this item right now.',
      );
      return;
    }

    const nextItem: InventoryItem = {
      ...selectedItem,
      cellar_notes: cellarNotes,
      drinking_window_start: drinkingWindowStart,
      drinking_window_end: drinkingWindowEnd,
      purchase_price: parsedPrice,
      valuation_estimate: parsedValuation ?? parsedPrice ?? selectedItem.valuation_estimate ?? null,
    };
    setHomeBar((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((entry) =>
        entry.id === selectedItem.id ? nextItem : entry,
      ),
    }));
    setSelectedItem(nextItem);

    void InventoryService.updateInventoryItem(selectedItem.id, {
      cellarNotes: cellarNotes ?? undefined,
      drinkingWindowStart,
      drinkingWindowEnd,
      valuationEstimate:
        parsedValuation ?? parsedPrice ?? selectedItem.valuation_estimate ?? undefined,
    }).catch(() => {});

    // Fire or cancel low stock alert based on quantity
    if (cellarIntakeQuantity === 'low' || cellarIntakeQuantity === 'empty') {
      notificationService.scheduleLowStockAlert(selectedItem.id, selectedItem.name).catch(() => {});
    } else {
      notificationService.cancelLowStockAlert(selectedItem.id).catch(() => {});
    }

    setSavingCellarIntake(false);
    setShowCellarIntakeModal(false);
    nav.navigate('CellarBottleDetail', { inventoryItemId: selectedItem.id });
  };

  const handleDeleteItem = () => {
    if (!selectedItem) return;

    setHomeBar((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((item) => item.id !== selectedItem.id),
    }));

    setShowItemOptionsModal(false);
    setSelectedItem(null);
  };

  const getIngredientImage = (item: BarIngredient) => {
    if ((item as any).imageUri) return { uri: (item as any).imageUri };
    if (item.imageUrl) return { uri: item.imageUrl };

    const haystack =
      `${item.category || ''} ${item.subcategory || ''} ${item.name || ''} ${item.brand || ''}`.toLowerCase();

    const spiritFamilyMap: { pattern: RegExp; key: keyof typeof Images.spirits }[] = [
      { pattern: /(gin|juniper)/, key: 'gin' },
      { pattern: /(scotch)/, key: 'scotch' },
      { pattern: /(whiskey|whisky|bourbon|rye)/, key: 'whiskey' },
      { pattern: /(vodka)/, key: 'vodka' },
      { pattern: /(rum|rhum|cachaca)/, key: 'rum' },
      { pattern: /(tequila)/, key: 'tequila' },
      { pattern: /(mezcal)/, key: 'mezcal' },
      { pattern: /(brandy|cognac)/, key: 'brandy' },
    ];

    for (const entry of spiritFamilyMap) {
      if (entry.pattern.test(haystack)) {
        return Images.spirits[entry.key];
      }
    }

    const ingredientFamilyMap: { pattern: RegExp; key: keyof typeof Images.ingredients }[] = [
      { pattern: /(lemon)/, key: 'lemon' },
      { pattern: /(lime)/, key: 'lime' },
      { pattern: /(orange|triple sec|cointreau|curacao)/, key: 'orange' },
      { pattern: /(grapefruit)/, key: 'grapefruit' },
      { pattern: /(pineapple)/, key: 'pineapple' },
      { pattern: /(cherry|maraschino)/, key: 'cherry' },
      { pattern: /(strawberry)/, key: 'strawberry' },
      { pattern: /(raspberry)/, key: 'raspberry' },
      { pattern: /(blueberry)/, key: 'blueberry' },
      { pattern: /(watermelon)/, key: 'watermelon' },
      { pattern: /(mint|mojito)/, key: 'mint' },
      { pattern: /(basil)/, key: 'basil' },
      { pattern: /(lavender)/, key: 'lavender' },
      { pattern: /(rose)/, key: 'rose' },
      { pattern: /(amaro|aperol|campari)/, key: 'amaro' },
      { pattern: /(anise|pastis|absinthe|sambuca)/, key: 'aniseLiquor' },
      { pattern: /(creme de cacao|cacao)/, key: 'cremeDeCacao' },
      { pattern: /(elderflower|st-germain)/, key: 'elderflowerLiquor' },
      {
        pattern: /(coffee liqueur|espresso liqueur|kahlua|mr black|espresso)/,
        key: 'espressoLiquor',
      },
      { pattern: /(orange liqueur|grand marnier)/, key: 'orangeLiquor' },
      { pattern: /(bitters|angostura|peychaud)/, key: 'bitters' },
    ];

    for (const entry of ingredientFamilyMap) {
      if (entry.pattern.test(haystack)) {
        return Images.ingredients[entry.key];
      }
    }

    return null;
  };

  const getCategoryIcon = (category: string, subcategory?: string, name?: string) => {
    const haystack = `${subcategory || ''} ${name || ''}`.toLowerCase();

    switch (category) {
      case 'spirit':
        return 'wine';
      case 'liqueur':
        return 'wine-outline';
      case 'bitters':
        return 'flask-outline';
      case 'syrup':
        return 'water-outline';
      case 'mixer':
        if (/(milk|cream|coconut cream)/.test(haystack)) return 'cafe-outline';
        if (
          /(juice|lemon|lime|orange|grapefruit|pineapple|passionfruit|berry|strawberry|blueberry|raspberry|blackberry|peach|apple|mango|fruit)/.test(
            haystack,
          )
        ) {
          return 'nutrition-outline';
        }
        return 'water';
      case 'garnish':
        if (
          /(lemon|lime|orange|grapefruit|pineapple|passionfruit|berry|strawberry|blueberry|raspberry|blackberry|peach|apple|mango|fruit)/.test(
            haystack,
          )
        ) {
          return 'nutrition-outline';
        }
        return 'leaf-outline';
      case 'ingredient':
        if (/(egg|egg white)/.test(haystack)) return 'egg-outline';
        if (/(salt|pepper|cinnamon|nutmeg|spice)/.test(haystack)) return 'restaurant-outline';
        if (/(sugar|honey|agave|syrup|grenadine|orgeat)/.test(haystack)) return 'water-outline';
        if (
          /(lemon|lime|orange|grapefruit|pineapple|passionfruit|berry|strawberry|blueberry|raspberry|blackberry|peach|apple|mango|fruit|juice)/.test(
            haystack,
          )
        ) {
          return 'nutrition-outline';
        }
        return 'nutrition';
      default:
        return 'cube';
    }
  };

  const getCategoryDisplay = (item: InventoryItem) => {
    const base = item.subcategory || item.category;
    return String(base)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const isBottleLike = (item: InventoryItem) => {
    const haystack =
      `${item.category || ''} ${item.subcategory || ''} ${item.name || ''}`.toLowerCase();
    return /(vodka|gin|whiskey|whisky|bourbon|scotch|rum|tequila|mezcal|brandy|cognac|liqueur|vermouth|campari|amaro)/.test(
      haystack,
    );
  };

  const isCellarEligible = (item: InventoryItem) =>
    item.category === 'spirit' || item.category === 'liqueur' || isBottleLike(item);

  const getInventoryInsight = (item: InventoryItem) => {
    if (item.category === 'spirit') {
      return item.abv
        ? `${item.abv}% ABV bottle for base pours and spirit-forward serves.`
        : 'Core bottle for builds, stirred drinks, and house pours.';
    }
    if (item.category === 'liqueur') {
      return 'Modifier bottle that adds sweetness, bitterness, or depth to recipes.';
    }
    if (item.category === 'mixer') {
      return /juice|citrus|fruit/i.test(`${item.subcategory || ''} ${item.name}`)
        ? 'Freshens drinks and supports sours, spritzes, and lengthened builds.'
        : 'Supports highballs, spritzes, and longer refreshing serves.';
    }
    if (item.category === 'garnish') {
      return 'Finishing ingredient that changes aroma, freshness, and first impression.';
    }
    if (item.category === 'syrup') {
      return 'Sweetening and texture tool for balancing spirit-forward and citrus builds.';
    }
    if (item.category === 'bitters') {
      return 'Seasoning bottle that sharpens structure with just a few dashes.';
    }
    return 'Supporting ingredient used to round out prep, balance, or presentation.';
  };

  // Brand now lives in the card subtitle and favorite in the star badge —
  // keep pills to facts not shown anywhere else on the card, matching the
  // Want grid's one-clear-fact-per-pill pattern instead of stacking three.
  const getInventoryPills = (item: InventoryItem) => {
    const pills: string[] = [getCategoryDisplay(item)];
    if (item.volume) pills.push(`${item.volume}ml`);
    else if (item.category === 'garnish' || item.category === 'ingredient')
      pills.push('Fresh item');
    return pills.slice(0, 2);
  };

  const matchedSpiritProfile = useMemo(() => {
    if (!selectedItem) return null;
    const itemName = selectedItem.name.toLowerCase().trim();
    const itemBrand = (selectedItem.brand || '').toLowerCase().trim();
    return (
      SPIRITS_DATABASE.find((spirit) => {
        const spiritName = spirit.name.toLowerCase();
        const spiritBrand = spirit.brand.toLowerCase();
        return (
          spiritName === itemName ||
          spiritName.includes(itemName) ||
          itemName.includes(spiritName) ||
          (itemBrand && spiritBrand === itemBrand) ||
          spirit.searchTerms.some((term) => itemName.includes(term.toLowerCase()))
        );
      }) || null
    );
  }, [selectedItem]);

  const selectedBottleDetails = useMemo(() => {
    if (!selectedItem || !isCellarEligible(selectedItem)) return null;
    const flavorProfile = selectedItem.flavor_tags?.length
      ? selectedItem.flavor_tags
      : matchedSpiritProfile?.flavorProfile || [];
    const tastingNotes = selectedItem.tasting_notes || matchedSpiritProfile?.tastingNotes || '';
    const region = selectedItem.region || matchedSpiritProfile?.origin || '';
    const type =
      selectedItem.subcategory || matchedSpiritProfile?.type || getCategoryDisplay(selectedItem);
    const brand = selectedItem.brand || matchedSpiritProfile?.brand || '';
    const abv = selectedItem.abv || matchedSpiritProfile?.abv || null;
    const serveGuidance =
      selectedItem.serve_guidance ||
      (matchedSpiritProfile
        ? `${BottleServeService.getRecommendation(matchedSpiritProfile, tier).heroTitle}. ${BottleServeService.getRecommendation(matchedSpiritProfile, tier).why}`
        : '');

    return {
      brand,
      type,
      abv,
      region,
      flavorProfile,
      tastingNotes,
      serveGuidance,
    };
  }, [selectedItem, matchedSpiritProfile, tier]);

  const renderInventoryCard = (item: InventoryItem) => {
    const pills = getInventoryPills(item);
    const ingredientImage = getIngredientImage(item);
    const isSpirit = item.category === 'spirit' || item.category === 'liqueur';
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.inventoryCard, isSpirit && styles.spiritCard]}
        onPress={withHaptic(() => handleItemPress(item))}
        activeOpacity={0.82}
      >
        {isSpirit && <View style={styles.cardAccentStrip} />}

        <View style={styles.cardImageContainer}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.cardImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : ingredientImage ? (
            <Image source={ingredientImage as any} style={styles.cardImage} contentFit="cover" />
          ) : (
            <View style={styles.cardIconWrap}>
              <Ionicons
                name={getCategoryIcon(item.category, item.subcategory, item.name)}
                size={48}
                color={colors.accent}
              />
            </View>
          )}
          {item.isFavorite && (
            <View style={styles.cardFavBadge}>
              <Ionicons name="star" size={10} color={colors.goldText} />
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {item.brand || getCategoryDisplay(item)}
          </Text>
          {pills.length > 0 && (
            <View style={styles.cardPillRow}>
              {pills.slice(0, 2).map((pill) => (
                <View key={`${item.id}-${pill}`} style={styles.cardPill}>
                  <Text style={styles.cardPillText}>{pill}</Text>
                </View>
              ))}
            </View>
          )}
          {!!item.notes && (
            <Text style={styles.cardNote} numberOfLines={1}>
              {item.notes}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <MainPageHeader title="Your Shelf" subtitle=" " />
        <View style={styles.initialLoadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MainPageHeader
        title="Your Shelf"
        subtitle={
          inventoryView === 'want'
            ? `${wishlistItems.length} saved`
            : `${all.length} item${all.length !== 1 ? 's' : ''}`
        }
        onTitlePress={withHaptic(handleInventoryHeaderMenu, 'selection')}
        leftContent={
          <TouchableOpacity
            style={styles.headerSearchButton}
            onPress={withHaptic(
              () => (nav as any).navigate('BottleSearch', { initialQuery: '' }),
              'selection',
            )}
          >
            <Ionicons name="search" size={18} color={colors.text} />
          </TouchableOpacity>
        }
        rightActions={[
          {
            icon: 'scan-outline',
            onPress: () => (nav as any).navigate('Camera', { screen: 'SmartScan' }),
            accessibilityLabel: 'Scan a bottle',
          },
          {
            icon: 'cart-outline',
            onPress: () => setCartFeedbackVisible(true),
            accessibilityLabel: 'Open shopping cart',
          },
        ]}
      />

      <Modal
        visible={showInventorySwitcher}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInventorySwitcher(false)}
      >
        <View style={styles.inventorySwitcherOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowInventorySwitcher(false)}
          />
          <View style={styles.inventorySwitcherMenu}>
            <Text style={styles.barDropdownSubtitle}>Choose your view</Text>
            <TouchableOpacity
              style={[styles.barDropdownItem, styles.activeBarOption]}
              onPress={withHaptic(() => setShowInventorySwitcher(false), 'selection')}
            >
              <Ionicons name="layers-outline" size={18} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.barDropdownItemTitle}>Your Shelf</Text>
                <Text style={styles.barDropdownItemMeta}>Everything you've scanned and added</Text>
              </View>
              <Text style={styles.activeBarLabel}>Current</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.barDropdownItem}
              onPress={withHaptic(() => {
                setShowInventorySwitcher(false);
                setTimeout(() => {
                  cellarModeGate('T11', () => nav.navigate('TheWineCellar'));
                }, 140);
              }, 'selection')}
            >
              <Ionicons name="wine-outline" size={18} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.barDropdownItemTitle}>The Cellar</Text>
                <Text style={styles.barDropdownItemMeta}>
                  Collector showcase, tracked bottles, and portfolio view
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Inventory Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => {
          if (showInventorySwitcher) setShowInventorySwitcher(false);
          onScrollHaptic();
        }}
      >
        {/* Owned / Want — top-level view switch (1.4c) */}
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: spacing(3),
            marginTop: spacing(2),
            marginBottom: spacing(1),
            backgroundColor: colors.card,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.line,
            padding: 4,
          }}
        >
          <TouchableOpacity
            style={[
              { flex: 1, paddingVertical: spacing(1), borderRadius: 999, alignItems: 'center' },
              inventoryView === 'owned' && styles.activeCategoryChip,
            ]}
            onPress={withHaptic(() => setInventoryView('owned'), 'selection')}
          >
            <Text
              style={[
                styles.categoryChipText,
                inventoryView === 'owned' && styles.activeCategoryChipText,
              ]}
            >
              Owned
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              { flex: 1, paddingVertical: spacing(1), borderRadius: 999, alignItems: 'center' },
              inventoryView === 'want' && styles.activeCategoryChip,
            ]}
            onPress={withHaptic(() => setInventoryView('want'), 'selection')}
          >
            <Text
              style={[
                styles.categoryChipText,
                inventoryView === 'want' && styles.activeCategoryChipText,
              ]}
            >
              Want
            </Text>
          </TouchableOpacity>
        </View>

        {/* Feature Cards — horizontal FlatList avoids nested-ScrollView gesture conflicts */}
        {inventoryView === 'owned' && homeBar.ingredients.length > 0 && (
          <FlatList
            horizontal
            data={FEATURE_CARDS}
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            style={styles.featureCardsScroll}
            contentContainerStyle={styles.featureCardsContent}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.featureCard} onPress={withHaptic(item.onPress)}>
                <View style={styles.featureCardIconWrap}>
                  <Ionicons name={item.icon} size={26} color={colors.accent} />
                </View>
                <Text style={styles.featureCardTitle}>{item.title}</Text>
                <Text style={styles.featureCardSubtitle}>{item.subtitle}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {/* Category Filters — above inventory list, Owned only */}
        {inventoryView === 'owned' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryFilters}
            contentContainerStyle={styles.categoryFiltersContent}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryChip,
                  activeCategory === cat.key && styles.activeCategoryChip,
                ]}
                onPress={withHaptic(() => setActiveCategory(cat.key), 'selection')}
              >
                <Ionicons
                  name={cat.icon}
                  size={16}
                  color={activeCategory === cat.key ? colors.bg : colors.text}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    activeCategory === cat.key && styles.activeCategoryChipText,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Your Palate — visible after 5 scans, shelf tabs only */}
        {profileVisible && inventoryView === 'owned' && dominantCluster.length > 0 && (
          <TouchableOpacity
            style={styles.palateCard}
            onPress={withHaptic(() => setPalateExpanded((p) => !p), 'selection')}
            activeOpacity={0.85}
          >
            <View style={styles.palateHeader}>
              <View style={styles.palateTags}>
                {dominantCluster.map((tag) => (
                  <View key={tag} style={styles.palateTag}>
                    <Text style={styles.palateTagText}>{flavourTagLabel(tag)}</Text>
                  </View>
                ))}
              </View>
              <Ionicons
                name={palateExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.subtext}
              />
            </View>
            <Text style={styles.palateHint}>Built from your scans — no setup required.</Text>

            {palateExpanded && (
              <View style={styles.palateBars}>
                {ALL_FLAVOUR_TAGS.map((tag) => ({ tag, score: flavourScores[tag] ?? 0 }))
                  .filter(({ score }) => score > 0)
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 5)
                  .map(({ tag, score }) => (
                    <View key={tag} style={styles.palateBarRow}>
                      <Text style={styles.palateBarLabel}>{flavourTagLabel(tag)}</Text>
                      <View style={styles.palateBarTrack}>
                        <View style={[styles.palateBarFill, { width: `${score}%` as any }]} />
                      </View>
                    </View>
                  ))}
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Shelf cap indicator — FREE tier only */}
        {tier === 'FREE' && homeBar.ingredients.length > 0 && (
          <TouchableOpacity
            style={styles.shelfCapBar}
            onPress={withHaptic(() => upgradeGate('T1'), 'selection')}
            activeOpacity={0.8}
          >
            <View style={styles.shelfCapTrack}>
              <View
                style={[
                  styles.shelfCapFill,
                  {
                    width: `${Math.min((homeBar.ingredients.length / TIER_LIMITS.FREE.maxBottles) * 100, 100)}%`,
                    backgroundColor:
                      homeBar.ingredients.length >= TIER_LIMITS.FREE.maxBottles
                        ? colors.error || '#ff4444'
                        : colors.accent,
                  },
                ]}
              />
            </View>
            <Text style={styles.shelfCapText}>
              {homeBar.ingredients.length} / {TIER_LIMITS.FREE.maxBottles} bottles ·{' '}
              <Text style={styles.shelfCapCta}>Upgrade for unlimited</Text>
            </Text>
          </TouchableOpacity>
        )}

        {inventoryView === 'want' ? (
          // ── Saved (Wishlist) tab ──────────────────────────────────────────
          wishlistItems.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLine} />
                <Ionicons name="bookmark" size={11} color={colors.accent} />
                <Text style={styles.sectionTitle}>SAVED</Text>
                <View style={styles.sectionHeaderLine} />
              </View>
              <Text style={styles.sectionBodyText}>
                Bottles you've spotted but haven't bought yet. Tap to see prices you've logged.
              </Text>
              <View style={styles.grid}>
                {sortedWishlistItems.map((item) => {
                  // Read from the price journal (useSpottedPrices) — the
                  // single source of truth every capture point (at-scan
                  // chip, post-wishlist prompt, this grid's "Log price")
                  // writes to — instead of the legacy per-item
                  // priceEntries, which only the latter two ever update.
                  const itemSpottedEntries = spottedPriceEntries.filter(
                    (e) => e.bottleId === item.bottleId,
                  );
                  const lowestEntry =
                    itemSpottedEntries.length > 0
                      ? itemSpottedEntries.reduce((a, b) => (a.price < b.price ? a : b))
                      : null;
                  // Wishlist items only store name/brand/type — look up the
                  // catalog entry for real price data instead of faking a
                  // $0 range (which broke the Fair Price line and made the
                  // spotted-price verdict impossible to show, since it
                  // requires range.min > 0).
                  const catalogMatch = findSpirit(item.name) ?? findSpirit(item.bottleId);
                  const spiritProxy = {
                    id: item.bottleId,
                    name: item.name,
                    brand: item.brand,
                    type: (item.type || 'other') as any,
                    abv: catalogMatch?.abv ?? 0,
                    priceTier: catalogMatch?.priceTier ?? ('mid-range' as any),
                    priceEstimate: catalogMatch?.priceEstimate,
                    flavorProfile: catalogMatch?.flavorProfile ?? [],
                    tastingNotes: catalogMatch?.tastingNotes ?? '',
                    origin: catalogMatch?.origin ?? '',
                    searchTerms: catalogMatch?.searchTerms ?? [],
                  };
                  return (
                    <TouchableOpacity
                      key={item.bottleId}
                      style={[styles.inventoryCard, styles.spiritCard]}
                      onPress={withHaptic(
                        () =>
                          (nav as any).navigate('Camera', {
                            screen: 'BottleDetail',
                            params: {
                              bottle: spiritProxy,
                              imageUri: item.imageUri,
                              returnTo: 'shelf',
                            },
                          }),
                        'selection',
                      )}
                      activeOpacity={0.82}
                    >
                      <View style={styles.cardAccentStrip} />
                      <View style={styles.cardImageContainer}>
                        {item.imageUri ? (
                          <Image
                            source={{ uri: item.imageUri }}
                            style={styles.cardImage}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                        ) : (
                          <View style={styles.cardIconWrap}>
                            <Ionicons name="wine-outline" size={48} color={colors.accent} />
                          </View>
                        )}
                        <View style={styles.cardFavBadge}>
                          <Ionicons name="bookmark" size={10} color={colors.accent} />
                        </View>
                      </View>
                      <View style={styles.cardContent}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                          {item.brand}
                        </Text>
                        {lowestEntry ? (
                          <View style={styles.cardPillRow}>
                            <View style={styles.cardPill}>
                              <Text style={styles.cardPillText}>
                                {lowestEntry.currency} {lowestEntry.price.toFixed(0)}
                                {lowestEntry.locationLabel ? ` · ${lowestEntry.locationLabel}` : ''}
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <Text style={styles.savedNoPriceText}>No price logged yet</Text>
                        )}
                        <View style={styles.savedActionsRow}>
                          <TouchableOpacity
                            style={styles.savedLogPriceButton}
                            onPress={withHaptic((e?: any) => {
                              e?.stopPropagation?.();
                              setLogPriceItem(item);
                              setLogPriceValue('');
                              setLogPriceLocation('');
                            }, 'selection')}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <Ionicons name="pricetag-outline" size={11} color={colors.accent} />
                            <Text style={styles.savedLogPriceText}>Log price</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.savedBuyButton}
                            onPress={withHaptic((e?: any) => {
                              e?.stopPropagation?.();
                              buyIngredient(item.name, item.type, 'homebar_wishlist');
                            }, 'selection')}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <Ionicons name="cart-outline" size={11} color={colors.accent} />
                            <Text style={styles.savedLogPriceText}>Buy</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.savedRemoveButton}
                        onPress={withHaptic(() => removeFromWishlist(item.bottleId), 'selection')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={18} color={colors.subtext} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.emptyShelf}>
              <Ionicons
                name="bookmark-outline"
                size={52}
                color={colors.accent}
                style={{ marginBottom: 20 }}
              />
              <Text style={styles.emptyShelfTitle}>Nothing saved yet</Text>
              <Text style={styles.emptyShelfBody}>
                Bottles you've spotted but haven't bought yet live here.{'\n'}Scan anything out in
                the world and save it.
              </Text>
              <TouchableOpacity
                style={styles.emptyShelfButton}
                onPress={withHaptic(() => (nav as any).navigate('Camera', { screen: 'SmartScan' }))}
              >
                <Ionicons name="camera-outline" size={18} color={colors.bg} />
                <Text style={styles.emptyShelfButtonText}>Start Scanning</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          // ── Shelf tabs (All / Spirits / Liqueurs / etc.) ──────────────────
          <>
            {favoriteItems.length > 0 && activeCategory === 'all' && !searchQuery.trim() && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLine} />
                  <Ionicons name="star" size={11} color={colors.gold} />
                  <Text style={styles.sectionTitle}>FAVORITES</Text>
                  <View style={styles.sectionHeaderLine} />
                </View>
                <Text style={styles.sectionBodyText}>
                  Keep your go-to bottles, mixers, and garnish staples easy to find.
                </Text>
                <View style={styles.grid}>{favoriteItems.map(renderInventoryCard)}</View>
              </View>
            )}

            {/* All Items or Filtered Items */}
            {all.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLine} />
                  <Text style={styles.sectionTitle}>
                    {(activeCategory === 'all'
                      ? 'YOUR SHELF'
                      : categories.find((c) => c.key === activeCategory)?.label || 'ITEMS'
                    ).toUpperCase()}
                  </Text>
                  <View style={styles.sectionHeaderLine} />
                </View>
                <View style={styles.grid}>{all.map(renderInventoryCard)}</View>
              </View>
            )}

            {all.length === 0 && !searchQuery.trim() && (
              <View style={styles.emptyShelf}>
                <Ionicons
                  name="scan-outline"
                  size={52}
                  color={colors.accent}
                  style={{ marginBottom: 20 }}
                />
                <Text style={styles.emptyShelfTitle}>Your shelf is what you own</Text>
                <Text style={styles.emptyShelfBody}>
                  Scan a bottle at home to add it.{'\n'}Your shelf powers your recipes — only add
                  what's actually in your bar.
                </Text>
                <TouchableOpacity
                  style={styles.emptyShelfButton}
                  onPress={withHaptic(() =>
                    (nav as any).navigate('Camera', { screen: 'SmartScan' }),
                  )}
                >
                  <Ionicons name="camera-outline" size={18} color={colors.bg} />
                  <Text style={styles.emptyShelfButtonText}>Scan a Bottle</Text>
                </TouchableOpacity>
              </View>
            )}

            {all.length === 0 && !!searchQuery.trim() && (
              <EmptyState
                icon="magnify"
                title="No results"
                message="Try a different name or brand"
                actionLabel="Clear Search"
                onAction={() => setSearchQuery('')}
              />
            )}
          </>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.recipesButton} onPress={withHaptic(handleSeeRecipes)}>
          <Ionicons name="flask-outline" size={18} color={colors.goldText} />
          <Text style={styles.recipesButtonText}>See What You Can Make</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.goldText} />
        </TouchableOpacity>
      </View>

      {/* Item Options Modal */}
      <Modal
        visible={showItemOptionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowItemOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={withHaptic(() => {
                    setShowItemOptionsModal(false);
                    setEditMode(false);
                    setShowManageActions(false);
                  }, 'selection')}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Heading
                  level={2}
                  style={[styles.modalTitle, { flex: 1, textAlign: 'center' }]}
                  numberOfLines={1}
                >
                  {editMode ? editName || selectedItem?.name : selectedItem?.name}
                </Heading>
                <View style={styles.modalHeaderActions}>
                  {!editMode && (
                    <TouchableOpacity
                      onPress={withHaptic(() => setShowManageActions((prev) => !prev), 'selection')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="ellipsis-horizontal-circle-outline"
                        size={22}
                        color={showManageActions ? colors.gold : colors.accent}
                      />
                    </TouchableOpacity>
                  )}
                  {!showManageActions && (
                    <TouchableOpacity
                      onPress={withHaptic(() => {
                        if (editMode) {
                          handleSaveItemEdit();
                        } else {
                          setEditMode(true);
                        }
                      }, 'selection')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {editMode ? (
                        <Text style={styles.editDoneButton}>Done</Text>
                      ) : (
                        <Ionicons name="create-outline" size={22} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {selectedItem?.imageUrl && !detailImageFailed ? (
                <Image
                  source={{ uri: selectedItem.imageUrl }}
                  style={styles.inventoryDetailImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  onError={() => setDetailImageFailed(true)}
                />
              ) : selectedItem && getIngredientImage(selectedItem) ? (
                <Image
                  source={getIngredientImage(selectedItem) as any}
                  style={styles.inventoryDetailImage}
                  contentFit="cover"
                />
              ) : (
                selectedItem && (
                  <View style={[styles.inventoryDetailImage, styles.inventoryDetailImageFallback]}>
                    <Ionicons
                      name={getCategoryIcon(
                        selectedItem.category,
                        selectedItem.subcategory,
                        selectedItem.name,
                      )}
                      size={48}
                      color={colors.accent}
                    />
                  </View>
                )
              )}

              {editMode ? (
                <View style={styles.editFieldsContainer}>
                  <Text style={styles.editFieldLabel}>Name</Text>
                  <TextInput
                    style={styles.editFieldInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Bottle name"
                    placeholderTextColor={colors.muted}
                    autoFocus
                  />
                  <Text style={styles.editFieldLabel}>Brand</Text>
                  <TextInput
                    style={styles.editFieldInput}
                    value={editBrand}
                    onChangeText={setEditBrand}
                    placeholder="Brand (optional)"
                    placeholderTextColor={colors.muted}
                  />
                  <Text style={styles.editFieldLabel}>Category</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: spacing(0.5) }}
                  >
                    <View style={styles.editCategoryRow}>
                      {(
                        [
                          { key: 'spirit', label: 'Spirit' },
                          { key: 'liqueur', label: 'Liqueur' },
                          { key: 'mixer', label: 'Mixer' },
                          { key: 'bitters', label: 'Bitters' },
                          { key: 'syrup', label: 'Syrup' },
                          { key: 'garnish', label: 'Garnish' },
                          { key: 'ingredient', label: 'Ingredient' },
                          { key: 'other', label: 'Other' },
                        ] as { key: BarIngredient['category']; label: string }[]
                      ).map((opt) => (
                        <TouchableOpacity
                          key={opt.key}
                          style={[
                            styles.editCategoryChip,
                            editCategory === opt.key && styles.editCategoryChipActive,
                          ]}
                          onPress={() => setEditCategory(opt.key)}
                        >
                          <Text
                            style={[
                              styles.editCategoryChipText,
                              editCategory === opt.key && styles.editCategoryChipTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  <Text style={styles.editFieldLabel}>Bar Note</Text>
                  <TextInput
                    style={[styles.editFieldInput, { minHeight: 64 }]}
                    value={itemNoteDraft}
                    onChangeText={setItemNoteDraft}
                    placeholder="Add a quick note"
                    placeholderTextColor={colors.muted}
                    multiline
                  />
                </View>
              ) : (
                <View style={styles.itemDetailsContainer}>
                  <Text style={styles.itemDetailBrand}>
                    {selectedBottleDetails?.brand || selectedItem?.brand || 'Unknown brand'}
                  </Text>
                  <View style={styles.itemStatPills}>
                    <View style={styles.itemStatPill}>
                      <Ionicons name="pricetag" size={13} color={colors.gold} />
                      <Text style={styles.itemStatPillText}>
                        {selectedBottleDetails?.type
                          ? String(selectedBottleDetails.type).replace(/\b\w/g, (letter) =>
                              letter.toUpperCase(),
                            )
                          : selectedItem
                            ? getCategoryDisplay(selectedItem)
                            : 'Unknown'}
                      </Text>
                    </View>
                    {selectedBottleDetails?.abv ? (
                      <>
                        <View style={styles.itemStatPillDivider} />
                        <View style={styles.itemStatPill}>
                          <Ionicons name="flash" size={13} color={colors.gold} />
                          <Text style={styles.itemStatPillText}>
                            {selectedBottleDetails.abv}% ABV
                          </Text>
                        </View>
                      </>
                    ) : null}
                    {selectedBottleDetails?.region ? (
                      <>
                        <View style={styles.itemStatPillDivider} />
                        <View style={styles.itemStatPill}>
                          <Ionicons name="location" size={13} color={colors.gold} />
                          <Text style={styles.itemStatPillText}>
                            {selectedBottleDetails.region}
                          </Text>
                        </View>
                      </>
                    ) : null}
                    {selectedItem?.volume ? (
                      <>
                        <View style={styles.itemStatPillDivider} />
                        <View style={styles.itemStatPill}>
                          <Ionicons name="water" size={13} color={colors.gold} />
                          <Text style={styles.itemStatPillText}>{selectedItem.volume}ml</Text>
                        </View>
                      </>
                    ) : null}
                  </View>
                  {selectedItem && (
                    <Text style={styles.itemDetailInsight}>
                      {getInventoryInsight(selectedItem)}
                    </Text>
                  )}
                </View>
              )}

              {selectedBottleDetails ? (
                <View style={styles.inventoryBottleBrief}>
                  {selectedBottleDetails.flavorProfile.length ? (
                    <>
                      <Text style={styles.inventoryBottleBriefLabel}>Flavor Profile</Text>
                      <View style={styles.inventoryBottleFlavorRow}>
                        {selectedBottleDetails.flavorProfile.slice(0, 6).map((flavor) => (
                          <View
                            key={`${selectedItem?.id}-${flavor}`}
                            style={styles.inventoryBottleFlavorCell}
                          >
                            <View style={styles.inventoryBottleFlavorCircle}>
                              <FlavorIcon flavor={flavor} size={22} color={colors.goldText} />
                            </View>
                            <Text style={styles.inventoryBottleFlavorChipText} numberOfLines={2}>
                              {flavor}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : null}

                  {selectedBottleDetails.tastingNotes ? (
                    <>
                      <Text style={styles.inventoryBottleBriefLabel}>Tasting Notes</Text>
                      <Text style={styles.inventoryBottleBriefBody}>
                        {selectedBottleDetails.tastingNotes}
                      </Text>
                    </>
                  ) : null}

                  {selectedBottleDetails.serveGuidance ? (
                    <>
                      <Text style={styles.inventoryBottleBriefLabel}>Serve Guidance</Text>
                      <Text style={styles.inventoryBottleBriefBody}>
                        {selectedBottleDetails.serveGuidance}
                      </Text>
                    </>
                  ) : null}
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.favoriteToggle}
                onPress={withHaptic(handleToggleFavorite, 'selection')}
              >
                <Ionicons
                  name={selectedItem?.isFavorite ? 'star' : 'star-outline'}
                  size={20}
                  color={colors.gold}
                />
                <Text style={styles.favoriteToggleText}>
                  {selectedItem?.isFavorite ? 'Pinned as a bar favorite' : 'Pin as a bar favorite'}
                </Text>
              </TouchableOpacity>

              {/* Bar Note, Cellar Mode, Add to Shopping List, and Remove from
                  Bar all used to render unconditionally here, so tapping any
                  bottle opened one long scroll from "what is this bottle" info
                  straight into bottle-management actions. Gated behind the
                  "..." icon (showManageActions) — separate from the pencil
                  (editMode), which is rename-only — so the default tap is
                  just the clean detail view. */}
              {showManageActions && (
                <View style={styles.noteBlock}>
                  <Text style={styles.noteLabel}>Bar Note</Text>
                  <TextInput
                    style={styles.noteInput}
                    value={itemNoteDraft}
                    onChangeText={setItemNoteDraft}
                    placeholder="Add a quick note like low stock, guest favorite, or replace soon"
                    placeholderTextColor={colors.muted}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.noteSaveButton}
                    onPress={withHaptic(handleSaveItemNotes, 'selection')}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.accent} />
                    <Text style={styles.noteSaveButtonText}>Save note</Text>
                  </TouchableOpacity>
                </View>
              )}

              {showManageActions && selectedItem && isCellarEligible(selectedItem) ? (
                <View style={styles.inventoryCellarCard}>
                  <View style={styles.inventoryCellarHeader}>
                    <View>
                      <Text style={styles.inventoryCellarEyebrow}>
                        {hasCellarMode ? 'PRO Collector Layer' : 'PRO Upgrade'}
                      </Text>
                      <Text style={styles.inventoryCellarTitle}>Cellar Mode</Text>
                    </View>
                    <View style={styles.inventoryCellarBadge}>
                      <Text style={styles.inventoryCellarBadgeText}>
                        {hasCellarMode ? 'Bottle Eligible' : 'Bottle Tracking'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.inventoryCellarBody}>
                    {hasCellarMode
                      ? selectedItem.cellar_notes ||
                        (hasCellarRecord(selectedItem)
                          ? 'This bottle is already tracked in The Cellar. Open The Cellar from the Inventory header any time to revisit it.'
                          : 'Track purchase price, opening window, and collector notes once this bottle becomes more than everyday inventory.')
                      : 'This bottle can be tracked in Cellar Mode with valuation, drinking window, and collector notes once you unlock PRO.'}
                  </Text>

                  {hasCellarMode ? (
                    <>
                      <View style={styles.inventoryCellarSummaryRow}>
                        <View style={styles.inventoryCellarSummaryPill}>
                          <Text style={styles.inventoryCellarSummaryLabel}>Value</Text>
                          <Text style={styles.inventoryCellarSummaryValue}>
                            {selectedItem.valuation_estimate
                              ? `$${Math.round(selectedItem.valuation_estimate)}`
                              : 'Open'}
                          </Text>
                        </View>
                        <View style={styles.inventoryCellarSummaryPill}>
                          <Text style={styles.inventoryCellarSummaryLabel}>Window</Text>
                          <Text style={styles.inventoryCellarSummaryValue}>
                            {selectedItem.drinking_window_end || 'Not tracked'}
                          </Text>
                        </View>
                      </View>

                      {hasCellarRecord(selectedItem) ? (
                        <TouchableOpacity
                          style={styles.inventoryCellarButton}
                          onPress={withHaptic(
                            () =>
                              nav.navigate('CellarBottleDetail', {
                                inventoryItemId: selectedItem.id,
                              }),
                            'selection',
                          )}
                        >
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={18}
                            color={colors.accent}
                          />
                          <Text style={styles.inventoryCellarButtonText}>View in Cellar</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.inventoryCellarButton}
                          onPress={withHaptic(handleOpenCellarIntake, 'selection')}
                        >
                          <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
                          <Text style={styles.inventoryCellarButtonText}>Track in Cellar</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.inventoryCellarButton}
                      onPress={withHaptic(() => cellarModeGate('T11'), 'selection')}
                    >
                      <Ionicons name="diamond-outline" size={18} color={colors.accent} />
                      <Text style={styles.inventoryCellarButtonText}>Unlock Cellar Mode</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              {/* "Add to Shopping List" was removed from here (2026-07-27):
                  it wrote to ShoppingListStore under a hardcoded 'default'
                  userId, and no screen anywhere in the app reads that store
                  back — the cart icon in this screen's header opens a
                  feedback-interest prompt, not a real list. It always showed
                  a false-positive success alert for an item the user could
                  never actually see again. Re-add once there's a real place
                  to view a saved shopping list. */}
              {showManageActions && (
                <View style={styles.optionsContainer}>
                  <TouchableOpacity
                    style={[styles.optionButton, styles.deleteOptionButton]}
                    onPress={withHaptic(handleDeleteItem)}
                  >
                    <View style={[styles.optionIconContainer, styles.deleteIconContainer]}>
                      <Ionicons name="trash" size={28} color={colors.error || '#ff4444'} />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Heading level={3} style={[styles.optionTitle, styles.deleteOptionTitle]}>
                        Remove from Bar
                      </Heading>
                      <Text style={styles.optionDescription}>Delete this ingredient</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={withHaptic(() => setShowItemOptionsModal(false), 'selection')}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Cellar Intake Modal */}
      <Modal
        visible={showCellarIntakeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCellarIntakeModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.manualModalContent]}>
              <View style={[styles.modalHeader, styles.manualModalHeader]}>
                <Text style={styles.modalTitle}>Track in Cellar</Text>
                <View style={styles.manualHeaderActions}>
                  <TouchableOpacity
                    style={styles.headerActionGhost}
                    onPress={() => setShowCellarIntakeModal(false)}
                  >
                    <Text style={styles.headerActionGhostText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.headerActionPrimary, savingCellarIntake && { opacity: 0.5 }]}
                    onPress={handleSaveCellarIntake}
                    disabled={savingCellarIntake}
                  >
                    <Text style={styles.headerActionPrimaryText}>
                      {savingCellarIntake ? 'Saving…' : 'Track'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                style={styles.modalForm}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.manualModalFormContent}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.modalEyebrow}>Collector Record</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedItem?.name}
                  {selectedItem?.brand ? ` · ${selectedItem.brand}` : ''}
                </Text>

                {/* Quantity */}
                <View style={styles.formSectionCard}>
                  <Text style={styles.sectionTitleCompact}>Bottle Level</Text>
                  <View style={styles.cellarQuantityRow}>
                    {(['full', 'half', 'low', 'empty'] as const).map((q) => (
                      <TouchableOpacity
                        key={q}
                        style={[
                          styles.cellarQuantityChip,
                          cellarIntakeQuantity === q && styles.cellarQuantityChipActive,
                        ]}
                        onPress={() => setCellarIntakeQuantity(q)}
                      >
                        <Text
                          style={[
                            styles.cellarQuantityChipText,
                            cellarIntakeQuantity === q && styles.cellarQuantityChipTextActive,
                          ]}
                        >
                          {q.charAt(0).toUpperCase() + q.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Purchase Price */}
                <View style={styles.formSectionCard}>
                  <Text style={styles.sectionTitleCompact}>Purchase Price</Text>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>What did you pay? (optional)</Text>
                    <TextInput
                      style={styles.formInput}
                      value={cellarIntakePrice}
                      onChangeText={setCellarIntakePrice}
                      placeholder="e.g. 65"
                      placeholderTextColor={colors.subtext}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* Current Estimate */}
                <View style={styles.formSectionCard}>
                  <Text style={styles.sectionTitleCompact}>Current Estimated Value</Text>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>What is it worth now? (optional)</Text>
                    <TextInput
                      style={styles.formInput}
                      value={cellarIntakeValuation}
                      onChangeText={setCellarIntakeValuation}
                      placeholder="e.g. 120"
                      placeholderTextColor={colors.subtext}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* Drinking Window */}
                <View style={styles.formSectionCard}>
                  <Text style={styles.sectionTitleCompact}>Drinking Window</Text>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Best enjoyed from</Text>
                    <TextInput
                      style={styles.formInput}
                      value={cellarIntakeWindowStart}
                      onChangeText={setCellarIntakeWindowStart}
                      placeholder="e.g. Now or 2026"
                      placeholderTextColor={colors.subtext}
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Drink by</Text>
                    <TextInput
                      style={styles.formInput}
                      value={cellarIntakeWindowEnd}
                      onChangeText={setCellarIntakeWindowEnd}
                      placeholder="e.g. 2030"
                      placeholderTextColor={colors.subtext}
                    />
                  </View>
                </View>

                {/* Notes */}
                <View style={styles.formSectionCard}>
                  <Text style={styles.sectionTitleCompact}>Notes</Text>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Initial thoughts or provenance</Text>
                    <TextInput
                      style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                      value={cellarIntakeNotes}
                      onChangeText={setCellarIntakeNotes}
                      placeholder="e.g. Birthday gift, single barrel, cask #42…"
                      placeholderTextColor={colors.subtext}
                      multiline
                    />
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* The old in-screen "Search Your Shelf" modal (shelf-only search,
          with a separate CTA to jump to the full-catalog BottleSearch
          screen) was retired 2026-07-27 — the header search icon above now
          navigates straight to BottleSearch, which merges shelf + full
          catalog into one result list instead of requiring two screens. */}

      <FeedbackPromptModal
        featureKey="shopping_cart"
        title="Shopping cart feedback"
        body="Would you use a smart cart that adds missing ingredients from recipes and helps plan your next bottle run?"
        visible={cartFeedbackVisible}
        onDismiss={() => setCartFeedbackVisible(false)}
      />

      {/* Log price modal — Saved tab */}
      <Modal
        visible={!!logPriceItem}
        transparent
        animationType="fade"
        onRequestClose={() => setLogPriceItem(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.pricePromptOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => setLogPriceItem(null)}
            />
            <View style={styles.pricePromptCard}>
              <Text style={styles.pricePromptTitle}>Log a price</Text>
              <Text style={styles.pricePromptSubtitle}>{logPriceItem?.name}</Text>
              <TextInput
                style={styles.pricePromptInput}
                value={logPriceValue}
                onChangeText={setLogPriceValue}
                placeholder="Price (e.g. 34.99)"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                autoFocus
              />
              <TextInput
                style={styles.pricePromptInput}
                value={logPriceLocation}
                onChangeText={setLogPriceLocation}
                placeholder="Store or location (e.g. Total Wine Miami)"
                placeholderTextColor={colors.muted}
              />
              <View style={styles.pricePromptActions}>
                <TouchableOpacity
                  style={styles.pricePromptSkip}
                  onPress={() => setLogPriceItem(null)}
                >
                  <Text style={styles.pricePromptSkipText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pricePromptSave}
                  onPress={() => {
                    if (!logPriceItem) return;
                    const price = parseLocalePrice(logPriceValue);
                    if (!(price > 0) || !logPriceLocation.trim()) {
                      Alert.alert(
                        'Missing info',
                        !(price > 0)
                          ? 'Enter a valid price to save this entry.'
                          : 'Enter a store or location to save this entry.',
                      );
                      return;
                    }
                    // Phase 1.2 fix: was hardcoded 'USD' regardless of locale.
                    addPriceEntry(logPriceItem.bottleId, {
                      price,
                      currency: userCurrency,
                      locationLabel: logPriceLocation.trim(),
                    });
                    logSpottedPrice({
                      bottleId: logPriceItem.bottleId,
                      price,
                      currency: userCurrency,
                      locationLabel: logPriceLocation.trim(),
                      capturePoint: 'home_bar',
                      userId: user?.id,
                    });
                    setLogPriceItem(null);
                  }}
                >
                  <Text style={styles.pricePromptSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  initialLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSearchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  inventorySwitcherOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8,6,5,0.12)',
    alignItems: 'center',
  },
  inventorySwitcherMenu: {
    position: 'absolute',
    top: spacing(11),
    width: '78%',
    maxWidth: 340,
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(1.25),
    gap: spacing(0.75),
    zIndex: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  barDropdownSubtitle: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: spacing(0.25),
    paddingHorizontal: spacing(0.5),
  },
  barDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1),
    backgroundColor: colors.bg,
  },
  barDropdownItemTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  barDropdownItemMeta: {
    color: colors.subtext,
    fontSize: 11,
    marginTop: 1,
  },
  barDropdownAdd: {
    marginTop: spacing(0.25),
  },
  featureCardsScroll: {
    marginTop: spacing(2),
  },
  featureCardsContent: {
    paddingHorizontal: spacing(3),
    gap: spacing(1.5),
    paddingBottom: spacing(0.5),
  },
  featureCard: {
    width: 144,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.14)',
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(1.75),
    alignItems: 'center',
    gap: spacing(0.5),
  },
  featureCardLast: {
    marginRight: 0,
  },
  featureCardIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: `${colors.accent}12`,
    borderWidth: 1,
    borderColor: `${colors.accent}28`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(0.75),
  },
  featureCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 16,
  },
  featureCardSubtitle: {
    fontSize: 10,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 13,
  },
  categoryFilters: {
    marginTop: spacing(2.5),
    marginBottom: spacing(2),
  },
  categoryFiltersContent: {
    paddingHorizontal: spacing(3),
    paddingRight: spacing(3),
    gap: spacing(1.5),
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  activeCategoryChip: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  activeCategoryChipText: {
    color: colors.bg,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing(12),
  },
  section: {
    marginTop: spacing(3),
    paddingHorizontal: spacing(3),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    marginBottom: spacing(2),
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sectionBodyText: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
    marginBottom: spacing(1.5),
    marginTop: spacing(-1),
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 2,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  makeWithSection: {
    marginTop: spacing(2),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: `${colors.gold}08`,
    borderRadius: radii.lg,
    marginHorizontal: spacing(3),
    borderWidth: 1,
    borderColor: `${colors.gold}20`,
  },
  makeWithSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    marginBottom: spacing(1.5),
    lineHeight: 18,
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: `${colors.accent}10`,
    borderRadius: radii.md,
    padding: spacing(1.5),
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
  },
  comingSoonText: {
    flex: 1,
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  inventoryCard: {
    width: '47.5%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  spiritCard: {
    borderColor: 'rgba(214,138,56,0.22)',
  },
  cardAccentStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.accent,
    zIndex: 2,
    borderTopLeftRadius: radii.lg,
    borderBottomLeftRadius: radii.lg,
  },
  lowStockCard: {
    borderColor: 'rgba(214,138,56,0.4)',
    backgroundColor: 'rgba(214,138,56,0.05)',
  },
  cardImageContainer: {
    width: '100%',
    height: 130,
    backgroundColor: '#17100B',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(214,138,56,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardFavBadge: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardContent: {
    padding: spacing(1.75),
    paddingLeft: spacing(2.25),
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    marginBottom: spacing(0.4),
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 18,
    fontFamily: 'Georgia',
    marginBottom: spacing(0.5),
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.subtext,
    marginBottom: spacing(0.75),
    lineHeight: 15,
  },
  cardPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: spacing(0.5),
  },
  cardPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(214,138,56,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.28)',
  },
  cardPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardNote: {
    fontSize: 10,
    color: colors.muted,
    lineHeight: 14,
    fontStyle: 'italic',
  },
  cardFooter: {
    fontSize: 11,
    color: colors.muted,
  },
  lowStockBadge: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    backgroundColor: colors.gold,
    paddingHorizontal: spacing(1),
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  lowStockText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.bg,
    letterSpacing: 0.5,
  },
  bottomSpacing: {
    height: spacing(4),
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingBottom: spacing(4),
  },
  recipesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing(2.25),
    borderRadius: radii.pill,
    gap: spacing(1),
  },
  recipesButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.goldText,
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing(3),
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(4),
    maxHeight: '80%',
  },
  modalScrollContent: {
    paddingBottom: spacing(2),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalEyebrow: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.gold,
    fontWeight: '700',
    marginBottom: spacing(0.75),
  },
  modalForm: {
    marginBottom: spacing(1.5),
  },
  itemDetailsContainer: {
    gap: spacing(0.6),
    marginBottom: spacing(2),
  },
  inventoryDetailImage: {
    width: '100%',
    height: 188,
    borderRadius: radii.lg,
    marginBottom: spacing(2),
    backgroundColor: colors.bg,
  },
  inventoryDetailImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetail: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
  },
  itemDetailBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.subtext,
  },
  itemStatPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    rowGap: spacing(0.6),
  },
  itemStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  itemStatPillText: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '600',
  },
  itemStatPillDivider: {
    width: 1,
    height: 10,
    backgroundColor: colors.line,
    marginHorizontal: spacing(1.25),
  },
  itemDetailInsight: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
  },
  inventoryBottleBrief: {
    marginBottom: spacing(2),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: `${colors.bg}A5`,
    padding: spacing(1.6),
    gap: spacing(0.85),
  },
  inventoryBottleBriefLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inventoryBottleBriefBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  inventoryBottleFlavorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1.5),
    marginBottom: spacing(0.4),
  },
  inventoryBottleFlavorCell: {
    width: '26%',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  inventoryBottleFlavorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inventoryBottleFlavorChipText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 13,
  },
  inventoryCellarCard: {
    marginBottom: spacing(2),
    borderRadius: radii.lg,
    padding: spacing(1.6),
    borderWidth: 1,
    borderColor: `${colors.accent}28`,
    backgroundColor: `${colors.accent}0D`,
    gap: spacing(1.15),
  },
  inventoryCellarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing(1),
    alignItems: 'flex-start',
  },
  inventoryCellarEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: spacing(0.35),
  },
  inventoryCellarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  inventoryCellarBadge: {
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.55),
    borderRadius: radii.full,
    backgroundColor: `${colors.bg}A8`,
    borderWidth: 1,
    borderColor: `${colors.accent}28`,
  },
  inventoryCellarBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gold,
  },
  inventoryCellarSummaryRow: {
    flexDirection: 'row',
    gap: spacing(0.8),
  },
  inventoryCellarSummaryPill: {
    flex: 1,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: `${colors.bg}90`,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.9),
  },
  inventoryCellarSummaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: spacing(0.25),
  },
  inventoryCellarSummaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  inventoryCellarBody: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.subtext,
  },
  inventoryCellarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.75),
    borderRadius: radii.lg,
    paddingVertical: spacing(1.2),
    borderWidth: 1,
    borderColor: `${colors.accent}35`,
    backgroundColor: `${colors.bg}A8`,
  },
  inventoryCellarButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  inventoryCellarGhostButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    paddingVertical: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: `${colors.bg}90`,
  },
  inventoryCellarGhostButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  manualModalContent: {
    maxHeight: '96%',
    borderTopWidth: 1,
    borderTopColor: `${colors.gold}25`,
    paddingTop: spacing(1.75),
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(2),
  },
  manualModalHeader: {
    marginBottom: spacing(1),
  },
  manualHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  headerActionGhost: {
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
  },
  headerActionGhostText: {
    color: colors.subtext,
    fontSize: 14,
    fontWeight: '700',
  },
  headerActionPrimary: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(1.4),
    paddingVertical: spacing(0.55),
  },
  headerActionPrimaryText: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: '700',
  },
  manualModalFormContent: {
    paddingBottom: spacing(1),
  },
  formSectionCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.35),
    marginBottom: spacing(1),
  },
  formSectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.subtext,
    marginBottom: spacing(1.5),
    fontWeight: '700',
  },
  stepHeaderRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(0.6),
  },
  sectionTitleCompact: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  stepSubtitleCompact: {
    color: colors.subtext,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing(1.25),
  },
  stepCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.75),
  },
  stepCategoryPill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.85),
    minWidth: '30%',
    alignItems: 'center',
  },
  stepCategoryPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  stepCategoryPillText: {
    color: colors.subtext,
    fontSize: 13,
    fontWeight: '700',
  },
  stepCategoryPillTextActive: {
    color: colors.bg,
  },
  formGroup: {
    marginBottom: spacing(1.25),
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.75),
  },
  formInput: {
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.4),
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.line,
  },
  dropdownContainer: {
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    maxHeight: 360,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dropdownOptionSelected: {
    backgroundColor: colors.card,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  dropdownOptionTextSelected: {
    fontWeight: '600',
    color: colors.accent,
  },
  dropdownCustomOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  dropdownCustomOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
  categoryPicker: {
    flexDirection: 'row',
  },
  categoryPickerButton: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.85),
    borderRadius: radii.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: spacing(1),
  },
  categoryPickerButtonActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  categoryPickerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  categoryPickerButtonTextActive: {
    color: colors.bg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  manualModalActions: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing(1.25),
    marginTop: spacing(0.25),
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing(1.85),
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: colors.gold,
  },
  modalButtonSecondary: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.bg,
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    marginBottom: spacing(1.5),
  },
  optionsContainer: {
    gap: spacing(2),
    marginBottom: spacing(3),
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: spacing(2.5),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  activeBarOption: {
    borderColor: colors.gold,
    backgroundColor: `${colors.gold}14`,
  },
  activeBarLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.gold,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.gold + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  optionDescription: {
    fontSize: 13,
    color: colors.subtext,
  },
  cancelButton: {
    padding: spacing(2.5),
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  favoriteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing(2),
  },
  favoriteToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  noteBlock: {
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
    marginBottom: spacing(2),
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing(1),
  },
  noteInput: {
    minHeight: 88,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
    color: colors.text,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: spacing(1.25),
  },
  noteSaveButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  noteSaveButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  deleteOptionButton: {
    borderColor: (colors.error || '#ff4444') + '40',
  },
  deleteIconContainer: {
    backgroundColor: (colors.error || '#ff4444') + '20',
  },
  deleteOptionTitle: {
    color: colors.error || '#ff4444',
  },
  searchModalContent: {
    maxHeight: '80%',
  },
  cellarQuantityRow: {
    flexDirection: 'row',
    gap: spacing(1),
    flexWrap: 'wrap',
    marginTop: spacing(0.75),
  },
  cellarQuantityChip: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  cellarQuantityChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '18',
  },
  cellarQuantityChipText: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '500',
  },
  cellarQuantityChipTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  emptyShelf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(6),
    paddingVertical: spacing(10),
  },
  emptyShelfTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1.5),
    textAlign: 'center',
  },
  emptyShelfBody: {
    fontSize: 15,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing(4),
  },
  emptyShelfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
  },
  emptyShelfButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.bg,
  },
  shelfCapBar: {
    marginHorizontal: spacing(2),
    marginBottom: spacing(1.5),
    gap: spacing(0.75),
  },
  shelfCapTrack: {
    height: 3,
    backgroundColor: colors.line,
    borderRadius: 2,
    overflow: 'hidden',
  },
  shelfCapFill: {
    height: '100%',
    borderRadius: 2,
  },
  shelfCapText: {
    fontSize: 11,
    color: colors.subtext,
  },
  shelfCapCta: {
    color: colors.accent,
  },
  // ── Your Palate ────────────────────────────────────────────────────────────
  palateCard: {
    marginHorizontal: spacing(2),
    marginBottom: spacing(1.5),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  palateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  palateTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.75),
    flex: 1,
  },
  palateTag: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    backgroundColor: colors.accent + '18',
    borderRadius: radii.pill,
  },
  palateTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  palateHint: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: spacing(1),
  },
  palateBars: {
    marginTop: spacing(1.5),
    gap: spacing(1),
  },
  palateBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  palateBarLabel: {
    fontSize: 12,
    color: colors.subtext,
    width: 70,
  },
  palateBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.line,
    borderRadius: 2,
    overflow: 'hidden',
  },
  palateBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  editDoneButton: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  editFieldsContainer: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    gap: spacing(0.5),
  },
  editFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing(1.5),
    marginBottom: spacing(0.5),
  },
  editFieldInput: {
    backgroundColor: colors.surface || colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    fontSize: 15,
    color: colors.text,
  },
  editCategoryRow: {
    flexDirection: 'row',
    gap: spacing(1),
    paddingBottom: spacing(0.5),
  },
  editCategoryChip: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: 'transparent',
  },
  editCategoryChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '20',
  },
  editCategoryChipText: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '500',
  },
  editCategoryChipTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  savedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginTop: spacing(0.75),
  },
  savedLogPriceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  savedBuyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  savedLogPriceText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
  },
  pricePromptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: spacing(4),
  },
  pricePromptCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing(4),
    gap: spacing(2),
  },
  pricePromptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  pricePromptSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: -spacing(1),
  },
  pricePromptInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    fontSize: 15,
    color: colors.text,
  },
  pricePromptActions: {
    flexDirection: 'row',
    gap: spacing(2),
    justifyContent: 'flex-end',
    marginTop: spacing(0.5),
  },
  pricePromptSkip: {
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
  },
  pricePromptSkipText: {
    fontSize: 15,
    color: colors.subtext,
  },
  pricePromptSave: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(4),
  },
  pricePromptSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.bg,
  },
  savedNoPriceText: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: spacing(0.5),
    fontStyle: 'italic',
  },
  savedRemoveButton: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
  },
});
