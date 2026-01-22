import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Skeleton from '../Skeleton';
import { colors, spacing, radii } from '../../theme/tokens';

/**
 * Lessons Screen Skeleton Loader
 *
 * Mimics the layout of LessonsScreen for loading states
 * Shows tab bar + challenge cards placeholder
 */
export default function LessonsSkeleton() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Tab bar skeleton */}
      <View style={styles.tabBar}>
        <Skeleton width={100} height={36} borderRadius={radii.sm} />
        <Skeleton width={100} height={36} borderRadius={radii.sm} />
        <Skeleton width={100} height={36} borderRadius={radii.sm} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <Skeleton width={60} height={14} borderRadius={4} style={styles.statLabel} />
          </View>
          <View style={styles.statCard}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <Skeleton width={60} height={14} borderRadius={4} style={styles.statLabel} />
          </View>
          <View style={styles.statCard}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <Skeleton width={60} height={14} borderRadius={4} style={styles.statLabel} />
          </View>
        </View>

        {/* Section title */}
        <Skeleton width={150} height={22} borderRadius={4} style={styles.sectionTitle} />

        {/* Challenge cards */}
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.challengeCard}>
            <View style={styles.challengeHeader}>
              <Skeleton width={48} height={48} borderRadius={radii.md} />
              <View style={styles.challengeText}>
                <Skeleton width="70%" height={18} borderRadius={4} />
                <Skeleton width="90%" height={14} borderRadius={4} style={styles.challengeDesc} />
              </View>
            </View>
            <View style={styles.challengeFooter}>
              <Skeleton width={80} height={24} borderRadius={radii.sm} />
              <Skeleton width={60} height={24} borderRadius={radii.sm} />
            </View>
          </View>
        ))}

        {/* Recipe unlock section */}
        <Skeleton width={180} height={22} borderRadius={4} style={styles.sectionTitle} />

        <View style={styles.recipeUnlockCard}>
          <Skeleton width="100%" height={120} borderRadius={radii.lg} />
          <View style={styles.recipeContent}>
            <Skeleton width="60%" height={18} borderRadius={4} />
            <Skeleton width="80%" height={14} borderRadius={4} style={styles.recipeDesc} />
            <Skeleton width="100%" height={8} borderRadius={4} style={styles.progressBar} />
          </View>
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
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(2),
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  scrollContent: {
    padding: spacing(3),
    paddingBottom: spacing(8),
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing(3),
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing(2),
    borderRadius: radii.md,
    marginHorizontal: spacing(0.5),
  },
  statLabel: {
    marginTop: spacing(1),
  },
  sectionTitle: {
    marginBottom: spacing(2),
    marginTop: spacing(2),
  },
  challengeCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  challengeText: {
    flex: 1,
    marginLeft: spacing(2),
  },
  challengeDesc: {
    marginTop: spacing(0.5),
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipeUnlockCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  recipeContent: {
    padding: spacing(2),
  },
  recipeDesc: {
    marginTop: spacing(0.5),
  },
  progressBar: {
    marginTop: spacing(2),
  },
});
