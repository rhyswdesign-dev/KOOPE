/**
 * Shopping Overview Screen
 * Organized ingredients by cocktail - ready to shop or batch
 */

import React, { useState, useLayoutEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ShoppingListStore } from '../services/shoppingListStore';
import { HomeBarService, BarIngredient } from '../services/homeBarService';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { log } from '../lib/logger';

type ViewMode = 'cocktail' | 'ingredient';
type CategoryFilter = 'all' | 'spirits' | 'mixers' | 'garnishes' | 'syrups';

export default function ShoppingCartScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { toast, showToast, hideToast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('cocktail');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [savedShoppingLists, setSavedShoppingLists] = useState<any[]>([]);
  const [consolidatedShoppingItems, setConsolidatedShoppingItems] = useState<any>({ itemsByRecipe: {}, allItems: [] });
  const [checkedShoppingItems, setCheckedShoppingItems] = useState<Set<string>>(new Set());

  useLayoutEffect(() => {
    nav.setOptions({
      headerShown: false,
    });
  }, [nav]);

  // Load shopping lists when component mounts or when focused
  useFocusEffect(
    useCallback(() => {
      loadShoppingLists();
    }, [])
  );

  const loadShoppingLists = async () => {
    try {
      await ShoppingListStore.migrateShoppingLists();
      const lists = await ShoppingListStore.getShoppingListsWithSpiritsCategory();
      const consolidated = await ShoppingListStore.getConsolidatedShoppingItems();
      setSavedShoppingLists(lists);
      setConsolidatedShoppingItems(consolidated);

      // Restore checked state
      const checkedItems = new Set<string>();
      lists.forEach(list => {
        list.items.forEach(item => {
          if (item.checked || item.isCompleted) {
            checkedItems.add(item.id);
          }
        });
      });
      setCheckedShoppingItems(checkedItems);
    } catch (error) {
      log.error('ShoppingCartScreen', 'Error loading shopping lists', error);
    }
  };

  const markItemAsPurchased = async (itemId: string, item: any) => {
    try {
      const newIngredient: BarIngredient = {
        id: `purchased_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: item.name,
        category: mapCategoryToBarCategory(item.category),
        subcategory: item.subcategory || item.category,
        brand: item.brand || 'Unknown',
        abv: getDefaultABV(item.subcategory || item.category),
        volume: 750,
        addedAt: new Date(),
        isFavorite: false,
        tags: [],
      };

      await HomeBarService.addIngredient(newIngredient);
      await ShoppingListStore.deleteShoppingItem(itemId);
      await loadShoppingLists();

      showToast(`${item.name} added to your home bar!`, 'success');
    } catch (error) {
      log.error('ShoppingCartScreen', 'Error marking item as purchased', error);
      showToast('Failed to mark item as purchased', 'error');
    }
  };

  const mapCategoryToBarCategory = (category: string): BarIngredient['category'] => {
    switch (category) {
      case 'spirits_liquors':
        return 'spirit';
      case 'mixers':
        return 'mixer';
      case 'bitters':
        return 'bitters';
      case 'syrup':
        return 'syrup';
      case 'garnish':
        return 'garnish';
      default:
        return 'spirit';
    }
  };

  const getDefaultABV = (subcategory: string): number => {
    const lowerSub = (subcategory || '').toLowerCase();
    if (lowerSub.includes('vodka')) return 40;
    if (lowerSub.includes('gin')) return 42;
    if (lowerSub.includes('whiskey') || lowerSub.includes('bourbon')) return 43;
    if (lowerSub.includes('rum')) return 40;
    if (lowerSub.includes('tequila')) return 40;
    if (lowerSub.includes('vermouth')) return 15;
    if (lowerSub.includes('liqueur')) return 25;
    return 0;
  };

  const deleteShoppingItem = async (itemId: string, itemName?: string) => {
    try {
      await ShoppingListStore.deleteShoppingItem(itemId);
      await loadShoppingLists();
      showToast(itemName ? `${itemName} removed from cart` : 'Item removed from cart', 'info');
    } catch (error) {
      log.error('ShoppingCartScreen', 'Delete error', error);
      showToast('Failed to delete item', 'error');
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('spirit') || cat.includes('liquor')) return 'wine';
    if (cat.includes('mixer')) return 'water';
    if (cat.includes('garnish')) return 'leaf';
    if (cat.includes('syrup') || cat.includes('bitters')) return 'water-outline';
    return 'ellipse';
  };

  const getCategoryColor = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('spirit') || cat.includes('liquor')) return colors.gold;
    if (cat.includes('mixer')) return '#FFA500';
    if (cat.includes('garnish')) return '#90EE90';
    if (cat.includes('syrup')) return '#FFD700';
    return colors.muted;
  };

  const getFilteredItems = () => {
    if (categoryFilter === 'all') {
      return consolidatedShoppingItems.allItems;
    }

    return consolidatedShoppingItems.allItems.filter((item: any) => {
      const cat = item.category.toLowerCase();
      if (categoryFilter === 'spirits') return cat.includes('spirit') || cat.includes('liquor');
      if (categoryFilter === 'mixers') return cat.includes('mixer');
      if (categoryFilter === 'garnishes') return cat.includes('garnish');
      if (categoryFilter === 'syrups') return cat.includes('syrup') || cat.includes('bitter');
      return true;
    });
  };

  const renderCocktailGroupView = () => {
    if (savedShoppingLists.length === 0) {
      return (
        <EmptyState
          icon="basket-outline"
          title="No shopping lists yet"
          message="Add ingredients from cocktail recipes to start shopping"
          actionLabel="Explore Recipes"
          onAction={() => nav.navigate('Recipes')}
        />
      );
    }

    return (
      <View style={styles.cocktailGroups}>
        {savedShoppingLists.map((list) => (
          <View key={list.id} style={styles.cocktailCard}>
            <TouchableOpacity
              style={styles.cocktailHeader}
              onPress={() => {
                // Expand/collapse functionality could be added here
              }}
            >
              <Text style={styles.cocktailName}>{list.recipeName}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>

            <View style={styles.ingredientsList}>
              {list.items.map((item: any) => {
                const isChecked = checkedShoppingItems.has(item.id);
                return (
                  <View key={item.id} style={styles.ingredientRow}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={async () => {
                        const newCheckedState = !isChecked;
                        await ShoppingListStore.updateSynchronizedItemChecked(item.id, newCheckedState);
                        const newChecked = new Set(checkedShoppingItems);
                        if (newCheckedState) {
                          newChecked.add(item.id);
                        } else {
                          newChecked.delete(item.id);
                        }
                        setCheckedShoppingItems(newChecked);
                        await loadShoppingLists();
                      }}
                    >
                      <View style={[styles.checkboxCircle, isChecked && styles.checkboxCircleChecked]}>
                        {isChecked && <Ionicons name="checkmark" size={14} color={colors.bg} />}
                      </View>
                    </TouchableOpacity>

                    <View style={styles.ingredientIcon}>
                      <Ionicons
                        name={getCategoryIcon(item.category)}
                        size={18}
                        color={getCategoryColor(item.category)}
                      />
                    </View>

                    <View style={styles.ingredientInfo}>
                      <Text style={[styles.ingredientName, isChecked && styles.ingredientNameChecked]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.ingredientDetails, isChecked && styles.ingredientDetailsChecked]}>
                        {item.subcategory || item.category}
                      </Text>
                    </View>

                    <Text style={[styles.ingredientSize, isChecked && styles.ingredientSizeChecked]}>
                      {item.size || '750ml'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderIngredientGroupView = () => {
    const filteredItems = getFilteredItems();

    if (filteredItems.length === 0) {
      const message = categoryFilter === 'all'
        ? 'Add ingredients to start shopping'
        : `No ${categoryFilter} in your list`;

      return (
        <EmptyState
          icon="basket-outline"
          title="No items found"
          message={message}
          actionLabel={categoryFilter === 'all' ? "Explore Recipes" : "Clear Filter"}
          onAction={() => {
            if (categoryFilter === 'all') {
              nav.navigate('Recipes');
            } else {
              setCategoryFilter('all');
            }
          }}
        />
      );
    }

    return (
      <View style={styles.ingredientGroups}>
        {filteredItems.map((item: any) => {
          const isChecked = checkedShoppingItems.has(item.id);
          return (
            <View key={item.id} style={styles.ingredientCard}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={async () => {
                  const newCheckedState = !isChecked;
                  await ShoppingListStore.updateSynchronizedItemChecked(item.id, newCheckedState);
                  const newChecked = new Set(checkedShoppingItems);
                  if (newCheckedState) {
                    newChecked.add(item.id);
                  } else {
                    newChecked.delete(item.id);
                  }
                  setCheckedShoppingItems(newChecked);
                  await loadShoppingLists();
                }}
              >
                <View style={[styles.checkboxCircle, isChecked && styles.checkboxCircleChecked]}>
                  {isChecked && <Ionicons name="checkmark" size={14} color={colors.bg} />}
                </View>
              </TouchableOpacity>

              <View style={styles.ingredientIcon}>
                <Ionicons
                  name={getCategoryIcon(item.category)}
                  size={20}
                  color={getCategoryColor(item.category)}
                />
              </View>

              <View style={styles.ingredientCardInfo}>
                <Text style={[styles.ingredientCardName, isChecked && styles.ingredientNameChecked]}>
                  {item.name}
                </Text>
                <Text style={[styles.ingredientCardMeta, isChecked && styles.ingredientDetailsChecked]}>
                  Needed for: {item.quantity} cocktail{item.quantity > 1 ? 's' : ''}
                </Text>
              </View>

              <Text style={[styles.ingredientCardBottles, isChecked && styles.ingredientSizeChecked]}>
                1 bottle
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping Overview</Text>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Text style={styles.headerSubtitle}>
        Ingredients organized by cocktail — ready to shop or batch
      </Text>

      {/* View Mode Tabs */}
      <View style={styles.viewModeTabs}>
        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'cocktail' && styles.viewModeTabActive]}
          onPress={() => setViewMode('cocktail')}
        >
          <Text style={[styles.viewModeTabText, viewMode === 'cocktail' && styles.viewModeTabTextActive]}>
            Group by Cocktail
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'ingredient' && styles.viewModeTabActive]}
          onPress={() => setViewMode('ingredient')}
        >
          <Text style={[styles.viewModeTabText, viewMode === 'ingredient' && styles.viewModeTabTextActive]}>
            Group by Ingredient
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewModeTab}
          onPress={() => Alert.alert('Sort', 'Sort options coming soon')}
        >
          <Text style={styles.viewModeTabText}>Sort by</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filters (only show in ingredient view) */}
      {viewMode === 'ingredient' && (
        <View style={styles.categoryFilters}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFiltersContent}
          >
            {[
              { key: 'all' as CategoryFilter, label: 'All', icon: 'apps' },
              { key: 'spirits' as CategoryFilter, label: 'Spirits', icon: 'wine' },
              { key: 'mixers' as CategoryFilter, label: 'Mixers', icon: 'water' },
              { key: 'garnishes' as CategoryFilter, label: 'Garnishes', icon: 'leaf' },
              { key: 'syrups' as CategoryFilter, label: 'Syrups', icon: 'water-outline' },
            ].map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, categoryFilter === cat.key && styles.categoryChipActive]}
                onPress={() => setCategoryFilter(cat.key)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={14}
                  color={categoryFilter === cat.key ? colors.bg : colors.gold}
                />
                <Text style={[styles.categoryChipText, categoryFilter === cat.key && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {viewMode === 'cocktail' ? renderCocktailGroupView() : renderIngredientGroupView()}
      </ScrollView>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
    </View>
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
    paddingTop: spacing(6),
    paddingBottom: spacing(2),
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    paddingHorizontal: spacing(3),
    marginBottom: spacing(2),
    lineHeight: 18,
  },
  viewModeTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing(3),
    marginBottom: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  viewModeTab: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(2),
    marginRight: spacing(1),
  },
  viewModeTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.gold,
  },
  viewModeTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.muted,
  },
  viewModeTabTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  categoryFilters: {
    marginBottom: spacing(2),
  },
  categoryFiltersContent: {
    paddingHorizontal: spacing(3),
    gap: spacing(2),
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    borderRadius: radii.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.gold + '40',
  },
  categoryChipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  categoryChipTextActive: {
    color: colors.bg,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing(8),
  },

  // Cocktail Group View
  cocktailGroups: {
    paddingHorizontal: spacing(3),
    gap: spacing(2),
  },
  cocktailCard: {
    backgroundColor: colors.gold,
    borderRadius: radii.xl,
    overflow: 'hidden',
    marginBottom: spacing(2),
  },
  cocktailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    backgroundColor: colors.gold,
  },
  cocktailName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.bg,
  },
  ingredientsList: {
    backgroundColor: colors.card,
    padding: spacing(2),
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1),
  },
  checkbox: {
    marginRight: spacing(2),
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleChecked: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  ingredientIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.25),
  },
  ingredientNameChecked: {
    textDecorationLine: 'line-through',
    color: colors.muted,
  },
  ingredientDetails: {
    fontSize: 12,
    color: colors.subtext,
  },
  ingredientDetailsChecked: {
    textDecorationLine: 'line-through',
    color: colors.muted,
  },
  ingredientSize: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '500',
  },
  ingredientSizeChecked: {
    textDecorationLine: 'line-through',
    color: colors.muted,
  },

  // Ingredient Group View
  ingredientGroups: {
    paddingHorizontal: spacing(3),
  },
  ingredientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing(2.5),
    borderRadius: radii.lg,
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  ingredientCardInfo: {
    flex: 1,
  },
  ingredientCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.25),
  },
  ingredientCardMeta: {
    fontSize: 12,
    color: colors.subtext,
  },
  ingredientCardBottles: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
});
