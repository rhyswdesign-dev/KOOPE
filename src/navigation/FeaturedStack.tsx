import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FeaturedScreen from '../screens/FeaturedScreen';
import SpiritsScreen from '../screens/SpiritsScreen';

export type FeaturedStackParamList = {
  FeaturedMain: undefined;
  Spirits: undefined;
};

const Stack = createNativeStackNavigator<FeaturedStackParamList>();

export default function FeaturedStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#1A0F0B' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { color: '#FFFFFF', fontWeight: '900' },
        headerBackButtonDisplayMode: 'minimal',
        animation: 'slide_from_right',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="FeaturedMain" component={FeaturedScreen} options={{ title: 'Featured' }} />
      <Stack.Screen name="Spirits" component={SpiritsScreen} options={{ title: 'Featured Spirits' }} />
    </Stack.Navigator>
  );
}