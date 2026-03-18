// @ts-nocheck
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';

interface InsufficientCreditsModalProps {
  visible: boolean;
  onClose: () => void;
  onGetCredits: () => void;
  creditsNeeded: number;
  creditsAvailable: number;
}

export default function InsufficientCreditsModal({
  visible,
  onClose,
  onGetCredits,
  creditsNeeded,
  creditsAvailable,
}: InsufficientCreditsModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={56} color={colors.accent} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Insufficient Credits</Text>

          {/* Message */}
          <Text style={styles.message}>
            You need {creditsNeeded} credits to generate AI recommendations. You currently have{' '}
            {creditsAvailable} credits.
          </Text>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.getCreditsButton]}
              onPress={() => {
                onClose();
                onGetCredits();
              }}
            >
              <Text style={styles.getCreditsButtonText}>Get Credits</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(3),
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    marginBottom: spacing(2),
  },
  title: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1.5),
    textAlign: 'center',
  },
  message: {
    fontSize: fonts.body,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing(3),
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing(1.5),
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.white,
  },
  getCreditsButton: {
    backgroundColor: colors.accent,
  },
  getCreditsButtonText: {
    fontSize: fonts.body,
    fontWeight: '700',
    color: colors.black,
  },
});
