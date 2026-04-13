// src/screens/HomeScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { getCocktailOfTheMonth } from '../services/cocktailOfTheMonth';
import { RecipesRepository } from '../repos/supabase';
import CocktailOfTheMonthCard from '../components/CocktailOfTheMonthCard';
import { Recipe } from '../types/recipe';
import { log } from '../lib/logger';
import { Heading } from '../components/ui';

function SkeletonCard() {
  const pulseAnim = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.15, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity: pulseAnim }]}>
      <View style={styles.skeletonImageArea} />
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSubtitle} />
        <View style={styles.skeletonTag} />
      </View>
    </Animated.View>
  );
}

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

          {/* What Can I Make */}
          <TouchableOpacity
            style={styles.whatCanIMakeCard}
            onPress={() => navigation.navigate('WhatCanIMake')}
            activeOpacity={0.82}
          >
            <View style={styles.whatCanIMakeInner}>
              <View>
                <Text style={styles.whatCanIMakeLabel}>Your Bar</Text>
                <Text style={styles.whatCanIMakeTitle}>What can I make tonight?</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gold} />
            </View>
          </TouchableOpacity>

          {/* Cocktail of the Month */}
          {loading ? (
            <SkeletonCard />
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
  skeletonCard: {
    width: '100%',
    height: 320,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    marginBottom: spacing(3),
  },
  skeletonImageArea: {
    width: '100%',
    height: 200,
    backgroundColor: colors.line,
  },
  skeletonBody: {
    padding: spacing(2),
    gap: spacing(1.25),
  },
  skeletonTitle: {
    height: 20,
    width: '60%',
    borderRadius: radii.sm,
    backgroundColor: colors.line,
  },
  skeletonSubtitle: {
    height: 14,
    width: '85%',
    borderRadius: radii.sm,
    backgroundColor: colors.line,
  },
  skeletonTag: {
    height: 14,
    width: '40%',
    borderRadius: radii.sm,
    backgroundColor: colors.line,
  },
  featuredCard: {
    marginBottom: spacing(3),
  },
  whatCanIMakeCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    marginBottom: spacing(3),
  },
  whatCanIMakeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(2),
  },
  whatCanIMakeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing(0.5),
  },
  whatCanIMakeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
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