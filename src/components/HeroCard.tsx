/**
 * "Cocktail of the week" hero card for RecipesScreen — extracted verbatim
 * (Phase 5, god-file breakup). Purely presentational.
 */
import { Dimensions, Image, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, spacing, radii } from '../theme/tokens';
import { withHaptic } from '../lib/haptics';
import { getCocktailImage } from '../../assets/images/cocktails';
import type { CocktailOfTheWeek } from '../utils/recipesScreenData';

const { width } = Dimensions.get('window');
const GOLD = '#C9A15A'; // spotlight color — matches RecipesScreen's own GOLD constant

interface HeroCardProps {
  cocktail: CocktailOfTheWeek;
  onPress: () => void;
}

export default function HeroCard({ cocktail, onPress }: HeroCardProps) {
  const cardW = width - spacing(2) * 2;
  const cardH = Math.round(cardW * 0.56);

  const resolvedImage =
    typeof cocktail.image === 'string'
      ? getCocktailImage(cocktail.id, cocktail.image)
      : cocktail.image;

  return (
    <Animated.View
      entering={FadeIn.duration(600)}
      style={{
        marginHorizontal: spacing(2),
        borderRadius: radii.xl,
        overflow: 'hidden',
        backgroundColor: colors.card,
        marginBottom: spacing(1.5),
      }}
    >
      <Pressable onPress={withHaptic(onPress)} style={{ width: cardW, height: cardH }}>
        <Image
          source={typeof resolvedImage === 'string' ? { uri: resolvedImage } : resolvedImage}
          style={{ width: '100%', height: '100%' }}
        />
      </Pressable>

      {/* gold label */}
      <View
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          backgroundColor: GOLD,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: '#120D07', fontWeight: '900' }}>COCKTAIL OF THE WEEK</Text>
      </View>

      <View style={{ padding: spacing(2) }}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900' }}>{cocktail.name}</Text>
        <Text style={{ color: colors.muted, fontSize: 18, marginTop: 4 }}>
          {cocktail.description}
        </Text>
      </View>
    </Animated.View>
  );
}
