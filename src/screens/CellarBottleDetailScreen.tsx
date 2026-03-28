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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { CellarService, type CellarRecord } from '../services/cellarService';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatMoney(value?: number | null): string {
  if (!value) return 'Not tracked';
  return `$${Math.round(value).toLocaleString()}`;
}

function getRecommendation(item: CellarRecord): 'HOLD' | 'OPEN' | 'REVIEW' {
  if ((item.valuationEstimate || 0) > (item.purchasePrice || 0) && !!item.purchasePrice) return 'HOLD';
  if ((item.drinkingWindowStart || '').toLowerCase() === 'now') return 'OPEN';
  return 'REVIEW';
}

function getRecommendationReason(item: CellarRecord): string {
  const state = getRecommendation(item);
  if (state === 'HOLD') return 'Current market value is outpacing your cost basis, indicating strong collector upside if this bottle remains untouched. Secondary demand for expressions of this profile continues to climb.';
  if (state === 'OPEN') return 'The market premium on this bottle is light and the drinking window is now open. This bottle is better positioned for a considered, memorable pour than a continued hold.';
  return 'There is not enough pricing or condition data yet to produce a stronger collector directive. Add a purchase price and estimated valuation to unlock a full assessment.';
}

function getScarcityScore(item: CellarRecord): number {
  const fields = [
    item.purchasePrice,
    item.valuationEstimate,
    item.brand,
    item.type,
    item.region,
    item.abv,
    (item.flavorProfile?.length || 0) > 0 ? 'yes' : null,
    item.tastingNotes,
    item.cellarNotes,
    item.drinkingWindowStart,
  ];
  const filled = fields.filter(Boolean).length;
  return parseFloat(Math.min(10, filled).toFixed(1));
}

function getAssetStatus(item: CellarRecord): 'Pristine' | 'Good' | 'Reviewed' {
  if (item.quantity === 'full') return 'Pristine';
  if (item.quantity === 'half') return 'Good';
  return 'Reviewed';
}

function getMarketVelocity(item: CellarRecord): 'Aggressive' | 'Moderate' | 'Stable' {
  const created = new Date(item.createdAt).getTime();
  if (Number.isNaN(created)) return 'Stable';
  const days = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
  if (days < 30) return 'Aggressive';
  if (days < 180) return 'Moderate';
  return 'Stable';
}

function getMarketVelocityDesc(velocity: 'Aggressive' | 'Moderate' | 'Stable'): string {
  if (velocity === 'Aggressive') return 'This is a newly acquired asset. The market for recently released expressions is highly active — monitor comps closely.';
  if (velocity === 'Moderate') return 'This bottle is settling into your collection. Valuations at this stage typically reflect the first secondary market cycle.';
  return 'A seasoned asset. Long-hold bottles in this category benefit from patience — peak demand often emerges well after initial release windows close.';
}

function getMarketRange(item: CellarRecord): string {
  const base = item.valuationEstimate || item.purchasePrice || 0;
  if (!base) return 'Insufficient data';
  const low = Math.round(base * 0.92);
  const high = Math.round(base * 1.08);
  return `$${low.toLocaleString()} – $${high.toLocaleString()}`;
}

function getTrendPct(item: CellarRecord): { pct: string; positive: boolean } | null {
  if (!item.purchasePrice || !item.valuationEstimate) return null;
  const pct = ((item.valuationEstimate - item.purchasePrice) / item.purchasePrice) * 100;
  return { pct: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, positive: pct >= 0 };
}

function getLotNumber(item: CellarRecord): string {
  return item.inventoryItemId.slice(-6).toUpperCase();
}

function getVintageYear(item: CellarRecord): string {
  if (!item.createdAt) return 'Unknown';
  const d = new Date(item.createdAt);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return String(d.getFullYear());
}

function isVerified(item: CellarRecord): boolean {
  const notes = (item.cellarNotes || '').toLowerCase();
  return notes.includes('auth') || notes.includes('verified');
}

// ─── specs grid ──────────────────────────────────────────────────────────────

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.specCell}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function CellarBottleDetailScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const { inventoryItemId } = route.params as RootStackParamList['CellarBottleDetail'];
  const [record, setRecord] = useState<CellarRecord | null>(null);
  const [loading, setLoading] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [editValuation, setEditValuation] = useState('');
  const [editWindowStart, setEditWindowStart] = useState('');
  const [editWindowEnd, setEditWindowEnd] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTastingNotes, setEditTastingNotes] = useState('');
  const [editQuantity, setEditQuantity] = useState<'full' | 'half' | 'low' | 'empty'>('full');
  const [saving, setSaving] = useState(false);

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

  const recommendation = useMemo(() => (record ? getRecommendation(record) : 'REVIEW'), [record]);

  const handleOpenEdit = () => {
    if (!record) return;
    setEditPrice(record.purchasePrice != null ? String(record.purchasePrice) : '');
    setEditValuation(record.valuationEstimate != null ? String(record.valuationEstimate) : '');
    setEditWindowStart(record.drinkingWindowStart || '');
    setEditWindowEnd(record.drinkingWindowEnd || '');
    setEditNotes(record.cellarNotes || '');
    setEditTastingNotes(record.tastingNotes || '');
    setEditQuantity((record.quantity as 'full' | 'half' | 'low' | 'empty') || 'full');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!record) return;
    const parsedPrice = editPrice.trim() ? Number(editPrice) : null;
    if (parsedPrice !== null && Number.isNaN(parsedPrice)) {
      Alert.alert('Invalid Price', 'Enter a valid number for purchase price.');
      return;
    }
    const parsedValuation = editValuation.trim() ? Number(editValuation) : null;
    if (parsedValuation !== null && Number.isNaN(parsedValuation)) {
      Alert.alert('Invalid Value', 'Enter a valid number for estimated value.');
      return;
    }
    setSaving(true);
    try {
      const updated: CellarRecord = {
        ...record,
        purchasePrice: parsedPrice,
        valuationEstimate: parsedValuation ?? parsedPrice ?? record.valuationEstimate,
        drinkingWindowStart: editWindowStart.trim() || record.drinkingWindowStart,
        drinkingWindowEnd: editWindowEnd.trim() || record.drinkingWindowEnd,
        cellarNotes: editNotes.trim() || null,
        tastingNotes: editTastingNotes.trim() || null,
        quantity: editQuantity,
      };
      await CellarService.saveRecord(updated);
      setRecord(updated);
      setShowEditModal(false);
    } catch {
      Alert.alert('Save Failed', 'Could not update this cellar record. Try again.');
    } finally {
      setSaving(false);
    }
  };

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
          <TouchableOpacity style={styles.emptyBack} onPress={() => nav.goBack()}>
            <Text style={styles.emptyBackText}>Back to The Cellar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const velocity = getMarketVelocity(record);
  const trend = getTrendPct(record);
  const scarcityScore = getScarcityScore(record);
  const assetStatus = getAssetStatus(record);
  const verified = isVerified(record);
  const directiveColor =
    recommendation === 'HOLD' ? colors.accent :
    recommendation === 'OPEN' ? '#4FC38A' :
    colors.subtext;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRecord} tintColor={colors.accent} />}
      >
        {/* ── Custom Header ───────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => nav.goBack()}>
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.editPill} onPress={handleOpenEdit}>
            <Ionicons name="pencil-outline" size={14} color={colors.accent} />
            <Text style={styles.editPillText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
        <Text style={styles.breadcrumb}>
          PRIVATE COLLECTION / VAULT {getLotNumber(record)}
        </Text>

        {/* ── Bottle Title ────────────────────────────────────────────────── */}
        <Text style={styles.bottleName}>{record.itemName}</Text>
        <Text style={styles.bottleSubtitle}>
          {[record.brand, record.type].filter(Boolean).join(' · ') || 'Private Reserve'}
        </Text>

        {/* ── Price Comparison Row ─────────────────────────────────────────── */}
        <View style={styles.priceRow}>
          <View style={styles.priceBlock}>
            <Text style={styles.priceBlockLabel}>ACQUISITION PRICE</Text>
            <Text style={styles.priceBlockValue}>{formatMoney(record.purchasePrice)}</Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceBlock}>
            <Text style={styles.priceBlockLabel}>MARKET VALUE</Text>
            <Text style={styles.priceBlockValue}>{getMarketRange(record)}</Text>
          </View>
        </View>

        {/* ── Trend ──────────────────────────────────────────────────────── */}
        {trend && (
          <Text style={[styles.trendText, { color: trend.positive ? '#4FC38A' : '#F56565' }]}>
            {trend.pct}
          </Text>
        )}

        {/* ── Bottle Image ─────────────────────────────────────────────────── */}
        <View style={styles.imageWrap}>
          {record.imageUrl ? (
            <Image source={{ uri: record.imageUrl }} style={styles.bottleImage} resizeMode="cover" />
          ) : (
            <LinearGradient colors={['#2A1A0F', '#0F0A07']} style={styles.bottleImage}>
              <Ionicons name="wine-outline" size={80} color="rgba(214,138,56,0.5)" />
            </LinearGradient>
          )}
          <View style={styles.authBadge}>
            <Ionicons name={verified ? 'checkmark-circle' : 'shield-outline'} size={12} color={colors.accent} />
            <Text style={styles.authBadgeText}>{verified ? 'VERIFIED AUTH' : 'COLLECTOR PIECE'}</Text>
          </View>
        </View>

        {/* ── Scarcity Score ────────────────────────────────────────────────── */}
        <View style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Ionicons name="star" size={16} color={colors.accent} />
            <Text style={styles.metricCardLabel}>SCARCITY SCORE</Text>
          </View>
          <Text style={styles.metricCardBigValue}>{scarcityScore.toFixed(1)}<Text style={styles.metricCardBigSub}>/10</Text></Text>
          <Text style={styles.metricCardDesc}>
            Based on documented attributes. Add tasting notes, valuation, and provenance to raise this score.
          </Text>
        </View>

        {/* ── Asset Status ─────────────────────────────────────────────────── */}
        <View style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Ionicons name="cube-outline" size={16} color={colors.accent} />
            <Text style={styles.metricCardLabel}>ASSET STATUS</Text>
            <Text style={styles.metricCardInlineValue}>{assetStatus}</Text>
          </View>
          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {record.cellarNotes?.toLowerCase().includes('box') ? 'Box Included' : 'No Box Noted'}
              </Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {record.quantity === 'full' ? 'Factory Sealed' :
                 record.quantity === 'half' ? 'Half Full' :
                 record.quantity === 'low' ? 'Low Fill' : 'Empty / Tasted'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Market Velocity ──────────────────────────────────────────────── */}
        <View style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Ionicons name="arrow-forward-circle-outline" size={16} color={colors.accent} />
            <Text style={styles.metricCardLabel}>MARKET VELOCITY</Text>
            <Text style={styles.metricCardInlineValue}>{velocity}</Text>
          </View>
          <Text style={styles.metricCardDesc}>{getMarketVelocityDesc(velocity)}</Text>
        </View>

        {/* ── Strategic Directive ──────────────────────────────────────────── */}
        <LinearGradient
          colors={['#2A1A0F', '#160F0B']}
          style={styles.directiveCard}
        >
          <Text style={[styles.directiveBig, { color: directiveColor }]}>{recommendation}</Text>
          <Text style={styles.directiveLabel}>STRATEGIC DIRECTIVE</Text>
        </LinearGradient>

        {/* ── Curator's Rationale ──────────────────────────────────────────── */}
        <View style={styles.rationaleSection}>
          <Text style={styles.rationaleTitle}>The Curator's Rationale</Text>
          <Text style={styles.rationaleBody}>{getRecommendationReason(record)}</Text>
        </View>

        {/* ── Flavor Profile ──────────────────────────────────────────────── */}
        {(record.flavorProfile || []).length > 0 && (
          <View style={styles.flavorWrap}>
            {(record.flavorProfile || []).slice(0, 6).map((f) => (
              <View key={f} style={styles.flavorChip}>
                <Text style={styles.flavorChipText}>{f}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Action Buttons ───────────────────────────────────────────────── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionGhost}
            onPress={() => Alert.alert('Coming Soon', 'Market listing will be available in a future update.')}
          >
            <Text style={styles.actionGhostText}>LIST ON MARKET</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionGhost} onPress={handleOpenEdit}>
            <Text style={styles.actionGhostText}>VAULT SETTINGS</Text>
          </TouchableOpacity>
        </View>

        {/* ── Technical Specs ──────────────────────────────────────────────── */}
        <Text style={styles.specsHeading}>Technical Specifications</Text>
        <View style={styles.specsGrid}>
          <SpecRow label="Distillery" value={record.brand || 'Not logged'} />
          <SpecRow label="ABV / Proof" value={record.abv ? `${record.abv}%` : 'Not logged'} />
          <SpecRow label="Age Statement" value={record.drinkingWindowStart || 'Not logged'} />
          <SpecRow label="Vintage" value={getVintageYear(record)} />
          <SpecRow label="Mash Bill" value={record.type || 'Not logged'} />
          <SpecRow label="Fill Level" value={record.quantity || 'Full'} />
          <SpecRow label="Storage" value={record.region || 'Climate Controlled'} />
          <SpecRow label="Notes" value={record.cellarNotes ? record.cellarNotes.slice(0, 40) : 'None'} />
        </View>

        {/* ── Remove Button ────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.removeBtn} onPress={handleRemoveFromCellar}>
          <Ionicons name="trash-outline" size={16} color="#FF8E8E" />
          <Text style={styles.removeBtnText}>Remove from The Cellar</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Edit Modal ───────────────────────────────────────────────────────── */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.editOverlay}>
            <View style={styles.editSheet}>
              <View style={styles.editHeader}>
                <Text style={styles.editTitle}>Edit Record</Text>
                <View style={styles.editHeaderActions}>
                  <TouchableOpacity style={styles.editCancelBtn} onPress={() => setShowEditModal(false)}>
                    <Text style={styles.editCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editSaveBtn, saving && { opacity: 0.5 }]}
                    onPress={handleSaveEdit}
                    disabled={saving}
                  >
                    <Text style={styles.editSaveText}>{saving ? 'Saving…' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.editFormContent}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.editSectionLabel}>Bottle Level</Text>
                <View style={styles.editQuantityRow}>
                  {(['full', 'half', 'low', 'empty'] as const).map((q) => (
                    <TouchableOpacity
                      key={q}
                      style={[styles.editQuantityChip, editQuantity === q && styles.editQuantityChipActive]}
                      onPress={() => setEditQuantity(q)}
                    >
                      <Text style={[styles.editQuantityChipText, editQuantity === q && styles.editQuantityChipTextActive]}>
                        {q.charAt(0).toUpperCase() + q.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.editSectionLabel}>Purchase Price</Text>
                <TextInput
                  style={styles.editInput}
                  value={editPrice}
                  onChangeText={setEditPrice}
                  placeholder="e.g. 65"
                  placeholderTextColor={colors.subtext}
                  keyboardType="decimal-pad"
                />

                <Text style={styles.editSectionLabel}>Current Estimated Value</Text>
                <TextInput
                  style={styles.editInput}
                  value={editValuation}
                  onChangeText={setEditValuation}
                  placeholder="e.g. 120"
                  placeholderTextColor={colors.subtext}
                  keyboardType="decimal-pad"
                />

                <Text style={styles.editSectionLabel}>Drinking Window — From</Text>
                <TextInput
                  style={styles.editInput}
                  value={editWindowStart}
                  onChangeText={setEditWindowStart}
                  placeholder="e.g. Now or 2026"
                  placeholderTextColor={colors.subtext}
                />

                <Text style={styles.editSectionLabel}>Drinking Window — Until</Text>
                <TextInput
                  style={styles.editInput}
                  value={editWindowEnd}
                  onChangeText={setEditWindowEnd}
                  placeholder="e.g. 2030"
                  placeholderTextColor={colors.subtext}
                />

                <Text style={styles.editSectionLabel}>Tasting Notes</Text>
                <TextInput
                  style={[styles.editInput, { height: 80, textAlignVertical: 'top' }]}
                  value={editTastingNotes}
                  onChangeText={setEditTastingNotes}
                  placeholder="What do you taste? Oak, dried fruit, peat…"
                  placeholderTextColor={colors.subtext}
                  multiline
                />

                <Text style={styles.editSectionLabel}>Collector Notes</Text>
                <TextInput
                  style={[styles.editInput, { height: 80, textAlignVertical: 'top' }]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Provenance, occasion, batch details…"
                  placeholderTextColor={colors.subtext}
                  multiline
                />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingBottom: spacing(6),
    gap: spacing(1.5),
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(0.5),
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    paddingHorizontal: spacing(1.1),
    paddingVertical: spacing(0.7),
    borderRadius: radii.full,
    backgroundColor: 'rgba(214,138,56,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.28)',
  },
  editPillText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },

  // Breadcrumb
  breadcrumb: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Bottle title
  bottleName: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
    lineHeight: 40,
  },
  bottleSubtitle: {
    fontSize: 16,
    color: colors.subtext,
    fontStyle: 'italic',
    lineHeight: 22,
  },

  // Price row
  priceRow: {
    flexDirection: 'row',
    backgroundColor: '#1A120D',
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  priceBlock: {
    flex: 1,
    padding: spacing(1.75),
  },
  priceDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  priceBlockLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing(0.5),
  },
  priceBlockValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  // Trend
  trendText: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: serif,
  },

  // Image
  imageWrap: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    height: 280,
    backgroundColor: '#1A120D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottleImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.45),
    borderRadius: radii.full,
    backgroundColor: 'rgba(20,12,8,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.4)',
  },
  authBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Metric cards
  metricCard: {
    backgroundColor: '#1A120D',
    borderRadius: radii.md,
    padding: spacing(1.75),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: spacing(0.75),
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.6),
  },
  metricCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 1,
    textTransform: 'uppercase',
    flex: 1,
  },
  metricCardInlineValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  metricCardBigValue: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
    lineHeight: 46,
  },
  metricCardBigSub: {
    fontSize: 22,
    color: colors.subtext,
  },
  metricCardDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.subtext,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing(0.75),
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.4),
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },

  // Directive card
  directiveCard: {
    borderRadius: radii.lg,
    padding: spacing(3),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.3)',
  },
  directiveBig: {
    fontSize: 52,
    fontWeight: '700',
    fontFamily: serif,
    letterSpacing: 2,
  },
  directiveLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: spacing(0.5),
  },

  // Rationale
  rationaleSection: {
    gap: spacing(0.75),
  },
  rationaleTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
  },
  rationaleBody: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.subtext,
  },

  // Flavor
  flavorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.75),
  },
  flavorChip: {
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.4),
    borderRadius: radii.full,
    backgroundColor: 'rgba(214,138,56,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.18)',
  },
  flavorChipText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: spacing(1.25),
  },
  actionGhost: {
    flex: 1,
    height: 50,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionGhostText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.8,
  },

  // Specs
  specsHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
    marginTop: spacing(0.5),
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.75),
  },
  specCell: {
    width: '47%',
    backgroundColor: '#1A120D',
    borderRadius: radii.sm,
    padding: spacing(1.25),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  specLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing(0.35),
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  // Remove
  removeBtn: {
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,120,120,0.28)',
    backgroundColor: 'rgba(80,24,24,0.42)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.8),
    marginTop: spacing(1),
  },
  removeBtnText: {
    color: '#FF8E8E',
    fontSize: 14,
    fontWeight: '700',
  },

  // Empty
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
    marginBottom: spacing(1.5),
  },
  emptyBack: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.9),
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  emptyBackText: {
    color: '#1A120D',
    fontWeight: '700',
    fontSize: 14,
  },

  // Edit modal
  editOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  editSheet: {
    backgroundColor: '#1A120D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing(2),
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
  },
  editHeaderActions: {
    flexDirection: 'row',
    gap: spacing(0.9),
  },
  editCancelBtn: {
    paddingHorizontal: spacing(1.1),
    paddingVertical: spacing(0.6),
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  editCancelText: {
    color: colors.subtext,
    fontWeight: '600',
    fontSize: 14,
  },
  editSaveBtn: {
    paddingHorizontal: spacing(1.3),
    paddingVertical: spacing(0.6),
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  editSaveText: {
    color: '#1A120D',
    fontWeight: '700',
    fontSize: 14,
  },
  editFormContent: {
    padding: spacing(2),
    paddingBottom: spacing(4),
    gap: spacing(0.6),
  },
  editSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginTop: spacing(1.2),
    marginBottom: spacing(0.4),
  },
  editInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingHorizontal: spacing(1.2),
    paddingVertical: spacing(1),
    color: colors.text,
    fontSize: 15,
  },
  editQuantityRow: {
    flexDirection: 'row',
    gap: spacing(0.7),
  },
  editQuantityChip: {
    flex: 1,
    paddingVertical: spacing(0.85),
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  editQuantityChipActive: {
    backgroundColor: 'rgba(214,138,56,0.18)',
    borderColor: colors.accent,
  },
  editQuantityChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
  },
  editQuantityChipTextActive: {
    color: colors.accent,
  },
});
