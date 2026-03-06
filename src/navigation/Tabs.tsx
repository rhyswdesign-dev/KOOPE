import { useRef } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import TutorialIconButton from '../components/tour/TutorialIconButton';
import { triggerHaptic } from '../lib/haptics';
import type { ScreenTourId } from '../config/screenTours';
import { useTutorialPreferences } from '../store/useTutorialPreferences';

type TabsParamList = {
  Lessons: undefined;
  Recipes: undefined;
  Camera: undefined;
  Inventory: undefined;
  Profile: undefined;
};
const Tab = createBottomTabNavigator<TabsParamList>();

export default function Tabs() {
  const navigation = useNavigation();
  // Use ref instead of state — activeTab is only needed on button press,
  // not for rendering. State would cause the entire tab tree to re-render
  // on every tab switch, causing perceptible jank.
  const activeTabRef = useRef<keyof TabsParamList>('Camera');
  const showTutorialIcons = useTutorialPreferences((state) => state.showTutorialIcons);

  const tabToTour: Record<keyof TabsParamList, ScreenTourId> = {
    Lessons: 'tab_lessons',
    Recipes: 'tab_discover',
    Camera: 'tab_camera',
    Inventory: 'tab_inventory',
    Profile: 'tab_profile',
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="Camera"
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
        screenListeners={{
          tabPress: () => {
            triggerHaptic('selection');
          },
          state: (event) => {
            const state = event.data.state as any;
            const routeName = state?.routes?.[state.index]?.name as keyof TabsParamList | undefined;
            if (routeName) activeTabRef.current = routeName;
          },
        }}
      >
        <Tab.Screen name="Lessons" component={LessonsStack} />
        <Tab.Screen name="Recipes" component={RecipesStack} options={{ tabBarLabel: 'Discover' }} />
        <Tab.Screen name="Camera" component={CameraStack} />
        <Tab.Screen name="Inventory" component={InventoryStack} />
        <Tab.Screen name="Profile" component={ProfileStack} />
      </Tab.Navigator>
      {showTutorialIcons && (
        <SafeAreaView
          edges={['bottom', 'right']}
          style={{ position: 'absolute', right: 14, bottom: 88, zIndex: 1001 }}
          pointerEvents="box-none"
        >
          <TutorialIconButton
            size={24}
            buttonSize={48}
            onPress={() =>
              (navigation as any).navigate('Tutorials', { contextTourId: tabToTour[activeTabRef.current] })
            }
          />
        </SafeAreaView>
      )}
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <OfflineIndicator />
      </SafeAreaView>
    </View>
  );
}
