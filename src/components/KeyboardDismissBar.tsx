/**
 * Global keyboard dismiss bar
 * Shows a "Done" button above every keyboard in the app
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  Keyboard,
  Animated,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/tokens';

export default function KeyboardDismissBar() {
  const [visible, setVisible] = useState(false);
  const bottom = useRef(new Animated.Value(-44)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setVisible(true);
      Animated.timing(bottom, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? (e.duration || 250) : 250,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(bottom, {
        toValue: -44,
        duration: Platform.OS === 'ios' ? (e.duration || 200) : 200,
        useNativeDriver: false,
      }).start(() => setVisible(false));
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [bottom]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.bar, { bottom }]}>
      <TouchableOpacity style={styles.doneBtn} onPress={Keyboard.dismiss}>
        <Ionicons name="chevron-down" size={18} color={colors.accent} />
        <Text style={styles.doneText}>Done</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    zIndex: 9999,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1),
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
});
