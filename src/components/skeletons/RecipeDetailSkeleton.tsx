import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Skeleton from '../Skeleton';
import { colors, spacing, radii } from '../../theme/tokens';

/**
 * Recipe Detail Skeleton Loader
 *
 * Mimics the layout of RecipeDetailScreen for loading states
 * Similar to CocktailDetailSkeleton but matches recipe screen structure
 */
export default function RecipeDetailSkeleton() {
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Image */}
        <Skeleton
          width="100%"
          height={280}
          borderRadius={0}
          style={styles.heroImage}
        />

        <View style={styles.content}>
          {/* Title & Category Row */}
          <View style={styles.headerRow}>
            <View style={styles.titleSection}>
              <Skeleton width="75%" height={26} borderRadius={6} />
              <Skeleton width={80} height={22} borderRadius={radii.sm} style={styles.categoryBadge} />
            </View>
            <Skeleton width={44} height={44} borderRadius={22} />
          </View>

          {/* Description */}
          <Skeleton width="100%" height={14} borderRadius={4} style={styles.descLine} />
          <Skeleton width="85%" height={14} borderRadius={4} style={styles.descLine} />

          {/* Quick Info Pills */}
          <View style={styles.pillsRow}>
            <Skeleton width={90} height={32} borderRadius={radii.pill} />
            <Skeleton width={90} height={32} borderRadius={radii.pill} />
            <Skeleton width={90} height={32} borderRadius={radii.pill} />
          </View>

          {/* Ingredients Section */}
          <Skeleton width={120} height={20} borderRadius={4} style={styles.sectionTitle} />

          <View style={styles.ingredientsList}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={styles.ingredientRow}>
                <Skeleton width={44} height={44} borderRadius={radii.md} />
                <View style={styles.ingredientInfo}>
                  <Skeleton width="50%" height={16} borderRadius={4} />
                  <Skeleton width="30%" height={12} borderRadius={4} style={styles.ingredientAmount} />
                </View>
                <Skeleton width={24} height={24} borderRadius={12} />
              </View>
            ))}
          </View>

          {/* Instructions Section */}
          <Skeleton width={120} height={20} borderRadius={4} style={styles.sectionTitle} />

          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.instructionRow}>
              <Skeleton width={32} height={32} borderRadius={16} />
              <View style={styles.instructionContent}>
                <Skeleton width="100%" height={14} borderRadius={4} />
                <Skeleton width="75%" height={14} borderRadius={4} style={styles.instructionLine} />
              </View>
            </View>
          ))}

          {/* Action Button */}
          <Skeleton width="100%" height={52} borderRadius={radii.pill} style={styles.actionButton} />
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
    marginBottom: spacing(2),
  },
  content: {
    paddingHorizontal: spacing(3),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing(2),
  },
  titleSection: {
    flex: 1,
    marginRight: spacing(2),
  },
  categoryBadge: {
    marginTop: spacing(1),
  },
  descLine: {
    marginBottom: spacing(0.5),
  },
  pillsRow: {
    flexDirection: 'row',
    gap: spacing(1),
    marginTop: spacing(2),
    marginBottom: spacing(3),
  },
  sectionTitle: {
    marginTop: spacing(2),
    marginBottom: spacing(2),
  },
  ingredientsList: {
    gap: spacing(1.5),
    marginBottom: spacing(2),
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing(1.5),
    borderRadius: radii.md,
  },
  ingredientInfo: {
    flex: 1,
    marginLeft: spacing(2),
  },
  ingredientAmount: {
    marginTop: spacing(0.5),
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing(2),
  },
  instructionContent: {
    flex: 1,
    marginLeft: spacing(2),
  },
  instructionLine: {
    marginTop: spacing(0.5),
  },
  actionButton: {
    marginTop: spacing(4),
  },
});
