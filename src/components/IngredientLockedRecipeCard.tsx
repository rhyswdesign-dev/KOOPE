/**
 * Ingredient-Locked Recipe Card
 * Shows a recipe that the user is CLOSE to making — just missing 1-2 ingredients.
 * Tier-gated detail level:
 *   FREE:  Thumbnail + name only (creates desire)
 *   PLUS:  Thumbnail + name + description + Taste Match % + ingredients
 *   PRO:   Everything PLUS shows + flavor tags + complexity + match reasoning
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { UserTier } from '../config/tierAccess';

interface IngredientLockedRecipeCardProps {
  /** Recipe title */
  title: string;
  /** Recipe description */
  description?: string;
  /** Cocktail thumbnail image */
  image: any;
  /** Ingredients the user is missing */
  missingIngredients: string[];
  /** How many ingredients they have vs need (0-100) */
  matchPercent: number;
  /** Taste Match % from taste profile (KOOPE+ only) */
  tasteMatchPercent?: number;
  /** Flavor tags on this recipe (KOOPE+ visible, PRO adjustable) */
  flavorTags?: string[];
  /** User's current tier — controls detail level */
  tier: UserTier;
  /** Tap handler */
  onPress?: () => void;
  /** Custom styling */
  style?: ViewStyle;
}

export default function IngredientLockedRecipeCard({
  title,
  description,
  image,
  missingIngredients,
  matchPercent,
  tasteMatchPercent,
  flavorTags,
  tier,
  onPress,
  style,
}: IngredientLockedRecipeCardProps) {
  const showDescription = tier !== 'FREE';
  const showTasteMatch = tier !== 'FREE' && tasteMatchPercent !== undefined;
  const showFlavorTags = tier !== 'FREE' && flavorTags && flavorTags.length > 0;
  const showIngredientList = tier !== 'FREE';

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${title} — missing ${missingIngredients.length} ingredient${missingIngredients.length !== 1 ? 's' : ''}`}
    >
      <ImageBackground
        source={image}
        style={styles.imageBackground}
        imageStyle={styles.image}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Taste Match badge (KOOPE+ and PRO only) */}
        {showTasteMatch && (
          <View style={styles.tasteMatchBadge}>
            <Ionicons name="heart" size={12} color={getTasteMatchColor(tasteMatchPercent!)} />
            <Text style={[styles.tasteMatchText, { color: getTasteMatchColor(tasteMatchPercent!) }]}>
              {tasteMatchPercent}% Match
            </Text>
          </View>
        )}

        {/* Missing ingredient count badge */}
        <View style={styles.missingBadge}>
          <Ionicons name="cart-outline" size={14} color={colors.accent} />
          <Text style={styles.missingBadgeText}>
            {missingIngredients.length === 1
              ? '1 ingredient away'
              : `${missingIngredients.length} ingredients away`}
          </Text>
        </View>

        {/* Bottom content area */}
        <View style={styles.contentArea}>
          {/* Title — always shown */}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>

          {/* Description — PLUS and PRO only */}
          {showDescription && description && (
            <Text style={styles.description} numberOfLines={2}>{description}</Text>
          )}

          {/* Flavor tags — PLUS and PRO only */}
          {showFlavorTags && (
            <View style={styles.flavorTagRow}>
              {flavorTags!.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.flavorTag}>
                  <Text style={styles.flavorTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Missing ingredients list — PLUS and PRO only */}
          {showIngredientList && (
            <View style={styles.missingList}>
              {missingIngredients.slice(0, 3).map((name) => (
                <View key={name} style={styles.missingItem}>
                  <Ionicons name="add-circle-outline" size={14} color={colors.accent} />
                  <Text style={styles.missingItemText} numberOfLines={1}>{name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

function getTasteMatchColor(percent: number): string {
  if (percent >= 80) return '#4CAF50'; // Green — great match
  if (percent >= 60) return '#FFC107'; // Amber — good match
  return '#FF9800'; // Orange — okay match
}

const styles = StyleSheet.create({
  card: {
    height: 260,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  imageBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  image: {
    borderRadius: radii.lg,
  },
  tasteMatchBadge: {
    position: 'absolute',
    top: spacing(1.5),
    right: spacing(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg + 'E6',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.full,
  },
  tasteMatchText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  missingBadge: {
    position: 'absolute',
    top: spacing(1.5),
    left: spacing(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg + 'E6',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.full,
  },
  missingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
  },
  contentArea: {
    padding: spacing(2),
    gap: spacing(0.75),
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 16,
  },
  flavorTagRow: {
    flexDirection: 'row',
    gap: spacing(0.5),
    flexWrap: 'wrap',
  },
  flavorTag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing(1),
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  flavorTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'capitalize',
  },
  missingList: {
    gap: spacing(0.5),
    marginTop: spacing(0.5),
  },
  missingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  missingItemText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
});
