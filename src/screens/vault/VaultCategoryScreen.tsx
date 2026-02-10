/**
 * VAULT CATEGORY SCREEN
 *
 * Displays items in a specific Vault category with thumbnails and grouped by subcategory.
 * Matches the design of the Technique Playbooks screen.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';
import {
  getVariationsForDisplay,
  getTechniquePlaybooksByType,
  getBarFeaturesForDisplay,
  getAvailableSeasonalDropsForTier,
  getAllPlaybookTypes,
  TechniquePlaybookType,
} from '../../config/vaultContent';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { BAR_IMAGES, BAR_PAGE_HEADERS } from '../../data/barImages';

type Props = NativeStackScreenProps<RootStackParamList, 'VaultCategory'>;

// Placeholder images for thumbnails (same as common tab items)
const PLACEHOLDER_IMAGES = {
  ice: 'https://images.unsplash.com/photo-1564808225-3e440c8c7b5e?w=400',
  acid: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=400',
  batch: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400',
  speed: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400',
  cocktail: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=400',
  bar: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=400',
  seasonal: 'https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=400',
  keys: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400',
};

const PLAYBOOK_TYPE_LABELS: Record<TechniquePlaybookType, string> = {
  ICE_STRATEGY: 'Ice Strategy Playbooks',
  ACID_CONTROL: 'Acid Control Playbooks',
  BATCH_MATH: 'Batch Math Playbooks',
  SPEED_SYSTEM: 'Speed Systems',
};

const PLAYBOOK_TYPE_IMAGES: Record<TechniquePlaybookType, string> = {
  ICE_STRATEGY: PLACEHOLDER_IMAGES.ice,
  ACID_CONTROL: PLACEHOLDER_IMAGES.acid,
  BATCH_MATH: PLACEHOLDER_IMAGES.batch,
  SPEED_SYSTEM: PLACEHOLDER_IMAGES.speed,
};

// Helper function to get bar thumbnail from thumbnailKey
const getBarThumbnail = (thumbnailKey?: string) => {
  if (!thumbnailKey) {
    return { uri: PLACEHOLDER_IMAGES.bar };
  }

  // Check if it's a BAR_IMAGES key (pill button images)
  if (thumbnailKey in BAR_IMAGES) {
    return BAR_IMAGES[thumbnailKey as keyof typeof BAR_IMAGES];
  }

  // Check if it's a BAR_PAGE_HEADERS key (page header images)
  if (thumbnailKey in BAR_PAGE_HEADERS) {
    return BAR_PAGE_HEADERS[thumbnailKey as keyof typeof BAR_PAGE_HEADERS];
  }

  // Fallback to placeholder
  console.warn('Bar thumbnail not found for key:', thumbnailKey);
  return { uri: PLACEHOLDER_IMAGES.bar };
};

export default function VaultCategoryScreen({ navigation, route }: Props) {
  const { category } = route.params;

  // Get category title and description
  let categoryTitle = '';
  let categoryDescription = '';

  switch (category) {
    case 'COCKTAIL_VARIATION':
      categoryTitle = 'Cocktail Variations';
      categoryDescription =
        'Master advanced cocktail variations. Each variation builds on classic foundations with new techniques and flavor profiles.';
      break;
    case 'TECHNIQUE_PLAYBOOK':
      categoryTitle = 'Technique Playbooks';
      categoryDescription =
        'Master the fundamentals of bartending with these technique playbooks. Each playbook contains a series of lessons and exercises to help you master a specific technique.';
      break;
    case 'BAR_FEATURE':
      categoryTitle = 'Bar Features';
      categoryDescription =
        'Learn from the best bars around the world. Discover signature cocktails and adapt their techniques for your home bar.';
      break;
    case 'SEASONAL_DROP':
      categoryTitle = 'Seasonal Drops';
      categoryDescription =
        'Exclusive seasonal content that rotates throughout the year. Get early access to curated collections.';
      break;
    default:
      categoryTitle = 'Vault';
      categoryDescription = 'Explore vault content';
  }

  const renderPlaybookSection = () => {
    const playbookTypes = getAllPlaybookTypes();

    return (
      <View style={styles.content}>
        {playbookTypes.map((type) => {
          const playbooks = getTechniquePlaybooksByType(type);
          if (playbooks.length === 0) return null;

          return (
            <View key={type} style={styles.section}>
              <Text style={styles.sectionTitle}>{PLAYBOOK_TYPE_LABELS[type]}</Text>

              {playbooks.map((playbook) => (
                <TouchableOpacity key={playbook.id} style={styles.itemCard} activeOpacity={0.7}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemXP}>{playbook.xpCost} XP</Text>
                    <Text style={styles.itemTitle}>{playbook.title}</Text>
                    <Text style={styles.itemDescription}>{playbook.shortDescription}</Text>
                  </View>
                  <Image
                    source={{ uri: PLAYBOOK_TYPE_IMAGES[type] }}
                    style={styles.itemThumbnail}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
      </View>
    );
  };

  const renderCocktailSection = () => {
    const variations = getVariationsForDisplay();
    const groupedByDifficulty: Record<string, typeof variations> = {
      simple: [],
      technique_forward: [],
      pro: [],
    };

    variations.forEach((v) => {
      groupedByDifficulty[v.difficulty].push(v);
    });

    const difficultyLabels = {
      simple: 'Simple Variations',
      technique_forward: 'Technique-Forward Variations',
      pro: 'Pro-Level Variations',
    };

    return (
      <View style={styles.content}>
        {Object.entries(groupedByDifficulty).map(([difficulty, items]) => {
          if (items.length === 0) return null;

          return (
            <View key={difficulty} style={styles.section}>
              <Text style={styles.sectionTitle}>
                {difficultyLabels[difficulty as keyof typeof difficultyLabels]}
              </Text>

              {items.map((variation) => (
                <TouchableOpacity key={variation.id} style={styles.itemCard} activeOpacity={0.7}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemXP}>{variation.xpCost} XP</Text>
                    <Text style={styles.itemTitle}>{variation.title}</Text>
                    <Text style={styles.itemDescription}>{variation.shortDescription}</Text>
                  </View>
                  <Image
                    source={{ uri: PLACEHOLDER_IMAGES.cocktail }}
                    style={styles.itemThumbnail}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
      </View>
    );
  };

  const renderBarSection = () => {
    const bars = getBarFeaturesForDisplay();

    const handleBarPress = (barId: string) => {
      // Navigate to specific bar detail screen based on bar ID
      if (barId === 'bar_untitled_champagne_lounge') {
        navigation.navigate('UntitledLounge');
      } else if (barId === 'bar_employees_only') {
        // Could navigate to Employees Only screen if it exists
        // For now, just log
        console.log('Navigate to Employees Only');
      } else {
        // Generic navigation or show a message
        console.log('Navigate to bar:', barId);
      }
    };

    return (
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Bars</Text>

          {bars.map((bar) => (
            <TouchableOpacity
              key={bar.id}
              style={styles.itemCard}
              activeOpacity={0.7}
              onPress={() => handleBarPress(bar.id)}
            >
              <View style={styles.itemInfo}>
                <Text style={styles.itemXP}>{bar.xpCost} XP</Text>
                <Text style={styles.itemTitle}>{bar.barName}</Text>
                <Text style={styles.itemDescription}>
                  {bar.city} • {bar.signatureCocktailName}
                </Text>
              </View>
              <Image
                source={getBarThumbnail(bar.thumbnailKey)}
                style={styles.itemThumbnail}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderSeasonalSection = () => {
    const drops = getAvailableSeasonalDropsForTier('PLUS'); // Default to PLUS tier

    return (
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Drops</Text>

          {drops.map((drop) => (
            <TouchableOpacity key={drop.id} style={styles.itemCard} activeOpacity={0.7}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemXP}>Limited Time</Text>
                <Text style={styles.itemTitle}>{drop.seasonName}</Text>
                <Text style={styles.itemDescription}>{drop.description}</Text>
              </View>
              <Image
                source={{ uri: PLACEHOLDER_IMAGES.seasonal }}
                style={styles.itemThumbnail}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderContent = () => {
    switch (category) {
      case 'TECHNIQUE_PLAYBOOK':
        return renderPlaybookSection();
      case 'COCKTAIL_VARIATION':
        return renderCocktailSection();
      case 'BAR_FEATURE':
        return renderBarSection();
      case 'SEASONAL_DROP':
        return renderSeasonalSection();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryTitle}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Header */}
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{categoryTitle}</Text>
          <Text style={styles.categoryDescription}>{categoryDescription}</Text>
        </View>

        {/* Content */}
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingTop: spacing(6),
    paddingBottom: spacing(2),
    backgroundColor: colors.bg,
  },
  backButton: {
    padding: spacing(1),
    marginRight: spacing(2),
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing(4),
  },
  categoryHeader: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(3),
  },
  categoryTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1.5),
  },
  categoryDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.subtext,
  },
  content: {
    paddingHorizontal: spacing(3),
  },
  section: {
    marginBottom: spacing(4),
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(2),
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing(2),
  },
  itemXP: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
    marginBottom: spacing(0.5),
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  itemDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.subtext,
  },
  itemThumbnail: {
    width: 120,
    height: 80,
    borderRadius: radii.md,
    backgroundColor: colors.line,
  },
});
