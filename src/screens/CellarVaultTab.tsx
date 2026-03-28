/**
 * CellarVaultTab — VAULT tab inside the Cellar navigator
 * Shows the featured (top-scored) lot in full detail with prev/next browsing.
 * Same visual language as CellarBottleDetailScreen but tab-native (no route params).
 */

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
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { CellarService, type CellarRecord } from '../services/cellarService';
import { useFeatureAccess } from '../hooks/useFeatureAccess';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}

function getCollectorScore(item: CellarRecord): number {
  let s = 0;
  if (item.purchasePrice) s += 2;
  if (item.valuationEstimate) s += 2;
  if (item.cellarNotes) s += 2;
  if (item.drinkingWindowStart || item.drinkingWindowEnd) s += 2;
  if (item.quantity && item.quantity !== 'empty') s += 1;
  return s;
}

function getRecommendation(item: CellarRecord): 'Hold' | 'Open Soon' | 'Review' {
  if ((item.valuationEstimate || 0) > (item.purchasePrice || 0) && !!item.purchasePrice) return 'Hold';
  if ((item.drinkingWindowStart || '').toLowerCase() === 'now') return 'Open Soon';
  return 'Review';
}

function getRecommendationReason(item: CellarRecord): string {
  const r = getRecommendation(item);
  if (r === 'Hold') return 'Current value is outpacing cost basis. This bottle retains collector upside — the secondary market hasn\'t fully priced in limited availability yet.';
  if (r === 'Open Soon') return 'The market premium is light on this expression. Better positioned as a considered pour than a long hold in the current cycle.';
  return 'Not enough pricing or condition data yet to make a stronger collector call. Log purchase price and valuation to sharpen the read.';
}

function getMarketVelocity(item: CellarRecord): 'Aggressive' | 'Moderate' | 'Stable' {
  if (!item.createdAt) return 'Stable';
  const days = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 86400000);
  if (days < 30) return 'Aggressive';
  if (days < 180) return 'Moderate';
  return 'Stable';
}

function getVelocityDesc(v: 'Aggressive' | 'Moderate' | 'Stable'): string {
  if (v === 'Aggressive') return 'Recently acquired. The market for new expressions is active — watch comps over the next 60 days.';
  if (v === 'Moderate') return 'Settling into the collection. First secondary market cycle valuations typically emerge in this window.';
  return 'A seasoned asset. Long-hold bottles benefit from patience — peak demand often emerges after initial release windows.';
}

function getAssetCondition(item: CellarRecord): 'Pristine' | 'Good' | 'Reviewed' {
  if (!item.quantity || item.quantity === 'full') return 'Pristine';
  if (item.quantity === 'half') return 'Good';
  return 'Reviewed';
}

function getScarcityScore(item: CellarRecord): number {
  const fields = [item.purchasePrice, item.valuationEstimate, item.flavorProfile?.length, item.tastingNotes, item.region, item.abv];
  const filled = fields.filter(Boolean).length;
  return Math.min(9.9, (filled / fields.length) * 9.5 + 4);
}

function getTrend(item: CellarRecord): { text: string; positive: boolean } | null {
  if (!item.purchasePrice || !item.valuationEstimate) return null;
  const pct = ((item.valuationEstimate - item.purchasePrice) / item.purchasePrice) * 100;
  return { text: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, positive: pct >= 0 };
}

function getMarketRange(item: CellarRecord): string {
  const base = item.valuationEstimate || item.purchasePrice || 0;
  if (!base) return '—';
  return `${fmt(base * 0.92)} – ${fmt(base * 1.08)}`;
}

function getLotId(item: CellarRecord): string {
  return item.inventoryItemId.slice(-4).toUpperCase();
}

function getVintageYear(item: CellarRecord): string {
  const d = new Date(item.createdAt);
  return Number.isNaN(d.getTime()) ? '—' : String(d.getFullYear());
}

// ─── empty state ─────────────────────────────────────────────────────────────

function VaultEmpty() {
  return (
    <LinearGradient colors={['#1E130D', '#0F0A07']} style={styles.emptyWrap}>
      <Ionicons name="layers-outline" size={48} color="rgba(214,138,56,0.3)" />
      <Text style={styles.emptyTitle}>No lots in The Vault</Text>
      <Text style={styles.emptyBody}>
        Add bottles from your HomeBar to the Cellar, then they'll appear here with full collector intelligence.
      </Text>
    </LinearGradient>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function CellarVaultTab() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { hasAccess } = useFeatureAccess('cellar_mode');

  const [lots, setLots] = useState<CellarRecord[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [editVal, setEditVal] = useState('');
  const [editWinStart, setEditWinStart] = useState('');
  const [editWinEnd, setEditWinEnd] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTasting, setEditTasting] = useState('');
  const [editQty, setEditQty] = useState<'full' | 'half' | 'low' | 'empty'>('full');
  const [saving, setSaving] = useState(false);

  const loadLots = useCallback(async () => {
    setLoading(true);
    try {
      const records = await CellarService.getRecords();
      const sorted = Object.values(records).sort((a, b) => getCollectorScore(b) - getCollectorScore(a));
      setLots(sorted);
      setIdx(0);
    } catch {
      setLots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadLots(); }, [loadLots]));

  const record = lots[idx] ?? null;

  const rec = useMemo(() => record ? getRecommendation(record) : 'Review', [record]);
  const velocity = useMemo(() => record ? getMarketVelocity(record) : 'Stable', [record]);
  const condition = useMemo(() => record ? getAssetCondition(record) : 'Reviewed', [record]);
  const scarcity = useMemo(() => record ? getScarcityScore(record) : 0, [record]);
  const trend = useMemo(() => record ? getTrend(record) : null, [record]);

  const handleOpenEdit = () => {
    if (!record) return;
    setEditPrice(record.purchasePrice != null ? String(record.purchasePrice) : '');
    setEditVal(record.valuationEstimate != null ? String(record.valuationEstimate) : '');
    setEditWinStart(record.drinkingWindowStart || '');
    setEditWinEnd(record.drinkingWindowEnd || '');
    setEditNotes(record.cellarNotes || '');
    setEditTasting(record.tastingNotes || '');
    setEditQty((record.quantity as any) || 'full');
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!record) return;
    const parsedPrice = editPrice.trim() ? Number(editPrice) : null;
    const parsedVal = editVal.trim() ? Number(editVal) : null;
    if ((parsedPrice !== null && isNaN(parsedPrice)) || (parsedVal !== null && isNaN(parsedVal))) {
      Alert.alert('Invalid number', 'Check the price fields and try again.');
      return;
    }
    setSaving(true);
    try {
      const updated: CellarRecord = {
        ...record,
        purchasePrice: parsedPrice,
        valuationEstimate: parsedVal ?? parsedPrice ?? record.valuationEstimate,
        drinkingWindowStart: editWinStart.trim() || record.drinkingWindowStart,
        drinkingWindowEnd: editWinEnd.trim() || record.drinkingWindowEnd,
        cellarNotes: editNotes.trim() || null,
        tastingNotes: editTasting.trim() || null,
        quantity: editQty,
      };
      await CellarService.saveRecord(updated);
      setLots(prev => prev.map((l, i) => i === idx ? updated : l));
      setShowEdit(false);
    } catch {
      Alert.alert('Save failed', 'Could not update this cellar record. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    if (!record) return;
    Alert.alert('Remove from Vault', 'This removes the collector record but keeps the bottle in Inventory.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await CellarService.deleteRecord(record.inventoryItemId);
          const next = lots.filter(l => l.inventoryItemId !== record.inventoryItemId);
          setLots(next);
          setIdx(Math.min(idx, Math.max(0, next.length - 1)));
        },
      },
    ]);
  };

  if (!hasAccess) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <LinearGradient colors={['#24170F', '#130D09']} style={styles.lockedWrap}>
          <Text style={styles.lockedEyebrow}>PRO</Text>
          <Text style={styles.lockedTitle}>The Vault</Text>
          <Text style={styles.lockedSub}>Individual lot intelligence — collector-grade detail on every bottle in your reserve.</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!loading && lots.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <VaultEmpty />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.root}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLots} tintColor={colors.accent} />}
      >
        {/* ── lot navigator ─────────────────────────── */}
        {lots.length > 1 && (
          <View style={styles.lotNav}>
            <TouchableOpacity
              style={[styles.lotNavBtn, idx === 0 && styles.lotNavBtnDisabled]}
              onPress={() => setIdx(i => Math.max(0, i - 1))}
              disabled={idx === 0}
            >
              <Ionicons name="chevron-back" size={16} color={idx === 0 ? 'rgba(255,255,255,0.2)' : colors.accent} />
            </TouchableOpacity>
            <Text style={styles.lotNavLabel}>LOT {idx + 1} OF {lots.length}</Text>
            <TouchableOpacity
              style={[styles.lotNavBtn, idx === lots.length - 1 && styles.lotNavBtnDisabled]}
              onPress={() => setIdx(i => Math.min(lots.length - 1, i + 1))}
              disabled={idx === lots.length - 1}
            >
              <Ionicons name="chevron-forward" size={16} color={idx === lots.length - 1 ? 'rgba(255,255,255,0.2)' : colors.accent} />
            </TouchableOpacity>
          </View>
        )}

        {record && (
          <>
            {/* ── breadcrumb + actions ───────────────── */}
            <View style={styles.breadcrumbRow}>
              <Text style={styles.breadcrumb}>PRIVATE COLLECTION / VAULT {getLotId(record)}</Text>
              <TouchableOpacity onPress={handleOpenEdit} style={styles.editBtn}>
                <Ionicons name="pencil-outline" size={14} color={colors.accent} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* ── identity ──────────────────────────── */}
            <Text style={styles.bottleName}>{record.itemName}</Text>
            {(record.brand || record.type) && (
              <Text style={styles.bottleSubtitle}>
                {[record.brand, record.type].filter(Boolean).join(' · ')}
              </Text>
            )}

            {/* ── price comparison ──────────────────── */}
            <View style={styles.priceRow}>
              <View style={styles.priceBlock}>
                <Text style={styles.priceLabel}>ACQUISITION PRICE</Text>
                <Text style={styles.priceValue}>
                  {record.purchasePrice ? fmt(record.purchasePrice) : '—'}
                </Text>
              </View>
              <View style={styles.priceDivider} />
              <View style={styles.priceBlock}>
                <Text style={styles.priceLabel}>MARKET VALUE</Text>
                <Text style={[styles.priceValue, { color: colors.accent }]}>
                  {getMarketRange(record)}
                </Text>
              </View>
            </View>

            {/* ── trend ─────────────────────────────── */}
            {trend && (
              <View style={styles.trendRow}>
                <Ionicons
                  name={trend.positive ? 'trending-up' : 'trending-down'}
                  size={18}
                  color={trend.positive ? '#4FC38A' : '#FF7B7B'}
                />
                <Text style={[styles.trendText, { color: trend.positive ? '#4FC38A' : '#FF7B7B' }]}>
                  {trend.text}
                </Text>
              </View>
            )}

            {/* ── image ─────────────────────────────── */}
            <View style={styles.imageWrap}>
              {record.imageUrl ? (
                <Image source={{ uri: record.imageUrl }} style={styles.bottleImage} resizeMode="cover" />
              ) : (
                <LinearGradient colors={['#3B2214', '#1E130D']} style={styles.imageFallback}>
                  <Ionicons name="wine-outline" size={80} color="rgba(214,138,56,0.4)" />
                </LinearGradient>
              )}
              <View style={styles.authBadge}>
                <Ionicons name="checkmark-circle" size={12} color={colors.accent} />
                <Text style={styles.authBadgeText}>COLLECTOR PIECE</Text>
              </View>
            </View>

            {/* ── metric cards ──────────────────────── */}
            <View style={styles.metricsCol}>
              {/* Scarcity */}
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Ionicons name="star" size={14} color={colors.accent} />
                  <Text style={styles.metricLabel}>SCARCITY SCORE</Text>
                </View>
                <Text style={styles.metricBig}>{scarcity.toFixed(1)}/10</Text>
                <Text style={styles.metricDesc}>
                  Score reflects data completeness and holding duration. Add tasting notes to improve.
                </Text>
              </View>

              {/* Asset Status */}
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={colors.accent} />
                  <Text style={styles.metricLabel}>ASSET STATUS</Text>
                </View>
                <Text style={styles.metricBig}>{condition}</Text>
                <View style={styles.chipRow}>
                  <View style={styles.chip}><Text style={styles.chipText}>ORIGINAL BOX</Text></View>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>FILL LEVEL {String(record.quantity || 'FULL').toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              {/* Market Velocity */}
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Ionicons name="trending-up-outline" size={14} color={colors.accent} />
                  <Text style={styles.metricLabel}>MARKET VELOCITY</Text>
                </View>
                <Text style={styles.metricBig}>{velocity}</Text>
                <Text style={styles.metricDesc}>{getVelocityDesc(velocity)}</Text>
              </View>
            </View>

            {/* ── strategic directive ───────────────── */}
            <LinearGradient colors={['#2A1A0D', '#1A110C']} style={styles.directiveCard}>
              <Text style={styles.directiveLabel}>STRATEGIC DIRECTIVE</Text>
              <Text style={styles.directiveWord}>
                {rec === 'Open Soon' ? 'OPEN' : rec === 'Hold' ? 'HOLD' : 'REVIEW'}
              </Text>
            </LinearGradient>

            {/* ── curator's rationale ───────────────── */}
            <View style={styles.rationaleCard}>
              <Text style={styles.rationaleTitle}>The Curator's Rationale</Text>
              <Text style={styles.rationaleBody}>{getRecommendationReason(record)}</Text>
            </View>

            {/* ── flavor profile ────────────────────── */}
            {(record.flavorProfile || []).length > 0 && (
              <View style={styles.flavorWrap}>
                {record.flavorProfile!.slice(0, 6).map(f => (
                  <View key={f} style={styles.flavorChip}>
                    <Text style={styles.flavorChipText}>{f}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── action buttons ────────────────────── */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionGhost} onPress={() => Alert.alert('Coming soon', 'Market listing will be available in a future update.')}>
                <Text style={styles.actionGhostText}>LIST ON MARKET</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionGhost} onPress={handleOpenEdit}>
                <Text style={styles.actionGhostText}>VAULT SETTINGS</Text>
              </TouchableOpacity>
            </View>

            {/* ── tech specs ────────────────────────── */}
            <View style={styles.specsCard}>
              <Text style={styles.specsTitle}>Technical Specifications</Text>
              <View style={styles.specsGrid}>
                {[
                  ['Distillery', record.brand || '—'],
                  ['ABV / Proof', record.abv ? `${record.abv}%` : '—'],
                  ['Age Statement', record.drinkingWindowStart || '—'],
                  ['Vintage', getVintageYear(record)],
                  ['Type', record.type || '—'],
                  ['Fill Level', record.quantity || 'Full'],
                  ['Region', record.region || '—'],
                  ['Notes', record.cellarNotes ? record.cellarNotes.slice(0, 40) + (record.cellarNotes.length > 40 ? '…' : '') : '—'],
                ].map(([label, value]) => (
                  <View key={label} style={styles.specCell}>
                    <Text style={styles.specLabel}>{label}</Text>
                    <Text style={styles.specValue}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── remove ────────────────────────────── */}
            <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
              <Ionicons name="trash-outline" size={15} color="#FF8E8E" />
              <Text style={styles.removeBtnText}>Remove from Vault</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ── edit modal ────────────────────────────────────── */}
      <Modal visible={showEdit} animationType="slide" transparent onRequestClose={() => setShowEdit(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.editOverlay}>
            <View style={styles.editSheet}>
              <View style={styles.editHeader}>
                <Text style={styles.editTitle}>Edit Vault Record</Text>
                <View style={styles.editHeaderBtns}>
                  <TouchableOpacity style={styles.editCancel} onPress={() => setShowEdit(false)}>
                    <Text style={styles.editCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.editSave, saving && { opacity: 0.5 }]} onPress={handleSaveEdit} disabled={saving}>
                    <Text style={styles.editSaveText}>{saving ? 'Saving…' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView contentContainerStyle={styles.editForm} keyboardShouldPersistTaps="handled">
                <Text style={styles.editFieldLabel}>Bottle Level</Text>
                <View style={styles.editChipRow}>
                  {(['full', 'half', 'low', 'empty'] as const).map(q => (
                    <TouchableOpacity
                      key={q}
                      style={[styles.editChip, editQty === q && styles.editChipActive]}
                      onPress={() => setEditQty(q)}
                    >
                      <Text style={[styles.editChipText, editQty === q && styles.editChipTextActive]}>
                        {q.charAt(0).toUpperCase() + q.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {[
                  ['Purchase Price', editPrice, setEditPrice, 'decimal-pad', 'e.g. 65'],
                  ['Current Estimated Value', editVal, setEditVal, 'decimal-pad', 'e.g. 120'],
                  ['Drinking Window — From', editWinStart, setEditWinStart, 'default', 'e.g. Now or 2026'],
                  ['Drinking Window — Until', editWinEnd, setEditWinEnd, 'default', 'e.g. 2030'],
                ].map(([label, value, setter, kbType, placeholder]: any) => (
                  <View key={label}>
                    <Text style={styles.editFieldLabel}>{label}</Text>
                    <TextInput style={styles.editInput} value={value} onChangeText={setter} placeholder={placeholder} placeholderTextColor={colors.subtext} keyboardType={kbType} />
                  </View>
                ))}
                <Text style={styles.editFieldLabel}>Tasting Notes</Text>
                <TextInput style={[styles.editInput, { height: 80, textAlignVertical: 'top' }]} value={editTasting} onChangeText={setEditTasting} placeholder="Oak, dried fruit, peat…" placeholderTextColor={colors.subtext} multiline />
                <Text style={styles.editFieldLabel}>Collector Notes</Text>
                <TextInput style={[styles.editInput, { height: 80, textAlignVertical: 'top' }]} value={editNotes} onChangeText={setEditNotes} placeholder="Provenance, occasion, batch details…" placeholderTextColor={colors.subtext} multiline />
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
  container: { flex: 1, backgroundColor: '#0F0A07' },
  root: { paddingHorizontal: spacing(2), paddingTop: spacing(1), paddingBottom: spacing(10) },

  // Lot navigator
  lotNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing(1.5),
  },
  lotNavBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(214,138,56,0.10)', borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  lotNavBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' },
  lotNavLabel: { fontSize: 11, fontWeight: '700', color: colors.subtext, letterSpacing: 1.2, textTransform: 'uppercase' },

  // Header
  breadcrumbRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1) },
  breadcrumb: { fontSize: 10, fontWeight: '700', color: colors.accent, letterSpacing: 1.2, textTransform: 'uppercase' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.4), paddingHorizontal: spacing(0.9), paddingVertical: spacing(0.5), borderRadius: radii.full, backgroundColor: 'rgba(214,138,56,0.10)', borderWidth: 1, borderColor: 'rgba(214,138,56,0.22)' },
  editBtnText: { fontSize: 12, fontWeight: '700', color: colors.accent },

  // Identity
  bottleName: { fontSize: 34, lineHeight: 38, color: colors.text, fontFamily: serif, fontWeight: '700', marginBottom: spacing(0.5) },
  bottleSubtitle: { fontSize: 15, color: colors.subtext, fontStyle: 'italic', marginBottom: spacing(1.75) },

  // Price
  priceRow: { flexDirection: 'row', backgroundColor: '#1A120D', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: spacing(1.25), overflow: 'hidden' },
  priceBlock: { flex: 1, padding: spacing(1.75) },
  priceDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: spacing(1.25) },
  priceLabel: { fontSize: 9, fontWeight: '700', color: colors.subtext, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: spacing(0.4) },
  priceValue: { fontSize: 20, fontWeight: '700', color: colors.text, fontFamily: serif },

  // Trend
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.6), marginBottom: spacing(1.75) },
  trendText: { fontSize: 26, fontWeight: '700', fontFamily: serif },

  // Image
  imageWrap: { borderRadius: 20, overflow: 'hidden', marginBottom: spacing(2), position: 'relative' },
  bottleImage: { width: '100%', height: 280 },
  imageFallback: { width: '100%', height: 260, alignItems: 'center', justifyContent: 'center' },
  authBadge: { position: 'absolute', top: spacing(1.25), right: spacing(1.25), flexDirection: 'row', alignItems: 'center', gap: spacing(0.4), backgroundColor: 'rgba(15,10,8,0.75)', paddingHorizontal: spacing(0.9), paddingVertical: spacing(0.5), borderRadius: radii.full, borderWidth: 1, borderColor: 'rgba(214,138,56,0.35)' },
  authBadgeText: { fontSize: 9, fontWeight: '700', color: colors.accent, letterSpacing: 1 },

  // Metric cards
  metricsCol: { gap: spacing(1.25), marginBottom: spacing(1.75) },
  metricCard: { backgroundColor: '#1A120D', borderRadius: 20, padding: spacing(1.75), borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.6), marginBottom: spacing(0.6) },
  metricLabel: { fontSize: 10, fontWeight: '700', color: colors.subtext, textTransform: 'uppercase', letterSpacing: 0.9 },
  metricBig: { fontSize: 26, fontWeight: '700', color: colors.text, fontFamily: serif, marginBottom: spacing(0.6) },
  metricDesc: { fontSize: 13, lineHeight: 19, color: colors.subtext },
  chipRow: { flexDirection: 'row', gap: spacing(0.7), flexWrap: 'wrap', marginTop: spacing(0.5) },
  chip: { paddingHorizontal: spacing(0.9), paddingVertical: spacing(0.4), borderRadius: radii.full, backgroundColor: 'rgba(214,138,56,0.10)', borderWidth: 1, borderColor: 'rgba(214,138,56,0.2)' },
  chipText: { fontSize: 10, fontWeight: '700', color: colors.accent, letterSpacing: 0.8 },

  // Directive
  directiveCard: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(214,138,56,0.22)', alignItems: 'center', paddingVertical: spacing(3), marginBottom: spacing(1.75) },
  directiveLabel: { fontSize: 10, fontWeight: '700', color: colors.subtext, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: spacing(1) },
  directiveWord: { fontSize: 56, fontWeight: '700', color: colors.accent, fontFamily: serif, letterSpacing: 2 },

  // Rationale
  rationaleCard: { backgroundColor: '#1A120D', borderRadius: 20, padding: spacing(2), borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: spacing(1.75) },
  rationaleTitle: { fontSize: 22, fontWeight: '700', color: colors.text, fontFamily: serif, marginBottom: spacing(0.75) },
  rationaleBody: { fontSize: 14, lineHeight: 21, color: colors.text },

  // Flavor
  flavorWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(0.7), marginBottom: spacing(1.75) },
  flavorChip: { paddingHorizontal: spacing(0.9), paddingVertical: spacing(0.45), borderRadius: radii.full, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  flavorChipText: { fontSize: 12, fontWeight: '600', color: colors.text },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: spacing(1.25), marginBottom: spacing(2) },
  actionGhost: { flex: 1, paddingVertical: spacing(1.4), borderRadius: radii.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' },
  actionGhostText: { fontSize: 11, fontWeight: '700', color: colors.text, letterSpacing: 0.8 },

  // Specs
  specsCard: { backgroundColor: '#1A120D', borderRadius: 20, padding: spacing(2), borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: spacing(2) },
  specsTitle: { fontSize: 20, fontWeight: '700', color: colors.text, fontFamily: serif, marginBottom: spacing(1.5) },
  specsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  specCell: { width: '47%', borderRadius: 14, padding: spacing(1.1), backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  specLabel: { fontSize: 9, fontWeight: '700', color: colors.subtext, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing(0.3) },
  specValue: { fontSize: 14, fontWeight: '700', color: colors.text },

  // Remove
  removeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(0.7), paddingVertical: spacing(1.6), borderRadius: radii.full, borderWidth: 1, borderColor: 'rgba(255,100,100,0.22)', backgroundColor: 'rgba(80,20,20,0.35)' },
  removeBtnText: { fontSize: 14, fontWeight: '700', color: '#FF8E8E' },

  // Empty / locked
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(4), gap: spacing(1.5) },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: colors.text, fontFamily: serif, textAlign: 'center' },
  emptyBody: { fontSize: 14, lineHeight: 21, color: colors.subtext, textAlign: 'center' },
  lockedWrap: { flex: 1, padding: spacing(4), justifyContent: 'center' },
  lockedEyebrow: { fontSize: 10, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: spacing(0.75) },
  lockedTitle: { fontSize: 42, color: colors.text, fontFamily: serif, fontWeight: '700', marginBottom: spacing(1) },
  lockedSub: { fontSize: 15, lineHeight: 22, color: colors.subtext },

  // Edit modal
  editOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  editSheet: { backgroundColor: '#1A120D', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  editHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing(2), borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  editTitle: { fontSize: 18, fontWeight: '700', color: colors.text, fontFamily: serif },
  editHeaderBtns: { flexDirection: 'row', gap: spacing(0.9) },
  editCancel: { paddingHorizontal: spacing(1.1), paddingVertical: spacing(0.6), borderRadius: radii.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  editCancelText: { color: colors.subtext, fontWeight: '600', fontSize: 14 },
  editSave: { paddingHorizontal: spacing(1.3), paddingVertical: spacing(0.6), borderRadius: radii.full, backgroundColor: colors.accent },
  editSaveText: { color: '#1A0F0A', fontWeight: '700', fontSize: 14 },
  editForm: { padding: spacing(2), paddingBottom: spacing(4), gap: spacing(0.6) },
  editFieldLabel: { fontSize: 11, fontWeight: '700', color: colors.subtext, textTransform: 'uppercase', letterSpacing: 0.9, marginTop: spacing(1.2), marginBottom: spacing(0.4) },
  editInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 14, paddingHorizontal: spacing(1.2), paddingVertical: spacing(1), color: colors.text, fontSize: 15 },
  editChipRow: { flexDirection: 'row', gap: spacing(0.7) },
  editChip: { flex: 1, paddingVertical: spacing(0.85), borderRadius: radii.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  editChipActive: { backgroundColor: 'rgba(214,138,56,0.18)', borderColor: colors.accent },
  editChipText: { fontSize: 13, fontWeight: '600', color: colors.subtext },
  editChipTextActive: { color: colors.accent },
});
