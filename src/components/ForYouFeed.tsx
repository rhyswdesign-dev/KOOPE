/**
 * FOR YOU FEED COMPONENT
 * Personalized cocktail discovery feed matching Bar Match design
 * Features: Bar Match hero card, recommended cocktails with tabs, lessons, spirit shelf, flavor insights
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts, textStyles } from '../theme/tokens';
import { usePersonalization } from '../store/usePersonalization';
import RecipeCard from './RecipeCard';
import { ALL_COCKTAILS } from '../data/cocktails';
import { getCocktailImage } from '../../assets/images/cocktails';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;
const BOTTLE_WIDTH = 100;

interface ForYouFeedProps {
  onCocktailPress: (cocktail: any) => void;
  onSaveCocktail?: (cocktail: any) => void;
  onAddToCart?: (cocktail: any) => void;
  savedRecipeIds?: Set<string>;
  onRefineProfile?: () => void; // NEW: Callback to refine taste profile
}

export default function ForYouFeed({
  onCocktailPress,
  onSaveCocktail,
  onAddToCart,
  savedRecipeIds = new Set(),
  onRefineProfile,
}: ForYouFeedProps) {
  const { profile, recommendations, getFeaturedCocktails } = usePersonalization();
  const [selectedTab, setSelectedTab] = useState<'matched' | 'beginner' | 'challenge'>('matched');

  // Get personalized data or fallback to defaults
  const tasteProfile = useMemo(() => {
    if (!profile) return { style: 'Classic', spirits: ['Whiskey', 'Gin'], flavors: ['Citrus', 'Herbal'] };

    const style = profile.skillLevel === 'beginner' ? 'Beginner Friendly' :
                  profile.complexityScore > 70 ? 'Bold & Classic' :
                  'Balanced & Smooth';

    const spirits = profile.favoriteSpirits.slice(0, 2).map(s =>
      s.charAt(0).toUpperCase() + s.slice(1)
    );

    const flavors = profile.flavorPreferences.slice(0, 2).map(f =>
      f.charAt(0).toUpperCase() + f.slice(1)
    );

    return { style, spirits, flavors };
  }, [profile]);

  // Get recommended cocktails by category
  const recommendedCocktails = useMemo(() => {
    const featured = getFeaturedCocktails() || ALL_COCKTAILS.slice(0, 10);

    return {
      matched: featured.slice(0, 8),
      beginner: ALL_COCKTAILS.filter(c => c.difficulty === 'Easy').slice(0, 8),
      challenge: ALL_COCKTAILS.filter(c => c.difficulty === 'Hard' || c.difficulty === 'Medium').slice(0, 8),
    };
  }, [getFeaturedCocktails]);

  // Calculate flavor breakdown
  const flavorBreakdown = useMemo(() => {
    if (!profile?.flavorScores) {
      return [
        { name: 'Citrus', percentage: 35, color: '#FFD700' },
        { name: 'Herbal', percentage: 25, color: '#90EE90' },
        { name: 'Sweet', percentage: 20, color: '#FF69B4' },
        { name: 'Smoky', percentage: 10, color: '#8B4513' },
        { name: 'Bitter', percentage: 10, color: '#8B0000' },
      ];
    }

    const total = Object.values(profile.flavorScores).reduce((sum, val) => sum + val, 0);
    const colorMap: Record<string, string> = {
      citrus: '#FFD700',
      herbal: '#90EE90',
      sweet: '#FF69B4',
      smoky: '#8B4513',
      bitter: '#8B0000',
      floral: '#DDA0DD',
      spiced: '#D2691E',
    };

    return Object.entries(profile.flavorScores)
      .map(([name, score]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        percentage: Math.round((score / total) * 100),
        color: colorMap[name] || '#888',
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }, [profile]);

  // Get spirit shelf items
  const spiritShelf = useMemo(() => {
    const spirits = profile?.favoriteSpirits || ['whiskey', 'gin', 'rum', 'tequila'];
    return spirits.slice(0, 4).map(spirit => ({
      id: spirit,
      name: spirit.charAt(0).toUpperCase() + spirit.slice(1),
      description: `Your ${spirit} collection`,
      image: `https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=400&q=80`,
    }));
  }, [profile]);

  const renderBarMatchCard = () => (
    <LinearGradient
      colors={['#4A2C2A', '#2B1B12', '#1A0F0A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.barMatchCard}
    >
      {/* Background Image */}
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=60' }}
        style={styles.barMatchImage}
        blurRadius={2}
      />

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['rgba(42, 28, 42, 0.9)', 'rgba(26, 15, 10, 0.95)']}
        style={styles.barMatchOverlay}
      >
        <View style={styles.barMatchContent}>
          <Text style={styles.barMatchTitle}>Your Bar Match 🍷</Text>
          <Text style={styles.barMatchSubtitle}>
            Here's your personalized cocktail path, based on your taste profile.
          </Text>

          {/* Taste Profile Tag */}
          <View style={styles.tasteProfileTag}>
            <Text style={styles.tasteProfileText}>✨ {tasteProfile.style}</Text>
          </View>

          {/* Flavor Tags */}
          <View style={styles.flavorTagsRow}>
            <Text style={styles.flavorTagText}>
              {tasteProfile.spirits.join(' • ')} | {tasteProfile.flavors.join(' • ')}
            </Text>
          </View>

          {/* CTA Button */}
          <TouchableOpacity style={styles.barMatchCTA} activeOpacity={0.8}>
            <Text style={styles.barMatchCTAText}>Explore Your Cocktails</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </LinearGradient>
  );

  const renderRecommendedCocktails = () => {
    const tabs = [
      { id: 'matched' as const, label: '⭐ Matched for You', icon: 'star' },
      { id: 'beginner' as const, label: '🌱 Beginner Friendly', icon: 'leaf' },
      { id: 'challenge' as const, label: '🌶️ Flavor Challenges', icon: 'flame' },
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended Cocktails</Text>

        {/* Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBar}
          contentContainerStyle={styles.tabBarContent}
        >
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                selectedTab === tab.id && styles.tabActive,
              ]}
              onPress={() => setSelectedTab(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabText,
                selectedTab === tab.id && styles.tabTextActive,
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Horizontal Cocktail Cards */}
        <FlatList
          horizontal
          data={recommendedCocktails[selectedTab]}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cocktailList}
          renderItem={({ item }) => (
            <View style={styles.cocktailCardWrapper}>
              <RecipeCard
                recipe={{
                  id: item.id,
                  name: item.name,
                  description: item.subtitle || item.description,
                  image: getCocktailImage(item.id, item.image),
                  difficulty: item.difficulty || 'Medium',
                  time: item.time || '5 min',
                }}
                onPress={() => onCocktailPress(item)}
                onSave={onSaveCocktail}
                onAddToCart={onAddToCart}
                isSaved={savedRecipeIds.has(item.id)}
              />
            </View>
          )}
        />
      </View>
    );
  };

  const renderSuggestedLesson = () => {
    const lesson = {
      title: profile?.favoriteSpirits?.[0]
        ? `Master ${profile.favoriteSpirits[0].charAt(0).toUpperCase() + profile.favoriteSpirits[0].slice(1)}`
        : 'Master Whiskey',
      description: profile?.skillLevel === 'beginner'
        ? 'Learn the fundamentals of spirit tasting and cocktail creation'
        : 'Advance your skills with professional techniques',
      icon: 'school',
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suggested Lessons</Text>

        <Pressable style={styles.lessonCard}>
          <LinearGradient
            colors={[colors.accent, colors.accentDark]}
            style={styles.lessonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.lessonIconContainer}>
              <Ionicons name={lesson.icon as any} size={32} color={colors.white} />
            </View>

            <View style={styles.lessonContent}>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              <Text style={styles.lessonDescription}>{lesson.description}</Text>

              <TouchableOpacity style={styles.lessonCTA}>
                <Text style={styles.lessonCTAText}>Start Lesson</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.white} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  const renderSpiritShelf = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Your Spirit Shelf</Text>

      <FlatList
        horizontal
        data={spiritShelf}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.spiritShelfList}
        renderItem={({ item }) => (
          <Pressable style={styles.spiritBottle}>
            <Image
              source={{ uri: item.image }}
              style={styles.bottleImage}
            />
            <Text style={styles.bottleName}>{item.name}</Text>
            <Text style={styles.bottleDescription}>{item.description}</Text>
          </Pressable>
        )}
      />
    </View>
  );

  const renderFlavorInsights = () => (
    <View style={styles.section}>
      <LinearGradient
        colors={['#1A1410', '#2B1B12']}
        style={styles.flavorCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Text style={styles.flavorCardTitle}>Your Flavor Bias</Text>

        {/* Flavor Breakdown */}
        <View style={styles.flavorBreakdown}>
          {flavorBreakdown.map((flavor, index) => (
            <View key={flavor.name} style={styles.flavorRow}>
              <View style={styles.flavorInfo}>
                <View style={[styles.flavorDot, { backgroundColor: flavor.color }]} />
                <Text style={styles.flavorName}>{flavor.name}</Text>
              </View>
              <Text style={styles.flavorPercentage}>{flavor.percentage}%</Text>
            </View>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.flavorDescription}>
          Your palate leans toward {flavorBreakdown[0]?.name.toLowerCase()} notes, with a
          balanced appreciation for {flavorBreakdown[1]?.name.toLowerCase()} undertones.
          This profile suggests you enjoy cocktails with bright, expressive flavors.
        </Text>

        {/* XP Banner */}
        <View style={styles.xpBanner}>
          <Text style={styles.xpBannerText}>✨ Taste Profile Saved! +150 XP</Text>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.flavorCTA}>
          <Text style={styles.flavorCTAText}>Continue Learning</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-social" size={16} color={colors.accent} />
          <Text style={styles.shareButtonText}>Share My Bar Match</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Refine Taste Profile Banner */}
      {onRefineProfile && (
        <TouchableOpacity
          style={styles.refineBanner}
          onPress={onRefineProfile}
          activeOpacity={0.8}
        >
          <Ionicons name="color-wand" size={20} color={colors.accent} />
          <View style={styles.refineTextContainer}>
            <Text style={styles.refineTitle}>Refine Your Taste Profile</Text>
            <Text style={styles.refineSubtitle}>Update preferences for better recommendations</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.accent} />
        </TouchableOpacity>
      )}

      {renderBarMatchCard()}
      {renderRecommendedCocktails()}
      {renderSuggestedLesson()}
      {renderSpiritShelf()}
      {renderFlavorInsights()}

      {/* Bottom Padding */}
      <View style={{ height: spacing(4) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  contentContainer: {
    paddingHorizontal: spacing(2),
  },

  // Refine Banner Styles
  refineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentBg,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginTop: spacing(2),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: colors.accent,
    gap: spacing(1.5),
  },
  refineTextContainer: {
    flex: 1,
  },
  refineTitle: {
    fontSize: fonts.body,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  refineSubtitle: {
    fontSize: fonts.caption,
    color: colors.subtext,
  },

  // Bar Match Hero Card
  barMatchCard: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginTop: spacing(2),
    marginBottom: spacing(3),
    height: 380,
    position: 'relative',
  },
  barMatchImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  barMatchOverlay: {
    flex: 1,
    padding: spacing(3),
    justifyContent: 'flex-end',
  },
  barMatchContent: {
    gap: spacing(2),
  },
  barMatchTitle: {
    fontSize: fonts.h1,
    fontWeight: '900',
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  barMatchSubtitle: {
    fontSize: fonts.body,
    color: colors.textMuted,
    lineHeight: 22,
    maxWidth: '90%',
  },
  tasteProfileTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tasteProfileText: {
    fontSize: fonts.small,
    fontWeight: '700',
    color: colors.white,
  },
  flavorTagsRow: {
    marginTop: spacing(1),
  },
  flavorTagText: {
    fontSize: fonts.small,
    color: colors.accentLight,
    fontWeight: '600',
  },
  barMatchCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 24,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
    gap: spacing(1),
    marginTop: spacing(1),
  },
  barMatchCTAText: {
    fontSize: fonts.body,
    fontWeight: '700',
    color: colors.white,
  },

  // Section Styles
  section: {
    marginBottom: spacing(4),
  },
  sectionTitle: {
    fontSize: fonts.h2,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(2),
  },

  // Tab Bar
  tabBar: {
    marginBottom: spacing(2),
  },
  tabBarContent: {
    gap: spacing(1),
  },
  tab: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderRadius: 20,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  tabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabText: {
    fontSize: fonts.small,
    fontWeight: '600',
    color: colors.subtext,
  },
  tabTextActive: {
    color: colors.white,
  },

  // Cocktail List
  cocktailList: {
    gap: spacing(2),
    paddingRight: spacing(2),
  },
  cocktailCardWrapper: {
    width: CARD_WIDTH,
  },

  // Lesson Card
  lessonCard: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  lessonGradient: {
    flexDirection: 'row',
    padding: spacing(3),
    alignItems: 'center',
    gap: spacing(2),
  },
  lessonIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: fonts.h3,
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing(0.5),
  },
  lessonDescription: {
    fontSize: fonts.small,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
    marginBottom: spacing(1.5),
  },
  lessonCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    alignSelf: 'flex-start',
  },
  lessonCTAText: {
    fontSize: fonts.small,
    fontWeight: '700',
    color: colors.white,
  },

  // Spirit Shelf
  spiritShelfList: {
    gap: spacing(2),
    paddingRight: spacing(2),
  },
  spiritBottle: {
    width: BOTTLE_WIDTH,
    alignItems: 'center',
  },
  bottleImage: {
    width: BOTTLE_WIDTH,
    height: 140,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    marginBottom: spacing(1),
  },
  bottleName: {
    fontSize: fonts.small,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  bottleDescription: {
    fontSize: fonts.caption,
    color: colors.subtext,
    textAlign: 'center',
  },

  // Flavor Insights Card
  flavorCard: {
    borderRadius: radii.lg,
    padding: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
  },
  flavorCardTitle: {
    fontSize: fonts.h2,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(2),
  },
  flavorBreakdown: {
    gap: spacing(1.5),
    marginBottom: spacing(2),
  },
  flavorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flavorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  flavorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  flavorName: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.text,
  },
  flavorPercentage: {
    fontSize: fonts.body,
    fontWeight: '700',
    color: colors.accent,
  },
  flavorDescription: {
    fontSize: fonts.small,
    color: colors.subtext,
    lineHeight: 20,
    marginBottom: spacing(2),
  },
  xpBanner: {
    backgroundColor: 'rgba(228, 147, 62, 0.15)',
    borderRadius: radii.md,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    borderWidth: 1,
    borderColor: 'rgba(228, 147, 62, 0.3)',
    marginBottom: spacing(2),
  },
  xpBannerText: {
    fontSize: fonts.small,
    fontWeight: '700',
    color: colors.accent,
    textAlign: 'center',
  },
  flavorCTA: {
    backgroundColor: colors.accent,
    borderRadius: 24,
    paddingVertical: spacing(1.5),
    alignItems: 'center',
    marginBottom: spacing(1.5),
  },
  flavorCTAText: {
    fontSize: fonts.body,
    fontWeight: '700',
    color: colors.white,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    paddingVertical: spacing(1.5),
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  shareButtonText: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.accent,
  },
});
