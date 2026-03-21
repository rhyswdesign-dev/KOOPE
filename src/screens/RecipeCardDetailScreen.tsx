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

type RecipeCardRoute = RouteProp<RootStackParamList, 'RecipeCardDetail'>;

function trimSentence(value: string, maxLength: number): string {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ');
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
    ? card.method.slice(0, 2).map((step) => trimSentence(step, 96)).filter(Boolean)
    : card.method;
  const displayedTastingNote = card.tastingNote
    ? isFreeTier
      ? trimSentence(card.tastingNote, 120)
      : card.tastingNote
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
          <ImageBackground source={{ uri: card.heroImage }} style={styles.heroImage} imageStyle={styles.heroImageInner}>
            <LinearGradient
              colors={['rgba(6,5,5,0.1)', 'rgba(16,12,10,0.3)', 'rgba(22,16,13,0.72)', '#1A120D']}
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
                    <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={22} color={colors.white} />
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
                    <MaterialCommunityIcons name="glass-cocktail" size={16} color={colors.subtext} />
                    <Text style={styles.metaText}>{card.meta.glassware}</Text>
                  </View>
                </View>

                <View style={styles.tierPill}>
                  <MaterialCommunityIcons
                    name={tierLabel === 'FREE' ? 'checkbox-marked-circle-outline' : 'star-circle-outline'}
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
              <Text style={styles.primaryButtonText}>{isSaved ? 'Saved to Recipe Cards' : 'Save Recipe Card'}</Text>
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

            <View style={styles.specTable}>
              {card.spec.map((line, index) => (
                <View key={`${line.name}_${index}`} style={[styles.specRow, index === card.spec.length - 1 && styles.specRowLast]}>
                  <Text style={styles.specName}>{line.name}</Text>
                  <Text style={styles.specAmount}>{line.amount}</Text>
                </View>
              ))}
            </View>

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

            {displayedTastingNote ? (
              <View style={[styles.copySection, styles.copySectionLast]}>
                <Text style={styles.copyTitle}>Tasting Note</Text>
                <Text style={styles.tastingNoteText}>{displayedTastingNote}</Text>
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
                  <Text key={`${tip}_${index}`} style={styles.notesCopy}>• {tip}</Text>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.notesSection}>
            <Text style={styles.sectionEyebrow}>Unlock</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesTitle}>{card.whyUnlockedTitle || 'Why You Unlocked This'}</Text>
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
    backgroundColor: '#1A120D',
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
  specRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(2),
    paddingHorizontal: spacing(1.75),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214,165,102,0.06)',
  },
  specRowLast: {
    borderBottomWidth: 0,
  },
  specName: {
    flex: 1,
    color: '#EADDCF',
    fontSize: 18,
    lineHeight: 22,
  },
  specAmount: {
    color: '#F0E4D6',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    marginLeft: spacing(1),
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
