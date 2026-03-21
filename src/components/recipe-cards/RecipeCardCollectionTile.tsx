import React from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii, serif, spacing } from '../../theme/tokens';
import type { CollectibleRecipeCard } from '../../types/recipeCards';

interface RecipeCardCollectionTileProps {
  card: CollectibleRecipeCard;
  onPress: () => void;
}

export default function RecipeCardCollectionTile({ card, onPress }: RecipeCardCollectionTileProps) {
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={styles.card}>
      <ImageBackground source={{ uri: card.heroImage }} style={styles.image} imageStyle={styles.imageInner}>
        <LinearGradient
          colors={['rgba(9,7,6,0.08)', 'rgba(9,7,6,0.22)', 'rgba(15,11,9,0.7)', '#1A120D']}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.topRow}>
          <View style={styles.badge}>
            <Ionicons name="ribbon-outline" size={12} color={colors.accent} />
            <Text style={styles.badgeText}>Recipe</Text>
          </View>
          <Text style={styles.watermark}>KOOPE</Text>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.kicker}>{card.subtitle.toUpperCase()}</Text>
          <Text style={styles.title} numberOfLines={2}>{card.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#D8CBB9" />
              <Text style={styles.metaText}>{card.meta.time}</Text>
            </View>
            <Text style={styles.metaDot}>•</Text>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="chart-bar" size={14} color="#D8CBB9" />
              <Text style={styles.metaText}>{card.meta.difficulty}</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing(3),
    marginBottom: spacing(2.25),
    minHeight: 300,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#201611',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.14)',
  },
  image: {
    minHeight: 300,
    justifyContent: 'space-between',
  },
  imageInner: {
    borderRadius: 24,
    resizeMode: 'cover',
  },
  topRow: {
    paddingHorizontal: spacing(1.5),
    paddingTop: spacing(1.5),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
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
  badgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  watermark: {
    color: colors.text,
    fontSize: 10,
    opacity: 0.78,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  bottom: {
    paddingHorizontal: spacing(1.75),
    paddingBottom: spacing(1.75),
  },
  kicker: {
    color: 'rgba(246, 235, 221, 0.82)',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing(0.75),
  },
  title: {
    color: '#F2E6D8',
    fontFamily: serif,
    fontSize: 24,
    lineHeight: 28,
    marginBottom: spacing(1),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
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
});
