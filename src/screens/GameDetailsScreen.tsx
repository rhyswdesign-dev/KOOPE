import React, { useLayoutEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';

export default function GameDetailsScreen() {
  const nav = useNavigation();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#f5ece3' }}>Game Details (coming soon)</Text>
    </View>
  );
}