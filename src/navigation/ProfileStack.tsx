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
        headerShown: false,
        headerBackButtonDisplayMode: 'minimal',
        animation: 'slide_from_right',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileMainWithTour} />
    </Stack.Navigator>
  );
}
