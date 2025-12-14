import React, { useState, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radii } from '../theme/tokens';
import { log } from '../lib/logger';

interface FeedbackScreenProps {
  onBack?: () => void;
}

interface FeedbackData {
  type: 'bug' | 'feature' | 'improvement' | 'general';
  rating: number;
  title: string;
  description: string;
  category: string;
  email?: string;
  deviceInfo: {
    platform: string;
    version: string;
    model: string;
  };
  timestamp: Date;
}

const FEEDBACK_TYPES = [
  { key: 'bug', label: 'Bug Report', icon: 'bug-outline', description: 'Something isn\'t working properly' },
  { key: 'feature', label: 'Feature Request', icon: 'lightbulb-outline', description: 'Suggest a new feature' },
  { key: 'improvement', label: 'Improvement', icon: 'trending-up-outline', description: 'Make something better' },
  { key: 'general', label: 'General Feedback', icon: 'chatbubble-outline', description: 'Share your thoughts' },
];

const CATEGORIES = [
  'User Interface',
  'Events',
  'Bars & Venues',
  'Spirits & Education',
  'Profile & Account',
  'Notifications',
  'Performance',
  'Other'
];

export default function FeedbackScreen({ onBack }: FeedbackScreenProps) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<'bug' | 'feature' | 'improvement' | 'general'>('general');
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Send Feedback',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '700' },
      headerShadowVisible: false,
    });
  }, [navigation, onBack]);

  const submitFeedback = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please provide a title for your feedback');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Required Field', 'Please provide a description of your feedback');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Required Field', 'Please select a category');
      return;
    }

    if (selectedType === 'bug' && rating === 0) {
      Alert.alert('Required Field', 'Please rate the severity of this bug');
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackData = {
        type: selectedType,
        rating,
        title: title.trim(),
        description: description.trim(),
        category: selectedCategory,
        email: email.trim() || user?.email || undefined,
        userId: user?.uid || 'anonymous',
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version.toString(),
          model: 'Unknown' // In a real app, you'd get this from a device info library
        },
        status: 'new',
        timestamp: serverTimestamp(),
      };

      // Submit to Firestore
      await addDoc(collection(db, 'feedback'), feedbackData);
      log.info('FeedbackScreen', 'Feedback submitted successfully', { feedbackType: selectedType });

      // Show success message
      Alert.alert(
        'Thank You!',
        'Your feedback has been submitted successfully. We appreciate your input and will review it shortly.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setSelectedType('general');
              setRating(0);
              setTitle('');
              setDescription('');
              setSelectedCategory('');
              setEmail('');
              
              if (onBack) {
                onBack();
              } else {
                navigation.goBack();
              }
            }
          }
        ]
      );

    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarRating = () => {
    const stars = [];
    const maxRating = selectedType === 'bug' ? 5 : 5; // For bugs, it's severity; for others, it's satisfaction
    
    for (let i = 1; i <= maxRating; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          activeOpacity={0.7}
          hitSlop={4}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={32}
            color={i <= rating ? colors.accent : colors.subtext}
          />
        </TouchableOpacity>
      );
    }

    return stars;
  };

  const getRatingLabel = () => {
    if (selectedType === 'bug') {
      const severityLabels = ['', 'Minor', 'Low', 'Medium', 'High', 'Critical'];
      return rating > 0 ? `Severity: ${severityLabels[rating]}` : 'Rate bug severity';
    } else {
      const satisfactionLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
      return rating > 0 ? `Rating: ${satisfactionLabels[rating]}` : 'Rate your experience';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>We Value Your Feedback</Text>
            <Text style={styles.subtitle}>
              Help us improve Home Game Advantage by sharing your thoughts, reporting bugs, or suggesting new features.
            </Text>
          </View>

          {/* Feedback Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What type of feedback is this?</Text>
            <View style={styles.typeGrid}>
              {FEEDBACK_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeCard,
                    selectedType === type.key && styles.selectedTypeCard
                  ]}
                  onPress={() => setSelectedType(type.key as any)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={type.icon as any} 
                    size={28} 
                    color={selectedType === type.key ? colors.goldText : colors.accent} 
                  />
                  <Text style={[
                    styles.typeLabel,
                    selectedType === type.key && styles.selectedTypeLabel
                  ]}>
                    {type.label}
                  </Text>
                  <Text style={[
                    styles.typeDescription,
                    selectedType === type.key && styles.selectedTypeDescription
                  ]}>
                    {type.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{getRatingLabel()}</Text>
            <View style={styles.ratingContainer}>
              {renderStarRating()}
            </View>
            <Text style={styles.ratingHint}>
              {selectedType === 'bug' 
                ? 'How severe is this issue?' 
                : 'How would you rate your overall experience?'
              }
            </Text>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder={`Brief ${selectedType === 'bug' ? 'bug description' : 'summary'}`}
              placeholderTextColor={colors.subtle}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              keyboardAppearance="dark"
            />
            <Text style={styles.characterCount}>{title.length}/100</Text>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category *</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category && styles.selectedCategoryChip
                  ]}
                  onPress={() => setSelectedCategory(category)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === category && styles.selectedCategoryChipText
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.descriptionInput]}
              placeholder={selectedType === 'bug'
                ? 'Steps to reproduce:\n1. Go to...\n2. Tap on...\n3. Expected vs actual result...'
                : 'Tell us more about your feedback, suggestions, or ideas...'
              }
              placeholderTextColor={colors.subtle}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={500}
              keyboardAppearance="dark"
            />
            <Text style={styles.characterCount}>{description.length}/500</Text>
          </View>

          {/* Email (Optional) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Email (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="your.email@example.com"
              placeholderTextColor={colors.subtle}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              keyboardAppearance="dark"
            />
            <Text style={styles.fieldHint}>
              Leave your email if you'd like us to follow up on your feedback
            </Text>
          </View>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <Pressable 
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={submitFeedback}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Text>
            </Pressable>
            
            <Text style={styles.privacyNote}>
              By submitting feedback, you agree to our Privacy Policy. 
              We may use your feedback to improve our services.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing(6),
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(3),
    paddingBottom: spacing(4),
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1),
  },
  subtitle: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: spacing(3),
    marginBottom: spacing(4),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  typeCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  selectedTypeCard: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(1),
    textAlign: 'center',
  },
  selectedTypeLabel: {
    color: colors.goldText,
  },
  typeDescription: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: spacing(0.5),
    textAlign: 'center',
  },
  selectedTypeDescription: {
    color: colors.goldText,
    opacity: 0.8,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(1),
    marginBottom: spacing(1),
  },
  ratingHint: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2.5),
    fontSize: 16,
    color: colors.text,
    minHeight: 54,
  },
  descriptionInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: colors.subtle,
    textAlign: 'right',
    marginTop: spacing(0.5),
  },
  categoriesContainer: {
    gap: spacing(1.5),
  },
  categoryChip: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  selectedCategoryChip: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  selectedCategoryChipText: {
    color: colors.goldText,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: spacing(1),
  },
  submitSection: {
    paddingHorizontal: spacing(3),
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(3),
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: colors.muted,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.goldText,
  },
  privacyNote: {
    fontSize: 12,
    color: colors.subtle,
    textAlign: 'center',
    lineHeight: 16,
  },
});