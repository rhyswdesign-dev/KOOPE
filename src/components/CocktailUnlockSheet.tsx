/**
 * Cocktail Unlock Sheet
 * Bottom sheet showing XP unlock and subscription options
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { BlurView } from 'expo-blur';

interface CocktailUnlockSheetProps {
  visible: boolean;
  onClose: () => void;
  cocktailName?: string;
  unlockHint?: string;
  xpCost: number;
  currentXP: number;
  canAfford: boolean;
  onUnlockWithXP: () => void;
  onUpgradeSubscription: () => void;
}

export default function CocktailUnlockSheet({
  visible,
  onClose,
  cocktailName = 'This Cocktail',
  unlockHint,
  xpCost,
  currentXP,
  canAfford,
  onUnlockWithXP,
  onUpgradeSubscription,
}: CocktailUnlockSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Bottom Sheet */}
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="lock-open" size={32} color={colors.gold} />
            <Text style={styles.title}>Unlock {cocktailName}?</Text>
            <Text style={styles.subtitle}>Choose how you'd like to unlock this recipe</Text>
            {unlockHint ? <Text style={styles.unlockHint}>{unlockHint}</Text> : null}
          </View>

          {/* XP Balance Display */}
          <View style={styles.xpBalanceContainer}>
            <Ionicons name="star" size={18} color={colors.gold} />
            <Text style={styles.xpBalanceText}>
              Your Balance: <Text style={styles.xpBalanceAmount}>{currentXP} XP</Text>
            </Text>
          </View>

          {/* XP Unlock Option */}
          <TouchableOpacity
            style={[styles.option, !canAfford && styles.optionDisabled]}
            onPress={canAfford ? onUnlockWithXP : undefined}
            disabled={!canAfford}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="star" size={24} color={canAfford ? colors.gold : colors.textMuted} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, !canAfford && styles.optionTitleDisabled]}>
                Unlock with {xpCost} XP
              </Text>
              <Text style={styles.optionDescription}>
                {canAfford
                  ? `You'll have ${currentXP - xpCost} XP left after unlocking`
                  : `You need ${xpCost - currentXP} more XP to unlock`
                }
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={canAfford ? colors.text : colors.textMuted}
            />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Subscription Unlock Option */}
          <TouchableOpacity style={styles.option} onPress={onUpgradeSubscription}>
            <View style={styles.optionIcon}>
              <Ionicons name="diamond" size={24} color={colors.gold} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Unlock All with KOOPE+</Text>
              <Text style={styles.optionDescription}>
                Get instant access to 100+ cocktails + exclusive features
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </TouchableOpacity>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(4),
    paddingTop: spacing(2),
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.line,
    borderRadius: radii.full,
    alignSelf: 'center',
    marginBottom: spacing(3),
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(2),
    fontFamily: fonts.heading,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing(0.5),
    textAlign: 'center',
  },
  unlockHint: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold,
    marginTop: spacing(1),
    textAlign: 'center',
  },
  xpBalanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    borderRadius: radii.md,
    marginBottom: spacing(3),
    gap: spacing(1),
  },
  xpBalanceText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  xpBalanceAmount: {
    fontWeight: '700',
    color: colors.gold,
    fontSize: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: spacing(2.5),
    borderRadius: radii.lg,
    marginBottom: spacing(2),
    borderWidth: 2,
    borderColor: colors.line,
  },
  optionDisabled: {
    opacity: 0.5,
    borderColor: colors.line + '40',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing(2),
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  optionTitleDisabled: {
    color: colors.textMuted,
  },
  optionDescription: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing(2),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  dividerText: {
    marginHorizontal: spacing(2),
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  closeButton: {
    marginTop: spacing(2),
    paddingVertical: spacing(2),
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
