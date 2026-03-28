import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { CellarService, type CellarRecord } from '../services/cellarService';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { withScreenTour } from '../components/tour/withScreenTour';
import TutorialIconButton from '../components/tour/TutorialIconButton';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function getRecommendation(item: CellarRecord): 'Hold' | 'Open Soon' | 'Review' {
  if ((item.valuationEstimate || 0) > (item.purchasePrice || 0) && !!item.purchasePrice) return 'Hold';
  if ((item.drinkingWindowStart || '').toLowerCase() === 'now') return 'Open Soon';
  return 'Review';
}

function getMarketHealthTier(totalValue: number): string {
  if (totalValue >= 10000) return 'Premier Tier';
  if (totalValue >= 2000) return 'Elite Tier';
  if (totalValue >= 500) return 'Silver Tier';
  return 'Starter Tier';
}

function getTotalPortfolioValue(items: CellarRecord[]): number {
  return items.reduce((sum, item) => sum + (item.valuationEstimate || item.purchasePrice || 0), 0);
}

function getTotalCostBasis(items: CellarRecord[]): number {
  return items.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
}

function getPortfolioChangePct(items: CellarRecord[]): number {
  const cost = getTotalCostBasis(items);
  if (!cost) return 0;
  const value = getTotalPortfolioValue(items);
  return ((value - cost) / cost) * 100;
}

function getReadyToOpen(items: CellarRecord[]): CellarRecord[] {
  return items.filter((i) => getRecommendation(i) === 'Open Soon');
}

function getTopMovers(items: CellarRecord[]): CellarRecord[] {
  return items
    .filter((i) => i.purchasePrice && i.valuationEstimate)
    .sort((a, b) => {
      const da = Math.abs((a.valuationEstimate || 0) - (a.purchasePrice || 0));
      const db = Math.abs((b.valuationEstimate || 0) - (b.purchasePrice || 0));
      return db - da;
    })
    .slice(0, 3);
}

function getVaultIntelligence(items: CellarRecord[]): string {
  if (!items.length) return 'Start building your collection to receive curated market intelligence tailored to your portfolio.';
  const holdItems = items.filter((i) => getRecommendation(i) === 'Hold');
  const topByValue = [...items].sort((a, b) => (b.valuationEstimate || 0) - (a.valuationEstimate || 0))[0];
  if (holdItems.length > items.length / 2) {
    return `Secondary market demand for ${topByValue?.type || 'premium'} expressions has surged this quarter. Consider reviewing your longest-held bottles for emerging exit windows.`;
  }
  return `Your collection has ${items.length} bottle${items.length !== 1 ? 's' : ''} tracked. Adding purchase prices and valuations enables deeper market intelligence signals.`;
}

// ─── PRO gate screen ─────────────────────────────────────────────────────────

function ProLockedScreen() {
  const { gate } = useFeatureAccess('cellar_mode');
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1A120D', '#0F0A07']} style={styles.lockedFill}>
        <View style={styles.lockedIconWrap}>
          <Ionicons name="lock-closed" size={44} color={colors.accent} />
        </View>
        <Text style={styles.lockedEyebrow}>PRO</Text>
        <Text style={styles.lockedTitle}>The Cellar</Text>
        <Text style={styles.lockedBody}>
          Track your private spirits collection like a portfolio. Monitor valuations, drinking windows, and collector intelligence in one place.
        </Text>
        <View style={styles.lockedFeatures}>
          {[
            'Portfolio valuation dashboard',
            'Per-bottle market intelligence',
            'Top movers & strategy alerts',
            'Collector analytics & watchlist',
          ].map((f) => (
            <View key={f} style={styles.lockedFeatureRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
              <Text style={styles.lockedFeatureText}>{f}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.lockedCta} onPress={() => gate()}>
          <Text style={styles.lockedCtaText}>Unlock Cellar Mode</Text>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

function TheCellarScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { hasAccess } = useFeatureAccess('cellar_mode');
  const [items, setItems] = useState<CellarRecord[]>([]);
  const [loading, setLoading] = useState(false);

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

  if (!hasAccess) return <ProLockedScreen />;

  const totalValue = getTotalPortfolioValue(items);
  const costBasis = getTotalCostBasis(items);
  const changePct = getPortfolioChangePct(items);
  const healthTier = getMarketHealthTier(totalValue);
  const readyItems = getReadyToOpen(items);
  const topMovers = getTopMovers(items);
  const intelligence = getVaultIntelligence(items);

  const sealedCount = items.filter((i) => i.quantity === 'full' || i.quantity === 'half').length;
  const openedCount = items.filter((i) => i.quantity === 'low' || i.quantity === 'empty').length;
  const holdCount = items.filter((i) => getRecommendation(i) === 'Hold').length;
  const openSoonCount = items.filter((i) => getRecommendation(i) === 'Open Soon').length;

  const sealedPct = items.length ? Math.round((sealedCount / items.length) * 100) : 0;
  const openedPct = items.length ? Math.round((openedCount / items.length) * 100) : 0;
  const holdPct = items.length ? Math.round((holdCount / items.length) * 100) : 0;
  const openSoonPct = items.length ? Math.round((openSoonCount / items.length) * 100) : 0;

  const changePctAbs = Math.abs(changePct);
  const changePositive = changePct >= 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={colors.accent} />}
      >
        {/* ── Portfolio Card ──────────────────────────────────────────────── */}
        <LinearGradient
          colors={['#2A1A0F', '#160F0B']}
          style={styles.portfolioCard}
        >
          <View style={styles.portfolioCardHeader}>
            <Text style={styles.portfolioLabel}>ESTIMATED PORTFOLIO VALUE</Text>
            <View style={styles.portfolioHeaderIcons}>
              <TutorialIconButton
                onPress={() => nav.navigate('Tutorials', { contextTourId: 'cellar_home' })}
                size={16}
                buttonSize={32}
              />
              <TouchableOpacity
                style={styles.portfolioIconBtn}
                onPress={() => nav.navigate('CellarWatchlist')}
              >
                <Ionicons name="eye-outline" size={18} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.portfolioIconBtn}
                onPress={() => nav.navigate('CellarAnalytics')}
              >
                <Ionicons name="bar-chart-outline" size={18} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.portfolioValue}>{items.length ? fmt(totalValue) : '$0'}</Text>
          {costBasis > 0 && (
            <View style={styles.portfolioChangePill}>
              <Ionicons
                name={changePositive ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={changePositive ? '#4FC38A' : '#F56565'}
              />
              <Text style={[styles.portfolioChangePct, { color: changePositive ? '#4FC38A' : '#F56565' }]}>
                {changePositive ? '+' : '-'}{changePctAbs.toFixed(1)}%
              </Text>
              <Text style={styles.portfolioChangeSub}>vs cost basis of {fmt(costBasis)}</Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Quick Stats Row ─────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL COLLECTION</Text>
            <Text style={styles.statValue}>{items.length} Bottle{items.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>MARKET HEALTH</Text>
            <View style={styles.statHealthRow}>
              <Ionicons name="checkmark-circle" size={14} color="#4FC38A" />
              <Text style={styles.statHealthValue}>{healthTier}</Text>
            </View>
          </View>
        </View>

        {/* ── Ready to Open ───────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionCurated}>Curated Selection</Text>
            <Text style={styles.sectionTitle}>Ready to Open</Text>
          </View>
          {readyItems.length > 0 && (
            <TouchableOpacity onPress={() => nav.navigate('CellarAnalytics')}>
              <Text style={styles.viewAllLink}>VIEW ALL</Text>
            </TouchableOpacity>
          )}
        </View>

        {readyItems.length === 0 ? (
          <View style={styles.emptyHint}>
            <Ionicons name="wine-outline" size={28} color="rgba(214,138,56,0.4)" />
            <Text style={styles.emptyHintText}>
              Bottles whose drinking window is set to "Now" will appear here.
            </Text>
          </View>
        ) : (
          readyItems.map((item) => (
            <TouchableOpacity
              key={item.inventoryItemId}
              style={styles.readyCard}
              onPress={() => nav.navigate('CellarBottleDetail', { inventoryItemId: item.inventoryItemId })}
              activeOpacity={0.85}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.readyCardImage} resizeMode="cover" />
              ) : (
                <View style={[styles.readyCardImage, styles.readyCardImageFallback]}>
                  <Ionicons name="wine-outline" size={32} color="rgba(214,138,56,0.6)" />
                </View>
              )}
              <View style={styles.readyCardContent}>
                <View style={styles.readyCardTopRow}>
                  <Text style={styles.readyCardType}>{(item.type || 'SPIRIT').toUpperCase()}</Text>
                  <Ionicons name="star" size={14} color={colors.accent} />
                </View>
                <Text style={styles.readyCardName} numberOfLines={2}>{item.itemName}</Text>
                <Text style={styles.readyCardDesc} numberOfLines={2}>
                  {item.tastingNotes || item.serveGuidance || `${item.brand || 'Private Reserve'} • ${item.region || 'Private Collection'}`}
                </Text>
                <View style={styles.readyCardBottom}>
                  <Text style={styles.readyCardPrice}>{item.valuationEstimate ? fmt(item.valuationEstimate) : 'Not tracked'}</Text>
                  <View style={styles.readyCardBasket}>
                    <Ionicons name="basket-outline" size={16} color={colors.accent} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* ── Status Distribution ─────────────────────────────────────────── */}
        {items.length > 0 && (
          <>
            <Text style={styles.distLabel}>STATUS DISTRIBUTION</Text>
            <View style={styles.distSection}>
              <BarRow label="Sealed" count={sealedCount} pct={sealedPct} total={items.length} color={colors.accent} />
              <BarRow label="Opened" count={openedCount} pct={openedPct} total={items.length} color="#C7B8A5" />
            </View>

            <Text style={styles.distLabel}>STRATEGY ALIGNMENT</Text>
            <View style={styles.distSection}>
              <BarRow label="Hold for Growth" count={holdCount} pct={holdPct} total={items.length} color="#4FC38A" />
              <BarRow label="Drink Now" count={openSoonCount} pct={openSoonPct} total={items.length} color="#F6AD55" />
            </View>
          </>
        )}

        {/* ── Top Movers ──────────────────────────────────────────────────── */}
        {topMovers.length > 0 && (
          <>
            <Text style={styles.distLabel}>TOP MOVERS</Text>
            <View style={styles.topMoversCard}>
              {topMovers.map((item) => {
                const delta = (item.valuationEstimate || 0) - (item.purchasePrice || 0);
                const positive = delta >= 0;
                const pct = item.purchasePrice ? (delta / item.purchasePrice) * 100 : 0;
                return (
                  <TouchableOpacity
                    key={item.inventoryItemId}
                    style={styles.moverRow}
                    onPress={() => nav.navigate('CellarBottleDetail', { inventoryItemId: item.inventoryItemId })}
                  >
                    <Ionicons
                      name={positive ? 'trending-up' : delta < 0 ? 'trending-down' : 'remove'}
                      size={18}
                      color={positive ? '#4FC38A' : delta < 0 ? '#F56565' : colors.subtext}
                    />
                    <View style={styles.moverInfo}>
                      <Text style={styles.moverName} numberOfLines={1}>{item.itemName}</Text>
                      <Text style={styles.moverBrand}>{item.brand || item.type || 'Private Reserve'}</Text>
                    </View>
                    <View style={styles.moverRight}>
                      <Text style={[styles.moverDelta, { color: positive ? '#4FC38A' : '#F56565' }]}>
                        {positive ? '+' : ''}{fmt(delta)}
                      </Text>
                      <Text style={[styles.moverPct, { color: positive ? '#4FC38A' : '#F56565' }]}>
                        {positive ? '+' : ''}{pct.toFixed(1)}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* ── Vault Intelligence ──────────────────────────────────────────── */}
        <View style={styles.intelligenceCard}>
          <View style={styles.intelligenceHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.accent} />
            <Text style={styles.intelligenceTitle}>Vault Intelligence</Text>
          </View>
          <Text style={styles.intelligenceBody}>{intelligence}</Text>
        </View>

        {/* ── Bottom CTAs ─────────────────────────────────────────────────── */}
        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.ctaGhostAmber}
            onPress={() => nav.navigate('CellarRegister')}
          >
            <Ionicons name="add-outline" size={16} color={colors.accent} />
            <Text style={styles.ctaGhostAmberText}>ADD ASSET</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ctaGhost}
            onPress={() => nav.navigate('CellarAnalytics')}
          >
            <Ionicons name="pulse-outline" size={16} color={colors.text} />
            <Text style={styles.ctaGhostText}>ACTIVITY</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── BarRow ──────────────────────────────────────────────────────────────────

function BarRow({
  label,
  count,
  pct,
  total,
  color,
}: {
  label: string;
  count: number;
  pct: number;
  total: number;
  color: string;
}) {
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barCount}>
        {count} · {pct}%
      </Text>
    </View>
  );
}

export default withScreenTour(TheCellarScreen, 'cellar_home');

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

  // Portfolio card
  portfolioCard: {
    borderRadius: radii.lg,
    padding: spacing(2.5),
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.2)',
  },
  portfolioCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(0.8),
  },
  portfolioLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  portfolioHeaderIcons: {
    flexDirection: 'row',
    gap: spacing(0.75),
  },
  portfolioIconBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: 'rgba(214,138,56,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
    lineHeight: 54,
  },
  portfolioChangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.4),
    marginTop: spacing(0.75),
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(79,195,138,0.1)',
    borderRadius: radii.full,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.4),
    borderWidth: 1,
    borderColor: 'rgba(79,195,138,0.22)',
  },
  portfolioChangePct: {
    fontSize: 13,
    fontWeight: '700',
  },
  portfolioChangeSub: {
    fontSize: 11,
    color: colors.subtext,
    marginLeft: spacing(0.25),
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: spacing(1.25),
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1A120D',
    borderRadius: radii.md,
    padding: spacing(1.75),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing(0.55),
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
  },
  statHealthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.4),
  },
  statHealthValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    fontStyle: 'italic',
    fontFamily: serif,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing(0.5),
  },
  sectionCurated: {
    fontSize: 11,
    color: colors.subtext,
    fontStyle: 'italic',
    marginBottom: spacing(0.2),
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
    lineHeight: 32,
  },
  viewAllLink: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.8,
  },

  // Empty hint
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

  // Ready to open cards
  readyCard: {
    flexDirection: 'row',
    backgroundColor: '#1A120D',
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  readyCardImage: {
    width: 90,
    height: 100,
    backgroundColor: '#23160F',
  },
  readyCardImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyCardContent: {
    flex: 1,
    padding: spacing(1.5),
    gap: spacing(0.4),
  },
  readyCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readyCardType: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.9,
  },
  readyCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
    lineHeight: 22,
  },
  readyCardDesc: {
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 16,
  },
  readyCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing(0.5),
  },
  readyCardPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  readyCardBasket: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: 'rgba(214,138,56,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Distribution bars
  distLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: spacing(0.5),
    marginBottom: spacing(0.75),
  },
  distSection: {
    backgroundColor: '#1A120D',
    borderRadius: radii.md,
    padding: spacing(1.75),
    gap: spacing(1.1),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: spacing(0.5),
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.9),
  },
  barLabel: {
    fontSize: 12,
    color: colors.text,
    width: 100,
    fontWeight: '600',
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barCount: {
    fontSize: 11,
    color: colors.subtext,
    width: 52,
    textAlign: 'right',
  },

  // Top movers
  topMoversCard: {
    backgroundColor: '#1A120D',
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: spacing(0.5),
  },
  moverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(1.5),
    gap: spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  moverInfo: {
    flex: 1,
  },
  moverName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
  },
  moverBrand: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 1,
  },
  moverRight: {
    alignItems: 'flex-end',
  },
  moverDelta: {
    fontSize: 14,
    fontWeight: '700',
  },
  moverPct: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Intelligence card
  intelligenceCard: {
    backgroundColor: '#1A120D',
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.15)',
  },
  intelligenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.6),
    marginBottom: spacing(0.9),
  },
  intelligenceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  intelligenceBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
    fontStyle: 'italic',
  },

  // CTAs
  ctaRow: {
    flexDirection: 'row',
    gap: spacing(1.25),
  },
  ctaGhostAmber: {
    flex: 1,
    height: 52,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.6),
  },
  ctaGhostAmberText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.8,
  },
  ctaGhost: {
    flex: 1,
    height: 52,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.6),
  },
  ctaGhostText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.8,
  },

  // PRO locked
  lockedFill: {
    flex: 1,
    padding: spacing(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedIconWrap: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: 'rgba(214,138,56,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
  },
  lockedEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing(0.6),
  },
  lockedTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
    marginBottom: spacing(1),
    textAlign: 'center',
  },
  lockedBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: spacing(2.5),
  },
  lockedFeatures: {
    width: '100%',
    gap: spacing(0.9),
    marginBottom: spacing(3),
  },
  lockedFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  lockedFeatureText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  lockedCta: {
    width: '100%',
    height: 54,
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
