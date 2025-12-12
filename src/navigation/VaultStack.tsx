import { createNativeStackNavigator } from '@react-navigation/native-stack';
import VaultScreen from '../screens/vault/VaultScreen';

export type VaultStackParamList = {
  VaultMain: undefined;
};

const Stack = createNativeStackNavigator<VaultStackParamList>();

export default function VaultStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#1A0F0B' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { color: '#FFFFFF', fontWeight: '900' },
        animation: 'slide_from_right',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="VaultMain" component={VaultScreen} options={{ title: 'Vault' }} />
    </Stack.Navigator>
  );
}