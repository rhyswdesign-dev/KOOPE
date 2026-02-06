import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GamesScreen from '../screens/GamesScreen';

export type GamesStackParamList = {
  GamesMain: undefined;
};

const Stack = createNativeStackNavigator<GamesStackParamList>();

export default function GamesStack() {
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
      <Stack.Screen name="GamesMain" component={GamesScreen} options={{ title: 'Games' }} />
    </Stack.Navigator>
  );
}