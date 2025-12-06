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
} from 'react-native';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { LinearGradient } from 'expo-linear-gradient';
import { HomeBar, BarIngredient, HomeBarService } from '../services/homeBarService';
import { ShoppingListStore } from '../services/shoppingListStore';
import EmptyState from '../components/EmptyState';

// Import images from assets
import * as Images from '../../assets/images';

// Category definitions
type InventoryCategory = 'spirits' | 'mixers' | 'garnishes' | 'ingredients' | 'liqueur' | 'bitters' | 'syrup' | 'other';

interface InventoryItem extends BarIngredient {
  percentFull?: number;
  usedInCocktails?: number;
}

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

// Mock data for demonstration
const mockHomeBar: HomeBar = {
  id: 'default',
  userId: 'user1',
  name: 'My Home Bar',
  description: 'Personal cocktail ingredients',
  ingredients: [
    {
      id: '1',
      name: 'Vodka',
      category: 'spirit',
      subcategory: 'vodka',
      brand: 'Tito\'s',
      abv: 40,
      volume: 750,
      addedAt: new Date(),
      isFavorite: true,
      tags: ['premium', 'neutral'],
      imageUrl: 'https://cdn.shopify.com/s/files/1/0012/4021/1900/products/titos-handmade-vodka-750ml_1024x1024.jpg?v=1574708617',
    },
    {
      id: '2',
      name: 'Gin',
      category: 'spirit',
      subcategory: 'gin',
      brand: 'Hendrick\'s',
      abv: 44,
      volume: 700,
      addedAt: new Date(),
      isFavorite: true,
      tags: ['premium', 'juniper'],
      imageUrl: 'https://cdn.shopify.com/s/files/1/0012/4021/1900/products/hendricks-gin-750ml_1024x1024.jpg?v=1574708617',
    },
    {
      id: '3',
      name: 'Whiskey (Bourbon)',
      category: 'spirit',
      subcategory: 'whiskey',
      brand: 'Buffalo Trace',
      abv: 45,
      volume: 750,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['bourbon', 'american'],
      imageUrl: 'https://cdn.shopify.com/s/files/1/0012/4021/1900/products/buffalo-trace-bourbon-750ml_1024x1024.jpg?v=1574708617',
    },
    {
      id: '4',
      name: 'Tequila',
      category: 'spirit',
      subcategory: 'tequila',
      brand: 'Espolòn',
      abv: 40,
      volume: 750,
      addedAt: new Date(),
      isFavorite: true,
      tags: ['blanco', 'agave'],
    },
    {
      id: '5',
      name: 'Orange Liqueur',
      category: 'liqueur',
      subcategory: 'orange liqueur',
      brand: 'Cointreau',
      abv: 40,
      volume: 700,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['orange', 'triple sec'],
    },
    {
      id: '6',
      name: 'Rum',
      category: 'spirit',
      subcategory: 'rum',
      brand: 'Mount Gay',
      abv: 40,
      volume: 750,
      addedAt: new Date(),
      isFavorite: true,
      tags: ['golden', 'barbados'],
    },
    {
      id: '7',
      name: 'Lime Juice',
      category: 'mixer',
      subcategory: 'citrus',
      volume: 750,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['fresh', 'citrus'],
    },
    {
      id: '8',
      name: 'Lemon Juice',
      category: 'mixer',
      subcategory: 'citrus',
      volume: 750,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['fresh', 'citrus'],
    },
    {
      id: '9',
      name: 'Orange Juice',
      category: 'mixer',
      subcategory: 'citrus',
      volume: 1000,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['fresh', 'citrus'],
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  isDefault: true,
};

export default function HomeBarScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<InventoryCategory | 'all'>('all');
  const [homeBar, setHomeBar] = useState<HomeBar>(mockHomeBar);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [manualEntryName, setManualEntryName] = useState('');
  const [manualEntryCategory, setManualEntryCategory] = useState<BarIngredient['category']>('spirit');
  const [manualEntryBrand, setManualEntryBrand] = useState('');
  const [manualEntryVolume, setManualEntryVolume] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

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
      console.error('Error loading stored ingredients:', error);
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

    // Separate into categories (mock percentFull for now)
    const itemsWithStats = filtered.map(item => ({
      ...item,
      percentFull: Math.floor(Math.random() * 60) + 40, // Random 40-100%
      usedInCocktails: Math.floor(Math.random() * 12) + 1, // Random 1-12
    }));

    const lowStock = itemsWithStats.filter(item => (item.percentFull || 100) <= 40);
    const rest = itemsWithStats.filter(item => (item.percentFull || 100) > 40);

    return { lowStock, rest, all: itemsWithStats };
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
    Alert.alert(
      'Add Ingredient',
      'Choose how to add an ingredient to your bar',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Scan with Camera', onPress: () => nav.navigate('SpiritRecognition') },
        { text: 'Manual Entry', onPress: () => setShowManualEntryModal(true) },
      ]
    );
  };

  const handleSaveManualEntry = async () => {
    if (!manualEntryName.trim()) {
      Alert.alert('Missing Information', 'Please enter an ingredient name');
      return;
    }

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
  };

  const handleCancelManualEntry = () => {
    setManualEntryName('');
    setManualEntryCategory('spirit');
    setManualEntryBrand('');
    setManualEntryVolume('');
    setShowCustomInput(false);
    setShowManualEntryModal(false);
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

  const renderInventoryCard = (item: InventoryItem) => {
    const isLowStock = (item.percentFull || 100) <= 40;
    const ingredientImage = getIngredientImage(item);

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.inventoryCard, isLowStock && styles.lowStockCard]}
        onPress={() => Alert.alert(
          item.name,
          `${item.brand || 'No brand'}\n${item.percentFull}% full • Used in ${item.usedInCocktails} cocktails\n\nVolume: ${item.volume}ml`
        )}
      >
        <View style={styles.cardImageContainer}>
          {ingredientImage ? (
            <Image source={ingredientImage} style={styles.cardImage} resizeMode="contain" />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons
                name={
                  item.category === 'spirit' ? 'wine' :
                  item.category === 'mixer' ? 'water' :
                  item.category === 'liqueur' ? 'wine-outline' :
                  item.category === 'ingredient' ? 'nutrition' :
                  item.category === 'garnish' ? 'leaf' :
                  item.category === 'bitters' ? 'flask' :
                  item.category === 'syrup' ? 'water-outline' :
                  'cube'
                }
                size={40}
                color={colors.gold}
              />
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.cardSubtitle}>
            {item.volume}ml • {item.percentFull}% Full
          </Text>
          <Text style={styles.cardFooter}>
            Used in {item.usedInCocktails} cocktails
          </Text>
        </View>

        {isLowStock && (
          <View style={styles.lowStockBadge}>
            <Text style={styles.lowStockText}>Low Stock</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <LinearGradient
        colors={['#1a1a1a', colors.bg]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Bar Inventory</Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => nav.navigate('SpiritRecognition')} style={styles.headerButton}>
              <Ionicons name="camera" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddIngredient} style={styles.headerButton}>
              <Ionicons name="add" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.headerSubtitle}>
          Everything you have in stock — updated automatically when you shop or batch.
        </Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            keyboardAppearance="dark"
          />
        </View>

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
      </LinearGradient>

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

      {/* Manual Entry Modal */}
      <Modal
        visible={showManualEntryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelManualEntry}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Ingredient</Text>
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
                    placeholder="e.g., Tito's Vodka"
                    placeholderTextColor={colors.muted}
                    value={manualEntryName}
                    onChangeText={setManualEntryName}
                    keyboardAppearance="dark"
                    autoFocus={showCustomInput}
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
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(2),
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    marginBottom: spacing(3),
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    marginBottom: spacing(2),
  },
  searchIcon: {
    marginRight: spacing(2),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  categoryFilters: {
    marginTop: spacing(1),
    marginBottom: spacing(1),
  },
  categoryFiltersContent: {
    paddingRight: spacing(3),
    gap: spacing(2),
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
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
    fontSize: 14,
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
    backgroundColor: '#2a2a2a',
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
});
