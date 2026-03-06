import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeBarScreen from '../screens/HomeBarScreen';
import ShoppingCartScreen from '../screens/ShoppingCartScreen';
import { withScreenTour } from '../components/tour/withScreenTour';

export type InventoryStackParamList = {
  HomeBarMain: undefined;
  ShoppingCart: undefined;
};

const Stack = createNativeStackNavigator<InventoryStackParamList>();
const HomeBarWithTour = withScreenTour(HomeBarScreen, 'tab_inventory');

export default function InventoryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
        animationDuration: 200,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen
        name="HomeBarMain"
        component={HomeBarWithTour}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ShoppingCart"
        component={ShoppingCartScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
