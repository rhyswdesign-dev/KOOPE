import React, { useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

const categories = [
  { 
    id: 'mystery-drop', 
    name: 'Mystery Drop', 
    icon: 'gift-outline', 
    color: colors.error,
    description: 'Surprise collections with premium items',
    itemCount: 12
  },
  { 
    id: 'cocktail-kit', 
    name: 'Cocktail Kit', 
    icon: 'wine-outline', 
    color: '#4ECDC4',
    description: 'Complete cocktail sets with recipes',
    itemCount: 18
  },
  { 
    id: 'bar-tools', 
    name: 'Bar Tools', 
    icon: 'hammer-outline', 
    color: '#45B7D1',
    description: 'Professional bartending equipment',
    itemCount: 24
  },
  { 
    id: 'mixology-book', 
    name: 'Mixology Book', 
    icon: 'book-outline', 
    color: '#96CEB4',
    description: 'Educational guides and recipe collections',
    itemCount: 8
  },
  { 
    id: 'glassware', 
    name: 'Glassware', 
    icon: 'wine-outline', 
    color: '#FFEAA7',
    description: 'Premium glasses for every cocktail',
    itemCount: 15
  },
  { 
    id: 'premium-spirits', 
    name: 'Premium Spirits', 
    icon: 'wine-outline', 
    color: '#DDA0DD',
    description: 'Rare and exclusive bottles',
    itemCount: 32
  },
  { 
    id: 'artwork', 
    name: 'Artwork', 
    icon: 'image-outline', 
    color: '#98D8C8',
    description: 'Bar-themed art and prints',
    itemCount: 6
  },
  { 
    id: 'home-decor', 
    name: 'Home Decor', 
    icon: 'home-outline', 
    color: '#F7DC6F',
    description: 'Stylish accessories for your home bar',
    itemCount: 11
  },
  { 
    id: 'brand-merch', 
    name: 'Brand Merch', 
    icon: 'shirt-outline', 
    color: '#BB8FCE',
    description: 'Branded apparel and accessories',
    itemCount: 9
  },
  { 
    id: 'event-access', 
    name: 'Event Access', 
    icon: 'ticket-outline', 
    color: '#85C1E9',
    description: 'Exclusive events and experiences',
    itemCount: 5
  },
];

export default function CategoriesListScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Browse Categories',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
    });
  }, [nav]);

  const handleCategoryPress = (category: typeof categories[0]) => {
    nav.navigate('CategoryDetail', {
      categoryId: category.id, 
      categoryName: category.name 
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Shop by Category</Text>
          <Text style={styles.headerSubtitle}>
            Discover premium collections curated for the modern mixologist
          </Text>
        </View>

        <View style={styles.categoriesList}>
          {categories.map((category, index) => (
            <Pressable
              key={category.id}
              style={styles.categoryCard}
              onPress={() => handleCategoryPress(category)}
              android_ripple={{ color: category.color + '20' }}
            >
              <View style={styles.categoryContent}>
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <Ionicons name={category.icon as any} size={28} color={category.color} />
                </View>
                
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryDescription}>{category.description}</Text>
                  <Text style={styles.categoryCount}>{category.itemCount} items available</Text>
                </View>

                <View style={styles.categoryArrow}>
                  <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            New categories and items are added regularly. Check back often for the latest drops!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingBottom: spacing(4),
  },
  header: {
    padding: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(1),
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.subtext,
    lineHeight: 22,
  },
  categoriesList: {
    padding: spacing(3),
    gap: spacing(2),
  },
  categoryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(3),
    gap: spacing(3),
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
    gap: spacing(0.5),
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  categoryDescription: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    marginTop: spacing(0.5),
  },
  categoryArrow: {
    marginLeft: spacing(1),
  },
  footer: {
    padding: spacing(3),
    paddingTop: spacing(2),
  },
  footerText: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
  },
});
