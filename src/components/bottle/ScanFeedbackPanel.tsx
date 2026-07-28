/**
 * Scan Feedback Panel — "Is this the right bottle?" + the correction flow
 *
 * Extracted from BottleDetailScreen per the god-file standing rule, and
 * moved *below* the "see more" fold (Answer Card spec §B.4): the correction
 * affordance is real functionality, but asking the user to audit the
 * identification before they've seen the decision content works directly
 * against "resolve a decision in three seconds."
 *
 * Owns its own small state machine (pending → confirmed | correcting →
 * typing → dismissed) and the correction inputs; every side effect (cache
 * writes, navigation, Supabase correction rows) goes back out through the
 * callbacks, matching the ValueLine / GiftModePanel pattern in this folder.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';

type FeedbackState = 'pending' | 'confirmed' | 'correcting' | 'typing' | 'dismissed';

interface ScanFeedbackPanelProps {
  /** Scan confidence was below the bar — style the strip more insistently. */
  isLowConfidence: boolean;
  onConfirm: () => void;
  onCorrectViaRescan: () => void;
  onCorrectViaLibrary: () => void;
  onSubmitCorrection: (name: string, brand: string) => Promise<void>;
}

export default function ScanFeedbackPanel({
  isLowConfidence,
  onConfirm,
  onCorrectViaRescan,
  onCorrectViaLibrary,
  onSubmitCorrection,
}: ScanFeedbackPanelProps) {
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('pending');
  const [correctionName, setCorrectionName] = useState('');
  const [correctionBrand, setCorrectionBrand] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (feedbackState === 'dismissed') return null;

  const handleConfirm = () => {
    setFeedbackState('confirmed');
    onConfirm();
  };

  const handleSubmit = async () => {
    const name = correctionName.trim();
    if (!name) return;
    setSubmitting(true);
    await onSubmitCorrection(name, correctionBrand.trim());
    setSubmitting(false);
    setFeedbackState('dismissed');
  };

  return (
    <View
      style={[
        styles.feedbackStrip,
        isLowConfidence && styles.feedbackStripProminent,
        (feedbackState === 'correcting' || feedbackState === 'typing') &&
          styles.feedbackStripCorrection,
      ]}
    >
      {feedbackState === 'confirmed' ? (
        <>
          <Ionicons name="checkmark-circle" size={18} color={colors.gold} />
          <Text style={styles.feedbackConfirmedText}>Thanks — noted!</Text>
        </>
      ) : feedbackState === 'correcting' ? (
        <>
          <Text style={styles.correctionLabel}>Help us get it right</Text>
          <TouchableOpacity
            style={styles.correctionOption}
            onPress={() => {
              setFeedbackState('dismissed');
              onCorrectViaRescan();
            }}
          >
            <View style={styles.correctionOptionIcon}>
              <Ionicons name="scan-outline" size={20} color={colors.gold} />
            </View>
            <View style={styles.correctionOptionBody}>
              <Text style={styles.correctionOptionTitle}>Scan it again</Text>
              <Text style={styles.correctionOptionSub}>
                Get the label fully in frame with good light
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.correctionOption}
            onPress={() => {
              setFeedbackState('dismissed');
              onCorrectViaLibrary();
            }}
          >
            <View style={styles.correctionOptionIcon}>
              <Ionicons name="search-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.correctionOptionBody}>
              <Text style={styles.correctionOptionTitle}>Search the library</Text>
              <Text style={styles.correctionOptionSub}>Find it by name from our database</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.correctionOption}
            onPress={() => setFeedbackState('typing')}
          >
            <View style={styles.correctionOptionIcon}>
              <Ionicons name="create-outline" size={20} color={colors.subtext} />
            </View>
            <View style={styles.correctionOptionBody}>
              <Text style={styles.correctionOptionTitle}>Type it in</Text>
              <Text style={styles.correctionOptionSub}>Enter the name manually</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.correctionCancel}
            onPress={() => setFeedbackState('dismissed')}
          >
            <Text style={styles.correctionCancelText}>Skip</Text>
          </TouchableOpacity>
        </>
      ) : feedbackState === 'typing' ? (
        <>
          <Text style={styles.correctionLabel}>What&apos;s the right bottle?</Text>
          <TextInput
            style={styles.correctionInput}
            placeholder="Bottle name"
            placeholderTextColor={colors.subtext}
            value={correctionName}
            onChangeText={setCorrectionName}
            autoFocus
            returnKeyType="next"
          />
          <TextInput
            style={styles.correctionInput}
            placeholder="Brand (optional)"
            placeholderTextColor={colors.subtext}
            value={correctionBrand}
            onChangeText={setCorrectionBrand}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <View style={styles.correctionActions}>
            <TouchableOpacity
              style={[styles.correctionSubmit, !correctionName.trim() && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={!correctionName.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#1A120D" />
              ) : (
                <Text style={styles.correctionSubmitText}>Submit</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.correctionCancel}
              onPress={() => setFeedbackState('correcting')}
            >
              <Text style={styles.correctionCancelText}>Back</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Text
            style={[styles.feedbackQuestion, isLowConfidence && styles.feedbackQuestionProminent]}
          >
            Is this the right bottle?
          </Text>
          <View style={styles.feedbackButtons}>
            <TouchableOpacity style={styles.feedbackYes} onPress={handleConfirm}>
              <Ionicons name="thumbs-up-outline" size={15} color={colors.gold} />
              <Text style={styles.feedbackYesText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.feedbackNo}
              onPress={() => setFeedbackState('correcting')}
            >
              <Ionicons name="thumbs-down-outline" size={15} color={colors.subtext} />
              <Text style={styles.feedbackNoText}>No</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  feedbackStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${colors.accent}12`,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    marginBottom: spacing(3),
    gap: spacing(2),
  },
  feedbackStripProminent: {
    backgroundColor: 'rgba(255,152,0,0.1)',
    borderColor: 'rgba(255,152,0,0.35)',
  },
  feedbackStripCorrection: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing(1),
  },
  feedbackQuestion: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.subtext,
  },
  feedbackQuestionProminent: {
    color: colors.text,
    fontWeight: '600',
  },
  feedbackConfirmedText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold,
    marginLeft: spacing(1),
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: spacing(1),
  },
  feedbackYes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: `${colors.accent}20`,
    borderRadius: radii.sm,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderWidth: 1,
    borderColor: `${colors.accent}40`,
  },
  feedbackYesText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold,
  },
  feedbackNo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderWidth: 1,
    borderColor: colors.line,
  },
  feedbackNoText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
  },
  correctionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  correctionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    paddingVertical: spacing(1.25),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  correctionOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctionOptionBody: {
    flex: 1,
    gap: 2,
  },
  correctionOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  correctionOptionSub: {
    fontSize: 11,
    color: colors.subtext,
  },
  correctionInput: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    fontSize: 14,
    color: colors.text,
  },
  correctionActions: {
    flexDirection: 'row',
    gap: spacing(1),
    marginTop: spacing(0.5),
  },
  correctionSubmit: {
    flex: 1,
    backgroundColor: colors.gold,
    borderRadius: radii.sm,
    paddingVertical: spacing(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctionSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A120D',
  },
  correctionCancel: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctionCancelText: {
    fontSize: 13,
    color: colors.subtext,
  },
});
