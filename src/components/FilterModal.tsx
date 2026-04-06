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
import { colors, spacing, radii, serif } from '../theme/tokens';
import type { FilterOptions } from '../services/searchService';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: Partial<FilterOptions>;
  onApplyFilters: (filters: Partial<FilterOptions>) => void;
}

const CATEGORIES: Array<{
  value: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
  { value: 'cocktails', label: 'Cocktails', icon: 'wine-outline' },
  { value: 'shots', label: 'Shots', icon: 'flash-outline' },
  { value: 'mocktails', label: 'Mocktails', icon: 'leaf-outline' },
  { value: 'syrups', label: 'Syrups', icon: 'water-outline' },
  { value: 'variations', label: 'Variations', icon: 'shuffle-outline' },
];

const SORT_OPTIONS: Array<{
  label: string;
  value: FilterOptions['sortOrder'];
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
  { label: 'A to Z', value: 'alphabetical-asc', icon: 'arrow-up-outline' },
  { label: 'Z to A', value: 'alphabetical-desc', icon: 'arrow-down-outline' },
];

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
      transparent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      {/* Sheet — anchored to bottom, sizes to content */}
      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        {/* Drag handle */}
        <View style={styles.handle} />

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
          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <Ionicons name="close" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.helperText}>
          Quick browsing filters only. Use Advanced for spirit, mood, and difficulty.
        </Text>

        {/* Category */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>CATEGORY</Text>
            <View style={styles.sectionRule} />
          </View>
          <View style={styles.chipContainer}>
            {CATEGORIES.map(({ value, label, icon }) => {
              const isSelected = selectedCategories.includes(value);
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleCategory(value)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={icon}
                    size={13}
                    color={isSelected ? colors.goldText : colors.subtext}
                  />
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Sort */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>SORT</Text>
            <View style={styles.sectionRule} />
          </View>
          <View style={styles.chipContainer}>
            {SORT_OPTIONS.map((option) => {
              const isSelected = localFilters.sortOrder === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleSort(option.value)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={option.icon}
                    size={13}
                    color={isSelected ? colors.goldText : colors.subtext}
                  />
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.resetButton, activeFilterCount === 0 && styles.resetButtonDisabled]}
            onPress={handleReset}
            disabled={activeFilterCount === 0}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.resetButtonText,
              activeFilterCount === 0 && styles.resetButtonTextDisabled,
            ]}>
              Reset All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.85}>
            <Text style={styles.applyButtonText}>
              Apply{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214,138,56,0.3)',
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(1),
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginTop: spacing(1.5),
    marginBottom: spacing(0.5),
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing(1.5),
    paddingBottom: spacing(1),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
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
    fontWeight: '800',
    color: colors.goldText,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  helperText: {
    marginTop: spacing(1),
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.subtext,
    opacity: 0.75,
    lineHeight: 17,
  },

  // Section
  section: {
    marginTop: spacing(2),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    marginBottom: spacing(1.5),
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 2,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(214,138,56,0.18)',
  },

  // Chips
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1.25),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.25),
    borderRadius: radii.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.2)',
    gap: spacing(0.75),
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  chipIcon: {
    // inherits color from prop
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
  },
  chipTextSelected: {
    color: colors.goldText,
    fontWeight: '700',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    paddingTop: spacing(2),
    paddingBottom: spacing(1),
    gap: spacing(2),
  },
  resetButton: {
    flex: 1,
    paddingVertical: spacing(1.75),
    borderRadius: radii.pill,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  resetButtonDisabled: {
    borderColor: 'rgba(255,255,255,0.07)',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.subtext,
  },
  resetButtonTextDisabled: {
    color: colors.muted,
  },
  applyButton: {
    flex: 2,
    paddingVertical: spacing(1.75),
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.goldText,
    letterSpacing: 0.3,
  },
});
