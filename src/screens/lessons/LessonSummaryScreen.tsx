/**
 * Lesson Summary Screen - Luxury celebration experience
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  StatusBar,
  Platform
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { LessonsStackParamList } from '../../navigation/LessonsStack';
import { colors, spacing, radii } from '../../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import curriculumData from '../../../curriculum-data.json';
import { log } from '../../lib/logger';

type LessonSummaryScreenProps = {
  navigation: CompositeNavigationProp<
    NativeStackNavigationProp<LessonsStackParamList, 'LessonSummary'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
  route: RouteProp<LessonsStackParamList, 'LessonSummary'>;
};

const { width, height } = Dimensions.get('window');

export default function LessonSummaryScreen({ navigation, route }: LessonSummaryScreenProps) {
  const {
    xpAwarded = 0,
    correctCount = 0,
    totalCount = 1,
    masteryDelta = 0,
    moduleId,
    lessonId,
    isFirstLesson
  } = route.params;

  // Calculate accuracy with proper validation
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const incorrectCount = totalCount - correctCount;

  // Determine if the lesson was passed (need at least 70% to pass)
  const passed = accuracy >= 70;
  
  // Enhanced animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const accuracyScaleAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content', true);

    // Create celebration pulse animation
    const createPulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => createPulse());
    };

    // Create rotation animation for celebration
    const createRotation = () => {
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      }).start(() => {
        rotateAnim.setValue(0);
        createRotation();
      });
    };

    // Orchestrated entrance animation
    const sequence = Animated.sequence([
      // Initial fade and slide
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Accuracy card dramatic entrance
      Animated.spring(accuracyScaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      // Stats cards stagger in
      Animated.timing(statsAnim, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      // Celebration elements
      Animated.timing(celebrationAnim, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        useNativeDriver: true,
      }),
    ]);

    sequence.start(() => {
      createPulse();
      createRotation();
    });
  }, []);

  const handleContinue = () => {
    if (isFirstLesson) {
      // After first lesson, go to main app with lesson system unlocked
      navigation.navigate('Main');
      return;
    }

    // Find the next lesson
    if (!lessonId) {
      navigation.navigate('LessonsMain');
      return;
    }

    // Get all lessons from curriculum
    const lessons = curriculumData.lessons;

    // Find current lesson index
    const currentIndex = lessons.findIndex(l => l.id === lessonId);

    if (currentIndex === -1) {
      // Lesson not found, go back to lessons screen
      navigation.navigate('LessonsMain');
      return;
    }

    const currentLesson = lessons[currentIndex];

    // Find next lesson in the same module
    const nextLessonInModule = lessons.find(
      (l, idx) => idx > currentIndex && l.moduleId === currentLesson.moduleId
    );

    if (nextLessonInModule) {
      // Navigate to next lesson in same module
      log.info('LessonSummaryScreen', 'Navigating to next lesson', { lessonTitle: nextLessonInModule.title });
      navigation.navigate('LessonEngine', {
        lessonId: nextLessonInModule.id,
        moduleId: nextLessonInModule.moduleId,
        isFirstLesson: false
      });
    } else {
      // No more lessons in this module, find first lesson of next module
      const currentModuleIndex = curriculumData.modules.findIndex(m => m.id === currentLesson.moduleId);

      if (currentModuleIndex !== -1 && currentModuleIndex < curriculumData.modules.length - 1) {
        const nextModule = curriculumData.modules[currentModuleIndex + 1];
        const firstLessonInNextModule = lessons.find(l => l.moduleId === nextModule.id);

        if (firstLessonInNextModule) {
          log.info('LessonSummaryScreen', 'Module complete, moving to next module', { moduleTitle: nextModule.title });
          navigation.navigate('LessonEngine', {
            lessonId: firstLessonInNextModule.id,
            moduleId: firstLessonInNextModule.moduleId,
            isFirstLesson: false
          });
        } else {
          // No lessons in next module, go back to lessons screen
          navigation.navigate('LessonsMain');
        }
      } else {
        // All lessons complete! Go back to lessons screen
        log.info('LessonSummaryScreen', 'All lessons complete!');
        navigation.navigate('LessonsMain');
      }
    }
  };

  const getTitle = () => {
    if (passed) return "Lesson Complete!";
    return "Lesson Incomplete";
  };

  const getSubtitle = () => {
    if (accuracy >= 90) return "Perfectly mixed! 🍸";
    if (accuracy >= 80) return "Expertly crafted!";
    if (accuracy >= 70) return "Well mixed!";
    return "Keep practicing!";
  };

  const getPerformanceMessage = () => {
    if (accuracy >= 90) return "Master mixologist level!";
    if (accuracy >= 80) return "Expertly crafted!";
    if (accuracy >= 70) return "Well mixed!";
    return "Keep practicing your technique!";
  };

  const getPerformanceColor = () => {
    if (accuracy >= 90) return '#4CAF50';
    if (accuracy >= 80) return '#8BC34A';
    if (accuracy >= 70) return '#FF9800';
    return '#FF5722';
  };

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

      {/* Celebration particles */}
      <Animated.View
        style={[
          styles.celebrationParticles,
          {
            opacity: celebrationAnim,
            transform: [{
              rotate: rotateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }),
            }],
          },
        ]}
      >
        {[...Array(8)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.particle,
              {
                transform: [
                  { rotate: `${i * 45}deg` },
                  { translateX: 60 },
                ],
              },
            ]}
          />
        ))}
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
        <Animated.View
          style={[
            styles.header,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Text style={styles.title}>Lesson Complete ✅</Text>
          <Text style={styles.lessonSubtitle}>
            Mixology Basics – Glassware 101
          </Text>
        </Animated.View>

        <View style={styles.results}>
          {/* Circular XP Progress Ring */}
          <Animated.View
            style={[
              styles.xpRingContainer,
              {
                transform: [{ scale: accuracyScaleAnim }],
              },
            ]}
          >
            <View style={styles.xpRing}>
              {/* Background circle */}
              <View style={styles.ringBackground} />

              {/* Progress arc */}
              <View style={styles.ringProgress}>
                <View
                  style={[
                    styles.ringFill,
                    {
                      transform: [
                        { rotate: `${-90 + (accuracy * 3.6)}deg` }
                      ]
                    }
                  ]}
                />
              </View>

              {/* Center content */}
              <View style={styles.xpRingContent}>
                <Text style={styles.xpEarnedLabel}>XP Earned</Text>
                <Text style={styles.xpEarnedNumber}>+{xpAwarded} XP</Text>
                <Text style={styles.xpProgress}>{xpAwarded}/1000</Text>
              </View>
            </View>
          </Animated.View>

          {/* Time Spent & Accuracy Stats */}
          <Animated.View
            style={[
              styles.statsRow,
              {
                opacity: statsAnim,
                transform: [{
                  translateY: statsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                }],
              },
            ]}
          >
            {/* Time Spent Card */}
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
                style={styles.statGradient}
              >
                <Text style={styles.statLabel}>Time Spent</Text>
                <Text style={styles.statValue}>7 min</Text>
              </LinearGradient>
            </View>

            {/* Accuracy Card */}
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
                style={styles.statGradient}
              >
                <Text style={styles.statLabel}>Accuracy</Text>
                <Text style={styles.statValue}>{accuracy}%</Text>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Insight Cards */}
          <Animated.View
            style={[
              styles.insightCardsContainer,
              {
                opacity: celebrationAnim,
                transform: [{
                  translateY: celebrationAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                }],
              },
            ]}
          >
            {/* Strength Insight */}
            <View style={styles.insightCard}>
              <LinearGradient
                colors={['rgba(76, 175, 80, 0.15)', 'rgba(76, 175, 80, 0.05)']}
                style={styles.insightGradient}
              >
                <View style={styles.insightIconContainer}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                </View>
                <Text style={styles.insightCardText}>
                  Strong Knowledge in Spirit Types
                </Text>
              </LinearGradient>
            </View>

            {/* Improvement Insight */}
            <View style={styles.insightCard}>
              <LinearGradient
                colors={['rgba(255, 152, 0, 0.15)', 'rgba(255, 152, 0, 0.05)']}
                style={styles.insightGradient}
              >
                <View style={styles.insightIconContainer}>
                  <Ionicons name="refresh-circle" size={20} color="#FF9800" />
                </View>
                <Text style={styles.insightCardText}>
                  Focus More on Glass Pairings
                </Text>
              </LinearGradient>
            </View>
          </Animated.View>
        </View>

        {isFirstLesson && (
          <Animated.View 
            style={[
              styles.welcomeCard,
              {
                opacity: celebrationAnim,
                transform: [{
                  scale: celebrationAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                }],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(76, 175, 80, 0.15)', 'rgba(76, 175, 80, 0.05)']}
              style={styles.welcomeGradient}
            >
              <View style={styles.welcomeTitleContainer}>
                <Ionicons name="school" size={24} color={colors.success} />
                <Text style={styles.welcomeTitle}>Welcome to Bartending School!</Text>
              </View>
              <Text style={styles.welcomeText}>
                You've completed your first lesson! Your personalized learning path is now ready. 
                Keep practicing to unlock premium spirits and earn exclusive badges.
              </Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.actions,
            {
              opacity: celebrationAnim,
              transform: [{
                translateY: celebrationAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              }],
            },
          ]}
        >
          {/* Review Mistakes Button */}
          {incorrectCount > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.reviewButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => {
                // Navigate back to lesson to review mistakes
                if (lessonId && moduleId) {
                  navigation.navigate('LessonEngine', {
                    lessonId,
                    moduleId,
                    isFirstLesson: false
                  });
                }
              }}
            >
              <Text style={styles.reviewButtonText}>Review Mistakes</Text>
            </Pressable>
          )}

          {/* Next Lesson Button */}
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleContinue}
          >
            <LinearGradient
              colors={[colors.gold, colors.accent]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.continueButtonText}>
                {isFirstLesson ? 'Begin Your Journey' : 'Next Lesson'}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Level Up Message */}
          <Text style={styles.levelUpMessage}>
            You're now Level 3 – Bar Apprentice!
          </Text>
        </Animated.View>
        </Animated.View>
      </Animated.ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing(6),
  },
  celebrationParticles: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 120,
    height: 120,
    marginLeft: -60,
    marginTop: -60,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
    opacity: 0.6,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing(2),
    paddingTop: Platform.OS === 'ios' ? spacing(8) : spacing(6),
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing(4),
    paddingHorizontal: spacing(2),
  },
  celebrationIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(215, 161, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(3),
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  lessonSubtitle: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    fontWeight: '500',
  },
  results: {
    marginBottom: spacing(3),
    paddingHorizontal: spacing(1),
  },
  // XP Ring Styles
  xpRingContainer: {
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  xpRing: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringBackground: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 12,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ringProgress: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
  },
  ringFill: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 12,
    borderColor: colors.gold,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  xpRingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpEarnedLabel: {
    fontSize: 12,
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: spacing(0.5),
  },
  xpEarnedNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.gold,
    marginBottom: spacing(0.5),
  },
  xpProgress: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '500',
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: spacing(2),
    marginBottom: spacing(3),
  },
  statCard: {
    flex: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statGradient: {
    padding: spacing(2.5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radii.lg,
  },
  statLabel: {
    fontSize: 13,
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: spacing(1),
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
  },
  // Insight Cards
  insightCardsContainer: {
    gap: spacing(2),
  },
  insightCard: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  insightGradient: {
    padding: spacing(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radii.lg,
  },
  insightIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
  },
  insightCardText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
    lineHeight: 22,
  },
  welcomeCard: {
    borderRadius: radii.lg,
    marginBottom: spacing(3),
    overflow: 'hidden',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  welcomeGradient: {
    padding: spacing(3),
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: radii.lg,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
    textAlign: 'center',
  },
  welcomeTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    justifyContent: 'center',
    marginBottom: spacing(3),
  },
  welcomeText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 26,
    textAlign: 'center',
    fontWeight: '500',
  },
  actions: {
    paddingHorizontal: spacing(1),
    paddingTop: spacing(2),
    paddingBottom: spacing(3),
    gap: spacing(2),
  },
  reviewButton: {
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(4),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  reviewButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  continueButton: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  levelUpMessage: {
    fontSize: 15,
    color: colors.gold,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: spacing(1),
    letterSpacing: 0.3,
  },
  buttonGradient: {
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: colors.goldText,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});