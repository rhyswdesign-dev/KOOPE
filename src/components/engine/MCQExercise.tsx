/**
 * Multiple Choice Question Exercise
 * Standardized with MatchExercise design patterns
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { Item } from '../../types/domain';
import { colors, spacing, radii } from '../../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';

export interface MCQExerciseProps {
  item: Item;
  onResult: (result: { correct: boolean; msToAnswer: number }) => void;
}

export const MCQExercise: React.FC<MCQExerciseProps> = ({ item, onResult }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [startTime] = useState(Date.now());

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const optionAnims = useRef(item.options?.map(() => new Animated.Value(1)) || []).current;

  // Reset state when item changes
  useEffect(() => {
    setSelectedOption(null);
    setSubmitted(false);

    // Reset animations
    fadeAnim.setValue(0);
    optionAnims.forEach(anim => anim.setValue(0));

    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.stagger(30,
        optionAnims.map(anim =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          })
        )
      ),
    ]).start();
  }, [item.id]);

  const handleOptionPress = (optionIndex: number) => {
    if (submitted) return;
    setSelectedOption(optionIndex);
  };

  const handleSubmit = () => {
    if (selectedOption === null || submitted) return;

    setSubmitted(true);
    const isCorrect = selectedOption === item.answerIndex;
    const timeToAnswer = Date.now() - startTime;

    setTimeout(() => {
      onResult({ correct: isCorrect, msToAnswer: timeToAnswer });
    }, 280);
  };

  const allMatched = selectedOption !== null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      {!!item.roleplay && (
        <View style={styles.roleplayBadge}>
          <Text style={styles.roleplayBadgeText}>Roleplay</Text>
        </View>
      )}
      <Text style={styles.prompt}>{item.prompt}</Text>

      <View style={styles.optionsList}>
        {item.options?.map((option, index) => {
          const isSelected = selectedOption === index;

          return (
            <Animated.View
              key={index}
              style={[
                styles.optionWrapper,
                {
                  opacity: optionAnims[index],
                  transform: [{
                    scale: optionAnims[index],
                  }],
                },
              ]}
            >
              <Pressable
                style={[
                  styles.option,
                  isSelected && styles.optionSelected,
                ]}
                onPress={() => handleOptionPress(index)}
                disabled={submitted}
              >
                <Text style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}>
                  {option}
                </Text>
                {isSelected && (
                  <View style={styles.selectionDot} />
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <Text style={styles.footerInstruction}>
        Select your answer, then tap "Check Answer" below.
      </Text>

      <Pressable
        style={[styles.submitButton, !allMatched && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!allMatched || submitted}
      >
        <LinearGradient
          colors={allMatched ? [colors.gold, colors.accentDark] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
          style={styles.submitGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={[styles.submitText, !allMatched && styles.submitTextDisabled]}>
            CHECK ANSWER
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: spacing(1),
  },
  roleplayBadge: {
    alignSelf: 'center',
    marginBottom: spacing(1.5),
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.full,
    backgroundColor: 'rgba(214, 138, 56, 0.14)',
    borderWidth: 1,
    borderColor: `${colors.gold}55`,
  },
  roleplayBadgeText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  prompt: {
    fontSize: 24,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(5),
    lineHeight: 30,
  },
  optionsList: {
    gap: spacing(2),
    marginBottom: spacing(4),
  },
  optionWrapper: {
    width: '100%',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(2),
  },
  optionSelected: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(214, 138, 56, 0.05)',
  },
  optionText: {
    fontSize: 16,
    color: colors.subtext,
    flex: 1,
    lineHeight: 22,
  },
  optionTextSelected: {
    color: colors.text,
    fontWeight: '500',
  },
  selectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
    marginLeft: 12,
  },
  footerInstruction: {
    fontStyle: 'italic',
    color: colors.muted,
    textAlign: 'center',
    fontSize: 14,
    marginBottom: spacing(3),
    fontFamily: Platform.OS === 'ios' ? 'Georgia-Italic' : 'serif',
  },
  submitButton: {
    borderRadius: radii.full,
    overflow: 'hidden',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginHorizontal: spacing(4),
  },
  submitButtonDisabled: {
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitGradient: {
    paddingVertical: spacing(2),
    alignItems: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A120D',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  submitTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
});
