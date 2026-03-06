import { Pressable, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';
import { withHaptic } from '../lib/haptics';

export default function TopIconButton({
  name,
  onPress,
  style,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable onPress={withHaptic(onPress)} hitSlop={10} style={style}>
      <Ionicons name={name} size={20} color={colors.text} />
    </Pressable>
  );
}
