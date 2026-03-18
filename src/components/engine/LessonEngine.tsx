// @ts-nocheck
/**
 * Lesson Engine Component
 * Main component for running lessons with exercises
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Animated,
  Easing,
  StatusBar,
  Platform,
  Pressable,
  TouchableOpacity
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../../store/useSession';
import { useUser } from '../../store/useUser';
import { SupabaseContentRepository } from '../../repos/supabase/contentRepository';
import { MemoryContentRepository } from '../../repos/memory/contentRepository';
import Heading from '../ui/Heading';
import { MCQExercise } from './MCQExercise';
import OrderExercise from './OrderExercise';
import ShortAnswerExercise from './ShortAnswerExercise';
import CheckboxExercise from './CheckboxExercise';
import MatchExercise from './MatchExercise';
import { Item, Attempt } from '../../types/domain';
import { colors, spacing, radii } from '../../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
// import { CompletionAnimation } from '../animations/CompletionAnimation';
// import { QuickFeedbackAnimation } from '../animations/QuickFeedbackAnimation';
// import { useCompletionAnimation } from '../../hooks/useCompletionAnimation';
import { useAudio } from '../../hooks/useAudio';
import { useAnalyticsContext } from '../../context/AnalyticsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useChallengeProgress } from '../../hooks/useChallengeProgress';
import { log } from '../../lib/logger';
import { lessonProgressService } from '../../services/lessonProgressService';
import { achievementService } from '../../services/achievementService';
import { normalizeOrderTarget, normalizeShortAnswer } from '../../utils/exerciseValidation';

interface LessonEngineProps {
  lessonId: string;
  onComplete?: (results: any) => void;
  onExit?: () => void;
}

const supabaseContentRepo = new SupabaseContentRepository();
const memoryContentRepo = new MemoryContentRepository();

export const LessonEngine: React.FC<LessonEngineProps> = ({ lessonId, onComplete, onExit }) => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastResult, setLastResult] = useState<{ correct: boolean; msToAnswer: number } | null>(null);
  const [feedbackInsight, setFeedbackInsight] = useState<string | null>(null);
  const [feedbackHeadline, setFeedbackHeadline] = useState<string>('Nice work');
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [quickFeedbackType, setQuickFeedbackType] = useState<'correct' | 'incorrect' | 'streak'>('correct');
  // const completionAnimation = useCompletionAnimation();
  const audio = useAudio();
  const analytics = useAnalyticsContext();
  const { user } = useAuth();
  const { trackLessonComplete, trackXPEarned, trackQuizPerfect } = useChallengeProgress();
  const userStore = useUser();
  const { lives = 3, loseLife: loseUserLife, completeLesson: completeUserLesson, completedLessons = [] } = userStore || {};

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const heartPulseAnim = useRef(new Animated.Value(1)).current;

  // Quick feedback flash overlay
  const feedbackFlashOpacity = useRef(new Animated.Value(0)).current;
  const feedbackIconScale = useRef(new Animated.Value(0.5)).current;
  const feedbackIconOpacity = useRef(new Animated.Value(0)).current;
  const feedbackTypeRef = useRef<'correct' | 'incorrect'>('correct');

  const {
    items,
    currentItemIndex,
    startSession,
    submitAnswer,
    nextItem,
    endSession,
    reset
  } = useSession();

  const currentItem = items[currentItemIndex];
  const isLastItem = currentItemIndex >= items.length - 1;


  useEffect(() => {
    StatusBar.setBarStyle('light-content', true);
    loadLesson();
    return () => reset(); // Cleanup on unmount
  }, [lessonId]);


  // Animate progress bar when currentItemIndex changes (ultra-fast)
  useEffect(() => {
    if (items.length > 0) {
      const targetProgress = (currentItemIndex + 1) / items.length;
      Animated.timing(progressAnim, {
        toValue: targetProgress,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [currentItemIndex, items.length]);

  // Initial entrance animation (ultra-fast)
  useEffect(() => {
    if (!loading && !error && currentItem) {
      log.debug('LessonEngine', 'Starting entrance animation for item', { itemId: currentItem.id });
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, error, currentItem]);

  // Heart pulse animation for lives
  useEffect(() => {
    const createPulse = () => {
      Animated.sequence([
        Animated.timing(heartPulseAnim, {
          toValue: 1.1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(heartPulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (lives > 0) {
          setTimeout(createPulse, 2000);
        }
      });
    };

    if (lives > 0) {
      createPulse();
    }
  }, [lives]);

  const loadLesson = async () => {
    try {
      setLoading(true);

      if (!lessonId) {
        setError('No lesson ID provided');
        return;
      }

      let lesson = await supabaseContentRepo.getLesson(lessonId);
      let lessonItems = lesson ? await supabaseContentRepo.getItemsForLesson(lessonId) : [];

      if (!lesson || lessonItems.length === 0) {
        lesson = await memoryContentRepo.getLesson(lessonId);
        lessonItems = lesson ? await memoryContentRepo.getItemsForLesson(lessonId) : [];
      }

      if (!lesson) {
        setError(`Lesson not found: ${lessonId}`);
        return;
      }

      if (lessonItems.length === 0) {
        setError('No items found for this lesson');
        return;
      }

      startSession(lessonId, lessonItems);

      // Track lesson start
      analytics.track({
        type: 'lesson.start',
        lessonId
      });
    } catch (err) {
      setError('Failed to load lesson');
      log.error('LessonEngine', 'Lesson loading error', err);
    } finally {
      setLoading(false);
    }
  };

  const buildFeedbackInsight = (item: Item, isCorrect: boolean): string | null => {
    const baseInsight = item.insight?.trim() || '';
    const answerLine = (() => {
      if (typeof item.answerIndex === 'number' && item.options?.[item.answerIndex]) {
        return `Correct answer: ${item.options[item.answerIndex]}`;
      }
      if (item.answerText) return `Correct answer: ${item.answerText}`;
      if (Array.isArray(item.correct) && item.correct.length > 0) return `Correct answer: ${item.correct.join(', ')}`;
      if (Array.isArray(item.orderTarget) && item.orderTarget.length > 0) {
        return `Correct order: ${item.orderTarget.join(' -> ')}`;
      }
      return '';
    })();

    const whyItMattersByType: Record<string, string> = {
      mcq: 'Why it matters: fast recognition helps you make clean decisions under service pressure.',
      checkbox: 'Why it matters: bartending often requires checking multiple correct signals at once.',
      order: 'Why it matters: sequence changes texture, dilution, and final balance in the glass.',
      match: 'Why it matters: connecting concepts quickly improves recall during real guest interactions.',
      short: 'Why it matters: naming the concept in your own words locks in long-term memory.',
    };

    const ruleOfThumbByType: Record<string, string> = {
      mcq: 'Rule of thumb: remove clearly wrong options first, then choose the best fit.',
      checkbox: 'Rule of thumb: select only what must be true, not what feels somewhat true.',
      order: 'Rule of thumb: prep first, then build, then finish; avoid steps that cause early dilution.',
      match: 'Rule of thumb: match by function and intent, not by wording similarity.',
      short: 'Rule of thumb: keep the answer short, specific, and technically precise.',
    };

    const lines = [
      baseInsight,
      whyItMattersByType[item.type] || '',
      !isCorrect ? ruleOfThumbByType[item.type] || '' : '',
      answerLine,
    ].filter((line) => line && line.trim().length > 0);

    return lines.length > 0 ? lines.join('\n\n') : null;
  };

  const handleAnswer = (result: { correct: boolean; msToAnswer: number }) => {
    if (!currentItem) return;

    const attempt: Attempt = {
      id: `${Date.now()}_${Math.random()}`,
      userId: user?.id || 'anonymous',
      itemId: currentItem.id,
      correct: result.correct,
      msToAnswer: result.msToAnswer,
      timestamp: Date.now(),
      exerciseType: currentItem.type
    };

    setLastResult(result);
    setFeedbackHeadline(
      result.correct
        ? ['Perfect!', 'Excellent!', 'Nailed it!'][Math.floor(Math.random() * 3)]
        : ['Not quite', 'Try again', 'Almost!'][Math.floor(Math.random() * 3)]
    );
    setFeedbackInsight(buildFeedbackInsight(currentItem, result.correct));
    setShowFeedback(true);
    submitAnswer(attempt);

    // Handle life loss for incorrect answers
    if (!result.correct) {
      log.debug('LessonEngine', 'Wrong answer! Losing a life', { currentLives: lives });
      if (loseUserLife) {
        loseUserLife();
        log.debug('LessonEngine', 'Life lost', { remainingLives: lives - 1 });
      } else {
        log.warn('LessonEngine', 'loseUserLife function not available');
      }
    } else {
      log.debug('LessonEngine', 'Correct answer! No life lost');
    }

    // Track item attempt
    analytics.track({
      type: 'item.attempted',
      itemId: currentItem.id,
      result: result.correct ? 'correct' : 'incorrect',
      msToAnswer: result.msToAnswer,
      exerciseType: currentItem.type === 'checkbox' || currentItem.type === 'match' ? 'mcq' : currentItem.type
    });

    // Play appropriate audio feedback
    if (result.correct) {
      audio.playCorrectAnswer();
    } else {
      audio.playIncorrectAnswer();
    }

    // Animate correct/incorrect flash overlay
    feedbackTypeRef.current = result.correct ? 'correct' : 'incorrect';
    setQuickFeedbackType(result.correct ? 'correct' : 'incorrect');
    feedbackFlashOpacity.setValue(0);
    feedbackIconScale.setValue(0.5);
    feedbackIconOpacity.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(feedbackFlashOpacity, { toValue: 0.12, duration: 80, useNativeDriver: true }),
        Animated.spring(feedbackIconScale, { toValue: 1, tension: 180, friction: 8, useNativeDriver: true }),
        Animated.timing(feedbackIconOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(feedbackFlashOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(feedbackIconOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
    ]).start();

    // Heart pulse-damage on incorrect
    if (!result.correct) {
      Animated.sequence([
        Animated.timing(heartPulseAnim, { toValue: 1.4, duration: 100, useNativeDriver: true }),
        Animated.timing(heartPulseAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
        Animated.timing(heartPulseAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    }

    // Keep feedback visible until user taps Continue.
    Animated.spring(feedbackAnim, {
      toValue: 1,
      tension: 140,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const completeLesson = async () => {
    const sessionResults = endSession();
    const firstCompletion = !completedLessons.includes(lessonId);

    // Calculate score and XP with proper defaults
    const correctCount = sessionResults.correctCount || 0;
    const totalCount = sessionResults.totalAttempts || 0;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const xpAwarded = 50 + (accuracy >= 90 ? 25 : 0); // Bonus XP for high scores
    const masteryDelta = accuracy >= 70 ? 5 : 2; // More mastery for good performance

    // Create properly formatted results for LessonSummaryScreen
    const results = {
      xpAwarded,
      correctCount,
      totalCount,
      masteryDelta,
      firstCompletion,
    };

    log.info('LessonEngine', 'Lesson complete', {
      accuracy: `${accuracy}%`,
      correctCount,
      totalCount,
      xpAwarded,
      masteryDelta
    });

    // Update user store with lesson completion
    if (completeUserLesson) {
      completeUserLesson(lessonId, xpAwarded);
    } else {
      log.warn('LessonEngine', 'completeUserLesson function not available');
    }

    // Track lesson completion for achievements (bridges to achievementService)
    try {
      await achievementService.trackAction('lessonsCompleted', 1);
    } catch (err) {
      log.error('LessonEngine', 'Error tracking achievement', err);
    }

    // Track lesson completion
    analytics.track({
      type: 'lesson.complete',
      lessonId,
      durationMs: sessionResults.totalTime || 0,
      itemsAttempted: totalCount,
      correctCount,
      accuracy
    });

    // Track XP awarded
    if (xpAwarded > 0) {
      analytics.track({
        type: 'progress.xpAwarded',
        amount: xpAwarded
      });
    }

    // Track lesson progress in Supabase
    if (user?.id) {
      try {
        const progressResult = await lessonProgressService.recordLessonAttempt({
          userId: user.id,
          lessonId,
          itemsAttempted: totalCount,
          itemsCorrect: correctCount,
          xpEarned: xpAwarded,
        });

        if (progressResult.success) {
          log.info('LessonEngine', 'Lesson progress saved', {
            lessonId,
            isNewCompletion: progressResult.isNewCompletion,
            isNewBestScore: progressResult.isNewBestScore,
            accuracy
          });
        }
      } catch (error) {
        log.error('LessonEngine', 'Error saving lesson progress', error);
      }
    }

    // Track challenge progress for lesson completion and XP
    try {
      await trackLessonComplete(lessonId);
      await trackXPEarned(xpAwarded);

      // Track perfect quiz if 100% accuracy
      if (accuracy === 100) {
        await trackQuizPerfect(lessonId, accuracy);
      }

      log.info('LessonEngine', 'Challenge progress updated', { lessonId, xpAwarded, accuracy });
    } catch (error) {
      log.error('LessonEngine', 'Error tracking challenge progress', error);
    }

    // Play appropriate completion sound based on accuracy
    if (accuracy === 100) {
      audio.playPerfectScore();
    } else if (accuracy >= 70) {
      audio.playLessonComplete();
    } else {
      // Play a different sound for low scores
      audio.playIncorrectAnswer();
    }

    // Navigate to summary screen immediately (no alert)
    if (onComplete) {
      onComplete(results);
    } else {
      // Navigate back to lessons screen
      navigation.goBack();
    }
  };


  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading lesson...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingErrorText}>{error}</Text>
      </View>
    );
  }

  if (!currentItem) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingErrorText}>No current item</Text>
      </View>
    );
  }

  const skipMalformedItem = () => {
    log.warn('LessonEngine', 'Skipping malformed lesson item', {
      lessonId,
      itemId: currentItem?.id,
      type: currentItem?.type,
    });

    if (isLastItem) {
      completeLesson();
      return;
    }

    nextItem();
  };

  const renderExercise = () => {
    if (!currentItem) {
      log.error('LessonEngine', 'renderExercise: No current item');
      return <Text style={styles.loadingErrorText}>No current item</Text>;
    }

    const renderMalformedItem = (title: string, detail: string) => (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{title}</Text>
        <Text style={styles.errorSubtext}>{detail}</Text>
        <Text style={styles.errorDebugText}>
          {`Item ${currentItem.id} • ${currentItem.type}`}
        </Text>
        <Pressable style={styles.skipButton} onPress={skipMalformedItem}>
          <Text style={styles.skipButtonText}>Skip Question</Text>
        </Pressable>
      </View>
    );

    const exerciseType = currentItem.type;
    const normalizedOrderTarget = normalizeOrderTarget(currentItem as any);
    const normalizedShort = normalizeShortAnswer(currentItem as any);
    const normalizedAnswerIndex =
      typeof currentItem.answerIndex === 'number'
        ? currentItem.answerIndex
        : typeof (currentItem as any).correct === 'number'
          ? (currentItem as any).correct
          : undefined;
    const normalizedMcqItem: Item = {
      ...currentItem,
      answerIndex: normalizedAnswerIndex,
      roleplay: currentItem.roleplay || (String((currentItem as any).type || '').toLowerCase() === 'roleplay' ? { mode: 'scenario' } : undefined),
    };

    switch (exerciseType) {
      case 'mcq':
        if (!normalizedMcqItem.options || normalizedMcqItem.options.length < 2) {
          return renderMalformedItem('Question is missing options', 'MCQ and roleplay items need at least two choices.');
        }
        if (typeof normalizedMcqItem.answerIndex !== 'number') {
          return renderMalformedItem('Question is missing the correct answer', 'MCQ and roleplay items need one numeric correct option.');
        }
        return (
          <MCQExercise
            key={normalizedMcqItem.id}
            item={normalizedMcqItem}
            onResult={handleAnswer}
          />
        );
      case 'order':
        if (!normalizedOrderTarget.length) {
          return renderMalformedItem('Order question is still being formatted', 'Order items need a visible sequence in `options` or `order_target`.');
        }
        return (
          <OrderExercise
            item={{ ...currentItem, orderTarget: normalizedOrderTarget, options: currentItem.options || normalizedOrderTarget }}
            onResult={handleAnswer}
            disabled={false}
          />
        );
      case 'short':
        if (!normalizedShort.answerText) {
          return renderMalformedItem('Short answer question missing answer', 'Short answer items need `answerText` or an equivalent expected answer field.');
        }
        return (
          <ShortAnswerExercise
            item={{
              ...currentItem,
              answerText: normalizedShort.answerText,
              acceptableAnswers: normalizedShort.acceptableAnswers,
              validationMode: normalizedShort.validationMode,
              requiredKeywords: normalizedShort.requiredKeywords,
            }}
            onResult={handleAnswer}
            disabled={false}
          />
        );
      case 'checkbox':
        if (!currentItem.options || !currentItem.correct) {
          return renderMalformedItem('Checkbox question is incomplete', 'Checkbox items need options and at least one correct value.');
        }
        return (
          <CheckboxExercise
            item={currentItem}
            onResult={handleAnswer}
          />
        );
      case 'match':
        if (!currentItem.pairs || !currentItem.pairs.length) {
          return renderMalformedItem('Match question is missing pairs', 'Match items need at least one left/right pair.');
        }
        return (
          <MatchExercise
            item={currentItem}
            onResult={handleAnswer}
          />
        );
      default:
        return renderMalformedItem(`Unsupported question type: ${exerciseType}`, 'Supported types: mcq, order, short, checkbox, match.');
    }
  };

  // Block rendering if no hearts
  if (lives <= 0) {
    return (
      <View style={styles.blockedScreenContainer}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={[colors.bg, '#1A0F0B', colors.card]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.blockedContainer}>
          <View style={styles.blockedContent}>
            <Ionicons name="heart-dislike" size={80} color="#FF6B6B" />
            <Text style={styles.blockedTitle}>Out of Hearts!</Text>
            <Text style={styles.blockedSubtitle}>
              You need hearts to take lessons. Get more hearts to continue learning!
            </Text>
          </View>

          <View style={styles.blockedButtons}>
            {/* Buy Hearts Button */}
            <Pressable
              style={[styles.blockedButton, styles.buyHeartsButton]}
              onPress={() => {
                // Navigate to Vault
                navigation.navigate('Vault');
              }}
            >
              <Ionicons name="diamond" size={20} color={colors.white} />
              <Text style={styles.blockedButtonText}>Buy Hearts</Text>
            </Pressable>

            {/* Go Back Button */}
            <Pressable
              style={[styles.blockedButton, styles.goBackButton]}
              onPress={() => {
                if (onExit) {
                  onExit();
                } else {
                  navigation.goBack();
                }
              }}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
              <Text style={[styles.blockedButtonText, { color: colors.text }]}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Luxury gradient background */}
      <LinearGradient
        colors={[colors.bg, '#1A0F0B', colors.card]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Enhanced Header */}
      <View style={styles.header}>
        {/* Exit Button */}
        <Pressable
          style={styles.exitButton}
          onPress={() => {
            Alert.alert(
              'Exit Lesson',
              'Are you sure you want to exit? Your progress will be saved.',
              [
                { text: 'Continue', style: 'cancel' },
                { text: 'Exit', style: 'destructive', onPress: () => onExit?.() },
              ]
            );
          }}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>

        {/* Animated Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentItemIndex + 1} of {items.length}
          </Text>
        </View>

        {/* Animated Lives */}
        <View style={styles.livesContainer}>
          {Array.from({ length: 3 }, (_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.heart,
                {
                  opacity: i < lives ? 1 : 0.3,
                  transform: i < lives ? [{ scale: heartPulseAnim }] : [{ scale: 1 }],
                },
              ]}
            >
              <Ionicons name="heart" size={18} color={colors.error} />
            </Animated.View>
          ))}
        </View>
      </View>

      {/* Exercise Content with Animations */}
      <Animated.View
        style={[
          styles.exerciseContainer,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
              {
                scale: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.exerciseCard}>
          {renderExercise()}
        </View>
      </Animated.View>

      {/* Quick Answer Flash Overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.quickFlashOverlay,
          {
            opacity: feedbackFlashOpacity,
            backgroundColor: quickFeedbackType === 'correct' ? colors.success : colors.error,
          },
        ]}
      >
        <Animated.View
          style={{
            opacity: feedbackIconOpacity,
            transform: [{ scale: feedbackIconScale }],
          }}
        >
          <Ionicons
            name={quickFeedbackType === 'correct' ? 'checkmark-circle' : 'close-circle'}
            size={80}
            color={colors.white}
          />
        </Animated.View>
      </Animated.View>

      {/* Feedback Overlay - Minimalist Design */}
      {showFeedback && lastResult && (
        <Animated.View
          style={[
            styles.feedbackOverlay,
            {
              opacity: feedbackAnim,
            },
          ]}
        >
          <View style={styles.feedbackContent}>
            {/* Concentric Circle Icon */}
            <Animated.View
              style={[
                styles.iconOuterGlow,
                {
                  backgroundColor: lastResult.correct
                    ? 'rgba(76, 175, 80, 0.15)'
                    : 'rgba(244, 67, 54, 0.15)',
                  transform: [
                    {
                      scale: feedbackAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[
                styles.iconMiddleRing,
                { backgroundColor: lastResult.correct ? '#2E7D32' : '#C62828' }
              ]}>
                <View style={[
                  styles.iconInnerCircle,
                  { backgroundColor: lastResult.correct ? colors.success : colors.error }
                ]}>
                  <Ionicons
                    name={lastResult.correct ? 'checkmark' : 'close'}
                    size={48}
                    color="#FFFFFF"
                  />
                </View>
              </View>
            </Animated.View>

            {/* Feedback Title */}
            <Heading level={1} style={styles.feedbackTitle}>
              {feedbackHeadline}
            </Heading>
            {!!feedbackInsight && (
              <View style={styles.insightCard}>
                <Text style={styles.insightLabel}>Insight</Text>
                <Text style={styles.insightText}>{feedbackInsight}</Text>
              </View>
            )}
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, isAdvancing && { opacity: 0.75 }]}
            disabled={isAdvancing}
            onPress={() => {
              if (isAdvancing) return;
              setIsAdvancing(true);
              Animated.timing(feedbackAnim, {
                toValue: 0,
                duration: 180,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }).start(() => {
                setShowFeedback(false);
                setLastResult(null);
                setFeedbackInsight(null);

                if (isLastItem) {
                  setIsAdvancing(false);
                  completeLesson();
                  return;
                }

                Animated.parallel([
                  Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 120,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                  }),
                  Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 120,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                  }),
                ]).start(() => {
                  nextItem();
                  setIsAdvancing(false);
                });
              });
            }}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.bg} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Quick Feedback Animation - Temporarily disabled */}
      {/* <QuickFeedbackAnimation
        type={quickFeedbackType}
        visible={false}
        onComplete={() => {}}
      /> */}

      {/* Completion Animation - Temporarily disabled */}
      {/* <CompletionAnimation
        type={completionAnimation.type}
        visible={completionAnimation.isVisible}
        onComplete={completionAnimation.hideAnimation}
        message={completionAnimation.message}
        xpAwarded={completionAnimation.xpAwarded}
        score={completionAnimation.score}
      /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingTop: Platform.OS === 'ios' ? spacing(6) : spacing(3),
    paddingBottom: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  exitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
  },
  progressContainer: {
    flex: 1,
    marginRight: spacing(2),
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: spacing(1),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 4,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.subtext,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  livesContainer: {
    flexDirection: 'row',
    gap: spacing(1),
  },
  heart: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  exerciseContainer: {
    flex: 1,
    padding: spacing(3),
    justifyContent: 'flex-start',
  },
  exerciseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radii.xl,
    padding: spacing(3),
    maxHeight: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 18,
    color: colors.text,
    marginTop: 100,
    fontWeight: '600',
  },
  loadingErrorText: {
    textAlign: 'center',
    fontSize: 18,
    color: colors.error,
    marginTop: 100,
    fontWeight: '600',
  },
  quickFlashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
  },
  // Minimalist Feedback Overlay
  feedbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    paddingBottom: spacing(12),
  },
  feedbackContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Concentric Circle Icon
  iconOuterGlow: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(5),
  },
  iconMiddleRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInnerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  insightCard: {
    marginTop: spacing(3),
    marginHorizontal: spacing(3),
    padding: spacing(2),
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    maxWidth: 340,
  },
  insightLabel: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing(0.5),
  },
  insightText: {
    color: colors.white,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },
  continueButton: {
    position: 'absolute',
    bottom: spacing(6),
    left: spacing(4),
    right: spacing(4),
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.bg,
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: radii.lg,
    padding: spacing(3),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing(1),
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    opacity: 0.8,
  },
  errorDebugText: {
    marginTop: spacing(1.5),
    fontSize: 12,
    color: colors.subtext,
    textAlign: 'center',
  },
  skipButton: {
    marginTop: spacing(2),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(214, 138, 56, 0.16)',
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(2),
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gold,
    textAlign: 'center',
  },

  // Blocked state styles
  blockedScreenContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(4),
    paddingBottom: spacing(6), // Extra space for tab bar
  },
  blockedContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockedTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },
  blockedSubtitle: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  blockedButtons: {
    width: '100%',
    gap: spacing(1.5),
    paddingBottom: spacing(2),
  },
  blockedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderRadius: radii.lg,
    gap: spacing(1),
  },
  buyHeartsButton: {
    backgroundColor: colors.accent,
  },
  earnHeartsButton: {
    backgroundColor: colors.error,
  },
  goBackButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.line,
  },
  blockedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
