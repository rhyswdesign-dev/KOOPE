// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, spacing, serif } from '../theme/tokens';
import MainPageHeader from '../components/ui/MainPageHeader';
import EmptyState from '../components/EmptyState';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../contexts/AuthContext';
import { InventoryService } from '../services/inventoryService';
import { HomeBarService } from '../services/homeBarService';
import { ShoppingListStore } from '../services/shoppingListStore';
import { RecipesRepository } from '../repos/supabase';
import { ALL_COCKTAILS as FALLBACK_COCKTAILS } from '../data/cocktails';
import { generateOptimizationReport, type BarOptimizationReport } from '../services/optimizeMyBarService';
import { toBottle, type Bottle, type UserInventoryItem } from '../types/database';
import { useUserTier } from '../store/useUserTier';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function mapStoredIngredientToBottle(item: any, index: number, userId: string): Bottle {
  return {
    id: item?.id || `stored-${index}`,
    userId,
    name: item?.name || 'Unknown',
    category: item?.category || 'other',
    subcategory: item?.subcategory || undefined,
    brand: item?.brand || undefined,
    flavorTags: [],
    quantity: 'full',
    imageUrl: item?.imageUrl || undefined,
    addedAt: item?.addedAt ? new Date(item.addedAt).toISOString() : new Date().toISOString(),
    scanCount: 0,
    isFavorite: false,
  };
}

function mapCategoryToShoppingList(category: string): 'spirits_liquors' | 'mixers' | 'garnish' | 'bitters' | 'syrup' | 'other' {
  const normalized = category.toLowerCase();
  if (normalized === 'spirit' || normalized === 'liqueur') return 'spirits_liquors';
  if (normalized === 'mixer') return 'mixers';
  if (normalized === 'garnish') return 'garnish';
  if (normalized === 'bitters') return 'bitters';
  if (normalized === 'syrup') return 'syrup';
  return 'other';
}

function getHealthNarrative(score: number): { label: string; body: string } {
  if (score >= 80) {
    return {
      label: 'Balanced',
      body: 'Your bar can already cover a strong spread of classics and riffs. Focus on a few high-impact additions instead of broad restocking.',
    };
  }
  if (score >= 55) {
    return {
      label: 'Growing',
      body: 'You have a solid base. One or two smart additions can noticeably widen what you can make for yourself or guests.',
    };
  }
  return {
    label: 'Foundational',
    body: 'You are still building the core. Prioritize versatile staples first so every purchase increases cocktail reach quickly.',
  };
}

export default function BarOptimizerScreen() {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const tier = useUserTier((state) => state.tier);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<BarOptimizationReport | null>(null);
  const [inventoryCount, setInventoryCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const storedIngredients = await HomeBarService.getStoredIngredients();
        const localInventory = storedIngredients.map((item, index) =>
          mapStoredIngredientToBottle(item, index, user?.id || 'local')
        );

        let remoteInventory: Bottle[] = [];
        if (user?.id) {
          const inventoryTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 4000)
          );
          const userInventory = await Promise.race([
            InventoryService.getUserInventory(user.id),
            inventoryTimeout,
          ]).catch(() => [] as UserInventoryItem[]);
          remoteInventory = userInventory.map((item: UserInventoryItem) =>
            toBottle(item, {
              subcategory: item.subcategory || undefined,
              brand: item.brand || undefined,
              abv: item.abv || undefined,
              volume: item.volume || undefined,
              quantity: (item.quantity as any) || 'full',
              isFavorite: item.is_favorite || false,
              notes: item.notes || undefined,
              expiryDate: item.expiry_date || undefined,
              scanCount: item.scan_count || 1,
            })
          );
        }

        const deduped = new Map<string, Bottle>();
        [...remoteInventory, ...localInventory].forEach((item) => {
          deduped.set(`${item.name.toLowerCase()}|${item.category.toLowerCase()}`, item);
        });

        const inventory = Array.from(deduped.values());
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        );
        const recipes = await Promise.race([
          RecipesRepository.getAllRecipes(0, 300),
          timeout,
        ]).catch(() => FALLBACK_COCKTAILS as any[]);
        const optimizationReport = generateOptimizationReport(inventory, recipes as any);

        if (!mounted) return;
        setInventoryCount(inventory.length);
        setReport(optimizationReport);
      } catch (error) {
        if (mounted) {
          setReport(null);
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

  const previewMode = tier === 'FREE';
  const healthNarrative = useMemo(
    () => getHealthNarrative(report?.completenessScore || 0),
    [report?.completenessScore]
  );

  const shoppingPlan = useMemo(() => {
    if (!report) return [];
    return previewMode ? report.shoppingPlan.slice(0, 1) : report.shoppingPlan.slice(0, 5);
  }, [previewMode, report]);

  const topPurchases = useMemo(() => {
    if (!report) return [];
    return previewMode ? report.topPurchases.slice(0, 2) : report.topPurchases.slice(0, 6);
  }, [previewMode, report]);

  const gaps = useMemo(() => {
    if (!report) return [];
    return previewMode ? report.gaps.slice(0, 2) : report.gaps.slice(0, 4);
  }, [previewMode, report]);

  const addToShoppingList = async (item: { name: string; category?: string }) => {
    try {
      await ShoppingListStore.addItemToShoppingList(
        {
          name: item.name,
          category: mapCategoryToShoppingList(item.category || 'other'),
        },
        'Optimize My Bar',
        user?.id || 'default'
      );

      Alert.alert('Added to Shopping List', `${item.name} is ready for your next bar run.`);
    } catch {
      Alert.alert('Could Not Add Item', 'Please try again.');
    }
  };

  const buildNextBarRun = async () => {
    const nextRun = topPurchases.slice(0, 3);
    if (!nextRun.length) {
      Alert.alert('Nothing To Add', 'Your optimizer did not find a next bar run yet.');
      return;
    }

    try {
      await Promise.all(
        nextRun.map((item) =>
          ShoppingListStore.addItemToShoppingList(
            {
              name: item.ingredient,
              category: mapCategoryToShoppingList(item.category || 'other'),
            },
            'Optimize My Bar',
            user?.id || 'default'
          )
        )
      );

      Alert.alert('Next Bar Run Ready', `${nextRun.length} high-impact items were added to your shopping list.`);
    } catch {
      Alert.alert('Could Not Build Run', 'Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <MainPageHeader
          title="Optimize My Bar"
          subtitle="Analyzing your bar"
          showBackButton
          onBackPress={() => nav.goBack()}
        />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.container}>
        <MainPageHeader
          title="Optimize My Bar"
          subtitle="We couldn't build your report"
          showBackButton
          onBackPress={() => nav.goBack()}
        />
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="analytics-outline" size={72} color={colors.gold} />
          </View>
          <Text style={styles.emptyTitle}>Your Bar Needs More Bottles</Text>
          <Text style={styles.emptySubtitle}>
            Add at least 3–5 bottles to your home bar and we'll generate a personalized optimization report.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => nav.goBack()} activeOpacity={0.85}>
            <Text style={styles.emptyBtnText}>Go to Home Bar</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.goldText} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MainPageHeader
        title="Optimize My Bar"
        subtitle={`${inventoryCount} items analyzed`}
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

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroLabel}>Bar Health</Text>
              <Text style={styles.heroValue}>{report.completenessScore}%</Text>
              <Text style={styles.heroStatus}>{healthNarrative.label}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{report.makeableRecipeCount} makeable now</Text>
            </View>
          </View>
          <Text style={styles.heroBody}>
            {report.makeablePercent}% of the analyzed library is currently within reach. The plan below is ranked for the biggest unlock impact.
          </Text>
          <Text style={styles.heroSupport}>{healthNarrative.body}</Text>
          {previewMode && (
            <Text style={styles.previewNote}>
              Free preview: KOOPE+ unlocks the full plan, full purchase ranking, and deeper bar-health coverage.
            </Text>
          )}
        </View>

        {!previewMode && (
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.quickActionCard} onPress={buildNextBarRun}>
              <Ionicons name="cart-outline" size={18} color={colors.accent} />
              <Text style={styles.quickActionTitle}>Build Next Bar Run</Text>
              <Text style={styles.quickActionBody}>Add the top 3 highest-impact buys to your list.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionCard} onPress={() => nav.navigate('InventoryInsights', { mode: 'health' })}>
              <Ionicons name="analytics-outline" size={18} color={colors.accent} />
              <Text style={styles.quickActionTitle}>Review Bar Health</Text>
              <Text style={styles.quickActionBody}>See category gaps and what they are costing you.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionCard} onPress={() => nav.navigate('Hosting')}>
              <Ionicons name="people-outline" size={18} color={colors.accent} />
              <Text style={styles.quickActionTitle}>Plan A Small Host Night</Text>
              <Text style={styles.quickActionBody}>Use your current bar for a 1-4 guest menu.</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What To Buy Next</Text>
          <Text style={styles.sectionSubtitle}>Highest-impact additions for maximum cocktail reach.</Text>
          {shoppingPlan.map((item) => (
            <View key={`${item.priority}-${item.name}`} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankBadgeText}>{item.priority}</Text>
                </View>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardMeta}>{item.unlockCount} new cocktails • {item.priceRange}</Text>
                </View>
              </View>
              <Text style={styles.cardBody}>{item.reason}</Text>
              {!previewMode && (
                <Text style={styles.impactNote}>Buying this first gives you one of the fastest reach gains in your current bar.</Text>
              )}
              <TouchableOpacity style={styles.inlineButton} onPress={() => addToShoppingList({ name: item.name })}>
                <Ionicons name="cart-outline" size={16} color={colors.accent} />
                <Text style={styles.inlineButtonText}>Add to shopping list</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Purchase Ranking</Text>
          <Text style={styles.sectionSubtitle}>Ranked by unlock potential across the library.</Text>
          {topPurchases.map((item, index) => (
            <View key={`${item.ingredient}-${index}`} style={styles.rowCard}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{item.ingredient}</Text>
                <Text style={styles.rowMeta}>{item.unlockCount} recipes unlocked</Text>
              </View>
              <TouchableOpacity style={styles.rowAction} onPress={() => addToShoppingList({ name: item.ingredient, category: item.category })}>
                <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Gaps</Text>
          <Text style={styles.sectionSubtitle}>The biggest holes reducing your cocktail coverage today.</Text>
          {gaps.map((gap, index) => (
            <View key={`${gap.category}-${index}`} style={styles.card}>
              <View style={styles.gapHeader}>
                <Text style={styles.cardTitle}>{gap.category}</Text>
                <View style={[styles.severityBadge, gap.severity === 'critical' ? styles.severityCritical : gap.severity === 'moderate' ? styles.severityModerate : styles.severityMinor]}>
                  <Text style={styles.severityBadgeText}>{gap.severity.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>{gap.blockedRecipeCount} recipes blocked</Text>
              <Text style={styles.cardBody}>{gap.suggestion}</Text>
            </View>
          ))}
        </View>

        {!previewMode && report.underusedBottles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Use These More</Text>
            <Text style={styles.sectionSubtitle}>Bottles in your bar with unused reach.</Text>
            {report.underusedBottles.slice(0, 4).map((item, index) => (
              <View key={`${item.bottle.id}-${index}`} style={styles.rowCard}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{item.bottle.name}</Text>
                  <Text style={styles.rowMeta}>{item.recipeCount} recipes available</Text>
                </View>
                <Text style={styles.rowHint}>{item.suggestion}</Text>
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

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(4),
    gap: spacing(2.5),
  },
  emptyIconCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(214,138,56,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(1),
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    marginTop: spacing(1),
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(1.75),
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.goldText,
    letterSpacing: 0.2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing(2),
    gap: spacing(2),
  },
  heroCard: {
    backgroundColor: `${colors.accent}12`,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: `${colors.accent}28`,
    padding: spacing(2),
    gap: spacing(1.25),
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing(2),
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroValue: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
  },
  heroStatus: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    marginTop: spacing(0.25),
  },
  heroPill: {
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderWidth: 1,
    borderColor: colors.line,
  },
  heroPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  heroBody: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  heroSupport: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 19,
  },
  previewNote: {
    fontSize: 12,
    color: colors.accent,
    lineHeight: 18,
  },
  quickActionsRow: {
    gap: spacing(1.25),
  },
  quickActionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
    gap: spacing(0.75),
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  quickActionBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
  },
  section: {
    gap: spacing(1.25),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.subtext,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
    gap: spacing(1),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
  },
  cardTitleWrap: {
    flex: 1,
    gap: spacing(0.25),
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.subtext,
  },
  cardBody: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  impactNote: {
    fontSize: 12,
    color: colors.accent,
    lineHeight: 17,
  },
  inlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    alignSelf: 'flex-start',
  },
  inlineButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  rowCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  rowMain: {
    flex: 1,
    gap: spacing(0.25),
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.subtext,
  },
  rowAction: {
    padding: spacing(0.5),
  },
  rowHint: {
    flex: 1,
    fontSize: 12,
    color: colors.subtext,
    textAlign: 'right',
  },
  gapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(1),
  },
  severityBadge: {
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderRadius: radii.pill,
  },
  severityCritical: {
    backgroundColor: 'rgba(220, 68, 55, 0.18)',
  },
  severityModerate: {
    backgroundColor: 'rgba(236, 166, 54, 0.18)',
  },
  severityMinor: {
    backgroundColor: 'rgba(95, 153, 102, 0.18)',
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
  },
});
