import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RecipesScreen from '../screens/RecipesScreen';

export type RecipesStackParamList = {
  RecipesMain: undefined;
};

const Stack = createNativeStackNavigator<RecipesStackParamList>();

export default function RecipesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
        animationDuration: 200,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="RecipesMain" component={RecipesScreen} options={{ headerShown: true }} />
    </Stack.Navigator>
  );
}
