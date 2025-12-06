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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { usePersonalization } from '../store/usePersonalization';
import { SurveyAnswers } from '../services/placement';
import { trackEvent } from '../lib/analytics';
import { spiritImages } from '../../assets/images/spirits';
import { flavorImages } from '../../assets/images/flavors';

type Props = NativeStackScreenProps<RootStackParamList, 'RefineYourTaste'>;

// Focused survey questions for taste refinement
// NOTE: Store spiritKey instead of resolved image to defer loading
const TASTE_QUESTIONS = [
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
      { value: 'liqueurs', label: 'Liqueurs', emoji: '🍯' }, // No image for liqueurs, will use emoji
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

  const currentQuestion = TASTE_QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === TASTE_QUESTIONS.length - 1;
  const progress = ((currentQuestionIndex + 1) / TASTE_QUESTIONS.length) * 100;

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
          handleComplete(newAnswers);
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
      handleComplete(answers);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else {
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
      await updateProfile({
        favoriteSpirits: spiritPrefs,
        flavorPreferences: flavorPrefs,
        flavorScores,
        spiritScores,
        preferredABV: abvPref as any,
        preferredDifficulty: ['Easy', 'Medium'], // Default difficulty preferences
        lastSurveyUpdate: Date.now(),
      });

      // Track analytics
      trackEvent('taste_profile_updated', {
        spirits_count: spiritPrefs.length,
        flavors_count: flavorPrefs.length,
        abv_preference: abvPref,
      });

      // Show success message
      Alert.alert(
        '✨ Taste Profile Updated!',
        'Your personalized recommendations have been refreshed based on your preferences.',
        [
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error updating taste profile:', error);
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
                {option.spiritKey && spiritImages?.[option.spiritKey] ? (
                  <Image
                    source={spiritImages[option.spiritKey]}
                    style={styles.optionImage}
                  />
                ) : option.flavorKey && flavorImages?.[option.flavorKey] ? (
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
                    {option.spiritKey && spiritImages?.[option.spiritKey] ? (
                      <Image
                        source={spiritImages[option.spiritKey]}
                        style={styles.optionImage}
                      />
                    ) : option.flavorKey && flavorImages?.[option.flavorKey] ? (
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
    gap: spacing(1.5),
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 2,
    borderColor: colors.line,
    gap: spacing(1.5),
  },
  selectedOption: {
    backgroundColor: colors.accentBg,
    borderColor: colors.accent,
  },
  optionEmoji: {
    fontSize: 28,
  },
  optionImage: {
    width: 80,
    height: 80,
    borderRadius: radii.lg,
    backgroundColor: colors.line,
    resizeMode: 'cover',
  },
  optionText: {
    flex: 1,
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.text,
  },
  selectedOptionText: {
    color: colors.accent,
    fontWeight: '700',
  },
  checkboxContainer: {
    marginLeft: 'auto',
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
});