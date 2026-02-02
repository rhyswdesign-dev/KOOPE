/**
 * What Can I Make Screen
 * Shows cocktails user can make based on their inventory
 * Allows filtering by selected ingredients
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { supabase } from '../lib/supabase';
import { InventoryService } from '../services/inventoryService';
import * as AIRecipeService from '../services/aiRecipeGenerationService';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { sortByMatch, getMatchMessage } from '../utils/recipeMatching';
import type { Cocktail } from '../types/supabase';
import type { RecipeMatch } from '../utils/recipeMatching';
import type { UserInventoryItem } from '../types/database';
import type { RootStackParamList } from '../navigation/RootNavigator';

type CocktailWithMatch = Cocktail & { match: RecipeMatch };

export default function WhatCanIMakeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isAuthenticated } = useAuth();
  const { isKoopePlus, isKoopePro } = useSubscription();

  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<UserInventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [cocktails, setCocktails] = useState<CocktailWithMatch[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // AI Recipe Generation state
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'intermediate' | 'expert' | null>(null);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);
  const [aiRecipes, setAiRecipes] = useState<CocktailWithMatch[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    // Recalculate matches when selected items change
    if (inventory.length > 0) {
      matchCocktails();
    }
  }, [selectedItems, inventory]);

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

      // Load all cocktails from Supabase
      const { data: cocktailsData, error } = await supabase
        .from('cocktails')
        .select('*')
        .limit(100);

      if (error) throw error;

      if (cocktailsData) {
        // Calculate matches
        const matched = sortByMatch(cocktailsData, userInventory);
        setCocktails(matched);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const matchCocktails = async () => {
    try {
      // Filter inventory to only selected items
      const filteredInventory = inventory.filter(item =>
        selectedItems.has(item.item_name)
      );

      // Load all cocktails
      const { data: cocktailsData, error } = await supabase
        .from('cocktails')
        .select('*')
        .limit(100);

      if (error) throw error;

      if (cocktailsData) {
        // Calculate matches with filtered inventory
        const matched = sortByMatch(cocktailsData, filteredInventory);
        setCocktails(matched);
      }
    } catch (error) {
      console.error('Error matching cocktails:', error);
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

  const generateRecipe = async () => {
    if (!user || !selectedDifficulty || generatingRecipe) return;

    setGeneratingRecipe(true);
    try {
      // Check rate limit
      const isPremium = isKoopePlus || isKoopePro;
      const rateLimit = await AIRecipeService.checkRateLimit(user.id, isPremium);

      if (!rateLimit.canGenerate) {
        Alert.alert(
          'Daily Limit Reached',
          'Free users can generate 1 recipe per day. Upgrade to KŌOPE Plus for unlimited AI recipe generation!',
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Upgrade Now', onPress: () => navigation.navigate('Profile') },
          ]
        );
        return;
      }

      // Get selected inventory items
      const selectedInventory = inventory.filter(item =>
        selectedItems.has(item.item_name)
      );

      if (selectedInventory.length === 0) {
        Alert.alert('No Ingredients Selected', 'Please select some ingredients from your inventory to generate a recipe.');
        return;
      }

      // Generate recipe
      const generatedRecipe = await AIRecipeService.generateRecipeFromInventory({
        userId: user.id,
        userInventory: selectedInventory,
        difficultyLevel: selectedDifficulty,
        isPremium,
      });

      // Add to list with match data
      const recipeWithMatch: CocktailWithMatch = {
        ...generatedRecipe,
        match: {
          canMake: true,
          matchPercentage: 100,
          matchedIngredients: selectedInventory.map(i => i.item_name),
          missingIngredients: [],
          almostCanMake: false,
        },
      };

      // Add to AI recipes and main cocktails list at the top
      setAiRecipes([recipeWithMatch, ...aiRecipes]);
      setCocktails([recipeWithMatch, ...cocktails]);

      // Success feedback
      Alert.alert(
        'Recipe Generated! ✨',
        `Created "${generatedRecipe.name}" using your ingredients. Scroll up to see it!`,
        [{ text: 'View Recipe', onPress: () => navigation.navigate('CocktailDetail', { cocktailId: generatedRecipe.id }) }]
      );
    } catch (error: any) {
      console.error('Recipe generation error:', error);
      Alert.alert('Generation Failed', error.message || 'Failed to generate recipe. Please try again.');
    } finally {
      setGeneratingRecipe(false);
    }
  };

  const selectAll = () => {
    const allItemNames = new Set(inventory.map(item => item.item_name));
    setSelectedItems(allItemNames);
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const renderCocktailCard = ({ item }: { item: CocktailWithMatch }) => {
    const { match } = item;
    const isAI = item.is_ai_generated;

    return (
      <TouchableOpacity
        style={[
          styles.cocktailCard,
          isAI && styles.cocktailCardAI,
        ]}
        onPress={() => navigation.navigate('CocktailDetail', { cocktailId: item.id })}
      >
        {/* AI Badge */}
        {isAI && (
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={12} color={colors.white} />
            <Text style={styles.aiBadgeText}>AI Generated</Text>
          </View>
        )}

        <View style={styles.cocktailHeader}>
          <View style={styles.cocktailTitleRow}>
            <Ionicons name="wine" size={24} color={colors.gold} />
            <Text style={styles.cocktailName}>{item.name}</Text>
          </View>

          {/* Match Badge */}
          <View
            style={[
              styles.matchBadge,
              match.canMake
                ? styles.matchBadgeFull
                : match.almostCanMake
                ? styles.matchBadgeAlmost
                : styles.matchBadgeLow,
            ]}
          >
            <Text
              style={[
                styles.matchPercentage,
                match.canMake
                  ? styles.matchPercentageFull
                  : match.almostCanMake
                  ? styles.matchPercentageAlmost
                  : styles.matchPercentageLow,
              ]}
            >
              {Math.round(match.matchPercentage)}%
            </Text>
          </View>
        </View>

        {/* Match Status */}
        <View style={styles.matchStatus}>
          {match.canMake ? (
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.gold} />
              <Text style={styles.statusText}>You can make this!</Text>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
              <Text style={styles.statusTextMissing}>{getMatchMessage(match)}</Text>
            </View>
          )}
        </View>

        {/* Ingredients List with Highlighting */}
        <View style={styles.ingredientsList}>
          <Text style={styles.ingredientsLabel}>Ingredients:</Text>
          <View style={styles.ingredientsGrid}>
            {/* Matched Ingredients (Green/Gold) */}
            {match.matchedIngredients.map((ingredient, index) => (
              <View key={`matched-${index}`} style={styles.ingredientTag}>
                <Ionicons name="checkmark-circle" size={14} color={colors.gold} />
                <Text style={styles.ingredientTextMatched}>{ingredient}</Text>
              </View>
            ))}
            {/* Missing Ingredients (Red/Muted) */}
            {match.missingIngredients.map((ingredient, index) => (
              <View key={`missing-${index}`} style={styles.ingredientTagMissing}>
                <Ionicons name="close-circle-outline" size={14} color={colors.accent} />
                <Text style={styles.ingredientTextMissing}>{ingredient}</Text>
              </View>
            ))}
          </View>

          {/* Summary */}
          <Text style={styles.summaryLabel}>
            Have: {match.matchedIngredients.length} / {match.matchedIngredients.length + match.missingIngredients.length}
          </Text>
        </View>
      </TouchableOpacity>
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
          <Text style={styles.emptyTitle}>Sign In Required</Text>
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
          <Text style={styles.emptyTitle}>No Inventory Yet</Text>
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
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>What Can I Make?</Text>
          <Text style={styles.headerSubtitle}>
            {selectedItems.size} of {inventory.length} ingredient{inventory.length !== 1 ? 's' : ''} selected
          </Text>
          <Text style={styles.headerStats}>
            {canMake.length} can make • {almostCanMake.length} almost there
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
            <Text style={styles.filterTitle}>Select Ingredients</Text>
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {inventory.map(item => (
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

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{canMake.length}</Text>
          <Text style={styles.statLabel}>Can Make</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, styles.statNumberAlmost]}>{almostCanMake.length}</Text>
          <Text style={styles.statLabel}>Almost There</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{cocktails.length}</Text>
          <Text style={styles.statLabel}>Total Recipes</Text>
        </View>
      </View>

      {/* AI Recipe Generation Section */}
      <View style={styles.aiSection}>
        <Text style={styles.aiSectionTitle}>Generate Custom Recipe ✨</Text>
        <Text style={styles.aiSectionSubtitle}>Select difficulty level</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.difficultyScroll}
          contentContainerStyle={styles.difficultyScrollContent}
        >
          {(['beginner', 'intermediate', 'expert'] as const).map(level => (
            <TouchableOpacity
              key={level}
              style={[
                styles.difficultyChip,
                selectedDifficulty === level && styles.difficultyChipSelected,
              ]}
              onPress={() => setSelectedDifficulty(level)}
            >
              <Ionicons
                name={
                  level === 'beginner' ? 'wine-outline' :
                  level === 'intermediate' ? 'flask-outline' :
                  'flame-outline'
                }
                size={20}
                color={selectedDifficulty === level ? colors.white : colors.gold}
              />
              <Text
                style={[
                  styles.difficultyText,
                  selectedDifficulty === level && styles.difficultyTextSelected,
                ]}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[
            styles.generateButton,
            (!selectedDifficulty || selectedItems.size === 0 || generatingRecipe) && styles.generateButtonDisabled,
          ]}
          onPress={generateRecipe}
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
              <Text style={styles.generateButtonText}>Generate Recipe with AI</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Loading Modal */}
      <Modal
        visible={generatingRecipe}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color={colors.gold} />
            <Text style={styles.modalTitle}>Creating your recipe...</Text>
            <Text style={styles.modalSubtitle}>This may take 10-15 seconds</Text>
          </View>
        </View>
      </Modal>

      {/* Cocktail List */}
      <FlatList
        data={cocktails}
        renderItem={renderCocktailCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="wine-outline" size={60} color={colors.subtext} />
            <Text style={styles.emptyTitle}>No matches found</Text>
            <Text style={styles.emptyDescription}>
              Try selecting more ingredients or add more items to your inventory
            </Text>
          </View>
        }
      />
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
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
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    padding: spacing(3),
    paddingTop: 0,
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
    marginHorizontal: spacing(3),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: `${colors.gold}20`,
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
});
