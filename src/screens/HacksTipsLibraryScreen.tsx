import React, { useLayoutEffect, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, radii, serif, spacing } from '../theme/tokens';
import { useUser } from '../store/useUser';
import { useUserTier } from '../store/useUserTier';
import { triggerHaptic } from '../lib/haptics';
import {
  getEarnableMiniDeckLibraryItems,
  getLockedMiniDeckLibraryItems,
  getPlannedMiniDeckLibraryItems,
  getUnlockedMiniDeckLibraryItems,
  type HacksTipsLibraryItem,
} from '../features/unlocks/hacksTipsLibrary';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HacksTipsLibraryScreen() {
  const nav = useNavigation<Nav>();
  const { completedLessons } = useUser();
  const { tier } = useUserTier();

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Hacks & Tips',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '700', fontFamily: serif },
      headerShadowVisible: false,
    });
  }, [nav]);

  const unlocked = useMemo(() => getUnlockedMiniDeckLibraryItems(completedLessons, tier), [completedLessons, tier]);
  const readyToEarn = useMemo(() => getEarnableMiniDeckLibraryItems(completedLessons, tier), [completedLessons, tier]);
  const premiumLocked = useMemo(() => getLockedMiniDeckLibraryItems(tier), [tier]);
  const planned = useMemo(() => getPlannedMiniDeckLibraryItems(tier), [tier]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Bartender Hacks</Text>
          </View>
          <Text style={styles.heroTitle}>Your lesson-earned field guide library.</Text>
          <Text style={styles.heroBody}>
            Finish the linked lesson, open the deck right away, and come back here any time for a quick refresher.
          </Text>
          <View style={styles.heroStats}>
            <HeroStat label="Unlocked" value={String(unlocked.length)} />
            <HeroStat label="Ready Next" value={String(readyToEarn.length)} />
            <HeroStat label="Built Now" value={String(unlocked.length + readyToEarn.length + premiumLocked.length)} />
          </View>
        </View>

        <SectionTitle
          title="Unlocked"
          subtitle={unlocked.length > 0 ? 'These decks are already in your library.' : 'Complete the linked lessons to unlock your first deck.'}
        />
        {unlocked.length > 0 ? (
          unlocked.map((item) => (
            <LibraryCard
              key={item.id}
              item={item}
              variant="unlocked"
              ctaLabel="Open Deck"
              onPress={() => {
                triggerHaptic('selection');
                nav.navigate('UnlockDeck', { assetSlug: item.assetSlug, title: item.assetName });
              }}
            />
          ))
        ) : (
          <EmptyCard
            icon="sparkles-outline"
            title="No unlocked decks yet"
            body="Your first live decks unlock from lessons like Shaking vs Stirring, Syrups 101, and Adjusting Balance."
          />
        )}

        <SectionTitle
          title="Ready to Earn"
          subtitle="These decks are built and unlock automatically when you finish the lesson."
        />
        {readyToEarn.length > 0 ? (
          readyToEarn.map((item) => (
            <LibraryCard
              key={item.id}
              item={item}
              variant="earnable"
              ctaLabel="Go to Lessons"
              onPress={() => {
                triggerHaptic('selection');
                nav.navigate('Main');
              }}
            />
          ))
        ) : (
          <EmptyCard
            icon="checkmark-circle-outline"
            title="Everything live is already unlocked"
            body="As new ready decks ship, they will appear here automatically."
          />
        )}

        {premiumLocked.length > 0 ? (
          <>
            <SectionTitle
              title="Premium Locked"
              subtitle="These decks are built, but your tier does not include them yet."
            />
            {premiumLocked.map((item) => (
              <LibraryCard
                key={item.id}
                item={item}
                variant="locked"
                ctaLabel="View Access"
                onPress={() => {
                  triggerHaptic('selection');
                  nav.navigate('Paywall', { displayCloseButton: true });
                }}
              />
            ))}
          </>
        ) : null}

        {planned.length > 0 ? (
          <>
            <SectionTitle
              title="Coming Next"
              subtitle="These unlocks are mapped into the curriculum and waiting on deck production."
            />
            {planned.map((item) => (
              <LibraryCard
                key={item.id}
                item={item}
                variant="planned"
                ctaLabel="Planned"
                onPress={() => {}}
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStatCard}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function EmptyCard({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return (
    <View style={styles.emptyCard}>
      <Ionicons name={icon} size={24} color={colors.accent} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function LibraryCard({
  item,
  variant,
  ctaLabel,
  onPress,
}: {
  item: HacksTipsLibraryItem;
  variant: 'unlocked' | 'earnable' | 'locked' | 'planned';
  ctaLabel: string;
  onPress: () => void;
}) {
  const badgeText = {
    unlocked: 'Unlocked',
    earnable: 'Lesson Reward',
    locked: item.tier,
    planned: 'Planned',
  }[variant];

  const borderColor = {
    unlocked: 'rgba(214,138,56,0.35)',
    earnable: colors.line,
    locked: 'rgba(192,192,192,0.22)',
    planned: 'rgba(255,255,255,0.06)',
  }[variant];

  const buttonDisabled = variant === 'planned';

  return (
    <View style={[styles.card, { borderColor }]}>
      <View style={styles.cardHeader}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
        <Text style={styles.phaseText}>{formatRewardPhase(item.rewardPhase)}</Text>
      </View>

      <Text style={styles.cardTitle}>{item.assetName}</Text>
      <Text style={styles.cardDescription}>{item.description}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="book-outline" size={14} color={colors.accent} />
          <Text style={styles.metaText}>{item.moduleTitle}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="checkmark-done-outline" size={14} color={colors.accent} />
          <Text style={styles.metaText}>{item.lessonTitle}</Text>
        </View>
      </View>

      <Pressable
        style={[styles.cardButton, buttonDisabled && styles.cardButtonDisabled]}
        onPress={onPress}
        disabled={buttonDisabled}
      >
        <Text style={[styles.cardButtonText, buttonDisabled && styles.cardButtonTextDisabled]}>{ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

function formatRewardPhase(phase: HacksTipsLibraryItem['rewardPhase']) {
  switch (phase) {
    case 'midpoint':
      return 'Mid-module';
    case 'late_module':
      return 'Later lesson';
    case 'checkpoint':
      return 'Checkpoint';
    case 'module_completion':
      return 'Module complete';
    default:
      return 'Lesson reward';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing(2),
    paddingBottom: spacing(6),
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.24)',
    padding: spacing(3),
    marginBottom: spacing(3),
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(214,138,56,0.14)',
    borderRadius: 999,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    marginBottom: spacing(1.5),
  },
  heroBadgeText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 32,
    fontFamily: serif,
    marginBottom: spacing(1),
  },
  heroBody: {
    color: colors.subtext,
    fontSize: 14,
    lineHeight: 21,
  },
  heroStats: {
    flexDirection: 'row',
    gap: spacing(1),
    marginTop: spacing(2.5),
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radii.lg,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
  },
  heroStatValue: {
    color: colors.text,
    fontSize: 22,
    fontFamily: serif,
    marginBottom: spacing(0.5),
  },
  heroStatLabel: {
    color: colors.subtext,
    fontSize: 12,
  },
  sectionHeader: {
    marginBottom: spacing(1.5),
    marginTop: spacing(0.5),
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontFamily: serif,
    marginBottom: spacing(0.5),
  },
  sectionSubtitle: {
    color: colors.subtext,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(3),
    marginBottom: spacing(3),
    gap: spacing(1),
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontFamily: serif,
  },
  emptyBody: {
    color: colors.subtext,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing(2.5),
    marginBottom: spacing(2),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(1.25),
  },
  badge: {
    backgroundColor: 'rgba(214,138,56,0.14)',
    borderRadius: 999,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.5),
  },
  badgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  phaseText: {
    color: colors.subtext,
    fontSize: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontFamily: serif,
    marginBottom: spacing(0.75),
  },
  cardDescription: {
    color: colors.subtext,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing(1.5),
  },
  metaRow: {
    gap: spacing(0.75),
    marginBottom: spacing(2),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  metaText: {
    color: colors.text,
    fontSize: 13,
    flex: 1,
  },
  cardButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.25),
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
  },
  cardButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cardButtonText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 14,
  },
  cardButtonTextDisabled: {
    color: colors.subtext,
  },
});
