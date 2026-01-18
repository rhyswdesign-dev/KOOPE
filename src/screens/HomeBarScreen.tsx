/**
 * Home Bar Screen
 * Clean, card-based design for managing home bar inventory
 */

import React, { useState, useLayoutEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { HomeBar, BarIngredient, HomeBarService } from '../services/homeBarService';
import { ShoppingListStore } from '../services/shoppingListStore';
import EmptyState from '../components/EmptyState';
import { log } from '../lib/logger';
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';
import { useSubscription } from '../contexts/SubscriptionContext';

// Import images from assets
import * as Images from '../../assets/images';

// Category definitions
type InventoryCategory = 'spirits' | 'mixers' | 'garnishes' | 'ingredients' | 'liqueur' | 'bitters' | 'syrup' | 'other';

interface InventoryItem extends BarIngredient {}

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
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Calculate stats
  const spiritCount = homeBar.ingredients.filter(i => i.category === 'spirit').length;
  const mixerCount = homeBar.ingredients.filter(i => i.category === 'mixer').length;
  const totalRecipes = Math.max(12, homeBar.ingredients.length * 2); // Mock calculation

  const handleSeeRecipes = () => {
    nav.navigate('Recipes');
  };

  const handleAddIngredient = () => {
    setShowAddOptionsModal(true);
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
        await HomeBarService.addIngredient(newIngredient);
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
      } catch (error) {
        Alert.alert('Error', 'Failed to add ingredient. Please try again.');
      }
    });

    if (!canProceed) {
      log.info('HomeBarScreen', 'Inventory gate blocked - upgrade required');
    }
  };

  const handleCancelManualEntry = () => {
    setManualEntryName('');
    setManualEntryCategory('spirit');
    setManualEntryBrand('');
    setManualEntryVolume('');
    setShowCustomInput(false);
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
          <View style={styles.placeholderImage}>
            <Ionicons
              name={getCategoryIcon(item.category, item.subcategory)}
              size={40}
              color={colors.gold}
            />
          </View>
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
    <View style={styles.container}>
      {/* Header - Solid Color like Shopping Cart */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Inventory</Text>

          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setShowSearchModal(true)} style={styles.headerButton}>
              <Ionicons name="search" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => nav.navigate('SpiritRecognition')} style={styles.headerButton}>
              <Ionicons name="camera" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddIngredient} style={styles.headerButton}>
              <Ionicons name="add" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.headerSubtitle}>
          Everything you have in stock
        </Text>

        {/* Category Filters */}
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
        {/* Low Stock Section */}
        {lowStock.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={16} color={colors.gold} />
              <Text style={styles.sectionTitle}>Low Stock</Text>
            </View>
            <View style={styles.grid}>
              {lowStock.map(renderInventoryCard)}
            </View>
          </View>
        )}

        {/* All Items or Filtered Items */}
        {rest.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {activeCategory === 'all' ? 'All Items' : categories.find(c => c.key === activeCategory)?.label || 'Items'}
            </Text>
            <View style={styles.grid}>
              {rest.map(renderInventoryCard)}
            </View>
          </View>
        )}

        {all.length === 0 && (
          <EmptyState
            icon="wine-outline"
            title="No items found"
            message={searchQuery ? 'Try a different search term' : 'Add items to your inventory to get started'}
            actionLabel={searchQuery ? "Clear Search" : "Explore Recipes"}
            onAction={() => {
              if (searchQuery) {
                setSearchQuery('');
              } else {
                nav.navigate('Recipes');
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
              <Text style={styles.modalTitle}>{selectedItem?.name}</Text>
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
                  <Text style={styles.optionTitle}>Add to Shopping List</Text>
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
                  <Text style={[styles.optionTitle, styles.deleteOptionTitle]}>Remove from Bar</Text>
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
              <Text style={styles.modalTitle}>Add Ingredient</Text>
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
                  <Text style={styles.optionTitle}>Scan with Camera</Text>
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
                  <Text style={styles.optionTitle}>Manual Entry</Text>
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
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Ingredient</Text>
                <TouchableOpacity onPress={() => Keyboard.dismiss()}>
                  <Ionicons name="chevron-down" size={24} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCancelManualEntry}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {/* Category Picker - Moved to top */}
              <View style={styles.formGroup}>
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
                        // Clear name when switching categories to avoid confusion
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

              {/* Name Input or Dropdown */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Name *</Text>
                {CATEGORY_OPTIONS[manualEntryCategory] && !showCustomInput ? (
                  // Show dropdown for categories with predefined options
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
                    {/* Custom option at the end */}
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
                  // Show text input for categories without predefined options OR when custom is selected
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g., Vodka"
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

              {/* Brand Input */}
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

              {/* Volume Input - Only for spirits and liqueurs */}
              {(manualEntryCategory === 'spirit' || manualEntryCategory === 'liqueur') && (
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
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={handleCancelManualEntry}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSaveManualEntry}
              >
                <Text style={styles.modalButtonTextPrimary}>Add to Bar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.searchModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Inventory</Text>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color={colors.muted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, brand, or category..."
                placeholderTextColor={colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                keyboardAppearance="dark"
                autoFocus={true}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Results */}
            <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false}>
              {searchQuery.length > 0 ? (
                all.length > 0 ? (
                  <>
                    <Text style={styles.searchResultsTitle}>
                      {all.length} {all.length === 1 ? 'result' : 'results'} found
                    </Text>
                    {all.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.searchResultItem}
                        onPress={() => {
                          handleItemPress(item);
                          setShowSearchModal(false);
                        }}
                      >
                        <View style={styles.searchResultIcon}>
                          <Ionicons
                            name={getCategoryIcon(item.category, item.subcategory)}
                            size={24}
                            color={colors.gold}
                          />
                        </View>
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName}>{item.name}</Text>
                          <Text style={styles.searchResultDetails}>
                            {item.volume}ml{item.brand ? ` • ${item.brand}` : ''}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                      </TouchableOpacity>
                    ))}
                  </>
                ) : (
                  <View style={styles.noResults}>
                    <Ionicons name="search" size={48} color={colors.muted} />
                    <Text style={styles.noResultsText}>No items found</Text>
                    <Text style={styles.noResultsSubtext}>
                      Try a different search term
                    </Text>
                  </View>
                )
              ) : (
                <View style={styles.searchHint}>
                  <Ionicons name="information-circle-outline" size={24} color={colors.muted} />
                  <Text style={styles.searchHintText}>
                    Start typing to search your inventory
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingTop: spacing(6),
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(2),
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(2),
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing(1.5),
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    marginBottom: spacing(2),
    lineHeight: 18,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  inventoryCard: {
    width: '47.5%',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
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
    height: 140,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(2),
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
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
    borderRadius: radii.lg,
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
  modalForm: {
    marginBottom: spacing(3),
  },
  formGroup: {
    marginBottom: spacing(3),
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1),
  },
  formInput: {
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.line,
  },
  dropdownContainer: {
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    maxHeight: 300,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
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
    paddingVertical: spacing(2),
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
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: 999,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: spacing(2),
  },
  categoryPickerButtonActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  categoryPickerButtonText: {
    fontSize: 14,
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
  modalButton: {
    flex: 1,
    paddingVertical: spacing(2.5),
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
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(3),
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
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
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
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.subtext,
    marginBottom: spacing(2),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    paddingVertical: spacing(6),
  },
  searchHintText: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: spacing(2),
    textAlign: 'center',
  },
});
