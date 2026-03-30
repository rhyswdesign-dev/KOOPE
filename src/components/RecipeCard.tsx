import React, { useMemo, useState } from 'react';
import {
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  View,
} from 'react-native';
import { FeedbackPromptModal } from './FeedbackPromptModal';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { getCocktailImage } from '../../assets/images/cocktails';
import { withHaptic } from '../lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';

interface RecipeCardProps {
  recipe: {
    id: string;
    name: string;
    title?: string;
    subtitle?: string;
    description?: string;
    category?: string;
    image?: string | number;
    difficulty?: string;
    time?: string;
    rating?: number;
    ingredients?: any[];
    tags?: string[];
    history?: {
      story?: string;
      era?: string;
      year?: number;
      origin?: string;
      creator?: string;
    };
  };
  onPress: (recipe: any) => void;
  onSave?: (recipe: any) => void;
  onAddToCart?: (recipe: any) => void;
  onDelete?: (recipe: any) => void;
  isSaved?: boolean;
  showSaveButton?: boolean;
  showCartButton?: boolean;
  showDeleteButton?: boolean;
  featuredBrandLabel?: string;
  style?: any;
}

const RecipeCard = React.memo(({
  recipe,
  onPress,
  onSave,
  onAddToCart,
  onDelete,
  isSaved = false,
  showSaveButton = true,
  showCartButton = true,
  showDeleteButton = false,
  featuredBrandLabel,
  style,
}: RecipeCardProps) => {
  const scale = useSharedValue(1);
  const [cartFeedbackVisible, setCartFeedbackVisible] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const displayText = useMemo(() => {
    if (recipe.history?.story) {
      return recipe.history.story;
    }

    if (recipe.tags && Array.isArray(recipe.tags) && recipe.tags.length > 0) {
      const randomIndex = Math.floor(Math.random() * recipe.tags.length);
      return recipe.tags[randomIndex];
    }

    return recipe.subtitle || recipe.description || '';
  }, [recipe.id, recipe.history, recipe.tags, recipe.subtitle, recipe.description]);

  const resolvedImage = useMemo(() => {
    const fallbackImage = 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=240&h=160&fit=crop';
    if (!recipe.image) return fallbackImage;
    if (typeof recipe.image === 'string') {
      return getCocktailImage(recipe.id, recipe.image) || fallbackImage;
    }
    return recipe.image || fallbackImage;
  }, [recipe.id, recipe.image]);

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        style={styles.verticalCard}
        onPress={withHaptic(() => onPress(recipe), 'selection')}
        onPressIn={() => {
          scale.value = withTiming(0.985, { duration: 120, easing: Easing.out(Easing.quad) });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) });
        }}
      >
        <Image
          source={typeof resolvedImage === 'string' ? { uri: resolvedImage } : resolvedImage}
          style={styles.cocktailImage}
        />
        <LinearGradient
          colors={['rgba(9,7,6,0.08)', 'rgba(9,7,6,0.22)', 'rgba(15,11,9,0.7)', '#1A120D']}
          style={styles.imageShade}
        />

        <View style={styles.topRow}>
          <View style={styles.heroBadge}>
            <Ionicons name="ribbon-outline" size={12} color={colors.accent} />
            <Text style={styles.heroBadgeText}>{featuredBrandLabel ? 'Featured' : 'Recipe'}</Text>
          </View>

          <View style={styles.recipeActions}>
            {showCartButton && onAddToCart && (
              <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.7}
                onPress={withHaptic((e) => {
                  e.stopPropagation();
                  setCartFeedbackVisible(true);
                }, 'selection')}
              >
                <Ionicons name="basket-outline" size={17} color={colors.white} />
              </TouchableOpacity>
            )}

            {showDeleteButton && onDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                activeOpacity={0.7}
                onPress={withHaptic((e) => {
                  e.stopPropagation();
                  onDelete(recipe);
                }, 'selection')}
              >
                <Ionicons name="trash-outline" size={17} color={colors.white} />
              </TouchableOpacity>
            )}

            {showSaveButton && onSave && (
              <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.7}
                onPress={withHaptic((e) => {
                  e.stopPropagation();
                  onSave(recipe);
                }, 'selection')}
              >
                <Ionicons
                  name={isSaved ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color={isSaved ? colors.accent : colors.white}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.cocktailInfo}>
          <Text style={styles.cardEyebrow}>{(recipe.category || 'Recipe').toUpperCase()}</Text>
          <Text style={styles.cardTitle}>{recipe.name || recipe.title}</Text>
          <Text style={styles.cardSub} numberOfLines={2}>{displayText}</Text>
          <View style={styles.cocktailMeta}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#D8CBB9" />
              <Text style={styles.metaText}>{recipe.time || '5 min'}</Text>
            </View>
            <Text style={styles.metaDot}>•</Text>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="chart-bar" size={14} color="#D8CBB9" />
              <Text style={styles.metaText}>{recipe.difficulty || 'beginner'}</Text>
            </View>
          </View>
        </View>
      </Pressable>
      <FeedbackPromptModal
        featureKey="shopping_cart"
        title="Shopping cart — coming soon"
        body="We're building a smart cart that lets you add missing ingredients directly from any recipe. Would you use this?"
        visible={cartFeedbackVisible}
        onDismiss={() => setCartFeedbackVisible(false)}
      />
    </Animated.View>
  );
});

export default RecipeCard;

const styles = StyleSheet.create({
  verticalCard: {
    backgroundColor: '#201611',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.14)',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
    minHeight: 320,
  },
  cocktailImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: colors.card,
  },
  imageShade: {
    ...StyleSheet.absoluteFillObject,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing(1.5),
    paddingTop: spacing(1.5),
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    paddingHorizontal: spacing(1.2),
    paddingVertical: spacing(0.7),
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.22)',
    backgroundColor: 'rgba(20,15,12,0.76)',
  },
  heroBadgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cocktailInfo: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing(1.75),
    paddingBottom: spacing(1.75),
    paddingTop: spacing(8),
  },
  cardEyebrow: {
    fontSize: 11,
    color: 'rgba(246, 235, 221, 0.82)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing(0.75),
  },
  cocktailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    marginTop: spacing(1),
  },
  cardTitle: {
    color: '#F2E6D8',
    fontSize: 28,
    lineHeight: 31,
    marginBottom: spacing(0.75),
    fontFamily: serif,
  },
  cardSub: {
    color: '#DDD0C1',
    fontSize: 13,
    lineHeight: 18,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: '#E0D2C1',
    fontSize: 13,
    fontWeight: '500',
  },
  metaDot: {
    color: '#C2B09C',
    fontSize: 12,
  },
  recipeActions: {
    flexDirection: 'row',
    gap: spacing(0.75),
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(8,8,10,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(130,31,31,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
