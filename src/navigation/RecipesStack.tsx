import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RecipesScreen from '../screens/RecipesScreen';
import { withScreenTour } from '../components/tour/withScreenTour';

export type RecipesStackParamList = {
  RecipesMain: undefined;
};

const Stack = createNativeStackNavigator<RecipesStackParamList>();
const RecipesMainWithTour = withScreenTour(RecipesScreen, 'tab_discover');

export default function RecipesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
        animationDuration: 200,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="RecipesMain" component={RecipesMainWithTour} options={{ headerShown: true }} />
    </Stack.Navigator>
  );
}
