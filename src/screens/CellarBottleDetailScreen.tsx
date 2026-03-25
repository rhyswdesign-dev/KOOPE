import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { CellarService, type CellarRecord } from '../services/cellarService';

function formatMoney(value?: number | null): string {
  if (!value) return 'Not tracked';
  return `$${Math.round(value).toLocaleString()}`;
}

function getRecommendation(item: CellarRecord): 'Hold' | 'Open Soon' | 'Review' {
  if ((item.valuationEstimate || 0) > (item.purchasePrice || 0) && !!item.purchasePrice) return 'Hold';
  if ((item.drinkingWindowStart || '').toLowerCase() === 'now') return 'Open Soon';
  return 'Review';
}

function getRecommendationReason(item: CellarRecord): string {
  const state = getRecommendation(item);
  if (state === 'Hold') return 'Current value is outpacing cost basis, so this bottle still has collector upside if left untouched.';
  if (state === 'Open Soon') return 'The market premium is light, and this bottle looks better positioned for a considered pour than a long hold.';
  return 'There is not enough pricing or condition data yet to make a stronger collector call.';
}

function getConfidence(item: CellarRecord): 'High' | 'Medium' | 'Low' {
  const score =
    (item.purchasePrice ? 1 : 0) +
    (item.valuationEstimate ? 1 : 0) +
    ((item.flavorProfile?.length || 0) > 0 ? 1 : 0) +
    (item.tastingNotes ? 1 : 0);
  if (score >= 4) return 'High';
  if (score >= 2) return 'Medium';
  return 'Low';
}

function getRange(item: CellarRecord): string {
  const base = item.valuationEstimate || item.purchasePrice || 0;
  if (!base) return 'Not enough data';
  return `${formatMoney(base * 0.92)} - ${formatMoney(base * 1.08)}`;
}

function getSpread(item: CellarRecord): string {
  if (!item.purchasePrice || !item.valuationEstimate) return 'Not enough data';
  const delta = item.valuationEstimate - item.purchasePrice;
  const prefix = delta >= 0 ? '+' : '-';
  return `${prefix}${formatMoney(Math.abs(delta))}`;
}

function getDaysOwned(item: CellarRecord): string {
  const created = new Date(item.createdAt).getTime();
  if (Number.isNaN(created)) return 'Unknown';
  const diff = Math.max(1, Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)));
  return `${diff} day${diff === 1 ? '' : 's'}`;
}

export default function CellarBottleDetailScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const { inventoryItemId } = route.params as RootStackParamList['CellarBottleDetail'];
  const [record, setRecord] = useState<CellarRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const loadRecord = useCallback(async () => {
    setLoading(true);
    try {
      const next = await CellarService.getRecord(inventoryItemId);
      setRecord(next);
    } finally {
      setLoading(false);
    }
  }, [inventoryItemId]);

  useFocusEffect(
    useCallback(() => {
      loadRecord();
    }, [loadRecord])
  );

  const recommendation = useMemo(() => (record ? getRecommendation(record) : 'Review'), [record]);
  const confidence = useMemo(() => (record ? getConfidence(record) : 'Low'), [record]);

  const handleRemoveFromCellar = () => {
    if (!record) return;
    Alert.alert(
      'Remove from The Cellar',
      'This will remove the bottle from your collector reserve view, but it will stay in Inventory.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await CellarService.deleteRecord(record.inventoryItemId);
            nav.goBack();
          },
        },
      ],
    );
  };

  if (!record) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Bottle not found</Text>
          <Text style={styles.emptyBody}>This cellar record is no longer available.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => nav.goBack()}>
            <Text style={styles.backButtonText}>Back to The Cellar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRecord} tintColor={colors.accent} />}
      >
        <LinearGradient colors={['#3B2617', '#160F0B']} style={styles.hero}>
          <TouchableOpacity style={styles.closePill} onPress={() => nav.goBack()}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
            <Text style={styles.closePillText}>The Cellar</Text>
          </TouchableOpacity>

          <View style={styles.heroMedia}>
            {record.imageUrl ? (
              <Image source={{ uri: record.imageUrl }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={styles.heroImageFallback}>
                <Ionicons name="wine-outline" size={72} color="rgba(246,236,228,0.84)" />
              </View>
            )}
          </View>

          <Text style={styles.eyebrow}>Collector Record</Text>
          <Text style={styles.heroTitle}>{record.itemName}</Text>
          <Text style={styles.heroMeta}>
            {[record.brand, record.type, record.region].filter(Boolean).join(' • ') || 'Private reserve bottle'}
          </Text>

          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeLabel}>Recommendation</Text>
              <Text style={styles.heroBadgeValue}>{recommendation}</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeLabel}>Confidence</Text>
              <Text style={styles.heroBadgeValue}>{confidence}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.deckHeader}>
          <Text style={styles.deckTitle}>Collector Intelligence</Text>
          <Text style={styles.deckSubtitle}>Swipe through the cards instead of digging through one long report.</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={320}
          contentContainerStyle={styles.cardRail}
        >
          <View style={styles.detailCard}>
            <Text style={styles.cardEyebrow}>Your Position</Text>
            <Text style={styles.cardTitle}>Where you stand on this bottle</Text>
            <View style={styles.metricGrid}>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Bought for</Text>
                <Text style={styles.metricValue}>{formatMoney(record.purchasePrice)}</Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Estimated</Text>
                <Text style={styles.metricValue}>{formatMoney(record.valuationEstimate)}</Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Spread</Text>
                <Text style={styles.metricValue}>{getSpread(record)}</Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Days owned</Text>
                <Text style={styles.metricValue}>{getDaysOwned(record)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.cardEyebrow}>Bottle Identity</Text>
            <Text style={styles.cardTitle}>What this bottle actually is</Text>
            <View style={styles.identityList}>
              <View style={styles.identityRow}>
                <Text style={styles.identityLabel}>Type</Text>
                <Text style={styles.identityValue}>{record.type || 'Not logged'}</Text>
              </View>
              <View style={styles.identityRow}>
                <Text style={styles.identityLabel}>ABV</Text>
                <Text style={styles.identityValue}>{record.abv ? `${record.abv}%` : 'Not logged'}</Text>
              </View>
              <View style={styles.identityRow}>
                <Text style={styles.identityLabel}>Region</Text>
                <Text style={styles.identityValue}>{record.region || 'Not logged'}</Text>
              </View>
              <View style={styles.identityRow}>
                <Text style={styles.identityLabel}>Fill level</Text>
                <Text style={styles.identityValue}>{record.quantity || 'Full'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.cardEyebrow}>Open-or-Hold</Text>
            <Text style={styles.cardTitle}>What the bottle is telling you now</Text>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{recommendation}</Text>
              <Text style={styles.calloutBody}>{getRecommendationReason(record)}</Text>
            </View>
            <View style={styles.metricTileWide}>
              <Text style={styles.metricLabel}>Estimated range</Text>
              <Text style={styles.metricValue}>{getRange(record)}</Text>
            </View>
            <View style={styles.metricTileWide}>
              <Text style={styles.metricLabel}>Drink window</Text>
              <Text style={styles.metricValue}>{`${record.drinkingWindowStart || 'Now'} • ${record.drinkingWindowEnd || 'TBD'}`}</Text>
            </View>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.cardEyebrow}>Serve & Flavor</Text>
            <Text style={styles.cardTitle}>How this bottle wants to be revisited</Text>
            <Text style={styles.copyBlock}>{record.serveGuidance || 'Serve guidance has not been logged yet.'}</Text>
            <View style={styles.flavorWrap}>
              {(record.flavorProfile || []).slice(0, 6).map((flavor) => (
                <View key={flavor} style={styles.flavorChip}>
                  <Text style={styles.flavorChipText}>{flavor}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.copyBlock}>{record.tastingNotes || 'No tasting notes yet. Add a collector note once you taste or compare this bottle.'}</Text>
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.deleteButton} onPress={handleRemoveFromCellar}>
          <Ionicons name="trash-outline" size={18} color="#FF8E8E" />
          <Text style={styles.deleteButtonText}>Remove from The Cellar</Text>
        </TouchableOpacity>
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
    paddingBottom: spacing(5),
  },
  hero: {
    borderRadius: 28,
    overflow: 'hidden',
    padding: spacing(2),
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.18)',
    marginBottom: spacing(2.25),
  },
  closePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.6),
    paddingHorizontal: spacing(1.1),
    paddingVertical: spacing(0.7),
    borderRadius: radii.full,
    backgroundColor: 'rgba(15,10,8,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing(1.25),
  },
  closePillText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  heroMedia: {
    marginBottom: spacing(1.5),
  },
  heroImage: {
    width: '100%',
    height: 240,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  heroImageFallback: {
    width: '100%',
    height: 220,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: spacing(0.6),
  },
  heroTitle: {
    fontSize: 38,
    lineHeight: 42,
    color: colors.text,
    fontFamily: serif,
    fontWeight: '700',
  },
  heroMeta: {
    marginTop: spacing(0.8),
    fontSize: 14,
    lineHeight: 20,
    color: colors.subtext,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: spacing(1),
    marginTop: spacing(1.5),
  },
  heroBadge: {
    flex: 1,
    borderRadius: 18,
    padding: spacing(1.2),
    backgroundColor: 'rgba(15,10,8,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing(0.35),
  },
  heroBadgeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  deckHeader: {
    marginBottom: spacing(1.1),
  },
  deckTitle: {
    fontSize: 28,
    lineHeight: 32,
    color: colors.text,
    fontFamily: serif,
    fontWeight: '700',
  },
  deckSubtitle: {
    marginTop: spacing(0.55),
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
  },
  cardRail: {
    paddingRight: spacing(1.5),
    gap: spacing(1.25),
  },
  detailCard: {
    width: 304,
    borderRadius: 24,
    padding: spacing(1.8),
    backgroundColor: '#23160F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing(0.45),
  },
  cardTitle: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.text,
    fontFamily: serif,
    fontWeight: '700',
    marginBottom: spacing(1.35),
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.9),
  },
  metricTile: {
    width: '47%',
    borderRadius: 18,
    padding: spacing(1.1),
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  metricTileWide: {
    borderRadius: 18,
    padding: spacing(1.1),
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: spacing(0.9),
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing(0.35),
  },
  metricValue: {
    fontSize: 16,
    lineHeight: 20,
    color: colors.text,
    fontWeight: '700',
  },
  identityList: {
    gap: spacing(0.95),
  },
  identityRow: {
    borderRadius: 16,
    padding: spacing(1.1),
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  identityLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing(0.35),
  },
  identityValue: {
    fontSize: 16,
    lineHeight: 20,
    color: colors.text,
    fontWeight: '700',
  },
  callout: {
    borderRadius: 18,
    padding: spacing(1.3),
    backgroundColor: 'rgba(214,138,56,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.2)',
    marginBottom: spacing(0.9),
  },
  calloutTitle: {
    fontSize: 22,
    lineHeight: 24,
    color: colors.text,
    fontFamily: serif,
    fontWeight: '700',
    marginBottom: spacing(0.5),
  },
  calloutBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  copyBlock: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    marginBottom: spacing(1),
  },
  flavorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.7),
    marginBottom: spacing(1),
  },
  flavorChip: {
    paddingHorizontal: spacing(0.95),
    paddingVertical: spacing(0.55),
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  flavorChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    marginTop: spacing(2),
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,120,120,0.28)',
    backgroundColor: 'rgba(80,24,24,0.42)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.8),
  },
  deleteButtonText: {
    color: '#FF8E8E',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(3),
  },
  emptyTitle: {
    fontSize: 24,
    color: colors.text,
    fontFamily: serif,
    fontWeight: '700',
    marginBottom: spacing(0.8),
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: spacing(1.4),
  },
  backButton: {
    paddingHorizontal: spacing(1.4),
    paddingVertical: spacing(0.9),
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  backButtonText: {
    color: '#1A120D',
    fontWeight: '700',
  },
});
