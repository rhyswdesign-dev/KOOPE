/**
 * Survey Screen - 15-question placement survey
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Survey } from '../../components/onboarding/Survey';
import { SurveyAnswers } from '../../services/placement';
import { colors } from '../../theme/tokens';

type SurveyScreenProps = {
  navigation?: NativeStackNavigationProp<RootStackParamList, 'Survey'>;
  onComplete?: () => void;
};

export default function SurveyScreen({ navigation, onComplete }: SurveyScreenProps) {
  const handleSurveyComplete = (answers: SurveyAnswers) => {
    if (navigation) {
      // Navigate to results screen with answers (when used within navigation)
      navigation.navigate('SurveyResults', { answers });
    } else if (onComplete) {
      // Call onComplete when used in onboarding flow
      onComplete();
    }
  };

  return (
    <View style={styles.container}>
      <Survey onComplete={handleSurveyComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
});