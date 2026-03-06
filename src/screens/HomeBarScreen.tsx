/**
 * Home Bar Screen
 * Clean, card-based design for managing home bar inventory
 */

import React, { useState, useLayoutEffect, useCallback, useMemo } from 'react';
import {
  ScrollView,
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
import { ShoppingListStore } from '../services/shoppingListStore';
import EmptyState from '../components/EmptyState';
import { log } from '../lib/logger';
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';

// Import images from assets
import * as Images from '../../assets/images';

// Category definitions
type InventoryCategory = 'spirits' | 'mixers' | 'garnishes' | 'ingredients' | 'liqueur' | 'bitters' | 'syrup' | 'other';

interface InventoryItem extends BarIngredient { }

// Predefined options for each category
const CATEGORY_OPTIONS: Record<string, string[]> = {
  mixer: [
    'Tonic Water',
    'Soda Water',
    'Ginger Beer',
    'Ginger Ale',
    'Cola',
    'Lemon-Lime Soda',
    'Cranberry Juice',
    'Orange Juice',
    'Pineapple Juice',
    'Tomato Juice',
    'Coconut Cream',
    'Cream',
    'Milk',
  ],
  garnish: [
    'Lemon',
    'Lime',
    'Orange',
    'Cherry',
    'Olives',
    'Mint',
    'Basil',
    'Rosemary',
    'Thyme',
    'Cucumber',
    'Celery',
    'Cocktail Onions',
  ],
  syrup: [
    'Simple Syrup',
    'Grenadine',
    'Honey Syrup',
    'Agave Syrup',
    'Orgeat',
    'Ginger Syrup',
    'Vanilla Syrup',
    'Cinnamon Syrup',
    'Maple Syrup',
  ],
  ingredient: [
    'Sugar',
    'Salt',
    'Black Pepper',
    'Cinnamon',
    'Nutmeg',
    'Vanilla Extract',
    'Coconut Flakes',
    'Coffee',
    'Espresso',
    'Egg Whites',
    'Honey',
    'Hot Sauce',
    'Worcestershire Sauce',
    'Tabasco',
  ],
  bitters: [
    'Angostura Bitters',
    'Orange Bitters',
    'Peychaud\'s Bitters',
    'Chocolate Bitters',
    'Aromatic Bitters',
  ],
}

// Comprehensive mock data showing all ingredient types and categories
const mockHomeBar: HomeBar = {
  id: 'default',
  userId: 'user1',
  name: 'My Home Bar',
  description: 'Personal cocktail ingredients',
  ingredients: [
    // SPIRITS
    {
      id: 'spirit-1',
      name: 'Vodka',
      category: 'spirit',
      subcategory: 'vodka',
      brand: 'Tito\'s',
      abv: 40,
      volume: 750,
      addedAt: new Date(),
      isFavorite: true,
      tags: ['premium', 'neutral'],
    },
    {
      id: 'spirit-2',
      name: 'Gin',
      category: 'spirit',
      subcategory: 'gin',
      brand: 'Hendrick\'s',
      abv: 44,
      volume: 700,
      addedAt: new Date(),
      isFavorite: true,
      tags: ['premium', 'juniper'],
    },
    {
      id: 'spirit-3',
      name: 'Whiskey',
      category: 'spirit',
      subcategory: 'whiskey',
      brand: 'Buffalo Trace',
      abv: 45,
      volume: 750,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['bourbon'],
    },
    {
      id: 'spirit-4',
      name: 'Rum',
      category: 'spirit',
      subcategory: 'rum',
      brand: 'Bacardi',
      abv: 40,
      volume: 750,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['white rum'],
    },
    {
      id: 'spirit-5',
      name: 'Tequila',
      category: 'spirit',
      subcategory: 'tequila',
      brand: 'Espolon',
      abv: 40,
      volume: 750,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['blanco', '100% agave'],
    },
    {
      id: 'spirit-6',
      name: 'Mezcal',
      category: 'spirit',
      subcategory: 'mezcal',
      brand: 'Del Maguey',
      abv: 45,
      volume: 750,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['smoky', 'artisan'],
    },
    {
      id: 'spirit-7',
      name: 'Brandy',
      category: 'spirit',
      subcategory: 'brandy',
      brand: 'E&J',
      abv: 40,
      volume: 750,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['smooth'],
    },

    // LIQUEURS
    {
      id: 'liqueur-1',
      name: 'Cointreau',
      category: 'liqueur',
      subcategory: 'orange liqueur',
      brand: 'Cointreau',
      abv: 40,
      volume: 750,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['triple sec', 'citrus'],
    },
    {
      id: 'liqueur-2',
      name: 'Amaretto',
      category: 'liqueur',
      subcategory: 'amaretto',
      brand: 'Disaronno',
      abv: 28,
      volume: 700,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['almond', 'sweet'],
    },
    {
      id: 'liqueur-3',
      name: 'Kahlua',
      category: 'liqueur',
      subcategory: 'coffee liqueur',
      brand: 'Kahlua',
      abv: 20,
      volume: 750,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['coffee', 'sweet'],
    },
    {
      id: 'liqueur-4',
      name: 'Dry Vermouth',
      category: 'liqueur',
      subcategory: 'vermouth',
      brand: 'Dolin',
      abv: 17,
      volume: 750,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['dry', 'fortified wine'],
    },
    {
      id: 'liqueur-5',
      name: 'Sweet Vermouth',
      category: 'liqueur',
      subcategory: 'vermouth',
      brand: 'Carpano Antica',
      abv: 16,
      volume: 750,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['sweet', 'fortified wine'],
    },
    {
      id: 'liqueur-6',
      name: 'Campari',
      category: 'liqueur',
      subcategory: 'bitter',
      brand: 'Campari',
      abv: 25,
      volume: 750,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['bitter', 'aperitif'],
    },

    // MIXERS
    {
      id: 'mixer-1',
      name: 'Tonic Water',
      category: 'mixer',
      subcategory: 'carbonated',
      brand: 'Fever-Tree',
      volume: 500,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['sparkling'],
    },
    {
      id: 'mixer-2',
      name: 'Club Soda',
      category: 'mixer',
      subcategory: 'carbonated',
      brand: 'Q Mixers',
      volume: 750,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['sparkling'],
    },
    {
      id: 'mixer-3',
      name: 'Ginger Beer',
      category: 'mixer',
      subcategory: 'carbonated',
      brand: 'Fever-Tree',
      volume: 500,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['spicy', 'sparkling'],
    },
    {
      id: 'mixer-4',
      name: 'Orange Juice',
      category: 'mixer',
      subcategory: 'juice',
      brand: 'Fresh Squeezed',
      volume: 500,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['citrus', 'fresh'],
    },
    {
      id: 'mixer-5',
      name: 'Cranberry Juice',
      category: 'mixer',
      subcategory: 'juice',
      brand: 'Ocean Spray',
      volume: 1000,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['tart'],
    },
    {
      id: 'mixer-6',
      name: 'Pineapple Juice',
      category: 'mixer',
      subcategory: 'juice',
      brand: 'Dole',
      volume: 1000,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['tropical', 'sweet'],
    },
    {
      id: 'mixer-7',
      name: 'Coconut Cream',
      category: 'mixer',
      subcategory: 'cream',
      brand: 'Coco Lopez',
      volume: 500,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['tropical', 'rich'],
    },

    // SYRUPS
    {
      id: 'syrup-1',
      name: 'Simple Syrup',
      category: 'syrup',
      subcategory: 'simple',
      volume: 500,
      addedAt: new Date(),
      isFavorite: true,
      tags: ['homemade', 'essential'],
    },
    {
      id: 'syrup-2',
      name: 'Grenadine',
      category: 'syrup',
      subcategory: 'flavored',
      brand: 'Monin',
      volume: 700,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['pomegranate', 'sweet'],
    },
    {
      id: 'syrup-3',
      name: 'Honey Syrup',
      category: 'syrup',
      subcategory: 'honey',
      volume: 350,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['homemade', 'natural'],
    },
    {
      id: 'syrup-4',
      name: 'Orgeat',
      category: 'syrup',
      subcategory: 'almond',
      brand: 'Small Hand Foods',
      volume: 500,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['almond', 'tiki'],
    },

    // BITTERS
    {
      id: 'bitters-1',
      name: 'Angostura Bitters',
      category: 'bitters',
      subcategory: 'aromatic',
      brand: 'Angostura',
      abv: 45,
      volume: 118,
      addedAt: new Date(),
      isFavorite: true,
      tags: ['classic', 'essential'],
    },
    {
      id: 'bitters-2',
      name: 'Orange Bitters',
      category: 'bitters',
      subcategory: 'citrus',
      brand: 'Regans\'',
      abv: 45,
      volume: 148,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['citrus', 'aromatic'],
    },
    {
      id: 'bitters-3',
      name: 'Peychaud\'s Bitters',
      category: 'bitters',
      subcategory: 'aromatic',
      brand: 'Peychaud\'s',
      abv: 35,
      volume: 148,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['anise', 'classic'],
    },

    // GARNISHES
    {
      id: 'garnish-1',
      name: 'Limes',
      category: 'garnish',
      subcategory: 'citrus',
      volume: 500,
      addedAt: new Date(),
      isFavorite: true,
      tags: ['fresh', 'citrus'],
    },
    {
      id: 'garnish-2',
      name: 'Lemons',
      category: 'garnish',
      subcategory: 'citrus',
      volume: 500,
      addedAt: new Date(),
      isFavorite: true,
      tags: ['fresh', 'citrus'],
    },
    {
      id: 'garnish-3',
      name: 'Oranges',
      category: 'garnish',
      subcategory: 'citrus',
      volume: 500,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['fresh', 'citrus'],
    },
    {
      id: 'garnish-4',
      name: 'Mint',
      category: 'garnish',
      subcategory: 'herb',
      volume: 50,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['fresh', 'aromatic'],
    },
    {
      id: 'garnish-5',
      name: 'Luxardo Cherries',
      category: 'garnish',
      subcategory: 'cherry',
      brand: 'Luxardo',
      volume: 400,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['premium', 'maraschino'],
    },
    {
      id: 'garnish-6',
      name: 'Olives',
      category: 'garnish',
      subcategory: 'olive',
      brand: 'Castelvetrano',
      volume: 250,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['green', 'savory'],
    },

    // OTHER
    {
      id: 'other-1',
      name: 'Egg Whites',
      category: 'other',
      subcategory: 'ingredient',
      volume: 200,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['fresh', 'protein'],
    },
    {
      id: 'other-2',
      name: 'Kosher Salt',
      category: 'other',
      subcategory: 'seasoning',
      volume: 500,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['rim', 'essential'],
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  isDefault: true,
};

export default function HomeBarScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { inventoryGate } = usePaywallTriggers();
  const { isKoopePlus, isKoopePro } = useSubscription();
  const { gateWithTrigger: optimizeBarGate } = useFeatureAccess('optimize_my_bar');
  const { gateWithTrigger: hostingBasicGate } = useFeatureAccess('hosting_basic');
  const { gateWithTrigger: predictiveRestockGate } = useFeatureAccess('predictive_restock');
  const { user } = useAuth();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchModalQuery, setSearchModalQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<InventoryCategory | 'all'>('all');
  const [homeBar, setHomeBar] = useState<HomeBar>(mockHomeBar);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [manualEntryName, setManualEntryName] = useState('');
  const [manualEntryCategory, setManualEntryCategory] = useState<BarIngredient['category']>('spirit');
  const [manualEntryBrand, setManualEntryBrand] = useState('');
  const [manualEntryVolume, setManualEntryVolume] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showAddOptionsModal, setShowAddOptionsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showItemOptionsModal, setShowItemOptionsModal] = useState(false);

  useLayoutEffect(() => {
    nav.setOptions({
      headerShown: false,
    });
  }, [nav]);

  // Load stored ingredients when component mounts or when focused
  useFocusEffect(
    useCallback(() => {
      loadStoredIngredients();
    }, [])
  );

  const loadStoredIngredients = async () => {
    try {
      const storedIngredients = await HomeBarService.getStoredIngredients();
      if (storedIngredients.length > 0) {
        // Merge stored ingredients with existing mock data
        setHomeBar(prev => ({
          ...prev,
          ingredients: [...prev.ingredients, ...storedIngredients]
        }));

        // Clear stored ingredients after loading to avoid duplicates
        await HomeBarService.clearStoredIngredients();
      }
    } catch (error) {
      log.error('HomeBarScreen', 'Failed to load stored ingredients', error as Error);
    }
  };

  const categories: Array<{ key: InventoryCategory | 'all'; label: string; icon: any }> = [
    { key: 'all', label: 'All', icon: 'apps' },
    { key: 'spirits', label: 'Spirits', icon: 'wine' },
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

    return { lowStock: [], rest: filtered, all: filtered };
  };

  const { lowStock, rest, all } = getFilteredInventory();

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

  const resetManualEntry = () => {
    setManualEntryName('');
    setManualEntryCategory('spirit');
    setManualEntryBrand('');
    setManualEntryVolume('');
    setShowCustomInput(false);
  };

  const openManualEntryWizard = () => {
    resetManualEntry();
    setShowManualEntryModal(true);
  };

  // Calculate stats
  const spiritCount = homeBar.ingredients.filter(i => i.category === 'spirit').length;
  const mixerCount = homeBar.ingredients.filter(i => i.category === 'mixer').length;
  const totalRecipes = Math.max(12, homeBar.ingredients.length * 2); // Mock calculation

  const handleSeeRecipes = () => {
    nav.navigate('WhatCanIMake');
  };

  const handleAddIngredient = () => {
    openManualEntryWizard();
  };

  const handleSaveManualEntry = async () => {
    if (!manualEntryName.trim()) {
      Alert.alert('Missing Information', 'Please enter an ingredient name');
      return;
    }

    // Check inventory gate before adding
    const currentCount = homeBar.ingredients.length;
    const canProceed = inventoryGate(currentCount, async () => {
      // Paywall passed - proceed with adding ingredient
      const newIngredient: BarIngredient = {
        id: `manual-${Date.now()}`,
        name: manualEntryName.trim(),
        category: manualEntryCategory,
        brand: manualEntryBrand.trim() || undefined,
        volume: manualEntryVolume ? parseInt(manualEntryVolume) : undefined,
        addedAt: new Date(),
        isFavorite: false,
        tags: ['manual-entry'],
      };

      try {
        if (!user) {
          Alert.alert('Sign In Required', 'Please sign in to add items to your inventory');
          return;
        }

        // Add to Supabase
        await InventoryService.addItem({
          userId: user.id,
          itemType: manualEntryCategory === 'spirit' ? 'spirit' : 'ingredient',
          itemName: manualEntryName.trim(),
          category: manualEntryCategory,
          brand: manualEntryBrand.trim() || undefined,
        });

        // Update local state
        setHomeBar(prev => ({
          ...prev,
          ingredients: [...prev.ingredients, newIngredient]
        }));

        // Reset form
        setManualEntryName('');
        setManualEntryCategory('spirit');
        setManualEntryBrand('');
        setManualEntryVolume('');
        setShowCustomInput(false);
        setShowManualEntryModal(false);

        log.info('HomeBarScreen', 'Item added to Supabase inventory');
      } catch (error) {
        log.error('HomeBarScreen', 'Failed to add item', error as Error);
        Alert.alert('Error', 'Failed to add ingredient. Please try again.');
      }
    });

    if (!canProceed) {
      log.info('HomeBarScreen', 'Inventory gate blocked - upgrade required');
    }
  };

  const handleCancelManualEntry = () => {
    resetManualEntry();
    setShowManualEntryModal(false);
  };

  const handleItemPress = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowItemOptionsModal(true);
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
      // T13: soft upsell for predictive restock while still allowing the action.
      predictiveRestockGate('T13');

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
          checked: false,
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

    // Try to get image from assets based on subcategory
    const subcategory = item.subcategory?.toLowerCase();
    if (subcategory && Images.spirits[subcategory as keyof typeof Images.spirits]) {
      return Images.spirits[subcategory as keyof typeof Images.spirits];
    }

    return null;
  };

  const getCategoryIcon = (category: string, subcategory?: string) => {
    switch (category) {
      case 'spirit':
        return 'wine';
      case 'liqueur':
        return 'wine-outline';
      case 'mixer':
        return 'water';
      case 'syrup':
        return 'water-outline';
      case 'bitters':
        return 'flask';
      case 'garnish':
        return 'leaf';
      case 'ingredient':
        return 'nutrition';
      default:
        return 'cube';
    }
  };

  const renderInventoryCard = (item: InventoryItem) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.inventoryCard}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.cardImageContainer}>
          <Ionicons
            name={getCategoryIcon(item.category, item.subcategory)}
            size={40}
            color={colors.gold}
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.cardSubtitle}>
            {item.volume}ml{item.brand ? ` • ${item.brand}` : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <MainPageHeader
        title="Inventory"
        subtitle={`${all.length} item${all.length !== 1 ? 's' : ''}`}
        rightActions={[
          {
            icon: 'search',
            onPress: openSearchModal,
            accessibilityLabel: 'Search inventory',
          },
          {
            icon: 'add',
            onPress: handleAddIngredient,
            accessibilityLabel: 'Add ingredient',
          },
          {
            icon: 'cart-outline',
            onPress: () => nav.navigate('ShoppingCart'),
            accessibilityLabel: 'Open shopping cart',
          },
        ]}
      />

      {/* Category Filters */}
      <View style={styles.filtersWrap}>
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
              onPress={() => setActiveCategory(cat.key)}
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
      </View>

      {/* Inventory Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Inventory Suggestions */}
        {all.length > 0 && (
          <View style={styles.aiInventoryCard}>
            <View style={styles.aiInventoryActionRow}>
              <TouchableOpacity
                style={[styles.aiInventoryActionCard, styles.aiInventoryActionCardHorizontal]}
                onPress={() => optimizeBarGate('T4', () => nav.navigate('BarOptimizer'))}
              >
                <View style={styles.aiInventoryTileIconWrap}>
                  <Ionicons name="bulb-outline" size={28} color={colors.accent} />
                </View>
                <View style={styles.aiInventoryActionText}>
                  <Text style={styles.aiInventoryActionTitle} numberOfLines={2}>What should I buy next?</Text>
                  <Text style={styles.aiInventoryActionSubtitle} numberOfLines={1}>Smart buy list</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.aiInventoryActionCard, styles.aiInventoryActionCardHorizontal]}
                onPress={() => hostingBasicGate('T6', () => nav.navigate('Hosting'))}
              >
                <View style={styles.aiInventoryTileIconWrap}>
                  <Ionicons name="people-outline" size={28} color={colors.accent} />
                </View>
                <View style={styles.aiInventoryActionText}>
                  <Text style={styles.aiInventoryActionTitle} numberOfLines={2}>Hosting</Text>
                  <Text style={styles.aiInventoryActionSubtitle} numberOfLines={1}>Guest menu planner</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Low Stock Section */}
        {lowStock.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={16} color={colors.gold} />
              <Heading level={3} style={styles.sectionTitle}>Low Stock</Heading>
            </View>
            <View style={styles.grid}>
              {lowStock.map(renderInventoryCard)}
            </View>
          </View>
        )}

        {/* All Items or Filtered Items */}
        {rest.length > 0 && (
          <View style={styles.section}>
            <Heading level={3} style={styles.sectionTitle}>
              {activeCategory === 'all' ? 'All Items' : categories.find(c => c.key === activeCategory)?.label || 'Items'}
            </Heading>
            <View style={styles.grid}>
              {rest.map(renderInventoryCard)}
            </View>
          </View>
        )}

        {all.length === 0 && (
          <EmptyState
            icon="glass-cocktail"
            title="No items found"
            message={searchQuery ? 'Try a different search term' : 'Add items to your inventory to get started'}
            actionLabel={searchQuery ? "Clear Search" : "Explore Recipes"}
            onAction={() => {
              if (searchQuery) {
                setSearchQuery('');
              } else {
                (nav as any).navigate('Recipes');
              }
            }}
          />
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.recipesButton} onPress={handleSeeRecipes}>
          <Text style={styles.recipesButtonText}>See What You Can Make →</Text>
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
            <View style={styles.modalHeader}>
              <Heading level={2} style={styles.modalTitle}>{selectedItem?.name}</Heading>
              <TouchableOpacity onPress={() => setShowItemOptionsModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.itemDetailsContainer}>
              <Text style={styles.itemDetail}>Brand: {selectedItem?.brand || 'Unknown'}</Text>
              <Text style={styles.itemDetail}>Volume: {selectedItem?.volume}ml</Text>
              {selectedItem?.abv && <Text style={styles.itemDetail}>ABV: {selectedItem.abv}%</Text>}
            </View>

            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.optionButton}
                onPress={handleAddToShoppingList}
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
                onPress={handleDeleteItem}
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
              onPress={() => setShowItemOptionsModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Options Modal */}
      <Modal
        visible={showAddOptionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Heading level={2} style={styles.modalTitle}>Add Ingredient</Heading>
              <TouchableOpacity onPress={() => setShowAddOptionsModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Choose how to add an ingredient to your bar</Text>

            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  setShowAddOptionsModal(false);
                  nav.navigate('SpiritRecognition');
                }}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name="camera" size={28} color={colors.gold} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Heading level={3} style={styles.optionTitle}>Scan with Camera</Heading>
                  <Text style={styles.optionDescription}>Quickly add by scanning bottle label</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  setShowAddOptionsModal(false);
                  setShowManualEntryModal(true);
                }}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name="create" size={28} color={colors.gold} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Heading level={3} style={styles.optionTitle}>Manual Entry</Heading>
                  <Text style={styles.optionDescription}>Type in ingredient details</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAddOptionsModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual Entry Modal */}
      <Modal
        visible={showManualEntryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelManualEntry}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.manualModalContent]}>
              <View style={[styles.modalHeader, styles.manualModalHeader]}>
                <Text style={styles.modalTitle}>Add Ingredient</Text>
                <View style={styles.manualHeaderActions}>
                  <TouchableOpacity style={styles.headerActionGhost} onPress={handleCancelManualEntry}>
                    <Text style={styles.headerActionGhostText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.headerActionPrimary} onPress={handleSaveManualEntry}>
                    <Text style={styles.headerActionPrimaryText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                style={styles.modalForm}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.manualModalFormContent}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.modalEyebrow}>Manual Entry</Text>
                <Text style={styles.modalSubtitle}>Choose category and details in one step.</Text>

                <View style={styles.formSectionCard}>
                  <View style={styles.stepHeaderRowCompact}>
                    <Text style={styles.sectionTitleCompact}>Type</Text>
                  </View>
                  <Text style={styles.formLabel}>Category *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                    {[
                      { value: 'spirit', label: 'Spirit' },
                      { value: 'liqueur', label: 'Liqueur' },
                      { value: 'mixer', label: 'Mixer' },
                      { value: 'bitters', label: 'Bitters' },
                      { value: 'syrup', label: 'Syrup' },
                      { value: 'garnish', label: 'Garnish' },
                      { value: 'ingredient', label: 'Ingredient' },
                      { value: 'other', label: 'Other' },
                    ].map((cat) => (
                      <TouchableOpacity
                        key={cat.value}
                        style={[
                          styles.categoryPickerButton,
                          manualEntryCategory === cat.value && styles.categoryPickerButtonActive
                        ]}
                        onPress={() => {
                          setManualEntryCategory(cat.value as BarIngredient['category']);
                          setManualEntryName('');
                          setShowCustomInput(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.categoryPickerButtonText,
                            manualEntryCategory === cat.value && styles.categoryPickerButtonTextActive
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.formSectionCard}>
                  <View style={styles.stepHeaderRowCompact}>
                    <Text style={styles.sectionTitleCompact}>Details</Text>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Name *</Text>
                    {CATEGORY_OPTIONS[manualEntryCategory] && !showCustomInput ? (
                      <ScrollView style={styles.dropdownContainer} nestedScrollEnabled>
                        {CATEGORY_OPTIONS[manualEntryCategory].map((option) => (
                          <TouchableOpacity
                            key={option}
                            style={[
                              styles.dropdownOption,
                              manualEntryName === option && styles.dropdownOptionSelected
                            ]}
                            onPress={() => {
                              setManualEntryName(option);
                              setShowCustomInput(false);
                            }}
                          >
                            <Text style={[
                              styles.dropdownOptionText,
                              manualEntryName === option && styles.dropdownOptionTextSelected
                            ]}>
                              {option}
                            </Text>
                            {manualEntryName === option && (
                              <Ionicons name="checkmark" size={20} color={colors.accent} />
                            )}
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          style={styles.dropdownCustomOption}
                          onPress={() => {
                            setManualEntryName('');
                            setShowCustomInput(true);
                          }}
                        >
                          <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
                          <Text style={styles.dropdownCustomOptionText}>Custom / Other</Text>
                        </TouchableOpacity>
                      </ScrollView>
                    ) : (
                      <TextInput
                        style={styles.formInput}
                        placeholder={categoryPlaceholderMap[manualEntryCategory] || 'e.g., Ingredient'}
                        placeholderTextColor={colors.muted}
                        value={manualEntryName}
                        onChangeText={setManualEntryName}
                        keyboardAppearance="dark"
                        autoFocus={showCustomInput}
                        returnKeyType="next"
                        onSubmitEditing={() => Keyboard.dismiss()}
                      />
                    )}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Brand (Optional)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g., Tito's"
                      placeholderTextColor={colors.muted}
                      value={manualEntryBrand}
                      onChangeText={setManualEntryBrand}
                      keyboardAppearance="dark"
                      returnKeyType="next"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Volume (ml, Optional)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g., 750"
                      placeholderTextColor={colors.muted}
                      value={manualEntryVolume}
                      onChangeText={setManualEntryVolume}
                      keyboardType="number-pad"
                      keyboardAppearance="dark"
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
              <Text style={styles.searchScreenTitle}>Search Inventory</Text>
              <TouchableOpacity style={styles.searchHeaderCloseButton} onPress={closeSearchModal}>
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
                  <TouchableOpacity onPress={() => setSearchModalQuery('')}>
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
                          onPress={() => {
                            setSearchModalQuery(suggestion.text);
                            recordSearchHistory(suggestion.text);
                          }}
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
                      <TouchableOpacity onPress={() => setSearchModalQuery('')}>
                        <Text style={styles.searchClearText}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {visibleSearchResults.length > 0 ? (
                    visibleSearchResults.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.searchResultItem}
                        onPress={() => {
                          recordSearchHistory(item.name);
                          handleItemPress(item);
                          closeSearchModal();
                        }}
                      >
                        <View style={styles.searchResultIcon}>
                          <Ionicons
                            name={getCategoryIcon(item.category, item.subcategory)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  filtersWrap: {
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(2),
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  categoryFilters: {
    marginTop: spacing(1),
  },
  categoryFiltersContent: {
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
    gap: spacing(1),
    marginBottom: spacing(2),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
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
    borderColor: colors.line,
  },
  lowStockCard: {
    borderColor: colors.gold + '40',
    backgroundColor: colors.gold + '08',
  },
  cardImageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: spacing(2),
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: spacing(0.5),
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
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },
  lowStockText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.bg,
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing(2.5),
    borderRadius: radii.pill,
  },
  recipesButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
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
  itemDetailsContainer: {
    backgroundColor: colors.bg,
    padding: spacing(2.5),
    borderRadius: radii.lg,
    marginBottom: spacing(3),
    gap: spacing(1),
  },
  itemDetail: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
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
  aiInventoryCard: {
    padding: 0,
    marginHorizontal: spacing(3),
    marginTop: spacing(2),
  },
  aiInventoryActionRow: {
    flexDirection: 'row',
    gap: spacing(1.25),
  },
  aiInventoryActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: spacing(1.4),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  aiInventoryActionCardHorizontal: {
    flex: 1,
    minHeight: 104,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.8),
    paddingVertical: spacing(1.1),
  },
  aiInventoryTileIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.accent}12`,
  },
  aiInventoryActionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  aiInventoryActionText: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiInventoryActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.15),
    textAlign: 'center',
  },
  aiInventoryActionSubtitle: {
    fontSize: 11,
    color: colors.subtext,
    lineHeight: 14,
    textAlign: 'center',
  },
});
