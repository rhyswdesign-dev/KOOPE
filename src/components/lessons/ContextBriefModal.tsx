import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, serif } from '../../theme/tokens';

interface ContextBriefModalProps {
  visible: boolean;
  title: string;
  mode: 'module' | 'lesson';
  estimatedMinutes?: number;
  label?: string;
  brief?: string;
  whyItMatters?: string;
  unlockReward?: string;
  bestFor?: string[];
  practiceFocus?: string;
  commonMistake?: string;
  contextBrief?: string;
  onStart: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function ContextBriefModal({
  visible,
  title,
  mode,
  estimatedMinutes,
  label,
  brief,
  whyItMatters,
  unlockReward,
  bestFor = [],
  practiceFocus,
  commonMistake,
  contextBrief,
  onStart,
  onSkip,
  onClose,
}: ContextBriefModalProps) {
  const [showContext, setShowContext] = useState(false);

  const titleLine = useMemo(() => {
    const parts = [];
    if (label) parts.push(label);
    if (estimatedMinutes) parts.push(`${estimatedMinutes} min`);
    return parts.join(' • ');
  }, [estimatedMinutes, label]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>{mode === 'module' ? 'Before You Start' : 'Lesson Brief'}</Text>
              <Text style={styles.title}>{title}</Text>
              {titleLine ? <Text style={styles.meta}>{titleLine}</Text> : null}
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {brief ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{mode === 'module' ? 'What You’ll Learn' : 'This Lesson Helps You'}</Text>
                <Text style={styles.sectionText}>{brief}</Text>
              </View>
            ) : null}

            {whyItMatters ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Why This Matters</Text>
                <Text style={styles.sectionText}>{whyItMatters}</Text>
              </View>
            ) : null}

            {practiceFocus ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>You’ll Practice</Text>
                <Text style={styles.sectionText}>{practiceFocus}</Text>
              </View>
            ) : null}

            {commonMistake ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Watch For</Text>
                <Text style={styles.sectionText}>{commonMistake}</Text>
              </View>
            ) : null}

            {unlockReward ? (
              <View style={styles.rewardCard}>
                <View style={styles.rewardHeader}>
                  <Ionicons name="sparkles-outline" size={16} color={colors.accent} />
                  <Text style={styles.rewardLabel}>Unlock Reward</Text>
                </View>
                <Text style={styles.rewardText}>{unlockReward}</Text>
              </View>
            ) : null}

            {bestFor.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Best For</Text>
                <View style={styles.chips}>
                  {bestFor.map((tag) => (
                    <View key={tag} style={styles.chip}>
                      <Text style={styles.chipText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {contextBrief ? (
              <View style={styles.section}>
                <Pressable style={styles.contextToggle} onPress={() => setShowContext((prev) => !prev)}>
                  <Text style={styles.sectionLabel}>Context</Text>
                  <Ionicons
                    name={showContext ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.accent}
                  />
                </Pressable>
                {showContext ? <Text style={styles.sectionText}>{contextBrief}</Text> : null}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            {contextBrief ? (
              <Pressable style={styles.secondaryButton} onPress={() => setShowContext((prev) => !prev)}>
                <Text style={styles.secondaryButtonText}>{showContext ? 'Hide Context' : 'Read Context'}</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.ghostButton} onPress={onSkip}>
              <Text style={styles.ghostButtonText}>Skip for now</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={onStart}>
              <Text style={styles.primaryButtonText}>{mode === 'module' ? 'Start Module' : 'Start Lesson'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 5, 4, 0.72)',
    justifyContent: 'flex-end',
    padding: spacing(2),
  },
  card: {
    backgroundColor: '#1A120D',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(214, 138, 56, 0.16)',
    overflow: 'hidden',
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 18,
  },
  handle: {
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginTop: spacing(1.25),
    marginBottom: spacing(0.5),
  },
  header: {
    paddingHorizontal: spacing(2.25),
    paddingTop: spacing(1.5),
    paddingBottom: spacing(1),
    flexDirection: 'row',
    gap: spacing(1.25),
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing(0.75),
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    fontFamily: serif,
    lineHeight: 34,
  },
  meta: {
    color: colors.subtext,
    fontSize: 13,
    marginTop: spacing(0.75),
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    maxHeight: '68%',
  },
  bodyContent: {
    paddingHorizontal: spacing(2.25),
    paddingBottom: spacing(2),
    gap: spacing(1.6),
  },
  section: {
    gap: spacing(0.75),
  },
  sectionLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
  },
  sectionText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
    opacity: 0.94,
  },
  rewardCard: {
    backgroundColor: 'rgba(214, 138, 56, 0.08)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(214, 138, 56, 0.18)',
    padding: spacing(1.5),
    gap: spacing(0.75),
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  rewardLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  rewardText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.75),
  },
  chip: {
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.8),
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  contextToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: {
    paddingHorizontal: spacing(2.25),
    paddingTop: spacing(1),
    paddingBottom: spacing(2.25),
    gap: spacing(1),
  },
  secondaryButton: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(214, 138, 56, 0.25)',
    backgroundColor: 'rgba(214, 138, 56, 0.08)',
    paddingVertical: spacing(1.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  ghostButton: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'transparent',
    paddingVertical: spacing(1.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    paddingVertical: spacing(1.35),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
