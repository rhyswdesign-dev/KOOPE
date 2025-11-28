/**
 * Lesson Engine Screen - Main lesson learning interface
 */

import React, { useLayoutEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { LessonEngine } from '../../components/engine/LessonEngine';
import { useUser } from '../../store/useUser';
import RequirePro from '../../components/RequirePro';

type LessonEngineScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LessonEngine'>;
  route: RouteProp<RootStackParamList, 'LessonEngine'>;
};

export default function LessonEngineScreen({ navigation, route }: LessonEngineScreenProps) {
  const { lessonId, isFirstLesson, moduleId, level } = route.params as any;
  const { lives } = useUser();

  // Determine if this lesson requires Pro subscription
  // Level 1 is free, Level 2+ requires Pro
  const requiresProSubscription = level && level >= 2;

  useLayoutEffect(() => {
    // Disable swipe back gesture for lessons to prevent bypassing hearts system
    navigation.setOptions({
      gestureEnabled: false,
      headerShown: false
    });
  }, [navigation]);

  const handleLessonComplete = (results: {
    xpAwarded: number;
    correctCount: number;
    totalCount: number;
    masteryDelta: number;
  }) => {
    // Navigate to lesson summary
    navigation.navigate('LessonSummary', {
      ...results,
      moduleId,
      lessonId,
      isFirstLesson
    });
  };

  const handleExit = () => {
    // Return to lessons main screen and remove lesson from stack
    navigation.reset({
      index: 0,
      routes: [{ name: 'LessonsMain' }],
    });
  };

  const renderContent = () => (
    <View style={styles.container}>
      <LessonEngine
        lessonId={lessonId}
        onComplete={handleLessonComplete}
        onExit={handleExit}
      />
    </View>
  );

  // Wrap with RequirePro if lesson requires Pro subscription
  if (requiresProSubscription) {
    return (
      <RequirePro>
        {renderContent()}
      </RequirePro>
    );
  }

  return renderContent();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});