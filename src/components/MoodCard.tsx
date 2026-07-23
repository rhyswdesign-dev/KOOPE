/**
 * Mood-category card for RecipesScreen's horizontal mood rail — extracted
 * verbatim (Phase 5, god-file breakup). Purely presentational.
 */
import { Dimensions, Image, Pressable, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { withHaptic } from '../lib/haptics';

const { width } = Dimensions.get('window');

interface MoodCardProps {
  title: string;
  image: string;
  subtitle?: string;
  onPress?: () => void;
  index?: number;
}

export default function MoodCard({ title, image, subtitle, onPress, index = 0 }: MoodCardProps) {
  const w = Math.min(0.78 * width, 300);
  const h = Math.round(w * 0.66);
  return (
    <Animated.View entering={FadeInRight.delay(index * 100).duration(500)}>
      <Pressable
        onPress={onPress ? withHaptic(onPress) : undefined}
        style={{ width: w, marginRight: spacing(1.25) }}
      >
        <Image
          source={{ uri: image }}
          style={{ width: '100%', height: h, borderRadius: radii.lg }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: 18 }}>{title}</Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.accent}
            style={{ marginLeft: 4 }}
          />
        </View>
        {subtitle ? <Text style={{ color: colors.muted }}>{subtitle}</Text> : null}
      </Pressable>
    </Animated.View>
  );
}
