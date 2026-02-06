import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RecipesScreen from '../screens/RecipesScreen';
import MyRecipesScreen from '../screens/MyRecipesScreen';

export type RecipesStackParamList = {
  RecipesMain: undefined;
  MyRecipes: undefined;
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
      <Stack.Screen name="MyRecipes" component={MyRecipesScreen} options={{ headerShown: true, title: 'My Recipes' }} />
    </Stack.Navigator>
  );
}
