/**
 * TierBadge Component
 * Displays user's current subscription tier with icon and label
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { UserTier } from '../store/useUserTier';
import { getTierDisplayName, getTierColor, getTierIcon } from '../utils/tierAccess';

interface TierBadgeProps {
  tier: UserTier;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export default function TierBadge({
  tier,
  size = 'medium',
  showLabel = true
}: TierBadgeProps) {
  const sizeConfig = {
    small: {
      fontSize: 11,
      iconSize: 14,
      paddingVertical: spacing(0.5),
      paddingHorizontal: spacing(1),
      gap: spacing(0.5),
    },
    medium: {
      fontSize: 13,
      iconSize: 16,
      paddingVertical: spacing(1),
      paddingHorizontal: spacing(1.5),
      gap: spacing(0.75),
    },
    large: {
      fontSize: 16,
      iconSize: 20,
      paddingVertical: spacing(1.5),
      paddingHorizontal: spacing(2),
      gap: spacing(1),
    },
  };

  const config = sizeConfig[size];
  const tierColor = getTierColor(tier);
  const tierIcon = getTierIcon(tier);
  const tierLabel = getTierDisplayName(tier);

  return (
    <View
      style={[
        styles.badge,
        {
          paddingVertical: config.paddingVertical,
          paddingHorizontal: config.paddingHorizontal,
          gap: config.gap,
          borderColor: tierColor,
        }
      ]}
    >
      <Ionicons
        name={tierIcon as any}
        size={config.iconSize}
        color={tierColor}
      />
      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              color: tierColor,
              fontSize: config.fontSize
            }
          ]}
        >
          {tierLabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  label: {
    fontWeight: '700',
  },
});
