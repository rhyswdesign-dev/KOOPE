import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeBarScreen from '../screens/HomeBarScreen';
import ShoppingCartScreen from '../screens/ShoppingCartScreen';

export type InventoryStackParamList = {
  HomeBarMain: undefined;
  ShoppingCart: undefined;
};

const Stack = createNativeStackNavigator<InventoryStackParamList>();

export default function InventoryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
        animationDuration: 200,
        headerBackTitleVisible: false,
        headerBackTitle: ' ',
      }}
    >
      <Stack.Screen
        name="HomeBarMain"
        component={HomeBarScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ShoppingCart"
        component={ShoppingCartScreen}
        options={{ headerShown: true, title: '🛒 Shopping Cart' }}
      />
    </Stack.Navigator>
  );
}
