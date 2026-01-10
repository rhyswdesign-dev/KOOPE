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
import { HomeBar, BarIngredient, HomeBarService } from '../services/homeBarService';
import { ShoppingListStore } from '../services/shoppingListStore';
import EmptyState from '../components/EmptyState';
import { log } from '../lib/logger';

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

// Mock data for demonstration - simplified to just 3 items
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
    },
    {
      id: '3',
      name: 'Simple Syrup',
      category: 'syrup',
      subcategory: 'syrup',
      volume: 500,
      addedAt: new Date(),
      isFavorite: false,
      tags: ['homemade'],
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  isDefault: true,
};

export default function HomeBarScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
    setShowAddOptionsModal(true);
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

  const renderInventoryCard = (item: InventoryItem) => {
    const isLowStock = (item.percentFull || 100) <= 40;
    const ingredientImage = getIngredientImage(item);

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.inventoryCard, isLowStock && styles.lowStockCard]}
        onPress={() => handleItemPress(item)}
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
              <Text style={styles.itemDetail}>{selectedItem?.percentFull}% Full</Text>
              <Text style={styles.itemDetail}>Used in {selectedItem?.usedInCocktails} cocktails</Text>
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
});
