import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  ScrollView, View, Text, Image, TouchableOpacity, Pressable, StyleSheet, Share, Alert
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts, standardText, buttons } from '../theme/tokens';
import PillButton from '../components/PillButton';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { getBrandsByTier, getRandomizedBrandsByCategory } from '../data/brands';
import { getBar } from '../data/bars';
import { useSavedItems } from '../hooks/useSavedItems';
import { useSocialData } from '../hooks/useSocialData';
import { SearchableItem, FilterOptions } from '../services/searchService';
import SearchModal from '../components/SearchModal';
import FilterDrawer from '../components/FilterDrawer';
import CreateRecipeModal from '../components/CreateRecipeModal';
import { useScreenTracking } from '../context/AnalyticsContext';
import { FEATURED_SPIRIT_IMAGES } from '../data/barImages';
import { getCocktailImage } from '../../assets/images/cocktails';
import { getCocktailsOfTheWeek } from '../utils/weeklyRotation';

const chips: Array<{ key: string; label: string }> = [
  { key: 'Home', label: 'Home' },
  { key: 'Spirits', label: 'Spirits' },
  { key: 'NonAlcoholic', label: 'Non-Alcoholic' },
  { key: 'Bars',    label: 'Bars'    },
  { key: 'Events',  label: 'Events'  },
  { key: 'Games',   label: 'Games'   },
];

// Get gold tier spirits from all categories but use uploaded images
const goldSpirits = [
  ...getRandomizedBrandsByCategory('Whiskey').filter(brand => brand.tier === 'gold'),
  ...getRandomizedBrandsByCategory('Gin').filter(brand => brand.tier === 'gold'),
  ...getRandomizedBrandsByCategory('Vodka').filter(brand => brand.tier === 'gold'),
  ...getRandomizedBrandsByCategory('Tequila').filter(brand => brand.tier === 'gold'),
  ...getRandomizedBrandsByCategory('Rum').filter(brand => brand.tier === 'gold')
].map(brand => {
  // Map brand categories to uploaded images
  let featuredImage = brand.hero?.image;

  if (brand.category === 'Whiskey') {
    featuredImage = FEATURED_SPIRIT_IMAGES.whiskey;
  } else if (brand.category === 'Gin') {
    featuredImage = FEATURED_SPIRIT_IMAGES.gin;
  } else if (brand.category === 'Vodka') {
    featuredImage = FEATURED_SPIRIT_IMAGES.vodka;
  } else if (brand.category === 'Tequila') {
    featuredImage = FEATURED_SPIRIT_IMAGES.tequila;
  } else if (brand.category === 'Rum') {
    featuredImage = FEATURED_SPIRIT_IMAGES.rum;
  }

  return {
    id: brand.id,
    title: brand.name,
    subtitle: brand.hero?.tagline || `${brand.quickInfo?.style || ''} • ${brand.quickInfo?.origin || ''}`,
    img: featuredImage,
    tier: brand.tier
  };
});

// Hardcode only gold tier bars (Untitled Champagne Lounge is currently the only gold tier bar)
const goldBars = [
  {
    id: 'untitled-champagne-lounge',
    title: 'Untitled Champagne Lounge',
    subtitle: 'Premium Champagne & Elegant Atmosphere',
    img: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=60'
  }
];

const games = [
  { id: 'kings-cup', title:"King's Cup", difficulty:'Easy',
    img:'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?auto=format&fit=crop&w=880&q=60' },
  { id: 'mixmaster-challenge', title:'MixMaster Challenge', difficulty:'Medium',
    img:'https://images.unsplash.com/photo-1618221118493-9cfa1a0f3f4e?auto=format&fit=crop&w=880&q=60' },
  { id: 'speedy-sips', title:'Speedy Sips', difficulty:'Easy',
    img:'https://images.unsplash.com/photo-1582719478250-c89cae4dc84a?auto=format&fit=crop&w=880&q=60' },
];

// Get cocktails of the week (automatically rotates weekly with randomized order)
// All classic cocktails get a spotlight in rotation
const featuredCocktails = getCocktailsOfTheWeek(4);

const videos = [
  { id: 'perfect-pour-techniques', title:'Perfect Pour Techniques', duration:'Watch Now · 2 min',
    img:'https://images.unsplash.com/photo-1514362546898-4c5b9f0b1a2d?auto=format&fit=crop&w=1200&q=60' },
  { id: 'garnish-like-a-pro', title:'Garnish Like a Pro', duration:'Watch Now · 3 min',
    img:'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=60' },
  { id: 'shaking-vs-stirring', title:'Shaking vs Stirring', duration:'Watch Now · 4 min',
    img:'https://images.unsplash.com/photo-1608589589264-e35c8c6bd0ba?auto=format&fit=crop&w=1200&q=60' },
];

// Removed renderActiveContent function - using individual screens again

export default function FeaturedScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [active, setActive] = React.useState<string>('Home');
  const { toggleSavedCocktail, isCocktailSaved } = useSavedItems();
  const { toggleFollow, isFollowing } = useSocialData();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Track screen view
  useScreenTracking('FeaturedScreen');

  // Modal states
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [createRecipeModalVisible, setCreateRecipeModalVisible] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<Partial<FilterOptions>>({});

  // Ava Sterling user object for the spotlight section
  const avaSterlingSportlight = {
    id: 'ava-sterling-spotlight',
    name: 'Ava Sterling',
    username: 'ava_sterling',
    avatar: 'https://images.unsplash.com/illustration-female-avatar.png?auto=format&fit=crop&w=300&q=60',
    bio: 'London mixologist specializing in classic cocktails with modern twists',
    joinDate: '2023-01-15',
    stats: { followers: 2456, following: 892, posts: 234, recipes: 87, achievements: 15 },
    isVerified: true
  };

  const handleSearch = (query: string) => {
    // Handle search - could navigate to search results screen
    console.log('Search query:', query);
    setSearchModalVisible(false);
  };

  const handleFilterApply = (filters: Partial<FilterOptions>) => {
    setCurrentFilters(filters);
    setFilterDrawerVisible(false);
    console.log('Applied filters:', filters);
    // Apply filters to featured content
  };

  const handleRecipeCreated = (recipeId: string) => {
    console.log('Recipe created:', recipeId);
    setCreateRecipeModalVisible(false);
    // Could navigate to the created recipe
  };

  const handleCompetitionEntryCreated = (entryId: string) => {
    console.log('Competition entry created:', entryId);
    // Could navigate to the entry or competitions section
  };
  const mainScrollRef = useRef<ScrollView>(null);

  // Ensure Home button is highlighted when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setActive('Home');
    }, [])
  );

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Featured',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
      headerLeft: () => null,
      headerRight: () => null,
    });
  }, [nav, active]);

  const goto = (key: string) => {
    if (key === 'Home') {
      // Stay on this screen, keep Home highlighted, and reset scroll position
      setActive('Home');
      scrollViewRef.current?.scrollTo({ x: 0, animated: true });
      mainScrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    
    // Clear highlighting when navigating away
    setActive('');
    
    // Navigate to individual screens like before
    try {
      if (key === 'Spirits') {
        nav.navigate('Spirits' as never);
      } else if (key === 'Bars') {
        nav.navigate('Bars' as never);  
      } else if (key === 'Events') {
        nav.navigate('Events' as never);
      } else if (key === 'Games') {
        nav.navigate('Games' as never);
      } else if (key === 'Vault') {
        nav.navigate('Vault' as never);
      } else if (key === 'NonAlcoholic') {
        nav.navigate('NonAlcoholic');
      }
    } catch (error) {
      // Silently handle navigation errors for non-existent screens
    }
  };


  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView ref={mainScrollRef} style={styles.container} contentContainerStyle={{ paddingBottom: spacing(4) }}>
      {/* Chips - scrollable horizontal */}
      <ScrollView ref={scrollViewRef} horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer} contentContainerStyle={styles.chipsRow}>
        {chips.map(c => {
          const isActive = active === c.key;
          return (
            <PillButton
              key={c.key}
              title={c.label}
              onPress={() => goto(c.key)}
              style={!isActive ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line } : undefined}
              textStyle={!isActive ? { color: colors.text } : undefined}
            />
          )
        })}
      </ScrollView>


      {/* Personalization Demo Button */}
      <TouchableOpacity
        style={styles.demoButton}
        onPress={() => nav.navigate('PersonalizedHome' as never)}
      >
        <View style={styles.demoContent}>
          <Text style={styles.demoEmoji}>🧠</Text>
          <View style={styles.demoTextContainer}>
            <Text style={styles.demoTitle}>Try Personalized Recommendations</Text>
            <Text style={styles.demoSubtitle}>See mood-based feeds & real-time learning</Text>
          </View>
          <Ionicons name="arrow-forward" size={24} color={colors.gold} />
        </View>
      </TouchableOpacity>

      {/* Featured Content - show all sections */}
      <Section title="Featured Games" onPress={() => nav.navigate('Games' as never)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing(2), paddingHorizontal: spacing(2) }}>
          {games.map(g=>(
            <TouchableOpacity
              key={g.id}
              style={styles.gameCard}
              onPress={() => nav.navigate('GameDetail', { gameId: g.id })}
              activeOpacity={0.8}
            >
              <Image source={{ uri:g.img }} style={styles.gameImage}/>
              <Text style={styles.cardTitle}>{g.title}</Text>
              <Text style={styles.cardSub}>Difficulty: {g.difficulty}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Section>

      <Section title="Featured Spirit Picks" onPress={() => nav.navigate('Spirits' as never)}>
        <HScroll cards={goldSpirits} onPress={(item) => {
          // Use same navigation logic as Spirits page for gold tier spirits
          if (item.id && item.tier) {
            nav.navigate('FeaturedSpirit', { spiritId: item.id, tier: item.tier as 'bronze' | 'silver' | 'gold' });
          }
        }} />
      </Section>

      <Section title="Featured Bar Picks" onPress={() => nav.navigate('Bars' as never)}>
        <HScroll cards={goldBars} smallGap onPress={(item) => {
          if (item.title === 'Untitled Champagne Lounge') {
            nav.navigate('UntitledLounge' as never);
          } else {
            nav.navigate('BarDetails', {
              name: item.title || '',
              subtitle: item.subtitle || '',
              image: item.img || ''
            });
          }
        }} />
      </Section>

      <Section title="Cocktails of the Week">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing(2), paddingHorizontal: spacing(2) }}>
          {featuredCocktails.map(cocktail => {
            const resolvedImage = getCocktailImage(cocktail.id, cocktail.img);
            return (
            <TouchableOpacity
              key={cocktail.id}
              style={styles.cocktailCard}
              onPress={() => nav.navigate('CocktailDetail', { cocktailId: cocktail.id })}
              activeOpacity={0.8}
            >
              <Image
                source={typeof resolvedImage === 'string' ? { uri: resolvedImage } : resolvedImage}
                style={styles.cocktailImage}
                resizeMode="cover"
              />
              <View style={styles.cocktailInfo}>
                <Text style={styles.cardTitle}>{cocktail.title}</Text>
                <Text style={styles.cardSub}>{cocktail.subtitle}</Text>
                <View style={styles.cocktailMeta}>
                  <Text style={styles.cocktailDifficulty}>{cocktail.difficulty}</Text>
                  <Text style={styles.cocktailTime}>{cocktail.time}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.saveButton}
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  toggleSavedCocktail({
                    id: cocktail.id,
                    name: cocktail.title,
                    subtitle: cocktail.description,
                    image: cocktail.img
                  });
                }}
              >
                <Ionicons
                  name={isCocktailSaved(cocktail.id) ? "bookmark" : "bookmark-outline"}
                  size={20}
                  color={isCocktailSaved(cocktail.id) ? colors.accent : colors.text}
                />
              </TouchableOpacity>
            </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Section>



      <Section title="Next Upcoming Event">
        <View style={styles.eventFlyer}>
          <Image source={{ uri:'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?auto=format&fit=crop&w=1200&q=60' }}
                 style={styles.flyerImage}/>
          <View style={styles.flyerContent}>
            <Text style={styles.flyerTitle}>Mixology Master Class</Text>
            <Text style={styles.flyerSubtitle}>March 15, 2025 • 7:00 PM</Text>
            <Text style={styles.flyerDescription}>
              Join expert mixologists for hands-on training in premium cocktail techniques and presentation.
            </Text>
            <TouchableOpacity style={buttons.cta} onPress={() => nav.navigate('XPTransaction' as never)}>
              <Text style={buttons.ctaText}>Register</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.white} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
      </Section>

      <Section title="Bartending Hack Videos">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing(2), paddingHorizontal: spacing(2) }}>
          {videos.map(v=>(
            <View key={v.id} style={styles.videoCard}>
              <Image source={{ uri:v.img }} style={styles.videoImage}/>
              <Text style={styles.cardTitle}>{v.title}</Text>
              <Text style={styles.cardSub}>{v.duration}</Text>
            </View>
          ))}
        </ScrollView>
      </Section>
      </ScrollView>

      {/* Header Action Modals */}
      <SearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        onSearch={handleSearch}
      />
      
      <FilterDrawer
        visible={filterDrawerVisible}
        onClose={() => setFilterDrawerVisible(false)}
        onApply={handleFilterApply}
        currentFilters={currentFilters}
      />
      
      <CreateRecipeModal
        visible={createRecipeModalVisible}
        onClose={() => setCreateRecipeModalVisible(false)}
        onSuccess={handleRecipeCreated}
      />

    </View>
  );
}

function Section({ title, children, onPress }: { title:string; children:React.ReactNode; onPress?: () => void }) {
  return (
    <View style={styles.section}>
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.accent} style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>
      ) : (
        <Text style={styles.sectionTitle}>{title}</Text>
      )}
      <View style={{ marginTop: spacing(1) }}>{children}</View>
    </View>
  );
}

function HScroll({ cards, smallGap, onPress }:{ cards:Array<{title:string; subtitle?:string; img:any; id?:string; tier?:string}>; smallGap?:boolean; onPress?: (item: {title:string; subtitle?:string; img:any; id?:string; tier?:string}) => void }) {
  const { toggleSavedBar, isBarSaved } = useSavedItems();

  const handleShare = async (item: {title:string; subtitle?:string; img:any; id?:string; tier?:string}) => {
    try {
      await Share.share({
        message: `Check out ${item.title}! ${item.subtitle ? item.subtitle : 'A great bar to visit.'}`,
        title: `${item.title} - Bar Recommendation`,
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share at this time');
    }
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: smallGap ? spacing(1.5) : spacing(2) }}>
      {cards.map(c=>(
        <TouchableOpacity key={c.id || c.title} style={styles.hCard} onPress={() => onPress?.(c)} activeOpacity={0.8}>
          <View style={styles.cardImageContainer}>
            <Image source={typeof c.img === 'string' ? { uri: c.img } : c.img} style={styles.hImage}/>
            <TouchableOpacity
              style={styles.cardShareButton}
              onPress={() => handleShare(c)}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={16} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cardSaveButton}
              onPress={() => toggleSavedBar({
                id: c.id || c.title,
                name: c.title,
                subtitle: c.subtitle,
                image: c.img
              })}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isBarSaved(c.id || c.title) ? "bookmark" : "bookmark-outline"} 
                size={16} 
                color={isBarSaved(c.id || c.title) ? colors.accent : colors.white} 
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardTitle}>{c.title}</Text>
          {c.subtitle ? <Text style={styles.cardSub}>{c.subtitle}</Text> : null}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function ToolPromo({ title, subtitle, cta, onPress }:{
  title:string; subtitle:string; cta:string; onPress:()=>void;
}) {
  return (
    <View style={styles.toolCard}>
      <View style={{ flex:1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{subtitle}</Text>
      </View>
      <TouchableOpacity onPress={onPress} style={styles.goldBtn}>
        <Text style={styles.goldBtnText}>{cta}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.text} style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:colors.bg },

  // Scrollable chips container  
  chipsContainer: {
    paddingTop: spacing(2),
    paddingBottom: spacing(1),
  },
  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing(2),
    gap: spacing(1),
  },

  section:{ paddingHorizontal:spacing(2), marginTop:spacing(2) },
  sectionTitle:{ color:colors.text, fontSize:fonts.h2, fontWeight:'800' },

  hCard:{ width:260 },
  cardImageContainer: {
    position: 'relative',
    marginBottom: spacing(1),
  },
  hImage:{ width:260, height:160, borderRadius:radii.md },
  cardShareButton: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(4),
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSaveButton: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle:{ color:colors.text, fontWeight:'800', fontSize:fonts.h3 },
  cardSub:{ color:colors.muted, marginTop:2 },

  eventRow:{ flexDirection:'row', gap:spacing(2), alignItems:'center' },
  eventImage:{ width:120, height:90, borderRadius:radii.md },
  eventTitle:{ color:colors.text, fontWeight:'800', fontSize:fonts.h3 },
  eventSubtitle:{ color:colors.muted, marginTop:2 },

  grid2:{ flexDirection:'row', flexWrap:'wrap', gap:spacing(2) },
  gameCard:{ width:220 },
  gameImage:{ width:220, height:140, borderRadius:radii.lg, marginBottom:spacing(1) },

  videoCard:{ width:220 },
  videoImage:{ width:220, height:140, borderRadius:radii.lg, marginBottom:spacing(1) },

  masterImage:{ width:'100%', height:160, borderRadius:radii.lg },

  toolCard:{
    marginHorizontal:spacing(2), marginTop:spacing(2),
    backgroundColor:colors.card, borderRadius:radii.lg, padding:spacing(2),
    flexDirection:'row', alignItems:'center', gap:spacing(2),
    shadowColor:colors.shadow, shadowOpacity:0.25, shadowOffset:{ width:0, height:6 }, shadowRadius:10, elevation:3
  },

  // Learn More button spaced out more
  goldBtn:{ backgroundColor:colors.accent, paddingHorizontal:spacing(2), paddingVertical:spacing(1.5), borderRadius:radii.md, marginTop:spacing(1.5), flexDirection:'row', alignItems:'center', justifyContent:'center' },
  goldBtnText:{ color:colors.text, fontWeight:'800', fontSize:15 },

  // Event Flyer
  eventFlyer: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginHorizontal: spacing(2),
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3
  },
  flyerImage: {
    width: '100%',
    height: 160,
    borderRadius: radii.md,
    marginBottom: spacing(2)
  },
  flyerContent: {
    gap: spacing(1)
  },
  flyerTitle: {
    color: colors.text,
    fontSize: fonts.h2,
    fontWeight: '800'
  },
  flyerSubtitle: {
    color: colors.muted,
    fontSize: fonts.body,
    fontWeight: '600'
  },
  flyerDescription: {
    color: colors.muted,
    fontSize: fonts.body,
    lineHeight: 20,
    marginBottom: spacing(2)
  },

  // Profile Section
  profileRow: { 
    flexDirection: 'row', 
    gap: spacing(3), 
    alignItems: 'flex-start',
    paddingHorizontal: spacing(2)
  },
  avatar: { 
    width: 72, 
    height: 72, 
    borderRadius: 14 
  },
  profileInfo: {
    flex: 1,
    gap: spacing(0.5)
  },
  profileName: { 
    color: colors.text, 
    fontWeight: '800', 
    fontSize: fonts.h3, 
    marginBottom: spacing(0.5)
  },
  profileLine: { 
    color: colors.muted,
    fontSize: fonts.body,
    lineHeight: 20
  },

  // Cocktail Cards - horizontal scroll
  cocktailCard: {
    width: 260,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    position: 'relative',
  },
  cocktailImage: {
    width: 260,
    height: 180,
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
  saveButton: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Demo Button
  demoButton: {
    marginHorizontal: spacing(2),
    marginVertical: spacing(2),
    backgroundColor: colors.gold + '20',
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.gold,
    overflow: 'hidden',
  },
  demoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(2.5),
    gap: spacing(2),
  },
  demoEmoji: {
    fontSize: 40,
  },
  demoTextContainer: {
    flex: 1,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  demoSubtitle: {
    fontSize: 13,
    color: colors.subtext,
  },

});