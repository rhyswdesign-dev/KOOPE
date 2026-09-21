/**
 * What Can I Make Screen
 * Shows cocktails user can make based on their inventory
 * Allows filtering by selected ingredients
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { useXPSystem } from '../store/useXPSystem';
import { useEngagement } from '../store/useEngagement';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { getSpiritSubstitutions } from '../utils/spiritSubstitutions';
import { generateRecipeFromInventory, checkRateLimit } from '../services/aiRecipeGenerationService';
import { supabase } from '../lib/supabase';
import { FeedbackPromptModal } from '../components/FeedbackPromptModal';
import { notificationService } from '../services/notificationService';
import { notificationPlanner } from '../services/notificationPlanner';
// BartenderAssistant removed in favor of full screen AI Chat

type CocktailWithMatch = Cocktail & { match: RecipeMatch };

const { width } = Dimensions.get('window');
const GUTTER = 12;

export default function WhatCanIMakeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isAuthenticated } = useAuth();
  const { tier } = useUserTier();
  const { isCocktailUnlockedWithXP } = useXPSystem();
  const { isRecipeUnlocked: isRecipeUnlockedWithEngagement } = useEngagement();
  // Phase 2.2: smart substitution swap ideas on almost-makeable cards —
  // gated (KŌOPE+), unlike CocktailDetailScreen's existing free version,
  // per the founder's call that this inventory-planning screen is the
  // "plan your whole bar" upsell surface, not the reactive single-recipe
  // swap already shipped free elsewhere.
  const { hasAccess: hasSmartSubstitutions, gateWithTrigger } =
    useFeatureAccess('smart_substitutions');

  const [chatFeedbackVisible, setChatFeedbackVisible] = useState(false);
  const [cartFeedbackVisible, setCartFeedbackVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<UserInventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [cocktails, setCocktails] = useState<CocktailWithMatch[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState('');

  // AI Recipe Generation State
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    'beginner' | 'intermediate' | 'expert' | null
  >(null);
  // Spirit/method/flavor default to the same values the service used to have
  // hardcoded ('any' / 'shake' / 'refreshing') so existing behavior is
  // unchanged until the user actually taps a different chip.
  const [selectedSpirit, setSelectedSpirit] = useState('any');
  const [selectedMethod, setSelectedMethod] = useState<'shake' | 'stir' | 'build'>('shake');
  const [selectedFlavorProfile, setSelectedFlavorProfile] = useState('refreshing');
  const [generatingRecipe, setGeneratingRecipe] = useState(false);
  const [aiRecipes, setAiRecipes] = useState<CocktailWithMatch[]>([]);

  // Spirit chips are limited to what's actually among the checked ingredients
  // — offering a base spirit the AI can't actually use (because it's not in
  // the selected inventory list passed to the prompt) would just produce a
  // recipe that silently ignores the choice.
  const availableSpiritOptions = useMemo(() => {
    const spiritNames = inventory
      .filter((item) => selectedItems.has(item.item_name) && item.category === 'spirit')
      .map((item) => (item.subcategory || item.item_name || '').trim())
      .filter(Boolean);
    const deduped = Array.from(new Set(spiritNames.map((s) => s.toLowerCase())));
    return ['any', ...deduped];
  }, [inventory, selectedItems]);

  // Reset back to 'any' if the previously selected spirit falls out of the
  // checked ingredients (e.g. the user unchecks that bottle).
  useEffect(() => {
    if (!availableSpiritOptions.includes(selectedSpirit)) {
      setSelectedSpirit('any');
    }
  }, [availableSpiritOptions, selectedSpirit]);

  // Grocery List Modal State
  const [groceryListVisible, setGroceryListVisible] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  // Wrap matchCocktails in useCallback to avoid dependency issues
  const matchCocktails = useCallback(async () => {
    try {
      // Filter inventory to only selected items
      const filteredInventory = inventory.filter((item) => selectedItems.has(item.item_name));

      // Load all recipes from RecipesRepository (same as RecipesScreen)
      const recipesData = await RecipesRepository.getInitialRecipes(150);

      if (recipesData) {
        let matched;

        if (tier === 'FREE') {
          // Free users: free 9 classics + anything unlocked via XP or engagement, sorted by match
          const accessibleRecipes = recipesData.filter(
            (cocktail) =>
              isCocktailAccessible(cocktail.id, tier) ||
              isCocktailUnlockedWithXP(cocktail.id) ||
              isRecipeUnlockedWithEngagement(cocktail.id),
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
  }, [inventory, selectedItems, tier, isCocktailUnlockedWithXP, isRecipeUnlockedWithEngagement]);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    // Recalculate matches when selected items change
    if (inventory.length > 0) {
      matchCocktails();
    }
  }, [selectedItems, inventory, matchCocktails]);

  // Notification Playbook §2: the ask lands *after* a first value moment,
  // never on launch, and is framed as service tied to what just happened.
  // A first non-empty What Can I Make result is exactly that moment.
  const hasPrimedNotificationsRef = useRef(false);
  useEffect(() => {
    if (hasPrimedNotificationsRef.current) return;
    if (!cocktails.some((c) => c.match.canMake)) return;
    hasPrimedNotificationsRef.current = true;

    notificationService
      .hasPermission()
      .then((granted) => {
        if (granted) return;
        Alert.alert(
          'Want a nudge when your shelf can make something new?',
          'One reminder on Friday afternoons, plus a heads-up before any party you plan. Nothing else.',
          [
            { text: 'No thanks', style: 'cancel' },
            {
              text: 'Yes, remind me',
              onPress: () => {
                notificationService
                  .requestPermissionAtValueMoment('what_can_i_make_result')
                  .then((ok) =>
                    ok
                      ? notificationPlanner.run({ userId: user?.id, reason: 'permission_granted' })
                      : null,
                  )
                  .catch(() => {});
              },
            },
          ],
        );
      })
      .catch(() => {});
  }, [cocktails, user?.id]);

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
      const allItemNames = new Set(userInventory.map((item) => item.item_name));
      setSelectedItems(allItemNames);

      // Load all recipes from RecipesRepository (same as RecipesScreen)
      const recipesData = await RecipesRepository.getInitialRecipes(150);

      if (recipesData) {
        let matched;

        if (tier === 'FREE') {
          // Free users: show all 9 FREE_TIER_COCKTAILS sorted by match percentage
          // This ensures they can always see which classics they're closest to making
          const accessibleRecipes = recipesData.filter((cocktail) =>
            isCocktailAccessible(cocktail.id, tier),
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
    const allItemNames = new Set(inventory.map((item) => item.item_name));
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
    const { canGenerate, dailyLimit } = await checkRateLimit(user.id, isPremium);

    if (!canGenerate) {
      Alert.alert(
        'Daily Limit Reached',
        `Free users can generate ${dailyLimit} recipe${dailyLimit === 1 ? '' : 's'} per day. Upgrade to premium for unlimited AI recipes!`,
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
        ],
      );
      return;
    }

    setGeneratingRecipe(true);

    try {
      // Get filtered inventory based on selection
      const filteredInventory = inventory.filter((item) => selectedItems.has(item.item_name));

      const recipe = await generateRecipeFromInventory({
        userId: user.id,
        userInventory: filteredInventory,
        difficultyLevel: selectedDifficulty,
        isPremium,
        selectedSpirit,
        selectedPreparationMethod: selectedMethod,
        selectedFlavorProfile,
      });

      // Add match data and required fields to the generated recipe
      const recipeWithMatch: CocktailWithMatch = {
        ...recipe,
        match: {
          matchPercentage: 100, // AI recipe uses user's inventory
          matchedIngredients: filteredInventory.map((i) => i.item_name),
          missingIngredients: [],
          canMake: true,
          almostCanMake: true,
        },
      } as CocktailWithMatch;

      // Add to AI recipes list at the top
      setAiRecipes([recipeWithMatch, ...aiRecipes]);

      Alert.alert('Recipe Generated! ✨', `"${recipe.name}" has been added to your list!`, [
        { text: 'Awesome!' },
      ]);
    } catch (error: any) {
      console.error('Error generating recipe:', error);
      Alert.alert(
        'Generation Failed',
        error.message || 'Failed to generate recipe. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setGeneratingRecipe(false);
    }
  };

  /**
   * Delete an AI-generated recipe
   */
  const handleDeleteAIRecipe = async (recipeId: string, recipeName: string) => {
    Alert.alert('Delete Recipe?', `Are you sure you want to delete "${recipeName}"?`, [
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
            setAiRecipes(aiRecipes.filter((recipe) => recipe.id !== recipeId));

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
    ]);
  };

  const renderCocktailCard = ({ item, index }: { item: CocktailWithMatch; index?: number }) => {
    // Check if this is an AI-generated recipe
    const isAIRecipe = (item as any).is_ai_generated === true;

    // Recipes from RecipesRepository already have image, title, name, time, difficulty properly formatted
    // Just pass directly to createRecipeCardProps like RecipesScreen does
    const cardProps = createRecipeCardProps(item as any, navigation, {
      toggleSavedCocktail,
      isCocktailSaved,
      setSelectedRecipe: () => {},
      setGroceryListVisible: () => setCartFeedbackVisible(true),
      showSaveButton: false,
      showCartButton: true,
      source: 'home_bar',
    });

    // Phase 2.2: swap suggestion for the first missing ingredient on an
    // almost-makeable card. Compact by design — just the top pick, not
    // the full "1 primary + 2 secondary" blueprint list CocktailDetail's
    // modal shows; there isn't room for that in a 2-column grid card.
    const primaryMissing = item.match?.missingIngredients?.[0];
    const topSubstitute = primaryMissing
      ? getSpiritSubstitutions(primaryMissing)?.substitutes[0]
      : undefined;

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
        {topSubstitute &&
          (hasSmartSubstitutions ? (
            <View style={styles.substitutionRow}>
              <Ionicons name="swap-horizontal" size={12} color={colors.accent} />
              <Text style={styles.substitutionRowText} numberOfLines={1}>
                Try {topSubstitute.name} instead
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.substitutionRow}
              onPress={() => gateWithTrigger('T_SUBSTITUTIONS')}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Ionicons name="lock-closed" size={12} color={colors.subtext} />
              <Text
                style={[styles.substitutionRowText, { color: colors.subtext }]}
                numberOfLines={1}
              >
                Swap ideas — KŌOPE+
              </Text>
            </TouchableOpacity>
          ))}
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
          <Ionicons name="person-outline" size={52} color={colors.subtext} />
          <Heading level={2} style={styles.emptyTitle}>
            Sign In Required
          </Heading>
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
          <Ionicons name="scan-outline" size={52} color={colors.subtext} />
          <Heading level={2} style={styles.emptyTitle}>
            No Inventory Yet
          </Heading>
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

  const canMake = cocktails.filter((c) => c.match.canMake);
  const almostCanMake = cocktails.filter((c) => c.match.almostCanMake && !c.match.canMake);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>What Can I Make?</Text>
          <Text style={styles.headerSubtitle}>
            {selectedItems.size} of {inventory.length} selected
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name={showFilters ? 'options' : 'options-outline'}
            size={20}
            color={showFilters ? colors.goldText : colors.accent}
          />
        </TouchableOpacity>
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <View style={styles.filterHeader}>
            <Heading level={3} style={styles.filterTitle}>
              Select Ingredients
            </Heading>
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {inventory
              .filter((item) =>
                item.item_name.toLowerCase().includes(ingredientSearch.toLowerCase()),
              )
              .map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.ingredientChip,
                    selectedItems.has(item.item_name) && styles.ingredientChipSelected,
                  ]}
                  onPress={() => toggleItem(item.item_name)}
                >
                  <Ionicons
                    name={
                      selectedItems.has(item.item_name) ? 'checkmark-circle' : 'ellipse-outline'
                    }
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
          <Ionicons name="sparkles" size={14} color={colors.gold} />
          <Text style={styles.aiSectionTitle}>Generate Custom Recipe</Text>
        </View>
        <Text style={styles.aiSectionSubtitle}>Let AI build a recipe from what's in your bar</Text>

        {/* Difficulty Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.difficultyScroll}
          contentContainerStyle={styles.difficultyScrollContent}
        >
          {(['beginner', 'intermediate', 'expert'] as const).map((difficulty) => (
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

        {/* Preparation Method Selector */}
        <Text style={styles.aiOptionLabel}>Method</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.difficultyScroll}
          contentContainerStyle={styles.difficultyScrollContent}
        >
          {(['shake', 'stir', 'build'] as const).map((method) => (
            <TouchableOpacity
              key={method}
              style={[
                styles.difficultyChip,
                selectedMethod === method && styles.difficultyChipSelected,
              ]}
              onPress={() => setSelectedMethod(method)}
            >
              <Text
                style={[
                  styles.difficultyText,
                  selectedMethod === method && styles.difficultyTextSelected,
                ]}
              >
                {method.charAt(0).toUpperCase() + method.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Flavor Profile Selector */}
        <Text style={styles.aiOptionLabel}>Flavor</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.difficultyScroll}
          contentContainerStyle={styles.difficultyScrollContent}
        >
          {(['refreshing', 'spirit-forward', 'sour', 'sweet', 'bitter', 'tropical'] as const).map(
            (flavor) => (
              <TouchableOpacity
                key={flavor}
                style={[
                  styles.difficultyChip,
                  selectedFlavorProfile === flavor && styles.difficultyChipSelected,
                ]}
                onPress={() => setSelectedFlavorProfile(flavor)}
              >
                <Text
                  style={[
                    styles.difficultyText,
                    selectedFlavorProfile === flavor && styles.difficultyTextSelected,
                  ]}
                >
                  {flavor.charAt(0).toUpperCase() + flavor.slice(1)}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </ScrollView>

        {/* Base Spirit Selector — only shown once checking ingredients gives
            the AI more than one spirit to choose between; "any" alone isn't
            worth a whole row. */}
        {availableSpiritOptions.length > 1 && (
          <>
            <Text style={styles.aiOptionLabel}>Base Spirit</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.difficultyScroll}
              contentContainerStyle={styles.difficultyScrollContent}
            >
              {availableSpiritOptions.map((spirit) => (
                <TouchableOpacity
                  key={spirit}
                  style={[
                    styles.difficultyChip,
                    selectedSpirit === spirit && styles.difficultyChipSelected,
                  ]}
                  onPress={() => setSelectedSpirit(spirit)}
                >
                  <Text
                    style={[
                      styles.difficultyText,
                      selectedSpirit === spirit && styles.difficultyTextSelected,
                    ]}
                  >
                    {spirit === 'any' ? 'Any' : spirit.charAt(0).toUpperCase() + spirit.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

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
        data={[...aiRecipes, ...cocktails].filter((cocktail) => {
          // If there's a search term, filter cocktails by ingredient name
          if (ingredientSearch.trim().length > 0) {
            const searchLower = ingredientSearch.toLowerCase();
            // Check if any ingredient in the cocktail matches the search
            const ingredients =
              typeof cocktail.ingredients === 'string' ? cocktail.ingredients.toLowerCase() : '';
            return (
              ingredients.includes(searchLower) || cocktail.name.toLowerCase().includes(searchLower)
            );
          }
          return true;
        })}
        renderItem={renderCocktailCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: GUTTER }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="wine-outline" size={60} color={colors.subtext} />
            <Heading level={2} style={styles.emptyTitle}>
              No matches found
            </Heading>
            <Text style={styles.emptyDescription}>
              {ingredientSearch.trim().length > 0
                ? `No cocktails found with "${ingredientSearch}"`
                : 'Try selecting more ingredients or add more items to your inventory'}
            </Text>
          </View>
        }
      />

      <FeedbackPromptModal
        featureKey="shopping_cart_recipe"
        title="Shopping cart feedback"
        body="Would you use a smart cart that adds missing ingredients from recipes and helps plan your next bottle run?"
        visible={cartFeedbackVisible}
        onDismiss={() => setCartFeedbackVisible(false)}
      />

      {/* Floating AI Chat Button */}
      <TouchableOpacity
        style={styles.floatingChatButton}
        onPress={() => setChatFeedbackVisible(true)}
      >
        <Ionicons name="chatbubble-ellipses" size={28} color={colors.white} />
      </TouchableOpacity>

      <FeedbackPromptModal
        featureKey="ai_bartender"
        title="Bartender Hotline feedback"
        body="Would you use a direct line to an AI bartender that knows your inventory and helps troubleshoot recipes in real time?"
        visible={chatFeedbackVisible}
        onDismiss={() => setChatFeedbackVisible(false)}
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
    alignItems: 'center',
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(2),
    gap: spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    fontFamily: serif,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 2,
    textAlign: 'center',
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
    gap: spacing(0.75),
    backgroundColor: 'rgba(214,138,56,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.28)',
    borderRadius: radii.pill,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1.5),
  },
  inventoryBadgeContent: {
    alignItems: 'center',
  },
  inventoryCount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.gold,
    lineHeight: 18,
  },
  inventoryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.accent}12`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.accent}25`,
  },
  filterButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
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
    gap: spacing(0.5),
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.pill,
    paddingVertical: spacing(0.85),
    paddingHorizontal: spacing(1.75),
    marginRight: spacing(1),
  },
  ingredientChipSelected: {
    backgroundColor: 'rgba(214,138,56,0.14)',
    borderColor: 'rgba(214,138,56,0.5)',
  },
  ingredientChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.subtext,
    textTransform: 'capitalize',
  },
  ingredientChipTextSelected: {
    color: colors.gold,
    fontWeight: '700',
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
    paddingTop: spacing(6),
    gap: spacing(1.25),
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing(2),
    maxWidth: 280,
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
    backgroundColor: '#241A0E',
    borderRadius: radii.lg,
    padding: spacing(2.5),
    marginHorizontal: spacing(2),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.2)',
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  aiSectionSubtitle: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: spacing(1.75),
    marginTop: spacing(0.25),
  },
  aiOptionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing(0.75),
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
  substitutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    marginTop: spacing(0.5),
    paddingHorizontal: spacing(0.5),
  },
  substitutionRowText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
    flexShrink: 1,
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
