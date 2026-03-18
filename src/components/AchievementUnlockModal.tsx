// @ts-nocheck
/**
 * ACHIEVEMENT UNLOCK MODAL
 * On-brand dark espresso celebration — amber gold, premium feel
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { Achievement } from '../services/achievementService';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface AchievementUnlockModalProps {
  visible: boolean;
  achievement: Achievement | null;
  onClose: () => void;
}

// Rarity config — on-brand palette
const RARITY_CONFIG = {
  common: {
    label: 'Common',
    color: '#C7B8A5',
    bg: 'rgba(199,184,165,0.14)',
    border: 'rgba(199,184,165,0.28)',
    glow: 'rgba(199,184,165,0.18)',
    shimmer: ['rgba(199,184,165,0.18)', 'transparent'] as [string, string],
  },
  rare: {
    label: 'Rare',
    color: colors.accent,
    bg: 'rgba(214,138,56,0.14)',
    border: 'rgba(214,138,56,0.35)',
    glow: 'rgba(214,138,56,0.22)',
    shimmer: ['rgba(214,138,56,0.28)', 'transparent'] as [string, string],
  },
  epic: {
    label: 'Epic',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.14)',
    border: 'rgba(167,139,250,0.3)',
    glow: 'rgba(167,139,250,0.2)',
    shimmer: ['rgba(167,139,250,0.22)', 'transparent'] as [string, string],
  },
  legendary: {
    label: 'Legendary',
    color: '#E89C40',
    bg: 'rgba(232,156,64,0.18)',
    border: 'rgba(232,156,64,0.45)',
    glow: 'rgba(232,156,64,0.28)',
    shimmer: ['rgba(232,156,64,0.35)', 'transparent'] as [string, string],
  },
};

export default function AchievementUnlockModal({
  visible,
  achievement,
  onClose,
}: AchievementUnlockModalProps) {
  const cardScale = useRef(new Animated.Value(0.82)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const shimmerOpacity = useRef(new Animated.Value(0)).current;

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.92, duration: 180, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose]);

  useEffect(() => {
    if (visible && achievement) {
      cardScale.setValue(0.82);
      cardOpacity.setValue(0);
      iconScale.setValue(0);
      glowOpacity.setValue(0);
      overlayOpacity.setValue(0);
      shimmerOpacity.setValue(0);

      // Backdrop → card entrance → icon pop → glow pulse
      Animated.sequence([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.parallel([
          Animated.spring(cardScale, { toValue: 1, tension: 52, friction: 8, useNativeDriver: true }),
          Animated.timing(cardOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(shimmerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.spring(iconScale, { toValue: 1, tension: 72, friction: 6, useNativeDriver: true }),
      ]).start(() => {
        // Start glow pulse after entrance
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
            Animated.timing(glowOpacity, { toValue: 0.45, duration: 900, useNativeDriver: true }),
          ])
        ).start();
      });

      const dismiss = setTimeout(handleClose, 4500);
      return () => clearTimeout(dismiss);
    } else {
      cardScale.setValue(0.82);
      cardOpacity.setValue(0);
      iconScale.setValue(0);
      glowOpacity.setValue(0);
      overlayOpacity.setValue(0);
      shimmerOpacity.setValue(0);
    }
  }, [visible, achievement, handleClose]);

  if (!achievement) return null;

  const rarity = RARITY_CONFIG[achievement.rarity as keyof typeof RARITY_CONFIG] ?? RARITY_CONFIG.common;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
        <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Card */}
      <View style={styles.centeredWrapper} pointerEvents="box-none">
        <Animated.View
          style={[styles.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}
        >
          {/* Rarity shimmer at top */}
          <Animated.View style={[styles.topShimmer, { opacity: shimmerOpacity }]}>
            <LinearGradient
              colors={rarity.shimmer}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Icon */}
          <View style={styles.iconSection}>
            <Animated.View style={[styles.glowHalo, { backgroundColor: rarity.glow, opacity: glowOpacity }]} />
            <Animated.View
              style={[styles.iconRing, { borderColor: rarity.border, transform: [{ scale: iconScale }] }]}
            >
              <View style={[styles.iconInner, { backgroundColor: rarity.bg }]}>
                <Ionicons name={achievement.icon as any} size={46} color={rarity.color} />
              </View>
            </Animated.View>
          </View>

          {/* Eyebrow */}
          <View style={styles.eyebrow}>
            <Ionicons name="trophy" size={12} color={colors.accent} />
            <Text style={styles.eyebrowText}>ACHIEVEMENT UNLOCKED</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { fontFamily: serif }]}>{achievement.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{achievement.description}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Rarity + XP */}
          <View style={styles.metaRow}>
            <View style={[styles.rarityPill, { backgroundColor: rarity.bg, borderColor: rarity.border }]}>
              <Text style={[styles.rarityText, { color: rarity.color }]}>
                {rarity.label.toUpperCase()}
              </Text>
            </View>
            <View style={styles.xpPill}>
              <Ionicons name="star" size={13} color={colors.accent} />
              <Text style={styles.xpText}>+{achievement.xpReward} XP</Text>
            </View>
          </View>

          {/* Claim button */}
          <TouchableOpacity style={styles.claimButton} onPress={handleClose} activeOpacity={0.82}>
            <Text style={styles.claimText}>Claim Reward</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Amber spark particles */}
        {visible && [...Array(8)].map((_, i) => (
          <SparkParticle
            key={i}
            index={i}
            color={i % 3 === 0 ? colors.accent : i % 3 === 1 ? '#F2E5D5' : rarity.color}
          />
        ))}
      </View>
    </Modal>
  );
}

function SparkParticle({ index, color }: { index: number; color: string }) {
  const y = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const angle = (index / 8) * Math.PI * 2;
    const dist = 110 + (index % 3) * 30;
    const delay = 350 + index * 70;

    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 90, friction: 5, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(y, { toValue: -Math.sin(angle) * dist, duration: 550, useNativeDriver: true }),
        Animated.timing(x, { toValue: Math.cos(angle) * dist, duration: 550, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 550, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const size = 4 + (index % 3) * 2;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX: x }, { translateY: y }, { scale }],
      }}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  centeredWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: width * 0.84,
    maxWidth: 380,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.22)',
    overflow: 'hidden',
    alignItems: 'center',
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(3.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.65,
    shadowRadius: 28,
    elevation: 14,
  },
  topShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  iconSection: {
    marginTop: spacing(4.5),
    marginBottom: spacing(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowHalo: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  iconRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing(1.5),
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.accent,
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1),
    lineHeight: 32,
  },
  description: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing(3),
  },
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing(2.5),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    marginBottom: spacing(3),
  },
  rarityPill: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
    borderRadius: radii.pill,
    backgroundColor: 'rgba(214,138,56,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.3)',
  },
  xpText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.accent,
  },
  claimButton: {
    width: '100%',
    height: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 5,
  },
  claimText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A120D',
    letterSpacing: 0.3,
  },
});
