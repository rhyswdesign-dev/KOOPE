import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Skeleton from './Skeleton';
import { colors, spacing, radii } from '../theme/tokens';

/**
 * Cocktail Detail Skeleton Loader
 *
 * Mimics the layout of CocktailDetailScreen for loading states
 */
export default function CocktailDetailSkeleton() {
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Image */}
        <Skeleton
          width="100%"
          height={300}
          borderRadius={0}
          style={styles.heroImage}
        />

        <View style={styles.content}>
          {/* Title */}
          <Skeleton
            width="70%"
            height={28}
            borderRadius={6}
            style={styles.title}
          />

          {/* Subtitle */}
          <Skeleton
            width="50%"
            height={16}
            borderRadius={4}
            style={styles.subtitle}
          />

          {/* Info Row */}
          <View style={styles.infoRow}>
            <Skeleton width={80} height={24} borderRadius={radii.sm} />
            <Skeleton width={80} height={24} borderRadius={radii.sm} />
            <Skeleton width={80} height={24} borderRadius={radii.sm} />
          </View>

          {/* Description */}
          <Skeleton
            width="100%"
            height={14}
            borderRadius={4}
            style={styles.description}
          />
          <Skeleton
            width="90%"
            height={14}
            borderRadius={4}
            style={styles.description}
          />

          {/* Section Title - Ingredients */}
          <Skeleton
            width={120}
            height={20}
            borderRadius={4}
            style={styles.sectionTitle}
          />

          {/* Ingredients List */}
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.ingredientRow}>
              <Skeleton width={30} height={30} borderRadius={15} />
              <Skeleton width="60%" height={16} borderRadius={4} style={styles.ingredientText} />
            </View>
          ))}

          {/* Section Title - Instructions */}
          <Skeleton
            width={120}
            height={20}
            borderRadius={4}
            style={styles.sectionTitle}
          />

          {/* Instructions */}
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.instructionRow}>
              <Skeleton width={30} height={30} borderRadius={15} />
              <View style={styles.instructionText}>
                <Skeleton width="100%" height={14} borderRadius={4} style={styles.instructionLine} />
                <Skeleton width="80%" height={14} borderRadius={4} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingBottom: spacing(6),
  },
  heroImage: {
    marginBottom: spacing(3),
  },
  content: {
    paddingHorizontal: spacing(3),
  },
  title: {
    marginBottom: spacing(1),
  },
  subtitle: {
    marginBottom: spacing(2),
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing(2),
    marginBottom: spacing(3),
  },
  description: {
    marginBottom: spacing(1),
  },
  sectionTitle: {
    marginTop: spacing(3),
    marginBottom: spacing(2),
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  ingredientText: {
    marginLeft: spacing(2),
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing(2.5),
  },
  instructionText: {
    flex: 1,
    marginLeft: spacing(2),
  },
  instructionLine: {
    marginBottom: spacing(0.5),
  },
});
