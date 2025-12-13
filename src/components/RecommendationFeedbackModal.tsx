/**
 * Recommendation Feedback Modal
 * Allows users to provide thumbs up/down feedback on AI recommendations
 * Phase 2: Simplified feedback with conditional detailed options
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { trackRecommendationRating } from '../services/recommendationTrackingService';
import { updateProfileFromFeedback } from '../services/feedbackLearningService';
import { usePersonalization } from '../store/usePersonalization';
import { log } from '../lib/logger';

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

type FeedbackOption = {
  id: string;
  label: string;
  icon: string;
};

const POSITIVE_FEEDBACK_OPTIONS: FeedbackOption[] = [
  { id: 'perfect_taste', label: 'Perfect for my taste', icon: 'heart' },
  { id: 'had_ingredients', label: 'Had all ingredients', icon: 'checkmark-circle' },
  { id: 'love_spirit', label: 'Love this spirit', icon: 'wine' },
  { id: 'good_match', label: 'Great match!', icon: 'star' },
];

const NEGATIVE_FEEDBACK_OPTIONS: FeedbackOption[] = [
  { id: 'too_complex', label: 'Too complex', icon: 'alert-circle' },
  { id: 'missing_ingredients', label: "Don't have ingredients", icon: 'close-circle' },
  { id: 'not_my_taste', label: 'Not my taste', icon: 'thumbs-down' },
  { id: 'wrong_spirit', label: "Don't like this spirit", icon: 'remove-circle' },
];

export default function RecommendationFeedbackModal({
  visible,
  onClose,
  recommendation,
  userId,
  context,
}: RecommendationFeedbackModalProps) {
  const [liked, setLiked] = useState<boolean | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { profile, updateProfile } = usePersonalization();

  const handleThumbsUp = () => {
    setLiked(true);
    setSelectedReasons([]); // Clear any previous selections
  };

  const handleThumbsDown = () => {
    setLiked(false);
    setSelectedReasons([]); // Clear any previous selections
  };

  const toggleReason = (reasonId: string) => {
    if (selectedReasons.includes(reasonId)) {
      setSelectedReasons(selectedReasons.filter(r => r !== reasonId));
    } else {
      setSelectedReasons([...selectedReasons, reasonId]);
    }
  };

  const handleSubmit = async () => {
    // Require at least one reason for thumbs down
    if (liked === false && selectedReasons.length === 0) {
      Alert.alert(
        'Feedback Required',
        'Please select at least one reason to help us improve.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert thumbs up/down to a rating equivalent for backward compatibility
      // Thumbs up = 5 stars, Thumbs down = 1 star
      const rating = liked ? 5 : 1;

      // Build feedback string from selected reasons
      const feedbackText = selectedReasons.length > 0
        ? selectedReasons.map(id => {
            const option = liked
              ? POSITIVE_FEEDBACK_OPTIONS.find(o => o.id === id)
              : NEGATIVE_FEEDBACK_OPTIONS.find(o => o.id === id);
            return option?.label || id;
          }).join(', ')
        : undefined;

      // Update taste profile weights based on feedback (Phase 2 Enhancement #3)
      if (profile && liked !== null) {
        log.info('RecommendationFeedbackModal', 'Updating taste profile from feedback');
        const profileUpdates = updateProfileFromFeedback(
          profile,
          recommendation,
          liked,
          selectedReasons
        );
        await updateProfile(profileUpdates);
        log.info('RecommendationFeedbackModal', 'Taste profile updated successfully');
      }

      // Track the feedback in Firebase
      await trackRecommendationRating(
        userId,
        recommendation,
        rating,
        feedbackText,
        context
      );

      const message = liked
        ? "Thanks! We'll show you more cocktails like this."
        : "Thanks for the feedback! We'll improve your recommendations.";

      Alert.alert(
        'Feedback Received',
        message,
        [{ text: 'OK', onPress: handleClose }]
      );
    } catch (error) {
      log.error('RecommendationFeedbackModal', 'Error submitting feedback', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setLiked(null);
    setSelectedReasons([]);
    onClose();
  };

  const feedbackOptions = liked === true
    ? POSITIVE_FEEDBACK_OPTIONS
    : liked === false
    ? NEGATIVE_FEEDBACK_OPTIONS
    : [];

  const showFeedbackOptions = liked !== null;
  const canSubmit = liked !== null && (liked === true || selectedReasons.length > 0);

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
            <Text style={styles.title}>
              {liked === null ? 'Rate this Recommendation' : liked ? 'What did you like?' : 'Help us improve'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Cocktail Name */}
          <Text style={styles.cocktailName}>{recommendation.cocktailName}</Text>

          {/* Thumbs Up/Down */}
          <View style={styles.thumbsSection}>
            <Text style={styles.thumbsLabel}>
              {liked === null ? 'Did you like this recommendation?' : 'Your rating'}
            </Text>
            <View style={styles.thumbsButtons}>
              <TouchableOpacity
                style={[
                  styles.thumbButton,
                  liked === true && styles.thumbButtonSelected,
                  liked === true && styles.thumbButtonLiked,
                ]}
                onPress={handleThumbsUp}
                activeOpacity={0.7}
                disabled={isSubmitting}
              >
                <Ionicons
                  name="thumbs-up"
                  size={48}
                  color={liked === true ? colors.white : colors.subtext}
                />
                <Text style={[
                  styles.thumbButtonText,
                  liked === true && styles.thumbButtonTextSelected
                ]}>
                  Yes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.thumbButton,
                  liked === false && styles.thumbButtonSelected,
                  liked === false && styles.thumbButtonDisliked,
                ]}
                onPress={handleThumbsDown}
                activeOpacity={0.7}
                disabled={isSubmitting}
              >
                <Ionicons
                  name="thumbs-down"
                  size={48}
                  color={liked === false ? colors.white : colors.subtext}
                />
                <Text style={[
                  styles.thumbButtonText,
                  liked === false && styles.thumbButtonTextSelected
                ]}>
                  No
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Feedback Options (conditional) */}
          {showFeedbackOptions && (
            <ScrollView style={styles.feedbackOptionsSection} showsVerticalScrollIndicator={false}>
              <Text style={styles.feedbackOptionsLabel}>
                {liked ? 'Why did you like it? (optional)' : 'Why not? (select at least one)'}
              </Text>
              <View style={styles.feedbackOptions}>
                {feedbackOptions.map((option) => {
                  const isSelected = selectedReasons.includes(option.id);
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.feedbackOption,
                        isSelected && styles.feedbackOptionSelected,
                        liked === true && isSelected && styles.feedbackOptionLiked,
                        liked === false && isSelected && styles.feedbackOptionDisliked,
                      ]}
                      onPress={() => toggleReason(option.id)}
                      activeOpacity={0.7}
                      disabled={isSubmitting}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={isSelected ? colors.white : colors.text}
                      />
                      <Text style={[
                        styles.feedbackOptionText,
                        isSelected && styles.feedbackOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={colors.white}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Submit Button */}
          {showFeedbackOptions && (
            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting || !canSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Skip Button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleClose}
            activeOpacity={0.7}
            disabled={isSubmitting}
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
    maxHeight: '80%',
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
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    padding: spacing(0.5),
  },
  cocktailName: {
    fontSize: fonts.h2,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing(3),
    textAlign: 'center',
  },
  thumbsSection: {
    marginBottom: spacing(3),
  },
  thumbsLabel: {
    fontSize: fonts.body,
    color: colors.text,
    marginBottom: spacing(2),
    textAlign: 'center',
    fontWeight: '600',
  },
  thumbsButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(3),
  },
  thumbButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(2),
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.line,
    minWidth: 120,
    gap: spacing(1),
  },
  thumbButtonSelected: {
    borderColor: 'transparent',
  },
  thumbButtonLiked: {
    backgroundColor: '#22c55e', // Green
  },
  thumbButtonDisliked: {
    backgroundColor: '#ef4444', // Red
  },
  thumbButtonText: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.subtext,
  },
  thumbButtonTextSelected: {
    color: colors.white,
  },
  feedbackOptionsSection: {
    maxHeight: 280,
    marginBottom: spacing(2),
  },
  feedbackOptionsLabel: {
    fontSize: fonts.small,
    color: colors.text,
    marginBottom: spacing(1.5),
    fontWeight: '600',
  },
  feedbackOptions: {
    gap: spacing(1),
  },
  feedbackOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    padding: spacing(2),
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  feedbackOptionSelected: {
    borderColor: 'transparent',
  },
  feedbackOptionLiked: {
    backgroundColor: '#22c55e',
  },
  feedbackOptionDisliked: {
    backgroundColor: '#ef4444',
  },
  feedbackOptionText: {
    flex: 1,
    fontSize: fonts.body,
    color: colors.text,
    fontWeight: '500',
  },
  feedbackOptionTextSelected: {
    color: colors.white,
    fontWeight: '600',
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
