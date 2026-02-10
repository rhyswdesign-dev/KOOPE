// src/screens/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { getCocktailOfTheMonth } from '../services/cocktailOfTheMonth';
import { RecipesRepository } from '../repos/supabase';
import CocktailOfTheMonthCard from '../components/CocktailOfTheMonthCard';
import { Recipe } from '../types/recipe';
import { log } from '../lib/logger';
import { Heading } from '../components/ui';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [featuredRecipe, setFeaturedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedCocktail();
  }, []);

  async function loadFeaturedCocktail() {
    try {
      setLoading(true);
      const cocktailId = await getCocktailOfTheMonth();
      const recipe = await RecipesRepository.getRecipeById(cocktailId);
      if (recipe) {
        setFeaturedRecipe(recipe);
      }
    } catch (error) {
      log.error('HomeScreen', 'Failed to load featured cocktail', error as Error);
    } finally {
      setLoading(false);
    }
  }

  const handleRecipePress = (recipe: Recipe) => {
    navigation.navigate('CocktailDetail', { cocktailId: recipe.id });
  };

  return (
    <LinearGradient
      colors={['rgba(0,0,0,0)', '#1A120D']}
      style={styles.background}
    >
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <Heading level={1} style={styles.title}>Home</Heading>

          {/* Cocktail of the Month */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.gold} />
            </View>
          ) : featuredRecipe ? (
            <CocktailOfTheMonthCard
              recipe={featuredRecipe}
              onPress={handleRecipePress}
              style={styles.featuredCard}
            />
          ) : null}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  background: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing(4),
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(6),
  },
  loadingContainer: {
    width: '100%',
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(3),
  },
  featuredCard: {
    marginBottom: spacing(3),
  },
  title: {
    marginBottom: spacing(4),
  },
  demoButton: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    padding: spacing(3),
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  demoButtonEmoji: {
    fontSize: 48,
    marginBottom: spacing(1),
  },
  demoButtonTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.goldText,
    marginBottom: spacing(0.5),
  },
  demoButtonSubtitle: {
    fontSize: 14,
    color: colors.goldText,
    opacity: 0.9,
    textAlign: 'center',
  },
  infoBox: {
    marginTop: spacing(4),
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(2.5),
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: colors.line,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1.5),
    fontFamily: serif,
  },
  infoItem: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(0.75),
    lineHeight: 20,
  },
});