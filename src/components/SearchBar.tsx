import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Animated, Keyboard, Platform, InputAccessoryView, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
  debounceMs?: number;
  autoFocus?: boolean;
}

/**
 * SearchBar Component
 *
 * A reusable search input with debouncing, clear button, and smooth animations
 */
export default function SearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search...',
  debounceMs = 300,
  autoFocus = false,
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout>();
  const focusAnim = useRef(new Animated.Value(0)).current;

  // Sync with external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounced search
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      onChangeText(inputValue);
    }, debounceMs);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [inputValue, debounceMs]);

  // Focus animation
  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  }, [isFocused]);

  const handleClear = () => {
    setInputValue('');
    onChangeText('');
    if (onClear) {
      onClear();
    }
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.line, colors.accent],
  });

  const inputAccessoryViewID = 'searchBarAccessory';

  return (
    <>
      <Animated.View style={[styles.container, { borderColor }]}>
        <Ionicons
          name="search"
          size={20}
          color={isFocused ? colors.accent : colors.subtext}
          style={styles.searchIcon}
        />

        <TextInput
          value={inputValue}
          onChangeText={setInputValue}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.subtext}
          style={styles.input}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          keyboardAppearance="dark"
          inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
        />

        {inputValue.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={20} color={colors.subtext} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={inputAccessoryViewID}>
          <View style={styles.accessoryView}>
            <TouchableOpacity onPress={() => Keyboard.dismiss()} style={styles.doneButton}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.line,
    paddingHorizontal: spacing(2),
    height: 48,
  },
  searchIcon: {
    marginRight: spacing(1.5),
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: spacing(1),
  },
  accessoryView: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
  },
  doneButton: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1),
  },
  doneButtonText: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: '600',
  },
});
