/**
 * Gift Mode Panel
 *
 * Phase 1.1 (Answer Card): the substance behind the Gift toggle on
 * BottleDetailScreen — a 2-tap "who's this for" mini-questionnaire and the
 * resulting verdict. Extracted as its own component per the workplan's
 * god-file standing rule (touching BottleDetailScreen means extracting the
 * touched section into a component in the same PR).
 *
 * State lives in the parent (BottleDetailScreen) — this component is
 * controlled, no local persistence. It's a per-scan, ephemeral input, not a
 * saved profile (no "gift recipient" profile concept exists in the app).
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';
import type { GiftPreference, GiftVerdict } from '../../services/giftVerdictService';
import {
  SPIRIT_CHIP_OPTIONS as SPIRIT_OPTIONS,
  FLAVOR_CHIP_OPTIONS as FLAVOR_OPTIONS,
} from '../../config/spiritFlavorChipOptions';

interface GiftModePanelProps {
  preference: GiftPreference;
  onPreferenceChange: (preference: GiftPreference) => void;
  verdict: GiftVerdict | null;
}

export default function GiftModePanel({
  preference,
  onPreferenceChange,
  verdict,
}: GiftModePanelProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="gift-outline" size={16} color={colors.gold} />
        <Text style={styles.headerText}>Scanning for someone?</Text>
      </View>

      <Text style={styles.question}>What do they usually drink?</Text>
      <View style={styles.chipRow}>
        {SPIRIT_OPTIONS.map((option) => {
          const selected = preference.spiritHint === option.value && option.value !== '';
          return (
            <TouchableOpacity
              key={option.label}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() =>
                onPreferenceChange({
                  ...preference,
                  spiritHint: option.value || undefined,
                })
              }
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.question}>How do they like it?</Text>
      <View style={styles.chipRow}>
        {FLAVOR_OPTIONS.map((option) => {
          const selected = preference.flavorHint === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() =>
                onPreferenceChange({
                  ...preference,
                  flavorHint: selected ? undefined : option.value,
                })
              }
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {verdict && (
        <View style={styles.verdictCard}>
          <Text style={styles.verdictHeadline}>{verdict.headline}</Text>
          <Text style={styles.verdictBody}>{verdict.body}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing(2),
    padding: spacing(2),
    borderRadius: radii.lg,
    backgroundColor: 'rgba(214,138,56,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.18)',
    gap: spacing(1.25),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gold,
  },
  question: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
  },
  chip: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  chipSelected: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(214,138,56,0.18)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.subtext,
  },
  chipTextSelected: {
    color: colors.gold,
  },
  verdictCard: {
    marginTop: spacing(0.5),
    paddingTop: spacing(1.25),
    borderTopWidth: 1,
    borderTopColor: 'rgba(214,138,56,0.18)',
    gap: 4,
  },
  verdictHeadline: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  verdictBody: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
  },
});
