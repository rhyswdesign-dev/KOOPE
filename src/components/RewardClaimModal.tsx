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
          {/* Full-bleed trophy header */}
          <LinearGradient
            colors={['rgba(214,138,56,0.28)', 'rgba(214,138,56,0.06)', 'transparent']}
            style={styles.trophyHeader}
          >
            <View style={styles.glowHalo} />
            <Animated.View style={[styles.iconRing, { transform: [{ scale: iconScale }] }]}>
              <View style={styles.iconInner}>
                <Ionicons name="trophy" size={44} color={colors.accent} />
              </View>
            </Animated.View>
          </LinearGradient>

          <Pressable style={styles.cardInner} onPress={(e) => e.stopPropagation()}>
            {/* Eyebrow */}
            <View style={styles.eyebrow}>
              <Ionicons name="checkmark-circle" size={11} color={colors.success} />
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
                    <Ionicons name="flash" size={24} color={colors.accent} />
                  </View>
                  <Text style={styles.rewardAmount}>+{reward.xp}</Text>
                  <Text style={styles.rewardLabel}>XP</Text>
                </View>
              )}
              {reward.keys != null && reward.keys > 0 && (
                <View style={[styles.rewardCard, hasMultipleRewards && styles.rewardCardMulti]}>
                  <View style={[styles.rewardIconBox, styles.rewardIconKey]}>
                    <Ionicons name="key" size={24} color={colors.warning} />
                  </View>
                  <Text style={styles.rewardAmount}>+{reward.keys}</Text>
                  <Text style={styles.rewardLabel}>Keys</Text>
                </View>
              )}
              {reward.badge && (
                <View style={[styles.rewardCard, hasMultipleRewards && styles.rewardCardMulti]}>
                  <View style={[styles.rewardIconBox, styles.rewardIconBadge]}>
                    <Ionicons name="medal" size={24} color={colors.success} />
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
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  centeredWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: width * 0.86,
    maxWidth: 390,
    backgroundColor: '#2E2018',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.32)',
    overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 16,
  },
  trophyHeader: {
    width: '100%',
    paddingTop: spacing(4),
    paddingBottom: spacing(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInner: {
    alignItems: 'center',
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(3),
  },
  glowHalo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(214,138,56,0.18)',
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: 'rgba(214,138,56,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  iconInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(214,138,56,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing(1),
    backgroundColor: 'rgba(76,175,80,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.25)',
    paddingHorizontal: spacing(1.5),
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 1.6,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(0.5),
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing(2),
    paddingHorizontal: spacing(1),
  },
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(214,138,56,0.2)',
    marginBottom: spacing(2),
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(1.5),
    width: '100%',
    marginBottom: spacing(2.5),
  },
  rewardCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(214,138,56,0.06)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.18)',
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(1),
    gap: 4,
  },
  rewardCardMulti: {
    maxWidth: 110,
  },
  rewardIconBox: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: 'rgba(214,138,56,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: colors.accent,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  rewardIconKey: {
    backgroundColor: 'rgba(255,152,0,0.14)',
  },
  rewardIconBadge: {
    backgroundColor: 'rgba(76,175,80,0.14)',
  },
  rewardAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.accent,
    lineHeight: 30,
    fontFamily: 'Georgia',
  },
  rewardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  claimButton: {
    width: '100%',
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    marginBottom: spacing(1.5),
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 8,
  },
  claimButtonDisabled: {
    backgroundColor: colors.muted,
    shadowOpacity: 0,
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A120D',
    letterSpacing: 0.4,
  },
  dismissLink: {
    paddingVertical: spacing(1),
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '500',
    opacity: 0.6,
  },
});
