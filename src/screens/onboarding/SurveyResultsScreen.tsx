/**
 * Survey Results Screen - Shows placement results and explanation
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { getPlacement, SurveyAnswers } from '../../services/placement';
import { PlacementResult } from '../../types/domain';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/tokens';
import { usePersonalization } from '../../store/usePersonalization';
import { log } from '../../lib/logger';

type SurveyResultsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SurveyResults'>;
  route: RouteProp<RootStackParamList, 'SurveyResults'>;
};

export default function SurveyResultsScreen({ navigation, route }: SurveyResultsScreenProps) {
  const [placement, setPlacement] = useState<PlacementResult | null>(null);
  const { answers } = route.params;
  const { initializeFromSurvey } = usePersonalization();

  useEffect(() => {
    // Calculate placement from survey answers
    const result = getPlacement(answers);
    setPlacement(result);

    // Initialize personalization system with survey responses
    initializeFromSurvey(answers);

    log.info('SurveyResultsScreen', 'Placement result and personalization initialized', { result, level: result.level });
  }, [answers, initializeFromSurvey]);

  const handleStartLearning = () => {
    if (placement) {
      // Navigate to the lessons tree where users can see their recommended starting point
      navigation.navigate('Lessons');
    }
  };

  if (!placement) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Analyzing your responses...</Text>
      </View>
    );
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return '#4CAF50';
      case 'intermediate': return '#FF9800';
      case 'advanced': return '#9C27B0';
      default: return '#666';
    }
  };

  const getTrackIcon = (track: string) => {
    switch (track) {
      case 'alcoholic': return 'wine';
      case 'low-abv': return 'beer';
      case 'zero-proof': return 'cafe';
      default: return 'wine';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Bartending Profile</Text>
          <Text style={styles.subtitle}>Based on your responses, here's your personalized learning path</Text>
        </View>

        <View style={styles.results}>
          <View style={styles.levelCard}>
            <View style={[styles.levelBadge, { backgroundColor: getLevelColor(placement.level) }]}>
              <Text style={styles.levelText}>{placement.level.toUpperCase()}</Text>
            </View>
            <Text style={styles.levelDescription}>
              {placement.level === 'beginner' && 'Perfect for getting started with the fundamentals'}
              {placement.level === 'intermediate' && 'You have some experience - let\'s build on that!'}
              {placement.level === 'advanced' && 'You know your way around - let\'s refine your skills'}
            </Text>
          </View>

          <View style={styles.trackCard}>
            <View style={styles.trackIconContainer}>
              <Ionicons name={getTrackIcon(placement.track) as any} size={32} color={colors.primary} />
            </View>
            <Text style={styles.trackTitle}>
              {placement.track === 'alcoholic' && 'Classic Cocktails'}
              {placement.track === 'low-abv' && 'Low-ABV Focus'}
              {placement.track === 'zero-proof' && 'Zero-Proof Specialist'}
            </Text>
            <Text style={styles.trackDescription}>
              {placement.track === 'alcoholic' && 'Traditional cocktails with full alcohol content'}
              {placement.track === 'low-abv' && 'Lower alcohol options for mindful drinking'}
              {placement.track === 'zero-proof' && 'Sophisticated alcohol-free beverages'}
            </Text>
          </View>

          {placement.spirits.length > 0 && (
            <View style={styles.spiritsCard}>
              <Text style={styles.spiritsTitle}>Your Spirit Focus</Text>
              <View style={styles.spiritsList}>
                {placement.spirits.map((spirit, index) => (
                  <View key={spirit} style={styles.spiritTag}>
                    <Text style={styles.spiritText}>{spirit}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.sessionCard}>
            <Text style={styles.sessionTitle}>Session Length</Text>
            <Text style={styles.sessionTime}>{placement.sessionMinutes} minutes</Text>
            <Text style={styles.sessionDescription}>Perfect bite-sized lessons for your schedule</Text>
          </View>
        </View>

        <View style={styles.interlude}>
          <Text style={styles.interludeText}>{placement.interlude}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.startButton}
          onPress={handleStartLearning}
        >
          <Text style={styles.startButtonText}>View Lessons Tree</Text>
        </Pressable>
        
        <Text style={styles.nextStepsText}>
          Your personalized learning path is ready! Head to the lessons tree to start your bartending journey.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  results: {
    gap: 16,
    marginBottom: 32,
  },
  levelCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  levelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  levelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  levelDescription: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
  },
  trackCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  trackIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  trackDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  spiritsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
  },
  spiritsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  spiritsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  spiritTag: {
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  spiritText: {
    fontSize: 14,
    color: '#333',
    textTransform: 'capitalize',
  },
  sessionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 4,
  },
  sessionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  interlude: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  interludeText: {
    fontSize: 16,
    color: '#1976d2',
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actions: {
    padding: 24,
    paddingTop: 0,
    gap: 12,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  nextStepsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
});