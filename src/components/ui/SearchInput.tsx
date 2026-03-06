import React, { forwardRef } from 'react';
import { View, TextInput, StyleSheet, Pressable, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';
import { withHaptic } from '../../lib/haptics';

interface SearchInputProps extends Omit<TextInputProps, 'style'> {
  onClear?: () => void;
  showClearButton?: boolean;
  containerStyle?: object;
  inputStyle?: object;
  iconSize?: number;
  iconColor?: string;
}

const SearchInput = forwardRef<TextInput, SearchInputProps>(({
  value,
  onChangeText,
  placeholder = "Search...",
  onClear,
  showClearButton = true,
  containerStyle,
  inputStyle,
  iconSize = 20,
  iconColor = colors.subtext,
  ...textInputProps
}, ref) => {
  const handleClear = () => {
    onChangeText?.('');
    onClear?.();
  };

  const showClear = showClearButton && value && value.length > 0;

  return (
    <View style={[styles.container, containerStyle]}>
      <Ionicons 
        name="search-outline" 
        size={iconSize} 
        color={iconColor} 
        style={styles.searchIcon} 
      />
      
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subtext}
        style={[styles.input, inputStyle]}
        returnKeyType="search"
        clearButtonMode="never" // We'll handle clear button manually
        {...textInputProps}
      />
      
      {showClear && (
        <Pressable onPress={withHaptic(handleClear)} hitSlop={8} style={styles.clearButton}>
          <Ionicons 
            name="close-circle" 
            size={iconSize} 
            color={iconColor} 
          />
        </Pressable>
      )}
    </View>
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: spacing(1),
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 0, // Remove default padding
  },
  clearButton: {
    marginLeft: spacing(1),
    padding: 2,
  },
});
