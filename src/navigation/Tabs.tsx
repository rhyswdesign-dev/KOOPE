import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LessonsStack from './LessonsStack';
import RecipesStack from './RecipesStack';
import CameraStack from './CameraStack';
import InventoryStack from './InventoryStack';
import ProfileStack from './ProfileStack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';
import OfflineIndicator from '../components/OfflineIndicator';

type TabsParamList = {
  Lessons: undefined;
  Recipes: undefined;
  Camera: undefined;
  Inventory: undefined;
  Profile: undefined;
};
const Tab = createBottomTabNavigator<TabsParamList>();

export default function Tabs() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: 'transparent' },
          tabBarActiveTintColor: colors.gold,
          tabBarInactiveTintColor: colors.muted,
          tabBarIcon: ({ color, size }) => {
            const map: Record<string, keyof typeof Ionicons.glyphMap> = {
              Lessons: 'school-outline',
              Recipes: 'restaurant-outline',
              Camera: 'camera-outline',
              Inventory: 'wine-outline',
              Profile: 'person-outline',
            };
            return <Ionicons name={map[route.name]} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Lessons" component={LessonsStack} />
        <Tab.Screen name="Recipes" component={RecipesStack} />
        <Tab.Screen name="Camera" component={CameraStack} />
        <Tab.Screen name="Inventory" component={InventoryStack} />
        <Tab.Screen name="Profile" component={ProfileStack} />
      </Tab.Navigator>
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <OfflineIndicator />
      </SafeAreaView>
    </View>
  );
}
