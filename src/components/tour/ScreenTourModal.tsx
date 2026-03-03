import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../theme/tokens';
import { ScreenTourSlide } from '../../config/screenTours';

interface ScreenTourModalProps {
  visible: boolean;
  slides: ScreenTourSlide[];
  stepIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export default function ScreenTourModal({
  visible,
  slides,
  stepIndex,
  onClose,
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep,
}: ScreenTourModalProps) {
  const slide = slides[stepIndex];
  if (!slide) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <Text style={styles.counter}>Step {stepIndex + 1} of {slides.length}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={colors.subtext} />
            </Pressable>
          </View>

          <View style={styles.iconWrap}>
            <Ionicons name={slide.icon} size={24} color={colors.gold} />
          </View>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.body}</Text>

          <View style={styles.dotRow}>
            {slides.map((_, idx) => (
              <View key={`dot_${idx}`} style={[styles.dot, idx === stepIndex && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={isFirstStep ? onClose : onPrevious}
              style={[styles.actionBtn, styles.secondaryBtn]}
            >
              <Text style={styles.secondaryText}>{isFirstStep ? 'Skip' : 'Back'}</Text>
            </Pressable>
            <Pressable onPress={onNext} style={[styles.actionBtn, styles.primaryBtn]}>
              <Text style={styles.primaryText}>{isLastStep ? 'Done' : 'Next'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing(3),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(3),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  iconWrap: {
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: spacing(1),
  },
  body: {
    color: colors.subtext,
    fontSize: 15,
    lineHeight: 21,
  },
  dotRow: {
    marginTop: spacing(2),
    flexDirection: 'row',
    gap: spacing(0.75),
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.line,
  },
  dotActive: {
    backgroundColor: colors.gold,
  },
  actions: {
    marginTop: spacing(3),
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing(1),
  },
  actionBtn: {
    flex: 1,
    borderRadius: radii.md,
    paddingVertical: spacing(1.5),
    alignItems: 'center',
  },
  secondaryBtn: {
    backgroundColor: colors.chipBg,
  },
  primaryBtn: {
    backgroundColor: colors.gold,
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '700',
  },
  primaryText: {
    color: colors.goldText,
    fontWeight: '800',
  },
});
