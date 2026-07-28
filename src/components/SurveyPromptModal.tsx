/**
 * Survey Prompt Modal
 * Shows an XP-earning incentive for users to complete the taste profile survey
 * Triggered on second+ app open if survey hasn't been completed
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';

interface SurveyPromptModalProps {
  visible: boolean;
  onAccept: () => void;
  onDismiss: () => void;
  xpReward?: number;
}

export default function SurveyPromptModal({
  visible,
  onAccept,
  onDismiss,
  xpReward = 500,
}: SurveyPromptModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onDismiss} />

        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[colors.accent, colors.accent + 'DD']}
            style={styles.headerGradient}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="gift" size={48} color={colors.bg} />
            </View>
            <Text style={styles.xpBadge}>+{xpReward} XP</Text>
          </LinearGradient>

          <View style={styles.content}>
            <Text style={styles.title}>Complete Your Palate</Text>
            <Text style={styles.subtitle}>
              Help us personalize your experience! Answer a quick survey about your cocktail
              preferences and earn <Text style={styles.xpText}>{xpReward} XP</Text>.
            </Text>

            <View style={styles.benefits}>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                <Text style={styles.benefitText}>See cocktails tailored to your taste</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                <Text style={styles.benefitText}>Get brand recommendations you'll love</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                <Text style={styles.benefitText}>Unlock {xpReward} XP instantly</Text>
              </View>
            </View>

            <Text style={styles.timeEstimate}>Takes about 3-5 minutes</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.acceptButton} onPress={onAccept} activeOpacity={0.8}>
              <Text style={styles.acceptButtonText}>Let's Do It!</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.bg} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} activeOpacity={0.8}>
              <Text style={styles.dismissButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headerGradient: {
    padding: spacing(4),
    alignItems: 'center',
    position: 'relative',
  },
  iconContainer: {
    marginBottom: spacing(2),
  },
  xpBadge: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.bg,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  content: {
    padding: spacing(3),
    paddingTop: spacing(2),
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1.5),
  },
  subtitle: {
    fontSize: 15,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing(3),
  },
  xpText: {
    color: colors.accent,
    fontWeight: '700',
  },
  benefits: {
    gap: spacing(1.5),
    marginBottom: spacing(2),
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  benefitText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  timeEstimate: {
    fontSize: 13,
    color: colors.subtext,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actions: {
    padding: spacing(3),
    paddingTop: 0,
    gap: spacing(2),
  },
  acceptButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
  },
  acceptButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.bg,
  },
  dismissButton: {
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.subtext,
  },
});
