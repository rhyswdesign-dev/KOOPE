import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
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

const CATEGORIES = ['cocktails', 'shots', 'mocktails', 'syrups', 'variations'];
const SORT_OPTIONS: Array<{ label: string; value: FilterOptions['sortOrder'] }> = [
  { label: 'A to Z', value: 'alphabetical-asc' },
  { label: 'Z to A', value: 'alphabetical-desc' },
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

  useEffect(() => {
    if (!visible) return;
    setLocalFilters(filters);
  }, [visible, filters]);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: Partial<FilterOptions> = {
      category: [],
      sortOrder: 'alphabetical-asc',
    };
    setLocalFilters(resetFilters);
    onApplyFilters(resetFilters);
  };

  const normalizeToArray = (value?: string[] | string): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
  };

  const toggleCategory = (category: string) => {
    const selectedCategories = normalizeToArray(localFilters.category);
    const hasCategory = selectedCategories.includes(category);
    setLocalFilters((prev) => ({
      ...prev,
      category: hasCategory
        ? selectedCategories.filter((c) => c !== category)
        : [...selectedCategories, category],
    }));
  };

  const toggleSort = (sortOrder: FilterOptions['sortOrder']) => {
    setLocalFilters((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === sortOrder ? 'alphabetical-asc' : sortOrder,
    }));
  };

  const selectedCategories = normalizeToArray(localFilters.category);
  const activeFilterCount =
    selectedCategories.length +
    (localFilters.sortOrder && localFilters.sortOrder !== 'alphabetical-asc' ? 1 : 0);

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
            <Text style={styles.headerTitle}>Basic Filters</Text>
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
          <Text style={styles.helperText}>
            Quick browsing filters only. Use Advanced for spirit, mood, and difficulty.
          </Text>

          {/* Basic Category Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.chipContainer}>
              {CATEGORIES.map((category) => {
                const isSelected = selectedCategories.includes(category);
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

          {/* Basic Sort Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sort</Text>
            <View style={styles.chipContainer}>
              {SORT_OPTIONS.map((option) => {
                const isSelected = localFilters.sortOrder === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleSort(option.value)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {option.label}
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
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214,138,56,0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'Georgia',
  },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(0.75),
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.bg,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing(3),
  },
  helperText: {
    marginTop: spacing(2),
    fontSize: 13,
    color: colors.subtext,
  },
  section: {
    marginTop: spacing(4),
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
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
    borderRadius: radii.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.subtext,
  },
  chipTextSelected: {
    color: colors.goldText,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    gap: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  resetButton: {
    flex: 1,
    paddingVertical: spacing(2),
    borderRadius: radii.pill,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.subtext,
  },
  resetButtonTextDisabled: {
    color: colors.muted,
  },
  applyButton: {
    flex: 2,
    paddingVertical: spacing(2),
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.goldText,
  },
});
