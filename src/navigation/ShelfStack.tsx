import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeBarScreen from '../screens/HomeBarScreen';
import RemovedContentScreen from '../screens/RemovedContentScreen';
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
      {/* Kill List (Master Plan §2.4): a second, independent registration of the
          mock shopping cart nested inside the Shelf tab's own stack — found during
          the audit/sprint-1 review sweep. Screens mounted inside this stack that
          call navigate('ShoppingCart') would have resolved here, bypassing the
          RootNavigator-level fix. Routed to RemovedContentScreen for the same
          reason as the root-level route. */}
      <Stack.Screen
        name="ShoppingCart"
        component={RemovedContentScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
