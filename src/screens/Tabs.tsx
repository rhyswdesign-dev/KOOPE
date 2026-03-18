// @ts-nocheck
import * as React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';

import FeaturedScreen from './FeaturedScreen';
import HomeBarScreen from './HomeBarScreen';
import CommunityScreen from './CommunityScreen';
import ProfileScreen from './ProfileScreen';

const Tab = createBottomTabNavigator();

export default function Tabs() {
  return (
    <Tab.Navigator 
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          
          if (route.name === 'Featured') {
            iconName = focused ? 'star' : 'star-outline';
          } else if (route.name === 'Bars') {
            iconName = focused ? 'wine' : 'wine-outline';
          } else if (route.name === 'Community') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.subtle,
        tabBarStyle: { backgroundColor: colors.headerBg },
      })}
    >
      <Tab.Screen name="Featured" component={FeaturedScreen} />
      <Tab.Screen name="Bars" component={HomeBarScreen} />
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
