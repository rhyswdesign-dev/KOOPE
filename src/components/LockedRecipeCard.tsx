/**
 * Locked Recipe Card
 * Shows a beautiful thumbnail preview of a locked cocktail
 * Displays lock icon and upgrade prompt - NO NAME SHOWN
 * Supports XP unlock option
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';

interface LockedRecipeCardProps {
  image: any; // Cocktail thumbnail image
  onPress?: () => void; // Tap to show upgrade prompt
  style?: ViewStyle; // Allow custom styling for different layouts
  xpCost?: number; // XP cost to unlock (if undefined, XP unlock not available)
  canAfford?: boolean; // Whether user has enough XP
}

export default function LockedRecipeCard({ image, onPress, style, xpCost, canAfford }: LockedRecipeCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel="Locked cocktail - upgrade to unlock"
      accessibilityHint="Tap to see upgrade options"
    >
      <ImageBackground
        source={image}
        style={styles.imageBackground}
        imageStyle={styles.image}
      >
        {/* Subtle overlay - cocktail image clearly visible */}
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.15)']}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Lock icon watermark - centered, grey tone, semi-transparent */}
        <View style={styles.lockOverlay}>
          <View style={styles.lockIconContainer}>
            <Ionicons name="lock-closed" size={32} color="#808080" />
          </View>
          <Text style={styles.upgradeText}>Tap to Unlock</Text>
        </View>

        {/* Premium badge */}
        <View style={styles.premiumBadge}>
          <Ionicons name="diamond-outline" size={14} color={colors.gold} />
          <Text style={styles.premiumText}>KOOPE+</Text>
        </View>

        {/* XP Cost badge - shown at bottom if XP unlock available */}
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
  lockIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // Semi-transparent white watermark
    borderWidth: 2,
    borderColor: 'rgba(128, 128, 128, 0.4)', // Semi-transparent grey border
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
    color: '#808080', // Grey watermark text
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.8)', // Light shadow for contrast
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    opacity: 0.9,
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
