/**
 * Missing Ingredients Banner
 * Shows what ingredients the user is missing for a recipe and
 * allows PLUS+ users to add them directly to their shopping list.
 *
 * FREE users see a locked teaser with upgrade prompt.
 * PLUS+ users see the full list with "Add to Shopping List" action.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import type { UserTier } from '../config/tierAccess';

interface MissingIngredientsBannerProps {
  /** Ingredients the user is missing */
  missingIngredients: string[];
  /** How many cocktails this recipe matches (0-100) */
  matchPercent: number;
  /** User's subscription tier */
  tier: UserTier;
  /** Called when user taps "Add to Shopping List" (PLUS+ only) */
  onAddToShoppingList?: (ingredients: string[]) => void;
  /** Called when FREE user taps the locked banner (show paywall) */
  onUpgrade?: () => void;
  /** Custom style */
  style?: ViewStyle;
}

export default function MissingIngredientsBanner({
  missingIngredients,
  matchPercent,
  tier,
  onAddToShoppingList,
  onUpgrade,
  style,
}: MissingIngredientsBannerProps) {
  const navigation = useNavigation<any>();
  if (missingIngredients.length === 0) return null;

  const canAddToList = tier !== 'FREE';
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
      return;
    }

    const params = { source: 'missing_ingredients_banner', displayCloseButton: true };
    const parentNavigation = navigation.getParent?.();
    if (parentNavigation) {
      parentNavigation.navigate('Paywall', params);
    } else {
      navigation.navigate('Paywall', params);
    }
  };

  // FREE users see a teaser
  if (!canAddToList) {
    return (
      <TouchableOpacity
        style={[styles.lockedBanner, style]}
        activeOpacity={0.8}
        onPress={handleUpgrade}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Missing ${missingIngredients.length} ingredients. Upgrade to add them to your shopping list.`}
      >
        <View style={styles.lockedIconContainer}>
          <Ionicons name="cart-outline" size={20} color={colors.gold} />
        </View>
        <View style={styles.lockedContent}>
          <Text style={styles.lockedTitle}>
            {missingIngredients.length === 1
              ? '1 ingredient away'
              : `${missingIngredients.length} ingredients away`}
          </Text>
          <Text style={styles.lockedSubtitle}>
            Upgrade to KOOPE+ to add missing ingredients to your shopping list
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
      </TouchableOpacity>
    );
  }

  // PLUS+ users see the full list
  return (
    <View style={[styles.banner, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="cart-outline" size={18} color={colors.accent} />
          <Text style={styles.headerTitle}>
            {missingIngredients.length === 1
              ? '1 Ingredient Away'
              : `${missingIngredients.length} Ingredients Away`}
          </Text>
        </View>
        <View style={styles.matchBadge}>
          <Text style={styles.matchText}>{matchPercent}% match</Text>
        </View>
      </View>

      {/* Missing ingredient list */}
      <View style={styles.ingredientList}>
        {missingIngredients.slice(0, 5).map((name) => (
          <View key={name} style={styles.ingredientRow}>
            <Ionicons name="add-circle-outline" size={16} color={colors.accent} />
            <Text style={styles.ingredientName} numberOfLines={1}>{name}</Text>
          </View>
        ))}
        {missingIngredients.length > 5 && (
          <Text style={styles.moreText}>
            +{missingIngredients.length - 5} more
          </Text>
        )}
      </View>

      {/* Add to shopping list CTA */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => onAddToShoppingList?.(missingIngredients)}
        activeOpacity={0.8}
      >
        <Ionicons name="cart" size={16} color="#FFF" />
        <Text style={styles.addButtonText}>Add to Shopping List</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Locked banner (FREE)
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#261C16',
    borderRadius: radii.lg,
    padding: spacing(2.5),
    borderWidth: 1,
    borderColor: colors.gold + '30',
  },
  lockedIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gold + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing(1.5),
  },
  lockedContent: {
    flex: 1,
  },
  lockedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  lockedSubtitle: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2,
  },

  // Full banner (PLUS+)
  banner: {
    backgroundColor: '#261C16',
    borderRadius: radii.lg,
    padding: spacing(2.5),
    borderWidth: 1,
    borderColor: colors.accent + '20',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(1.5),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  matchBadge: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: spacing(1),
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  matchText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
  },
  ingredientList: {
    gap: spacing(0.75),
    marginBottom: spacing(2),
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  ingredientName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  moreText: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: spacing(0.5),
    marginLeft: spacing(3),
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.5),
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});
