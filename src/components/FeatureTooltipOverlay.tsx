/**
 * Feature Tooltip Overlay Component
 * Reusable educational overlay that appears on first visit to pages
 * Shows users how to use unique features on each page
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

export interface TooltipStep {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  arrowTo?: { x: number; y: number }; // Coordinates to point arrow to
}

interface FeatureTooltipOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  steps: TooltipStep[];
  arrows?: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
    label: string;
  }>;
}

// Arrow component for pointing to UI elements
function Arrow({ from, to, label }: { from: { x: number; y: number }; to: { x: number; y: number }; label: string }) {
  // Calculate control point for curved arrow
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const controlX = midX;
  const controlY = midY - 30; // Curve upward

  return (
    <>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path
          d={`M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`}
          stroke={colors.gold}
          strokeWidth={3}
          fill="none"
        />
        {/* Arrowhead */}
        <Path
          d={`M ${to.x} ${to.y} L ${to.x - 8} ${to.y - 12} L ${to.x + 8} ${to.y - 12} Z`}
          fill={colors.gold}
        />
      </Svg>
      {/* Label near arrow start */}
      <View style={[styles.arrowLabel, { position: 'absolute', left: from.x - 40, top: from.y - 40 }]}>
        <Text style={styles.arrowLabelText}>{label}</Text>
      </View>
    </>
  );
}

export default function FeatureTooltipOverlay({
  visible,
  onDismiss,
  title,
  steps,
  arrows,
}: FeatureTooltipOverlayProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        {/* Semi-transparent backdrop */}
        <Pressable style={styles.backdrop} onPress={onDismiss} />

        {/* Arrows pointing to UI elements */}
        {arrows && arrows.map((arrow, index) => (
          <Arrow key={index} from={arrow.from} to={arrow.to} label={arrow.label} />
        ))}

        {/* Tooltip Content Card */}
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.tooltipCard}
        >
          <LinearGradient
            colors={[colors.card, colors.bg]}
            style={styles.cardGradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="bulb" size={32} color={colors.gold} />
              </View>
              <Text style={styles.headerTitle}>{title}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onDismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.subtext} />
              </TouchableOpacity>
            </View>

            {/* Steps */}
            <View style={styles.stepsContainer}>
              {steps.map((step, index) => (
                <Animated.View
                  key={index}
                  entering={FadeIn.delay(100 + index * 80).duration(300)}
                  style={styles.stepItem}
                >
                  <View style={styles.stepIconContainer}>
                    <Ionicons name={step.icon} size={24} color={colors.accent} />
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDescription}>{step.description}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>Got It!</Text>
              <Ionicons name="checkmark-circle" size={20} color={colors.bg} />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  arrowLabel: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  arrowLabelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.bg,
  },
  tooltipCard: {
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: height * 0.75,
    borderRadius: radii.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  cardGradient: {
    padding: spacing(3),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(3),
    gap: spacing(2),
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gold + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsContainer: {
    gap: spacing(2.5),
    marginBottom: spacing(3),
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: spacing(2),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
  },
  stepContent: {
    flex: 1,
    gap: spacing(0.5),
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.accent,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    borderRadius: radii.md,
  },
  ctaButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.bg,
  },
});
