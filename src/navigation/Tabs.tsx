import { useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DrinksStack from './DrinksStack';
import RecipesStack from './RecipesStack';
import CameraStack from './CameraStack';
import InventoryStack from './ShelfStack';
import ProfileStack from './ProfileStack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';
import OfflineIndicator from '../components/OfflineIndicator';
import { getFocusedRouteNameFromRoute, useNavigation } from '@react-navigation/native';
import TutorialIconButton from '../components/tour/TutorialIconButton';
import { triggerHaptic } from '../lib/haptics';
import type { ScreenTourId } from '../config/screenTours';
import { useTutorialPreferences } from '../store/useTutorialPreferences';
import { TrialBanner } from '../components/TrialBanner';

// Raised center FAB for the Scan tab (Phase 1.4a) — same proportions/shadow
// pattern as CellarNavigator's fabWrap/fab, using the main app's gold tokens
// rather than the Cellar sub-feature's amber palette.
const SCAN_FAB_SIZE = 56;

function ScanTabButton({ onPress, accessibilityState, testID }: BottomTabBarButtonProps) {
  const focused = !!accessibilityState?.selected;
  return (
    <TouchableOpacity
      onPress={onPress}
      testID={testID}
      activeOpacity={0.85}
      style={scanFabStyles.wrap}
      accessibilityRole="button"
      accessibilityLabel="Scan"
    >
      <View style={[scanFabStyles.fab, focused && scanFabStyles.fabActive]}>
        <Ionicons name="camera" size={26} color={colors.goldText} />
      </View>
    </TouchableOpacity>
  );
}

const scanFabStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -(SCAN_FAB_SIZE / 2 + 4),
  },
  fab: {
    width: SCAN_FAB_SIZE,
    height: SCAN_FAB_SIZE,
    borderRadius: SCAN_FAB_SIZE / 2,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabActive: {
    backgroundColor: colors.accentDark,
  },
});

type TabsParamList = {
  Drinks: undefined;
  Recipes: undefined;
  Camera: undefined;
  Shelf: undefined;
  Profile: undefined;
};
const Tab = createBottomTabNavigator<TabsParamList>();

const CAMERA_FULLSCREEN_ROUTES = new Set(['SmartScan', 'BottleDetail']);

export default function Tabs() {
  const navigation = useNavigation();
  // Use ref instead of state — activeTab is only needed on button press,
  // not for rendering. State would cause the entire tab tree to re-render
  // on every tab switch, causing perceptible jank.
  const activeTabRef = useRef<keyof TabsParamList>('Camera');
  const showTutorialIcons = useTutorialPreferences((state) => state.showTutorialIcons);
  // Phase 1.4a Scan-tab behavior: the FIRST tab press this session lands
  // directly in the camera; every later press (including returning from
  // another tab) lands on CameraHub instead. Session-scoped because Tabs
  // mounts once per logged-in session.
  const hasAutoLaunchedCameraRef = useRef(false);

  const tabToTour: Record<keyof TabsParamList, ScreenTourId> = {
    Drinks: 'tab_drinks',
    Recipes: 'tab_discover',
    Camera: 'tab_camera',
    Shelf: 'tab_inventory',
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
              Drinks: 'heart-outline',
              Recipes: 'restaurant-outline',
              Camera: 'camera-outline',
              Shelf: 'wine-outline',
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
        <Tab.Screen name="Recipes" component={RecipesStack} options={{ tabBarLabel: 'Tonight' }} />
        <Tab.Screen name="Shelf" component={InventoryStack} options={{ tabBarLabel: 'Bar' }} />
        <Tab.Screen
          name="Camera"
          component={CameraStack}
          options={({ route }) => {
            const focusedRoute = getFocusedRouteNameFromRoute(route) ?? 'CameraHub';
            const hideTabBar = CAMERA_FULLSCREEN_ROUTES.has(focusedRoute);

            return {
              tabBarLabel: 'Scan',
              tabBarButton: (props) => <ScanTabButton {...props} />,
              tabBarStyle: hideTabBar
                ? { display: 'none' }
                : { backgroundColor: colors.card, borderTopColor: 'transparent' },
            };
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              if (!hasAutoLaunchedCameraRef.current) {
                hasAutoLaunchedCameraRef.current = true;
                (navigation as any).navigate('Camera', { screen: 'SmartScan' });
              } else {
                (navigation as any).navigate('Camera', { screen: 'CameraHub' });
              }
            },
          })}
        />
        <Tab.Screen name="Drinks" component={DrinksStack} />
        <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: 'You' }} />
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
              (navigation as any).navigate('Tutorials', {
                contextTourId: tabToTour[activeTabRef.current],
              })
            }
          />
        </SafeAreaView>
      )}
      <SafeAreaView
        edges={['top']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}
      >
        <OfflineIndicator />
      </SafeAreaView>
      <TrialBanner />
    </View>
  );
}
