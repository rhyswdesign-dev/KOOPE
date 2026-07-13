/**
 * ADVANCED SEARCH FILTERS COMPONENT
 * Comprehensive filtering interface for cocktail recipes and content
 * Includes ingredient filters, difficulty, ABV range, time filters, and sorting
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { colors, spacing, radii } from '../../theme/tokens';
import { FilterOptions } from '../../services/searchService';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface AdvancedFilterState {
  categories: string[];
  difficulties: string[];
  abvRange: [number, number];
  timeRange: [number, number];
  ingredients: string[];
  equipment: string[];
  tags: string[];
  sortBy: FilterOptions['sortBy'];
  sortOrder: FilterOptions['sortOrder'];
  showOnlyFavorites: boolean;
  showOnlyCompleted: boolean;
}

interface AdvancedFiltersProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: AdvancedFilterState) => void;
  currentFilters: AdvancedFilterState;
  availableOptions: {
    categories: { key: string; label: string; count: number }[];
    difficulties: { key: string; label: string; count: number }[];
    abvRange: [number, number];
    timeRange: [number, number];
  };
}

const DEFAULT_FILTERS: AdvancedFilterState = {
  categories: [],
  difficulties: [],
  abvRange: [0, 50],
  timeRange: [0, 60],
  ingredients: [],
  equipment: [],
  tags: [],
  sortBy: 'relevance',
  sortOrder: 'desc',
  showOnlyFavorites: false,
  showOnlyCompleted: false,
};

// Common ingredients in cocktails
const COMMON_INGREDIENTS = [
  'Whiskey', 'Vodka', 'Gin', 'Rum', 'Tequila', 'Brandy',
  'Bourbon', 'Scotch', 'Rye', 'Champagne', 'Wine',
  'Simple Syrup', 'Sugar', 'Honey', 'Agave',
  'Lemon', 'Lime', 'Orange', 'Grapefruit', 'Cherry',
  'Bitters', 'Angostura', 'Orange Bitters', 'Peychaud',
  'Vermouth', 'Dry Vermouth', 'Sweet Vermouth',
  'Triple Sec', 'Cointreau', 'Grand Marnier',
  'Coffee', 'Espresso', 'Cream', 'Egg White',
  'Mint', 'Basil', 'Rosemary', 'Thyme',
  'Ginger', 'Jalapeño', 'Cucumber', 'Celery',
];

const COCKTAIL_EQUIPMENT = [
  'Shaker', 'Strainer', 'Jigger', 'Bar Spoon',
  'Muddler', 'Citrus Juicer', 'Fine Strainer',
  'Mixing Glass', 'Cocktail Pick', 'Channel Knife',
];

const COCKTAIL_TAGS = [
  'Classic', 'Modern', 'Tiki', 'Prohibition Era',
  'Stirred', 'Shaken', 'Built', 'Layered',
  'Smoky', 'Spicy', 'Sweet', 'Sour', 'Bitter',
  'Refreshing', 'Strong', 'Light', 'Creamy',
  'Festive', 'Seasonal', 'Summer', 'Winter',
];

export default function AdvancedFilters({
  visible,
  onClose,
  onApply,
  currentFilters,
  availableOptions,
}: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<AdvancedFilterState>(currentFilters);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setFilters(currentFilters);
    }
  }, [visible, currentFilters]);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const updateFilter = <K extends keyof AdvancedFilterState>(
    key: K,
    value: AdvancedFilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (array: string[], item: string): string[] => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const getAppliedFiltersCount = (): number => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.difficulties.length > 0) count++;
    if (filters.ingredients.length > 0) count++;
    if (filters.equipment.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.showOnlyFavorites) count++;
    if (filters.showOnlyCompleted) count++;
    return count;
  };

  const renderSectionHeader = (title: string, icon: IoniconName, sectionKey: string) => (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => setActiveSection(activeSection === sectionKey ? null : sectionKey)}
    >
      <View style={styles.sectionHeaderContent}>
        <Ionicons name={icon} size={20} color={colors.accent} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Ionicons
        name={activeSection === sectionKey ? 'chevron-up' : 'chevron-down'}
        size={20}
        color={colors.subtext}
      />
    </TouchableOpacity>
  );

  const renderChipSelection = (
    items: string[],
    selectedItems: string[],
    onToggle: (item: string) => void,
    limit?: number
  ) => (
    <View style={styles.chipContainer}>
      {items.slice(0, limit).map(item => (
        <TouchableOpacity
          key={item}
          style={[
            styles.chip,
            selectedItems.includes(item) && styles.chipSelected,
          ]}
          onPress={() => onToggle(item)}
        >
          <Text
            style={[
              styles.chipText,
              selectedItems.includes(item) && styles.chipTextSelected,
            ]}
          >
            {item}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRangeSlider = (
    label: string,
    value: [number, number],
    range: [number, number],
    unit: string,
    onChange: (value: [number, number]) => void
  ) => (
    <View style={styles.rangeContainer}>
      <View style={styles.rangeHeader}>
        <Text style={styles.rangeLabel}>{label}</Text>
        <Text style={styles.rangeValue}>
          {value[0]}{unit} - {value[1]}{unit}
        </Text>
      </View>
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={range[0]}
          maximumValue={range[1]}
          value={value[0]}
          onValueChange={(val) => onChange([val, value[1]])}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.line}
          thumbTintColor={colors.accent}
        />
        <Slider
          style={styles.slider}
          minimumValue={range[0]}
          maximumValue={range[1]}
          value={value[1]}
          onValueChange={(val) => onChange([value[0], val])}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.line}
          thumbTintColor={colors.accent}
        />
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.headerButton}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Filters</Text>
            {getAppliedFiltersCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getAppliedFiltersCount()}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={handleReset}>
            <Text style={styles.headerButton}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Categories */}
          <View style={styles.section}>
            {renderSectionHeader('Categories', 'grid-outline', 'categories')}
            {activeSection === 'categories' && (
              <View style={styles.sectionContent}>
                {availableOptions.categories.map(category => (
                  <TouchableOpacity
                    key={category.key}
                    style={[
                      styles.optionItem,
                      filters.categories.includes(category.key) && styles.optionItemSelected,
                    ]}
                    onPress={() =>
                      updateFilter('categories', toggleArrayItem(filters.categories, category.key))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        filters.categories.includes(category.key) && styles.optionTextSelected,
                      ]}
                    >
                      {category.label}
                    </Text>
                    <Text style={styles.optionCount}>({category.count})</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Difficulty */}
          <View style={styles.section}>
            {renderSectionHeader('Difficulty', 'bar-chart-outline', 'difficulty')}
            {activeSection === 'difficulty' && (
              <View style={styles.sectionContent}>
                {availableOptions.difficulties.map(difficulty => (
                  <TouchableOpacity
                    key={difficulty.key}
                    style={[
                      styles.optionItem,
                      filters.difficulties.includes(difficulty.key) && styles.optionItemSelected,
                    ]}
                    onPress={() =>
                      updateFilter('difficulties', toggleArrayItem(filters.difficulties, difficulty.key))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        filters.difficulties.includes(difficulty.key) && styles.optionTextSelected,
                      ]}
                    >
                      {difficulty.label}
                    </Text>
                    <Text style={styles.optionCount}>({difficulty.count})</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            {renderSectionHeader('Ingredients', 'leaf-outline', 'ingredients')}
            {activeSection === 'ingredients' && (
              <View style={styles.sectionContent}>
                {renderChipSelection(
                  COMMON_INGREDIENTS,
                  filters.ingredients,
                  (ingredient) =>
                    updateFilter('ingredients', toggleArrayItem(filters.ingredients, ingredient)),
                  20
                )}
              </View>
            )}
          </View>

          {/* Equipment */}
          <View style={styles.section}>
            {renderSectionHeader('Equipment', 'hardware-chip-outline', 'equipment')}
            {activeSection === 'equipment' && (
              <View style={styles.sectionContent}>
                {renderChipSelection(
                  COCKTAIL_EQUIPMENT,
                  filters.equipment,
                  (equipment) =>
                    updateFilter('equipment', toggleArrayItem(filters.equipment, equipment))
                )}
              </View>
            )}
          </View>

          {/* Tags */}
          <View style={styles.section}>
            {renderSectionHeader('Style & Tags', 'pricetag-outline', 'tags')}
            {activeSection === 'tags' && (
              <View style={styles.sectionContent}>
                {renderChipSelection(
                  COCKTAIL_TAGS,
                  filters.tags,
                  (tag) => updateFilter('tags', toggleArrayItem(filters.tags, tag)),
                  15
                )}
              </View>
            )}
          </View>

          {/* ABV Range */}
          <View style={styles.section}>
            {renderSectionHeader('Alcohol Content', 'thermometer-outline', 'abv')}
            {activeSection === 'abv' && (
              <View style={styles.sectionContent}>
                {renderRangeSlider(
                  'ABV Range',
                  filters.abvRange,
                  availableOptions.abvRange,
                  '%',
                  (value) => updateFilter('abvRange', value)
                )}
              </View>
            )}
          </View>

          {/* Time Range */}
          <View style={styles.section}>
            {renderSectionHeader('Preparation Time', 'time-outline', 'time')}
            {activeSection === 'time' && (
              <View style={styles.sectionContent}>
                {renderRangeSlider(
                  'Time Range',
                  filters.timeRange,
                  availableOptions.timeRange,
                  'm',
                  (value) => updateFilter('timeRange', value)
                )}
              </View>
            )}
          </View>

          {/* Sort Options */}
          <View style={styles.section}>
            {renderSectionHeader('Sort By', 'funnel-outline', 'sort')}
            {activeSection === 'sort' && (
              <View style={styles.sectionContent}>
                {[
                  { key: 'relevance', label: 'Relevance' },
                  { key: 'popularity', label: 'Popularity' },
                  { key: 'recent', label: 'Recently Added' },
                  { key: 'difficulty', label: 'Difficulty' },
                  { key: 'time', label: 'Preparation Time' },
                  { key: 'abv', label: 'Alcohol Content' },
                ].map(sort => (
                  <TouchableOpacity
                    key={sort.key}
                    style={[
                      styles.optionItem,
                      filters.sortBy === sort.key && styles.optionItemSelected,
                    ]}
                    onPress={() => updateFilter('sortBy', sort.key as FilterOptions['sortBy'])}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        filters.sortBy === sort.key && styles.optionTextSelected,
                      ]}
                    >
                      {sort.label}
                    </Text>
                    {filters.sortBy === sort.key && (
                      <TouchableOpacity
                        onPress={() =>
                          updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')
                        }
                      >
                        <Ionicons
                          name={filters.sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                          size={16}
                          color={colors.accent}
                        />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Quick Filters */}
          <View style={styles.section}>
            {renderSectionHeader('Quick Filters', 'flash-outline', 'quick')}
            {activeSection === 'quick' && (
              <View style={styles.sectionContent}>
                <View style={styles.switchOption}>
                  <Text style={styles.switchLabel}>Favorites Only</Text>
                  <Switch
                    value={filters.showOnlyFavorites}
                    onValueChange={(value) => updateFilter('showOnlyFavorites', value)}
                    trackColor={{ false: colors.line, true: colors.accent + '80' }}
                    thumbColor={filters.showOnlyFavorites ? colors.accent : colors.subtext}
                  />
                </View>
                <View style={styles.switchOption}>
                  <Text style={styles.switchLabel}>Completed Recipes</Text>
                  <Switch
                    value={filters.showOnlyCompleted}
                    onValueChange={(value) => updateFilter('showOnlyCompleted', value)}
                    trackColor={{ false: colors.line, true: colors.accent + '80' }}
                    thumbColor={filters.showOnlyCompleted ? colors.accent : colors.subtext}
                  />
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Apply Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>
              Apply Filters {getAppliedFiltersCount() > 0 && `(${getAppliedFiltersCount()})`}
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
  headerButton: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  filterBadge: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.25),
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: spacing(1),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: colors.card,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sectionContent: {
    backgroundColor: colors.bg,
    paddingVertical: spacing(2),
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  optionItemSelected: {
    backgroundColor: colors.accent + '10',
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  optionCount: {
    fontSize: 14,
    color: colors.subtext,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing(3),
    gap: spacing(1),
  },
  chip: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  rangeContainer: {
    paddingHorizontal: spacing(3),
  },
  rangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  rangeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  rangeValue: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  sliderContainer: {
    gap: spacing(1),
  },
  slider: {
    height: 40,
  },
  switchOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  switchLabel: {
    fontSize: 16,
    color: colors.text,
  },
  footer: {
    padding: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  applyButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(2),
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
