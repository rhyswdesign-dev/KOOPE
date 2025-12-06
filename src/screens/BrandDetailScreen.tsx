import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { getBrandById } from '../data/brands';
import { colors, spacing, radii, textStyles, layouts, components } from '../theme/tokens';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  BrandDetail: { brandId: string };
};

type BrandDetailRouteProp = RouteProp<RootStackParamList, 'BrandDetail'>;

const BrandDetailScreen: React.FC = () => {
  const route = useRoute<BrandDetailRouteProp>();
  const navigation = useNavigation();
  const [isStoryExpanded, setIsStoryExpanded] = useState(false);
  
  // Load brand data based on brandId
  const brand = getBrandById(route.params.brandId);
  
  // Handle case where brand is not found
  if (!brand) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Brand not found</Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Image
            source={{ uri: brand.hero.image }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.heroGradient}
          >
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.heroTitle}>{brand.name}</Text>
            {brand.hero.tagline && (
              <Text style={styles.heroSubtitle}>{brand.hero.tagline}</Text>
            )}
          </LinearGradient>
        </View>

        {/* Quick Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Origin:</Text>
              <Text style={styles.infoValue}>{brand.quickInfo.origin}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Style:</Text>
              <Text style={styles.infoValue}>{brand.quickInfo.style}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Alcohol:</Text>
              <Text style={styles.infoValue}>{brand.quickInfo.alcohol}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Distillery:</Text>
              <Text style={styles.infoValue}>{brand.quickInfo.distillery}</Text>
            </View>
          </View>
        </View>

        {/* Story */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Story</Text>
          <Text style={styles.storyText}>
            {isStoryExpanded ? brand.story.long : brand.story.short}
          </Text>
          <TouchableOpacity 
            onPress={() => setIsStoryExpanded(!isStoryExpanded)}
            style={styles.readMoreButton}
          >
            <Text style={styles.readMoreText}>
              {isStoryExpanded ? 'Show Less' : 'Read More'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Signature Cocktails */}
        {brand.signatureCocktails && brand.signatureCocktails.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Signature Cocktails</Text>
            {brand.signatureCocktails.map((item, index) => (
              <View key={`cocktail-${index}`} style={styles.cocktailCard}>
                <Image source={{ uri: item.image }} style={styles.cocktailImage} />
                <View style={styles.cocktailContent}>
                  <Text style={styles.cocktailName}>{item.name}</Text>
                  <Text style={styles.cocktailDescription}>{item.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Awards */}
        {brand.awards && brand.awards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Awards & Recognition</Text>
            {brand.awards.map((award, index) => (
              <View key={index} style={styles.awardItem}>
                <Ionicons name="trophy" size={20} color={colors.gold || '#E4933E'} />
                <Text style={styles.awardText}>{award}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: layouts.screen,
  errorContainer: {
    ...layouts.screen,
    ...layouts.center,
  },
  errorText: {
    ...textStyles.h3,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: spacing(4),
  },
  hero: {
    height: 320,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'space-between',
    padding: spacing(2),
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: spacing(0.5),
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.subtext,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: spacing(2),
    paddingTop: spacing(3),
  },
  sectionTitle: {
    ...textStyles.h3,
    marginBottom: spacing(2),
  },
  infoGrid: {
    gap: spacing(1.5),
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    ...textStyles.small,
    fontWeight: '600',
    color: colors.text,
  },
  infoValue: {
    ...textStyles.small,
    color: colors.muted,
    flex: 1,
    textAlign: 'right',
  },
  storyText: {
    ...textStyles.body,
    marginBottom: spacing(2),
  },
  readMoreButton: {
    alignSelf: 'flex-start',
  },
  readMoreText: {
    ...textStyles.bodyMedium,
    color: colors.gold,
  },
  cocktailCard: {
    ...layouts.card,
    flexDirection: 'row',
    marginBottom: spacing(2),
    overflow: 'hidden',
  },
  cocktailImage: {
    width: 80,
    height: 80,
  },
  cocktailContent: {
    flex: 1,
    padding: spacing(2),
    justifyContent: 'center',
  },
  cocktailName: {
    ...textStyles.bodyMedium,
    fontWeight: '700',
    marginBottom: spacing(0.5),
  },
  cocktailDescription: {
    ...textStyles.small,
    color: colors.muted,
  },
  awardItem: {
    ...layouts.row,
    marginBottom: spacing(1.5),
  },
  awardText: {
    ...textStyles.small,
    color: colors.text,
    marginLeft: spacing(1),
    flex: 1,
  },
  bottomSpacing: {
    height: spacing(4),
  },
});

export default BrandDetailScreen;