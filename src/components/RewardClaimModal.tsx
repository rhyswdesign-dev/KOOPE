/**
 * Reward Claim Modal
 * Animated modal for claiming challenge rewards
 * Shows XP, keys, and badges with celebration effects
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { ChallengeReward } from '../types/challenge';
import { log } from '../lib/logger';

interface RewardClaimModalProps {
  visible: boolean;
  reward: ChallengeReward | null;
  challengeTitle: string;
  onClaim: () => void;
  onClose: () => void;
  claiming?: boolean;
}

const { width, height } = Dimensions.get('window');

export const RewardClaimModal: React.FC<RewardClaimModalProps> = ({
  visible,
  reward,
  challengeTitle,
  onClaim,
  onClose,
  claiming = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous bounce animation for attention
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      bounceAnim.setValue(0);
    }
  }, [visible]);

  if (!reward) return null;

  const bounceInterpolate = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Confetti or celebration icon */}
            <View style={styles.celebrationIcon}>
              <Ionicons name="trophy" size={64} color={colors.warning} />
            </View>

            {/* Challenge Title */}
            <Text style={styles.title}>Challenge Complete!</Text>
            <Text style={styles.subtitle}>{challengeTitle}</Text>

            {/* Rewards Display */}
            <View style={styles.rewardsContainer}>
              {/* XP Reward */}
              {reward.xp > 0 && (
                <Animated.View
                  style={[
                    styles.rewardItem,
                    { transform: [{ translateY: bounceInterpolate }] },
                  ]}
                >
                  <View style={[styles.rewardIcon, styles.xpIcon]}>
                    <Ionicons name="flash" size={32} color={colors.accent} />
                  </View>
                  <Text style={styles.rewardAmount}>+{reward.xp}</Text>
                  <Text style={styles.rewardLabel}>XP</Text>
                </Animated.View>
              )}

              {/* Keys Reward */}
              {reward.keys && reward.keys > 0 && (
                <Animated.View
                  style={[
                    styles.rewardItem,
                    { transform: [{ translateY: bounceInterpolate }] },
                  ]}
                >
                  <View style={[styles.rewardIcon, styles.keysIcon]}>
                    <Ionicons name="key" size={32} color={colors.warning} />
                  </View>
                  <Text style={styles.rewardAmount}>+{reward.keys}</Text>
                  <Text style={styles.rewardLabel}>Keys</Text>
                </Animated.View>
              )}

              {/* Badge Reward */}
              {reward.badge && (
                <Animated.View
                  style={[
                    styles.rewardItem,
                    { transform: [{ translateY: bounceInterpolate }] },
                  ]}
                >
                  <View style={[styles.rewardIcon, styles.badgeIcon]}>
                    <Ionicons name="medal" size={32} color={colors.success} />
                  </View>
                  <Text style={styles.rewardAmount}>+1</Text>
                  <Text style={styles.rewardLabel}>Badge</Text>
                </Animated.View>
              )}
            </View>

            {/* Claim Button */}
            <Pressable
              style={[styles.claimButton, claiming && styles.claimButtonDisabled]}
              onPress={onClaim}
              disabled={claiming}
            >
              <Text style={styles.claimButtonText}>
                {claiming ? 'Claiming...' : 'Claim Reward'}
              </Text>
              {!claiming && (
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              )}
            </Pressable>

            {/* Close Button */}
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: colors.background.elevated,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  celebrationIcon: {
    marginBottom: spacing.md,
  },
  title: {
    ...fonts.title,
    fontSize: 28,
    color: colors.textLight,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...fonts.body,
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  rewardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
    width: '100%',
  },
  rewardItem: {
    alignItems: 'center',
    flex: 1,
  },
  rewardIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  xpIcon: {
    backgroundColor: colors.accent + '20',
  },
  keysIcon: {
    backgroundColor: colors.warning + '20',
  },
  badgeIcon: {
    backgroundColor: colors.success + '20',
  },
  rewardAmount: {
    ...fonts.title,
    fontSize: 24,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  rewardLabel: {
    ...fonts.caption,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  claimButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    width: '100%',
    justifyContent: 'center',
  },
  claimButtonDisabled: {
    backgroundColor: colors.muted,
  },
  claimButtonText: {
    ...fonts.button,
    color: '#FFFFFF',
    fontSize: 18,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
});
