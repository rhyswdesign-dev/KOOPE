/**
 * Locked Recipe Card
 * Shows a beautiful thumbnail preview of a locked cocktail
 * Displays lock icon and upgrade prompt
 * Supports XP unlock option
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';

interface LockedRecipeCardProps {
  image: any;
  onPress?: () => void;
  style?: ViewStyle;
  xpCost?: number;
  canAfford?: boolean;
  title?: string;
  subtitle?: string;
}

export default function LockedRecipeCard({
  image,
  onPress,
  style,
  xpCost,
  canAfford,
  title,
  subtitle,
}: LockedRecipeCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title ? `Locked cocktail ${title}` : 'Locked cocktail - upgrade to unlock'}
      accessibilityHint="Tap to see upgrade options"
    >
      <ImageBackground
        source={image}
        style={styles.imageBackground}
        imageStyle={styles.image}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.15)']}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.lockOverlay}>
          <View style={styles.lockIconContainer}>
            <Ionicons name="lock-closed" size={32} color="#808080" />
          </View>
          <Text style={styles.upgradeText}>Tap to Unlock</Text>
        </View>

        {(title || subtitle) && (
          <View style={styles.textOverlay}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        )}

        <View style={styles.premiumBadge}>
          <Ionicons name="diamond-outline" size={14} color={colors.gold} />
          <Text style={styles.premiumText}>KOOPE+</Text>
        </View>

        {xpCost !== undefined && (
          <View style={[styles.xpBadge, !canAfford && styles.xpBadgeUnaffordable]}>
            <Ionicons name="star" size={14} color={canAfford ? colors.gold : colors.textMuted} />
            <Text style={[styles.xpCostText, !canAfford && styles.xpCostTextUnaffordable]}>
              {xpCost} XP
            </Text>
          </View>
        )}
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 220,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.gold + '40',
  },
  imageBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    borderRadius: radii.lg,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textOverlay: {
    position: 'absolute',
    left: spacing(1.5),
    right: spacing(1.5),
    bottom: spacing(5.5),
    backgroundColor: 'rgba(14, 14, 14, 0.7)',
    borderRadius: radii.md,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(1),
  },
  lockIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 2,
    borderColor: 'rgba(128, 128, 128, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(1),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  upgradeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#808080',
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    opacity: 0.9,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    lineHeight: 15,
  },
  premiumBadge: {
    position: 'absolute',
    top: spacing(1.5),
    right: spacing(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg + 'E6',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.gold + '80',
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 0.5,
  },
  xpBadge: {
    position: 'absolute',
    bottom: spacing(1.5),
    left: spacing(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg + 'E6',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.gold + '80',
  },
  xpBadgeUnaffordable: {
    borderColor: colors.textMuted + '40',
    backgroundColor: colors.bg + '99',
  },
  xpCostText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 0.3,
  },
  xpCostTextUnaffordable: {
    color: colors.textMuted,
  },
});
