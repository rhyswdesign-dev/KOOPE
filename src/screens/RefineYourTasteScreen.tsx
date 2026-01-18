/**
 * REFINE YOUR TASTE SCREEN
 * Allows users to update their taste profile after onboarding
 * Focuses on key personalization questions: spirits, flavors, goals
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { usePersonalization } from '../store/usePersonalization';
import { SurveyAnswers } from '../services/placement';
import { trackEvent } from '../lib/analytics';
import { log } from '../lib/logger';
import { ALL_COCKTAILS } from '../data/cocktails';
import RecipeCard from '../components/RecipeCard';
import { createRecipeCardProps, handleRecipeView } from '../utils/recipeActions';

// Import spirit and flavor images directly
const spiritImages = {
  tequila: require('../../assets/images/spirits/koope-tequila.png'),
  whiskey: require('../../assets/images/spirits/koope-whiskey.png'),
  rum: require('../../assets/images/spirits/koope-rum.png'),
  gin: require('../../assets/images/spirits/koope-gin.png'),
  vodka: require('../../assets/images/spirits/koope-vodka.png'),
  brandy: require('../../assets/images/spirits/koope-brandy.png'),
  liqueurs: require('../../assets/images/spirits/koope-mezcal.png'),
};

const flavorImages = {
  sweet: require('../../assets/images/flavors/Sweet.png'),
  sour: require('../../assets/images/flavors/Sour.png'),
  bitter: require('../../assets/images/flavors/Bitter.png'),
  spicy: require('../../assets/images/flavors/Spicy.png'),
  salty: require('../../assets/images/flavors/Salty.png'),
  herbal: require('../../assets/images/flavors/Herbal.png'),
  fruity: require('../../assets/images/flavors/Fruity.png'),
  boozy: require('../../assets/images/flavors/Boozy.png'),
  umami: require('../../assets/images/flavors/Umami.png'),
  floral: require('../../assets/images/flavors/Floral.png'),
};

type Props = NativeStackScreenProps<RootStackParamList, 'RefineYourTaste'>;

// Option type with optional image keys
type QuestionOption = {
  value: string;
  label: string;
  emoji: string;
  spiritKey?: 'tequila' | 'whiskey' | 'rum' | 'gin' | 'vodka' | 'brandy' | 'liqueurs';
  flavorKey?: 'fruity' | 'herbal' | 'bitter' | 'sweet' | 'boozy' | 'floral' | 'spicy';
};

// Focused survey questions for taste refinement
// NOTE: Store spiritKey instead of resolved image to defer loading
const TASTE_QUESTIONS: Array<{
  id: string;
  section: string;
  type: 'mcq' | 'multi-select';
  question: string;
  subtitle?: string;
  options: QuestionOption[];
}> = [
  {
    id: 'q8',
    section: 'Spirit Preferences',
    type: 'multi-select',
    question: 'Which spirits interest you most?',
    subtitle: 'Select all that apply',
    options: [
      { value: 'tequila', label: 'Tequila', emoji: '🌵', spiritKey: 'tequila' as const },
      { value: 'whiskey', label: 'Whiskey', emoji: '🥃', spiritKey: 'whiskey' as const },
      { value: 'rum', label: 'Rum', emoji: '🏝️', spiritKey: 'rum' as const },
      { value: 'gin', label: 'Gin', emoji: '🌿', spiritKey: 'gin' as const },
      { value: 'vodka', label: 'Vodka', emoji: '❄️', spiritKey: 'vodka' as const },
      { value: 'brandy', label: 'Brandy', emoji: '🍇', spiritKey: 'brandy' as const },
      { value: 'liqueurs', label: 'Liqueurs', emoji: '🍯', spiritKey: 'liqueurs' as const },
    ],
  },
  {
    id: 'q11',
    section: 'Flavor Preferences',
    type: 'multi-select',
    question: 'What flavor profiles do you prefer?',
    subtitle: 'Pick your top 3-4 favorites',
    options: [
      { value: 'citrus', label: 'Citrus & Fresh', emoji: '🍋', flavorKey: 'fruity' as const },
      { value: 'herbal', label: 'Herbal & Green', emoji: '🌿', flavorKey: 'herbal' as const },
      { value: 'bitter', label: 'Bitter & Complex', emoji: '☕', flavorKey: 'bitter' as const },
      { value: 'sweet', label: 'Sweet & Fruity', emoji: '🍓', flavorKey: 'sweet' as const },
      { value: 'smoky', label: 'Smoky & Bold', emoji: '🔥', flavorKey: 'boozy' as const },
      { value: 'floral', label: 'Floral & Light', emoji: '🌸', flavorKey: 'floral' as const },
      { value: 'spiced', label: 'Spiced & Warm', emoji: '🌶️', flavorKey: 'spicy' as const },
    ],
  },
  {
    id: 'q9',
    section: 'Alcohol Preference',
    type: 'mcq',
    question: 'What\'s your preferred alcohol content?',
    subtitle: 'This helps us recommend the right cocktails',
    options: [
      { value: 'alcoholic', label: 'Alcoholic', emoji: '🍸' },
      { value: 'low-abv', label: 'Low-ABV (lighter drinks)', emoji: '🍾' },
      { value: 'zero-proof', label: 'Zero-proof (mocktails)', emoji: '🥤' },
    ],
  },
];

export default function RefineYourTasteScreen({ navigation }: Props) {
  const { profile, updateProfile } = usePersonalization();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewCocktails, setPreviewCocktails] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const currentQuestion = TASTE_QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === TASTE_QUESTIONS.length - 1;
  const progress = ((currentQuestionIndex + 1) / TASTE_QUESTIONS.length) * 100;

  // Scroll to top when question changes
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, [currentQuestionIndex]);

  // Pre-fill answers from existing profile
  useEffect(() => {
    if (profile) {
      const prefilledAnswers: SurveyAnswers = {};

      if (profile.favoriteSpirits?.length) {
        prefilledAnswers['q8'] = profile.favoriteSpirits;
      }
      if (profile.flavorPreferences?.length) {
        prefilledAnswers['q11'] = profile.flavorPreferences;
      }
      if (profile.preferredABV) {
        prefilledAnswers['q9'] = profile.preferredABV;
      }

      setAnswers(prefilledAnswers);
    }
  }, [profile]);

  const handleAnswer = (value: string | string[]) => {
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: value,
    };
    setAnswers(newAnswers);

    // Auto-advance for single-select questions
    if (currentQuestion.type === 'mcq') {
      setTimeout(() => {
        if (isLastQuestion) {
          // Generate preview before completing
          generatePreview(newAnswers);
        } else {
          setCurrentQuestionIndex((prev) => prev + 1);
        }
      }, 400);
    }
  };

  const handleMultiSelectToggle = (value: string) => {
    const currentAnswers = Array.isArray(answers[currentQuestion.id]) ? answers[currentQuestion.id] as string[] : [];
    let newAnswers: string[];

    if (currentAnswers.includes(value)) {
      newAnswers = currentAnswers.filter((v) => v !== value);
    } else {
      newAnswers = [...currentAnswers, value];
    }

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: newAnswers,
    }));
  };

  // Generate preview cocktails based on current answers
  const generatePreview = (currentAnswers: SurveyAnswers) => {
    const spiritPrefs = (currentAnswers['q8'] as string[]) || [];
    const flavorPrefs = (currentAnswers['q11'] as string[]) || [];
    const abvPref = (currentAnswers['q9'] as string) || '';

    log.info('RefineYourTaste', 'Generating preview', { spiritPrefs, flavorPrefs, abvPref, totalCocktails: ALL_COCKTAILS.length });

    // Score cocktails based on available answers
    const scoredCocktails = ALL_COCKTAILS.map(cocktail => {
      let score = 0;

      // Spirit matching (if spirits selected)
      if (spiritPrefs.length > 0) {
        const cocktailSpirit = cocktail.base?.toLowerCase();
        if (cocktailSpirit && spiritPrefs.includes(cocktailSpirit)) {
          const index = spiritPrefs.indexOf(cocktailSpirit);
          score += (90 - index * 10); // 90 for first choice, 80 for second, etc.
        }
      }

      // Flavor matching (if flavors selected)
      if (flavorPrefs.length > 0) {
        flavorPrefs.forEach(flavor => {
          const flavorInDescription = cocktail.description?.toLowerCase().includes(flavor) ||
                                     cocktail.subtitle?.toLowerCase().includes(flavor);
          if (flavorInDescription) {
            score += 15;
          }
        });
      }

      // ABV matching (if selected)
      if (abvPref) {
        const isLowABV = cocktail.description?.toLowerCase().includes('low') ||
                         cocktail.subtitle?.toLowerCase().includes('light');
        const isMocktail = cocktail.description?.toLowerCase().includes('non-alcoholic') ||
                           cocktail.tags?.includes('mocktail');

        if (abvPref === 'zero-proof' && isMocktail) score += 20;
        else if (abvPref === 'low-abv' && isLowABV) score += 20;
        else if (abvPref === 'alcoholic' && !isMocktail && !isLowABV) score += 20;
      }

      return { cocktail, score };
    });

    // Get top 3 cocktails
    const topCocktails = scoredCocktails
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.cocktail);

    log.info('RefineYourTaste', 'Preview generated', {
      cocktailCount: topCocktails.length,
      cocktails: topCocktails.map(c => ({ name: c.name || c.title, score: scoredCocktails.find(s => s.cocktail === c)?.score }))
    });

    if (topCocktails.length > 0) {
      setPreviewCocktails(topCocktails);
      setShowPreview(true);
    } else {
      // If no matches found, just complete without preview
      log.warn('RefineYourTaste', 'No cocktails matched preferences, skipping preview');
      handleComplete(currentAnswers);
    }
    // Preview will stay visible until user clicks "Continue"
  };

  const canProceed = () => {
    const answer = answers[currentQuestion.id];
    if (!answer) return false;

    if (currentQuestion.type === 'multi-select') {
      return Array.isArray(answer) && answer.length > 0;
    }

    return true;
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Generate preview after last question
      generatePreview(answers);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleComplete = async (finalAnswers: SurveyAnswers) => {
    setIsSubmitting(true);

    try {
      // Extract values from survey answers
      const spiritPrefs = (finalAnswers['q8'] as string[]) || [];
      const flavorPrefs = (finalAnswers['q11'] as string[]) || [];
      const abvPref = (finalAnswers['q9'] as string) || 'alcoholic';

      // Build flavor scores (equal weight for now, Phase 2 will enhance this)
      const flavorScores: Record<string, number> = {};
      flavorPrefs.forEach((flavor) => {
        flavorScores[flavor] = 80; // Base preference score
      });

      // Build spirit scores
      const spiritScores: Record<string, number> = {};
      spiritPrefs.forEach((spirit, index) => {
        // Higher score for earlier selections (user's top choices)
        spiritScores[spirit] = 90 - index * 10;
      });

      // Update personalization profile
      log.info('RefineYourTaste', 'Updating profile with new preferences', {
        favoriteSpirits: spiritPrefs,
        flavorPreferences: flavorPrefs,
        preferredABV: abvPref,
      });

      await updateProfile({
        favoriteSpirits: spiritPrefs,
        flavorPreferences: flavorPrefs,
        flavorScores,
        spiritScores,
        preferredABV: abvPref as any,
        preferredDifficulty: ['Easy', 'Medium'], // Default difficulty preferences
        lastSurveyUpdate: Date.now(),
      });

      log.info('RefineYourTaste', 'Profile updated successfully');

      // Track analytics
      trackEvent('taste_profile_updated', {
        spirits_count: spiritPrefs.length,
        flavors_count: flavorPrefs.length,
        abv_preference: abvPref,
      });

      // Navigate back without alert
      navigation.goBack();
    } catch (error) {
      log.error('RefineYourTasteScreen', 'Failed to update taste profile', error as Error);
      Alert.alert(
        'Error',
        'Failed to update your taste profile. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = () => {
    const currentAnswer = answers[currentQuestion.id];

    // Safety check - ensure options exist
    if (!currentQuestion.options || !Array.isArray(currentQuestion.options)) {
      return null;
    }

    switch (currentQuestion.type) {
      case 'mcq':
        return (
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.option,
                  currentAnswer === option.value && styles.selectedOption,
                ]}
                onPress={() => handleAnswer(option.value)}
              >
                {/* Show image if available, otherwise show emoji */}
                {option.spiritKey && spiritImages[option.spiritKey] ? (
                  <Image
                    source={spiritImages[option.spiritKey]}
                    style={styles.optionImage}
                  />
                ) : option.flavorKey && flavorImages[option.flavorKey] ? (
                  <Image
                    source={flavorImages[option.flavorKey]}
                    style={styles.optionImage}
                  />
                ) : (
                  <Text style={styles.optionEmoji}>{option.emoji}</Text>
                )}
                <Text
                  style={[
                    styles.optionText,
                    currentAnswer === option.value && styles.selectedOptionText,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        );

      case 'multi-select':
        const multiAnswers = Array.isArray(currentAnswer) ? currentAnswer : [];
        return (
          <>
            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option) => {
                const isSelected = multiAnswers.includes(option.value);
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.option, isSelected && styles.selectedOption]}
                    onPress={() => handleMultiSelectToggle(option.value)}
                  >
                    {/* Show image if available, otherwise show emoji */}
                    {option.spiritKey && spiritImages[option.spiritKey] ? (
                      <Image
                        source={spiritImages[option.spiritKey]}
                        style={styles.optionImage}
                      />
                    ) : option.flavorKey && flavorImages[option.flavorKey] ? (
                      <Image
                        source={flavorImages[option.flavorKey]}
                        style={styles.optionImage}
                      />
                    ) : (
                      <Text style={styles.optionEmoji}>{option.emoji}</Text>
                    )}
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.selectedOptionText,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <View style={styles.checkboxContainer}>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                      )}
                      {!isSelected && (
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={24}
                          color={colors.line}
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[styles.nextButton, !canProceed() && styles.disabledButton]}
              onPress={handleNext}
              disabled={!canProceed()}
            >
              <Text style={styles.nextButtonText}>
                {isLastQuestion ? 'Complete' : 'Next Question'}
              </Text>
              <Ionicons
                name={isLastQuestion ? 'checkmark' : 'arrow-forward'}
                size={20}
                color={colors.white}
              />
            </Pressable>
          </>
        );

      default:
        return null;
    }
  };

  // Guard against undefined currentQuestion
  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Refine Your Taste</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressText}>
        Question {currentQuestionIndex + 1} of {TASTE_QUESTIONS.length}
      </Text>

      {/* Question Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>{currentQuestion.section}</Text>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
        {currentQuestion.subtitle && (
          <Text style={styles.subtitleText}>{currentQuestion.subtitle}</Text>
        )}

        {renderQuestion()}
      </ScrollView>

      {/* Loading Overlay */}
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Updating your profile...</Text>
        </View>
      )}

      {/* Preview Screen - Full Screen After Completion */}
      {showPreview && previewCocktails.length > 0 && (
        <View style={styles.previewOverlay}>
          <View style={styles.previewFullContainer}>
            <Text style={styles.previewHeader}>Your Recommended Cocktails</Text>
            <Text style={styles.previewSubheader}>
              Based on your taste profile
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.previewScrollContent}
              style={styles.previewScroll}
            >
              {previewCocktails.map((cocktail, index) => {
                const recipeCardData = {
                  id: cocktail.id || `preview-${index}`,
                  name: cocktail.name || cocktail.title,
                  title: cocktail.title || cocktail.name,
                  subtitle: cocktail.subtitle || cocktail.description,
                  description: cocktail.description || cocktail.subtitle,
                  image: cocktail.image,
                  difficulty: cocktail.difficulty || 'Medium',
                  time: cocktail.time || '5 min',
                  category: cocktail.category || 'cocktail',
                  ingredients: cocktail.ingredients || [],
                  instructions: cocktail.instructions || [],
                  base: cocktail.base,
                  tags: cocktail.tags || [],
                };

                return (
                  <View key={index} style={styles.previewCardWrapper}>
                    <RecipeCard
                      {...createRecipeCardProps(recipeCardData, navigation, {
                        showSaveButton: false,
                        showCartButton: false,
                        showDeleteButton: false,
                      })}
                      onPress={() => handleRecipeView(recipeCardData, navigation)}
                    />
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.previewContinueButton}
              onPress={() => {
                setShowPreview(false);
                handleComplete(answers);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.previewContinueText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backButton: {
    padding: spacing(1),
  },
  headerTitle: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: colors.line,
    marginHorizontal: spacing(2),
    marginTop: spacing(2),
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  progressText: {
    fontSize: fonts.caption,
    color: colors.subtext,
    textAlign: 'center',
    marginTop: spacing(1),
    marginBottom: spacing(2),
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(4),
  },
  sectionLabel: {
    fontSize: fonts.caption,
    color: colors.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing(1),
  },
  questionText: {
    fontSize: fonts.h2,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(1),
    lineHeight: 32,
  },
  subtitleText: {
    fontSize: fonts.body,
    color: colors.subtext,
    marginBottom: spacing(3),
    lineHeight: 22,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  option: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 2,
    borderColor: colors.line,
    width: '48.5%',
    aspectRatio: 0.85,
    marginBottom: spacing(1.5),
  },
  selectedOption: {
    backgroundColor: colors.accentBg,
    borderColor: colors.accent,
  },
  optionEmoji: {
    fontSize: 64,
    marginTop: spacing(2),
  },
  optionImage: {
    width: '100%',
    flex: 1,
    resizeMode: 'cover',
  },
  optionText: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing(1.5),
  },
  selectedOptionText: {
    color: colors.accent,
    fontWeight: '700',
  },
  checkboxContainer: {
    position: 'absolute',
    top: spacing(1.5),
    right: spacing(1.5),
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    marginTop: spacing(3),
    gap: spacing(1),
  },
  disabledButton: {
    backgroundColor: colors.line,
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: fonts.body,
    fontWeight: '700',
    color: colors.white,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
  },
  loadingText: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.white,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(3),
  },
  previewFullContainer: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
  },
  previewHeader: {
    fontSize: fonts.h2,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1),
  },
  previewSubheader: {
    fontSize: fonts.body,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: spacing(3),
  },
  previewScroll: {
    flexGrow: 0,
  },
  previewScrollContent: {
    paddingHorizontal: spacing(2),
    gap: spacing(2),
  },
  previewCardWrapper: {
    width: 280,
    marginRight: spacing(2),
  },
  previewContinueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.accent,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    borderRadius: radii.lg,
    marginTop: spacing(4),
    marginHorizontal: spacing(2),
  },
  previewContinueText: {
    fontSize: fonts.body,
    fontWeight: '700',
    color: colors.white,
  },
});