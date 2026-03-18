// @ts-nocheck
/**
 * Animation Demo Component
 * Demonstrates the various completion animations available
 * This can be used for testing or as examples for other developers
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { CompletionAnimation } from './CompletionAnimation';
import { QuickFeedbackAnimation } from './QuickFeedbackAnimation';
import { colors, spacing, radii } from '../../theme/tokens';

export const AnimationDemo: React.FC = () => {
  const [activeAnimation, setActiveAnimation] = useState<{
    type: 'completion' | 'quick';
    subtype: string;
  } | null>(null);

  const completionAnimationTypes = [
    { type: 'question_correct', label: 'Question Correct' },
    { type: 'lesson_complete', label: 'Lesson Complete' },
    { type: 'perfect_score', label: 'Perfect Score' },
    { type: 'first_lesson', label: 'First Lesson' },
    { type: 'streak', label: 'Streak' },
    { type: 'level_up', label: 'Level Up' },
  ] as const;

  const quickFeedbackTypes = [
    { type: 'correct', label: 'Correct Answer' },
    { type: 'incorrect', label: 'Incorrect Answer' },
    { type: 'streak', label: 'Streak (3 in a row)' },
  ] as const;

  const showCompletionAnimation = (type: any) => {
    setActiveAnimation({ type: 'completion', subtype: type });
  };

  const showQuickFeedback = (type: any) => {
    setActiveAnimation({ type: 'quick', subtype: type });
  };

  const hideAnimation = () => {
    setActiveAnimation(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Animation Demo</Text>
        <Text style={styles.subtitle}>
          Test the various celebration and feedback animations
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completion Animations</Text>
          <Text style={styles.sectionDescription}>
            Full-screen celebrations for major achievements
          </Text>
          <View style={styles.buttonGrid}>
            {completionAnimationTypes.map((item) => (
              <Pressable
                key={item.type}
                style={styles.button}
                onPress={() => showCompletionAnimation(item.type)}
              >
                <Text style={styles.buttonText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Feedback</Text>
          <Text style={styles.sectionDescription}>
            Brief animations for immediate answer feedback
          </Text>
          <View style={styles.buttonGrid}>
            {quickFeedbackTypes.map((item) => (
              <Pressable
                key={item.type}
                style={[styles.button, styles.secondaryButton]}
                onPress={() => showQuickFeedback(item.type)}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage Examples</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>
              {`// Lesson completion
completionAnimation.showLessonComplete(85, 75);

// Question feedback
setQuickFeedbackType('correct');
setShowQuickFeedback(true);

// Perfect score
completionAnimation.showAnimation('perfect_score', {
  message: 'Outstanding!',
  score: 100,
  xpAwarded: 100
});`}
            </Text>
          </View>
        </View>
      </View>

      {/* Completion Animation */}
      <CompletionAnimation
        type={activeAnimation?.subtype as any}
        visible={activeAnimation?.type === 'completion'}
        onComplete={hideAnimation}
        message="Demo animation!"
        score={activeAnimation?.subtype === 'perfect_score' ? 100 : 85}
        xpAwarded={activeAnimation?.subtype === 'perfect_score' ? 100 : 50}
      />

      {/* Quick Feedback Animation */}
      <QuickFeedbackAnimation
        type={activeAnimation?.subtype as any}
        visible={activeAnimation?.type === 'quick'}
        onComplete={hideAnimation}
        streakCount={activeAnimation?.subtype === 'streak' ? 3 : undefined}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing(4),
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing(6),
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing(6),
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(2),
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing(4),
    lineHeight: 20,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderRadius: radii.medium,
    marginRight: spacing(2),
    marginBottom: spacing(2),
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
  },
  buttonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: colors.white,
  },
  codeBlock: {
    backgroundColor: colors.card,
    padding: spacing(4),
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
});

export default AnimationDemo;