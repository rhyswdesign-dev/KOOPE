import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { getCocktailImage } from '../../assets/images/cocktails';

interface RecipeCardProps {
  recipe: {
    id: string;
    name: string;
    title?: string;
    subtitle?: string;
    description?: string;
    category?: string;
    image: string | number; // string for URI, number for require()
    difficulty: string;
    time: string;
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
  style?: any;
}

export default function RecipeCard({
  recipe,
  onPress,
  onSave,
  onAddToCart,
  onDelete,
  isSaved = false,
  showSaveButton = true,
  showCartButton = true,
  showDeleteButton = false,
  style,
}: RecipeCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Get historical fact or insight to display on card
  // Priority: history.story > tags > subtitle > description
  // useMemo ensures the same text is shown consistently for this recipe
  const displayText = useMemo(() => {
    // Priority 1: If recipe has historical story, show that
    if (recipe.history?.story) {
      return recipe.history.story;
    }

    // Priority 2: If recipe has tags (pro tips/facts), show a random one
    if (recipe.tags && Array.isArray(recipe.tags) && recipe.tags.length > 0) {
      const randomIndex = Math.floor(Math.random() * recipe.tags.length);
      return recipe.tags[randomIndex];
    }

    // Fallback to subtitle or description
    return recipe.subtitle || recipe.description || '';
  }, [recipe.id, recipe.history, recipe.tags, recipe.subtitle, recipe.description]);

  // GLOBAL IMAGE RESOLVER: Always use local images if available
  const resolvedImage = useMemo(() => {
    return getCocktailImage(recipe.id, recipe.image);
  }, [recipe.id, recipe.image]);

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        style={styles.verticalCard}
        onPress={() => onPress(recipe)}
        onPressIn={() => {
          scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        }}
      >
        <Image
          source={typeof resolvedImage === 'string' ? { uri: resolvedImage } : resolvedImage}
          style={styles.cocktailImage}
        />
        <View style={styles.cocktailInfo}>
          <Text style={styles.cardTitle}>{recipe.name || recipe.title}</Text>
          <Text style={styles.cardSub}>{displayText}</Text>
          <View style={styles.cocktailMeta}>
            <Text style={styles.cocktailDifficulty}>{recipe.difficulty}</Text>
            <Text style={styles.cocktailTime}>{recipe.time}</Text>
          </View>
        </View>

      {/* Action buttons */}
      <View style={styles.recipeActions}>
        {/* Shopping cart button */}
        {showCartButton && onAddToCart && (
          <TouchableOpacity
            style={styles.shoppingCartButton}
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation();
              onAddToCart(recipe);
            }}
          >
            <Ionicons
              name="basket"
              size={18}
              color={colors.white}
            />
          </TouchableOpacity>
        )}

        {/* Delete button */}
        {showDeleteButton && onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation();
              onDelete(recipe);
            }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.white} />
          </TouchableOpacity>
        )}

        {/* Save/Bookmark button */}
        {showSaveButton && onSave && (
          <TouchableOpacity
            style={styles.saveButton}
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation();
              onSave(recipe);
            }}
          >
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={20}
              color={isSaved ? colors.accent : colors.text}
            />
          </TouchableOpacity>
        )}
      </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Vertical Cards - Full width matching Old Fashioned styling
  verticalCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    position: 'relative',
  },
  cocktailImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
    backgroundColor: colors.card,
  },
  cocktailInfo: {
    padding: spacing(2),
  },
  cocktailMeta: {
    flexDirection: 'row',
    gap: spacing(2),
    marginTop: spacing(1),
  },
  cocktailDifficulty: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  cocktailTime: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '600',
  },
  recipeActions: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    flexDirection: 'row',
    gap: spacing(1),
  },
  shoppingCartButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(220, 38, 38, 0.8)', // Red background for delete
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Text styles matching Old Fashioned card
  cardTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: fonts.h3,
  },
  cardSub: {
    color: colors.muted,
    marginTop: 2,
  },
});