import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, radii, spacing } from '../../theme/tokens';
import {
  applyGuidedBalance,
  RatioEditorState,
  RatioProfile,
} from '../../utils/ratioEngine';

interface RatioBalanceEditorProps {
  profile: RatioProfile;
  initialState?: RatioEditorState;
  onCancel: () => void;
  onSave: (profile: RatioProfile, editorState: RatioEditorState) => void;
}

const DEFAULT_STATE: RatioEditorState = {
  spirit: 50,
  sweet: 50,
  acid: 50,
  dilution: 50,
};

function RatioRow({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      <Slider
        value={value}
        onValueChange={onChange}
        minimumValue={0}
        maximumValue={100}
        step={1}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.line}
        thumbTintColor={colors.accent}
        disabled={disabled}
      />
    </View>
  );
}

export default function RatioBalanceEditor({
  profile,
  initialState,
  onCancel,
  onSave,
}: RatioBalanceEditorProps) {
  const [state, setState] = useState<RatioEditorState>({
    ...DEFAULT_STATE,
    ...(initialState || {}),
  });

  const preview = useMemo(() => applyGuidedBalance(profile, state), [profile, state]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Ratio Balance</Text>
      <Text style={styles.subtitle}>
        Tune the profile for this recipe. Bitters are capped at 0.25 oz.
      </Text>

      <RatioRow
        label="Spirit Strength"
        value={state.spirit}
        onChange={(value) => setState((prev) => ({ ...prev, spirit: value }))}
      />
      <RatioRow
        label="Sweetness"
        value={state.sweet}
        onChange={(value) =>
          setState((prev) => ({
            ...prev,
            sweet: value,
            ...(profile.coupling.acidSweetLocked ? { acid: value } : {}),
          }))
        }
      />
      <RatioRow
        label="Acidity"
        value={state.acid}
        disabled={profile.coupling.acidSweetLocked}
        onChange={(value) =>
          setState((prev) => ({
            ...prev,
            acid: value,
            ...(profile.coupling.acidSweetLocked ? { sweet: value } : {}),
          }))
        }
      />
      <RatioRow
        label="Dilution"
        value={state.dilution}
        onChange={(value) => setState((prev) => ({ ...prev, dilution: value }))}
      />

      {profile.coupling.acidSweetLocked ? (
        <View style={styles.lockNote}>
          <Text style={styles.lockNoteText}>Acid/Sweet lock is enabled for this recipe.</Text>
        </View>
      ) : null}

      <View style={styles.previewSection}>
        <Text style={styles.previewTitle}>Preview</Text>
        {preview.ingredients.map((ingredient, index) => (
          <View key={`${ingredient.name}-${index}`} style={styles.previewRow}>
            <Text style={styles.previewName}>{ingredient.name}</Text>
            <Text style={styles.previewAmount}>{ingredient.amount_oz.toFixed(2)} oz</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() =>
            onSave(preview, {
              ...state,
              lastEditedAt: new Date().toISOString(),
            })
          }
        >
          <Text style={styles.saveText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderColor: colors.line,
    borderWidth: 1,
    padding: spacing(2),
    gap: spacing(1.25),
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.subtext,
    fontSize: 13,
  },
  row: {
    gap: spacing(0.5),
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  rowValue: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '700',
  },
  lockNote: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing(1),
    borderColor: colors.line,
    borderWidth: 1,
  },
  lockNoteText: {
    color: colors.subtext,
    fontSize: 12,
  },
  previewSection: {
    marginTop: spacing(0.5),
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderColor: colors.line,
    borderWidth: 1,
    padding: spacing(1.25),
    gap: spacing(0.75),
  },
  previewTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewName: {
    color: colors.text,
    fontSize: 12,
    flex: 1,
    paddingRight: spacing(1),
  },
  previewAmount: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing(1),
    marginTop: spacing(0.5),
  },
  cancelButton: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
  },
  cancelText: {
    color: colors.subtext,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
  },
  saveText: {
    color: colors.white,
    fontWeight: '700',
  },
});
