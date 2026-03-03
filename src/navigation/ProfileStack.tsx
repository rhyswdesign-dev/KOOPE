import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/ProfileScreen';
import { withScreenTour } from '../components/tour/withScreenTour';

export type ProfileStackParamList = {
  ProfileMain: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();
const ProfileMainWithTour = withScreenTour(ProfileScreen, 'tab_profile');

export default function ProfileStack() {
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
      <Stack.Screen name="ProfileMain" component={ProfileMainWithTour} options={{ title: 'Profile' }} />
    </Stack.Navigator>
  );
}
