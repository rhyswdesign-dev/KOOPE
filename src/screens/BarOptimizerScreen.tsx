import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Pressable,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, serif, spacing } from '../theme/tokens';
import MainPageHeader from '../components/ui/MainPageHeader';
import EmptyState from '../components/EmptyState';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../contexts/AuthContext';
import { InventoryService } from '../services/inventoryService';
import {
  type BarIngredient,
  type HomeBar,
  type IngredientSuggestion,
  HomeBarService,
} from '../services/homeBarService';
import { useSavedItems } from '../hooks/useSavedItems';
import { usePersonalization } from '../store/usePersonalization';
import { ShoppingListStore } from '../services/shoppingListStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type PrioritizedSuggestion = IngredientSuggestion & {
  score: number;
  reasons: string[];
  savedRecipeHits: string[];
  preferenceMatch: boolean;
};

function mapItemToBarIngredient(item: any, index: number): BarIngredient {
  return {
    id: item?.id || `inventory-${index}`,
    name: item?.item_name || item?.name || 'Unknown',
    category:
      item?.item_type === 'spirit' || item?.category === 'spirit'
        ? 'spirit'
        : item?.category === 'mixer'
          ? 'mixer'
          : item?.category === 'garnish'
            ? 'garnish'
            : item?.category === 'bitters'
              ? 'bitters'
              : item?.category === 'syrup'
                ? 'syrup'
                : item?.category === 'liqueur'
                  ? 'liqueur'
                  : 'ingredient',
    subcategory: item?.subcategory || undefined,
    brand: item?.brand || undefined,
    addedAt: item?.added_at ? new Date(item.added_at) : new Date(),
    isFavorite: false,
    tags: [],
  };
}

function getSuggestionIcon(category: IngredientSuggestion['category']): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case 'spirit':
      return 'wine-outline';
    case 'mixer':
      return 'water-outline';
    case 'syrup':
      return 'flask-outline';
    case 'bitters':
      return 'color-filter-outline';
    case 'garnish':
      return 'leaf-outline';
    case 'liqueur':
      return 'sparkles-outline';
    default:
      return 'cube-outline';
  }
}

export default function BarOptimizerScreen() {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const { savedItems } = useSavedItems();
  const getSpiritPreferences = usePersonalization((s) => s.getSpiritPreferences);

  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<BarIngredient[]>([]);
  const [expandedItemName, setExpandedItemName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await HomeBarService.getStoredIngredients();
        let mergedInventory: BarIngredient[] = [...stored];

        if (user?.id) {
          const userInventory = await InventoryService.getUserInventory(user.id);
          const mapped = userInventory.map(mapItemToBarIngredient);

          const deduped = new Map<string, BarIngredient>();
          [...stored, ...mapped].forEach((item) => {
            deduped.set(item.name.toLowerCase(), item);
          });
          mergedInventory = Array.from(deduped.values());
        }

        if (mounted) {
          setInventory(mergedInventory);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const prioritized = useMemo<PrioritizedSuggestion[]>(() => {
    const preferredSpirits = getSpiritPreferences?.() || [];
    const savedCocktailNames = (savedItems.savedCocktails || []).map((c) => c.name.toLowerCase());

    const homeBar: HomeBar = {
      id: 'optimizer',
      userId: user?.id || 'local',
      name: 'My Bar',
      ingredients: inventory,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: true,
    };

    return HomeBarService.getIngredientSuggestions(homeBar)
      .map((suggestion) => {
        const reasons: string[] = [];
        const savedRecipeHits = savedCocktailNames.filter((savedName) =>
          suggestion.usedInCocktails.some((cocktail) =>
            savedName.includes(cocktail.toLowerCase()) || cocktail.toLowerCase().includes(savedName)
          )
        );

        let score = 0;
        const essentialWeight =
          suggestion.essentialLevel === 'must-have'
            ? 50
            : suggestion.essentialLevel === 'recommended'
              ? 30
              : 15;
        score += essentialWeight;
        score += suggestion.usedInCocktails.length * 2;

        reasons.push(`${suggestion.usedInCocktails.length} cocktails use this`);

        const preferenceMatch = preferredSpirits.some((spirit) => {
          const spiritLower = String(spirit).toLowerCase();
          return (
            suggestion.name.toLowerCase().includes(spiritLower) ||
            String(suggestion.subcategory || '').toLowerCase().includes(spiritLower)
          );
        });

        if (preferenceMatch) {
          score += 20;
          reasons.push('Matches your spirit preferences');
        }

        if (savedRecipeHits.length > 0) {
          score += Math.min(savedRecipeHits.length * 10, 25);
          reasons.push(`Supports saved recipes: ${savedRecipeHits.slice(0, 2).join(', ')}`);
        }

        return {
          ...suggestion,
          score,
          reasons,
          savedRecipeHits,
          preferenceMatch,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [getSpiritPreferences, inventory, savedItems.savedCocktails, user?.id]);

  const top3 = prioritized.slice(0, 3);
  const nextUp = prioritized.slice(3, 12);

  const mapCategoryToGrocery = (
    category: IngredientSuggestion['category']
  ): 'spirits_liquors' | 'mixers' | 'garnish' | 'bitters' | 'syrup' | 'other' => {
    switch (category) {
      case 'spirit':
      case 'liqueur':
        return 'spirits_liquors';
      case 'mixer':
        return 'mixers';
      case 'garnish':
        return 'garnish';
      case 'bitters':
        return 'bitters';
      case 'syrup':
        return 'syrup';
      default:
        return 'other';
    }
  };

  const handleAddToCart = async (item: PrioritizedSuggestion) => {
    try {
      await ShoppingListStore.addItemToShoppingList(
        {
          name: item.name,
          category: mapCategoryToGrocery(item.category),
          subcategory: item.subcategory,
          brand: item.commonBrands?.[0] || undefined,
          checked: false,
        },
        'Bar Optimizer',
        user?.id || 'default'
      );

      Alert.alert('Added to Cart', `${item.name} was added to your shopping list.`);
    } catch (error) {
      Alert.alert('Could Not Add', 'Please try again.');
    }
  };

  const toggleExpanded = (itemName: string) => {
    setExpandedItemName((prev) => (prev === itemName ? null : itemName));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <MainPageHeader
          title="What To Buy Next"
          subtitle="Analyzing your bar..."
          showBackButton
          onBackPress={() => nav.goBack()}
        />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (prioritized.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <MainPageHeader
          title="What To Buy Next"
          subtitle="No suggestions yet"
          showBackButton
          onBackPress={() => nav.goBack()}
        />
        <EmptyState
          icon="glass-cocktail"
          title="No Recommendations Yet"
          message="Add ingredients to your inventory and we will recommend what to buy next."
          actionLabel="Go To Inventory"
          onAction={() => nav.goBack()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MainPageHeader
        title="What To Buy Next"
        subtitle={`${inventory.length} items analyzed`}
        showBackButton
        onBackPress={() => nav.goBack()}
        rightActions={[
          {
            icon: 'cart-outline',
            onPress: () => nav.navigate('ShoppingCart'),
            accessibilityLabel: 'Open shopping cart',
          },
        ]}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buy Now</Text>
          <Text style={styles.sectionSubtitle}>Highest impact additions for your next cocktails.</Text>
          {top3.map((item) => (
            <View key={item.name} style={[styles.card, styles.cardTop]}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  <Ionicons name={getSuggestionIcon(item.category)} size={18} color={colors.accent} />
                </View>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardMeta}>
                    {item.essentialLevel.replace('-', ' ')} • ${item.averagePrice} avg
                  </Text>
                </View>
              </View>

              {item.reasons.map((reason) => (
                <Text key={`${item.name}-${reason}`} style={styles.reasonText}>
                  • {reason}
                </Text>
              ))}

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.addToCartButton}
                  onPress={() => handleAddToCart(item)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="cart-outline" size={14} color={colors.bg} />
                  <Text style={styles.addToCartText}>Add to Cart</Text>
                </TouchableOpacity>
                <Pressable
                  style={styles.expandHint}
                  onPress={() => toggleExpanded(item.name)}
                >
                  <Text style={styles.expandHintText}>
                    {expandedItemName === item.name ? 'Tap to hide cocktails' : 'Tap to show cocktails'}
                  </Text>
                </Pressable>
              </View>

              {expandedItemName === item.name && (
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  style={styles.cocktailsRow}
                  contentContainerStyle={styles.cocktailsRowContent}
                >
                  {item.usedInCocktails.map((cocktail) => (
                    <View key={`${item.name}-${cocktail}`} style={styles.cocktailPill}>
                      <Text style={styles.cocktailPillText}>{cocktail}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          ))}
        </View>

        {nextUp.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next Up</Text>
            {nextUp.map((item) => (
              <View key={item.name} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={getSuggestionIcon(item.category)} size={16} color={colors.subtext} />
                  </View>
                  <View style={styles.cardTitleWrap}>
                    <Text style={styles.cardTitleSmall}>{item.name}</Text>
                    <Text style={styles.cardMetaSmall}>
                      {item.usedInCocktails.length} cocktails • {item.commonBrands.slice(0, 2).join(', ')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addMiniButton}
                    onPress={() => handleAddToCart(item)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="cart-outline" size={14} color={colors.accent} />
                  </TouchableOpacity>
                </View>

                <Pressable style={styles.nextUpToggle} onPress={() => toggleExpanded(item.name)}>
                  <Text style={styles.expandHintText}>
                    {expandedItemName === item.name ? 'Tap to hide cocktails' : 'Tap to show cocktails'}
                  </Text>
                </Pressable>

                {expandedItemName === item.name && (
                  <ScrollView
                    horizontal
                    nestedScrollEnabled
                    showsHorizontalScrollIndicator={false}
                    style={styles.cocktailsRow}
                    contentContainerStyle={styles.cocktailsRowContent}
                  >
                    {item.usedInCocktails.map((cocktail) => (
                      <View key={`${item.name}-${cocktail}`} style={styles.cocktailPill}>
                        <Text style={styles.cocktailPillText}>{cocktail}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing(2.5),
    paddingBottom: spacing(5),
    paddingTop: spacing(2),
  },
  section: {
    marginBottom: spacing(3),
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: spacing(0.5),
    marginBottom: spacing(1.5),
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    padding: spacing(1.75),
    marginBottom: spacing(1.25),
  },
  cardTop: {
    borderColor: 'rgba(214, 138, 56, 0.35)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214, 138, 56, 0.12)',
    marginRight: spacing(1),
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardTitleSmall: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: spacing(0.25),
  },
  cardMetaSmall: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: spacing(0.25),
  },
  reasonText: {
    marginTop: spacing(0.75),
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 18,
  },
  cardActions: {
    marginTop: spacing(1.25),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(1),
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
  },
  addToCartText: {
    color: colors.bg,
    fontSize: 12,
    fontWeight: '700',
  },
  expandHint: {
    flex: 1,
    alignItems: 'flex-end',
    paddingVertical: spacing(0.5),
  },
  expandHintText: {
    fontSize: 11,
    color: colors.subtext,
  },
  nextUpToggle: {
    marginTop: spacing(1),
    alignItems: 'flex-end',
  },
  cocktailsRow: {
    marginTop: spacing(1.25),
  },
  cocktailsRowContent: {
    gap: spacing(0.75),
    paddingRight: spacing(1),
  },
  cocktailPill: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cocktailPillText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  addMiniButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
