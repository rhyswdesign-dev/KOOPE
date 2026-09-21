/**
 * Value Line — value-on-scan v1 (Phase 1.2)
 *
 * Extracted from BottleDetailScreen per the god-file standing rule. Three
 * stacked rows, only the first always present:
 *
 *   1. The range: "Fair price: $32–38" + a tappable source chip (every
 *      value names its source — never an unexplained number) + the
 *      currency badge (opens the parent's currency picker).
 *   2. The verdict, when the user has a spotted price for this bottle:
 *      "✓ Good buy — you saw $32" (computeValueVerdict).
 *   3. At-scan capture, when they don't: a "Seen a price?" chip revealing
 *      an inline price input (founder decision 2026-07-18: capture
 *      lives at-scan AND post-wishlist), plus an OPTIONAL store field.
 *
 * On the store field being optional here (2026-08): location_label is the
 * most commercially useful column in spotted_prices, and this path used to
 * send null every time. The other two capture points are modals that require
 * a store. This one is deliberately the low-friction path — making the store
 * mandatory would turn a one-field inline row into a form and cost price
 * captures — so the field is offered but never blocks Save. The XP rates
 * carry the incentive instead (40 XP with a store, 15 without).
 *
 * Pure presentation + local input state; all writes go through the
 * onLogPrice callback (which routes to spottedPriceService).
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';
import {
  CURRENCY_META,
  formatPriceRange,
  type SupportedCurrency,
} from '../../store/useCurrencyPreference';
import { computeValueVerdict } from '../../services/valueVerdictService';
import { parseLocalePrice } from '../../utils/priceInput';
import type { SpottedPrice } from '../../store/useSpottedPrices';

interface ValueLineProps {
  range: { min: number; max: number } | null;
  currency: SupportedCurrency;
  /** Human-readable source label, e.g. "KŌOPE catalog estimate". */
  sourceLabel: string;
  /** The user's most recent spotted price for this bottle, if any. */
  spotted: SpottedPrice | undefined;
  giftMode: boolean;
  onOpenCurrencyPicker: () => void;
  /** locationLabel is undefined when the user left the optional store field blank. */
  onLogPrice: (price: number, locationLabel?: string) => void;
}

export default function ValueLine({
  range,
  currency,
  sourceLabel,
  spotted,
  giftMode,
  onOpenCurrencyPicker,
  onLogPrice,
}: ValueLineProps) {
  const [capturing, setCapturing] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [locationInput, setLocationInput] = useState('');

  if (!range) return null;

  const verdict = spotted
    ? computeValueVerdict(
        { price: spotted.price, currency: spotted.currency },
        { min: range.min, max: range.max, currency },
      )
    : null;

  const handleSave = () => {
    const price = parseLocalePrice(priceInput);
    if (!(price > 0)) {
      Alert.alert('Invalid price', 'Enter a price greater than 0.');
      return;
    }
    onLogPrice(price, locationInput.trim() || undefined);
    setPriceInput('');
    setLocationInput('');
    setCapturing(false);
  };

  return (
    <View style={styles.container}>
      {/* Row 1 — the range + source + currency */}
      <View style={styles.rangeRow}>
        <Ionicons name="cash-outline" size={16} color={colors.accent} />
        <Text style={styles.rangeText} numberOfLines={1}>
          {giftMode ? 'A great gift at ' : 'Fair price: '}
          {formatPriceRange(range.min, range.max, currency)}
        </Text>
        <TouchableOpacity
          style={styles.sourceChip}
          hitSlop={8}
          onPress={() =>
            Alert.alert(
              'Where this number comes from',
              `${sourceLabel}. Ranges are estimates with confidence, never exact prices — and never scraped.`,
            )
          }
        >
          <Ionicons name="information-circle-outline" size={13} color={colors.subtext} />
          <Text style={styles.sourceChipText} numberOfLines={1}>
            {sourceLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.currencyBadge} hitSlop={8} onPress={onOpenCurrencyPicker}>
          <Text style={styles.currencyText}>
            {CURRENCY_META[currency].flag} {currency}
          </Text>
          <Ionicons name="chevron-down" size={11} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Row 2 — verdict when a spotted price exists, with a way back in to edit it */}
      {verdict && !capturing && (
        <View style={styles.verdictRow}>
          <Ionicons
            name={verdict.verdict === 'good_buy' ? 'checkmark-circle' : 'pricetag-outline'}
            size={14}
            color={verdict.verdict === 'high' ? colors.subtext : colors.gold}
          />
          <Text
            style={[styles.verdictText, verdict.verdict === 'high' && styles.verdictTextMuted]}
            numberOfLines={1}
          >
            {verdict.headline}
          </Text>
          <TouchableOpacity
            hitSlop={8}
            onPress={() => {
              setPriceInput(spotted ? String(spotted.price) : '');
              setCapturing(true);
            }}
          >
            <Ionicons name="pencil-outline" size={13} color={colors.subtext} />
          </TouchableOpacity>
        </View>
      )}

      {/* Row 3 — capture input (fresh entry, or editing an existing spotted price) */}
      {capturing ? (
        <View style={styles.captureBlock}>
          <View style={styles.captureRow}>
            <Text style={styles.capturePrefix}>{CURRENCY_META[currency].symbol}</Text>
            <TextInput
              style={styles.captureInput}
              value={priceInput}
              onChangeText={setPriceInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.subtext}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={handleSave}
            />
            <TouchableOpacity style={styles.captureSave} onPress={handleSave}>
              <Text style={styles.captureSaveText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity hitSlop={8} onPress={() => setCapturing(false)}>
              <Ionicons name="close" size={16} color={colors.subtext} />
            </TouchableOpacity>
          </View>
          {/* Optional store — never blocks Save (see the note in the docblock) */}
          <View style={styles.captureRow}>
            <Ionicons name="storefront-outline" size={14} color={colors.subtext} />
            <TextInput
              style={styles.captureInput}
              value={locationInput}
              onChangeText={setLocationInput}
              placeholder="Where? (optional)"
              placeholderTextColor={colors.subtext}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>
        </View>
      ) : (
        !spotted && (
          <TouchableOpacity style={styles.captureChip} onPress={() => setCapturing(true)}>
            <Ionicons name="pricetag-outline" size={12} color={colors.accent} />
            <Text style={styles.captureChipText}>Seen a price? Log it</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${colors.accent}10`,
    borderRadius: radii.lg,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
    gap: spacing(1),
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  rangeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
    minWidth: 0,
  },
  sourceChipText: {
    fontSize: 10,
    color: colors.subtext,
    flexShrink: 1,
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  currencyText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  verdictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  verdictText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gold,
    flex: 1,
  },
  verdictTextMuted: {
    color: colors.subtext,
  },
  captureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    alignSelf: 'flex-start',
  },
  captureChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  captureBlock: {
    gap: spacing(1),
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  capturePrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  captureInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: spacing(0.5),
    borderBottomWidth: 1,
    borderBottomColor: `${colors.accent}50`,
  },
  captureSave: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  captureSaveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
});
