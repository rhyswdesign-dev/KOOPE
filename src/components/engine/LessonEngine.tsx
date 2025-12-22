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
  StatusBar,
  Platform,
  Pressable,
  TextInput
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../../store/useSession';
import { useUser } from '../../store/useUser';
import { SupabaseContentRepository } from '../../repos/supabase/contentRepository';
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

interface LessonEngineProps {
  lessonId: string;
  onComplete?: (results: any) => void;
  onExit?: () => void;
}

const contentRepo = new SupabaseContentRepository();

export const LessonEngine: React.FC<LessonEngineProps> = ({ lessonId, onComplete, onExit }) => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastResult, setLastResult] = useState<{ correct: boolean; msToAnswer: number } | null>(null);
  const [showQuickFeedback, setShowQuickFeedback] = useState(false);
  const [quickFeedbackType, setQuickFeedbackType] = useState<'correct' | 'incorrect' | 'streak'>('correct');
  // const completionAnimation = useCompletionAnimation();
  const audio = useAudio();
  const analytics = useAnalyticsContext();
  const { user } = useAuth();
  const { trackLessonComplete, trackXPEarned, trackQuizPerfect } = useChallengeProgress();
  const userStore = useUser();
  const { lives = 3, loseLife: loseUserLife, completeLesson: completeUserLesson } = userStore || {};
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const heartPulseAnim = useRef(new Animated.Value(1)).current;
  
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
        duration: 250, // Reduced to 250ms for instant progress updates
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
          duration: 200, // Reduced to 200ms for instant appearance
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 120, // Higher tension for snappier feel
          friction: 8,
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

      const lesson = await contentRepo.getLesson(lessonId);

      if (!lesson) {
        setError(`Lesson not found: ${lessonId}`);
        return;
      }

      const lessonItems = await contentRepo.getItemsForLesson(lessonId);

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
      exerciseType: currentItem.type
    });

    // Show quick feedback animation and play sound
    setQuickFeedbackType(result.correct ? 'correct' : 'incorrect');
    setShowQuickFeedback(true);

    // Play appropriate audio feedback
    if (result.correct) {
      audio.playCorrectAnswer();
    } else {
      audio.playIncorrectAnswer();
    }
    
    // Hide quick feedback after delay (reduced to 400ms for very fast transitions)
    setTimeout(() => {
      setShowQuickFeedback(false);
    }, 400);

    // Ultra-fast feedback animation
    Animated.sequence([
      Animated.spring(feedbackAnim, {
        toValue: 1,
        tension: 140,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(feedbackAnim, {
        toValue: 0,
        duration: 150,
        delay: 350, // Reduced to 350ms for ultra-fast transitions
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowFeedback(false);
      setLastResult(null);

      // Ultra-fast transition with parallel fade + slide
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100, // Very quick fade out
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 100, // Very quick slide out
          useNativeDriver: true,
        })
      ]).start(() => {
        if (isLastItem) {
          completeLesson();
        } else {
          nextItem();

          // Reset values for incoming animation
          fadeAnim.setValue(0);
          slideAnim.setValue(0);

          // Instant entrance with parallel fade + slide
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200, // Reduced from 250ms
              useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
              toValue: 1,
              tension: 120,
              friction: 8,
              useNativeDriver: true,
            }),
          ]).start();
        }
      });
    });
  };

  const completeLesson = async () => {
    const sessionResults = endSession();

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
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!currentItem) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No current item</Text>
      </View>
    );
  }

  const renderExercise = () => {
    if (!currentItem) {
      log.error('LessonEngine', 'renderExercise: No current item');
      return <Text style={styles.errorText}>No current item</Text>;
    }

    log.debug('LessonEngine', 'Rendering exercise', {
      id: currentItem.id,
      type: currentItem.type,
      prompt: currentItem.prompt?.substring(0, 50) + '...',
      hasOptions: !!currentItem.options,
      optionsLength: currentItem.options?.length
    });

    // Normalize the type to handle corruption (mcp -> mcq)
    const exerciseType = currentItem.type === 'mcp' ? 'mcq' : currentItem.type;

    switch (exerciseType) {
      case 'mcq':
        if (!currentItem.options || !currentItem.options.length) {
          return (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Multiple choice question missing options</Text>
            </View>
          );
        }
        // Temporary simple MCQ render for testing
        return (
          <View>
            <Text style={{ color: 'white', fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
              {currentItem.prompt}
            </Text>
            {currentItem.options.map((option, index) => (
              <Pressable
                key={index}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  padding: 15,
                  marginBottom: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)'
                }}
                onPress={() => handleAnswer({ correct: index === currentItem.answerIndex, msToAnswer: 1000 })}
              >
                <Text style={{ color: 'white', fontSize: 16 }}>{option}</Text>
              </Pressable>
            ))}
          </View>
        );
      case 'order':
        if (!currentItem.orderTarget || !currentItem.orderTarget.length) {
          return (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Order exercise missing target sequence</Text>
            </View>
          );
        }
        return (
          <OrderExercise
            item={currentItem}
            onResult={handleAnswer}
            disabled={false}
          />
        );
      case 'short':
        if (!currentItem.answerText) {
          return (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Short answer question missing answer</Text>
            </View>
          );
        }
        // Simple short answer implementation

        return (
          <View>
            <Text style={{ color: 'white', fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
              {currentItem.prompt}
            </Text>
            <TextInput
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: 15,
                borderRadius: 8,
                fontSize: 16,
                marginBottom: 15
              }}
              placeholder="Type your answer..."
              placeholderTextColor="#666"
            />
            <Pressable
              style={{
                backgroundColor: 'rgba(0, 255, 0, 0.3)',
                padding: 15,
                borderRadius: 8
              }}
              onPress={() => {
                // For now, randomly make it correct/incorrect
                const isCorrect = Math.random() > 0.4; // 60% chance of being correct
                handleAnswer({ correct: isCorrect, msToAnswer: 1000 });
              }}
            >
              <Text style={{ color: 'white', fontSize: 16, textAlign: 'center', fontWeight: 'bold' }}>
                Submit Answer
              </Text>
            </Pressable>
          </View>
        );
      case 'checkbox':
        if (!currentItem.options || !currentItem.correct) {
          return (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Checkbox question missing options or answers</Text>
            </View>
          );
        }
        return (
          <CheckboxExercise
            item={currentItem}
            onResult={handleAnswer}
          />
        );
      case 'match':
        if (!currentItem.pairs || !currentItem.pairs.length) {
          return (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Match exercise missing pairs</Text>
            </View>
          );
        }
        return (
          <MatchExercise
            item={currentItem}
            onResult={handleAnswer}
          />
        );
      default:
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Unsupported question type: {exerciseType}</Text>
            <Text style={styles.errorSubtext}>Supported types: mcq, order, short, checkbox, match</Text>
          </View>
        );
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
                // Navigate to VaultStore with hearts tab
                navigation.navigate('VaultStore', { tab: 'hearts' });
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
              <Ionicons name="heart" size={18} color="#FF6B6B" />
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

      {/* Feedback Overlay */}
      {showFeedback && lastResult && (
        <Animated.View
          style={[
            styles.feedbackOverlay,
            {
              opacity: feedbackAnim,
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
            styles.feedbackCard,
            lastResult.correct ? styles.correctFeedback : styles.incorrectFeedback
          ]}>
            <View style={styles.feedbackIcon}>
              <Ionicons 
                name={lastResult.correct ? 'checkmark-circle' : 'fitness'} 
                size={48} 
                color={lastResult.correct ? colors.success : colors.gold} 
              />
            </View>
            <Text style={styles.feedbackText}>
              {lastResult.correct ? 'Perfect!' : 'Keep trying!'}
            </Text>
            {!lastResult.correct && (
              <Text style={styles.feedbackSubtext}>
                You'll get it next time!
              </Text>
            )}
          </View>
        </Animated.View>
      )}

      {/* Quick Feedback Animation - Temporarily disabled */}
      {/* <QuickFeedbackAnimation
        type={quickFeedbackType}
        visible={showQuickFeedback}
        onComplete={() => setShowQuickFeedback(false)}
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
    justifyContent: 'center',
  },
  exerciseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radii.xl,
    padding: spacing(3),
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
  errorText: {
    textAlign: 'center',
    fontSize: 18,
    color: colors.error,
    marginTop: 100,
    fontWeight: '600',
  },
  feedbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  feedbackCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing(4),
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
    minWidth: 200,
  },
  correctFeedback: {
    borderColor: colors.success,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  incorrectFeedback: {
    borderColor: colors.error,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  feedbackIcon: {
    marginBottom: spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
    textAlign: 'center',
  },
  feedbackSubtext: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    fontWeight: '500',
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
    backgroundColor: '#FF6B6B',
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