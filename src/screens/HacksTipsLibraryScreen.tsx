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
import { DECK_CATEGORY_THEMES, getUnlockDeck, getUnlockDeckTheme, type DeckCategoryKey } from '../content/unlockDecks';
import { colors, radii, serif, spacing } from '../theme/tokens';
import { useUser } from '../store/useUser';
import { useUserTier } from '../store/useUserTier';
import { triggerHaptic } from '../lib/haptics';
import {
  getAllMiniDeckLibraryItems,
  getUnlockedMiniDeckLibraryItems,
  type HacksTipsLibraryItem,
} from '../features/unlocks/hacksTipsLibrary';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const DECK_CATEGORY_ORDER: DeckCategoryKey[] = ['prep', 'technique', 'flavor', 'zero_proof', 'hosting', 'pro'];
const PROGRESSION_DECK_ORDER = [
  'shopping-cart-smart-buy-guide',
  'simple-rich-syrup-basics',
  'glassware-cheat-sheet',
  'shake-vs-stir',
  'citrus-balance-fixes',
  'easy-flavor-pairing-matrix',
  'how-to-fix-an-unbalanced-cocktail',
  'dilution-control',
  'fresh-citrus-storage-hacks',
  'herb-garnish-preservation-hacks',
  'syrup-storage-shelf-life',
  'infusion-basics',
  'bitters-hack-guide',
  'flavor-bible-citrus-pairings',
  'texture-hacks',
  'build-better-mocktails',
  'seasonal-riff-build-sheet',
  'batching-for-4-8-and-12-guests',
  '10-guest-citrus-punch',
  'low-abv-hosting-punch',
  'how-to-make-drinks-look-premium',
  'global-tour-recipe-pack',
  'home-bar-emergency-substitutions',
  'flavor-bible-herb-pairings',
  'low-effort-high-impact-hosting-hacks',
  'party-punch-hacks',
  'speed-garnish-moves',
  'fortified-wine-hacks',
  'label-reading-like-a-pro',
  'gin-botanical-comparison-card',
  'modifier-and-liqueur-build-notes',
  'advanced-balance-sweetness-vs-weight',
  'bitter-and-tincture-basics',
  'taste-spirits-like-a-pro',
] as const;
const DECK_ORDER_INDEX = new Map<string, number>(PROGRESSION_DECK_ORDER.map((slug, index) => [slug, index]));

function sortDecks(items: HacksTipsLibraryItem[]) {
  return [...items].sort((left, right) => {
    const leftIndex = DECK_ORDER_INDEX.get(left.assetSlug) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = DECK_ORDER_INDEX.get(right.assetSlug) ?? Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return left.assetName.localeCompare(right.assetName);
  });
}

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

  const allDecks = useMemo(() => getAllMiniDeckLibraryItems(), []);
  const unlocked = useMemo(() => getUnlockedMiniDeckLibraryItems(completedLessons, tier), [completedLessons, tier]);
  const heroDeck = unlocked.length > 0
    ? unlocked[unlocked.length - 1]
    : allDecks.find((item) => item.hasDeckContent) || null;
  const categoryShelves = useMemo(() => {
    return DECK_CATEGORY_ORDER.map((key) => {
      const theme = DECK_CATEGORY_THEMES[key];
      const items = sortDecks(allDecks.filter((item) => {
        const deck = getUnlockDeck(item.assetSlug);
        return deck?.category === key;
      }));
      return { key, theme, items };
    }).filter((section) => section.items.length > 0);
  }, [allDecks]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          style={[styles.heroCard, heroDeck && styles.heroCardInteractive]}
          onPress={() => {
            if (!heroDeck) return;
            triggerHaptic('selection');
            nav.navigate('UnlockDeck', { assetSlug: heroDeck.assetSlug, title: heroDeck.assetName });
          }}
          disabled={!heroDeck}
        >
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Field Guide Archive</Text>
          </View>
          <Text style={styles.heroTitle}>Hacks & Tips Collection</Text>
          <Text style={styles.heroBody}>A quieter archive of field guides for prep, service, flavor, and hosting.</Text>
          <View style={styles.heroRule} />
          <View style={styles.heroStats}>
            <HeroStat label="Unlocked" value={String(unlocked.length)} />
            <HeroStat label="Total Decks" value={String(allDecks.length)} />
            <HeroStat label="Built Now" value={String(allDecks.filter((item) => item.hasDeckContent).length)} />
          </View>
        </Pressable>

        <SectionTitle
          title="Field Guides"
          subtitle="Browse the collection by category, with each shelf ordered from early fundamentals into later mastery."
        />
        {categoryShelves.length > 0 ? (
          categoryShelves.map((section) => (
            <View key={section.key} style={styles.shelfSection}>
              <View style={styles.shelfHeader}>
                <View style={styles.shelfTitleRow}>
                  <View style={[styles.shelfIconWrap, { backgroundColor: section.theme.accentSoft, borderColor: section.theme.accentSoft }]}>
                    <Ionicons name={section.theme.icon} size={16} color={section.theme.accent} />
                  </View>
                  <View>
                    <Text style={styles.shelfTitle}>{section.theme.label}</Text>
                    <Text style={styles.shelfSubtitle}>{section.items.length} deck{section.items.length === 1 ? '' : 's'}</Text>
                  </View>
                </View>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.shelfScrollContent}
              >
                {section.items.map((item) => (
                  item.hasDeckContent ? (
                    <DeckShelfCard
                      key={item.id}
                      item={item}
                      onPress={() => {
                        triggerHaptic('selection');
                        nav.navigate('UnlockDeck', { assetSlug: item.assetSlug, title: item.assetName });
                      }}
                    />
                  ) : (
                    <EmptyShelfCard key={item.id} item={item} theme={section.theme} />
                  )
                ))}
              </ScrollView>
            </View>
          ))
        ) : (
          <EmptyCard
            icon="sparkles-outline"
            title="No mini decks yet"
            body="As we create mini decks, they will appear here automatically for review."
          />
        )}

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

function DeckShelfCard({
  item,
  onPress,
}: {
  item: HacksTipsLibraryItem;
  onPress: () => void;
}) {
  const deck = getUnlockDeck(item.assetSlug);
  const theme = getUnlockDeckTheme(item.assetSlug);
  if (!deck || !theme) return null;

  return (
    <Pressable style={styles.shelfCard} onPress={onPress}>
      <LinearCover theme={theme} title={deck.title} kicker={deck.kicker} rewardPhase={formatRewardPhase(item.rewardPhase)} />
      <View style={styles.shelfCardMeta}>
        <Text style={styles.shelfCardTitle}>{item.assetName}</Text>
        <View style={styles.shelfMetaInline}>
          <Text style={styles.shelfMetaText}>{item.moduleTitle}</Text>
          <Text style={styles.shelfMetaDivider}>•</Text>
          <Text style={styles.shelfMetaText}>{item.lessonTitle}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyShelfCard({
  item,
  theme,
}: {
  item: HacksTipsLibraryItem;
  theme: typeof DECK_CATEGORY_THEMES[DeckCategoryKey];
}) {
  return (
    <View style={styles.shelfCard}>
      <View style={styles.emptyCoverShell}>
        <View style={styles.emptyCover}>
          <View style={styles.coverSpine} />
          <View style={styles.emptyTopRule} />
          <View style={styles.coverTopMeta}>
            <View style={styles.emptyCategoryPill}>
              <Ionicons name={theme.icon} size={12} color="rgba(242,229,213,0.28)" />
              <Text style={styles.emptyCategoryText}>{theme.label}</Text>
            </View>
          </View>
          <View style={styles.coverBody}>
            <Text style={styles.emptyCoverSeries}>{formatRewardPhase(item.rewardPhase)}</Text>
            <Text style={styles.emptyCoverTitle}>{item.assetName}</Text>
          </View>
          <Text style={styles.emptyCoverMark}>Reserved</Text>
        </View>
      </View>
      <View style={styles.shelfCardMeta}>
        <Text style={[styles.shelfCardTitle, styles.emptyShelfTitle]}>{item.assetName}</Text>
        <View style={styles.shelfMetaInline}>
          <Text style={styles.shelfMetaText}>{item.moduleTitle}</Text>
          <Text style={styles.shelfMetaDivider}>•</Text>
          <Text style={styles.shelfMetaText}>{item.lessonTitle}</Text>
        </View>
      </View>
    </View>
  );
}

function LinearCover({
  theme,
  title,
  kicker,
  rewardPhase,
}: {
  theme: NonNullable<ReturnType<typeof getUnlockDeckTheme>>;
  title: string;
  kicker: string;
  rewardPhase: string;
}) {
  return (
    <View style={styles.coverShell}>
      <View style={[styles.coverGradient, { backgroundColor: theme.gradient[1], borderColor: theme.accentSoft }]}>
        <View style={styles.coverSpine} />
        <View style={[styles.coverTopRule, { backgroundColor: theme.accentSoft }]} />
        <View style={styles.coverGlowWrap}>
          <View style={[styles.coverGlow, { backgroundColor: theme.accentSoft }]} />
        </View>
        <View style={[styles.coverOrbitalRing, { borderColor: theme.accentSoft }]} />
        <View style={styles.coverTopMeta}>
          <View style={[styles.coverCategoryPill, { borderColor: theme.accentSoft, backgroundColor: theme.accentSoft }]}>
            <Ionicons name={theme.icon} size={12} color={theme.accent} />
            <Text style={[styles.coverCategoryText, { color: theme.accent }]}>{theme.label}</Text>
          </View>
          <Text style={styles.coverKicker}>{kicker}</Text>
        </View>
        <View style={styles.coverBody}>
          <Text style={styles.coverSeries}>{rewardPhase}</Text>
          <Text style={styles.coverDisplayTitle}>{title}</Text>
        </View>
        <Text style={styles.coverMark}>KOOPE</Text>
      </View>
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
    padding: spacing(2.5),
    marginBottom: spacing(3),
  },
  heroCardInteractive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(214,138,56,0.1)',
    borderRadius: 999,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.6),
    marginBottom: spacing(1.1),
  },
  heroBadgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 28,
    fontFamily: serif,
    marginBottom: spacing(0.75),
  },
  heroBody: {
    color: colors.subtext,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 300,
  },
  heroRule: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(242,229,213,0.08)',
    marginTop: spacing(1.5),
  },
  heroStats: {
    flexDirection: 'row',
    gap: spacing(1),
    marginTop: spacing(1.5),
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: radii.lg,
    paddingVertical: spacing(1.2),
    paddingHorizontal: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
  },
  heroStatValue: {
    color: colors.text,
    fontSize: 20,
    fontFamily: serif,
    marginBottom: spacing(0.25),
  },
  heroStatLabel: {
    color: colors.subtext,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    marginBottom: spacing(0.25),
  },
  shelfSection: {
    marginBottom: spacing(3),
  },
  shelfHeader: {
    marginBottom: spacing(1),
  },
  shelfTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  shelfIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shelfTitle: {
    color: colors.text,
    fontSize: 18,
    fontFamily: serif,
  },
  shelfSubtitle: {
    color: colors.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  shelfScrollContent: {
    paddingRight: spacing(2),
  },
  shelfCard: {
    width: 232,
    marginRight: spacing(1.5),
  },
  coverShell: {
    marginBottom: spacing(1),
  },
  coverGradient: {
    height: 308,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing(1.5),
    justifyContent: 'space-between',
  },
  coverSpine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 10,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  coverTopRule: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 18,
    height: 1,
  },
  coverGlowWrap: {
    position: 'absolute',
    right: -32,
    top: 72,
  },
  coverGlow: {
    width: 158,
    height: 214,
    borderRadius: 120,
    opacity: 0.78,
  },
  coverOrbitalRing: {
    position: 'absolute',
    right: -10,
    top: 86,
    width: 160,
    height: 200,
    borderRadius: 120,
    borderWidth: 1,
    opacity: 0.14,
  },
  coverTopMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing(1),
  },
  coverCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(0.9),
    paddingVertical: spacing(0.55),
  },
  coverCategoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  coverKicker: {
    color: 'rgba(242,229,213,0.56)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    textAlign: 'right',
    maxWidth: 92,
  },
  coverBody: {
    marginTop: 'auto',
  },
  coverSeries: {
    color: 'rgba(242,229,213,0.54)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: spacing(0.7),
  },
  coverDisplayTitle: {
    color: '#F3E8D8',
    fontSize: 31,
    lineHeight: 35,
    fontFamily: serif,
    fontWeight: '700',
    maxWidth: 162,
  },
  coverMark: {
    color: 'rgba(242,229,213,0.32)',
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  shelfCardMeta: {
    gap: spacing(0.45),
  },
  shelfCardTitle: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: serif,
  },
  shelfMetaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    marginTop: spacing(0.2),
  },
  shelfMetaText: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 16,
  },
  shelfMetaDivider: {
    color: 'rgba(242,229,213,0.28)',
    fontSize: 12,
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
  emptyCoverShell: {
    marginBottom: spacing(1),
  },
  emptyCover: {
    height: 308,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: spacing(1.5),
    justifyContent: 'space-between',
  },
  emptyTopRule: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 18,
    height: 1,
    backgroundColor: 'rgba(242,229,213,0.06)',
  },
  emptyCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing(0.9),
    paddingVertical: spacing(0.55),
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  emptyCategoryText: {
    color: 'rgba(242,229,213,0.34)',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCoverTitle: {
    color: 'rgba(242,229,213,0.46)',
    fontSize: 29,
    lineHeight: 34,
    fontFamily: serif,
    fontWeight: '700',
    maxWidth: 168,
  },
  emptyCoverSeries: {
    color: 'rgba(242,229,213,0.26)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: spacing(0.7),
  },
  emptyCoverMark: {
    color: 'rgba(242,229,213,0.22)',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  emptyShelfTitle: {
    color: 'rgba(242,229,213,0.68)',
  },
});
