/**
 * Recipe Unlock Card
 * Shows unlock progress for earnable recipes in Challenges tab
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { RecipeUnlock, UnlockMethod } from '../config/recipeUnlocks';

interface RecipeUnlockCardProps {
  recipe: RecipeUnlock;
  currentProgress: {
    [key: string]: number; // Progress percentage for each method
  };
  onMethodPress: (method: UnlockMethod) => void;
  onUnlock?: () => void;
}

export default function RecipeUnlockCard({
  recipe,
  currentProgress,
  onMethodPress,
  onUnlock,
}: RecipeUnlockCardProps) {
  // Find the method with highest progress
  const bestMethod = recipe.methods.reduce((best, method, index) => {
    const progress = currentProgress[method.type] || 0;
    return progress > best.progress ? { method, progress, index } : best;
  }, { method: recipe.methods[0], progress: 0, index: 0 });

  const overallProgress = Math.max(...Object.values(currentProgress));
  const isUnlockable = overallProgress >= 100;

  return (
    <View style={styles.card}>
      {/* Recipe Image & Info */}
      <View style={styles.header}>
        <Image
          source={{ uri: recipe.thumbnailUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        <View style={styles.info}>
          <Text style={styles.recipeName}>{recipe.recipeName}</Text>
          <Text style={styles.difficulty}>
            {recipe.difficulty === 'easy' && '⭐ Easy Unlock'}
            {recipe.difficulty === 'medium' && '⭐⭐ Medium Unlock'}
            {recipe.difficulty === 'hard' && '⭐⭐⭐ Hard Unlock'}
          </Text>
        </View>
      </View>

      {/* Overall Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${overallProgress}%`,
                backgroundColor: isUnlockable ? colors.accent : colors.subtext,
              }
            ]}
          />
        </View>
        <Text style={styles.progressText}>{Math.round(overallProgress)}%</Text>
      </View>

      {/* Unlock Methods */}
      <View style={styles.methodsContainer}>
        <Text style={styles.methodsLabel}>Unlock by completing any:</Text>
        {recipe.methods.map((method, index) => {
          const progress = currentProgress[method.type] || 0;
          const isComplete = progress >= 100;

          return (
            <TouchableOpacity
              key={index}
              style={[styles.method, isComplete && styles.methodComplete]}
              onPress={() => onMethodPress(method)}
              activeOpacity={0.7}
            >
              <View style={styles.methodIcon}>
                {getMethodIcon(method.type, isComplete)}
              </View>
              <View style={styles.methodContent}>
                <Text style={[styles.methodDescription, isComplete && styles.methodDescriptionComplete]}>
                  {method.description}
                </Text>
                {!isComplete && (
                  <Text style={styles.methodProgress}>
                    {Math.round(progress)}% complete
                  </Text>
                )}
              </View>
              {isComplete && (
                <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Unlock Button */}
      {isUnlockable && (
        <TouchableOpacity
          style={styles.unlockButton}
          onPress={onUnlock}
          activeOpacity={0.8}
        >
          <Ionicons name="lock-open" size={20} color={colors.white} />
          <Text style={styles.unlockButtonText}>Unlock Now!</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function getMethodIcon(type: string, isComplete: boolean) {
  const iconColor = isComplete ? colors.accent : colors.subtext;
  const iconSize = 20;

  switch (type) {
    case 'streak':
      return <Ionicons name="flame" size={iconSize} color={iconColor} />;
    case 'lessons':
      return <Ionicons name="book" size={iconSize} color={iconColor} />;
    case 'challenges':
      return <Ionicons name="trophy" size={iconSize} color={iconColor} />;
    case 'xp':
      return <Ionicons name="star" size={iconSize} color={iconColor} />;
    case 'app-opens':
      return <Ionicons name="calendar" size={iconSize} color={iconColor} />;
    case 'saved-recipes':
      return <Ionicons name="heart" size={iconSize} color={iconColor} />;
    case 'shares':
      return <Ionicons name="share-social" size={iconSize} color={iconColor} />;
    case 'invites':
      return <Ionicons name="people" size={iconSize} color={iconColor} />;
    case 'ratings':
      return <Ionicons name="star-half" size={iconSize} color={iconColor} />;
    default:
      return <Ionicons name="checkmark-circle" size={iconSize} color={iconColor} />;
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing(2.5),
    marginBottom: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: radii.lg,
    backgroundColor: colors.line,
  },
  info: {
    flex: 1,
    marginLeft: spacing(2),
  },
  recipeName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  difficulty: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(2),
    gap: spacing(2),
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.bg,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    minWidth: 45,
    textAlign: 'right',
  },
  methodsContainer: {
    marginTop: spacing(1),
  },
  methodsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
    marginBottom: spacing(1.5),
  },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: spacing(2),
    borderRadius: radii.md,
    marginBottom: spacing(1),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  methodComplete: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}15`,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing(2),
  },
  methodContent: {
    flex: 1,
  },
  methodDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  methodDescriptionComplete: {
    color: colors.accent,
  },
  methodProgress: {
    fontSize: 12,
    color: colors.subtext,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    borderRadius: radii.md,
    marginTop: spacing(2),
    gap: spacing(1),
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
