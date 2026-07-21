/**
 * Taste Prompt Panel (Phase 1.6 — onboarding inversion)
 *
 * A free, ungated 2-tap "what do you like" capture, shown once after a
 * new user's first suggested-recipes moment on the Answer Card
 * (BottleDetailScreen). Deliberately mirrors GiftModePanel's chip-row UI
 * pattern (same taxonomy, src/config/spiritFlavorChipOptions.ts) but
 * writes to the user's own persisted personalization profile instead of
 * an ephemeral per-scan "who's this for" input — this is the lightweight
 * stand-in for the Plus/Pro-gated RefineYourTasteScreen, not a bypass of
 * it (RefineYourTasteScreen is untouched and stays gated).
 *
 * State lives in the parent (BottleDetailScreen) — controlled, no local
 * persistence here.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';
import type { FlavorProfile } from '../../types/userProfile';
import { SPIRIT_CHIP_OPTIONS, FLAVOR_CHIP_OPTIONS } from '../../config/spiritFlavorChipOptions';

interface TastePromptPanelProps {
  spiritHint?: string;
  flavorHint?: FlavorProfile;
  onSpiritSelect: (value: string | undefined) => void;
  onFlavorSelect: (value: FlavorProfile | undefined) => void;
  onDismiss: () => void;
}

export default function TastePromptPanel({
  spiritHint,
  flavorHint,
  onSpiritSelect,
  onFlavorSelect,
  onDismiss,
}: TastePromptPanelProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles-outline" size={16} color={colors.gold} />
          <Text style={styles.headerText}>Help us learn your taste</Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={18} color={colors.subtext} />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>2 quick taps — you can change this anytime.</Text>

      <Text style={styles.question}>What do you usually drink?</Text>
      <View style={styles.chipRow}>
        {SPIRIT_CHIP_OPTIONS.map((option) => {
          const selected = spiritHint === option.value && option.value !== '';
          return (
            <TouchableOpacity
              key={option.label}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onSpiritSelect(option.value || undefined)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.question}>How do you like it?</Text>
      <View style={styles.chipRow}>
        {FLAVOR_CHIP_OPTIONS.map((option) => {
          const selected = flavorHint === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onFlavorSelect(selected ? undefined : option.value)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gold,
  },
  subtitle: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: -spacing(0.5),
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
});
