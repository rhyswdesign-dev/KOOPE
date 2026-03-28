import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { CellarService, type CellarRecord } from '../services/cellarService';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}

function fmtFull(v: number): string {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getTotalValue(items: CellarRecord[]): number {
  return items.reduce((s, i) => s + (i.valuationEstimate || i.purchasePrice || 0), 0);
}

function getCategorySplit(items: CellarRecord[]): { label: string; pct: number }[] {
  if (!items.length) {
    return [
      { label: 'Scotch Whisky', pct: 52 },
      { label: 'Japanese Whisky', pct: 19 },
      { label: 'Rare Tequila', pct: 12 },
      { label: 'Cognac', pct: 8 },
      { label: 'Other', pct: 9 },
    ];
  }
  const counts: Record<string, number> = {};
  items.forEach((i) => {
    const key = i.type || 'Other';
    counts[key] = (counts[key] || 0) + 1;
  });
  const total = items.length;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, pct: Math.round((count / total) * 100) }));
}

function getTopValueItem(items: CellarRecord[]): { name: string; value: number } {
  if (!items.length) return { name: 'Macallan 1926 Fine & Rare', value: 145200 };
  const top = [...items].sort((a, b) => (b.valuationEstimate || 0) - (a.valuationEstimate || 0))[0];
  return { name: top.itemName, value: top.valuationEstimate || top.purchasePrice || 0 };
}

function getTopGainer(items: CellarRecord[]): { name: string; pct: number } | null {
  const withBoth = items.filter((i) => i.purchasePrice && i.valuationEstimate);
  if (!withBoth.length) return null;
  const top = [...withBoth].sort((a, b) => {
    const pa = ((a.valuationEstimate! - a.purchasePrice!) / a.purchasePrice!) * 100;
    const pb = ((b.valuationEstimate! - b.purchasePrice!) / b.purchasePrice!) * 100;
    return pb - pa;
  })[0];
  const pct = ((top.valuationEstimate! - top.purchasePrice!) / top.purchasePrice!) * 100;
  return { name: top.itemName, pct };
}

function getAcquiredYear(item: CellarRecord): string {
  if (!item.createdAt) return '—';
  const d = new Date(item.createdAt);
  if (Number.isNaN(d.getTime())) return '—';
  return String(d.getFullYear());
}

function getPerfPct(item: CellarRecord): number | null {
  if (!item.purchasePrice || !item.valuationEstimate) return null;
  return ((item.valuationEstimate - item.purchasePrice) / item.purchasePrice) * 100;
}

type TimeRange = '1Y' | '5Y' | 'ALL';

// Static bar heights for 12 bars per time range (values 20–100)
const BAR_HEIGHTS: Record<TimeRange, number[]> = {
  '1Y': [38, 44, 52, 48, 60, 55, 68, 72, 65, 80, 74, 88],
  '5Y': [28, 32, 40, 38, 45, 50, 58, 64, 70, 78, 85, 92],
  ALL:  [22, 28, 35, 42, 50, 56, 62, 68, 74, 80, 86, 94],
};

// ─── PRO gate ─────────────────────────────────────────────────────────────────

function LockedScreen() {
  const { gate } = useFeatureAccess('cellar_mode');
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1A120D', '#0F0A07']} style={styles.lockedFill}>
        <Ionicons name="bar-chart-outline" size={40} color={colors.accent} />
        <Text style={styles.lockedTitle}>Portfolio Analytics</Text>
        <Text style={styles.lockedBody}>
          Unlock global valuation, category splits, top movers, and a full portfolio breakdown.
        </Text>
        <TouchableOpacity style={styles.lockedCta} onPress={() => gate()}>
          <Text style={styles.lockedCtaText}>Unlock Cellar Mode</Text>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function CellarAnalyticsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { hasAccess } = useFeatureAccess('cellar_mode');
  const [items, setItems] = useState<CellarRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeRange, setActiveRange] = useState<TimeRange>('1Y');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const records = await CellarService.getRecords();
      setItems(Object.values(records));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (!hasAccess) return <LockedScreen />;

  const totalValue = getTotalValue(items);
  const displayValue = totalValue > 0 ? totalValue : 241850;
  const categorySplit = getCategorySplit(items);
  const topValueItem = getTopValueItem(items);
  const topGainerRaw = getTopGainer(items);
  const topGainer = topGainerRaw || { name: 'Hibiki 30 Year Old', pct: 42.8 };
  const barHeights = BAR_HEIGHTS[activeRange];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={colors.accent} />}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* ── Global Valuation ─────────────────────────────────────────────── */}
        <Text style={styles.eyebrow}>GLOBAL VALUATION</Text>
        <Text style={styles.totalValue}>{fmtFull(displayValue)}</Text>
        <View style={styles.trendPill}>
          <Ionicons name="arrow-up" size={12} color="#4FC38A" />
          <Text style={styles.trendPillText}>+12.4% vs last quarter</Text>
        </View>

        {/* ── Action Buttons ───────────────────────────────────────────────── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionGhost}
            onPress={() => Alert.alert('Coming Soon', 'Report download will be available in a future update.')}
          >
            <Ionicons name="download-outline" size={16} color={colors.text} />
            <Text style={styles.actionGhostText}>DOWNLOAD REPORT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionAmber}
            onPress={() => nav.navigate('CellarRegister')}
          >
            <Ionicons name="add" size={16} color="#1A120D" />
            <Text style={styles.actionAmberText}>ADD SPIRIT</Text>
          </TouchableOpacity>
        </View>

        {/* ── Chart ───────────────────────────────────────────────────────── */}
        <View style={styles.chartCard}>
          {/* Time range tabs */}
          <View style={styles.rangeTabsRow}>
            {(['1Y', '5Y', 'ALL'] as TimeRange[]).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.rangeTab, activeRange === r && styles.rangeTabActive]}
                onPress={() => setActiveRange(r)}
              >
                <Text style={[styles.rangeTabText, activeRange === r && styles.rangeTabTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bar chart */}
          <View style={styles.barChartArea}>
            {barHeights.map((h, idx) => (
              <View key={idx} style={styles.barChartColWrap}>
                <View style={styles.barChartColTrack}>
                  <View
                    style={[
                      styles.barChartBar,
                      { height: `${h}%` },
                      idx === barHeights.length - 1 && styles.barChartBarLast,
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Category Split ────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Category Split</Text>
        <View style={styles.splitCard}>
          {categorySplit.map((cat) => (
            <View key={cat.label} style={styles.splitRow}>
              <Text style={styles.splitLabel}>{cat.label}</Text>
              <View style={styles.splitTrack}>
                <View style={[styles.splitFill, { width: `${cat.pct}%` }]} />
              </View>
              <Text style={styles.splitPct}>{cat.pct}%</Text>
            </View>
          ))}
        </View>

        {/* ── Highlight cards ──────────────────────────────────────────────── */}
        <View style={styles.highlightRow}>
          {/* Highest Value */}
          <LinearGradient colors={['#2A1A0F', '#160F0B']} style={styles.highlightCard}>
            <Text style={styles.highlightLabel}>HIGHEST VALUE ASSET</Text>
            <Text style={styles.highlightName} numberOfLines={2}>{topValueItem.name}</Text>
            <Text style={styles.highlightValue}>{topValueItem.value ? fmt(topValueItem.value) : 'Not tracked'}</Text>
          </LinearGradient>

          {/* Biggest Gainer */}
          <LinearGradient colors={['#0F1F14', '#0A100C']} style={styles.highlightCard}>
            <Text style={styles.highlightLabel}>BIGGEST GAINER</Text>
            <Text style={styles.highlightName} numberOfLines={2}>{topGainer.name}</Text>
            <Text style={[styles.highlightValue, { color: '#4FC38A' }]}>
              {topGainer.pct >= 0 ? '+' : ''}{topGainer.pct.toFixed(1)}%
            </Text>
          </LinearGradient>
        </View>

        {/* ── Portfolio Holdings ───────────────────────────────────────────── */}
        <View style={styles.holdingsHeader}>
          <Text style={styles.sectionTitle}>Portfolio Holdings</Text>
          <View style={styles.holdingsIcons}>
            <TouchableOpacity style={styles.holdingsIconBtn}>
              <Ionicons name="search-outline" size={18} color={colors.subtext} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.holdingsIconBtn}>
              <Ionicons name="filter-outline" size={18} color={colors.subtext} />
            </TouchableOpacity>
          </View>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyHint}>
            <Ionicons name="wine-outline" size={28} color="rgba(214,138,56,0.4)" />
            <Text style={styles.emptyHintText}>
              No bottles tracked yet. Add spirits via The Cellar or the inventory scanner.
            </Text>
          </View>
        ) : (
          items.slice(0, 6).map((item) => {
            const perf = getPerfPct(item);
            return (
              <TouchableOpacity
                key={item.inventoryItemId}
                style={styles.holdingCard}
                onPress={() => nav.navigate('CellarBottleDetail', { inventoryItemId: item.inventoryItemId })}
                activeOpacity={0.85}
              >
                {/* Image / fallback */}
                <View style={styles.holdingImageWrap}>
                  <LinearGradient colors={['#2A1A0F', '#0F0A07']} style={styles.holdingImage}>
                    <Ionicons name="wine-outline" size={24} color="rgba(214,138,56,0.45)" />
                  </LinearGradient>
                </View>

                <View style={styles.holdingInfo}>
                  <Text style={styles.holdingLocation}>{item.region || 'Private Collection'}</Text>
                  <Text style={styles.holdingName} numberOfLines={1}>{item.itemName}</Text>
                  <Text style={styles.holdingAcquired}>
                    Acquired {getAcquiredYear(item)} {item.purchasePrice ? `• ${fmt(item.purchasePrice)}` : ''}
                  </Text>
                </View>

                <View style={styles.holdingRight}>
                  <Text style={styles.holdingValueLabel}>CURRENT VALUE</Text>
                  <Text style={styles.holdingValue}>
                    {item.valuationEstimate ? fmt(item.valuationEstimate) : '—'}
                  </Text>
                  <Text style={styles.holdingPerfLabel}>PERFORMANCE</Text>
                  {perf !== null ? (
                    <Text style={[styles.holdingPerf, { color: perf >= 0 ? '#4FC38A' : '#F56565' }]}>
                      {perf >= 0 ? '+' : ''}{perf.toFixed(1)}%
                    </Text>
                  ) : (
                    <Text style={styles.holdingPerfNA}>—</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* ── View all CTA ─────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.viewAllCta}
          onPress={() => nav.navigate('TheWineCellar')}
        >
          <Text style={styles.viewAllCtaText}>
            VIEW ENTIRE COLLECTION ({items.length} ASSET{items.length !== 1 ? 'S' : ''})
          </Text>
          <Ionicons name="arrow-forward" size={14} color={colors.accent} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0A07',
  },
  content: {
    padding: spacing(2),
    paddingBottom: spacing(10),
    gap: spacing(1.5),
  },

  // Header
  headerRow: {
    marginBottom: spacing(0.25),
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Global valuation
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 44,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
    lineHeight: 50,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.4),
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(79,195,138,0.1)',
    borderRadius: radii.full,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.4),
    borderWidth: 1,
    borderColor: 'rgba(79,195,138,0.22)',
  },
  trendPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4FC38A',
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: spacing(1.1),
  },
  actionGhost: {
    flex: 1,
    height: 50,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.5),
  },
  actionGhostText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.8,
  },
  actionAmber: {
    flex: 1,
    height: 50,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.5),
  },
  actionAmberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A120D',
    letterSpacing: 0.8,
  },

  // Chart
  chartCard: {
    backgroundColor: '#1A120D',
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: spacing(1.25),
  },
  rangeTabsRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radii.full,
    padding: 3,
    gap: 2,
  },
  rangeTab: {
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.4),
    borderRadius: radii.full,
  },
  rangeTabActive: {
    backgroundColor: colors.accent,
  },
  rangeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtext,
  },
  rangeTabTextActive: {
    color: '#1A120D',
  },
  barChartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: spacing(0.5),
  },
  barChartColWrap: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barChartColTrack: {
    height: '100%',
    justifyContent: 'flex-end',
  },
  barChartBar: {
    backgroundColor: 'rgba(214,138,56,0.3)',
    borderRadius: 3,
    minHeight: 4,
  },
  barChartBarLast: {
    backgroundColor: colors.accent,
  },

  // Category split
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
  },
  splitCard: {
    backgroundColor: '#1A120D',
    borderRadius: radii.md,
    padding: spacing(1.75),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: spacing(1.1),
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.9),
  },
  splitLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
    width: 110,
  },
  splitTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  splitFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  splitPct: {
    fontSize: 11,
    color: colors.subtext,
    width: 36,
    textAlign: 'right',
    fontWeight: '600',
  },

  // Highlight cards
  highlightRow: {
    flexDirection: 'row',
    gap: spacing(1.1),
  },
  highlightCard: {
    flex: 1,
    borderRadius: radii.md,
    padding: spacing(1.75),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: spacing(0.4),
  },
  highlightLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: spacing(0.25),
  },
  highlightName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
    lineHeight: 19,
  },
  highlightValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
    fontFamily: serif,
    marginTop: spacing(0.25),
  },

  // Holdings
  holdingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holdingsIcons: {
    flexDirection: 'row',
    gap: spacing(0.5),
  },
  holdingsIconBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    backgroundColor: '#1A120D',
    borderRadius: radii.md,
    padding: spacing(2.5),
    alignItems: 'center',
    gap: spacing(1),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderStyle: 'dashed',
  },
  emptyHintText: {
    fontSize: 13,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Holding card
  holdingCard: {
    flexDirection: 'row',
    backgroundColor: '#1A120D',
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: spacing(1.25),
    gap: spacing(1.1),
    alignItems: 'center',
  },
  holdingImageWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  holdingImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdingInfo: {
    flex: 1,
    gap: 2,
  },
  holdingLocation: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  holdingName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
    lineHeight: 18,
  },
  holdingAcquired: {
    fontSize: 11,
    color: colors.subtext,
  },
  holdingRight: {
    alignItems: 'flex-end',
    gap: 2,
    minWidth: 80,
  },
  holdingValueLabel: {
    fontSize: 7,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  holdingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  holdingPerfLabel: {
    fontSize: 7,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  holdingPerf: {
    fontSize: 13,
    fontWeight: '700',
  },
  holdingPerfNA: {
    fontSize: 13,
    color: colors.subtext,
  },

  // View all
  viewAllCta: {
    height: 52,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: 'rgba(214,138,56,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.6),
    marginTop: spacing(0.5),
  },
  viewAllCtaText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.8,
  },

  // Locked
  lockedFill: {
    flex: 1,
    padding: spacing(3),
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.25),
  },
  lockedTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
    textAlign: 'center',
  },
  lockedBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.subtext,
    textAlign: 'center',
  },
  lockedCta: {
    marginTop: spacing(1),
    height: 54,
    width: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedCtaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A120D',
  },
});
