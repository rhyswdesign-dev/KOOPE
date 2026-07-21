import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DrinksScreen from '../screens/DrinksScreen';
import { withScreenTour } from '../components/tour/withScreenTour';

export type DrinksStackParamList = {
  DrinksMain: undefined;
};

const Stack = createNativeStackNavigator<DrinksStackParamList>();
const DrinksMainWithTour = withScreenTour(DrinksScreen, 'tab_drinks');

export default function DrinksStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
        animationDuration: 200,
        headerBackButtonDisplayMode: 'minimal',
        headerShown: false,
      }}
    >
      <Stack.Screen name="DrinksMain" component={DrinksMainWithTour} />
    </Stack.Navigator>
  );
}
