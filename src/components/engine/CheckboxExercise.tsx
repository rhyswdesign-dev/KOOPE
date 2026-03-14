/**
 * Checkbox Exercise Component
 * Multi-select with visual checkmarks
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../theme/tokens';
import { Item } from '../../types/domain';

interface CheckboxExerciseProps {
  item: Item;
  onResult: (result: { correct: boolean; msToAnswer: number }) => void;
}

export const CheckboxExercise: React.FC<CheckboxExerciseProps> = ({ item, onResult }) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [startTime] = useState(Date.now());

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const optionAnims = useRef(item.options?.map(() => new Animated.Value(1)) || []).current;

  useEffect(() => {
    setSelectedOptions([]);
    setSubmitted(false);

    fadeAnim.setValue(0);
    optionAnims.forEach(anim => anim.setValue(0));

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

  const handleOptionPress = (option: string) => {
    if (submitted) return;

    setSelectedOptions(prev => {
      if (prev.includes(option)) {
        return prev.filter(o => o !== option);
      } else {
        return [...prev, option];
      }
    });
  };

  const handleSubmit = () => {
    if (submitted || selectedOptions.length === 0) return;

    setSubmitted(true);
    const msToAnswer = Date.now() - startTime;
    const correctAnswers = item.correct || [];

    const selectedSet = new Set(selectedOptions);
    const correctSet = new Set(correctAnswers);

    const isCorrect = selectedSet.size === correctSet.size &&
      [...selectedSet].every(option => correctSet.has(option));

    setTimeout(() => {
      onResult({
        correct: isCorrect,
        msToAnswer
      });
    }, 800);
  };

  const isOptionSelected = (option: string) => selectedOptions.includes(option);
  const canSubmit = selectedOptions.length > 0;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <Text style={styles.prompt}>{item.prompt}</Text>

      <View style={styles.optionsContainer}>
        {item.options?.map((option, index) => {
          const isSelected = isOptionSelected(option);

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
                style={({ pressed }) => [
                  styles.optionButton,
                  isSelected && styles.optionButtonSelected,
                  pressed && !submitted && styles.optionPressed,
                ]}
                onPress={() => handleOptionPress(option)}
                disabled={submitted}
              >
                <LinearGradient
                  colors={
                    isSelected
                      ? ['rgba(215, 161, 94, 0.2)', 'rgba(228, 147, 62, 0.1)']
                      : ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']
                  }
                  style={styles.optionGradient}
                >
                  <View style={styles.optionContent}>
                    <Text style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected
                    ]}>
                      {option}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
                    )}
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {!submitted && (
        <Pressable
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <LinearGradient
            colors={canSubmit
              ? [colors.gold, colors.accent]
              : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
            }
            style={styles.submitGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[
              styles.submitText,
              !canSubmit && styles.submitTextDisabled
            ]}>
              CHECK ANSWERS
            </Text>
          </LinearGradient>
        </Pressable>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
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
  optionsContainer: {
    gap: spacing(1.5),
    marginBottom: spacing(4),
  },
  optionWrapper: {
    width: '100%',
  },
  optionButton: {
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  optionButtonSelected: {
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  optionPressed: {
    transform: [{ scale: 0.98 }],
  },
  optionGradient: {
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(2),
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  optionTextSelected: {
    color: colors.gold,
    fontWeight: '700',
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

export default CheckboxExercise;
