import React from 'react';
import {
  Alert,
  ImageBackground,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, serif, spacing } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { getCollectibleRecipeCard } from '../data/recipeCards';
import type { CollectibleRecipeCard } from '../types/recipeCards';
import { useSavedItems } from '../hooks/useSavedItems';
import { IngredientLeaderList } from '../components/recipe/IngredientLeaderRow';
import TasteProfileCard from '../components/recipe/TasteProfileCard';

type RecipeCardRoute = RouteProp<RootStackParamList, 'RecipeCardDetail'>;

function trimSentence(value: string, maxLength: number): string {
  const normalized = String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;

  const sentenceBreak = normalized.slice(0, maxLength).match(/^(.*?[.!?])\s/);
  if (sentenceBreak?.[1]) return sentenceBreak[1];

  const truncated = normalized.slice(0, maxLength).trimEnd();
  const lastSpace = truncated.lastIndexOf(' ');
  return `${(lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trimEnd()}...`;
}

function buildProTips(card: CollectibleRecipeCard): string[] {
  const tips: string[] = [];

  if (card.prepBlock?.lines?.length) {
    tips.push(...card.prepBlock.lines);
  }

  if (card.technicalModules?.length) {
    tips.push(...card.technicalModules.map((module) => module.body));
  }

  if (card.buildLogic) {
    tips.push(card.buildLogic);
  }

  if (card.serviceNote) {
    tips.push(card.serviceNote);
  }

  return tips.filter(Boolean).slice(0, 4);
}

function pickCardVariant(cardId: string, variants: string[]): string {
  if (!variants.length) return '';
  const seed = String(cardId || '')
    .split('')
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return variants[seed % variants.length];
}

function deriveCardBestFor(card: CollectibleRecipeCard): string {
  const infoText = [
    card.id,
    card.title,
    card.subtitle,
    card.categoryLabel,
    card.unlockLabel,
    card.buildLogic,
    card.serviceNote,
    ...(card.spec || []).map((line) => `${line.name} ${line.amount}`),
    ...(card.method || []),
    ...(card.prepBlock?.lines || []),
    ...(card.technicalModules || []).map((module) => `${module.title} ${module.body}`),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const isAperitif =
    infoText.includes('negroni') ||
    infoText.includes('campari') ||
    infoText.includes('amaro') ||
    infoText.includes('aperitif') ||
    infoText.includes('bitter');
  const isSpiritForward =
    infoText.includes('martini') ||
    infoText.includes('manhattan') ||
    infoText.includes('stirred') ||
    infoText.includes('old fashioned');
  const isCitrusLed =
    infoText.includes('sour') ||
    infoText.includes('citrus') ||
    infoText.includes('lime') ||
    infoText.includes('lemon') ||
    infoText.includes('grapefruit');
  const isTropical =
    infoText.includes('tiki') ||
    infoText.includes('pineapple') ||
    infoText.includes('coconut') ||
    infoText.includes('orgeat');
  const isDessert =
    infoText.includes('coffee') ||
    infoText.includes('espresso') ||
    infoText.includes('cream') ||
    infoText.includes('dessert') ||
    infoText.includes('chocolate');
  const isSparkling =
    infoText.includes('spritz') ||
    infoText.includes('sparkling') ||
    infoText.includes('soda') ||
    infoText.includes('tonic') ||
    infoText.includes('highball');
  const isZeroProof =
    infoText.includes('zero-proof') ||
    infoText.includes('zero proof') ||
    infoText.includes('non-alcoholic') ||
    infoText.includes('mocktail');

  if (isZeroProof) {
    return pickCardVariant(card.id, [
      'Best for guests who want a zero-proof drink that still feels structured and intentional.',
      'Best for low/no-alcohol sessions where flavor depth still matters.',
      'Best for alcohol-free sipping with crisp balance and real cocktail character.',
    ]);
  }
  if (isAperitif && isSparkling) {
    return pickCardVariant(card.id, [
      'Best for pre-dinner sipping when you want bitter structure with lighter bubbly texture.',
      'Best for aperitif service where brightness and bitterness matter more than sweetness.',
      'Best for guests who like bitter-citrus profiles in a longer sparkling format.',
    ]);
  }
  if (isAperitif) {
    return pickCardVariant(card.id, [
      'Best for drinkers who prefer bittersweet structure and a dry finish.',
      'Best for guests who want layered botanical depth over fruit sweetness.',
      'Best for aperitif drinkers who enjoy firm bitterness and clean balance.',
    ]);
  }
  if (isSpiritForward) {
    return pickCardVariant(card.id, [
      'Best for spirit-forward drinkers who prefer clean structure and restrained sweetness.',
      'Best for slow sipping when you want depth, clarity, and a polished finish.',
      'Best for guests who like composed, stirred-style profiles over lighter builds.',
    ]);
  }
  if (isDessert) {
    return pickCardVariant(card.id, [
      'Best for after-dinner drinkers who want richer flavor and round texture.',
      'Best for dessert-cocktail fans who like plush texture with balance.',
      'Best for guests who prefer creamy or coffee-led depth in a late-night serve.',
    ]);
  }
  if (isTropical) {
    return pickCardVariant(card.id, [
      'Best for drinkers who want tropical intensity with balanced sweetness.',
      'Best for guests who like fruit-forward flavor with structure, not syrup.',
      'Best for richer island-style profiles that still finish clean.',
    ]);
  }
  if (isCitrusLed && isSparkling) {
    return pickCardVariant(card.id, [
      'Best for drinkers who want crisp citrus refreshment in a longer, lighter format.',
      'Best for warm-weather service when you want acidity, lift, and easy sipping.',
      'Best for guests who like bright citrus with sparkling length.',
    ]);
  }
  if (isCitrusLed) {
    return pickCardVariant(card.id, [
      'Best for drinkers who like bright citrus snap with a clean finish.',
      'Best for guests who want fresh acidity with clean, snappy balance.',
      'Best for citrus-forward palates that prefer tension over sweetness.',
    ]);
  }
  if (isSparkling) {
    return pickCardVariant(card.id, [
      'Best for easy social sipping when you want high refreshment and low heaviness.',
      'Best for longer service windows where carbonation and chill drive the experience.',
      'Best for guests who want a lighter, session-friendly cocktail feel.',
    ]);
  }

  return 'Best for drinkers who want a balanced, polished spec with clear flavor direction.';
}

function deriveCardTastingNote(card: CollectibleRecipeCard): string {
  const infoText = [
    card.title,
    card.subtitle,
    card.unlockLabel,
    ...(card.spec || []).map((line) => `${line.name} ${line.amount}`),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    infoText.includes('martini') ||
    infoText.includes('manhattan') ||
    infoText.includes('stirred')
  ) {
    return 'Spirit character lands first, the middle stays composed, and the finish remains dry and polished.';
  }
  if (
    infoText.includes('sour') ||
    infoText.includes('citrus') ||
    infoText.includes('lime') ||
    infoText.includes('lemon')
  ) {
    return 'Bright citrus opens first, sweetness rounds the middle, and the finish stays crisp and refreshing.';
  }
  if (infoText.includes('tiki') || infoText.includes('pineapple') || infoText.includes('coconut')) {
    return 'Tropical fruit opens up front, depth builds through the middle, and the finish stays bright instead of heavy.';
  }

  return `${card.title} opens balanced, stays composed through the middle, and finishes clean.`;
}

function getTierLabel(card: CollectibleRecipeCard): string {
  const tier = String(card.tierLabel || '').toUpperCase();
  if (tier === 'PRO' || tier === 'PLUS') return tier;
  return 'FREE';
}

export default function RecipeCardDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RecipeCardRoute>();
  const card = getCollectibleRecipeCard(route.params.cardId);
  const { toggleSavedRecipeCard, isRecipeCardSaved } = useSavedItems();

  if (!card) {
    return (
      <View style={styles.screen}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Recipe card not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.emptyAction}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isSaved = isRecipeCardSaved(card.id);
  const tierLabel = getTierLabel(card);
  const isFreeTier = tierLabel === 'FREE';
  const displayedMethod = isFreeTier
    ? card.method
        .slice(0, 2)
        .map((step) => trimSentence(step, 96))
        .filter(Boolean)
    : card.method;
  const rawTastingNote = (card.tastingNote || deriveCardTastingNote(card)).trim();
  const displayedTastingNote = rawTastingNote
    ? isFreeTier
      ? trimSentence(rawTastingNote, 120)
      : rawTastingNote
    : '';
  const rawBestFor = (card.bestFor || deriveCardBestFor(card)).trim();
  const displayedBestFor = rawBestFor
    ? isFreeTier
      ? trimSentence(rawBestFor, 120)
      : rawBestFor
    : '';
  const proTips = isFreeTier ? [] : buildProTips(card);
  const heroBadge = 'Recipe';
  const heroKicker = (card.subtitle || card.categoryLabel || 'Curated Recipe').toUpperCase();
  const tierPillText =
    tierLabel === 'FREE'
      ? `You have 0/${card.spec.length} ingredients`
      : `Unlocked in ${tierLabel}`;

  const handleSave = () => {
    toggleSavedRecipeCard({
      id: card.id,
      name: card.title,
      subtitle: card.subtitle,
      image: card.heroImage,
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: card.title,
        message: `${card.title}\n${card.unlockLabel}`,
      });
    } catch {
      Alert.alert('Error', 'Unable to share right now.');
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroContainer}>
          <ImageBackground
            source={{ uri: card.heroImage }}
            style={styles.heroImage}
            imageStyle={styles.heroImageInner}
          >
            <LinearGradient
              colors={['rgba(6,5,5,0.1)', 'rgba(16,12,10,0.3)', 'rgba(22,16,13,0.72)', colors.bg]}
              style={styles.heroGradient}
            >
              <View style={styles.topRow}>
                <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <View style={styles.topActions}>
                  <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                    <Ionicons name="share-outline" size={22} color={colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton} onPress={handleSave}>
                    <Ionicons
                      name={isSaved ? 'bookmark' : 'bookmark-outline'}
                      size={22}
                      color={colors.white}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.heroContent}>
                <View style={styles.heroLabelRow}>
                  <View style={styles.heroTypePill}>
                    <Ionicons name="ribbon-outline" size={12} color={colors.accent} />
                    <Text style={styles.heroTypePillText}>{heroBadge}</Text>
                  </View>
                  <Text style={styles.heroWatermark}>KOOPE</Text>
                </View>

                <Text style={styles.heroKicker}>{heroKicker}</Text>
                <Text style={styles.heroTitle}>{card.title}</Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color={colors.subtext} />
                    <Text style={styles.metaText}>{card.meta.time}</Text>
                  </View>
                  <Text style={styles.metaDot}>•</Text>
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="chart-bar" size={16} color={colors.subtext} />
                    <Text style={styles.metaText}>{card.meta.difficulty}</Text>
                  </View>
                  <Text style={styles.metaDot}>•</Text>
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons
                      name="glass-cocktail"
                      size={16}
                      color={colors.subtext}
                    />
                    <Text style={styles.metaText}>{card.meta.glassware}</Text>
                  </View>
                </View>

                <View style={styles.tierPill}>
                  <MaterialCommunityIcons
                    name={
                      tierLabel === 'FREE'
                        ? 'checkbox-marked-circle-outline'
                        : 'star-circle-outline'
                    }
                    size={16}
                    color={colors.accent}
                  />
                  <Text style={styles.tierPillText}>{tierPillText}</Text>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        <View style={styles.contentShell}>
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
              <Text style={styles.primaryButtonText}>
                {isSaved ? 'Saved to Recipe Cards' : 'Save Recipe Card'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
              <Text style={styles.secondaryButtonText}>How did you make it?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recipeShell}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionEyebrow}>Ingredients</Text>
              <View style={styles.sectionRule} />
            </View>

            <IngredientLeaderList
              containerStyle={styles.specTable}
              items={card.spec}
              iconSize={16}
              iconColor={colors.subtext}
              rowStyle={styles.specRow}
              lastRowStyle={styles.specRowLast}
              iconStyle={styles.specLeaderIcon}
              nameStyle={styles.specName}
              dotsStyle={styles.specLeaderDots}
              amountStyle={styles.specAmount}
            />

            <View style={styles.copySection}>
              <Text style={styles.copyTitle}>Method</Text>
              <View style={styles.methodList}>
                {displayedMethod.map((step, index) => (
                  <View key={`${step}_${index}`} style={styles.methodRow}>
                    <Text style={styles.methodIndex}>{String(index + 1).padStart(2, '0')}</Text>
                    <Text style={styles.methodText}>{step}</Text>
                  </View>
                ))}
              </View>
            </View>

            <TasteProfileCard
              ingredients={card.spec}
              headerVariant="title"
              containerStyle={styles.copySection}
              titleStyle={styles.copyTitle}
              groupStyle={styles.tasteAxisGroup}
              rowStyle={styles.tasteAxisRow}
              iconWrapStyle={styles.tasteAxisIconWrap}
              labelStyle={styles.tasteAxisLabel}
              trackWrapStyle={styles.tasteAxisTrackWrap}
              trackStyle={styles.tasteAxisTrack}
              trackFillStyle={styles.tasteAxisTrackFill}
              dotStyle={styles.tasteAxisDot}
              scaleRowStyle={styles.tasteAxisScaleRow}
              scaleTextStyle={styles.tasteAxisScaleText}
            />

            {displayedTastingNote || displayedBestFor ? (
              <View style={[styles.copySection, styles.copySectionLast]}>
                <Text style={styles.copyTitle}>Taste & Fit</Text>
                {displayedTastingNote ? (
                  <>
                    <Text style={styles.tastingSubhead}>Tasting Note</Text>
                    <Text style={styles.tastingNoteText}>{displayedTastingNote}</Text>
                  </>
                ) : null}
                {displayedBestFor ? (
                  <>
                    <Text style={styles.tastingSubhead}>Best For</Text>
                    <Text style={styles.tastingNoteText}>{displayedBestFor}</Text>
                  </>
                ) : null}
              </View>
            ) : null}
          </View>

          {showBlockTitle(proTips) ? (
            <View style={styles.notesSection}>
              <Text style={styles.sectionEyebrow}>Notes</Text>
              <View style={styles.notesCard}>
                <View style={styles.notesTitleRow}>
                  <MaterialCommunityIcons name="lightbulb-on" size={20} color={colors.accent} />
                  <Text style={styles.notesTitle}>Pro Tips</Text>
                </View>
                {proTips.map((tip, index) => (
                  <Text key={`${tip}_${index}`} style={styles.notesCopy}>
                    • {tip}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.notesSection}>
            <Text style={styles.sectionEyebrow}>Unlock</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesTitle}>
                {card.whyUnlockedTitle || 'Why You Unlocked This'}
              </Text>
              <Text style={styles.notesCopy}>{card.unlockLabel}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function showBlockTitle(proTips: string[]) {
  return proTips.length > 0;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  heroContainer: {
    width: '100%',
    height: 480,
    overflow: 'hidden',
    backgroundColor: '#120D0A',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImageInner: {
    resizeMode: 'cover',
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingTop: 60,
    paddingBottom: spacing(4),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topActions: {
    flexDirection: 'row',
    gap: spacing(1),
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 8, 10, 0.4)',
  },
  heroContent: {
    justifyContent: 'flex-end',
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(1.5),
  },
  heroTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    alignSelf: 'flex-start',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.2)',
    backgroundColor: 'rgba(20,15,12,0.76)',
  },
  heroTypePillText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroWatermark: {
    color: colors.text,
    fontSize: 10,
    opacity: 0.78,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroKicker: {
    color: 'rgba(246, 235, 221, 0.82)',
    fontSize: 13,
    letterSpacing: 1.2,
    marginBottom: spacing(0.75),
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#F2E6D8',
    fontFamily: serif,
    fontSize: 42,
    lineHeight: 46,
    marginBottom: spacing(1.5),
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing(1),
    marginBottom: spacing(1.5),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#E0D2C1',
    fontSize: 14,
    fontWeight: '500',
  },
  metaDot: {
    color: '#C2B09C',
    fontSize: 13,
  },
  tierPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    minHeight: 44,
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1),
    borderRadius: 18,
    backgroundColor: 'rgba(116, 71, 27, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.12)',
  },
  tierPillText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  contentShell: {
    marginTop: -2,
    paddingTop: 4,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#17100D',
  },
  actionButtonsContainer: {
    paddingHorizontal: spacing(2),
    gap: spacing(0.75),
  },
  primaryButton: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#D89A46',
  },
  primaryButtonText: {
    color: '#19110C',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(31, 21, 16, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(177,123,64,0.28)',
  },
  secondaryButtonText: {
    color: '#EADCCB',
    fontSize: 14,
    fontWeight: '600',
  },
  recipeShell: {
    marginTop: spacing(1),
    marginHorizontal: spacing(1.75),
    paddingHorizontal: spacing(1.75),
    paddingTop: spacing(1),
    paddingBottom: spacing(2),
    borderRadius: 22,
    backgroundColor: '#1A1310',
    borderWidth: 1,
    borderColor: 'rgba(214,165,102,0.035)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    marginBottom: spacing(1),
  },
  sectionEyebrow: {
    color: '#AF8150',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing(0.75),
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(214,165,102,0.08)',
  },
  specTable: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#261A15',
    borderWidth: 1,
    borderColor: 'rgba(214,165,102,0.08)',
  },
  // Ingredient row: category icon, name, dotted leader line, then the
  // amount — the shared IngredientLeaderRow layout. No `gap`/`justifyContent`
  // here: the leader dots are the element that fills the row, so the pieces
  // must butt up against their own margins instead.
  specRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(1.75),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214,165,102,0.06)',
  },
  specRowLast: {
    borderBottomWidth: 0,
  },
  specLeaderIcon: {
    marginRight: spacing(1),
  },
  specName: {
    flexShrink: 1,
    color: '#EADDCF',
    fontSize: 18,
    lineHeight: 22,
  },
  // flex:1 lets the dot run grow into the leftover space; the row component
  // clips it to one line, producing the table-of-contents leader.
  specLeaderDots: {
    flex: 1,
    flexShrink: 1,
    marginHorizontal: spacing(1),
    color: 'rgba(214,165,102,0.18)',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 1.5,
  },
  specAmount: {
    flexShrink: 0,
    color: '#F0E4D6',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    marginLeft: spacing(1),
  },
  // Taste Profile card — five icon + horizontal-track rows estimated from the
  // spec's ingredients (see utils/tasteProfileAxes.ts), sharing one
  // LOW/BALANCED/HIGH caption.
  tasteAxisGroup: {
    gap: spacing(1.75),
  },
  tasteAxisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.25),
  },
  tasteAxisIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214,165,102,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(214,165,102,0.3)',
  },
  tasteAxisLabel: {
    width: 92,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    color: '#EADDCF',
  },
  tasteAxisTrackWrap: {
    flex: 1,
    height: 16,
    justifyContent: 'center',
  },
  tasteAxisTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(214,165,102,0.14)',
    overflow: 'hidden',
  },
  tasteAxisTrackFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: 'rgba(214,165,102,0.4)',
  },
  tasteAxisDot: {
    position: 'absolute',
    top: '50%',
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: -6,
    marginLeft: -6,
    backgroundColor: '#D59C58',
    borderWidth: 2,
    borderColor: '#1A120D',
  },
  // Left offset mirrors the icon (26) + gap (10) + label (92) + gap (10) that
  // precede the track, so the caption lines up under the tracks.
  tasteAxisScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing(0.5),
    paddingLeft: 26 + spacing(1.25) + 92 + spacing(1.25),
  },
  tasteAxisScaleText: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.8,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: 'rgba(214,165,102,0.45)',
  },
  copySection: {
    paddingTop: spacing(1.75),
  },
  copySectionLast: {
    paddingBottom: 0,
  },
  copyTitle: {
    color: '#EEDFCF',
    fontFamily: serif,
    fontSize: 22,
    lineHeight: 26,
    marginBottom: spacing(1),
  },
  methodList: {
    gap: spacing(1.25),
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(1.5),
  },
  methodIndex: {
    width: 36,
    color: '#C98E4B',
    fontFamily: serif,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  methodText: {
    flex: 1,
    color: '#DDD0C1',
    fontSize: 16,
    lineHeight: 22,
  },
  tastingNoteText: {
    color: '#DDD0C1',
    fontSize: 16,
    lineHeight: 22,
  },
  tastingSubhead: {
    marginTop: spacing(1),
    marginBottom: spacing(0.4),
    color: '#C98E4B',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  notesSection: {
    paddingHorizontal: spacing(2.25),
    marginTop: spacing(2.25),
  },
  notesCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.12)',
    backgroundColor: 'rgba(38,28,22,0.84)',
    padding: spacing(2.5),
  },
  notesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginBottom: spacing(1.5),
  },
  notesTitle: {
    color: '#F7EDDF',
    fontFamily: serif,
    fontSize: 18,
    lineHeight: 22,
  },
  notesCopy: {
    color: '#DCCDBB',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing(0.75),
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(3),
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 22,
    fontFamily: serif,
    marginBottom: spacing(1),
  },
  emptyAction: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
});
