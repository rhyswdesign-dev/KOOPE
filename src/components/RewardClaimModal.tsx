/**
 * Reward Claim Modal
 * On-brand dark espresso celebration for challenge completions
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { ChallengeReward } from '../types/challenge';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface RewardClaimModalProps {
  visible: boolean;
  reward: ChallengeReward | null;
  challengeTitle: string;
  onClaim: () => void;
  onClose: () => void;
  claiming?: boolean;
}

const { width } = Dimensions.get('window');

export const RewardClaimModal: React.FC<RewardClaimModalProps> = ({
  visible,
  reward,
  challengeTitle,
  onClaim,
  onClose,
  claiming = false,
}) => {
  const cardScale = useRef(new Animated.Value(0.84)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const rewardsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      cardScale.setValue(0.84);
      cardOpacity.setValue(0);
      overlayOpacity.setValue(0);
      iconScale.setValue(0);
      rewardsOpacity.setValue(0);

      Animated.sequence([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.parallel([
          Animated.spring(cardScale, { toValue: 1, tension: 54, friction: 8, useNativeDriver: true }),
          Animated.timing(cardOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]),
        Animated.spring(iconScale, { toValue: 1, tension: 75, friction: 6, useNativeDriver: true }),
        Animated.timing(rewardsOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      cardScale.setValue(0.84);
      cardOpacity.setValue(0);
      overlayOpacity.setValue(0);
      iconScale.setValue(0);
      rewardsOpacity.setValue(0);
    }
  }, [visible]);

  if (!reward) return null;

  const hasMultipleRewards = [reward.xp > 0, reward.keys && reward.keys > 0, !!reward.badge]
    .filter(Boolean).length > 1;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
        <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Dismiss on tap outside */}
      <Pressable style={styles.centeredWrapper} onPress={onClose}>
        <Animated.View
          style={[styles.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Amber shimmer top */}
            <LinearGradient
              colors={['rgba(214,138,56,0.22)', 'transparent']}
              style={styles.topShimmer}
            />

            {/* Trophy icon */}
            <View style={styles.iconSection}>
              <View style={styles.glowHalo} />
              <Animated.View style={[styles.iconRing, { transform: [{ scale: iconScale }] }]}>
                <View style={styles.iconInner}>
                  <Ionicons name="trophy" size={44} color={colors.accent} />
                </View>
              </Animated.View>
            </View>

            {/* Eyebrow */}
            <View style={styles.eyebrow}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text style={styles.eyebrowText}>CHALLENGE COMPLETE</Text>
            </View>

            {/* Title + subtitle */}
            <Text style={[styles.title, { fontFamily: serif }]}>Well done!</Text>
            <Text style={styles.subtitle} numberOfLines={2}>{challengeTitle}</Text>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Reward items */}
            <Animated.View style={[styles.rewardsRow, { opacity: rewardsOpacity }]}>
              {reward.xp > 0 && (
                <View style={[styles.rewardCard, hasMultipleRewards && styles.rewardCardMulti]}>
                  <View style={styles.rewardIconBox}>
                    <Ionicons name="flash" size={26} color={colors.accent} />
                  </View>
                  <Text style={styles.rewardAmount}>+{reward.xp}</Text>
                  <Text style={styles.rewardLabel}>XP</Text>
                </View>
              )}
              {reward.keys != null && reward.keys > 0 && (
                <View style={[styles.rewardCard, hasMultipleRewards && styles.rewardCardMulti]}>
                  <View style={[styles.rewardIconBox, styles.rewardIconKey]}>
                    <Ionicons name="key" size={26} color={colors.warning} />
                  </View>
                  <Text style={styles.rewardAmount}>+{reward.keys}</Text>
                  <Text style={styles.rewardLabel}>Keys</Text>
                </View>
              )}
              {reward.badge && (
                <View style={[styles.rewardCard, hasMultipleRewards && styles.rewardCardMulti]}>
                  <View style={[styles.rewardIconBox, styles.rewardIconBadge]}>
                    <Ionicons name="medal" size={26} color={colors.success} />
                  </View>
                  <Text style={styles.rewardAmount}>+1</Text>
                  <Text style={styles.rewardLabel}>Badge</Text>
                </View>
              )}
            </Animated.View>

            {/* Claim button */}
            <TouchableOpacity
              style={[styles.claimButton, claiming && styles.claimButtonDisabled]}
              onPress={onClaim}
              disabled={claiming}
              activeOpacity={0.82}
            >
              <Text style={styles.claimButtonText}>
                {claiming ? 'Claiming…' : 'Claim Reward'}
              </Text>
              {!claiming && <Ionicons name="checkmark-circle" size={20} color="#1A120D" />}
            </TouchableOpacity>

            {/* Dismiss link */}
            <TouchableOpacity style={styles.dismissLink} onPress={onClose}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

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
    paddingBottom: spacing(3),
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
    height: 80,
  },
  iconSection: {
    marginTop: spacing(4.5),
    marginBottom: spacing(2.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowHalo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(214,138,56,0.18)',
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    borderColor: 'rgba(214,138,56,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(214,138,56,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing(1.25),
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.success,
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(0.75),
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing(2.5),
  },
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing(2.5),
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(1.5),
    width: '100%',
    marginBottom: spacing(3),
  },
  rewardCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: spacing(1.75),
    gap: 4,
  },
  rewardCardMulti: {
    maxWidth: 100,
  },
  rewardIconBox: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: 'rgba(214,138,56,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  rewardIconKey: {
    backgroundColor: 'rgba(255,152,0,0.14)',
  },
  rewardIconBadge: {
    backgroundColor: 'rgba(76,175,80,0.14)',
  },
  rewardAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    lineHeight: 24,
  },
  rewardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  claimButton: {
    width: '100%',
    height: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    marginBottom: spacing(1.5),
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 5,
  },
  claimButtonDisabled: {
    backgroundColor: colors.muted,
    shadowOpacity: 0,
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A120D',
    letterSpacing: 0.3,
  },
  dismissLink: {
    paddingVertical: spacing(1),
  },
  dismissText: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '600',
  },
});
