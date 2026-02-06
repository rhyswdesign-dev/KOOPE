import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LessonsScreen from '../screens/LessonsScreen';
import LessonEngineScreen from '../screens/lessons/LessonEngineScreen';
import LessonSummaryScreen from '../screens/lessons/LessonSummaryScreen';
import SpiritsScreen from '../screens/SpiritsScreen';

export type LessonsStackParamList = {
  LessonsMain: undefined;
  LessonEngine: { moduleId?: string; lessonId?: string; isFirstLesson?: boolean };
  LessonSummary: { xpAwarded: number; correctCount: number; totalCount: number; masteryDelta: number; moduleId?: string; lessonId?: string; isFirstLesson?: boolean };
  Spirits: undefined;
};

const Stack = createNativeStackNavigator<LessonsStackParamList>();

export default function LessonsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerBackTitleVisible: false,
        headerBackTitle: ' ',
        animation: 'slide_from_right',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="LessonsMain" component={LessonsScreen} />
      <Stack.Screen name="LessonEngine" component={LessonEngineScreen} />
      <Stack.Screen name="LessonSummary" component={LessonSummaryScreen} />
      <Stack.Screen name="Spirits" component={SpiritsScreen} />
    </Stack.Navigator>
  );
}