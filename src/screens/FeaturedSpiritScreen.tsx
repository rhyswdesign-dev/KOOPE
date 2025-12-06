import React, { useMemo, useLayoutEffect } from 'react';
import { FlatList, View, Image, Text, StyleSheet, Pressable, Share, Alert } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPIRIT_TIERS } from '../config/spiritTiers';
import { getSpirit } from '../data/spirits';
import type { SpiritContent, SpiritTier } from '../types/spirit';
import ProductCarousel from '../components/spirit/ProductCarousel';
import RecipeCarousel from '../components/spirit/RecipeCarousel';
import ChallengeCard from '../components/spirit/ChallengeCard';
import EventsList from '../components/spirit/EventsList';
import AmbassadorsRow from '../components/spirit/AmbassadorsRow';
import LearningRow from '../components/spirit/LearningRow';
import RewardsGrid from '../components/spirit/RewardsGrid';
import SocialWall from '../components/spirit/SocialWall';
import BrandVideos from '../components/spirit/BrandVideos';
import PairingsSection from '../components/spirit/PairingsSection';
import SectionTitle from '../components/ui/SectionTitle';
import { useSavedItems } from '../hooks/useSavedItems';
import { colors } from '../theme/tokens';

type RootStackParamList = {
  FeaturedSpirit: { spiritId: string; tier: SpiritTier };
};

type FeaturedSpiritRouteProp = RouteProp<RootStackParamList, 'FeaturedSpirit'>;

export default function FeaturedSpiritScreen() {
  const route = useRoute<FeaturedSpiritRouteProp>();
  const navigation = useNavigation();
  const { spiritId, tier } = route.params;
  const content = getSpirit(spiritId);
  const cfg = SPIRIT_TIERS[tier];
  const { toggleSavedSpirit, isSpiritSaved } = useSavedItems();
  
  const isSaved = isSpiritSaved(spiritId);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this amazing ${content?.name} spirit! Discover premium spirits and cocktail recipes.`,
        title: `${content?.name} - Premium Spirit`,
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share at this time');
    }
  };

  const handleSave = () => {
    if (content) {
      toggleSavedSpirit({
        id: spiritId,
        name: content.name,
        subtitle: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier Spirit`,
        image: content.hero.image
      });
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Pressable 
            hitSlop={12} 
            onPress={handleShare}
            style={{ opacity: 0.8 }}
          >
            <Ionicons name="share-outline" size={24} color="#FFFFFF" />
          </Pressable>
          <Pressable 
            hitSlop={12} 
            onPress={handleSave}
            style={{ opacity: 0.8 }}
          >
            <Ionicons 
              name={isSaved ? "bookmark" : "bookmark-outline"} 
              size={24} 
              color={isSaved ? colors.gold : "#FFFFFF"} 
            />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, isSaved, content]);
  
  console.log('FeaturedSpiritScreen DEBUG:', {
    spiritId,
    tier,
    contentFound: !!content,
    contentName: content?.name,
    hasBrandVideos: !!content?.brandVideos,
    brandVideosLength: content?.brandVideos?.length || 0,
    showBrandVideos: cfg.showBrandVideos
  });

  if (!content) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Spirit not found</Text>
      </View>
    );
  }

  const header = useMemo(() => (
    <View>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Image source={{ uri: content.hero.image }} style={styles.heroImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.heroOverlay}
        >
          <Text style={styles.heroTitle}>{content.name}</Text>
          {content.hero.title && (
            <Text style={styles.heroSubtitle}>{content.hero.title}</Text>
          )}
          {content.hero.xpMessage && (
            <View style={styles.xpBadge}>
              <Text style={styles.xpText}>{content.hero.xpMessage}</Text>
            </View>
          )}
        </LinearGradient>
      </View>

      <View style={styles.content}>
        {/* Product Showcase */}
        {cfg.showProducts && content.products?.length ? (
          <View style={styles.section}>
            <SectionTitle>Product Showcase</SectionTitle>
            <ProductCarousel items={content.products} />
          </View>
        ) : null}

        {/* Pairings */}
        {content.pairings?.length ? (
          <View style={styles.section}>
            <SectionTitle>Perfect Pairings</SectionTitle>
            <PairingsSection pairings={content.pairings} />
          </View>
        ) : null}

        {/* Featured Recipes */}
        {cfg.showRecipes && content.recipes?.length ? (
          <View style={styles.section}>
            <SectionTitle>Featured Recipes</SectionTitle>
            <RecipeCarousel recipes={content.recipes} />
          </View>
        ) : null}

        {/* Sponsored Challenge */}
        {cfg.showChallenge && content.challenge ? (
          <View style={styles.section}>
            <SectionTitle>Sponsored Challenge</SectionTitle>
            <View style={styles.sectionContent}>
              <ChallengeCard {...content.challenge} />
            </View>
          </View>
        ) : null}

        {/* Events & Activations */}
        {content.events?.length ? (
          <View style={styles.section}>
            <SectionTitle>Events & Activations</SectionTitle>
            <View style={styles.sectionContent}>
              <EventsList items={content.events.slice(0, cfg.maxEvents)} />
            </View>
          </View>
        ) : null}

        {/* Ambassadors */}
        {cfg.showAmbassadors && content.ambassadors?.length ? (
          <View style={styles.section}>
            <SectionTitle>Meet the Makers / Ambassadors</SectionTitle>
            <AmbassadorsRow people={content.ambassadors} />
          </View>
        ) : null}

        {/* Learning Module */}
        {cfg.showLearning && content.learning ? (
          <View style={styles.section}>
            <SectionTitle>Learning Module</SectionTitle>
            <View style={styles.sectionContent}>
              <LearningRow module={content.learning} />
            </View>
          </View>
        ) : null}

        {/* Brand Videos */}
        {cfg.showBrandVideos && content.brandVideos?.length ? (
          <View style={styles.section}>
            <SectionTitle>Brand Videos</SectionTitle>
            <BrandVideos 
              videos={content.brandVideos} 
              onVideoPress={(video) => {
                console.log('Playing video:', video.title);
                // Here you could navigate to a video player screen
                // or open a modal with video content
              }} 
            />
          </View>
        ) : null}

        {/* XP Vault Rewards */}
        {cfg.showRewards && content.rewards?.length ? (
          <View style={styles.section}>
            <SectionTitle>XP Vault Rewards</SectionTitle>
            <RewardsGrid items={content.rewards} />
          </View>
        ) : null}

        {/* Social Wall */}
        {cfg.showSocial && content.social?.length ? (
          <View style={[styles.section, styles.lastSection]}>
            <SectionTitle>Social Wall</SectionTitle>
            <SocialWall posts={content.social} />
          </View>
        ) : null}
      </View>
    </View>
  ), [content, cfg]);

  // Use a dummy data array; body is empty because our sections live in the header.
  return (
    <FlatList
      data={[]}
      renderItem={null as any}
      keyExtractor={() => 'x'}
      ListHeaderComponent={header}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg
  },
  errorText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600'
  },
  hero: {
    height: 320,
    position: 'relative'
  },
  heroImage: {
    width: '100%',
    height: '100%'
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'flex-end',
    padding: 24,
    paddingBottom: 40
  },
  heroTitle: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 12
  },
  heroSubtitle: {
    color: colors.subtext,
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 20
  },
  xpBadge: {
    backgroundColor: colors.accent,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start'
  },
  xpText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  },
  content: {
    backgroundColor: colors.bg
  },
  section: {
    marginBottom: 24
  },
  lastSection: {
    marginBottom: 32
  },
  sectionContent: {
    paddingHorizontal: 16
  }
});