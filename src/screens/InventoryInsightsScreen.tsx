import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MainPageHeader from '../components/ui/MainPageHeader';
import { colors, radii, serif, spacing } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useAuth } from '../contexts/AuthContext';
import { InventoryService } from '../services/inventoryService';
import { HomeBarService } from '../services/homeBarService';
import { ShoppingListStore } from '../services/shoppingListStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type InventoryInsightsRouteProp = RouteProp<RootStackParamList, 'InventoryInsights'>;

type InsightMode = 'expiry' | 'health';

const EXPIRY_NOTIFY_KEY = '@KOOPE:expiry_notify_enabled_v1';

type InventoryLite = {
  name: string;
  category: string;
  subcategory?: string;
  addedAt: Date;
};

type ExpiryCandidate = {
  name: string;
  category: string;
  subcategory?: string;
  addedAt: Date;
  ageDays: number;
  shelfLifeDays: number;
  daysLeft: number;
};

type CoverageCategory = {
  label: string;
  pct: number;
  missing: string[];
  icon: keyof typeof Ionicons.glyphMap;
};

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

function normalizeInventory(
  items: { name: string; category?: string; subcategory?: string; addedAt?: Date }[],
): InventoryLite[] {
  return items
    .filter((i) => i.name)
    .map((i) => ({
      name: String(i.name),
      category: String(i.category || 'other').toLowerCase(),
      subcategory: i.subcategory ? String(i.subcategory).toLowerCase() : undefined,
      addedAt: i.addedAt instanceof Date ? i.addedAt : new Date(),
    }));
}

function shelfLifeDaysFor(item: InventoryLite): number {
  const name = item.name.toLowerCase();
  const category = item.category;
  const sub = item.subcategory || '';

  if (category === 'garnish') {
    if (
      sub.includes('herb') ||
      name.includes('mint') ||
      name.includes('basil') ||
      name.includes('rosemary')
    )
      return 4;
    if (
      sub.includes('citrus') ||
      name.includes('lemon') ||
      name.includes('lime') ||
      name.includes('orange')
    )
      return 10;
    if (name.includes('cherry') || name.includes('olive')) return 30;
    return 7;
  }

  if (category === 'mixer') {
    if (sub.includes('juice') || name.includes('juice')) return 7;
    if (sub.includes('cream') || name.includes('cream') || name.includes('milk')) return 5;
    if (name.includes('ginger beer') || name.includes('tonic') || name.includes('soda')) return 30;
    return 14;
  }

  if (category === 'syrup') return 60;
  if (category === 'ingredient') {
    if (name.includes('egg')) return 7;
    return 120;
  }

  return 365;
}

function urgencyColor(daysLeft: number): string {
  if (daysLeft <= 2) return colors.error;
  if (daysLeft <= 7) return colors.warning;
  return colors.success;
}

function urgencyLabel(daysLeft: number): string {
  if (daysLeft <= 0) return 'Use today';
  if (daysLeft === 1) return '1 day left';
  return `${daysLeft} days left`;
}

function formatAddedDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getBartenderHacks(item: ExpiryCandidate): string[] {
  const name = item.name.toLowerCase();
  const category = item.category.toLowerCase();
  const sub = item.subcategory || '';

  if (
    category === 'garnish' ||
    sub.includes('herb') ||
    name.includes('mint') ||
    name.includes('basil') ||
    name.includes('rosemary')
  ) {
    return [
      'Blanch herbs for 5 seconds, shock in ice water, then freeze for greener long-term garnish prep.',
      'Store fresh herbs upright in a small glass with water, loosely tented in the fridge.',
      'Chop excess herbs into ice cubes with filtered water for fast muddles later.',
    ];
  }

  if (
    name.includes('lemon') ||
    name.includes('lime') ||
    name.includes('orange') ||
    sub.includes('citrus') ||
    name.includes('juice')
  ) {
    return [
      'Zest strips first and freeze them flat for garnish service.',
      'Freeze juice in measured cubes (0.5-1 oz each) for predictable batching.',
      'Keep citrus dry in a breathable produce bag to reduce mold risk.',
    ];
  }

  if (category === 'syrup') {
    return [
      'Use sterilized bottles and date labels for every syrup batch.',
      'Refrigerate after opening and keep syrup necks clean to avoid contamination.',
      'Portion large batches into smaller service bottles to extend freshness.',
    ];
  }

  if (name.includes('vermouth')) {
    return [
      'Always refrigerate opened vermouth and mark the open date on the bottle.',
      'Transfer to a smaller bottle as volume drops to reduce oxygen exposure.',
      'Use older vermouth for cooking if flavor has flattened.',
    ];
  }

  if (
    category === 'mixer' &&
    (name.includes('cream') || name.includes('milk') || sub.includes('cream'))
  ) {
    return [
      'Keep dairy on the coldest shelf, not the fridge door, for longer stability.',
      'Pre-batch cream components only same-day for service quality.',
      'Use smell + texture checks before every shift even if date looks valid.',
    ];
  }

  return [
    'Label open dates clearly and rotate oldest-forward during prep.',
    'Batch small, not large, if usage is inconsistent week to week.',
    'Use vacuum-friendly containers when possible to reduce oxidation.',
  ];
}

function buildCoverage(inventory: InventoryLite[]): {
  categories: CoverageCategory[];
  healthScore: number;
  essentials: { name: string; unlocks: number }[];
} {
  const names = new Set(inventory.map((i) => i.name.toLowerCase()));

  const groups = [
    {
      label: 'Spirits',
      icon: 'wine' as const,
      essentials: ['vodka', 'gin', 'rum', 'tequila', 'whiskey'],
    },
    {
      label: 'Modifiers',
      icon: 'beaker' as const,
      essentials: ['sweet vermouth', 'dry vermouth', 'campari', 'triple sec', 'amaro'],
    },
    {
      label: 'Bitters',
      icon: 'flask' as const,
      essentials: ['angostura bitters', 'orange bitters', 'peychaud'],
    },
    {
      label: 'Mixers',
      icon: 'water' as const,
      essentials: ['tonic water', 'soda water', 'ginger beer', 'lime juice', 'orange juice'],
    },
    {
      label: 'Garnishes',
      icon: 'leaf' as const,
      essentials: ['lemon', 'lime', 'orange', 'mint', 'olive'],
    },
  ];

  const categories: CoverageCategory[] = groups.map((group) => {
    const hits = group.essentials.filter((essential) => {
      for (const name of names) {
        if (name.includes(essential) || essential.includes(name)) return true;
      }
      return false;
    });

    const pct = Math.round((hits.length / group.essentials.length) * 100);
    const missing = group.essentials.filter((x) => !hits.includes(x)).slice(0, 2);

    return {
      label: group.label,
      icon: group.icon,
      pct,
      missing,
    };
  });

  const healthScore = Math.round(categories.reduce((sum, c) => sum + c.pct, 0) / categories.length);

  const essentials = categories
    .flatMap((category) =>
      category.missing.map((missing) => ({
        name: missing,
        unlocks: Math.max(3, Math.round((100 - category.pct) / 8)),
      })),
    )
    .slice(0, 5);

  return { categories, healthScore, essentials };
}

function ExpiryView({
  hasAccess,
  candidates,
  notifyEnabled,
  onToggleNotify,
  onOpenHacks,
  onRemoveItem,
  onUpgrade,
  onPlanUseFirst,
}: {
  hasAccess: boolean;
  candidates: ExpiryCandidate[];
  notifyEnabled: boolean;
  onToggleNotify: (next: boolean) => void;
  onOpenHacks: (item: ExpiryCandidate) => void;
  onRemoveItem: (item: ExpiryCandidate) => void;
  onUpgrade: () => void;
  onPlanUseFirst: () => void;
}) {
  const urgentCount = candidates.filter((c) => c.daysLeft <= 2).length;

  return (
    <>
      <View style={styles.heroCard}>
        <View
          style={[
            styles.heroIconRing,
            { backgroundColor: 'rgba(244,67,54,0.12)', borderColor: 'rgba(244,67,54,0.25)' },
          ]}
        >
          <Ionicons name="time" size={26} color={colors.error} />
        </View>
        <View style={styles.heroTextBlock}>
          <Text style={styles.heroStat}>{urgentCount} urgent</Text>
          <Text style={styles.heroStatLabel}>items based on when they were added</Text>
        </View>
      </View>

      <View style={styles.notifyRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.notifyTitle}>Notify Me</Text>
          <Text style={styles.notifySubtitle}>
            Include soon-to-expire and expired items in notifications framework.
          </Text>
        </View>
        <Switch
          value={notifyEnabled}
          onValueChange={onToggleNotify}
          trackColor={{ false: colors.line, true: `${colors.accent}88` }}
          thumbColor={notifyEnabled ? colors.accent : colors.subtext}
        />
      </View>

      <Pressable style={styles.actionCard} onPress={onPlanUseFirst}>
        <View style={styles.actionCardHeader}>
          <Ionicons name="sparkles-outline" size={16} color={colors.accent} />
          <Text style={styles.actionCardEyebrow}>Use-first move</Text>
        </View>
        <Text style={styles.actionCardTitle}>
          Turn expiring ingredients into a small-host menu.
        </Text>
        <Text style={styles.actionCardBody}>
          Use Hosting to build a 1-4 guest plan around what should be poured first, not forgotten in
          the back of the bar.
        </Text>
      </Pressable>

      <Text style={styles.sectionLabel}>USE FIRST</Text>
      {candidates.length === 0 && (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>No short-shelf items are near expiry right now.</Text>
        </View>
      )}

      {candidates.map((item) => {
        const color = urgencyColor(item.daysLeft);
        return (
          <Pressable
            key={`${item.name}-${item.addedAt.toISOString()}`}
            style={styles.expiryRow}
            onPress={() => onOpenHacks(item)}
          >
            <View style={[styles.urgencyBar, { backgroundColor: color }]} />
            <View style={styles.expiryMain}>
              <View style={styles.expiryTop}>
                <Text style={styles.expiryName}>{item.name}</Text>
                <View style={styles.expiryTopActions}>
                  <View
                    style={[
                      styles.urgencyBadge,
                      { backgroundColor: `${color}22`, borderColor: `${color}55` },
                    ]}
                  >
                    <Text style={[styles.urgencyBadgeText, { color }]}>
                      {urgencyLabel(item.daysLeft)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.expiryDeleteBtn}
                    onPress={() => onRemoveItem(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.name}`}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.expiryCategory}>{item.category}</Text>
              <Text style={styles.entryDateText}>
                Added {formatAddedDate(item.addedAt)} ({item.ageDays} day
                {item.ageDays === 1 ? '' : 's'} ago)
              </Text>
              {hasAccess && (
                <Text style={styles.expirySuggestion}>
                  Est. shelf life {item.shelfLifeDays} days. Tap for Bartender Hacks.
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}

      {!hasAccess && (
        <Pressable style={styles.upgradeCard} onPress={onUpgrade}>
          <Ionicons name="lock-closed" size={20} color={colors.accent} />
          <Text style={styles.upgradeText}>
            Upgrade to PLUS to unlock full shelf-life guidance and suggestions.
          </Text>
        </Pressable>
      )}
    </>
  );
}

function healthColor(pct: number): string {
  if (pct >= 80) return colors.success;
  if (pct >= 50) return colors.warning;
  return colors.error;
}

function HealthView({
  hasAccess,
  coverage,
  onAddPossibleAddition,
  onUpgrade,
  onOpenOptimizer,
}: {
  hasAccess: boolean;
  coverage: ReturnType<typeof buildCoverage>;
  onAddPossibleAddition: (name: string) => void;
  onUpgrade: () => void;
  onOpenOptimizer: () => void;
}) {
  const topAddition = coverage.essentials[0];
  return (
    <>
      <View style={styles.scoreHeroCard}>
        <View style={styles.scoreRing}>
          <Text style={styles.scoreNumber}>{coverage.healthScore}</Text>
          <Text style={styles.scoreOf}>/100</Text>
        </View>
        <View style={styles.scoreTextBlock}>
          <Text style={styles.scoreLabel}>Bar Health Score</Text>
          <Text style={styles.scoreSubLabel}>Based on your current ingredient coverage</Text>
          <View style={styles.scoreBarTrack}>
            <View
              style={[
                styles.scoreBarFill,
                {
                  width: `${coverage.healthScore}%`,
                  backgroundColor: healthColor(coverage.healthScore),
                },
              ]}
            />
          </View>
        </View>
      </View>

      {topAddition && (
        <Pressable
          style={styles.actionCard}
          onPress={hasAccess ? () => onAddPossibleAddition(topAddition.name) : onUpgrade}
        >
          <View style={styles.actionCardHeader}>
            <Ionicons name="bar-chart-outline" size={16} color={colors.accent} />
            <Text style={styles.actionCardEyebrow}>Best next move</Text>
          </View>
          <Text style={styles.actionCardTitle}>
            {topAddition.name} is your clearest reach unlock right now.
          </Text>
          <Text style={styles.actionCardBody}>
            {hasAccess
              ? `Add it to your shopping list now and unlock roughly ${topAddition.unlocks} more recipe paths.`
              : 'KŌOPE+ shows which additions give your bar the biggest jump in cocktail reach.'}
          </Text>
          {hasAccess && (
            <TouchableOpacity
              style={styles.actionInlineButton}
              onPress={(e) => {
                // This button sits inside the card's own Pressable (which adds
                // topAddition to the shopping list on tap) — without stopping
                // propagation here, that outer handler was firing instead of
                // (or as well as) navigating to the optimizer.
                e.stopPropagation();
                onOpenOptimizer();
              }}
            >
              <Ionicons name="arrow-forward-circle-outline" size={16} color={colors.accent} />
              <Text style={styles.actionInlineButtonText}>Open full optimizer</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      )}

      <Text style={styles.sectionLabel}>COVERAGE BY CATEGORY</Text>
      {coverage.categories.map((cat) => (
        <View key={cat.label} style={styles.coverageRow}>
          <View style={styles.coverageLeft}>
            <View
              style={[styles.coverageIconWrap, { backgroundColor: `${healthColor(cat.pct)}18` }]}
            >
              <Ionicons name={cat.icon} size={16} color={healthColor(cat.pct)} />
            </View>
            <View>
              <Text style={styles.coverageLabel}>{cat.label}</Text>
              {cat.missing.length > 0 && (
                <Text style={styles.coverageMissing}>Missing: {cat.missing.join(', ')}</Text>
              )}
            </View>
          </View>
          <View style={styles.coverageRight}>
            <View style={styles.coverageTrack}>
              <View
                style={[
                  styles.coverageFill,
                  { width: `${cat.pct}%`, backgroundColor: healthColor(cat.pct) },
                ]}
              />
            </View>
            <Text style={[styles.coveragePct, { color: healthColor(cat.pct) }]}>{cat.pct}%</Text>
          </View>
        </View>
      ))}

      {hasAccess && coverage.essentials.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: spacing(2.5) }]}>POSSIBLE ADDITIONS</Text>
          {coverage.essentials.map((item) => (
            <View key={item.name} style={styles.missingRow}>
              <View style={styles.missingLeft}>
                <Text style={styles.missingName}>{item.name}</Text>
                <Text style={styles.missingUnlocks}>Potential +{item.unlocks} recipes</Text>
              </View>
              <TouchableOpacity
                style={styles.addPossibleButton}
                onPress={() => onAddPossibleAddition(item.name)}
              >
                <Ionicons name="cart-outline" size={14} color={colors.bg} />
                <Text style={styles.addPossibleButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {!hasAccess && (
        <Pressable style={styles.upgradeCard} onPress={onUpgrade}>
          <Ionicons name="lock-closed" size={20} color={colors.accent} />
          <Text style={styles.upgradeText}>
            Upgrade to PLUS to unlock possible additions and full optimization.
          </Text>
        </Pressable>
      )}
    </>
  );
}

export default function InventoryInsightsScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<InventoryInsightsRouteProp>();
  const mode: InsightMode = route.params?.mode ?? 'health';
  const { user } = useAuth();

  const { hasAccess: hasExpiryAccess, gateWithTrigger: expiryGate } =
    useFeatureAccess('expiry_alerts');
  const { hasAccess: hasHealthAccess, gateWithTrigger: healthGate } =
    useFeatureAccess('bar_health_score');

  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryLite[]>([]);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [selectedHackItem, setSelectedHackItem] = useState<ExpiryCandidate | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(EXPIRY_NOTIFY_KEY)
      .then((stored) => setNotifyEnabled(stored === '1'))
      .catch(() => setNotifyEnabled(false));
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const local = await HomeBarService.getStoredIngredients();
        const normalizedLocal = normalizeInventory(
          local.map((item) => ({
            name: item.name,
            category: item.category,
            subcategory: item.subcategory,
            addedAt: item.addedAt,
          })),
        );

        let normalizedRemote: InventoryLite[] = [];
        if (user?.id) {
          const remote = await InventoryService.getUserInventory(user.id);
          normalizedRemote = normalizeInventory(
            remote.map((item) => ({
              name: item.item_name,
              category: item.category || item.item_type || 'other',
              subcategory: item.subcategory || undefined,
              addedAt: item.added_at ? new Date(item.added_at) : new Date(),
            })),
          );
        }

        const dedup = new Map<string, InventoryLite>();
        [...normalizedRemote, ...normalizedLocal].forEach((item) => {
          const key = `${item.name.toLowerCase()}|${item.category.toLowerCase()}`;
          if (!dedup.has(key)) dedup.set(key, item);
        });

        if (mounted) {
          setInventory(Array.from(dedup.values()));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const expiryCandidates = useMemo(() => {
    const now = new Date();
    return inventory
      .map((item): ExpiryCandidate => {
        const ageDays = daysBetween(item.addedAt, now);
        const shelfLifeDays = shelfLifeDaysFor(item);
        const daysLeft = shelfLifeDays - ageDays;
        return { ...item, ageDays, shelfLifeDays, daysLeft };
      })
      .filter((item) => item.shelfLifeDays <= 120 && item.daysLeft <= 14)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 10);
  }, [inventory]);

  const coverage = useMemo(() => buildCoverage(inventory), [inventory]);

  const handleToggleNotify = (next: boolean) => {
    setNotifyEnabled(next);
    AsyncStorage.setItem(EXPIRY_NOTIFY_KEY, next ? '1' : '0').catch(() => undefined);
  };

  const handleRemoveItem = (item: ExpiryCandidate) => {
    Alert.alert('Remove Item', `Remove ${item.name} from inventory?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (user?.id) {
            await InventoryService.removeFromInventory(user.id, item.name);
          }
          await HomeBarService.removeIngredientByName(item.name, item.category).catch(
            () => undefined,
          );
          setInventory((prev) =>
            prev.filter(
              (entry) =>
                !(
                  entry.name.toLowerCase() === item.name.toLowerCase() &&
                  entry.category.toLowerCase() === item.category.toLowerCase()
                ),
            ),
          );
        },
      },
    ]);
  };

  const inferShoppingCategory = (
    name: string,
  ): 'spirits_liquors' | 'mixers' | 'garnish' | 'bitters' | 'syrup' | 'other' => {
    const value = name.toLowerCase();
    if (value.includes('bitters')) return 'bitters';
    if (value.includes('syrup')) return 'syrup';
    if (
      value.includes('lemon') ||
      value.includes('lime') ||
      value.includes('mint') ||
      value.includes('olive')
    )
      return 'garnish';
    if (
      value.includes('juice') ||
      value.includes('tonic') ||
      value.includes('soda') ||
      value.includes('ginger beer')
    )
      return 'mixers';
    if (
      value.includes('vodka') ||
      value.includes('gin') ||
      value.includes('rum') ||
      value.includes('tequila') ||
      value.includes('whiskey') ||
      value.includes('vermouth') ||
      value.includes('amaro') ||
      value.includes('triple sec') ||
      value.includes('campari')
    )
      return 'spirits_liquors';
    return 'other';
  };

  const handleAddPossibleAddition = async (name: string) => {
    try {
      await ShoppingListStore.addItemToShoppingList(
        {
          name,
          category: inferShoppingCategory(name),
        },
        'Bar Health',
        user?.id || 'default',
      );
      Alert.alert('Added to Cart', `${name} was added to your shopping list.`);
    } catch {
      Alert.alert('Could Not Add', 'Please try again.');
    }
  };

  const title = mode === 'expiry' ? 'Expiry Alerts' : 'Bar Health Score';
  const subtitle =
    mode === 'expiry' ? 'Prioritized by entry date' : 'Coverage and gaps at a glance';
  const hasAccess = mode === 'expiry' ? hasExpiryAccess : hasHealthAccess;

  return (
    <SafeAreaView style={styles.container}>
      <MainPageHeader
        title={title}
        subtitle={subtitle}
        showBackButton
        onBackPress={() => nav.goBack()}
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {mode === 'expiry' && (
            <ExpiryView
              hasAccess={hasAccess}
              candidates={expiryCandidates}
              notifyEnabled={notifyEnabled}
              onToggleNotify={handleToggleNotify}
              onOpenHacks={(item) => setSelectedHackItem(item)}
              onRemoveItem={handleRemoveItem}
              onUpgrade={() => expiryGate('T4')}
              onPlanUseFirst={() => nav.navigate('Hosting')}
            />
          )}
          {mode === 'health' && (
            <HealthView
              hasAccess={hasAccess}
              coverage={coverage}
              onAddPossibleAddition={handleAddPossibleAddition}
              onUpgrade={() => healthGate('T4')}
              onOpenOptimizer={() => nav.navigate('BarOptimizer')}
            />
          )}
          <View style={{ height: spacing(4) }} />
        </ScrollView>
      )}

      <Modal
        visible={!!selectedHackItem}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedHackItem(null)}
      >
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bartender Hacks</Text>
              <TouchableOpacity onPress={() => setSelectedHackItem(null)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{selectedHackItem?.name}</Text>
            {(selectedHackItem ? getBartenderHacks(selectedHackItem) : []).map((tip) => (
              <View key={tip} style={styles.hackRow}>
                <Ionicons name="sparkles-outline" size={14} color={colors.accent} />
                <Text style={styles.hackText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      </Modal>
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
    padding: spacing(2.5),
    gap: spacing(1.5),
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginBottom: spacing(0.5),
  },
  heroIconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextBlock: {
    flex: 1,
  },
  heroStat: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    fontFamily: serif,
  },
  heroStatLabel: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
    marginTop: 2,
  },
  notifyRow: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    marginBottom: spacing(0.5),
  },
  actionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(1.75),
    gap: spacing(0.75),
    marginBottom: spacing(0.5),
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  actionCardEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  actionCardBody: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
  },
  actionInlineButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    marginTop: spacing(0.25),
  },
  actionInlineButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
  },
  notifyTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  notifySubtitle: {
    color: colors.subtext,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.subtext,
    letterSpacing: 1.2,
    marginBottom: spacing(0.5),
    marginTop: spacing(0.5),
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(1.5),
  },
  infoText: {
    color: colors.subtext,
    fontSize: 13,
  },
  expiryRow: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  urgencyBar: {
    width: 4,
  },
  expiryMain: {
    flex: 1,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1.75),
    gap: 3,
  },
  expiryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(1),
  },
  expiryTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  expiryName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  urgencyBadge: {
    paddingHorizontal: spacing(1.25),
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  urgencyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  expiryDeleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.error}44`,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.error}11`,
  },
  expiryCategory: {
    fontSize: 11,
    color: colors.subtext,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  entryDateText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
  },
  expirySuggestion: {
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 16,
    marginTop: 2,
  },
  scoreHeroCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.22)',
    padding: spacing(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2.5),
    marginBottom: spacing(0.5),
  },
  scoreRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.warning,
    backgroundColor: 'rgba(255,152,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    alignSelf: 'center',
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    fontFamily: serif,
    lineHeight: 24,
  },
  scoreOf: {
    fontSize: 11,
    color: colors.subtext,
    fontWeight: '700',
    lineHeight: 12,
    marginTop: 1,
  },
  scoreTextBlock: {
    flex: 1,
    gap: spacing(0.5),
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  scoreSubLabel: {
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 16,
  },
  scoreBarTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.pill,
    marginTop: spacing(0.75),
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  coverageRow: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: spacing(1.3),
    paddingHorizontal: spacing(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(1.5),
  },
  coverageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing(1),
  },
  coverageIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverageLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  coverageMissing: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  coverageRight: {
    width: 90,
    alignItems: 'flex-end',
    gap: 3,
  },
  coverageTrack: {
    width: 74,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  coverageFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  coveragePct: {
    fontSize: 11,
    fontWeight: '800',
  },
  missingRow: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  missingLeft: {
    flex: 1,
    gap: spacing(0.5),
    paddingRight: spacing(1),
  },
  missingName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  missingUnlocks: {
    color: colors.subtext,
    fontSize: 11,
    fontWeight: '600',
  },
  addPossibleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(1.1),
    paddingVertical: spacing(0.65),
  },
  addPossibleButtonText: {
    color: colors.bg,
    fontSize: 11,
    fontWeight: '800',
  },
  upgradeCard: {
    marginTop: spacing(1),
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(1.75),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  upgradeText: {
    flex: 1,
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 17,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing(2.5),
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
    gap: spacing(1),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: serif,
  },
  modalSubtitle: {
    color: colors.subtext,
    fontSize: 12,
    marginBottom: spacing(0.5),
  },
  hackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(0.75),
  },
  hackText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
});
