/**
 * Recommendation Feedback Modal
 * Allows users to rate AI recommendations and provide feedback
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { trackRecommendationRating } from '../services/recommendationTrackingService';

interface RecommendationFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  recommendation: {
    id: string;
    cocktailName: string;
    matchScore: number;
    canMakeNow: boolean;
    missingIngredients: string[];
  };
  userId: string;
  context?: {
    timeOfDay: string;
    season: string;
  };
}

export default function RecommendationFeedbackModal({
  visible,
  onClose,
  recommendation,
  userId,
  context,
}: RecommendationFeedbackModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      await trackRecommendationRating(
        userId,
        recommendation,
        rating,
        feedback || undefined,
        context
      );

      Alert.alert(
        'Thank You!',
        'Your feedback helps us improve recommendations for everyone.',
        [{ text: 'OK', onPress: handleClose }]
      );
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setFeedback('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Rate this Recommendation</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Cocktail Name */}
          <Text style={styles.cocktailName}>{recommendation.cocktailName}</Text>

          {/* Star Rating */}
          <View style={styles.ratingSection}>
            <Text style={styles.ratingLabel}>How would you rate this suggestion?</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= rating ? colors.gold : colors.subtext}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={styles.ratingText}>
                {rating === 1 && 'Not helpful'}
                {rating === 2 && 'Could be better'}
                {rating === 3 && 'Okay'}
                {rating === 4 && 'Good recommendation'}
                {rating === 5 && 'Perfect match!'}
              </Text>
            )}
          </View>

          {/* Feedback Text */}
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackLabel}>
              Additional feedback (optional)
            </Text>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Tell us more about your experience..."
              placeholderTextColor={colors.subtext}
              multiline
              numberOfLines={4}
              value={feedback}
              onChangeText={setFeedback}
              maxLength={500}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || rating === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Text>
          </TouchableOpacity>

          {/* Skip Button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(3),
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.line,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  title: {
    fontSize: fonts.h2,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: spacing(0.5),
  },
  cocktailName: {
    fontSize: fonts.h3,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: spacing(3),
    textAlign: 'center',
  },
  ratingSection: {
    marginBottom: spacing(3),
  },
  ratingLabel: {
    fontSize: fonts.body,
    color: colors.text,
    marginBottom: spacing(2),
    textAlign: 'center',
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(1),
    marginBottom: spacing(1),
  },
  starButton: {
    padding: spacing(0.5),
  },
  ratingText: {
    fontSize: fonts.small,
    color: colors.gold,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: spacing(1),
  },
  feedbackSection: {
    marginBottom: spacing(3),
  },
  feedbackLabel: {
    fontSize: fonts.small,
    color: colors.subtext,
    marginBottom: spacing(1),
  },
  feedbackInput: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing(2),
    color: colors.text,
    fontSize: fonts.body,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing(2),
    alignItems: 'center',
    marginBottom: spacing(1.5),
  },
  submitButtonDisabled: {
    backgroundColor: colors.chipBg,
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: fonts.body,
    fontWeight: '700',
    color: colors.white,
  },
  skipButton: {
    paddingVertical: spacing(1.5),
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: fonts.small,
    color: colors.subtext,
  },
});
