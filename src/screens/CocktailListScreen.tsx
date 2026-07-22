import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fonts, radii } from '../theme/tokens';
import { Heading } from '../components/ui';
import RecipeCard from '../components/RecipeCard';
import GroceryListModal from '../components/GroceryListModal';
import { createRecipeCardProps } from '../utils/recipeActions';
import { useSavedItems } from '../hooks/useSavedItems';
import { RecipesRepository } from '../repos/supabase';
import { log } from '../lib/logger';
import type { RootStackParamList } from '../navigation/RootNavigator';

interface CocktailListScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, 'CocktailList'> & {
    params: RootStackParamList['CocktailList'] & { cocktails?: any[] };
  };
}

export default function CocktailListScreen({ navigation, route }: CocktailListScreenProps) {
  const { title, cocktailIds, cocktails, category } = route.params;
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [groceryListVisible, setGroceryListVisible] = useState(false);
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);

  const {
    toggleSavedCocktail,
    isCocktailSaved,
  } = useSavedItems();

  // Set navigation options dynamically
  useLayoutEffect(() => {
    navigation.setOptions({
      title: title,
      headerBackVisible: true,
      headerRight: category === 'mocktails' ? () => (
        <TouchableOpacity
          onPress={() => {
            if (searchExpanded) {
              // Closing search, clear the query
              setSearchQuery('');
            }
            setSearchExpanded(!searchExpanded);
          }}
          style={{ marginRight: 8 }}
        >
          <Ionicons
            name={searchExpanded ? 'close' : 'search'}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
      ) : undefined,
    });
  }, [navigation, title, category, searchExpanded]);

  // Fetch all recipes from Supabase on mount (only if cocktails not provided directly)
  useEffect(() => {
    async function loadRecipes() {
      // If cocktails are provided directly (e.g., mocktails), use those
      if (cocktails && Array.isArray(cocktails)) {
        setAllRecipes(cocktails);
        setLoading(false);
        return;
      }

      // Otherwise, fetch from Supabase
      try {
        const recipes = await RecipesRepository.getAllRecipes();
        setAllRecipes(recipes);
      } catch (error) {
        log.error('CocktailListScreen', 'Error loading recipes', error);
      } finally {
        setLoading(false);
      }
    }
    loadRecipes();
  }, [cocktails]);

  // Find cocktails by ID from Supabase data or use provided cocktails
  const validCocktails = useMemo(() => {
    // If cocktails are provided directly, use them
    if (cocktails && Array.isArray(cocktails)) {
      return cocktails;
    }

    // Otherwise, find by IDs
    if (!cocktailIds || !Array.isArray(cocktailIds) || allRecipes.length === 0) return [];

    return cocktailIds.map(id => {
      return allRecipes.find(cocktail =>
        cocktail.id === id ||
        cocktail.id === id.replace(/-/g, '') ||
        (cocktail.title || cocktail.name)?.toLowerCase().replace(/[^a-z0-9]/g, '-') === id ||
        (cocktail.title || cocktail.name)?.toLowerCase().replace(/[^a-z0-9]/g, '') === id.replace(/-/g, '')
      );
    }).filter(Boolean);
  }, [cocktailIds, cocktails, allRecipes]);

  // Filter cocktails based on search query
  const filteredCocktails = useMemo(() => {
    if (!searchQuery.trim()) return validCocktails;

    const query = searchQuery.toLowerCase().trim();
    return validCocktails.filter(cocktail => {
      const name = (cocktail.name || cocktail.title || '').toLowerCase();
      const subtitle = (cocktail.subtitle || '').toLowerCase();
      const description = (cocktail.description || '').toLowerCase();
      const ingredientNames = (cocktail.ingredients || [])
        .map((ing: any) => (ing.name || '').toLowerCase())
        .join(' ');

      return (
        name.includes(query) ||
        subtitle.includes(query) ||
        description.includes(query) ||
        ingredientNames.includes(query)
      );
    });
  }, [validCocktails, searchQuery]);

  // Group mocktails by subcategory
  const mocktailSubcategories = useMemo(() => {
    if (category !== 'mocktails') return null;

    const zeroProof = filteredCocktails.filter(c => c.subtitle?.includes('Zero-Proof'));
    const wellness = filteredCocktails.filter(c => c.subtitle?.includes('Wellness'));
    const lowABV = filteredCocktails.filter(c => c.subtitle?.includes('Low-ABV'));

    return { zeroProof, wellness, lowABV };
  }, [category, filteredCocktails]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading recipes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search Bar (only for mocktails and only when expanded) */}
        {category === 'mocktails' && searchExpanded && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={colors.subtext} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search mocktails, ingredients..."
                placeholderTextColor={colors.subtext}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color={colors.subtext} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        {/* Cocktail List - Show horizontal sections for mocktails, otherwise flat grid */}
        {category === 'mocktails' && mocktailSubcategories ? (
          <View>
            {/* Zero-Proof Spirits */}
            {mocktailSubcategories.zeroProof.length > 0 && (
              <View style={styles.subcategorySection}>
                <Heading level={2} style={styles.subcategoryTitle}>Zero-Proof Spirits</Heading>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScrollContent}
                >
                  {mocktailSubcategories.zeroProof.map((cocktail, index) => (
                    <Animated.View
                      key={cocktail.id}
                      entering={FadeInDown.delay(index * 100).duration(500)}
                      style={styles.horizontalCard}
                    >
                      <RecipeCard
                        {...createRecipeCardProps(cocktail, navigation, {
                          toggleSavedCocktail,
                          isCocktailSaved,
                          setSelectedRecipe,
                          setGroceryListVisible,
                          showSaveButton: true,
                          showCartButton: true,
                          showDeleteButton: false,
                        })}
                      />
                    </Animated.View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Wellness Drinks */}
            {mocktailSubcategories.wellness.length > 0 && (
              <View style={styles.subcategorySection}>
                <Heading level={2} style={styles.subcategoryTitle}>Wellness Drinks</Heading>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScrollContent}
                >
                  {mocktailSubcategories.wellness.map((cocktail, index) => (
                    <Animated.View
                      key={cocktail.id}
                      entering={FadeInDown.delay(index * 100).duration(500)}
                      style={styles.horizontalCard}
                    >
                      <RecipeCard
                        {...createRecipeCardProps(cocktail, navigation, {
                          toggleSavedCocktail,
                          isCocktailSaved,
                          setSelectedRecipe,
                          setGroceryListVisible,
                          showSaveButton: true,
                          showCartButton: true,
                          showDeleteButton: false,
                        })}
                      />
                    </Animated.View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Low-ABV Options */}
            {mocktailSubcategories.lowABV.length > 0 && (
              <View style={styles.subcategorySection}>
                <Heading level={2} style={styles.subcategoryTitle}>Low-ABV Options</Heading>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScrollContent}
                >
                  {mocktailSubcategories.lowABV.map((cocktail, index) => (
                    <Animated.View
                      key={cocktail.id}
                      entering={FadeInDown.delay(index * 100).duration(500)}
                      style={styles.horizontalCard}
                    >
                      <RecipeCard
                        {...createRecipeCardProps(cocktail, navigation, {
                          toggleSavedCocktail,
                          isCocktailSaved,
                          setSelectedRecipe,
                          setGroceryListVisible,
                          showSaveButton: true,
                          showCartButton: true,
                          showDeleteButton: false,
                        })}
                      />
                    </Animated.View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.cocktailGrid}>
            {validCocktails.map((cocktail, index) => (
              <Animated.View
                key={cocktail.id}
                entering={FadeInDown.delay(index * 100).duration(500)}
              >
                <RecipeCard
                  style={styles.cocktailCard}
                  {...createRecipeCardProps(cocktail, navigation, {
                    toggleSavedCocktail,
                    isCocktailSaved,
                    setSelectedRecipe,
                    setGroceryListVisible,
                    showSaveButton: true,
                    showCartButton: true,
                    showDeleteButton: false,
                  })}
                />
              </Animated.View>
            ))}
          </View>
        )}

        {filteredCocktails.length === 0 && (
          <Animated.View entering={FadeIn.delay(300).duration(600)} style={styles.emptyState}>
            <Heading level={3} style={styles.emptyText}>
              {searchQuery ? 'No results found' : 'No cocktails found for this mood'}
            </Heading>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'Try a different search term or clear the search to see all mocktails'
                : 'Try exploring other moods or check back later for new additions!'}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Grocery List Modal */}
      {selectedRecipe && (
        <GroceryListModal
          visible={groceryListVisible}
          onClose={() => {
            setGroceryListVisible(false);
            setSelectedRecipe(null);
          }}
          recipeName={selectedRecipe.name || selectedRecipe.title}
          ingredients={selectedRecipe.ingredients || []}
          recipeId={selectedRecipe.id}
        />
      )}
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing(2),
  },
  loadingText: {
    fontSize: fonts.body,
    color: colors.subtext,
    marginTop: spacing(1),
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing(4),
  },
  searchContainer: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
    paddingBottom: spacing(3),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(2),
    height: 48,
  },
  searchIcon: {
    marginRight: spacing(1.5),
  },
  searchInput: {
    flex: 1,
    fontSize: fonts.body,
    color: colors.text,
    paddingVertical: spacing(1.5),
  },
  clearButton: {
    padding: spacing(1),
    marginLeft: spacing(1),
  },
  categorizedContent: {
    paddingHorizontal: spacing(3),
  },
  subcategorySection: {
    marginBottom: spacing(3),
  },
  subcategoryTitle: {
    marginBottom: spacing(2),
    paddingLeft: spacing(2),
  },
  horizontalScrollContent: {
    paddingLeft: spacing(2),
    gap: spacing(2),
  },
  horizontalCard: {
    width: 240,
  },
  cocktailGrid: {
    padding: spacing(3),
    gap: spacing(2),
  },
  cocktailCard: {
    marginBottom: spacing(2),
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(4),
    marginTop: spacing(8),
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing(1),
  },
  emptySubtext: {
    fontSize: fonts.body,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
  },
});
