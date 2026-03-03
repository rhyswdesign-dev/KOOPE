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
  Modal,
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
import InPageTabBar from '../components/ui/InPageTabBar';

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
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'price' | 'recent'>('recent');
  const [showSortModal, setShowSortModal] = useState(false);

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

  const deleteShoppingList = (listId: string, recipeName: string) => {
    Alert.alert(
      'Remove Recipe',
      `Remove all ingredients for "${recipeName}" from your cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await ShoppingListStore.deleteShoppingList(listId);
              await loadShoppingLists();
              showToast(`${recipeName} removed from cart`, 'info');
            } catch (error) {
              log.error('ShoppingCartScreen', 'Delete list error', error);
              showToast('Failed to remove recipe', 'error');
            }
          },
        },
      ]
    );
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

  const getFilteredAndSortedItems = () => {
    let items = consolidatedShoppingItems.allItems;

    // Apply category filter
    if (categoryFilter !== 'all') {
      items = items.filter((item: any) => {
        const cat = item.category.toLowerCase();
        if (categoryFilter === 'spirits') return cat.includes('spirit') || cat.includes('liquor');
        if (categoryFilter === 'mixers') return cat.includes('mixer');
        if (categoryFilter === 'garnishes') return cat.includes('garnish');
        if (categoryFilter === 'syrups') return cat.includes('syrup') || cat.includes('bitter');
        return true;
      });
    }

    // Apply sorting
    const sortedItems = [...items];
    switch (sortBy) {
      case 'name':
        sortedItems.sort((a: any, b: any) => a.name.localeCompare(b.name));
        break;
      case 'category':
        sortedItems.sort((a: any, b: any) => {
          const catCompare = a.category.localeCompare(b.category);
          if (catCompare === 0) {
            return a.name.localeCompare(b.name);
          }
          return catCompare;
        });
        break;
      case 'recent':
        // Most recent first (reverse order)
        sortedItems.reverse();
        break;
      default:
        break;
    }

    return sortedItems;
  };

  const renderCocktailGroupView = () => {
    if (savedShoppingLists.length === 0) {
      return (
        <EmptyState
          icon="basket-outline"
          title="No shopping lists yet"
          message="Add ingredients from cocktail recipes to start shopping"
          actionLabel="Explore Recipes"
          onAction={() => (nav as any).navigate('Main', { screen: 'Recipes' })}
        />
      );
    }

    return (
      <View style={styles.cocktailGroups}>
        {savedShoppingLists.map((list) => (
          <View key={list.id} style={styles.cocktailCard}>
            <View style={styles.cocktailHeader}>
              <Text style={styles.cocktailName}>{list.recipeName}</Text>
              <TouchableOpacity
                onPress={() => deleteShoppingList(list.id, list.recipeName)}
                hitSlop={8}
                style={styles.deleteListButton}
              >
                <Ionicons name="close" size={20} color={colors.bg} />
              </TouchableOpacity>
            </View>

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

                    <TouchableOpacity
                      onPress={() => deleteShoppingItem(item.id, item.name)}
                      hitSlop={8}
                      style={styles.deleteItemButton}
                    >
                      <Ionicons name="close-circle" size={18} color={colors.muted} />
                    </TouchableOpacity>
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
    const filteredItems = getFilteredAndSortedItems();

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
              (nav as any).navigate('Main', { screen: 'Recipes' });
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

              <TouchableOpacity
                onPress={() => deleteShoppingItem(item.id, item.name)}
                hitSlop={8}
                style={styles.deleteItemButton}
              >
                <Ionicons name="close-circle" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  const handleClearAll = () => {
    if (consolidatedShoppingItems.allItems.length === 0) return;
    Alert.alert(
      'Clear Shopping Cart',
      'Remove all items from your shopping cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const list of savedShoppingLists) {
                for (const item of list.items) {
                  await ShoppingListStore.deleteShoppingItem(item.id);
                }
              }
              await loadShoppingLists();
              showToast('Shopping cart cleared', 'info');
            } catch (error) {
              log.error('ShoppingCartScreen', 'Clear all error', error);
              showToast('Failed to clear cart', 'error');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping Overview</Text>
        <View style={styles.headerActions}>
          {consolidatedShoppingItems.allItems.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearAllButton}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => nav.goBack()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.headerSubtitle}>
        Ingredients organized by cocktail — ready to shop or batch
      </Text>

      {/* View Mode Tabs */}
      <View style={styles.viewModeSection}>
        <View style={styles.viewModeTabs}>
          <InPageTabBar
            items={[
              { key: 'cocktail', label: 'Group by Cocktail' },
              { key: 'ingredient', label: 'Group by Ingredient' },
            ]}
            activeKey={viewMode}
            onChange={(key) => setViewMode(key as ViewMode)}
          />

          <TouchableOpacity
            style={styles.sortIconButton}
            onPress={() => setShowSortModal(true)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Sort shopping cart items"
          >
            <Ionicons name="funnel-outline" size={20} color={colors.gold} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Filters (only show in ingredient view) */}
      {viewMode === 'ingredient' && (
        <View style={styles.categoryFilters}>
          <InPageTabBar
            scrollable
            items={[
              { key: 'all', label: 'All', icon: 'apps' },
              { key: 'spirits', label: 'Spirits', icon: 'wine' },
              { key: 'mixers', label: 'Mixers', icon: 'water' },
              { key: 'garnishes', label: 'Garnishes', icon: 'leaf' },
              { key: 'syrups', label: 'Syrups', icon: 'water-outline' },
            ]}
            activeKey={categoryFilter}
            onChange={(key) => setCategoryFilter(key as CategoryFilter)}
          />
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Shopping Optimization */}
        {savedShoppingLists.length > 0 && (
          <View style={styles.aiOptimizationCard}>
            <View style={styles.aiOptimizationHeader}>
              <Ionicons name="sparkles" size={20} color={colors.gold} />
              <Text style={styles.aiOptimizationTitle}>AI Shopping Helper</Text>
            </View>
            <TouchableOpacity
              style={styles.aiActionCard}
              onPress={() => Alert.alert('Smart Shopping', 'AI-powered shopping optimization coming soon! Get store suggestions, price comparisons, and bundling recommendations.')}
            >
              <View style={styles.aiActionContent}>
                <Ionicons name="cart-outline" size={22} color={colors.accent} />
                <View style={styles.aiActionText}>
                  <Text style={styles.aiActionTitle}>Optimize my shopping</Text>
                  <Text style={styles.aiActionSubtitle}>Find best stores & prices</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>
        )}

        {viewMode === 'cocktail' ? renderCocktailGroupView() : renderIngredientGroupView()}
      </ScrollView>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.sortModalHeader}>
              <Text style={styles.sortModalTitle}>Sort Items</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.sortOptions}>
              <TouchableOpacity
                style={[styles.sortOption, sortBy === 'name' && styles.sortOptionActive]}
                onPress={() => {
                  setSortBy('name');
                  setShowSortModal(false);
                  showToast('Sorted by Name', 'success');
                }}
              >
                <Ionicons
                  name="text-outline"
                  size={20}
                  color={sortBy === 'name' ? colors.gold : colors.text}
                />
                <View style={styles.sortOptionTextContainer}>
                  <Text style={[styles.sortOptionText, sortBy === 'name' && styles.sortOptionTextActive]}>
                    Name (A-Z)
                  </Text>
                  <Text style={styles.sortOptionDescription}>Sort alphabetically</Text>
                </View>
                {sortBy === 'name' && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.gold} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sortOption, sortBy === 'category' && styles.sortOptionActive]}
                onPress={() => {
                  setSortBy('category');
                  setShowSortModal(false);
                  showToast('Sorted by Category', 'success');
                }}
              >
                <Ionicons
                  name="apps-outline"
                  size={20}
                  color={sortBy === 'category' ? colors.gold : colors.text}
                />
                <View style={styles.sortOptionTextContainer}>
                  <Text style={[styles.sortOptionText, sortBy === 'category' && styles.sortOptionTextActive]}>
                    Category
                  </Text>
                  <Text style={styles.sortOptionDescription}>Group by type</Text>
                </View>
                {sortBy === 'category' && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.gold} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sortOption, sortBy === 'recent' && styles.sortOptionActive]}
                onPress={() => {
                  setSortBy('recent');
                  setShowSortModal(false);
                  showToast('Sorted by Recently Added', 'success');
                }}
              >
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={sortBy === 'recent' ? colors.gold : colors.text}
                />
                <View style={styles.sortOptionTextContainer}>
                  <Text style={[styles.sortOptionText, sortBy === 'recent' && styles.sortOptionTextActive]}>
                    Recently Added
                  </Text>
                  <Text style={styles.sortOptionDescription}>Newest items first</Text>
                </View>
                {sortBy === 'recent' && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.gold} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  clearAllButton: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E57373',
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    paddingHorizontal: spacing(3),
    marginBottom: spacing(2),
    lineHeight: 18,
  },
  viewModeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    marginBottom: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  viewModeTabs: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  sortIconButton: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(2),
    marginLeft: spacing(2),
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
    flex: 1,
  },
  deleteListButton: {
    padding: spacing(0.5),
    opacity: 0.6,
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
  deleteItemButton: {
    marginLeft: spacing(1.5),
    padding: spacing(0.5),
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

  // Sort Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(3),
  },
  sortModalContent: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sortModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sortOptions: {
    padding: spacing(2),
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(2.5),
    borderRadius: radii.lg,
    marginBottom: spacing(1.5),
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sortOptionActive: {
    backgroundColor: colors.gold + '20',
    borderColor: colors.gold,
  },
  sortOptionTextContainer: {
    flex: 1,
    marginLeft: spacing(2),
  },
  sortOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  sortOptionTextActive: {
    color: colors.gold,
  },
  sortOptionDescription: {
    fontSize: 13,
    color: colors.subtext,
  },
  aiOptimizationCard: {
    backgroundColor: `${colors.gold}08`,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginHorizontal: spacing(3),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: `${colors.gold}20`,
  },
  aiOptimizationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginBottom: spacing(1.5),
  },
  aiOptimizationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  aiActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  aiActionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  aiActionText: {
    flex: 1,
  },
  aiActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.25),
  },
  aiActionSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
  },
});
