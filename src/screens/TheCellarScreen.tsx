import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { CellarService, type CellarRecord } from '../services/cellarService';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function getCollectorScore(item: CellarRecord): number {
  let score = 0;
  if (item.purchasePrice) score += 2;
  if (item.valuationEstimate) score += 2;
  if (item.cellarNotes) score += 2;
  if (item.drinkingWindowStart || item.drinkingWindowEnd) score += 2;
  if (item.quantity && item.quantity !== 'empty') score += 1;
  return score;
}

function formatWindow(item: CellarRecord): string {
  return `${item.drinkingWindowStart || 'Now'} - ${item.drinkingWindowEnd || 'TBD'}`;
}

function getPortfolioChange(items: CellarRecord[]): number {
  return items.reduce((sum, item) => {
    if (!item.purchasePrice || !item.valuationEstimate) return sum;
    return sum + (item.valuationEstimate - item.purchasePrice);
  }, 0);
}

function getLotNumber(index: number): string {
  return `Lot ${String(index + 1).padStart(2, '0')}`;
}

function getRecommendation(item: CellarRecord): 'Hold' | 'Open Soon' | 'Review' {
  if ((item.valuationEstimate || 0) > (item.purchasePrice || 0) && !!item.purchasePrice) {
    return 'Hold';
  }
  if ((item.drinkingWindowStart || '').toLowerCase() === 'now') {
    return 'Open Soon';
  }
  return 'Review';
}

function getRecommendationReason(item: CellarRecord): string {
  const recommendation = getRecommendation(item);
  if (recommendation === 'Hold') {
    return 'Market signal is stronger than replacement value right now.';
  }
  if (recommendation === 'Open Soon') {
    return 'This bottle looks better positioned as a drinking bottle than a long hold.';
  }
  return 'Add purchase price or notes to sharpen the collector read.';
}

function getEstimatedRange(item: CellarRecord): string {
  const base = item.valuationEstimate || item.purchasePrice || 0;
  if (!base) return 'Not enough data';
  const lower = Math.round(base * 0.92);
  const upper = Math.round(base * 1.08);
  return `${formatMoney(lower)} - ${formatMoney(upper)}`;
}

function getLotImage(item: CellarRecord) {
  if (item.imageUrl) {
    return { uri: item.imageUrl };
  }
  return null;
}

function renderLotCard(
  item: CellarRecord,
  index: number,
  onPress: (inventoryItemId: string) => void,
) {
  const hasValuation = (item.valuationEstimate || 0) > 0;
  const recommendation = getRecommendation(item);

  return (
    <TouchableOpacity key={item.inventoryItemId} style={styles.lotCard} activeOpacity={0.92} onPress={() => onPress(item.inventoryItemId)}>
      <View style={styles.lotHeader}>
        <Text style={styles.lotNumber}>{getLotNumber(index)}</Text>
        <View style={styles.lotHeaderRight}>
          <Text style={styles.lotRecommendation}>{recommendation}</Text>
          <Text style={styles.lotQuantity}>{String(item.quantity || 'full').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.lotVisualWrap}>
        {getLotImage(item) ? (
          <Image source={getLotImage(item) as any} style={styles.lotBottleImage} resizeMode="cover" />
        ) : (
          <View style={styles.lotBottleAura}>
            <Ionicons name="wine-outline" size={68} color="rgba(246,236,228,0.84)" />
          </View>
        )}
      </View>

      <View style={styles.lotBody}>
        <Text style={styles.lotName} numberOfLines={2}>{item.itemName}</Text>
      <Text style={styles.lotMeta} numberOfLines={1}>
          {item.brand || item.region || 'Collector bottle'}
        </Text>
        <Text style={styles.lotRecommendationReason}>{getRecommendationReason(item)}</Text>
      </View>

      <View style={styles.lotDivider} />

      <View style={styles.lotPriceRow}>
        <View>
          <Text style={styles.lotMetricLabel}>Valuation</Text>
          <Text style={styles.lotMetricValue}>
            {hasValuation ? formatMoney(item.valuationEstimate || 0) : 'Not tracked'}
          </Text>
        </View>
        <View style={styles.lotDeltaWrap}>
          <Text style={styles.lotMetricLabel}>Window</Text>
          <Text style={styles.lotDelta}>
            {formatWindow(item)}
          </Text>
        </View>
      </View>

      <View style={styles.rangeRow}>
        <View style={styles.rangePill}>
          <Text style={styles.rangeLabel}>Est. Range</Text>
          <Text style={styles.rangeValue}>{getEstimatedRange(item)}</Text>
        </View>
        <View style={styles.rangePill}>
          <Text style={styles.rangeLabel}>Confidence</Text>
          <Text style={styles.rangeValue}>{item.purchasePrice || item.valuationEstimate ? 'Medium' : 'Low'}</Text>
        </View>
      </View>

      {!!item.cellarNotes ? (
        <Text style={styles.lotNotesInline} numberOfLines={2}>{item.cellarNotes}</Text>
      ) : null}
      <View style={styles.lotFooter}>
        <Text style={styles.lotFooterText}>Open collector record</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.accent} />
      </View>
    </TouchableOpacity>
  );
}

export default function TheCellarScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { hasAccess, gateWithTrigger } = useFeatureAccess('cellar_mode');
  const [cellarItems, setCellarItems] = useState<CellarRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadInventory = useCallback(async () => {
    if (!user) {
      setCellarItems([]);
      return;
    }
    setLoading(true);
    try {
      const cellarRecords = await CellarService.getRecords();
      const records = Object.values(cellarRecords).sort((a, b) => getCollectorScore(b) - getCollectorScore(a));
      setCellarItems(records);
    } catch {
      setCellarItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadInventory();
    }, [loadInventory])
  );

  const portfolioValue = useMemo(() => {
    return cellarItems.reduce((sum, item) => sum + (item.valuationEstimate || item.purchasePrice || 0), 0);
  }, [cellarItems]);

  const portfolioChange = useMemo(() => getPortfolioChange(cellarItems), [cellarItems]);
  const featuredBottle = cellarItems[0] || null;
  const valuedCount = useMemo(
    () => cellarItems.filter((item) => (item.valuationEstimate || item.purchasePrice || 0) > 0).length,
    [cellarItems]
  );
  const holdCount = useMemo(
    () => cellarItems.filter((item) => getRecommendation(item) === 'Hold').length,
    [cellarItems]
  );
  const readyCount = useMemo(
    () => cellarItems.filter((item) => getRecommendation(item) === 'Open Soon').length,
    [cellarItems]
  );
  const latestBottle = useMemo(
    () => [...cellarItems].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0] || null,
    [cellarItems]
  );

  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#24170F', '#130D09']} style={styles.lockedWrap}>
          <Text style={styles.eyebrow}>Wave 5</Text>
          <Text style={styles.heroTitle}>The Cellar</Text>
          <Text style={styles.heroSubtitle}>
            A premium collector page for tracked bottles, hold windows, valuation signals, and notes that feel worth revisiting.
          </Text>
          <View style={styles.lockedFeatureList}>
            <Text style={styles.lockedFeature}>Auction-style bottle lots</Text>
            <Text style={styles.lockedFeature}>Collector valuation and spread</Text>
            <Text style={styles.lockedFeature}>Hold, drink soon, and archive buckets</Text>
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={() => gateWithTrigger('T11')}>
            <Text style={styles.primaryButtonText}>Unlock Cellar Mode</Text>
          </TouchableOpacity>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadInventory} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={['#382517', '#1A120D']} style={styles.heroShell}>
          <View style={styles.heroOrbs}>
            <View style={[styles.heroOrb, styles.heroOrbLeft]} />
            <View style={[styles.heroOrb, styles.heroOrbRight]} />
          </View>
          <Text style={styles.eyebrow}>Private Reserve</Text>
          <Text style={styles.heroTitle}>The Cellar</Text>
          <Text style={styles.heroSubtitle}>
            A collector view of your most deliberate bottles, built to feel closer to a private lot book than a utility list.
          </Text>

          <View style={styles.heroMetrics}>
            <View style={styles.heroMetricCard}>
              <Text style={styles.heroMetricLabel}>Tracked Lots</Text>
              <Text style={styles.heroMetricValue}>{cellarItems.length}</Text>
            </View>
            <View style={styles.heroMetricCard}>
              <Text style={styles.heroMetricLabel}>Portfolio</Text>
              <Text style={styles.heroMetricValue}>{formatMoney(portfolioValue)}</Text>
            </View>
            <View style={styles.heroMetricCard}>
              <Text style={styles.heroMetricLabel}>Spread</Text>
              <Text style={styles.heroMetricValue}>{portfolioChange >= 0 ? '+' : ''}{formatMoney(portfolioChange).replace('$-', '-$')}</Text>
            </View>
          </View>
        </LinearGradient>

        {cellarItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No bottles in The Cellar yet</Text>
            <Text style={styles.emptyBody}>
              Add an eligible bottle from Inventory to Cellar Mode to start building your reserve.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.signalGrid}>
              <View style={styles.signalCard}>
                <Text style={styles.signalLabel}>Valued Bottles</Text>
                <Text style={styles.signalValue}>{valuedCount}</Text>
                <Text style={styles.signalHint}>with an active estimated range</Text>
              </View>
              <View style={styles.signalCard}>
                <Text style={styles.signalLabel}>Hold Candidates</Text>
                <Text style={styles.signalValue}>{holdCount}</Text>
                <Text style={styles.signalHint}>showing stronger collector upside</Text>
              </View>
              <View style={styles.signalCard}>
                <Text style={styles.signalLabel}>Drink-Now Bottles</Text>
                <Text style={styles.signalValue}>{readyCount}</Text>
                <Text style={styles.signalHint}>better positioned for opening soon</Text>
              </View>
            </View>

            {featuredBottle ? (
              <View style={styles.highlightCard}>
                {getLotImage(featuredBottle) ? (
                  <Image source={getLotImage(featuredBottle) as any} style={styles.highlightImage} resizeMode="cover" />
                ) : (
                  <View style={styles.highlightImageFallback}>
                    <Ionicons name="wine-outline" size={52} color="rgba(246,236,228,0.84)" />
                  </View>
                )}
                <View style={styles.highlightCopy}>
                  <Text style={styles.highlightEyebrow}>Collector Highlight</Text>
                  <Text style={styles.highlightTitle}>{featuredBottle.itemName}</Text>
                  <Text style={styles.highlightMeta}>
                    {featuredBottle.brand || featuredBottle.region || 'Private reserve bottle'}
                  </Text>
                  <Text style={styles.highlightBody}>
                    {getRecommendationReason(featuredBottle)}
                  </Text>
                  <View style={styles.highlightStats}>
                    <View style={styles.highlightStat}>
                      <Text style={styles.highlightStatLabel}>Window</Text>
                      <Text style={styles.highlightStatValue}>{formatWindow(featuredBottle)}</Text>
                    </View>
                    <View style={styles.highlightStat}>
                      <Text style={styles.highlightStatLabel}>Collector Read</Text>
                      <Text style={styles.highlightStatValue}>
                        {getRecommendation(featuredBottle)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.highlightFooterRow}>
                    <View style={styles.highlightMiniCard}>
                      <Text style={styles.highlightMiniLabel}>Range</Text>
                      <Text style={styles.highlightMiniValue}>{getEstimatedRange(featuredBottle)}</Text>
                    </View>
                    <View style={styles.highlightMiniCard}>
                      <Text style={styles.highlightMiniLabel}>Confidence</Text>
                      <Text style={styles.highlightMiniValue}>
                        {featuredBottle.purchasePrice || featuredBottle.valuationEstimate ? 'Medium' : 'Low'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            <View style={styles.collectionStoryCard}>
              <View style={styles.collectionStoryHeader}>
                <Text style={styles.collectionStoryEyebrow}>Collection Story</Text>
                <Text style={styles.collectionStoryTitle}>Where your reserve stands right now</Text>
              </View>
              <View style={styles.collectionStoryGrid}>
                <View style={styles.collectionStoryMetric}>
                  <Text style={styles.collectionStoryLabel}>Top bottle</Text>
                  <Text style={styles.collectionStoryValue} numberOfLines={1}>
                    {featuredBottle?.itemName || 'Not enough data'}
                  </Text>
                </View>
                <View style={styles.collectionStoryMetric}>
                  <Text style={styles.collectionStoryLabel}>Latest addition</Text>
                  <Text style={styles.collectionStoryValue} numberOfLines={1}>
                    {latestBottle?.itemName || 'No recent additions'}
                  </Text>
                </View>
                <View style={styles.collectionStoryMetric}>
                  <Text style={styles.collectionStoryLabel}>Market posture</Text>
                  <Text style={styles.collectionStoryValue}>
                    {holdCount > readyCount ? 'Leaning hold' : readyCount > holdCount ? 'Leaning open' : 'Balanced'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tracked Bottles</Text>
                <Text style={styles.sectionCount}>{cellarItems.length}</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Bottles you’ve promoted into collector tracking from Inventory.
              </Text>
              <View style={styles.lotList}>
                {cellarItems.map((item, index) =>
                  renderLotCard(item, index, (inventoryItemId) => nav.navigate('CellarBottleDetail', { inventoryItemId }))
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#140D09',
  },
  content: {
    padding: spacing(2),
    paddingBottom: spacing(6),
  },
  heroShell: {
    borderRadius: 28,
    padding: spacing(3),
    marginBottom: spacing(3),
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.18)',
    overflow: 'hidden',
    position: 'relative',
  },
  heroOrbs: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOrb: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(214,138,56,0.10)',
  },
  heroOrbLeft: {
    top: -36,
    left: -54,
  },
  heroOrbRight: {
    bottom: -74,
    right: -36,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing(0.75),
  },
  heroTitle: {
    fontSize: 38,
    lineHeight: 42,
    color: colors.text,
    fontFamily: serif,
    fontWeight: '700',
  },
  heroSubtitle: {
    marginTop: spacing(1),
    fontSize: 14,
    lineHeight: 20,
    color: colors.subtext,
    maxWidth: '92%',
  },
  heroMetrics: {
    flexDirection: 'row',
    gap: spacing(1.25),
    marginTop: spacing(2.5),
  },
  heroMetricCard: {
    flex: 1,
    backgroundColor: 'rgba(15,10,8,0.45)',
    borderRadius: 18,
    padding: spacing(1.5),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing(0.5),
  },
  heroMetricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  sectionBlock: {
    marginBottom: spacing(3.5),
  },
  signalGrid: {
    gap: spacing(1),
    marginBottom: spacing(2.25),
  },
  signalCard: {
    borderRadius: 20,
    padding: spacing(1.6),
    backgroundColor: '#20150F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  signalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: spacing(0.4),
  },
  signalValue: {
    fontSize: 28,
    lineHeight: 30,
    color: colors.text,
    fontFamily: serif,
    fontWeight: '700',
  },
  signalHint: {
    marginTop: spacing(0.45),
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
  },
  highlightCard: {
    marginBottom: spacing(2.5),
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.18)',
    backgroundColor: '#23160F',
  },
  highlightCopy: {
    padding: spacing(2.2),
  },
  highlightEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing(0.7),
  },
  highlightTitle: {
    fontSize: 30,
    lineHeight: 33,
    color: colors.text,
    fontFamily: serif,
    fontWeight: '700',
  },
  highlightMeta: {
    marginTop: spacing(0.7),
    fontSize: 13,
    color: colors.subtext,
  },
  highlightBody: {
    marginTop: spacing(1.1),
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  highlightStats: {
    flexDirection: 'row',
    gap: spacing(1),
    marginTop: spacing(1.4),
  },
  highlightStat: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(15,10,8,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing(1.15),
  },
  highlightStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing(0.35),
  },
  highlightStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  highlightImage: {
    width: '100%',
    height: 240,
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  highlightImageFallback: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  highlightFooterRow: {
    flexDirection: 'row',
    gap: spacing(1),
    marginTop: spacing(1.1),
  },
  highlightMiniCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(15,10,8,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing(1.1),
  },
  highlightMiniLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing(0.35),
  },
  highlightMiniValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  collectionStoryCard: {
    marginBottom: spacing(2.5),
    borderRadius: 24,
    padding: spacing(2),
    backgroundColor: '#1E140F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  collectionStoryHeader: {
    marginBottom: spacing(1.3),
  },
  collectionStoryEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing(0.45),
  },
  collectionStoryTitle: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.text,
    fontFamily: serif,
    fontWeight: '700',
  },
  collectionStoryGrid: {
    gap: spacing(1),
  },
  collectionStoryMetric: {
    borderRadius: 18,
    padding: spacing(1.25),
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  collectionStoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing(0.35),
  },
  collectionStoryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(0.5),
  },
  sectionTitle: {
    fontSize: 26,
    lineHeight: 30,
    color: colors.text,
    fontFamily: serif,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.75),
    borderRadius: radii.full,
    backgroundColor: 'rgba(214,138,56,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.22)',
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
    marginBottom: spacing(1.5),
  },
  lotList: {
    gap: spacing(1.5),
  },
  lotCard: {
    width: '100%',
    borderRadius: 24,
    padding: spacing(2.25),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#24170F',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  lotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(1.1),
  },
  lotHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  lotRecommendation: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing(0.95),
    paddingVertical: spacing(0.5),
    borderRadius: radii.full,
    backgroundColor: 'rgba(214,138,56,0.12)',
    overflow: 'hidden',
  },
  lotBadge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.55),
    backgroundColor: 'rgba(214,138,56,0.12)',
  },
  lotBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  lotQuantity: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 0.8,
    paddingHorizontal: spacing(0.95),
    paddingVertical: spacing(0.5),
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  lotVisualWrap: {
    alignItems: 'center',
  },
  lotBottleImage: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  lotBottleAura: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  lotNumber: {
    marginTop: spacing(1),
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  lotBody: {
    marginTop: spacing(1.8),
  },
  lotName: {
    fontSize: 28,
    lineHeight: 31,
    color: colors.text,
    fontFamily: serif,
    fontWeight: '700',
  },
  lotMeta: {
    marginTop: spacing(0.75),
    fontSize: 13,
    color: colors.subtext,
  },
  lotRecommendationReason: {
    marginTop: spacing(0.9),
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  lotDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: spacing(1.55),
    marginBottom: spacing(0.2),
  },
  lotPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing(2),
  },
  lotMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  lotMetricValue: {
    marginTop: spacing(0.45),
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  lotDeltaWrap: {
    alignItems: 'flex-end',
    maxWidth: '52%',
  },
  lotDelta: {
    marginTop: spacing(0.45),
    fontSize: 13,
    fontWeight: '700',
    color: colors.subtext,
    textAlign: 'right',
  },
  rangeRow: {
    flexDirection: 'row',
    gap: spacing(1),
    marginTop: spacing(1.35),
  },
  rangePill: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing(1.05),
  },
  rangeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing(0.3),
  },
  rangeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  lotFooter: {
    marginTop: spacing(1.5),
    paddingTop: spacing(1.1),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lotFooterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.4,
  },
  lotNotesInline: {
    marginTop: spacing(1.4),
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
    paddingTop: spacing(1.1),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyTitle: {
    fontSize: 22,
    color: colors.text,
    fontFamily: serif,
    fontWeight: '700',
    marginBottom: spacing(1),
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.subtext,
  },
  emptyLotRailCard: {
    width: '100%',
    borderRadius: 20,
    padding: spacing(2),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
  },
  emptyLotRailText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.subtext,
  },
  lockedWrap: {
    flex: 1,
    margin: spacing(2),
    borderRadius: 28,
    padding: spacing(4),
    justifyContent: 'center',
  },
  lockedFeatureList: {
    marginTop: spacing(2),
    gap: spacing(1),
  },
  lockedFeature: {
    fontSize: 14,
    color: colors.text,
  },
  primaryButton: {
    marginTop: spacing(3),
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingVertical: spacing(1.8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
