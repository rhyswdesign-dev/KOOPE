import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { withScreenTour } from '../components/tour/withScreenTour';

type Condition = 'MINT' | 'EXCELLENT' | 'GOOD';
type SealStatus = 'SEALED' | 'OPENED';
type Strategy = 'DRINK' | 'HOLD' | 'RESELL';

function LockedScreen() {
  const { gate } = useFeatureAccess('cellar_mode');
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1A120D', '#0F0A07']} style={styles.lockedFill}>
        <Ionicons name="lock-closed" size={40} color={colors.accent} />
        <Text style={styles.lockedTitle}>Cellar Mode Required</Text>
        <Text style={styles.lockedBody}>Unlock PRO to register and track spirits in your private collection.</Text>
        <TouchableOpacity style={styles.lockedCta} onPress={() => gate()}>
          <Text style={styles.lockedCtaText}>Unlock Cellar Mode</Text>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
}

function CellarRegisterScreen() {
  const nav = useNavigation<any>();
  const { hasAccess } = useFeatureAccess('cellar_mode');

  const [purchasePrice, setPurchasePrice] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [sourceVendor, setSourceVendor] = useState('');
  const [condition, setCondition] = useState<Condition>('MINT');
  const [boxIncluded, setBoxIncluded] = useState(false);
  const [sealStatus, setSealStatus] = useState<SealStatus>('SEALED');
  const [fillLevel, setFillLevel] = useState(100);
  const [strategy, setStrategy] = useState<Strategy>('HOLD');
  const [saving, setSaving] = useState(false);

  if (!hasAccess) return <LockedScreen />;

  const handleSecureToVault = async () => {
    setSaving(true);
    // Simulate a brief save
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    Alert.alert(
      'Logged to Cellar',
      'Your acquisition data has been recorded. Add the bottle to your inventory bar to sync the full record.',
      [{ text: 'Done', onPress: () => nav.navigate('CellarHome') }],
    );
  };

  const conditions: Condition[] = ['MINT', 'EXCELLENT', 'GOOD'];
  const strategies: { key: Strategy; icon: string; label: string }[] = [
    { key: 'DRINK', icon: 'cafe-outline', label: 'DRINK' },
    { key: 'HOLD', icon: 'lock-closed-outline', label: 'HOLD' },
    { key: 'RESELL', icon: 'pricetag-outline', label: 'RESELL' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => nav.navigate('CellarHome')}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Page heading ─────────────────────────────────────────────── */}
          <Text style={styles.eyebrow}>ACQUISITION INTELLIGENCE</Text>
          <Text style={styles.pageTitle}>Register New Spirit</Text>
          <Text style={styles.pageSubtext}>
            Document the provenance and physical state of your asset to ensure accurate valuation in the Private Collection.
          </Text>

          {/* ── Purchase Price ───────────────────────────────────────────── */}
          <Text style={styles.fieldLabel}>PURCHASE PRICE (USD)</Text>
          <View style={styles.prefixInput}>
            <Text style={styles.prefixChar}>$</Text>
            <TextInput
              style={styles.prefixTextInput}
              value={purchasePrice}
              onChangeText={setPurchasePrice}
              placeholder="0.00"
              placeholderTextColor={colors.subtext}
              keyboardType="decimal-pad"
            />
          </View>

          {/* ── Acquisition Date ─────────────────────────────────────────── */}
          <Text style={styles.fieldLabel}>ACQUISITION DATE</Text>
          <TextInput
            style={styles.input}
            value={acquisitionDate}
            onChangeText={setAcquisitionDate}
            placeholder="mm/dd/yyyy"
            placeholderTextColor={colors.subtext}
          />

          {/* ── Source / Vendor ──────────────────────────────────────────── */}
          <Text style={styles.fieldLabel}>SOURCE / VENDOR</Text>
          <TextInput
            style={styles.input}
            value={sourceVendor}
            onChangeText={setSourceVendor}
            placeholder="e.g. Sotheby's, Private Auction, Boutique"
            placeholderTextColor={colors.subtext}
          />

          {/* ── Physical Condition ───────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>PHYSICAL CONDITION</Text>
          <View style={styles.chipGroup}>
            {conditions.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.conditionChip, condition === c && styles.conditionChipActive]}
                onPress={() => setCondition(c)}
              >
                <Text style={[styles.conditionChipText, condition === c && styles.conditionChipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Packaging ────────────────────────────────────────────────── */}
          <View style={styles.toggleRow}>
            <Text style={styles.fieldLabel}>PACKAGING</Text>
            <View style={styles.toggleRight}>
              <Text style={styles.toggleLabel}>Box Included</Text>
              <Switch
                value={boxIncluded}
                onValueChange={setBoxIncluded}
                trackColor={{ false: 'rgba(255,255,255,0.12)', true: 'rgba(214,138,56,0.5)' }}
                thumbColor={boxIncluded ? colors.accent : '#888'}
              />
            </View>
          </View>

          {/* ── Seal Integrity ───────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>SEAL INTEGRITY</Text>
          <Text style={styles.sectionSublabel}>ORIGINAL FACTORY SEAL</Text>
          <View style={styles.chipGroup}>
            {(['SEALED', 'OPENED'] as SealStatus[]).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.conditionChip, sealStatus === s && styles.conditionChipActive]}
                onPress={() => setSealStatus(s)}
              >
                <Text style={[styles.conditionChipText, sealStatus === s && styles.conditionChipTextActive]}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Fill Level ───────────────────────────────────────────────── */}
          <View style={styles.fillLevelHeader}>
            <Text style={styles.sectionLabel}>FILL LEVEL</Text>
            <Text style={styles.fillLevelValue}>{fillLevel}%</Text>
          </View>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${fillLevel}%` }]} />
            <View style={[styles.sliderThumb, { left: `${Math.max(0, fillLevel - 3)}%` as any }]} />
          </View>
          <View style={styles.sliderTicks}>
            {[0, 25, 50, 75, 100].map((v) => (
              <TouchableOpacity key={v} onPress={() => setFillLevel(v)}>
                <Text style={[styles.sliderTick, fillLevel === v && styles.sliderTickActive]}>{v}%</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Collection Strategy ──────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>COLLECTION STRATEGY</Text>
          <View style={styles.strategyRow}>
            {strategies.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.strategyCard, strategy === s.key && styles.strategyCardActive]}
                onPress={() => setStrategy(s.key)}
              >
                <Ionicons
                  name={s.icon as any}
                  size={24}
                  color={strategy === s.key ? colors.accent : colors.subtext}
                />
                <Text style={[styles.strategyCardLabel, strategy === s.key && styles.strategyCardLabelActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── CTA ─────────────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.secureCta, saving && { opacity: 0.6 }]}
            onPress={handleSecureToVault}
            disabled={saving}
          >
            <LinearGradient
              colors={['#E89C40', '#D68A38']}
              style={styles.secureCtaGradient}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color="#1A120D" />
              <Text style={styles.secureCtaText}>{saving ? 'SECURING…' : 'SECURE TO VAULT'}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.secureDisclaimer}>Digital trail will be minted upon confirmation.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default withScreenTour(CellarRegisterScreen, 'cellar_register');

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0A07',
  },
  headerRow: {
    paddingHorizontal: spacing(2),
    paddingTop: spacing(1),
    paddingBottom: spacing(0.5),
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
  content: {
    padding: spacing(2),
    paddingBottom: spacing(10),
    gap: spacing(1.1),
  },

  // Headings
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
    lineHeight: 36,
    marginTop: spacing(0.3),
  },
  pageSubtext: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.subtext,
    marginBottom: spacing(0.5),
  },

  // Fields
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: spacing(0.75),
    marginBottom: spacing(0.4),
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing(1.25),
    marginBottom: spacing(0.35),
  },
  sectionSublabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing(0.6),
    marginTop: -4,
  },

  // Inputs
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: radii.sm,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
    color: colors.text,
    fontSize: 15,
  },
  prefixInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: radii.sm,
    paddingHorizontal: spacing(1.5),
  },
  prefixChar: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
    marginRight: spacing(0.5),
  },
  prefixTextInput: {
    flex: 1,
    paddingVertical: spacing(1.25),
    color: colors.text,
    fontSize: 18,
    fontFamily: serif,
    fontWeight: '700',
  },

  // Condition chips
  chipGroup: {
    flexDirection: 'row',
    gap: spacing(0.75),
  },
  conditionChip: {
    flex: 1,
    paddingVertical: spacing(0.9),
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  conditionChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  conditionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 0.6,
  },
  conditionChipTextActive: {
    color: '#1A120D',
  },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing(1),
  },
  toggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  toggleLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },

  // Fill level slider
  fillLevelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fillLevelValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
    marginTop: spacing(0.75),
  },
  sliderFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  sliderThumb: {
    position: 'absolute',
    top: -7,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: '#0F0A07',
  },
  sliderTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing(0.75),
  },
  sliderTick: {
    fontSize: 10,
    color: colors.subtext,
    fontWeight: '600',
  },
  sliderTickActive: {
    color: colors.accent,
  },

  // Strategy cards
  strategyRow: {
    flexDirection: 'row',
    gap: spacing(0.9),
  },
  strategyCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing(1.5),
    alignItems: 'center',
    gap: spacing(0.6),
  },
  strategyCardActive: {
    backgroundColor: 'rgba(214,138,56,0.1)',
    borderColor: colors.accent,
  },
  strategyCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 0.8,
  },
  strategyCardLabelActive: {
    color: colors.accent,
  },

  // CTA
  secureCta: {
    borderRadius: radii.full,
    overflow: 'hidden',
    marginTop: spacing(1.5),
  },
  secureCtaGradient: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.75),
  },
  secureCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A120D',
    letterSpacing: 1,
  },
  secureDisclaimer: {
    fontSize: 11,
    color: colors.subtext,
    textAlign: 'center',
    marginTop: spacing(0.5),
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
    fontSize: 26,
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
