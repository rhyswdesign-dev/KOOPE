/**
 * Lesson Summary Screen - Level Up Dashboard
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
  Platform,
  SafeAreaView,
  ScrollView
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
import { useUser } from '../../store/useUser';
import { useXPSystem } from '../../store/useXPSystem';

type LessonSummaryScreenProps = {
  navigation: CompositeNavigationProp<
    NativeStackNavigationProp<LessonsStackParamList, 'LessonSummary'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
  route: RouteProp<LessonsStackParamList, 'LessonSummary'>;
};

const { width, height } = Dimensions.get('window');

export default function LessonSummaryScreen({ navigation, route }: LessonSummaryScreenProps) {
  const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
  const {
    xpAwarded = 0,
    correctCount = 0,
    totalCount = 1,
    masteryDelta = 0,
    moduleId,
    lessonId,
    isFirstLesson
  } = route.params;

  // Store hooks - use XPSystem for actual XP balance
  const { completedLessons } = useUser();
  const { balance: totalXP } = useXPSystem();

  // Calculate level from XP (100 XP per level)
  const XP_PER_LEVEL = 100;
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;

  // Calculate progress within current level
  const xpAtCurrentLevelStart = (level - 1) * XP_PER_LEVEL;
  const xpWithinLevel = totalXP - xpAtCurrentLevelStart;
  const xpNeededForNextLevel = XP_PER_LEVEL;
  const progressPercent = (xpWithinLevel / xpNeededForNextLevel) * 100;

  // Ensure the bar doesn't overflow
  const barWidth = Math.min(Math.max(progressPercent, 0), 100);

  // Calculate accuracy with proper validation
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const incorrectCount = totalCount - correctCount;

  // Determine if the lesson was passed (need at least 70% to pass)
  const passed = accuracy >= 70;

  // Dynamic tagline based on performance
  const getTagline = () => {
    if (accuracy === 100) {
      const perfectLines = [
        "Perfect score! You're a natural behind the bar.",
        "Flawless! That's pro-level bartending knowledge.",
        "100%! You're ready to impress any guest.",
      ];
      return perfectLines[Math.floor(Math.random() * perfectLines.length)];
    } else if (accuracy >= 90) {
      const excellentLines = [
        "Outstanding! You've got serious skills.",
        "Almost perfect — you're crushing it!",
        "Impressive knowledge! Keep that momentum.",
      ];
      return excellentLines[Math.floor(Math.random() * excellentLines.length)];
    } else if (accuracy >= 70) {
      const goodLines = [
        "Nice work! You're building solid foundations.",
        "You passed! Your bar knowledge is growing.",
        "Good job — practice makes perfect pours.",
      ];
      return goodLines[Math.floor(Math.random() * goodLines.length)];
    } else {
      const encourageLines = [
        "Keep practicing — every bartender starts somewhere.",
        "Don't give up! Review and try again.",
        "Learning takes time — you've got this!",
      ];
      return encourageLines[Math.floor(Math.random() * encourageLines.length)];
    }
  };

  // Enhanced animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content', true);

    // Orchestrated entrance animation
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
    ]).start();
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background */}
      <View style={styles.background}>
        <LinearGradient
          colors={['#1A120D', '#0F0A08']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>KŌOPE</Text>
          </View>

          <Text style={styles.tagline}>{getTagline()}</Text>

          {/* Level Info */}
          <View style={styles.levelContainer}>
            <Text style={[styles.levelTitle, { fontFamily: serifFont }]}>Level {level} – Bar Apprentice</Text>
            <Text style={styles.levelUpText}>LEVEL UP!</Text>
          </View>

          {/* XP Info */}
          <View style={styles.xpResultContainer}>
            <Text style={styles.xpEarnedText}>+{xpAwarded} XP Earned</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>Level Progress</Text>
              <Text style={styles.progressLabel}>{xpWithinLevel} / {xpNeededForNextLevel}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${barWidth}%` }]} />
            </View>
            <Text style={styles.nextLevelLabel}>to Level {level + 1} ({totalXP} XP total)</Text>
          </View>

          {/* Insights */}
          <Text style={[styles.sectionTitle, { fontFamily: serifFont }]}>Insights</Text>
          <View style={styles.insightsGrid}>
            <View style={styles.insightCard}>
              <View style={styles.insightIconRow}>
                <Ionicons name="book-outline" size={24} color={colors.accent} />
              </View>
              <Text style={[styles.insightValue, { fontFamily: serifFont }]}>{completedLessons.length}</Text>
              <Text style={styles.insightLabel}>Lessons Completed</Text>
            </View>
            <View style={styles.insightCard}>
              <View style={styles.insightIconRow}>
                <Ionicons name="locate-outline" size={24} color={colors.accent} />
              </View>
              <Text style={[styles.insightValue, { fontFamily: serifFont }]}>{accuracy}%</Text>
              <Text style={styles.insightLabel}>Accuracy</Text>
            </View>
          </View>

          <View style={{ flex: 1 }} />

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}
              onPress={handleContinue}
            >
              <Text style={styles.primaryButtonText}>Continue Learning</Text>
            </Pressable>

            {incorrectCount > 0 && (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  if (lessonId && moduleId) {
                    navigation.navigate('LessonEngine', {
                      lessonId,
                      moduleId,
                      isFirstLesson: false
                    });
                  }
                }}
              >
                <Text style={styles.secondaryButtonText}>Review Missed Questions</Text>
              </Pressable>
            )}
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Botton Nav Mockup Removed */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: spacing(5),
    opacity: 0.9,
    lineHeight: 24,
  },
  levelContainer: {
    alignItems: 'center',
    marginBottom: spacing(6),
  },
  levelTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  levelUpText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  xpResultContainer: {
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  xpEarnedText: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: '600',
    opacity: 0.9,
  },
  progressSection: {
    marginBottom: spacing(6),
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing(1),
  },
  progressLabel: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '500',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing(1),
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  nextLevelLabel: {
    fontSize: 12,
    color: colors.subtext,
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: spacing(2),
    marginBottom: spacing(4),
  },
  insightCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
    minHeight: 110,
    justifyContent: 'center',
  },
  insightIconRow: {
    marginBottom: spacing(1.5),
  },
  insightValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '500',
    lineHeight: 18,
  },
  actions: {
    paddingBottom: spacing(4),
    gap: spacing(2),
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});