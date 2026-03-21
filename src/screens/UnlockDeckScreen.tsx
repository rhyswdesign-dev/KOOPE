import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { getUnlockDeck, getUnlockDeckTheme, type UnlockDeckSlide } from '../content/unlockDecks';
import { getUnlockByAssetSlug } from '../config/unlockContent';
import { colors, radii, serif, spacing } from '../theme/tokens';
import { triggerHaptic } from '../lib/haptics';
import { useUser } from '../store/useUser';
import { useUserTier } from '../store/useUserTier';

type Nav = NativeStackNavigationProp<RootStackParamList, 'UnlockDeck'>;
type UnlockDeckRoute = RouteProp<RootStackParamList, 'UnlockDeck'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HORIZONTAL_PADDING = 24;
const PAGE_WIDTH = SCREEN_WIDTH;
const CARD_HEIGHT = Math.min(SCREEN_HEIGHT * 0.7, 690);
const INNER_CARD_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;

export default function UnlockDeckScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<UnlockDeckRoute>();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { completedLessons } = useUser();
  const { tier } = useUserTier();

  const deck = useMemo(() => getUnlockDeck(route.params.assetSlug), [route.params.assetSlug]);
  const deckTheme = useMemo(() => getUnlockDeckTheme(route.params.assetSlug), [route.params.assetSlug]);
  const unlock = useMemo(() => getUnlockByAssetSlug(route.params.assetSlug), [route.params.assetSlug]);
  const title = route.params.title || deck?.title || unlock?.assetName || 'Unlock Deck';
  const isProLockedDeck = unlock?.tier === 'PRO';
  const hasCompletedUnlockLesson = unlock?.lessonId ? completedLessons.includes(unlock.lessonId) : true;
  const isDeckAccessible = !isProLockedDeck || (tier === 'PRO' && hasCompletedUnlockLesson);

  const goToIndex = (nextIndex: number) => {
    if (!deck) return;
    const safeIndex = Math.max(0, Math.min(nextIndex, deck.slides.length - 1));
    scrollRef.current?.scrollTo({ x: safeIndex * PAGE_WIDTH, animated: true });
    if (safeIndex !== activeIndex) {
      triggerHaptic('selection');
      setActiveIndex(safeIndex);
    }
  };

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / PAGE_WIDTH);
    if (nextIndex !== activeIndex) {
      triggerHaptic('selection');
      setActiveIndex(nextIndex);
    }
  };

  if (!deck) {
    return (
      <SafeAreaView style={styles.missingContainer}>
        <StatusBar barStyle="light-content" />
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.missingCard}>
          <Text style={styles.missingEyebrow}>Unlock Asset Missing</Text>
          <Text style={styles.missingTitle}>This deck is still being prepared.</Text>
          <Text style={styles.missingBody}>
            We wired the unlock screen correctly, but this asset slug does not have published content yet.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isDeckAccessible && unlock) {
    const needsTierUpgrade = unlock.tier === 'PRO' && tier !== 'PRO';

    return (
      <SafeAreaView style={styles.missingContainer}>
        <StatusBar barStyle="light-content" />
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.missingCard}>
          <Text style={styles.missingEyebrow}>{needsTierUpgrade ? 'PRO Mastery Only' : 'Finish Mastery Lesson First'}</Text>
          <Text style={styles.missingTitle}>{unlock.assetName}</Text>
          <Text style={styles.missingBody}>
            {needsTierUpgrade
              ? 'This technical field guide is reserved for KOOPE PRO and unlocks through the mastery lesson path.'
              : 'This field guide unlocks after you complete its mastery lesson. Finish the lesson first, then come back here.'}
          </Text>
          <Pressable
            style={styles.lockedPrimaryButton}
            onPress={() => {
              if (needsTierUpgrade) {
                navigation.navigate('Paywall', { source: 'mastery_lessons' });
                return;
              }
              Alert.alert('Locked Until Completed', 'Complete the assigned mastery lesson to unlock this deck.');
            }}
          >
            <Text style={styles.lockedPrimaryButtonText}>{needsTierUpgrade ? 'Unlock PRO' : 'Understood'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={deckTheme?.gradient ?? ['#090605', '#1A120D', '#120B08']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <View pointerEvents="none" style={styles.glowOrbOne} />
      <View pointerEvents="none" style={styles.glowOrbTwo} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>{unlock?.watermark.label || deck.rewardLabel}</Text>
            <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
            {deckTheme ? (
              <View style={[styles.categoryPill, { backgroundColor: deckTheme.accentSoft, borderColor: deckTheme.accent }]}>
                <Ionicons name={deckTheme.icon} size={12} color={deckTheme.accent} />
                <Text style={[styles.categoryPillText, { color: deckTheme.accent }]}>{deckTheme.label}</Text>
              </View>
            ) : null}
          </View>
          <Pressable
            style={[styles.iconButton, activeIndex >= deck.slides.length - 1 && styles.iconButtonDisabled]}
            onPress={() => goToIndex(activeIndex + 1)}
            disabled={activeIndex >= deck.slides.length - 1}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{deck.kicker}</Text>
          <Text style={styles.progressLabel}>
            {String(activeIndex + 1).padStart(2, '0')} / {String(deck.slides.length).padStart(2, '0')}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${((activeIndex + 1) / deck.slides.length) * 100}%`,
                backgroundColor: deckTheme?.accent ?? colors.accent,
              },
            ]}
          />
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          snapToInterval={PAGE_WIDTH}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          contentContainerStyle={styles.carouselContent}
        >
          {deck.slides.map((slide, index) => (
            <View key={slide.id} style={styles.page}>
              <DeckSlide
                slide={slide}
                watermark={unlock?.watermark.label || deck.watermark}
                index={index}
                accent={deckTheme?.accent ?? colors.accent}
                accentSoft={deckTheme?.accentSoft ?? 'rgba(214,138,56,0.16)'}
              />
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dotRow}>
            {deck.slides.map((slide, index) => (
              <Pressable
                key={slide.id}
                style={[styles.dot, index === activeIndex && styles.dotActive]}
                onPress={() => goToIndex(index)}
              />
            ))}
          </View>
          <Text style={styles.footerHint}>
            Swipe through the field guide. Longer slides can be scrolled vertically without leaving the card.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function DeckSlide({
  slide,
  watermark,
  index,
  accent,
  accentSoft,
}: {
  slide: UnlockDeckSlide;
  watermark: string;
  index: number;
  accent: string;
  accentSoft: string;
}) {
  return (
    <View style={styles.slideFrame}>
      <LinearGradient
        colors={slide.kind === 'field_notes' ? ['#130D09', '#24160F'] : ['#110B08', '#26170F']}
        style={[styles.slideCard, { borderColor: accentSoft }]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
      >
        <ScrollView
          style={styles.slideScrollView}
          contentContainerStyle={styles.slideScrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          bounces={false}
        >
          {slide.kind === 'cover' ? (
            <CoverSlide slide={slide} watermark={watermark} accent={accent} accentSoft={accentSoft} />
          ) : slide.kind === 'spec' ? (
            <SpecSlide slide={slide} watermark={watermark} accent={accent} accentSoft={accentSoft} />
          ) : slide.kind === 'comparison' ? (
            <ComparisonSlide slide={slide} watermark={watermark} accent={accent} accentSoft={accentSoft} />
          ) : (
            <FieldNotesSlide slide={slide} watermark={watermark} accent={accent} />
          )}
        </ScrollView>
        <Text style={styles.slideCountMark}>SLIDE {String(index + 1).padStart(2, '0')}</Text>
      </LinearGradient>
    </View>
  );
}

function CoverSlide({
  slide,
  watermark,
  accent,
  accentSoft,
}: {
  slide: UnlockDeckSlide;
  watermark: string;
  accent: string;
  accentSoft: string;
}) {
  return (
    <>
      <View style={styles.coverTopRow}>
        <View style={[styles.rewardPill, { borderColor: accentSoft, backgroundColor: accentSoft }]}>
          <Text style={[styles.rewardPillText, { color: accent }]}>{slide.eyebrow}</Text>
        </View>
        <Text style={styles.watermarkTiny}>{watermark}</Text>
      </View>
      <View style={[styles.coverBottleGlow, { backgroundColor: accentSoft, borderColor: accentSoft, shadowColor: accent }]} />
      <View style={styles.coverCopyWrap}>
        <Text style={styles.coverTitle}>{slide.title}</Text>
        {slide.subtitle ? <Text style={styles.coverSubtitle}>{slide.subtitle}</Text> : null}
      </View>
      <View style={styles.coverFooter}>
        <Text style={styles.coverFooterText}>{slide.footer}</Text>
        <View style={styles.pageDotsMini}>
          <View style={styles.pageDotMiniActive} />
          <View style={styles.pageDotMini} />
          <View style={styles.pageDotMini} />
        </View>
      </View>
    </>
  );
}

function SpecSlide({
  slide,
  watermark,
  accent,
  accentSoft,
}: {
  slide: UnlockDeckSlide;
  watermark: string;
  accent: string;
  accentSoft: string;
}) {
  return (
    <>
      <View style={styles.specHeader}>
        <Text style={[styles.slideEyebrow, { color: accent }]}>{slide.eyebrow}</Text>
        <Text style={styles.specTitle}>{slide.title}</Text>
        <View style={styles.specRatioRow}>
          <Text style={[styles.specRatio, { color: accent }]}>{slide.ratio}</Text>
          <Text style={styles.specRatioSub}>{slide.subtitle}</Text>
        </View>
      </View>
      <View style={styles.specSections}>
        {slide.sections?.map((section) => (
          <View key={section.label} style={[styles.specPanel, { borderColor: accentSoft }]}>
            <Text style={[styles.specPanelLabel, { color: accent }]}>{section.label}</Text>
            {section.value ? <Text style={styles.specPanelText}>{section.value}</Text> : null}
            {section.bullets?.map((bullet) => (
              <View key={bullet} style={styles.bulletRow}>
                <View style={[styles.bulletDot, { backgroundColor: accent }]} />
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      <View style={styles.specFooter}>
        <Text style={styles.specFooterText}>{slide.footer}</Text>
        <Text style={styles.watermarkFooter}>{watermark}</Text>
      </View>
    </>
  );
}

function ComparisonSlide({
  slide,
  watermark,
  accent,
  accentSoft,
}: {
  slide: UnlockDeckSlide;
  watermark: string;
  accent: string;
  accentSoft: string;
}) {
  return (
    <>
      <Text style={[styles.slideEyebrow, { color: accent }]}>{slide.eyebrow}</Text>
      <Text style={styles.comparisonTitle}>{slide.title}</Text>
      <View style={styles.comparisonColumns}>
        {slide.columns?.map((column) => (
          <View key={column.title} style={[styles.comparisonCard, { borderColor: accentSoft }]}>
            <Text style={styles.comparisonCardTitle}>{column.title}</Text>
            {column.subtitle ? <Text style={[styles.comparisonCardSub, { color: accent }]}>{column.subtitle}</Text> : null}
            {column.bullets.map((bullet) => (
              <View key={bullet} style={styles.comparisonBulletRow}>
                <Text style={[styles.comparisonBulletMark, { color: accent }]}>•</Text>
                <Text style={styles.comparisonBulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      <View style={[styles.comparisonFooterCard, { backgroundColor: accentSoft, borderColor: accentSoft }]}>
        <Text style={styles.comparisonFooterText}>{slide.footer}</Text>
      </View>
      <Text style={styles.watermarkBottom}>{watermark}</Text>
    </>
  );
}

function FieldNotesSlide({
  slide,
  watermark,
  accent,
}: {
  slide: UnlockDeckSlide;
  watermark: string;
  accent: string;
}) {
  return (
    <View style={styles.notesOuter}>
      <View style={[styles.notesSheet, { borderLeftColor: accent }]}>
        <Text style={[styles.notesEyebrow, { color: accent }]}>{slide.eyebrow}</Text>
        <Text style={styles.notesTitle}>{slide.title}</Text>
        <View style={[styles.notesDivider, { backgroundColor: accent }]} />
        <Text style={styles.notesSectionLabel}>Common Pitfalls</Text>
        {slide.notes?.map((note, index) => (
          <View key={note} style={styles.noteRow}>
            <Text style={[styles.noteIndex, { color: accent }]}>{String(index + 1).padStart(2, '0')}</Text>
            <Text style={styles.noteText}>{note}</Text>
          </View>
        ))}
        <View style={styles.whyCard}>
          <Text style={styles.notesSectionLabel}>Why It Matters</Text>
          <Text style={styles.whyBody}>{slide.body}</Text>
        </View>
      </View>
      <Text style={styles.fieldNoteFooter}>{slide.footer}</Text>
      <Text style={styles.watermarkBottom}>{watermark}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090605' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    paddingHorizontal: spacing(2),
    paddingTop: Platform.OS === 'android' ? spacing(1.5) : spacing(1),
    paddingBottom: spacing(1),
  },
  headerCopy: { flex: 1 },
  headerEyebrow: {
    color: colors.accent,
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(242,229,213,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: { opacity: 0.4 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing(2.25),
    marginTop: spacing(0.5),
  },
  progressLabel: {
    color: colors.subtext,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: spacing(2.25),
    marginTop: spacing(1),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  carouselContent: {
    paddingVertical: spacing(2),
  },
  page: {
    width: PAGE_WIDTH,
    paddingHorizontal: HORIZONTAL_PADDING,
    justifyContent: 'center',
  },
  slideFrame: {
    width: INNER_CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.32,
    shadowRadius: 28,
    elevation: 16,
  },
  slideCard: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.14)',
  },
  slideScrollView: {
    flex: 1,
  },
  slideScrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 48,
  },
  slideCountMark: {
    position: 'absolute',
    bottom: 16,
    right: 18,
    color: 'rgba(242,229,213,0.28)',
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  coverTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.24)',
    backgroundColor: 'rgba(214,138,56,0.08)',
  },
  rewardPillText: {
    color: colors.accent,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  watermarkTiny: {
    color: 'rgba(242,229,213,0.38)',
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  coverBottleGlow: {
    position: 'absolute',
    right: -36,
    top: 86,
    width: 210,
    height: 300,
    borderTopLeftRadius: 110,
    borderTopRightRadius: 110,
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
    backgroundColor: 'rgba(214,138,56,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.12)',
    shadowColor: colors.accent,
    shadowOffset: { width: -8, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  coverCopyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 84,
  },
  coverTitle: {
    color: '#F3E8D8',
    fontSize: 42,
    lineHeight: 50,
    fontFamily: serif,
    fontWeight: '700',
  },
  coverSubtitle: {
    color: colors.subtext,
    fontSize: 16,
    lineHeight: 25,
    marginTop: spacing(3),
    maxWidth: 250,
  },
  coverFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  coverFooterText: {
    color: 'rgba(242,229,213,0.42)',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  pageDotsMini: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  pageDotMini: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  pageDotMiniActive: {
    width: 16,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  slideEyebrow: {
    color: 'rgba(214,138,56,0.86)',
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  specHeader: {
    gap: 8,
    marginBottom: spacing(2.5),
  },
  specTitle: {
    color: '#F4EADF',
    fontSize: 34,
    lineHeight: 40,
    fontFamily: serif,
    fontWeight: '700',
  },
  specRatioRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 2,
  },
  specRatio: {
    color: '#E2B25C',
    fontSize: 44,
    lineHeight: 46,
    fontWeight: '800',
  },
  specRatioSub: {
    color: colors.subtext,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  specSections: {
    gap: spacing(1.5),
  },
  specPanel: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 16,
  },
  specPanelLabel: {
    color: colors.accent,
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  specPanelText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    marginTop: 8,
    backgroundColor: colors.accent,
  },
  bulletText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
  },
  specFooter: {
    marginTop: 'auto',
    paddingTop: spacing(2),
    gap: 10,
  },
  specFooterText: {
    color: colors.subtext,
    fontSize: 13,
    lineHeight: 20,
  },
  watermarkFooter: {
    color: 'rgba(242,229,213,0.34)',
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  comparisonTitle: {
    color: '#F4EADF',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    marginTop: spacing(1),
    marginBottom: spacing(2.5),
  },
  comparisonColumns: {
    flexDirection: 'row',
    gap: spacing(1.25),
  },
  comparisonCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.12)',
    padding: 16,
  },
  comparisonCardTitle: {
    color: '#F1E4D2',
    fontSize: 22,
    fontFamily: serif,
    fontWeight: '700',
  },
  comparisonCardSub: {
    color: colors.accent,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 10,
  },
  comparisonBulletRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 9,
  },
  comparisonBulletMark: {
    color: colors.accent,
    fontSize: 16,
    lineHeight: 19,
  },
  comparisonBulletText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  comparisonFooterCard: {
    marginTop: spacing(2),
    backgroundColor: 'rgba(214,138,56,0.08)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.16)',
    padding: 16,
  },
  comparisonFooterText: {
    color: '#F1E4D2',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  watermarkBottom: {
    marginTop: 'auto',
    color: 'rgba(242,229,213,0.28)',
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  notesOuter: {
    flex: 1,
  },
  notesSheet: {
    marginTop: spacing(2),
    backgroundColor: '#EFE2CE',
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    padding: 20,
  },
  notesEyebrow: {
    color: '#A96D2E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  notesTitle: {
    marginTop: 8,
    color: '#22160F',
    fontSize: 34,
    lineHeight: 38,
    fontFamily: serif,
    fontWeight: '700',
  },
  notesDivider: {
    width: 48,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.accent,
    marginTop: 14,
    marginBottom: 18,
  },
  notesSectionLabel: {
    color: '#8B5A22',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  noteRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  noteIndex: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    width: 22,
  },
  noteText: {
    flex: 1,
    color: '#322116',
    fontSize: 15,
    lineHeight: 23,
  },
  whyCard: {
    marginTop: spacing(1),
    paddingTop: spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: 'rgba(34,22,15,0.08)',
  },
  whyBody: {
    color: '#4B3323',
    fontSize: 15,
    lineHeight: 24,
  },
  fieldNoteFooter: {
    color: colors.subtext,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing(1.5),
  },
  footer: {
    paddingHorizontal: spacing(2.25),
    paddingBottom: spacing(2.25),
    gap: spacing(1),
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dotActive: {
    width: 28,
    backgroundColor: colors.accent,
  },
  footerHint: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: spacing(2),
  },
  glowOrbOne: {
    position: 'absolute',
    top: 140,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(214,138,56,0.08)',
  },
  glowOrbTwo: {
    position: 'absolute',
    bottom: 180,
    right: -70,
    width: 190,
    height: 190,
    borderRadius: 999,
    backgroundColor: 'rgba(122,72,34,0.18)',
  },
  missingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === 'android' ? spacing(5) : spacing(2),
    paddingHorizontal: spacing(2),
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  backText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  missingCard: {
    marginTop: spacing(4),
    borderRadius: radii.xl,
    padding: spacing(2.5),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  missingEyebrow: {
    color: colors.accent,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '800',
    marginBottom: spacing(1),
  },
  missingTitle: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: serif,
    fontWeight: '700',
  },
  missingBody: {
    color: colors.subtext,
    fontSize: 15,
    lineHeight: 24,
    marginTop: spacing(1.5),
  },
  lockedPrimaryButton: {
    marginTop: spacing(2),
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
  },
  lockedPrimaryButtonText: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
