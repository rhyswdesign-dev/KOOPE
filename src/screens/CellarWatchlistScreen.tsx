import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { withScreenTour } from '../components/tour/withScreenTour';

// ─── mock data ────────────────────────────────────────────────────────────────

type WatchStatus = 'BUY' | 'HOLD' | 'WATCH';

interface WatchItem {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  currentRangeLow: number;
  currentRangeHigh: number;
  trendPct: number;
  targetBuy: number;
  rarityScore: number;
  status: WatchStatus;
  bookmarked: boolean;
}

const MOCK_WATCHLIST: WatchItem[] = [
  {
    id: '1',
    name: 'Macallan 25 Year Old',
    subtitle: 'SHERRY OAK RELEASE • 2022 EDITION',
    category: 'Single Malt',
    currentRangeLow: 1800,
    currentRangeHigh: 2200,
    trendPct: 8.4,
    targetBuy: 1700,
    rarityScore: 9.6,
    status: 'HOLD',
    bookmarked: true,
  },
  {
    id: '2',
    name: 'Pappy Van Winkle 23yr',
    subtitle: 'FAMILY RESERVE • BUFFALO TRACE DISTILLERY',
    category: 'Rare Bourbon',
    currentRangeLow: 3400,
    currentRangeHigh: 4100,
    trendPct: 14.2,
    targetBuy: 2900,
    rarityScore: 9.9,
    status: 'HOLD',
    bookmarked: false,
  },
  {
    id: '3',
    name: 'Hibiki 21 Year Old',
    subtitle: 'BLENDED JAPANESE WHISKY • SUNTORY',
    category: 'Single Malt',
    currentRangeLow: 650,
    currentRangeHigh: 820,
    trendPct: -4.8,
    targetBuy: 580,
    rarityScore: 8.7,
    status: 'BUY',
    bookmarked: true,
  },
  {
    id: '4',
    name: 'Ardbeg 1974 Single Cask',
    subtitle: 'ISLAY SINGLE MALT • CASK STRENGTH',
    category: 'Single Malt',
    currentRangeLow: 5200,
    currentRangeHigh: 6800,
    trendPct: 22.5,
    targetBuy: 4500,
    rarityScore: 9.8,
    status: 'WATCH',
    bookmarked: false,
  },
  {
    id: '5',
    name: 'Dom Pérignon 2012',
    subtitle: 'PLÉNITUDE P2 • CHAMPAGNE AOC',
    category: 'Vintage Cognac',
    currentRangeLow: 280,
    currentRangeHigh: 340,
    trendPct: 5.2,
    targetBuy: 250,
    rarityScore: 7.9,
    status: 'BUY',
    bookmarked: false,
  },
  {
    id: '6',
    name: 'Casa Dragones Joven',
    subtitle: 'ARTISAN SMALL BATCH • ULTRA PREMIUM',
    category: 'Rare Tequila',
    currentRangeLow: 180,
    currentRangeHigh: 230,
    trendPct: -2.1,
    targetBuy: 160,
    rarityScore: 7.4,
    status: 'WATCH',
    bookmarked: false,
  },
];

const CATEGORIES = ['All Spirits', 'Rare Bourbon', 'Single Malt', 'Vintage Cognac', 'Rare Tequila'];

function fmt(v: number): string {
  return `$${v.toLocaleString()}`;
}

function statusColor(s: WatchStatus): string {
  if (s === 'BUY') return '#4FC38A';
  if (s === 'HOLD') return colors.accent;
  return colors.subtext;
}

function statusBg(s: WatchStatus): string {
  if (s === 'BUY') return 'rgba(79,195,138,0.12)';
  if (s === 'HOLD') return 'rgba(214,138,56,0.12)';
  return 'rgba(255,255,255,0.06)';
}

// ─── PRO gate ─────────────────────────────────────────────────────────────────

function LockedScreen() {
  const { gate } = useFeatureAccess('cellar_mode');
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1A120D', '#0F0A07']} style={styles.lockedFill}>
        <Ionicons name="eye-off-outline" size={40} color={colors.accent} />
        <Text style={styles.lockedTitle}>Curated Watchlist</Text>
        <Text style={styles.lockedBody}>
          Monitor acquisition targets, track market trends, and get notified when elite bottles hit your target price.
        </Text>
        <TouchableOpacity style={styles.lockedCta} onPress={() => gate()}>
          <Text style={styles.lockedCtaText}>Unlock Cellar Mode</Text>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

function CellarWatchlistScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { hasAccess } = useFeatureAccess('cellar_mode');
  const [activeCategory, setActiveCategory] = useState('All Spirits');
  const [bookmarks, setBookmarks] = useState<Set<string>>(
    new Set(MOCK_WATCHLIST.filter((i) => i.bookmarked).map((i) => i.id))
  );

  if (!hasAccess) return <LockedScreen />;

  const filtered =
    activeCategory === 'All Spirits'
      ? MOCK_WATCHLIST
      : MOCK_WATCHLIST.filter((i) => i.category === activeCategory);

  const totalOpportunity = MOCK_WATCHLIST.reduce((s, i) => s + i.targetBuy, 0);
  const avgDelta =
    MOCK_WATCHLIST.reduce((s, i) => s + i.trendPct, 0) / MOCK_WATCHLIST.length;

  const toggleBookmark = (id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.pageTitle}>Curated Watchlist</Text>
        <Text style={styles.pageSubtitle}>MARKET TRACKING FOR ELITE ACQUISITIONS</Text>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>ACTIVE WATCHES</Text>
            <Text style={styles.statValue}>{MOCK_WATCHLIST.length} Bottles</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>TOTAL OPPORTUNITY</Text>
            <Text style={styles.statValue}>{fmt(totalOpportunity)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>AVG. TARGET DELTA</Text>
            <Text style={[styles.statValue, { color: avgDelta >= 0 ? '#4FC38A' : '#F56565' }]}>
              {avgDelta >= 0 ? '+' : ''}{avgDelta.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* ── Category filter ─────────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.filterChipText, activeCategory === cat && styles.filterChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Cards ───────────────────────────────────────────────────────── */}
        {filtered.map((item) => (
          <View key={item.id} style={styles.watchCard}>
            {/* Card hero gradient */}
            <LinearGradient
              colors={['#2A1A0F', '#0F0A07']}
              style={styles.watchCardHero}
            >
              <Ionicons name="wine-outline" size={56} color="rgba(214,138,56,0.35)" />
              <TouchableOpacity
                style={styles.bookmarkBtn}
                onPress={() => toggleBookmark(item.id)}
              >
                <Ionicons
                  name={bookmarks.has(item.id) ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={bookmarks.has(item.id) ? colors.accent : colors.subtext}
                />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.watchCardBody}>
              {/* Name + status */}
              <View style={styles.watchCardNameRow}>
                <View style={styles.watchCardNameBlock}>
                  <Text style={styles.watchCardName}>{item.name}</Text>
                  <Text style={styles.watchCardSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: statusBg(item.status), borderColor: statusColor(item.status) }]}>
                  <Text style={[styles.statusChipText, { color: statusColor(item.status) }]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              {/* Price metrics grid */}
              <View style={styles.watchMetricsGrid}>
                <View style={styles.watchMetric}>
                  <Text style={styles.watchMetricLabel}>CURRENT RANGE</Text>
                  <Text style={styles.watchMetricValue}>
                    {fmt(item.currentRangeLow)} – {fmt(item.currentRangeHigh)}
                  </Text>
                </View>
                <View style={styles.watchMetric}>
                  <Text style={styles.watchMetricLabel}>MARKET TREND</Text>
                  <Text style={[styles.watchMetricValue, { color: item.trendPct >= 0 ? '#4FC38A' : '#F56565' }]}>
                    {item.trendPct >= 0 ? '+' : ''}{item.trendPct}%
                  </Text>
                </View>
                <View style={styles.watchMetric}>
                  <Text style={styles.watchMetricLabel}>TARGET BUY</Text>
                  <Text style={styles.watchMetricValue}>{fmt(item.targetBuy)}</Text>
                </View>
                <View style={styles.watchMetric}>
                  <Text style={styles.watchMetricLabel}>RARITY SCORE</Text>
                  <Text style={styles.watchMetricValue}>{item.rarityScore}/10</Text>
                </View>
              </View>

              {/* CTA */}
              <TouchableOpacity
                style={styles.watchAnalyticsBtn}
                onPress={() => Alert.alert('Analytics', 'The full analytics view is not enabled for this build yet.')}
              >
                <Text style={styles.watchAnalyticsBtnText}>VIEW FULL ANALYTICS</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* ── Footer note ─────────────────────────────────────────────────── */}
        <View style={styles.footerNote}>
          <Ionicons name="information-circle-outline" size={14} color={colors.subtext} />
          <Text style={styles.footerNoteText}>
            Watchlist data is curated by KOOPE's market intelligence team. Updated weekly.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default withScreenTour(CellarWatchlistScreen, 'cellar_watch');

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

  // Page title
  pageTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
    lineHeight: 38,
  },
  pageSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#1A120D',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  statBlock: {
    flex: 1,
    padding: spacing(1.5),
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing(0.4),
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
    textAlign: 'center',
  },

  // Filter bar
  filterBar: {
    gap: spacing(0.75),
    paddingRight: spacing(1),
  },
  filterChip: {
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.6),
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtext,
  },
  filterChipTextActive: {
    color: '#1A120D',
  },

  // Watch card
  watchCard: {
    backgroundColor: '#1A120D',
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  watchCardHero: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bookmarkBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchCardBody: {
    padding: spacing(1.75),
    gap: spacing(1.25),
  },
  watchCardNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing(0.75),
  },
  watchCardNameBlock: {
    flex: 1,
  },
  watchCardName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
    lineHeight: 26,
  },
  watchCardSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: spacing(0.9),
    paddingVertical: spacing(0.4),
    borderRadius: radii.full,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  watchMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.75),
  },
  watchMetric: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: radii.sm,
    padding: spacing(1.1),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  watchMetricLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing(0.35),
  },
  watchMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  watchAnalyticsBtn: {
    height: 44,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: 'rgba(214,138,56,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.5),
  },
  watchAnalyticsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.8,
  },

  // Footer
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(0.6),
    paddingHorizontal: spacing(0.5),
  },
  footerNoteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: colors.subtext,
    fontStyle: 'italic',
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
