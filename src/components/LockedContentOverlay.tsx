/**
 * LockedContentOverlay Component
 * Displays over locked vault content with upgrade CTA
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { UserTier } from '../store/useUserTier';
import { getTierDisplayName, getTierColor } from '../utils/tierAccess';

interface LockedContentOverlayProps {
  requiredTier: UserTier;
  onUpgradePress: () => void;
  variant?: 'full' | 'compact'; // full = covers whole card, compact = inline badge
}

export default function LockedContentOverlay({
  requiredTier,
  onUpgradePress,
  variant = 'full'
}: LockedContentOverlayProps) {
  const tierColor = getTierColor(requiredTier);
  const tierLabel = getTierDisplayName(requiredTier);

  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.compactBadge, { borderColor: tierColor }]}>
          <Ionicons name="lock-closed" size={12} color={tierColor} />
          <Text style={[styles.compactText, { color: tierColor }]}>
            {tierLabel} Required
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.upgradeButtonSmall, { backgroundColor: tierColor }]}
          onPress={onUpgradePress}
          activeOpacity={0.8}
        >
          <Text style={styles.upgradeButtonTextSmall}>Upgrade</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: `${tierColor}20` }]}>
          <Ionicons name="lock-closed" size={32} color={tierColor} />
        </View>

        <Text style={styles.title}>{tierLabel} Required</Text>
        <Text style={styles.subtitle}>
          Upgrade to unlock this content
        </Text>

        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: tierColor }]}
          onPress={onUpgradePress}
          activeOpacity={0.8}
        >
          <Text style={styles.upgradeButtonText}>
            Upgrade to {tierLabel}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={colors.bg} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full overlay variant
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(3),
  },

  content: {
    alignItems: 'center',
    gap: spacing(1.5),
  },

  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing(1),
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: spacing(1),
  },

  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: radii.pill,
    marginTop: spacing(1),
  },

  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.bg,
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },

  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
    borderWidth: 1,
    backgroundColor: colors.bg,
  },

  compactText: {
    fontSize: 11,
    fontWeight: '600',
  },

  upgradeButtonSmall: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.md,
  },

  upgradeButtonTextSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.bg,
  },
});
