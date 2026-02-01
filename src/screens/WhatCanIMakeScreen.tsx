/**
 * What Can I Make Screen
 * Shows cocktails user can make based on their inventory
 * Allows filtering by selected ingredients
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { supabase } from '../lib/supabase';
import { InventoryService } from '../services/inventoryService';
import { useUser } from '../store/useUser';
import { sortByMatch, getMatchMessage } from '../utils/recipeMatching';
import type { Cocktail } from '../types/supabase';
import type { RecipeMatch } from '../utils/recipeMatching';
import type { UserInventoryItem } from '../types/database';
import type { RootStackParamList } from '../navigation/RootNavigator';

type CocktailWithMatch = Cocktail & { match: RecipeMatch };

export default function WhatCanIMakeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<UserInventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [cocktails, setCocktails] = useState<CocktailWithMatch[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    // Recalculate matches when selected items change
    if (inventory.length > 0) {
      matchCocktails();
    }
  }, [selectedItems, inventory]);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Load user inventory
      const userInventory = await InventoryService.getUserInventory(user.id);
      setInventory(userInventory);

      // Select all items by default
      const allItemNames = new Set(userInventory.map(item => item.item_name));
      setSelectedItems(allItemNames);

      // Load all cocktails from Supabase
      const { data: cocktailsData, error } = await supabase
        .from('cocktails')
        .select('*')
        .limit(100);

      if (error) throw error;

      if (cocktailsData) {
        // Calculate matches
        const matched = sortByMatch(cocktailsData, userInventory);
        setCocktails(matched);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const matchCocktails = async () => {
    try {
      // Filter inventory to only selected items
      const filteredInventory = inventory.filter(item =>
        selectedItems.has(item.item_name)
      );

      // Load all cocktails
      const { data: cocktailsData, error } = await supabase
        .from('cocktails')
        .select('*')
        .limit(100);

      if (error) throw error;

      if (cocktailsData) {
        // Calculate matches with filtered inventory
        const matched = sortByMatch(cocktailsData, filteredInventory);
        setCocktails(matched);
      }
    } catch (error) {
      console.error('Error matching cocktails:', error);
    }
  };

  const toggleItem = (itemName: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemName)) {
      newSelected.delete(itemName);
    } else {
      newSelected.add(itemName);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    const allItemNames = new Set(inventory.map(item => item.item_name));
    setSelectedItems(allItemNames);
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const renderCocktailCard = ({ item }: { item: CocktailWithMatch }) => {
    const { match } = item;

    return (
      <TouchableOpacity
        style={styles.cocktailCard}
        onPress={() => navigation.navigate('CocktailDetail', { cocktailId: item.id })}
      >
        <View style={styles.cocktailHeader}>
          <View style={styles.cocktailTitleRow}>
            <Ionicons name="wine" size={24} color={colors.gold} />
            <Text style={styles.cocktailName}>{item.name}</Text>
          </View>

          {/* Match Badge */}
          <View
            style={[
              styles.matchBadge,
              match.canMake
                ? styles.matchBadgeFull
                : match.almostCanMake
                ? styles.matchBadgeAlmost
                : styles.matchBadgeLow,
            ]}
          >
            <Text
              style={[
                styles.matchPercentage,
                match.canMake
                  ? styles.matchPercentageFull
                  : match.almostCanMake
                  ? styles.matchPercentageAlmost
                  : styles.matchPercentageLow,
              ]}
            >
              {Math.round(match.matchPercentage)}%
            </Text>
          </View>
        </View>

        {/* Match Status */}
        <View style={styles.matchStatus}>
          {match.canMake ? (
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.gold} />
              <Text style={styles.statusText}>You can make this!</Text>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
              <Text style={styles.statusTextMissing}>{getMatchMessage(match)}</Text>
            </View>
          )}
        </View>

        {/* Ingredients Summary */}
        <View style={styles.ingredientsSummary}>
          <Text style={styles.summaryLabel}>
            Have: {match.matchedIngredients.length} / {match.matchedIngredients.length + match.missingIngredients.length}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>Finding cocktails you can make...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={80} color={colors.subtext} />
          <Text style={styles.emptyTitle}>Sign In Required</Text>
          <Text style={styles.emptyDescription}>
            Sign in to see what cocktails you can make with your inventory
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.signInButtonText}>Go to Profile to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (inventory.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="scan-outline" size={80} color={colors.subtext} />
          <Text style={styles.emptyTitle}>No Inventory Yet</Text>
          <Text style={styles.emptyDescription}>
            Start scanning bottles and ingredients to see what cocktails you can make!
          </Text>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => navigation.navigate('CameraTab' as any)}
          >
            <Ionicons name="camera" size={20} color={colors.white} />
            <Text style={styles.scanButtonText}>Start Scanning</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canMake = cocktails.filter(c => c.match.canMake);
  const almostCanMake = cocktails.filter(c => c.match.almostCanMake && !c.match.canMake);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>What Can I Make?</Text>
          <Text style={styles.headerSubtitle}>
            {selectedItems.size} ingredient{selectedItems.size !== 1 ? 's' : ''} selected
          </Text>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name={showFilters ? 'options' : 'options-outline'}
            size={24}
            color={colors.accent}
          />
        </TouchableOpacity>
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Select Ingredients</Text>
            <View style={styles.filterActions}>
              <TouchableOpacity onPress={selectAll}>
                <Text style={styles.filterAction}>Select All</Text>
              </TouchableOpacity>
              <Text style={styles.filterDivider}>•</Text>
              <TouchableOpacity onPress={deselectAll}>
                <Text style={styles.filterAction}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {inventory.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.ingredientChip,
                  selectedItems.has(item.item_name) && styles.ingredientChipSelected,
                ]}
                onPress={() => toggleItem(item.item_name)}
              >
                <Ionicons
                  name={selectedItems.has(item.item_name) ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={selectedItems.has(item.item_name) ? colors.gold : colors.subtext}
                />
                <Text
                  style={[
                    styles.ingredientChipText,
                    selectedItems.has(item.item_name) && styles.ingredientChipTextSelected,
                  ]}
                >
                  {item.item_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{canMake.length}</Text>
          <Text style={styles.statLabel}>Can Make</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, styles.statNumberAlmost]}>{almostCanMake.length}</Text>
          <Text style={styles.statLabel}>Almost There</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{cocktails.length}</Text>
          <Text style={styles.statLabel}>Total Recipes</Text>
        </View>
      </View>

      {/* Cocktail List */}
      <FlatList
        data={cocktails}
        renderItem={renderCocktailCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="wine-outline" size={60} color={colors.subtext} />
            <Text style={styles.emptyTitle}>No matches found</Text>
            <Text style={styles.emptyDescription}>
              Try selecting more ingredients or add more items to your inventory
            </Text>
          </View>
        }
      />
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
  },
  loadingText: {
    fontSize: 16,
    color: colors.subtext,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: spacing(0.5),
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.accent}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPanel: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: spacing(2),
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    marginBottom: spacing(1.5),
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  filterAction: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  filterDivider: {
    color: colors.subtext,
  },
  filterScroll: {
    paddingHorizontal: spacing(3),
  },
  ingredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.full,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    marginRight: spacing(1),
  },
  ingredientChipSelected: {
    backgroundColor: `${colors.gold}20`,
    borderColor: colors.gold,
  },
  ingredientChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
    textTransform: 'capitalize',
  },
  ingredientChipTextSelected: {
    color: colors.gold,
  },
  stats: {
    flexDirection: 'row',
    padding: spacing(3),
    gap: spacing(2),
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gold,
  },
  statNumberAlmost: {
    color: colors.accent,
  },
  statLabel: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: spacing(0.5),
  },
  listContent: {
    padding: spacing(3),
    paddingTop: 0,
  },
  cocktailCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  cocktailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(1.5),
  },
  cocktailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    flex: 1,
  },
  cocktailName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  matchBadge: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.md,
  },
  matchBadgeFull: {
    backgroundColor: `${colors.gold}20`,
  },
  matchBadgeAlmost: {
    backgroundColor: `${colors.accent}20`,
  },
  matchBadgeLow: {
    backgroundColor: `${colors.subtext}15`,
  },
  matchPercentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  matchPercentageFull: {
    color: colors.gold,
  },
  matchPercentageAlmost: {
    color: colors.accent,
  },
  matchPercentageLow: {
    color: colors.subtext,
  },
  matchStatus: {
    marginBottom: spacing(1),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gold,
  },
  statusTextMissing: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  ingredientsSummary: {
    paddingTop: spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: `${colors.line}50`,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.subtext,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(4),
    paddingTop: spacing(8),
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },
  emptyDescription: {
    fontSize: 15,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing(3),
  },
  signInButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
