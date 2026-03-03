/**
 * What Can I Make Screen
 * Shows cocktails user can make based on their inventory
 * Allows filtering by selected ingredients
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { Heading } from '../components/ui';
import { InventoryService } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { filterAlmostMakeable, sortByMatch } from '../utils/recipeMatching';
import type { Cocktail } from '../types/supabase';
import type { RecipeMatch } from '../utils/recipeMatching';
import type { UserInventoryItem } from '../types/database';
import type { RootStackParamList } from '../navigation/RootNavigator';
import RecipeCard from '../components/RecipeCard';
import { createRecipeCardProps } from '../utils/recipeActions';
import { useSavedItems } from '../hooks/useSavedItems';
import GroceryListModal from '../components/GroceryListModal';
import { RecipesRepository } from '../repos/supabase';
import { isCocktailAccessible } from '../config/tierAccess';
import { useUserTier } from '../store/useUserTier';
import {
  generateRecipeFromInventory,
  checkRateLimit,
} from '../services/aiRecipeGenerationService';
import { supabase } from '../lib/supabase';
// BartenderAssistant removed in favor of full screen AI Chat

type CocktailWithMatch = Cocktail & { match: RecipeMatch };

const { width } = Dimensions.get('window');
const GUTTER = 12;

export default function WhatCanIMakeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isAuthenticated } = useAuth();
  const { tier } = useUserTier();

  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<UserInventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [cocktails, setCocktails] = useState<CocktailWithMatch[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState('');

  // AI Recipe Generation State
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'intermediate' | 'expert' | null>(null);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);
  const [aiRecipes, setAiRecipes] = useState<CocktailWithMatch[]>([]);

  // Grocery List Modal State
  const [groceryListVisible, setGroceryListVisible] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  // Wrap matchCocktails in useCallback to avoid dependency issues
  const matchCocktails = useCallback(async () => {
    try {
      // Filter inventory to only selected items
      const filteredInventory = inventory.filter(item =>
        selectedItems.has(item.item_name)
      );

      // Load all recipes from RecipesRepository (same as RecipesScreen)
      const recipesData = await RecipesRepository.getInitialRecipes(150);

      if (recipesData) {
        let matched;

        if (tier === 'FREE') {
          // Free users: show all 9 FREE_TIER_COCKTAILS sorted by match percentage
          // This ensures they can always see which classics they're closest to making
          const accessibleRecipes = recipesData.filter(cocktail =>
            isCocktailAccessible(cocktail.id, tier)
          );
          matched = sortByMatch(accessibleRecipes as any[], filteredInventory);
        } else {
          // Premium users: show all cocktails that are 80%+ match
          matched = filterAlmostMakeable(recipesData as any[], filteredInventory);
        }

        setCocktails(matched);
      }
    } catch (error) {
      console.error('Error matching cocktails:', error);
    }
  }, [inventory, selectedItems, tier]);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    // Recalculate matches when selected items change
    if (inventory.length > 0) {
      matchCocktails();
    }
  }, [selectedItems, inventory, matchCocktails]);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Load user inventory
      const userInventory = await InventoryService.getUserInventory(user.id);
      setInventory(userInventory);

      // Select all items by default
      const allItemNames = new Set(userInventory.map(item => item.item_name));
      setSelectedItems(allItemNames);

      // Load all recipes from RecipesRepository (same as RecipesScreen)
      const recipesData = await RecipesRepository.getInitialRecipes(150);

      if (recipesData) {
        let matched;

        if (tier === 'FREE') {
          // Free users: show all 9 FREE_TIER_COCKTAILS sorted by match percentage
          // This ensures they can always see which classics they're closest to making
          const accessibleRecipes = recipesData.filter(cocktail =>
            isCocktailAccessible(cocktail.id, tier)
          );
          matched = sortByMatch(accessibleRecipes as any[], userInventory);
        } else {
          // Premium users: show all cocktails that are 80%+ match
          matched = filterAlmostMakeable(recipesData as any[], userInventory);
        }

        setCocktails(matched);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemName: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemName)) {
      newSelected.delete(itemName);
    } else {
      newSelected.add(itemName);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    const allItemNames = new Set(inventory.map(item => item.item_name));
    setSelectedItems(allItemNames);
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const { toggleSavedCocktail, isCocktailSaved } = useSavedItems();

  /**
   * Generate AI recipe based on selected difficulty and inventory
   */
  const handleGenerateRecipe = async () => {
    if (!user || !selectedDifficulty) return;

    // Check rate limit first
    const isPremium = tier !== 'FREE';
    const { canGenerate } = await checkRateLimit(user.id, isPremium);

    if (!canGenerate) {
      Alert.alert(
        'Daily Limit Reached',
        'Free users can generate 1 recipe per day. Upgrade to premium for unlimited AI recipes!',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () =>
              navigation.navigate('Paywall', {
                source: 'what_can_i_make_ai_limit',
                offering: null,
                displayCloseButton: true,
              }),
          },
        ]
      );
      return;
    }

    setGeneratingRecipe(true);

    try {
      // Get filtered inventory based on selection
      const filteredInventory = inventory.filter(item =>
        selectedItems.has(item.item_name)
      );

      // Use defaults for spirit, method, and flavor since user only chose difficulty
      const recipe = await generateRecipeFromInventory({
        userId: user.id,
        userInventory: filteredInventory,
        difficultyLevel: selectedDifficulty,
        isPremium,
        selectedSpirit: 'any', // Let AI choose
        selectedPreparationMethod: 'shake', // Default method
        selectedFlavorProfile: 'refreshing', // Default flavor
      });

      // Add match data and required fields to the generated recipe
      const recipeWithMatch: CocktailWithMatch = {
        ...recipe,
        match: {
          matchPercentage: 100, // AI recipe uses user's inventory
          matchedIngredients: filteredInventory.map(i => i.item_name),
          missingIngredients: [],
          canMake: true,
          almostCanMake: true,
        },
      } as CocktailWithMatch;

      // Add to AI recipes list at the top
      setAiRecipes([recipeWithMatch, ...aiRecipes]);

      Alert.alert(
        'Recipe Generated! ✨',
        `"${recipe.name}" has been added to your list!`,
        [{ text: 'Awesome!' }]
      );
    } catch (error: any) {
      console.error('Error generating recipe:', error);
      Alert.alert(
        'Generation Failed',
        error.message || 'Failed to generate recipe. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setGeneratingRecipe(false);
    }
  };

  /**
   * Delete an AI-generated recipe
   */
  const handleDeleteAIRecipe = async (recipeId: string, recipeName: string) => {
    Alert.alert(
      'Delete Recipe?',
      `Are you sure you want to delete "${recipeName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from local state
              setAiRecipes(aiRecipes.filter(recipe => recipe.id !== recipeId));

              // Delete from Supabase
              const { error } = await supabase
                .from('cocktails')
                .delete()
                .eq('id', recipeId)
                .eq('is_ai_generated', true)
                .eq('generated_by_user_id', user?.id);

              if (error) {
                console.error('Error deleting AI recipe:', error);
                // Still removed from UI, so just log the error
              }
            } catch (error) {
              console.error('Error deleting AI recipe:', error);
            }
          },
        },
      ]
    );
  };

  const renderCocktailCard = ({ item, index }: { item: CocktailWithMatch; index?: number }) => {
    // Check if this is an AI-generated recipe
    const isAIRecipe = (item as any).is_ai_generated === true;

    // Recipes from RecipesRepository already have image, title, name, time, difficulty properly formatted
    // Just pass directly to createRecipeCardProps like RecipesScreen does
    const cardProps = createRecipeCardProps(item as any, navigation, {
      toggleSavedCocktail,
      isCocktailSaved,
      setSelectedRecipe,
      setGroceryListVisible,
      showSaveButton: false,
      showCartButton: true,
      source: 'home_bar',
    });

    return (
      <View style={{ width: (width - spacing(2) * 2 - GUTTER) / 2, marginBottom: spacing(2) }}>
        <RecipeCard {...cardProps} />
        {isAIRecipe && (
          <>
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={10} color={colors.white} />
              <Text style={styles.aiBadgeText}>AI Generated</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteAIRecipe(item.id, item.name)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={24} color={colors.white} />
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>Finding cocktails you can make...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={80} color={colors.subtext} />
          <Heading level={2} style={styles.emptyTitle}>Sign In Required</Heading>
          <Text style={styles.emptyDescription}>
            Sign in to see what cocktails you can make with your inventory
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.signInButtonText}>Go to Profile to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (inventory.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="scan-outline" size={80} color={colors.subtext} />
          <Heading level={2} style={styles.emptyTitle}>No Inventory Yet</Heading>
          <Text style={styles.emptyDescription}>
            Start scanning bottles and ingredients to see what cocktails you can make!
          </Text>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => navigation.navigate('Camera' as any)}
          >
            <Ionicons name="camera" size={20} color={colors.white} />
            <Text style={styles.scanButtonText}>Start Scanning</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canMake = cocktails.filter(c => c.match.canMake);
  const almostCanMake = cocktails.filter(c => c.match.almostCanMake && !c.match.canMake);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <Heading level={1} style={styles.headerTitle}>What Can I Make?</Heading>
          <Text style={styles.headerSubtitle}>
            {selectedItems.size} of {inventory.length} ingredient{inventory.length !== 1 ? 's' : ''} selected
          </Text>
        </View>

        <View style={styles.headerRight}>
          {/* Inventory Count Badge */}
          <View style={styles.inventoryBadge}>
            <Ionicons name="cube-outline" size={20} color={colors.gold} />
            <View style={styles.inventoryBadgeContent}>
              <Text style={styles.inventoryCount}>{inventory.length}</Text>
              <Text style={styles.inventoryLabel}>Items</Text>
            </View>
          </View>

          {/* Filter Button */}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name={showFilters ? 'options' : 'options-outline'}
              size={24}
              color={colors.accent}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <View style={styles.filterHeader}>
            <Heading level={3} style={styles.filterTitle}>Select Ingredients</Heading>
            <View style={styles.filterActions}>
              <TouchableOpacity onPress={selectAll}>
                <Text style={styles.filterAction}>Select All</Text>
              </TouchableOpacity>
              <Text style={styles.filterDivider}>•</Text>
              <TouchableOpacity onPress={deselectAll}>
                <Text style={styles.filterAction}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={colors.subtext} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search ingredients..."
              placeholderTextColor={colors.subtext}
              value={ingredientSearch}
              onChangeText={setIngredientSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {ingredientSearch.length > 0 && (
              <TouchableOpacity onPress={() => setIngredientSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.subtext} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {inventory
              .filter(item =>
                item.item_name.toLowerCase().includes(ingredientSearch.toLowerCase())
              )
              .map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.ingredientChip,
                    selectedItems.has(item.item_name) && styles.ingredientChipSelected,
                  ]}
                  onPress={() => toggleItem(item.item_name)}
                >
                  <Ionicons
                    name={selectedItems.has(item.item_name) ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={selectedItems.has(item.item_name) ? colors.gold : colors.subtext}
                  />
                  <Text
                    style={[
                      styles.ingredientChipText,
                      selectedItems.has(item.item_name) && styles.ingredientChipTextSelected,
                    ]}
                  >
                    {item.item_name}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      )}

      {/* AI Recipe Generation Section */}
      <View style={styles.aiSection}>
        <View style={styles.aiSectionHeader}>
          <Ionicons name="sparkles" size={20} color={colors.gold} />
          <Heading level={3} style={styles.aiSectionTitle}>Generate Custom Recipe</Heading>
        </View>
        <Text style={styles.aiSectionSubtitle}>
          Choose difficulty and let AI create a recipe with your ingredients
        </Text>

        {/* Difficulty Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.difficultyScroll}
          contentContainerStyle={styles.difficultyScrollContent}
        >
          {(['beginner', 'intermediate', 'expert'] as const).map(difficulty => (
            <TouchableOpacity
              key={difficulty}
              style={[
                styles.difficultyChip,
                selectedDifficulty === difficulty && styles.difficultyChipSelected,
              ]}
              onPress={() => setSelectedDifficulty(difficulty)}
            >
              <Ionicons
                name={
                  difficulty === 'beginner'
                    ? 'fitness-outline'
                    : difficulty === 'intermediate'
                      ? 'ribbon-outline'
                      : 'trophy-outline'
                }
                size={16}
                color={selectedDifficulty === difficulty ? colors.white : colors.gold}
              />
              <Text
                style={[
                  styles.difficultyText,
                  selectedDifficulty === difficulty && styles.difficultyTextSelected,
                ]}
              >
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            (!selectedDifficulty || selectedItems.size === 0) && styles.generateButtonDisabled,
          ]}
          onPress={handleGenerateRecipe}
          disabled={!selectedDifficulty || selectedItems.size === 0 || generatingRecipe}
        >
          {generatingRecipe ? (
            <>
              <ActivityIndicator size="small" color={colors.white} />
              <Text style={styles.generateButtonText}>Generating...</Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color={colors.white} />
              <Text style={styles.generateButtonText}>Generate Recipe with AI ✨</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Cocktail List */}
      <FlatList
        data={[...aiRecipes, ...cocktails].filter(cocktail => {
          // If there's a search term, filter cocktails by ingredient name
          if (ingredientSearch.trim().length > 0) {
            const searchLower = ingredientSearch.toLowerCase();
            // Check if any ingredient in the cocktail matches the search
            const ingredients = typeof cocktail.ingredients === 'string'
              ? cocktail.ingredients.toLowerCase()
              : '';
            return ingredients.includes(searchLower) || cocktail.name.toLowerCase().includes(searchLower);
          }
          return true;
        })}
        renderItem={renderCocktailCard}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: GUTTER }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="wine-outline" size={60} color={colors.subtext} />
            <Heading level={2} style={styles.emptyTitle}>No matches found</Heading>
            <Text style={styles.emptyDescription}>
              {ingredientSearch.trim().length > 0
                ? `No cocktails found with "${ingredientSearch}"`
                : 'Try selecting more ingredients or add more items to your inventory'}
            </Text>
          </View>
        }
      />

      {/* Grocery List Modal */}
      <GroceryListModal
        visible={groceryListVisible}
        recipeName={selectedRecipe?.name || selectedRecipe?.title || 'Recipe'}
        ingredients={selectedRecipe?.ingredients || []}
        recipeId={selectedRecipe?.id}
        onClose={() => {
          setGroceryListVisible(false);
          setSelectedRecipe(null);
        }}
      />

      {/* Floating AI Chat Button */}
      <TouchableOpacity
        style={styles.floatingChatButton}
        onPress={() => navigation.navigate('AIRecipeGenerator' as any)}
      >
        <Ionicons name="chatbubble-ellipses" size={28} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
  },
  loadingText: {
    fontSize: 16,
    color: colors.subtext,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing(3),
    paddingLeft: spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backButton: {
    padding: spacing(1),
    marginRight: spacing(1),
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: spacing(0.5),
  },
  headerStats: {
    fontSize: 12,
    color: colors.gold,
    marginTop: spacing(0.5),
    fontWeight: '600',
  },
  inventoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: `${colors.gold}15`,
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: radii.lg,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
  },
  inventoryBadgeContent: {
    alignItems: 'center',
  },
  inventoryCount: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.gold,
    lineHeight: 22,
  },
  inventoryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(1.5),
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: `${colors.accent}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPanel: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: spacing(2),
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    marginBottom: spacing(1.5),
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    marginHorizontal: spacing(3),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchIcon: {
    marginRight: spacing(1),
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  filterAction: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  filterDivider: {
    color: colors.subtext,
  },
  filterScroll: {
    paddingHorizontal: spacing(3),
  },
  ingredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.full,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    marginRight: spacing(1),
  },
  ingredientChipSelected: {
    backgroundColor: `${colors.gold}20`,
    borderColor: colors.gold,
  },
  ingredientChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
    textTransform: 'capitalize',
  },
  ingredientChipTextSelected: {
    color: colors.gold,
  },
  stats: {
    flexDirection: 'row',
    padding: spacing(3),
    gap: spacing(2),
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gold,
  },
  statNumberAlmost: {
    color: colors.accent,
  },
  statLabel: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: spacing(0.5),
  },
  listContent: {
    padding: spacing(2),
    paddingTop: spacing(2),
  },
  cocktailCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  cocktailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(1.5),
  },
  cocktailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    flex: 1,
  },
  cocktailName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  matchBadge: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.md,
  },
  matchBadgeFull: {
    backgroundColor: `${colors.gold}20`,
  },
  matchBadgeAlmost: {
    backgroundColor: `${colors.accent}20`,
  },
  matchBadgeLow: {
    backgroundColor: `${colors.subtext}15`,
  },
  matchPercentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  matchPercentageFull: {
    color: colors.gold,
  },
  matchPercentageAlmost: {
    color: colors.accent,
  },
  matchPercentageLow: {
    color: colors.subtext,
  },
  matchStatus: {
    marginBottom: spacing(1),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gold,
  },
  statusTextMissing: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  ingredientsSummary: {
    paddingTop: spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: `${colors.line}50`,
  },
  ingredientsList: {
    paddingTop: spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: `${colors.line}50`,
  },
  ingredientsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  ingredientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
    marginBottom: spacing(1.5),
  },
  ingredientTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: `${colors.gold}15`,
    borderWidth: 1,
    borderColor: `${colors.gold}40`,
    borderRadius: radii.md,
    paddingVertical: spacing(0.5),
    paddingHorizontal: spacing(1.5),
  },
  ingredientTextMatched: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold,
  },
  ingredientTagMissing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: `${colors.accent}10`,
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
    borderRadius: radii.md,
    paddingVertical: spacing(0.5),
    paddingHorizontal: spacing(1.5),
  },
  ingredientTextMissing: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
    opacity: 0.7,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.subtext,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(4),
    paddingTop: spacing(8),
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },
  emptyDescription: {
    fontSize: 15,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing(3),
  },
  signInButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  // AI Recipe Generation Styles
  aiSection: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginHorizontal: spacing(2),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: `${colors.gold}30`,
  },
  aiSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginBottom: spacing(0.5),
  },
  floatingChatButton: {
    position: 'absolute',
    bottom: spacing(3),
    right: spacing(3),
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  aiSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  aiSectionSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(2),
  },
  difficultyScroll: {
    marginBottom: spacing(2),
  },
  difficultyScrollContent: {
    paddingRight: spacing(2),
  },
  difficultyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: 'transparent',
    marginRight: spacing(1.5),
  },
  difficultyChipSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gold,
  },
  difficultyTextSelected: {
    color: colors.white,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(4),
    alignItems: 'center',
    minWidth: 280,
    borderWidth: 1,
    borderColor: colors.line,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(2),
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: spacing(1),
  },
  cocktailCardAI: {
    borderWidth: 2,
    borderColor: `${colors.gold}40`,
    backgroundColor: `${colors.card}dd`,
  },
  aiBadge: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: '#8B5CF6',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.pill,
    zIndex: 10,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  deleteButton: {
    position: 'absolute',
    top: spacing(1),
    left: spacing(1),
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // Spirit Selection Styles
  selectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1.5),
  },
  spiritScroll: {
    marginBottom: spacing(2),
  },
  spiritScrollContent: {
    paddingRight: spacing(2),
  },
  spiritCard: {
    width: 100,
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginRight: spacing(2),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  spiritCardSelected: {
    borderColor: colors.gold,
    backgroundColor: `${colors.gold}10`,
  },
  spiritImage: {
    width: 60,
    height: 60,
    borderRadius: radii.md,
    marginBottom: spacing(1),
  },
  spiritEmoji: {
    fontSize: 20,
    marginBottom: spacing(0.5),
  },
  spiritLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  spiritLabelSelected: {
    color: colors.gold,
  },
  // Flavor Profile Styles
  flavorScroll: {
    marginBottom: spacing(2),
  },
  flavorScrollContent: {
    paddingRight: spacing(2),
  },
  flavorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: 'transparent',
    marginRight: spacing(1.5),
  },
  flavorChipSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  flavorEmoji: {
    fontSize: 16,
  },
  flavorText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  flavorTextSelected: {
    color: colors.white,
  },
  aiNote: {
    fontSize: 12,
    color: colors.subtext,
    textAlign: 'center',
    marginTop: spacing(2),
    fontStyle: 'italic',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: spacing(3),
  },
  modalIntro: {
    fontSize: 15,
    color: colors.subtext,
    lineHeight: 22,
    marginBottom: spacing(3),
  },
  stepSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    marginTop: spacing(3),
    marginBottom: spacing(2),
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gold,
    backgroundColor: `${colors.gold}20`,
    width: 32,
    height: 32,
    borderRadius: 16,
    textAlign: 'center',
    lineHeight: 32,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1.5),
    marginBottom: spacing(2),
  },
  summaryCard: {
    backgroundColor: `${colors.gold}10`,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginTop: spacing(3),
    borderWidth: 1,
    borderColor: `${colors.gold}30`,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1.5),
  },
  summaryText: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 22,
  },
  modalFooter: {
    padding: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
});
