import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LessonsScreen from '../screens/LessonsScreen';
import LessonEngineScreen from '../screens/lessons/LessonEngineScreen';
import LessonSummaryScreen from '../screens/lessons/LessonSummaryScreen';
import RecipesScreen from '../screens/RecipesScreen';
import { withScreenTour } from '../components/tour/withScreenTour';

export type LessonsStackParamList = {
  LessonsMain: undefined;
  LessonEngine: { moduleId?: string; lessonId?: string; isFirstLesson?: boolean };
  LessonSummary: { xpAwarded: number; correctCount: number; totalCount: number; masteryDelta: number; moduleId?: string; lessonId?: string; isFirstLesson?: boolean; firstCompletion?: boolean };
  Spirits: undefined;
};

const Stack = createNativeStackNavigator<LessonsStackParamList>();
const LessonsMainWithTour = withScreenTour(LessonsScreen, 'tab_lessons');
const LessonEngineWithTour = withScreenTour(LessonEngineScreen, 'feature_lesson_engine');

export default function LessonsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerBackButtonDisplayMode: 'minimal',
        animation: 'slide_from_right',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="LessonsMain" component={LessonsMainWithTour} />
      <Stack.Screen name="LessonEngine" component={LessonEngineWithTour} />
      <Stack.Screen name="LessonSummary" component={LessonSummaryScreen} />
      <Stack.Screen name="Spirits" component={RecipesScreen} />
    </Stack.Navigator>
  );
}
