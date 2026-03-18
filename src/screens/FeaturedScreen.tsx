import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  ScrollView, View, Text, Image, TouchableOpacity, StyleSheet
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { FilterOptions } from '../services/searchService';
import SearchModal from '../components/SearchModal';
import FilterDrawer from '../components/FilterDrawer';
import { useScreenTracking } from '../context/AnalyticsContext';
import { log } from '../lib/logger';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { getFeaturedVaultItems } from '../data/vaultData';

// Drinking games moved to Vault

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
  const mainScrollRef = useRef<ScrollView>(null);
  const { gateWithTrigger: filterGate, hasAccess: hasFilterAccess } = useFeatureAccess('advanced_filters');

  // Track screen view
  useScreenTracking('FeaturedScreen');

  // Modal states
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<Partial<FilterOptions>>({});

  const handleSearch = (query: string) => {
    // Handle search - could navigate to search results screen
    log.info('FeaturedScreen', 'Search query', { query });
    setSearchModalVisible(false);
  };

  const handleFilterApply = (filters: Partial<FilterOptions>) => {
    // T2: Gate advanced filters for free users (categories/spirit filter is always allowed)
    const hasAdvancedFilters = (
      (filters.difficulties && filters.difficulties.length > 0) ||
      (filters.ingredients && filters.ingredients.length > 0) ||
      (filters.equipment && filters.equipment.length > 0) ||
      (filters.tags && filters.tags.length > 0) ||
      filters.showOnlyFavorites ||
      filters.showOnlyCompleted
    );
    if (hasAdvancedFilters && !hasFilterAccess) {
      filterGate('T2');
      return;
    }

    setCurrentFilters(filters);
    setFilterDrawerVisible(false);
    log.info('FeaturedScreen', 'Applied filters', { filters });
    // Apply filters to featured content
  };

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Featured',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
      headerRight: () => null,
    });
  }, [nav]);


  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView ref={mainScrollRef} style={styles.container} contentContainerStyle={{ paddingBottom: spacing(4) }}>
      {/* Featured Content */}

      <Section title="Brand Partnerships">
        <View style={styles.emptyStateCard}>
          <Ionicons name="business-outline" size={48} color={colors.subtext} />
          <Text style={styles.emptyStateTitle}>Premium Brand Partnerships</Text>
          <Text style={styles.emptyStateDescription}>
            We're partnering with top spirits brands to bring you exclusive recipes and sponsored content.
          </Text>
        </View>
      </Section>

      <Section title="From the Vault" onPress={() => nav.navigate('VaultTab' as any)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing(2), paddingHorizontal: spacing(2) }}>
          {getFeaturedVaultItems().map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.vaultCard}
              onPress={() => nav.navigate('VaultTab' as any)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: item.image }}
                style={styles.vaultImage}
                resizeMode="cover"
              />
              <View style={styles.vaultBadge}>
                <Ionicons name="star" size={12} color={colors.gold} />
                <Text style={styles.vaultBadgeText}>{item.xpCost} XP</Text>
              </View>
              <View style={styles.vaultInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardSub} numberOfLines={2}>{item.description}</Text>
                <View style={styles.vaultMeta}>
                  <Text style={styles.vaultStock}>{item.currentStock} left</Text>
                  <Text style={styles.vaultValue}>{item.estimatedValue}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:colors.bg },

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
  gameCard:{ width:220, position: 'relative' },
  gameImage:{ width:220, height:140, borderRadius:radii.lg, marginBottom:spacing(1) },
  gameInfo: {
    gap: spacing(0.5),
  },
  lockedCard: {
    opacity: 0.8,
  },
  lockedImage: {
    opacity: 0.4,
  },
  lockedText: {
    opacity: 0.6,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.lg,
    gap: spacing(1),
  },
  lockText: {
    color: colors.gold,
    fontSize: fonts.small,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

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

  // Premium Badge
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    marginBottom: spacing(1),
    marginLeft: spacing(2),
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 0.5,
  },

  // Cocktail Lock Overlay (for FREE users)
  lockedCocktailImage: {
    opacity: 0.6,
  },
  cocktailLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  cocktailLockContent: {
    alignItems: 'center',
    gap: spacing(1),
    zIndex: 1,
  },
  cocktailLockText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Empty State
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(4),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginHorizontal: spacing(2),
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1),
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Vault Cards
  vaultCard: {
    width: 220,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    position: 'relative',
  },
  vaultImage: {
    width: 220,
    height: 140,
  },
  vaultBadge: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderRadius: radii.full,
  },
  vaultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
  },
  vaultInfo: {
    padding: spacing(2),
  },
  vaultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing(1),
  },
  vaultStock: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  vaultValue: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '600',
  },

});
