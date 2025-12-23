/**
 * Skeleton Loader Component
 * Displays placeholder content while data is loading
 * Provides better UX than blank screens
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, radii } from '../theme/tokens';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = radii.sm,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Pre-built skeleton patterns
export const SkeletonCard: React.FC = () => {
  return (
    <View style={styles.card}>
      <SkeletonLoader height={150} borderRadius={radii.lg} style={{ marginBottom: spacing.md }} />
      <SkeletonLoader height={20} width="80%" style={{ marginBottom: spacing.sm }} />
      <SkeletonLoader height={16} width="60%" style={{ marginBottom: spacing.sm }} />
      <View style={styles.row}>
        <SkeletonLoader height={16} width={80} />
        <SkeletonLoader height={16} width={100} />
      </View>
    </View>
  );
};

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonListItem key={index} />
      ))}
    </View>
  );
};

export const SkeletonListItem: React.FC = () => {
  return (
    <View style={styles.listItem}>
      <SkeletonLoader height={60} width={60} borderRadius={radii.md} />
      <View style={styles.listItemContent}>
        <SkeletonLoader height={18} width="70%" style={{ marginBottom: spacing.xs }} />
        <SkeletonLoader height={14} width="50%" />
      </View>
    </View>
  );
};

export const SkeletonAvatar: React.FC<{ size?: number }> = ({ size = 40 }) => {
  return <SkeletonLoader height={size} width={size} borderRadius={size / 2} />;
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.background.elevated,
  },

  card: {
    backgroundColor: colors.background.elevated,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background.elevated,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },

  listItemContent: {
    flex: 1,
  },
});
