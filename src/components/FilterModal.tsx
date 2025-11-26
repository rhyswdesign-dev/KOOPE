import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import type { FilterOptions } from '../services/searchService';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: Partial<FilterOptions>;
  onApplyFilters: (filters: Partial<FilterOptions>) => void;
}

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];
const CATEGORIES = ['cocktails', 'shots', 'mocktails', 'syrups'];
const COMMON_INGREDIENTS = [
  'vodka',
  'gin',
  'rum',
  'tequila',
  'whiskey',
  'bourbon',
  'lime',
  'lemon',
  'mint',
  'sugar',
  'simple syrup',
  'soda water',
];

/**
 * FilterModal Component
 *
 * Advanced filtering UI for recipe search
 */
export default function FilterModal({
  visible,
  onClose,
  filters,
  onApplyFilters,
}: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState<Partial<FilterOptions>>(filters);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: Partial<FilterOptions> = {};
    setLocalFilters(resetFilters);
    onApplyFilters(resetFilters);
  };

  const toggleDifficulty = (difficulty: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      difficulty: prev.difficulty === difficulty ? undefined : difficulty,
    }));
  };

  const toggleCategory = (category: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      category: prev.category === category ? undefined : category,
    }));
  };

  const toggleIngredient = (ingredient: string) => {
    const currentIngredients = localFilters.ingredients || [];
    const hasIngredient = currentIngredients.includes(ingredient);

    setLocalFilters((prev) => ({
      ...prev,
      ingredients: hasIngredient
        ? currentIngredients.filter((i) => i !== ingredient)
        : [...currentIngredients, ingredient],
    }));
  };

  const activeFilterCount =
    (localFilters.difficulty ? 1 : 0) +
    (localFilters.category ? 1 : 0) +
    (localFilters.ingredients?.length || 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Filters</Text>
            {activeFilterCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Difficulty Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Difficulty</Text>
            <View style={styles.chipContainer}>
              {DIFFICULTY_LEVELS.map((level) => {
                const isSelected = localFilters.difficulty === level;
                return (
                  <TouchableOpacity
                    key={level}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleDifficulty(level)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Category Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.chipContainer}>
              {CATEGORIES.map((category) => {
                const isSelected = localFilters.category === category;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleCategory(category)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Ingredients Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Common Ingredients</Text>
            <View style={styles.chipContainer}>
              {COMMON_INGREDIENTS.map((ingredient) => {
                const isSelected = localFilters.ingredients?.includes(ingredient);
                return (
                  <TouchableOpacity
                    key={ingredient}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleIngredient(ingredient)}
                  >
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={colors.bg}
                        style={styles.chipIcon}
                      />
                    )}
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {ingredient.charAt(0).toUpperCase() + ingredient.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
            disabled={activeFilterCount === 0}
          >
            <Text style={[
              styles.resetButtonText,
              activeFilterCount === 0 && styles.resetButtonTextDisabled
            ]}>
              Reset All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>
              Apply {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(1),
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.bg,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing(3),
  },
  section: {
    marginTop: spacing(4),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1.5),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipIcon: {
    marginRight: spacing(0.5),
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.bg,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    gap: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  resetButton: {
    flex: 1,
    paddingVertical: spacing(2),
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.line,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  resetButtonTextDisabled: {
    color: colors.muted,
  },
  applyButton: {
    flex: 2,
    paddingVertical: spacing(2),
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.bg,
  },
});
