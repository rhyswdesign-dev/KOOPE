/**
 * Recipe History Card Component
 * Displays historical context for classic cocktails
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { CocktailHistory } from '../types/recipe';

interface RecipeHistoryCardProps {
  history: CocktailHistory;
  recipeName: string;
}

export function RecipeHistoryCard({ history, recipeName }: RecipeHistoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!history) return null;

  const hasTrivia = history.trivia && history.trivia.length > 0;

  return (
    <View style={styles.container}>
      {/* Header with Era Badge */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="time-outline" size={20} color={colors.gold} />
          <Text style={styles.headerTitle}>History & Origin</Text>
        </View>
        {history.era && (
          <View style={styles.eraBadge}>
            <Text style={styles.eraBadgeText}>{history.era}</Text>
          </View>
        )}
      </View>

      {/* Origin Summary */}
      <View style={styles.summarySection}>
        {history.year && (
          <View style={styles.summaryItem}>
            <Ionicons name="calendar-outline" size={16} color={colors.subtext} />
            <Text style={styles.summaryText}>{history.year}</Text>
          </View>
        )}
        {history.yearEstimate && !history.year && (
          <View style={styles.summaryItem}>
            <Ionicons name="calendar-outline" size={16} color={colors.subtext} />
            <Text style={styles.summaryText}>{history.yearEstimate}</Text>
          </View>
        )}
        {history.origin && (
          <View style={styles.summaryItem}>
            <Ionicons name="location-outline" size={16} color={colors.subtext} />
            <Text style={styles.summaryText}>{history.origin}</Text>
          </View>
        )}
        {history.creator && (
          <View style={styles.summaryItem}>
            <Ionicons name="person-outline" size={16} color={colors.subtext} />
            <Text style={styles.summaryText}>Created by {history.creator}</Text>
          </View>
        )}
        {history.establishment && (
          <View style={styles.summaryItem}>
            <Ionicons name="business-outline" size={16} color={colors.subtext} />
            <Text style={styles.summaryText}>{history.establishment}</Text>
          </View>
        )}
      </View>

      {/* Story (Collapsible) */}
      {history.story && (
        <View style={styles.storySection}>
          <Text
            style={styles.storyText}
            numberOfLines={isExpanded ? undefined : 4}
          >
            {history.story}
          </Text>
          <TouchableOpacity
            onPress={() => setIsExpanded(!isExpanded)}
            style={styles.expandButton}
          >
            <Text style={styles.expandButtonText}>
              {isExpanded ? 'Show Less' : 'Read More'}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.gold}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Notable Figures */}
      {history.notableFigures && history.notableFigures.length > 0 && (
        <View style={styles.notableFiguresSection}>
          <Text style={styles.sectionTitle}>Notable Figures</Text>
          <View style={styles.chipContainer}>
            {history.notableFigures.map((figure, index) => (
              <View key={index} style={styles.chip}>
                <Ionicons name="star-outline" size={12} color={colors.gold} />
                <Text style={styles.chipText}>{figure}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Did You Know? Trivia */}
      {hasTrivia && (
        <View style={styles.triviaSection}>
          <View style={styles.triviaTitleRow}>
            <Ionicons name="bulb-outline" size={18} color={colors.accent} />
            <Text style={styles.triviaTitle}>Did You Know?</Text>
          </View>
          {history.trivia!.map((fact, index) => (
            <View key={index} style={styles.triviaItem}>
              <View style={styles.triviaBullet} />
              <Text style={styles.triviaText}>{fact}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Evolution */}
      {history.evolution && (
        <View style={styles.evolutionSection}>
          <Text style={styles.sectionTitle}>How It Evolved</Text>
          <Text style={styles.evolutionText}>{history.evolution}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginVertical: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  eraBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.5),
    borderRadius: radii.full,
  },
  eraBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.goldText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summarySection: {
    gap: spacing(1.5),
    marginBottom: spacing(2),
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  summaryText: {
    fontSize: 14,
    color: colors.subtext,
    flex: 1,
  },
  storySection: {
    marginTop: spacing(2),
    paddingTop: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  storyText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing(1.5),
    gap: spacing(0.5),
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gold,
  },
  notableFiguresSection: {
    marginTop: spacing(2),
    paddingTop: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1.5),
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: colors.muted,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  chipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  triviaSection: {
    marginTop: spacing(2),
    paddingTop: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: 'rgba(231, 147, 62, 0.05)',
    padding: spacing(2),
    borderRadius: radii.md,
  },
  triviaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginBottom: spacing(2),
  },
  triviaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
  },
  triviaItem: {
    flexDirection: 'row',
    marginBottom: spacing(1.5),
    paddingLeft: spacing(1),
  },
  triviaBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 7,
    marginRight: spacing(1.5),
  },
  triviaText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  evolutionSection: {
    marginTop: spacing(2),
    paddingTop: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  evolutionText: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
