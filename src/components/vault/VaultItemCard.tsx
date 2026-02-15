/**
 * VAULT ITEM CARD COMPONENT
 *
 * Generic card component for displaying Vault items.
 * Shows title, description, unlock state, and CTAs.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VaultItem, UserVaultState } from '../../config/vaultTypes';
import { colors, spacing, radii, fonts } from '../../theme/tokens';

interface VaultItemCardProps {
  item: VaultItem;
  userState: UserVaultState;
  isOwned: boolean;
  canUnlockWithXP: boolean;
  onUnlockWithXP?: () => void;
  onPress?: () => void;
}

export function VaultItemCard({
  item,
  userState,
  isOwned,
  canUnlockWithXP,
  onUnlockWithXP,
  onPress,
}: VaultItemCardProps) {
  // Determine unlock state message
  const getUnlockStateMessage = () => {
    if (isOwned) return 'Unlocked';

    if (item.requiresTier && !canUnlockWithXP) {
      return `Requires ${item.requiresTier} tier`;
    }

    if (item.xpCost && userState.xp < item.xpCost) {
      return `Need ${item.xpCost - userState.xp} more XP`;
    }

    return null;
  };

  // Render unlock buttons
  const renderUnlockButtons = () => {
    if (isOwned) {
      return (
        <View style={styles.ownedBadge}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.ownedText}>Unlocked</Text>
        </View>
      );
    }

    return (
      <View style={styles.buttonContainer}>
        {canUnlockWithXP && item.xpCost && (
          <Pressable
            style={styles.unlockButton}
            onPress={onUnlockWithXP}
          >
            <Ionicons name="flash" size={16} color={colors.white} />
            <Text style={styles.unlockButtonText}>{item.xpCost} XP</Text>
          </Pressable>
        )}

        {!canUnlockWithXP && (
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed" size={16} color={colors.subtext} />
            <Text style={styles.lockedText}>{getUnlockStateMessage()}</Text>
          </View>
        )}
      </View>
    );
  };

  // Render badges (limited time, tier requirement, etc.)
  const renderBadges = () => {
    const badges = [];

    if (item.isLimitedTime) {
      badges.push(
        <View key="limited" style={[styles.badge, styles.limitedBadge]}>
          <Text style={styles.badgeText}>Limited Time</Text>
        </View>
      );
    }

    if (item.requiresTier) {
      badges.push(
        <View key="tier" style={[styles.badge, styles.tierBadge]}>
          <Text style={styles.badgeText}>{item.requiresTier}</Text>
        </View>
      );
    }

    if ('difficulty' in item && item.difficulty === 'pro') {
      badges.push(
        <View key="pro" style={[styles.badge, styles.proBadge]}>
          <Text style={styles.badgeText}>PRO</Text>
        </View>
      );
    }

    return badges.length > 0 ? (
      <View style={styles.badgeContainer}>{badges}</View>
    ) : null;
  };

  return (
    <Pressable
      style={[styles.card, isOwned && styles.ownedCard]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        {renderBadges()}
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      {/* Render category-specific info */}
      {'baseClassicId' in item && (
        <Text style={styles.metaText}>
          Based on: {item.baseClassicId.replace(/_/g, ' ')}
        </Text>
      )}

      {'barName' in item && (
        <Text style={styles.metaText}>
          📍 {item.city}
        </Text>
      )}

      {'seasonName' in item && (
        <Text style={styles.metaText}>
          🗓️ {item.seasonName}
        </Text>
      )}

      {renderUnlockButtons()}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(2),
    borderWidth: 2,
    borderColor: colors.line,
  },
  ownedCard: {
    borderColor: colors.success,
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing(1),
  },
  title: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  description: {
    fontSize: fonts.body,
    color: colors.subtext,
    marginBottom: spacing(1.5),
    lineHeight: 22,
  },
  metaText: {
    fontSize: fonts.small,
    color: colors.subtle,
    marginBottom: spacing(0.5),
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: spacing(0.5),
    marginLeft: spacing(1),
  },
  badge: {
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },
  limitedBadge: {
    backgroundColor: colors.warning,
  },
  tierBadge: {
    backgroundColor: colors.accent,
  },
  proBadge: {
    backgroundColor: colors.accentDark,
  },
  badgeText: {
    fontSize: fonts.micro,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing(1),
    marginTop: spacing(1.5),
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.md,
    gap: spacing(0.5),
  },
  keyButton: {
    backgroundColor: colors.accentDark,
  },
  unlockButtonText: {
    fontSize: fonts.small,
    fontWeight: '700',
    color: colors.white,
  },
  ownedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    marginTop: spacing(1),
  },
  ownedText: {
    fontSize: fonts.small,
    fontWeight: '600',
    color: colors.success,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    marginTop: spacing(1),
  },
  lockedText: {
    fontSize: fonts.small,
    color: colors.subtext,
  },
});
