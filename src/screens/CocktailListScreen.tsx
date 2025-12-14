import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, fonts } from '../theme/tokens';
import RecipeCard from '../components/RecipeCard';
import GroceryListModal from '../components/GroceryListModal';
import { createRecipeCardProps } from '../utils/recipeActions';
import { useSession } from '../store/useSession';
import { RecipesRepository } from '../repos/supabase';
import { log } from '../lib/logger';

interface CocktailListScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any, any>;
}

export default function CocktailListScreen({ navigation, route }: CocktailListScreenProps) {
  const { title, cocktailIds, category } = route.params;
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [groceryListVisible, setGroceryListVisible] = useState(false);
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    toggleSavedCocktail,
    isCocktailSaved,
  } = useSession();

  // Fetch all recipes from Supabase on mount
  useEffect(() => {
    async function loadRecipes() {
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
  }, []);

  // Find cocktails by ID from Supabase data
  const validCocktails = useMemo(() => {
    if (!cocktailIds || !Array.isArray(cocktailIds) || allRecipes.length === 0) return [];

    return cocktailIds.map(id => {
      return allRecipes.find(cocktail =>
        cocktail.id === id ||
        cocktail.id === id.replace(/-/g, '') ||
        (cocktail.title || cocktail.name)?.toLowerCase().replace(/[^a-z0-9]/g, '-') === id ||
        (cocktail.title || cocktail.name)?.toLowerCase().replace(/[^a-z0-9]/g, '') === id.replace(/-/g, '')
      );
    }).filter(Boolean);
  }, [cocktailIds, allRecipes]);

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
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {validCocktails.length} {category === 'syrups' ? (validCocktails.length === 1 ? 'recipe' : 'recipes') : (validCocktails.length === 1 ? 'cocktail' : 'cocktails')}
          </Text>
        </Animated.View>

        {/* Cocktail List */}
        <View style={styles.cocktailGrid}>
          {validCocktails.map((cocktail, index) => (
            <Animated.View
              key={cocktail.id}
              entering={FadeInDown.delay(index * 100).duration(500).springify()}
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

        {validCocktails.length === 0 && (
          <Animated.View entering={FadeIn.delay(300).duration(600)} style={styles.emptyState}>
            <Text style={styles.emptyText}>No cocktails found for this mood</Text>
            <Text style={styles.emptySubtext}>
              Try exploring other moods or check back later for new additions!
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
  header: {
    padding: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: {
    fontSize: fonts.h2,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  subtitle: {
    fontSize: fonts.body,
    color: colors.subtext,
    fontWeight: '500',
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
    fontSize: fonts.h3,
    fontWeight: '600',
    color: colors.text,
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