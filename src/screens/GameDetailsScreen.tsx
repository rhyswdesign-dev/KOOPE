import React, { useLayoutEffect, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing, radii } from '../theme/tokens';
import { getGameWriteup } from '../data/gameWriteups';
import EmptyState from '../components/states/EmptyState';

type RouteParams = RouteProp<{ GameDetails: { id: string } }, 'GameDetails'>;

const { width } = Dimensions.get('window');

export default function GameDetailsScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteParams>();
  const gameId = route.params?.id;
  const game = gameId ? getGameWriteup(gameId) : undefined;

  useLayoutEffect(() => {
    if (game) {
      nav.setOptions({ title: game.title });
    }
  }, [nav, game]);

  // Track game view for achievements
  useEffect(() => {
    if (game) {
      import('../services/achievementService').then(({ achievementService }) => {
        achievementService.trackAction('gamesPlayed', 1);
      }).catch(() => {});
    }
  }, [game]);

  if (!game) {
    return (
      <View style={styles.container}>
        <EmptyState
          variant="comingSoon"
          title="Game Details"
          description="Detailed game instructions, rules, and variations are on the way. Check back soon!"
        />
      </View>
    );
  }

  const imageHeight = Math.round(width * 1.2);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: spacing(8) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <Image
          source={game.image}
          style={[styles.headerImage, { height: imageHeight }]}
          resizeMode="cover"
        />

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Title & Origin */}
          <Text style={styles.title}>{game.title}</Text>
          <Text style={styles.meta}>Origin: {game.origin}</Text>

          {/* Info Chips */}
          <View style={styles.chipsRow}>
            <View style={styles.chip}>
              <Feather name="users" size={16} color={colors.text} style={{ marginRight: 6 }} />
              <Text style={styles.chipText}>Players: {game.players}</Text>
            </View>
            <View style={styles.chip}>
              <Feather name="award" size={16} color={colors.text} style={{ marginRight: 6 }} />
              <Text style={styles.chipText}>Difficulty: {game.difficulty}</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description}>{game.description}</Text>

          {/* Equipment */}
          <Text style={styles.sectionHeader}>Equipment</Text>
          <View style={styles.section}>
            {game.equipment.map((item, index) => (
              <View key={index} style={styles.rowItem}>
                <View style={styles.iconContainer}>
                  <Feather name={item.icon as any} size={20} color={colors.text} />
                </View>
                <Text style={styles.rowTitle}>{item.title}</Text>
              </View>
            ))}
          </View>

          {/* Drinking Style */}
          <Text style={styles.sectionHeader}>Drinking Style</Text>
          <View style={styles.section}>
            <View style={styles.rowItem}>
              <View style={styles.iconContainer}>
                <Feather name="coffee" size={20} color={colors.text} />
              </View>
              <Text style={styles.rowTitle}>{game.drinkingStyle}</Text>
            </View>
          </View>

          {/* Setup */}
          <Text style={styles.sectionHeader}>Setup Instructions</Text>
          <View style={styles.section}>
            {game.setup.map((step, index) => (
              <View key={index} style={styles.rowItem}>
                <View style={styles.iconContainer}>
                  <Feather name={step.icon as any} size={20} color={colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{step.text}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Rules */}
          <Text style={styles.sectionHeader}>Step-by-Step Rules</Text>
          <View style={styles.section}>
            {game.rules.map((rule, index) => (
              <View key={index} style={styles.rowItem}>
                <View style={styles.numberBadge}>
                  <Text style={styles.numberText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{rule}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Tips */}
          {game.tips && game.tips.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>Pro Tips</Text>
              <View style={styles.section}>
                {game.tips.map((tip, index) => (
                  <View key={index} style={styles.rowItem}>
                    <View style={styles.iconContainer}>
                      <Feather name="zap" size={20} color={colors.gold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{tip}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Warnings */}
          <Text style={styles.sectionHeader}>Warnings</Text>
          <View style={styles.section}>
            {game.warnings.map((warning, index) => (
              <View key={index} style={styles.rowItem}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,107,107,0.15)' }]}>
                  <Feather name="alert-triangle" size={20} color={colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{warning.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  headerImage: {
    width: '100%',
  },
  contentContainer: {
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2),
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  meta: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: spacing(2),
  },
  description: {
    fontSize: 16,
    color: colors.subtext,
    lineHeight: 24,
    marginBottom: spacing(1),
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing(1),
    marginBottom: spacing(2),
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line || 'rgba(244,237,230,0.12)',
  },
  chipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(3),
    marginBottom: spacing(1),
  },
  section: {
    gap: spacing(0.5),
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: 12,
    paddingVertical: spacing(0.5),
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadge: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold + '40',
  },
  numberText: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: '700',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
  },
});
