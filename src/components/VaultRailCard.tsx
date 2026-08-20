/**
 * Vault Rail Card
 *
 * A single, uniform card for the Vault discovery rail on the Recipes screen.
 * Unlike RecipeCard (content-sized) / LockedRecipeCard (locked-only), this one
 * renders every Vault item — variation, playbook or hack, locked or unlocked —
 * at the same fixed footprint so the rail reads as one even row.
 *
 * Visual language follows LockedRecipeCard (image + bottom gradient + title
 * stack + a top-right circular badge); the only difference is the badge glyph,
 * which mirrors VaultScreen's list rows: checkmark when unlocked, lock when not.
 *
 * Used only by the Recipes screen Vault rail.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii } from '../theme/tokens';

const AMBER_DIM = 'rgba(214,138,56,0.18)';

interface VaultRailCardProps {
  image: any;
  title: string;
  /** Level/tier line, e.g. "Level 7" or "Level 7 · PLUS". */
  levelLabel: string;
  isUnlocked: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function VaultRailCard({
  image,
  title,
  levelLabel,
  isUnlocked,
  onPress,
  style,
}: VaultRailCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.85}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${isUnlocked ? 'Unlocked' : 'Locked'}: ${title}`}
      accessibilityHint="Tap to open the Vault"
    >
      <ImageBackground source={image} style={styles.imageBackground} imageStyle={styles.image}>
        {/* Bottom gradient — for name legibility only */}
        <LinearGradient
          colors={['transparent', 'rgba(10,7,5,0.82)']}
          style={styles.bottomGradient}
        />

        {/* Top-right status badge */}
        <View style={styles.statusBadge}>
          <Ionicons
            name={isUnlocked ? 'checkmark-circle' : 'lock-closed-outline'}
            size={14}
            color={isUnlocked ? colors.accent : colors.subtext}
          />
        </View>

        {/* Bottom info stack — name above level/tier label */}
        <View style={styles.bottomStack}>
          <Text style={styles.nameText} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.subtitleText} numberOfLines={1}>
            {levelLabel}
          </Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 240,
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
  statusBadge: {
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
  nameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 18,
  },
  subtitleText: {
    fontSize: 11,
    color: 'rgba(242,229,213,0.65)',
    marginTop: 1,
  },
});
