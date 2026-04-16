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
  Image,
  TextInput,
  Alert,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing, radii, fonts, serif } from '../theme/tokens';
import { Heading, MainPageHeader } from '../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { HomeBar, BarIngredient, HomeBarService } from '../services/homeBarService';
import { InventoryService } from '../services/inventoryService';
import { challengeProgressService } from '../services/challengeProgressService';
import { ShoppingListStore } from '../services/shoppingListStore';
import EmptyState from '../components/EmptyState';
import { log } from '../lib/logger';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useUserTier } from '../store/useUserTier';
import { TIER_LIMITS } from '../config/tierAccess';
import { useScrollHaptic, withHaptic } from '../lib/haptics';
import { SPIRITS_DATABASE } from '../data/spiritsDatabase';
import { BottleServeService } from '../services/bottleServeService';
import { CellarService } from '../services/cellarService';
import { notificationService } from '../services/notificationService';
import { FeedbackPromptModal } from '../components/FeedbackPromptModal';

// Import images from assets
import * as Images from '../../assets/images';

// Category definitions
type InventoryCategory = 'spirits' | 'mixers' | 'garnishes' | 'ingredients' | 'liqueur' | 'bitters' | 'syrup' | 'other';

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
    item.cellar_notes
  );
}


// Shelf is populated only from Supabase inventory (scan-only) — no mock data.
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
  const { tier } = useUserTier();
  const { gateWithTrigger: upgradeGate } = useFeatureAccess('inventory_unlimited');
  const { gateWithTrigger: hostingBasicGate } = useFeatureAccess('hosting_basic');
  const { gateWithTrigger: optimizeMyBarGate } = useFeatureAccess('optimize_my_bar');
  const { hasAccess: hasCellarMode, gateWithTrigger: cellarModeGate } = useFeatureAccess('cellar_mode');
  const { gate: expiryAlertsGate } = useFeatureAccess('expiry_alerts');
  const { gate: barHealthGate } = useFeatureAccess('bar_health_score');
  const { user } = useAuth();

  // Defined after gate hooks so closures capture the latest gate functions.
  // Using a flat array + FlatList (not nested ScrollView) avoids gesture conflicts.
  const FEATURE_CARDS = useMemo(() => [
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
      onPress: () => expiryAlertsGate(() => nav.navigate('InventoryInsights', { mode: 'expiry' })),
    },
    {
      key: 'health',
      title: 'Bar Health',
      subtitle: 'Coverage score',
      icon: 'analytics-outline' as const,
      onPress: () => barHealthGate(() => nav.navigate('InventoryInsights', { mode: 'health' })),
    },
  ], [hostingBasicGate, optimizeMyBarGate, expiryAlertsGate, barHealthGate, nav]);
  const [cartFeedbackVisible, setCartFeedbackVisible] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchModalQuery, setSearchModalQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<InventoryCategory | 'all'>('all');
  const [homeBar, setHomeBar] = useState<HomeBar>({ ...mockHomeBar, ingredients: [] });
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemNoteDraft, setItemNoteDraft] = useState('');
  const [showItemOptionsModal, setShowItemOptionsModal] = useState(false);
  const [showInventorySwitcher, setShowInventorySwitcher] = useState(false);
  const [showCellarIntakeModal, setShowCellarIntakeModal] = useState(false);
  const [cellarIntakePrice, setCellarIntakePrice] = useState('');
  const [cellarIntakeValuation, setCellarIntakeValuation] = useState('');
  const [cellarIntakeWindowStart, setCellarIntakeWindowStart] = useState('');
  const [cellarIntakeWindowEnd, setCellarIntakeWindowEnd] = useState('');
  const [cellarIntakeNotes, setCellarIntakeNotes] = useState('');
  const [cellarIntakeQuantity, setCellarIntakeQuantity] = useState<'full' | 'half' | 'low' | 'empty'>('full');
  const [savingCellarIntake, setSavingCellarIntake] = useState(false);
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
      loadStoredIngredients().finally(() => { isLoadingRef.current = false; });
    }, [])
  );

  const loadStoredIngredients = async () => {
    try {
      if (!user) return;

      const remoteItems = await InventoryService.getUserInventory(user.id);
      const mappedRemote: InventoryItem[] = remoteItems.map((item) => {
        const rawName = String(item.item_name || '').trim();
        let parsedName = rawName;
        let parsedBrand = item.brand || undefined;
        const rawSubcategory = item.subcategory || undefined;
        const validCategories: BarIngredient['category'][] = ['spirit', 'liqueur', 'mixer', 'bitters', 'syrup', 'garnish', 'ingredient', 'other'];
        const rawCategory = String(item.category || '').toLowerCase();
        const inferredCategory = validCategories.includes(rawCategory as BarIngredient['category'])
          ? (rawCategory as BarIngredient['category'])
          : (item.item_type === 'spirit' ? 'spirit' : 'ingredient');

        if (!parsedBrand && rawName.includes(' - ')) {
          const [maybeBrand, ...rest] = rawName.split(' - ');
          const remainingName = rest.join(' - ').trim();
          if (maybeBrand?.trim() && remainingName) {
            parsedBrand = maybeBrand.trim();
            parsedName = remainingName;
          }
        }

        if (!parsedBrand && rawSubcategory) {
          const withoutSubcategory = rawName.replace(new RegExp(`\\b${rawSubcategory}\\b`, 'i'), '').trim();
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
      const seen = new Set(combined.map((i) => `${i.name.toLowerCase()}|${(i.category || '').toLowerCase()}`));

      for (const item of storedIngredients) {
        const key = `${item.name.toLowerCase()}|${(item.category || '').toLowerCase()}`;
        if (!seen.has(key)) {
          combined.push(item);
          seen.add(key);
        }
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

  const categories: Array<{ key: InventoryCategory | 'all'; label: string; icon: any }> = [
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
        filtered = filtered.filter(item => item.category === 'spirit');
      } else if (activeCategory === 'liqueur') {
        filtered = filtered.filter(item => item.category === 'liqueur');
      } else if (activeCategory === 'mixers') {
        filtered = filtered.filter(item => item.category === 'mixer');
      } else if (activeCategory === 'garnishes') {
        filtered = filtered.filter(item => item.category === 'garnish');
      } else if (activeCategory === 'ingredients') {
        filtered = filtered.filter(item => item.category === 'ingredient');
      } else {
        filtered = filtered.filter(item => item.category === activeCategory);
      }
    }

    // Filter by search
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // FREE tier visibility cap mirrors the hard add limit, applied after filters.
    if (tier === 'FREE') {
      filtered = filtered.slice(0, TIER_LIMITS.FREE.maxBottles);
    }

    return { all: filtered };
  };

  const { all } = getFilteredInventory();

  const categoryDisplayMap: Record<string, string> = {
    spirit: 'Spirit',
    mixer: 'Mixer',
    garnish: 'Garnish',
    ingredient: 'Ingredient',
    liqueur: 'Liqueur',
    bitters: 'Bitters',
    syrup: 'Syrup',
    other: 'Other',
  };
  const categoryPlaceholderMap: Record<string, string> = {
    spirit: 'e.g., Vodka',
    liqueur: 'e.g., Cointreau',
    mixer: 'e.g., Tonic Water',
    bitters: 'e.g., Angostura Bitters',
    syrup: 'e.g., Simple Syrup',
    garnish: 'e.g., Lemon',
    ingredient: 'e.g., Cinnamon',
    other: 'e.g., House Blend',
  };
  const brandPlaceholderMap: Record<string, string> = {
    spirit: 'e.g., Tito\'s',
    liqueur: 'e.g., Cointreau',
    mixer: 'e.g., Fever-Tree',
    bitters: 'e.g., Angostura',
    syrup: 'e.g., Monin',
    garnish: 'e.g., Local Market',
    ingredient: 'e.g., Organic Valley',
    other: 'e.g., House Brand',
  };

  const normalizeSearchValue = (value: string | string[] | undefined) => {
    if (!value) return '';
    if (Array.isArray(value)) return value.join(' ').toLowerCase();
    return value.toLowerCase();
  };

  const searchResults = useMemo(() => {
    const query = searchModalQuery.trim().toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    if (!query) return [];

    const scored = homeBar.ingredients
      .map((item) => {
        const name = normalizeSearchValue(item.name);
        const brand = normalizeSearchValue(item.brand);
        const category = normalizeSearchValue(categoryDisplayMap[item.category] || item.category);
        const subcategory = normalizeSearchValue(item.subcategory);
        const tags = normalizeSearchValue(item.tags);
        const searchable = `${name} ${brand} ${category} ${subcategory} ${tags}`;
        const matchesAll = terms.every((term) => searchable.includes(term));

        if (!matchesAll) return null;

        let score = 0;
        if (name === query) score += 120;
        else if (name.startsWith(query)) score += 90;
        else if (name.includes(query)) score += 70;

        if (brand === query) score += 45;
        else if (brand.startsWith(query)) score += 30;
        else if (brand.includes(query)) score += 20;

        if (category.includes(query)) score += 18;
        if (subcategory.includes(query)) score += 12;
        if (tags.includes(query)) score += 8;
        if (item.category === 'spirit') score += 2;

        return { item, score };
      })
      .filter((entry): entry is { item: InventoryItem; score: number } => !!entry)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item);

    return scored;
  }, [searchModalQuery, homeBar.ingredients]);

  const hasActiveSearch = searchModalQuery.trim().length > 0;

  const popularInventoryItems = useMemo(() => {
    return homeBar.ingredients
      .slice()
      .sort((a, b) => {
        const favDiff = Number(b.isFavorite) - Number(a.isFavorite);
        if (favDiff !== 0) return favDiff;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 12);
  }, [homeBar.ingredients]);

  const visibleSearchResults = useMemo(() => {
    if (hasActiveSearch) return searchResults;
    return popularInventoryItems;
  }, [hasActiveSearch, searchResults, popularInventoryItems]);

  const discoverLikeSuggestions = useMemo(() => {
    const query = searchModalQuery.trim().toLowerCase();
    const pool = Array.from(
      new Set(
        homeBar.ingredients.flatMap((item) =>
          [item.name, item.brand, categoryDisplayMap[item.category], item.subcategory].filter(Boolean) as string[]
        )
      )
    );

    if (query.length > 0) {
      const filtered = pool
        .filter((text) => text.toLowerCase().includes(query))
        .slice(0, 8);
      return filtered.map((text) => ({ text, type: 'search' as const }));
    }

    const recent = searchHistory.slice(0, 4).map((text) => ({ text, type: 'history' as const }));
    const trending = popularInventoryItems
      .slice(0, 4)
      .map((item) => ({ text: item.name, type: 'trending' as const }));
    return [...recent, ...trending];
  }, [searchModalQuery, homeBar.ingredients, searchHistory, popularInventoryItems]);

  const favoriteItems = useMemo(
    () => homeBar.ingredients.filter((item) => item.isFavorite).slice(0, 6),
    [homeBar.ingredients]
  );

  const recordSearchHistory = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    setSearchHistory((prev) => [normalized, ...prev.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 10));
  };

  const openSearchModal = () => {
    setSearchModalQuery('');
    setShowSearchModal(true);
  };

  const closeSearchModal = () => {
    setShowSearchModal(false);
    setSearchModalQuery('');
  };

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
    setItemNoteDraft(item.notes || '');
    setShowItemOptionsModal(true);
  };

  const syncItemMetadata = async (item: InventoryItem, updates: Partial<InventoryItem>) => {
    const nextItem = { ...item, ...updates };

    setHomeBar((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((entry) => entry.id === item.id ? nextItem : entry),
    }));
    setSelectedItem(nextItem);

    const remoteUpdated = user?.id ? await InventoryService.updateInventoryItem(item.id, {
      isFavorite: updates.isFavorite,
      notes: updates.notes,
    }) : false;

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
    Alert.alert('Notes Saved', trimmedNotes ? 'Your bar note was updated.' : 'Your note was cleared.');
  };

  const handleOpenCellarIntake = () => {
    if (!selectedItem) return;
    setCellarIntakePrice(selectedItem.purchase_price != null ? String(selectedItem.purchase_price) : '');
    setCellarIntakeValuation(selectedItem.valuation_estimate != null ? String(selectedItem.valuation_estimate) : '');
    setCellarIntakeWindowStart(selectedItem.drinking_window_start || '');
    setCellarIntakeWindowEnd(selectedItem.drinking_window_end || '');
    setCellarIntakeNotes(selectedItem.cellar_notes || '');
    setCellarIntakeQuantity(((selectedItem as any).quantity as 'full' | 'half' | 'low' | 'empty') || 'full');
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
        type: selectedBottleDetails?.type || selectedItem.subcategory || selectedItem.category || null,
        abv: selectedBottleDetails?.abv || selectedItem.abv || null,
        region: selectedBottleDetails?.region || selectedItem.region || null,
        flavorProfile: selectedBottleDetails?.flavorProfile || selectedItem.flavor_tags || [],
        tastingNotes: selectedBottleDetails?.tastingNotes || selectedItem.tasting_notes || null,
        serveGuidance: selectedBottleDetails?.serveGuidance || selectedItem.serve_guidance || null,
        quantity: cellarIntakeQuantity,
        purchasePrice: parsedPrice,
        valuationEstimate: parsedValuation ?? parsedPrice ?? selectedItem.valuation_estimate ?? null,
        drinkingWindowStart,
        drinkingWindowEnd,
        cellarNotes,
      });
    } catch {
      setSavingCellarIntake(false);
      Alert.alert('Unable to Track', 'We could not create a cellar record for this item right now.');
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
      ingredients: prev.ingredients.map((entry) => entry.id === selectedItem.id ? nextItem : entry),
    }));
    setSelectedItem(nextItem);

    void InventoryService.updateInventoryItem(selectedItem.id, {
      cellarNotes: cellarNotes ?? undefined,
      drinkingWindowStart,
      drinkingWindowEnd,
      valuationEstimate: parsedValuation ?? parsedPrice ?? selectedItem.valuation_estimate ?? undefined,
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

    setHomeBar(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(item => item.id !== selectedItem.id)
    }));

    setShowItemOptionsModal(false);
    setSelectedItem(null);
  };

  const handleAddToShoppingList = async () => {
    if (!selectedItem) return;

    try {
      // Map BarIngredient category to GroceryItem category
      const mapCategory = (barCategory: string): 'spirits_liquors' | 'mixers' | 'garnish' | 'bitters' | 'syrup' | 'other' => {
        switch (barCategory) {
          case 'spirit':
          case 'liqueur':
            return 'spirits_liquors';
          case 'mixer':
            return 'mixers';
          case 'garnish':
            return 'garnish';
          case 'bitters':
            return 'bitters';
          case 'syrup':
            return 'syrup';
          default:
            return 'other';
        }
      };

      // Add to shopping list using the correct method
      await ShoppingListStore.addItemToShoppingList(
        {
          name: selectedItem.name,
          category: mapCategory(selectedItem.category),
          subcategory: selectedItem.subcategory,
          brand: selectedItem.brand,
        },
        'Inventory Restock'
      );

      setShowItemOptionsModal(false);
      setSelectedItem(null);

      Alert.alert('Added to Shopping List', `${selectedItem.name} has been added to your shopping list`);
    } catch (error) {
      log.error('HomeBarScreen', 'Error adding item to shopping list', error);
      Alert.alert('Error', 'Failed to add item to shopping list');
    }
  };

  const getIngredientImage = (item: BarIngredient) => {
    if (item.imageUrl) return { uri: item.imageUrl };

    const haystack = `${item.category || ''} ${item.subcategory || ''} ${item.name || ''} ${item.brand || ''}`.toLowerCase();

    const spiritFamilyMap: Array<{ pattern: RegExp; key: keyof typeof Images.spirits }> = [
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

    const ingredientFamilyMap: Array<{ pattern: RegExp; key: keyof typeof Images.ingredients }> = [
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
      { pattern: /(coffee liqueur|espresso liqueur|kahlua|mr black|espresso)/, key: 'espressoLiquor' },
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
        if (/(juice|lemon|lime|orange|grapefruit|pineapple|passionfruit|berry|strawberry|blueberry|raspberry|blackberry|peach|apple|mango|fruit)/.test(haystack)) {
          return 'nutrition-outline';
        }
        return 'water';
      case 'garnish':
        if (/(lemon|lime|orange|grapefruit|pineapple|passionfruit|berry|strawberry|blueberry|raspberry|blackberry|peach|apple|mango|fruit)/.test(haystack)) {
          return 'nutrition-outline';
        }
        return 'leaf-outline';
      case 'ingredient':
        if (/(egg|egg white)/.test(haystack)) return 'egg-outline';
        if (/(salt|pepper|cinnamon|nutmeg|spice)/.test(haystack)) return 'restaurant-outline';
        if (/(sugar|honey|agave|syrup|grenadine|orgeat)/.test(haystack)) return 'water-outline';
        if (/(lemon|lime|orange|grapefruit|pineapple|passionfruit|berry|strawberry|blueberry|raspberry|blackberry|peach|apple|mango|fruit|juice)/.test(haystack)) {
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
    const haystack = `${item.category || ''} ${item.subcategory || ''} ${item.name || ''}`.toLowerCase();
    return /(vodka|gin|whiskey|whisky|bourbon|scotch|rum|tequila|mezcal|brandy|cognac|liqueur|vermouth|campari|amaro)/.test(haystack);
  };

  const isCellarEligible = (item: InventoryItem) => item.category === 'spirit' || item.category === 'liqueur' || isBottleLike(item);

  const getInventoryInsight = (item: InventoryItem) => {
    if (item.category === 'spirit') {
      return item.abv ? `${item.abv}% ABV bottle for base pours and spirit-forward serves.` : 'Core bottle for builds, stirred drinks, and house pours.';
    }
    if (item.category === 'liqueur') {
      return 'Modifier bottle that adds sweetness, bitterness, or depth to recipes.';
    }
    if (item.category === 'mixer') {
      return /juice|citrus|fruit/i.test(`${item.subcategory || ''} ${item.name}`) ? 'Freshens drinks and supports sours, spritzes, and lengthened builds.' : 'Supports highballs, spritzes, and longer refreshing serves.';
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

  const getInventoryPills = (item: InventoryItem) => {
    const pills: string[] = [getCategoryDisplay(item)];
    if (item.brand) pills.push(item.brand);
    if (item.volume) pills.push(`${item.volume}ml`);
    else if (item.category === 'garnish' || item.category === 'ingredient') pills.push('Fresh item');
    if (item.isFavorite) pills.push('Favorite');
    return pills.slice(0, 3);
  };

  const matchedSpiritProfile = useMemo(() => {
    if (!selectedItem) return null;
    const itemName = selectedItem.name.toLowerCase().trim();
    const itemBrand = (selectedItem.brand || '').toLowerCase().trim();
    return SPIRITS_DATABASE.find((spirit) => {
      const spiritName = spirit.name.toLowerCase();
      const spiritBrand = spirit.brand.toLowerCase();
      return (
        spiritName === itemName ||
        spiritName.includes(itemName) ||
        itemName.includes(spiritName) ||
        (itemBrand && spiritBrand === itemBrand) ||
        spirit.searchTerms.some((term) => itemName.includes(term.toLowerCase()))
      );
    }) || null;
  }, [selectedItem]);

  const selectedBottleDetails = useMemo(() => {
    if (!selectedItem || !isCellarEligible(selectedItem)) return null;
    const flavorProfile = selectedItem.flavor_tags?.length
      ? selectedItem.flavor_tags
      : matchedSpiritProfile?.flavorProfile || [];
    const tastingNotes = selectedItem.tasting_notes || matchedSpiritProfile?.tastingNotes || '';
    const region = selectedItem.region || matchedSpiritProfile?.origin || '';
    const type = selectedItem.subcategory || matchedSpiritProfile?.type || getCategoryDisplay(selectedItem);
    const brand = selectedItem.brand || matchedSpiritProfile?.brand || '';
    const abv = selectedItem.abv || matchedSpiritProfile?.abv || null;
    const serveGuidance = selectedItem.serve_guidance || (matchedSpiritProfile
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
            <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
          ) : ingredientImage ? (
            <Image source={ingredientImage as any} style={styles.cardImage} resizeMode="cover" />
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
            {item.flavor_tags?.length
              ? item.flavor_tags.slice(0, 2).join(' · ')
              : item.tags?.filter(t => t !== 'manual-entry').slice(0, 2).join(' · ') || getCategoryDisplay(item)}
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

  return (
    <SafeAreaView style={styles.container}>
      <MainPageHeader
        title="Your Shelf"
        subtitle={`${all.length} item${all.length !== 1 ? 's' : ''}`}
        onTitlePress={withHaptic(handleInventoryHeaderMenu, 'selection')}
        leftContent={(
          <TouchableOpacity style={styles.headerSearchButton} onPress={withHaptic(openSearchModal, 'selection')}>
            <Ionicons name="search" size={18} color={colors.text} />
          </TouchableOpacity>
        )}
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
                <Text style={styles.barDropdownItemMeta}>Collector showcase, tracked bottles, and portfolio view</Text>
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
        {/* Feature Cards — horizontal FlatList avoids nested-ScrollView gesture conflicts */}
        {all.length > 0 && (
          <FlatList
            horizontal
            data={FEATURE_CARDS}
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            style={styles.featureCardsScroll}
            contentContainerStyle={styles.featureCardsContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.featureCard}
                onPress={withHaptic(item.onPress)}
              >
                <View style={styles.featureCardIconWrap}>
                  <Ionicons name={item.icon} size={26} color={colors.accent} />
                </View>
                <Text style={styles.featureCardTitle}>{item.title}</Text>
                <Text style={styles.featureCardSubtitle}>{item.subtitle}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {/* Category Filters — above inventory list */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilters}
          contentContainerStyle={styles.categoryFiltersContent}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryChip, activeCategory === cat.key && styles.activeCategoryChip]}
              onPress={withHaptic(() => setActiveCategory(cat.key), 'selection')}
            >
              <Ionicons
                name={cat.icon}
                size={16}
                color={activeCategory === cat.key ? colors.bg : colors.text}
              />
              <Text style={[styles.categoryChipText, activeCategory === cat.key && styles.activeCategoryChipText]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Shelf cap indicator — FREE tier only */}
        {tier === 'FREE' && homeBar.ingredients.length > 0 && (
          <TouchableOpacity
            style={styles.shelfCapBar}
            onPress={withHaptic(() => upgradeGate('T1'), 'selection')}
            activeOpacity={0.8}
          >
            <View style={styles.shelfCapTrack}>
              <View style={[styles.shelfCapFill, {
                width: `${Math.min((homeBar.ingredients.length / TIER_LIMITS.FREE.maxBottles) * 100, 100)}%`,
                backgroundColor: homeBar.ingredients.length >= TIER_LIMITS.FREE.maxBottles ? colors.error || '#ff4444' : colors.accent,
              }]} />
            </View>
            <Text style={styles.shelfCapText}>
              {homeBar.ingredients.length} / {TIER_LIMITS.FREE.maxBottles} bottles · <Text style={styles.shelfCapCta}>Upgrade for unlimited</Text>
            </Text>
          </TouchableOpacity>
        )}

        {favoriteItems.length > 0 && activeCategory === 'all' && !searchQuery.trim() && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLine} />
              <Ionicons name="star" size={11} color={colors.gold} />
              <Text style={styles.sectionTitle}>FAVORITES</Text>
              <View style={styles.sectionHeaderLine} />
            </View>
            <Text style={styles.sectionBodyText}>Keep your go-to bottles, mixers, and garnish staples easy to find.</Text>
            <View style={styles.grid}>
              {favoriteItems.map(renderInventoryCard)}
            </View>
          </View>
        )}

        {/* All Items or Filtered Items */}
        {all.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLine} />
              <Text style={styles.sectionTitle}>
                {(activeCategory === 'all' ? 'YOUR SHELF' : (categories.find(c => c.key === activeCategory)?.label || 'ITEMS')).toUpperCase()}
              </Text>
              <View style={styles.sectionHeaderLine} />
            </View>
            <View style={styles.grid}>
              {all.map(renderInventoryCard)}
            </View>
          </View>
        )}

        {all.length === 0 && !searchQuery.trim() && (
          <View style={styles.emptyShelf}>
            <Ionicons name="scan-outline" size={52} color={colors.accent} style={{ marginBottom: 20 }} />
            <Text style={styles.emptyShelfTitle}>Your shelf is empty</Text>
            <Text style={styles.emptyShelfBody}>
              Scan anything to start.{'\n'}A bottle at home, one at the store, something behind the bar.
            </Text>
            <TouchableOpacity
              style={styles.emptyShelfButton}
              onPress={withHaptic(() => (nav as any).navigate('Camera', { screen: 'SmartScan' }))}
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
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalHeader}>
              <Heading level={2} style={styles.modalTitle}>{selectedItem?.name}</Heading>
              <TouchableOpacity onPress={withHaptic(() => setShowItemOptionsModal(false), 'selection')}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedItem?.imageUrl ? (
              <Image source={{ uri: selectedItem.imageUrl }} style={styles.inventoryDetailImage} resizeMode="cover" />
            ) : selectedItem && getIngredientImage(selectedItem) ? (
              <Image source={getIngredientImage(selectedItem) as any} style={styles.inventoryDetailImage} resizeMode="cover" />
            ) : null}

            <View style={styles.itemDetailsContainer}>
              <Text style={styles.itemDetail}>Brand: {selectedBottleDetails?.brand || selectedItem?.brand || 'Unknown'}</Text>
              <Text style={styles.itemDetail}>
                Type: {selectedBottleDetails?.type ? String(selectedBottleDetails.type).replace(/\b\w/g, (letter) => letter.toUpperCase()) : selectedItem ? getCategoryDisplay(selectedItem) : 'Unknown'}
              </Text>
              <Text style={styles.itemDetail}>Volume: {selectedItem?.volume ? `${selectedItem.volume}ml` : 'Not set'}</Text>
              {selectedBottleDetails?.abv && <Text style={styles.itemDetail}>ABV: {selectedBottleDetails.abv}%</Text>}
              {selectedBottleDetails?.region && <Text style={styles.itemDetail}>Region: {selectedBottleDetails.region}</Text>}
              {selectedItem && (
                <Text style={styles.itemDetail}>{getInventoryInsight(selectedItem)}</Text>
              )}
            </View>

            {selectedBottleDetails ? (
              <View style={styles.inventoryBottleBrief}>
                {selectedBottleDetails.flavorProfile.length ? (
                  <>
                    <Text style={styles.inventoryBottleBriefLabel}>Flavor Profile</Text>
                    <View style={styles.inventoryBottleFlavorRow}>
                      {selectedBottleDetails.flavorProfile.slice(0, 6).map((flavor) => (
                        <View key={`${selectedItem?.id}-${flavor}`} style={styles.inventoryBottleFlavorChip}>
                          <Text style={styles.inventoryBottleFlavorChipText}>{flavor}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}

                {selectedBottleDetails.tastingNotes ? (
                  <>
                    <Text style={styles.inventoryBottleBriefLabel}>Tasting Notes</Text>
                    <Text style={styles.inventoryBottleBriefBody}>{selectedBottleDetails.tastingNotes}</Text>
                  </>
                ) : null}

                {selectedBottleDetails.serveGuidance ? (
                  <>
                    <Text style={styles.inventoryBottleBriefLabel}>Serve Guidance</Text>
                    <Text style={styles.inventoryBottleBriefBody}>{selectedBottleDetails.serveGuidance}</Text>
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

            {selectedItem && isCellarEligible(selectedItem) ? (
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
                    ? (selectedItem.cellar_notes || (hasCellarRecord(selectedItem)
                      ? 'This bottle is already tracked in The Cellar. Open The Cellar from the Inventory header any time to revisit it.'
                      : 'Track purchase price, opening window, and collector notes once this bottle becomes more than everyday inventory.'))
                    : 'This bottle can be tracked in Cellar Mode with valuation, drinking window, and collector notes once you unlock PRO.'}
                </Text>

                {hasCellarMode ? (
                  <>
                    <View style={styles.inventoryCellarSummaryRow}>
                      <View style={styles.inventoryCellarSummaryPill}>
                        <Text style={styles.inventoryCellarSummaryLabel}>Value</Text>
                        <Text style={styles.inventoryCellarSummaryValue}>
                          {selectedItem.valuation_estimate ? `$${Math.round(selectedItem.valuation_estimate)}` : 'Open'}
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
                        onPress={withHaptic(() => nav.navigate('CellarBottleDetail', { inventoryItemId: selectedItem.id }), 'selection')}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color={colors.accent} />
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

            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.optionButton}
                onPress={withHaptic(handleAddToShoppingList)}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name="cart" size={28} color={colors.gold} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Heading level={3} style={styles.optionTitle}>Add to Shopping List</Heading>
                  <Text style={styles.optionDescription}>Restock this ingredient</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionButton, styles.deleteOptionButton]}
                onPress={withHaptic(handleDeleteItem)}
              >
                <View style={[styles.optionIconContainer, styles.deleteIconContainer]}>
                  <Ionicons name="trash" size={28} color={colors.error || '#ff4444'} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Heading level={3} style={[styles.optionTitle, styles.deleteOptionTitle]}>Remove from Bar</Heading>
                  <Text style={styles.optionDescription}>Delete this ingredient</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.manualModalContent]}>
              <View style={[styles.modalHeader, styles.manualModalHeader]}>
                <Text style={styles.modalTitle}>Track in Cellar</Text>
                <View style={styles.manualHeaderActions}>
                  <TouchableOpacity style={styles.headerActionGhost} onPress={() => setShowCellarIntakeModal(false)}>
                    <Text style={styles.headerActionGhostText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.headerActionPrimary, savingCellarIntake && { opacity: 0.5 }]}
                    onPress={handleSaveCellarIntake}
                    disabled={savingCellarIntake}
                  >
                    <Text style={styles.headerActionPrimaryText}>{savingCellarIntake ? 'Saving…' : 'Track'}</Text>
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
                  {selectedItem?.name}{selectedItem?.brand ? ` · ${selectedItem.brand}` : ''}
                </Text>

                {/* Quantity */}
                <View style={styles.formSectionCard}>
                  <Text style={styles.sectionTitleCompact}>Bottle Level</Text>
                  <View style={styles.cellarQuantityRow}>
                    {(['full', 'half', 'low', 'empty'] as const).map((q) => (
                      <TouchableOpacity
                        key={q}
                        style={[styles.cellarQuantityChip, cellarIntakeQuantity === q && styles.cellarQuantityChipActive]}
                        onPress={() => setCellarIntakeQuantity(q)}
                      >
                        <Text style={[styles.cellarQuantityChipText, cellarIntakeQuantity === q && styles.cellarQuantityChipTextActive]}>
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
      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent={false}
        onRequestClose={closeSearchModal}
      >
        <SafeAreaView style={styles.searchScreen}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.searchScreen}
          >
            <View style={styles.searchScreenHeader}>
              <Text style={styles.searchScreenTitle}>Search Your Shelf</Text>
              <TouchableOpacity style={styles.searchHeaderCloseButton} onPress={withHaptic(closeSearchModal, 'selection')}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchScreenCard}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color={colors.muted} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, brand, or category..."
                  placeholderTextColor={colors.muted}
                  value={searchModalQuery}
                  onChangeText={setSearchModalQuery}
                  keyboardAppearance="dark"
                  autoFocus={true}
                  returnKeyType="search"
                  onSubmitEditing={() => {
                    recordSearchHistory(searchModalQuery);
                    Keyboard.dismiss();
                  }}
                  blurOnSubmit={false}
                />
                {searchModalQuery.length > 0 && (
                  <TouchableOpacity onPress={withHaptic(() => setSearchModalQuery(''), 'selection')}>
                    <Ionicons name="close-circle" size={20} color={colors.muted} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false}>
                {discoverLikeSuggestions.length > 0 && (
                  <View style={styles.searchSectionWrap}>
                    <Text style={styles.searchSectionTitle}>
                      {hasActiveSearch ? 'Suggestions' : 'Recent & Popular'}
                    </Text>
                    <View style={styles.searchSuggestionList}>
                      {discoverLikeSuggestions.map((suggestion, index) => (
                        <TouchableOpacity
                          key={`${suggestion.text}-${index}`}
                          style={styles.searchSuggestionItem}
                          onPress={withHaptic(() => {
                            setSearchModalQuery(suggestion.text);
                            recordSearchHistory(suggestion.text);
                          }, 'selection')}
                        >
                          <Ionicons
                            name={
                              suggestion.type === 'history'
                                ? 'time'
                                : suggestion.type === 'trending'
                                  ? 'trending-up'
                                  : 'search'
                            }
                            size={16}
                            color={colors.subtext}
                          />
                          <Text style={styles.searchSuggestionText}>{suggestion.text}</Text>
                          {suggestion.type === 'trending' && (
                            <View style={styles.searchTrendingBadge}>
                              <Text style={styles.searchTrendingBadgeText}>Trending</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.searchSectionWrap}>
                  <View style={styles.searchResultsHeader}>
                    <Text style={styles.searchSectionTitle}>
                      {hasActiveSearch ? `Results for "${searchModalQuery}"` : 'Popular & Trending'}
                    </Text>
                    {hasActiveSearch && (
                      <TouchableOpacity onPress={withHaptic(() => setSearchModalQuery(''), 'selection')}>
                        <Text style={styles.searchClearText}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {visibleSearchResults.length > 0 ? (
                    visibleSearchResults.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.searchResultItem}
                        onPress={withHaptic(() => {
                          recordSearchHistory(item.name);
                          handleItemPress(item);
                          closeSearchModal();
                        })}
                      >
                        <View style={styles.searchResultIcon}>
                          <Ionicons
                            name={getCategoryIcon(item.category, item.subcategory, item.name)}
                            size={22}
                            color={colors.gold}
                          />
                        </View>
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName}>{item.name}</Text>
                          <Text style={styles.searchResultDetails}>
                            {(item.volume ? `${item.volume}ml` : categoryDisplayMap[item.category] || item.category)}
                            {item.brand ? ` • ${item.brand}` : ''}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.noResults}>
                      <Ionicons name="search" size={48} color={colors.muted} />
                      <Text style={styles.noResultsText}>No results found</Text>
                      <Text style={styles.noResultsSubtext}>
                        Try searching by name, brand, or category
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <FeedbackPromptModal
        featureKey="shopping_cart"
        title="Shopping cart — coming soon"
        body="We're building a smart cart that lets you add missing ingredients directly from any recipe and order them through the app — no separate store trips needed. Would you use this?"
        visible={cartFeedbackVisible}
        onDismiss={() => setCartFeedbackVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
    marginBottom: spacing(0.5),
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
  itemDetail: {
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
    gap: spacing(0.6),
    marginBottom: spacing(0.4),
  },
  inventoryBottleFlavorChip: {
    paddingHorizontal: spacing(0.9),
    paddingVertical: spacing(0.5),
    borderRadius: radii.full,
    backgroundColor: `${colors.accent}15`,
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
  },
  inventoryBottleFlavorChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
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
  searchScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchScreenHeader: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(1),
    paddingBottom: spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  searchScreenTitle: {
    fontSize: 26,
    color: colors.text,
    fontWeight: '700',
    fontFamily: serif,
    letterSpacing: 0.3,
  },
  searchHeaderCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchScreenCard: {
    marginHorizontal: spacing(3),
    marginTop: spacing(2.5),
    marginBottom: spacing(2),
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: `${colors.gold}26`,
    padding: spacing(2),
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    marginBottom: spacing(1.25),
    borderWidth: 1,
    borderColor: `${colors.gold}2A`,
  },
  searchIcon: {
    marginRight: spacing(1.5),
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing(1),
  },
  searchResults: {
    flex: 1,
  },
  searchSectionWrap: {
    marginBottom: spacing(2),
  },
  searchSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(1.25),
    fontFamily: serif,
  },
  searchSuggestionList: {
    gap: spacing(1),
  },
  searchSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1.5),
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    gap: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchSuggestionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  searchTrendingBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.25),
    borderRadius: radii.sm,
  },
  searchTrendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.bg,
    textTransform: 'uppercase',
  },
  searchResultsHeader: {
    marginBottom: spacing(1),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchResultsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.subtext,
    marginBottom: 0,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchClearText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gold,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing(2),
    borderRadius: radii.md,
    marginBottom: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  searchResultDetails: {
    fontSize: 14,
    color: colors.subtext,
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(8),
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },
  noResultsSubtext: {
    fontSize: 14,
    color: colors.subtext,
  },
  searchHint: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing(1),
    paddingTop: spacing(1.5),
    paddingBottom: spacing(0.5),
  },
  searchHintText: {
    fontSize: 12,
    color: colors.subtext,
    textAlign: 'center',
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
});
