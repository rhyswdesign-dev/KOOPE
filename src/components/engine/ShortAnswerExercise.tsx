/**
 * Short Answer Exercise Component
 * Text input with case/whitespace normalization and hints
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { ExerciseCommonProps } from './OrderExercise';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/tokens';
import { getShortAnswerHint, isShortAnswerCorrect, normalizeShortAnswer } from '../../utils/exerciseValidation';

export default function ShortAnswerExercise({ item, onResult, disabled = false }: ExerciseCommonProps): React.JSX.Element {
  const [userAnswer, setUserAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [startTime] = useState(Date.now());

  // Reset state when item changes
  useEffect(() => {
    setUserAnswer('');
    setAnswered(false);
    setAttempts(0);
    setShowHint(false);
  }, [item.id]); // Depend on item.id to reset when question changes

  const checkAnswer = (): boolean => {
    return isShortAnswerCorrect(userAnswer, item as any);
  };

  const handleSubmit = () => {
    if (answered || disabled || !userAnswer.trim()) return;
    
    const isCorrect = checkAnswer();
    const timeToAnswer = Date.now() - startTime;
    const newAttempts = attempts + 1;
    
    setAttempts(newAttempts);
    
    if (isCorrect) {
      setAnswered(true);
      setTimeout(() => {
        onResult({ correct: true, msToAnswer: timeToAnswer });
      }, 320);
    } else {
      // Show hint after 2 failed attempts
      if (newAttempts >= 2) {
        setShowHint(true);
      }
      
      // After 3 attempts, mark as answered and show correct answer
      if (newAttempts >= 3) {
        setAnswered(true);
        setTimeout(() => {
          onResult({ correct: false, msToAnswer: timeToAnswer });
        }, 480);
      }
    }
  };

  const handleRetry = () => {
    setUserAnswer('');
    // Don't reset attempts - keep building toward hint
  };

  const getHint = (): string => {
    return getShortAnswerHint(item as any);
  };

  const getPlaceholder = (): string => {
    if (attempts === 0) {
      return 'Type your answer...';
    } else if (attempts === 1) {
      return 'Try again...';
    } else {
      return 'One more try...';
    }
  };

  const promptText = item.prompt?.trim() || 'Enter your answer below.';
  const normalizedShort = normalizeShortAnswer(item as any);
  const answerLength = normalizedShort.answerText?.length || 0;

  return (
    <View style={styles.container}>
      <View style={styles.questionCard}>
        <Text style={styles.questionLabel}>Question</Text>
        <Text style={styles.prompt}>{promptText}</Text>
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            answered && (checkAnswer() ? styles.correctInput : styles.incorrectInput)
          ]}
          value={userAnswer}
          onChangeText={setUserAnswer}
          placeholder={getPlaceholder()}
          placeholderTextColor={colors.subtext}
          editable={!answered && !disabled}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
        />
        
        {!answered && (
          <Pressable
            style={[
              styles.submitButton,
              (!userAnswer.trim() || disabled) && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={!userAnswer.trim() || disabled}
          >
            <Text style={styles.submitButtonText}>
              {attempts === 0 ? 'Submit' : 'Try Again'}
            </Text>
          </Pressable>
        )}
      </View>

      {showHint && !answered && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintLabel}>Hint:</Text>
          <Text style={styles.hintText}>{getHint()}</Text>
          <Text style={styles.hintSubtext}>
            {answerLength} letters
          </Text>
        </View>
      )}

      {answered && (
        <View style={styles.feedback}>
          <View style={styles.feedbackContent}>
            <Ionicons 
              name={checkAnswer() ? 'checkmark-circle' : 'close-circle'} 
              size={24} 
              color={checkAnswer() ? colors.success : colors.error} 
            />
            <Text style={[
              styles.feedbackText,
              checkAnswer() ? styles.correctText : styles.incorrectText
            ]}>
              {checkAnswer() ? 'Correct!' : 'Incorrect'}
            </Text>
          </View>
          
          {!checkAnswer() && (
            <View style={styles.correctAnswerContainer}>
              <Text style={styles.correctAnswerLabel}>Correct answer:</Text>
              <Text style={styles.correctAnswerText}>
                {normalizedShort.answerText}
              </Text>
            </View>
          )}
          
          {!checkAnswer() && attempts < 3 && (
            <Pressable style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          )}
        </View>
      )}
      
      {attempts > 0 && !answered && (
        <View style={styles.attemptsContainer}>
          <Text style={styles.attemptsText}>
            Attempt {attempts} of 3
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  questionCard: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  questionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    textAlign: 'center',
    marginBottom: 6,
  },
  prompt: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
    gap: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    textAlign: 'center',
    color: colors.text,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  correctInput: {
    borderColor: colors.success,
    backgroundColor: 'rgba(76,175,80,0.12)',
  },
  incorrectInput: {
    borderColor: colors.error,
    backgroundColor: 'rgba(244,67,54,0.12)',
  },
  submitButton: {
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  submitButtonText: {
    color: colors.goldText,
    fontSize: 16,
    fontWeight: '600',
  },
  hintContainer: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    alignItems: 'center',
  },
  hintLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.subtext,
    marginBottom: 8,
  },
  hintText: {
    fontSize: 24,
    fontFamily: 'monospace',
    letterSpacing: 2,
    color: colors.text,
    marginBottom: 4,
  },
  hintSubtext: {
    fontSize: 12,
    color: colors.subtext,
  },
  feedback: {
    alignItems: 'center',
    gap: 12,
  },
  feedbackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  correctText: {
    color: colors.success,
  },
  incorrectText: {
    color: colors.error,
  },
  correctAnswerContainer: {
    alignItems: 'center',
    gap: 4,
  },
  correctAnswerLabel: {
    fontSize: 14,
    color: colors.subtext,
  },
  correctAnswerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  retryButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: colors.goldText,
    fontSize: 14,
    fontWeight: '600',
  },
  attemptsContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  attemptsText: {
    fontSize: 12,
    color: colors.subtext,
  },
});
