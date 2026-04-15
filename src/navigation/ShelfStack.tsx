import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeBarScreen from '../screens/HomeBarScreen';
import ShoppingCartScreen from '../screens/ShoppingCartScreen';
import { withScreenTour } from '../components/tour/withScreenTour';

export type ShelfStackParamList = {
  HomeBarMain: undefined;
  ShoppingCart: undefined;
};

// Keep InventoryStackParamList as an alias so existing type imports don't break
export type InventoryStackParamList = ShelfStackParamList;

const Stack = createNativeStackNavigator<ShelfStackParamList>();
const HomeBarWithTour = withScreenTour(HomeBarScreen, 'tab_inventory');

export default function ShelfStack() {
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
