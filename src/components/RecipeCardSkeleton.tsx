import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Skeleton from './Skeleton';
import { colors, spacing, radii } from '../theme/tokens';

interface RecipeCardSkeletonProps {
  style?: ViewStyle;
}

/**
 * Recipe Card Skeleton Loader
 *
 * Mimics the layout of RecipeCard for loading states
 */
export default function RecipeCardSkeleton({ style }: RecipeCardSkeletonProps) {
  return (
    <View style={[styles.card, style]}>
      {/* Image skeleton */}
      <Skeleton
        width="100%"
        height={180}
        borderRadius={radii.lg}
        style={styles.image}
      />

      {/* Content area */}
      <View style={styles.content}>
        {/* Title */}
        <Skeleton
          width="80%"
          height={18}
          borderRadius={4}
          style={styles.title}
        />

        {/* Subtitle */}
        <Skeleton
          width="60%"
          height={14}
          borderRadius={4}
          style={styles.subtitle}
        />

        {/* Bottom row with category badge */}
        <View style={styles.bottomRow}>
          <Skeleton
            width={60}
            height={20}
            borderRadius={radii.sm}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  image: {
    marginBottom: spacing(1.5),
  },
  content: {
    padding: spacing(2),
    paddingTop: 0,
  },
  title: {
    marginBottom: spacing(0.5),
  },
  subtitle: {
    marginBottom: spacing(1.5),
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
