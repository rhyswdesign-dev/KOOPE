/**
 * Locked Recipe Card
 *
 * Clear thumbnail preview — no blur, no obscuring overlay.
 * The image is always visible so users can see what they're working toward.
 *
 * Badge states:
 *   - XP badge (amber)   : user has enough XP to unlock now
 *   - XP badge (muted)   : user needs more XP
 *   - Lock badge only    : tier-locked (no xpCost passed)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';

const AMBER = '#D68A38';
const AMBER_DIM = 'rgba(214,138,56,0.18)';

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
      activeOpacity={0.85}
      accessible
      accessibilityRole="button"
      accessibilityLabel={title ? `Locked: ${title}` : 'Locked cocktail'}
      accessibilityHint="Tap to see unlock options"
    >
      <ImageBackground
        source={image}
        style={styles.imageBackground}
        imageStyle={styles.image}
      >
        {/* Bottom gradient — for name legibility only */}
        <LinearGradient
          colors={['transparent', 'rgba(10,7,5,0.82)']}
          style={styles.bottomGradient}
        />

        {/* Top-right lock badge */}
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={11} color={AMBER} />
        </View>

        {/* Bottom info stack — name above XP badge */}
        <View style={styles.bottomStack}>
          {title && (
            <>
              <Text style={styles.nameText} numberOfLines={2}>{title}</Text>
              {subtitle && <Text style={styles.subtitleText} numberOfLines={1}>{subtitle}</Text>}
            </>
          )}
          {xpCost !== undefined && (
            <View style={[styles.xpBadge, canAfford ? styles.xpBadgeAffordable : styles.xpBadgeLocked]}>
              <Ionicons
                name="star"
                size={11}
                color={canAfford ? AMBER : colors.textMuted}
              />
              <Text style={[styles.xpText, !canAfford && styles.xpTextMuted]}>
                {xpCost} XP
              </Text>
            </View>
          )}
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
    borderColor: AMBER_DIM,
  },
  imageBackground: {
    width: '100%',
    height: '100%',
  },
  image: {
    borderRadius: radii.lg,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 110,
  },
  lockBadge: {
    position: 'absolute',
    top: spacing(1.25),
    right: spacing(1.25),
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(10,7,5,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomStack: {
    position: 'absolute',
    bottom: spacing(1.5),
    left: spacing(1.5),
    right: spacing(1.5),
    gap: 6,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.6),
    borderRadius: radii.full,
    borderWidth: 1,
  },
  xpBadgeAffordable: {
    backgroundColor: 'rgba(214,138,56,0.2)',
    borderColor: AMBER,
  },
  xpBadgeLocked: {
    backgroundColor: 'rgba(10,7,5,0.65)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  xpText: {
    fontSize: 11,
    fontWeight: '700',
    color: AMBER,
    letterSpacing: 0.3,
  },
  xpTextMuted: {
    color: colors.textMuted,
  },
  nameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F2E5D5',
    lineHeight: 18,
  },
  subtitleText: {
    fontSize: 11,
    color: 'rgba(242,229,213,0.65)',
    marginTop: 1,
  },
});
