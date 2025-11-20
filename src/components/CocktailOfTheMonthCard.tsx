/**
 * Cocktail of the Month Featured Card
 * Displays a highlighted featured cocktail that changes monthly
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { Recipe } from '../types/recipe';
import { getWeekDateRange } from '../services/cocktailOfTheMonth';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - spacing(4);

interface CocktailOfTheMonthCardProps {
  recipe: Recipe;
  onPress: (recipe: Recipe) => void;
  style?: any;
}

export default function CocktailOfTheMonthCard({
  recipe,
  onPress,
  style,
}: CocktailOfTheMonthCardProps) {
  const weekRange = getWeekDateRange();

  return (
    <Animated.View
      entering={FadeInDown.duration(600).springify()}
      style={[styles.container, style]}
    >
      <Pressable
        style={styles.card}
        onPress={() => onPress(recipe)}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
      >
        {/* Background Image */}
        <Image
          source={typeof recipe.image === 'string' ? { uri: recipe.image } : recipe.image}
          style={styles.backgroundImage}
        />

        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
          style={styles.gradient}
        />

        {/* Badge */}
        <View style={styles.badge}>
          <Ionicons name="star" size={16} color={colors.goldText} />
          <Text style={styles.badgeText}>Featured</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.label}>Cocktail of the Week</Text>
          <Text style={styles.weekRange}>{weekRange}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {recipe.title || recipe.name}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {recipe.description}
          </Text>

          {/* Meta Info */}
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={colors.gold} />
              <Text style={styles.metaText}>{recipe.time || `${recipe.preparationTime} min`}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="flash-outline" size={16} color={colors.gold} />
              <Text style={styles.metaText}>{recipe.difficulty}</Text>
            </View>
            {recipe.baseSpirit && (
              <View style={styles.metaItem}>
                <Ionicons name="wine-outline" size={16} color={colors.gold} />
                <Text style={styles.metaText}>{recipe.baseSpirit}</Text>
              </View>
            )}
          </View>

          {/* CTA */}
          <View style={styles.cta}>
            <Text style={styles.ctaText}>View Recipe</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.goldText} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing(2),
  },
  card: {
    width: CARD_WIDTH,
    height: 320,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: spacing(2),
    right: spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gold,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.full,
    gap: spacing(0.5),
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.goldText,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing(3),
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing(0.25),
  },
  weekRange: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.subtext,
    marginBottom: spacing(0.75),
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
    lineHeight: 32,
  },
  description: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(2),
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
    marginBottom: spacing(2),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  metaText: {
    fontSize: 12,
    color: colors.gold,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingTop: spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.goldText,
  },
});
