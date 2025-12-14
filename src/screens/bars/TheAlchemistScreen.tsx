import React, { useState, useLayoutEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Pressable,
  Share,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, textStyles, layouts } from '../../theme/tokens';
import { useSavedItems } from '../../hooks/useSavedItems';
import { log } from '../../lib/logger';

import { getBar } from '../../data/bars';
import { BAR_TIERS } from '../../config/barTiers';
import Card from '../../components/ui/Card';
import PillButton from '../../components/PillButton';
import Section from '../../components/ui/Section';
import Avatar from '../../components/ui/Avatar';
import Icon from '../../components/ui/Icon';
import BarVibesSection from '../../components/bar/BarVibesSection';
import { LocationMap } from '../../components/ui';

const { width } = Dimensions.get('window');

const TheAlchemistScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [isStoryExpanded, setIsStoryExpanded] = useState(false);
  const { toggleSavedBar, isBarSaved } = useSavedItems();
  
  const bar = getBar('the_alchemist');
  
  if (!bar) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Bar not found</Text>
      </View>
    );
  }

  const barId = 'the-alchemist';
  const isSaved = isBarSaved(barId);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out The Alchemist! Modern Laboratory - A unique cocktail experience with molecular mixology.`,
        title: `The Alchemist - Premium Bar Experience`,
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share at this time');
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Pressable hitSlop={10} onPress={() => toggleSavedBar({
            id: barId,
            name: 'The Alchemist',
            subtitle: bar.quickInfo?.vibe || bar.hero?.location || 'Premium Bar Experience',
            image: bar.hero?.image || ''
          })}>
            <Ionicons 
              name={isSaved ? "bookmark" : "bookmark-outline"} 
              size={20} 
              color={isSaved ? colors.gold : colors.text} 
            />
          </Pressable>
          <Pressable hitSlop={10} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, isSaved, bar]);

  // Use silver tier for enhanced features
  const tier = 'silver';
  const config = BAR_TIERS[tier];

  const renderEvent = ({ item }: { item: any }) => (
    <View style={styles.eventRow}>
      <Icon name="calendar" size={24} color={colors.accent} />
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventDate}>
          {new Date(item.dateISO).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric'
          })}
          {item.time && ` • ${item.time}`}
          {item.city && ` • ${item.city}`}
        </Text>
      </View>
    </View>
  );

  const limitedSignatureDrinks = bar.signatureDrinks || [];
  const limitedEvents = bar.events?.slice(0, config.maxEvents) || [];
  const limitedSocial = bar.social || [];

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <ImageBackground
          source={{ uri: bar.hero.image }}
          style={styles.hero}
          accessibilityLabel="Bar hero image"
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.heroGradient}
          >
            <Text style={styles.heroTitle}>{bar.name}</Text>
            {bar.hero.location && (
              <Text style={styles.heroSubtitle}>{bar.hero.location}</Text>
            )}
          </LinearGradient>
        </ImageBackground>

        {/* Quick Info - Silver/Gold */}
        {config.showQuickInfo && bar.quickInfo && (
          <Section title="At a Glance">
            <View style={styles.sectionContent}>
              {bar.quickInfo.music && (
                <View style={styles.quickInfoRow}>
                  <Text style={styles.quickInfoLabel}>Music:</Text>
                  <Text style={styles.quickInfoValue}>{bar.quickInfo.music}</Text>
                </View>
              )}
              {bar.quickInfo.vibe && (
                <View style={styles.quickInfoRow}>
                  <Text style={styles.quickInfoLabel}>Vibe:</Text>
                  <Text style={styles.quickInfoValue}>{bar.quickInfo.vibe}</Text>
                </View>
              )}
              {bar.quickInfo.menu && (
                <View style={styles.quickInfoRow}>
                  <Text style={styles.quickInfoLabel}>Menu:</Text>
                  <Text style={styles.quickInfoValue}>{bar.quickInfo.menu}</Text>
                </View>
              )}
              {bar.quickInfo.popularNights && (
                <View style={styles.quickInfoRow}>
                  <Text style={styles.quickInfoLabel}>Popular Nights:</Text>
                  <Text style={styles.quickInfoValue}>{bar.quickInfo.popularNights}</Text>
                </View>
              )}
              {bar.quickInfo.happyHour && (
                <View style={styles.quickInfoRow}>
                  <Text style={styles.quickInfoLabel}>Happy Hour:</Text>
                  <Text style={styles.quickInfoValue}>{bar.quickInfo.happyHour}</Text>
                </View>
              )}
            </View>
          </Section>
        )}

        {/* Location */}
        {bar.location && (
          <Section title="Location & Contact">
            <LocationMap
              location={bar.location}
              height={220}
              onMarkerPress={(location) => log.info('TheAlchemistScreen', 'Bar location pressed', { locationName: location.name })}
            />
          </Section>
        )}

        {/* Signature Drinks */}
        {limitedSignatureDrinks.length > 0 && (
          <Section title="Signature Drinks">
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {limitedSignatureDrinks.map((item, index) => (
                <Card 
                  key={`drink-${index}`}
                  imageTop={item.image}
                  style={styles.drinkCard}
                >
                  <Text style={styles.drinkName}>{item.name}</Text>
                  {item.tagline && <Text style={styles.drinkTagline}>{item.tagline}</Text>}
                  {item.price && <Text style={styles.drinkPrice}>{item.price}</Text>}
                </Card>
              ))}
            </ScrollView>
          </Section>
        )}

        {/* Challenge */}
        {config.showChallenge && bar.challenge && (
          <Section title="Challenge">
            <Card 
              imageTop={bar.challenge.image}
              style={styles.challengeCard}
              footer={
                <PillButton 
                  title="Learn More"
                  onPress={() => navigation.navigate('CocktailSubmission')}
                  variant="primary"
                />
              }
            >
              <Text style={styles.challengeTitle}>{bar.challenge.title}</Text>
              <Text style={styles.challengeCopy}>{bar.challenge.copy}</Text>
            </Card>
          </Section>
        )}

        {/* Events */}
        {config.maxEvents > 0 && limitedEvents.length > 0 && (
          <Section title="Upcoming Events">
            <View style={styles.sectionContent}>
              {limitedEvents.map((event, index) => (
                <View key={`event-${index}`}>
                  {renderEvent({ item: event })}
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* Bar Vibes - Silver/Gold */}
        {(tier === 'silver' || tier === 'gold') && <BarVibesSection vibes={bar.vibes} />}

        {/* Social */}
        {limitedSocial.length > 0 && (
          <Section title="Social">
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {limitedSocial.map((item, index) => (
                <Card 
                  key={`social-${index}`}
                  imageTop={item.image}
                  style={styles.socialCard}
                >
                  {item.handle && <Text style={styles.socialHandle}>{item.handle}</Text>}
                  {item.caption && <Text style={styles.socialCaption}>{item.caption}</Text>}
                </Card>
              ))}
            </ScrollView>
          </Section>
        )}

        {/* Story */}
        {bar.story?.short && (
          <Section title="Our Story">
            <View style={styles.sectionContent}>
              <Text style={styles.storyText}>
                {isStoryExpanded && bar.story.long 
                  ? bar.story.long 
                  : bar.story.short}
              </Text>
              {bar.story.long && (
                <TouchableOpacity 
                  onPress={() => setIsStoryExpanded(!isStoryExpanded)}
                  style={styles.readMoreButton}
                >
                  <Text style={styles.readMoreText}>
                    {isStoryExpanded ? 'Show Less' : 'Read More'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Section>
        )}

        {/* Bottom spacing for sticky bar */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Sticky Bottom CTA Bar */}
      <SafeAreaView style={styles.stickyBar}>
        <View style={styles.ctaContainer}>
          <PillButton 
            title="Buy Now"
            onPress={() => {}}
            variant="primary"
            style={styles.ctaButton}
          />
          <PillButton 
            title="Find Near You"
            onPress={() => {}}
            variant="outline"
            style={styles.ctaButton}
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  errorText: {
    fontSize: 18,
    color: colors.white,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 100, // Account for sticky bar
  },

  // Hero
  hero: {
    height: 320,
    justifyContent: 'flex-end',
  },
  heroGradient: {
    padding: 24,
    paddingBottom: 32,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.white,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // Content
  sectionContent: {
    paddingHorizontal: 16,
  },

  // Quick Info - Silver/Gold
  quickInfoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  quickInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    width: 120,
  },
  quickInfoValue: {
    fontSize: 14,
    color: colors.textMuted,
    flex: 1,
  },

  // Horizontal Lists
  horizontalList: {
    paddingHorizontal: 16,
    gap: 16,
  },

  // Featured Drinks
  drinkCard: {
    width: 200,
  },
  drinkName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  drinkTagline: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
  },
  drinkPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },

  // Challenge
  challengeCard: {
    marginHorizontal: 16,
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
  },
  challengeCopy: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 22,
  },

  // Events
  eventRow: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  eventContent: {
    marginLeft: 12,
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: colors.textMuted,
  },

  // Social
  socialCard: {
    width: 200,
  },
  socialHandle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 4,
  },
  socialCaption: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 18,
  },

  // Story
  storyText: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
    marginBottom: 16,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '600',
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 32,
  },

  // Sticky CTA Bar
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  ctaContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  ctaButton: {
    flex: 1,
  },
});

export default TheAlchemistScreen;