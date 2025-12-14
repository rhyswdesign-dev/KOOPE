import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, textStyles } from '../theme/tokens';
import { log } from '../lib/logger';

// Data - Unsplash placeholder images
const BRAND_OF_MONTH = {
  image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=1200&q=60',
  title: 'Brand of the Month',
  description: 'Explore the rich history and versatile flavors of our featured spirit this month. Discover exclusive cocktail recipes and expert tips to elevate your mixology skills.',
};

const DATA = [
  {
    key: 'whiskey',
    title: 'Whiskey',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1200&auto=format&fit=crop',
  },
  {
    key: 'gin',
    title: 'Gin',
    image: 'https://images.unsplash.com/photo-1542843137-4b8b2f9d7690?q=80&w=1200&auto=format&fit=crop',
  },
  {
    key: 'vodka',
    title: 'Vodka',
    image: 'https://images.unsplash.com/photo-1551022372-0bdac482b9d8?q=80&w=1200&auto=format&fit=crop',
  },
];

// Placeholder function
const onExplore = (categoryKey: string) => {
  log.info('SpiritsLandingScreen', 'Exploring recipes', { categoryKey });
};

// Helper Components
function BrandOfMonthCard() {
  return (
    <View style={styles.card}>
      <Image source={{ uri: BRAND_OF_MONTH.image }} style={styles.brandImage} />
      <View style={styles.cardContent}>
        <Text style={styles.brandTitle}>{BRAND_OF_MONTH.title}</Text>
        <Text style={styles.brandDescription}>{BRAND_OF_MONTH.description}</Text>
      </View>
    </View>
  );
}

function CategoryCard({ category }: { category: typeof DATA[0] }) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: category.image }} style={styles.categoryImage} />
      <View style={styles.categoryContent}>
        <View style={styles.categoryLeft}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          <Text style={styles.categorySubtitle}>Featured In</Text>
        </View>
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={() => onExplore(category.key)}
          activeOpacity={0.8}
        >
          <Text style={styles.exploreButtonText}>Explore Recipes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Main Screen Component
export default function SpiritsLandingScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 84 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand of the Month Card */}
        <BrandOfMonthCard />

        {/* Category Cards */}
        {DATA.map((category) => (
          <CategoryCard key={category.key} category={category} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing(2),
    gap: spacing(2),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  cardContent: {
    padding: spacing(2),
  },
  // Brand of Month styles
  brandImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  brandTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing(1),
  },
  brandDescription: {
    color: colors.subtext,
    fontSize: 16,
    lineHeight: 22,
  },
  // Category card styles
  categoryImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  categoryContent: {
    padding: spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLeft: {
    flex: 1,
  },
  categoryTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  categorySubtitle: {
    color: colors.subtext,
    fontSize: 14,
  },
  exploreButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: 999,
  },
  exploreButtonText: {
    color: colors.goldText,
    fontSize: 14,
    fontWeight: '600',
  },
});