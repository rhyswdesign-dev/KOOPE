/**
 * Locked Recipe Card
 * Shows a beautiful thumbnail preview of a locked cocktail
 * Displays lock icon and upgrade prompt - NO NAME SHOWN
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
}

export default function LockedRecipeCard({ image, onPress, style }: LockedRecipeCardProps) {
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
        {/* Dark overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Lock icon overlay */}
        <View style={styles.lockOverlay}>
          <View style={styles.lockIconContainer}>
            <Ionicons name="lock-closed" size={32} color={colors.gold} />
          </View>
          <Text style={styles.upgradeText}>Upgrade to Unlock</Text>
        </View>

        {/* Premium badge */}
        <View style={styles.premiumBadge}>
          <Ionicons name="diamond-outline" size={14} color={colors.gold} />
          <Text style={styles.premiumText}>KOOPE+</Text>
        </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bg + 'E6',
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
  },
  upgradeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
});
