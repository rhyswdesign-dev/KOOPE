import React, { useLayoutEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Modal,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import PillButton from '../components/PillButton';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { getRandomizedBrandsByCategory } from '../data/brands';
import { useSavedItems } from '../hooks/useSavedItems';
import { SearchableItem, FilterOptions } from '../services/searchService';
import SearchModal from '../components/SearchModal';
import FilterDrawer from '../components/FilterDrawer';
import CreateRecipeModal from '../components/CreateRecipeModal';
import { log } from '../lib/logger';


const chips: Array<{ key: string; label: string }> = [
  { key: 'Home', label: 'Home' },
  { key: 'Spirits', label: 'Spirits' },
  { key: 'NonAlcoholic', label: 'Non-Alcoholic' },
  { key: 'Bars', label: 'Bars' },
  { key: 'Events', label: 'Events' },
  { key: 'Games', label: 'Games' },
  { key: 'Vault', label: 'Vault' },
];

export default function SpiritsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [active, setActive] = useState<string>('Spirits');
  const [selectedSpirit, setSelectedSpirit] = useState<any>(null);
  const { toggleSavedSpirit, isSpiritSaved } = useSavedItems();

  // Modal states
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [createRecipeModalVisible, setCreateRecipeModalVisible] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<Partial<FilterOptions>>({});

  const handleSearch = (query: string) => {
    // Handle search - you could filter spirits or navigate to search results
    log.info('SpiritsScreen', 'Search query submitted', { query });
    setSearchModalVisible(false);
  };

  const handleFilterApply = (filters: Partial<FilterOptions>) => {
    setCurrentFilters(filters);
    setFilterDrawerVisible(false);
    log.info('SpiritsScreen', 'Filters applied', { filters });
    // Apply filters to spirit results
  };

  const handleRecipeCreated = (recipeId: string) => {
    log.info('SpiritsScreen', 'Recipe created', { recipeId });
    setCreateRecipeModalVisible(false);
    // Could navigate to the created recipe
  };

  const handleCompetitionEntryCreated = (entryId: string) => {
    log.info('SpiritsScreen', 'Competition entry created', { entryId });
    // Could navigate to the entry or competitions section
  };

  const goto = (key: string) => {
    setActive(key);
    try {
      if (key === 'Home') {
        nav.navigate('Main', { screen: 'Featured' });
      } else if (key === 'Spirits') {
        // Already on spirits screen, do nothing
        return;
      } else if (key === 'Bars') {
        nav.navigate('Bars');
      } else if (key === 'Events') {
        nav.navigate('Events');
      } else if (key === 'Games') {
        nav.navigate('Games');
      } else if (key === 'NonAlcoholic') {
        nav.navigate('NonAlcoholic' as never);
      } else if (key === 'Vault') {
        nav.navigate('Vault' as never);
      }
    } catch (error) {
      log.error('SpiritsScreen', 'Navigation error', error as Error);
    }
  };

  const onExploreBrand = (brand: any) => {
    // Show cocktail recipes modal first, then navigate if user wants more details
    setSelectedSpirit(brand);
  };

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Spirits',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
      headerLeft: () => null,
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Pressable hitSlop={12} onPress={() => setSearchModalVisible(true)}>
            <Ionicons name="search" size={24} color={colors.text} />
          </Pressable>
          <Pressable hitSlop={12} onPress={() => setFilterDrawerVisible(true)}>
            <Ionicons name="funnel" size={24} color={colors.text} />
          </Pressable>
          <Pressable hitSlop={12} onPress={() => setCreateRecipeModalVisible(true)}>
            <Ionicons name="add-circle" size={24} color={colors.accent} />
          </Pressable>
        </View>
      ),
    });
  }, [nav]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing(8) }}>
      {/* Navigation Chips - Horizontal and Scrollable */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.chipsContainer} 
        contentContainerStyle={styles.chipsRow}
      >
        {chips.map((c) => {
          const isActive = active === c.key;
          return (
            <PillButton
              key={c.key}
              title={c.label}
              onPress={() => goto(c.key)}
              style={!isActive ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line } : undefined}
              textStyle={!isActive ? { color: colors.text } : undefined}
            />
          );
        })}
      </ScrollView>

      {/* Whiskey Brands */}
      <Section title="Whiskey">
        <SpiritCarousel spirits={getRandomizedBrandsByCategory('Whiskey')} />
      </Section>

      {/* Gin Brands */}
      <Section title="Gin">
        <SpiritCarousel spirits={getRandomizedBrandsByCategory('Gin')} />
      </Section>

      {/* Vodka Brands */}
      <Section title="Vodka">
        <SpiritCarousel spirits={getRandomizedBrandsByCategory('Vodka')} />
      </Section>

      {/* Tequila Brands */}
      <Section title="Tequila">
        <SpiritCarousel spirits={getRandomizedBrandsByCategory('Tequila')} />
      </Section>

      {/* Rum Brands */}
      <Section title="Rum">
        <SpiritCarousel spirits={getRandomizedBrandsByCategory('Rum')} />
      </Section>

      {/* bottom spacer so tab bar never overlaps last card */}
      <View style={{ height: spacing(6) }} />
    </ScrollView>

    {/* Cocktail Recipes Modal */}
    <Modal
      visible={!!selectedSpirit}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setSelectedSpirit(null)}
    >
      {selectedSpirit && (
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedSpirit.name} Cocktails</Text>
            <Pressable onPress={() => setSelectedSpirit(null)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalInfo}>
              <Text style={styles.modalBrand}>{selectedSpirit.category}</Text>
              <Text style={styles.modalDescription}>{selectedSpirit.hero?.tagline || `${selectedSpirit.quickInfo?.style} • ${selectedSpirit.quickInfo?.origin}`}</Text>
              
              <Text style={styles.recipesHeader}>Signature Cocktails:</Text>
              {selectedSpirit.signatureCocktails?.map((cocktail: any, index: number) => (
                <View key={index} style={styles.recipeCard}>
                  <Image source={{ uri: cocktail.image }} style={styles.recipeImage} />
                  <Text style={styles.recipeName}>{cocktail.name}</Text>
                  <Text style={styles.recipeDescription}>{cocktail.description}</Text>
                  
                  <Text style={styles.ingredientsHeader}>Ingredients:</Text>
                  <Text style={styles.ingredientsText}>{cocktail.ingredients}</Text>
                  
                  <Pressable 
                    style={styles.moreDetailsButton}
                    onPress={() => {
                      setSelectedSpirit(null);
                      // Navigate to full brand details
                      if (selectedSpirit.tier === 'gold') {
                        nav.navigate('FeaturedSpirit', { spiritId: selectedSpirit.id, tier: selectedSpirit.tier });
                      } else {
                        nav.navigate('BrandDetail', { brandId: selectedSpirit.id });
                      }
                    }}
                  >
                    <Text style={styles.moreDetailsText}>View Full Brand Details</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                  </Pressable>
                </View>
              ))}
              
              {selectedSpirit.tastingNotes && (
                <View style={styles.tastingNotesCard}>
                  <Text style={styles.tastingNotesHeader}>Tasting Notes:</Text>
                  <View style={styles.tastingNote}>
                    <Text style={styles.tastingNoteLabel}>Nose:</Text>
                    <Text style={styles.tastingNoteText}>{selectedSpirit.tastingNotes.nose}</Text>
                  </View>
                  <View style={styles.tastingNote}>
                    <Text style={styles.tastingNoteLabel}>Palate:</Text>
                    <Text style={styles.tastingNoteText}>{selectedSpirit.tastingNotes.palate}</Text>
                  </View>
                  <View style={styles.tastingNote}>
                    <Text style={styles.tastingNoteLabel}>Finish:</Text>
                    <Text style={styles.tastingNoteText}>{selectedSpirit.tastingNotes.finish}</Text>
                  </View>
                </View>
              )}

              {/* Flavor Profile */}
              <View style={styles.flavorProfileCard}>
                <Text style={styles.flavorProfileHeader}>Flavor Profile</Text>
                <View style={styles.flavorCategories}>
                  <View style={styles.flavorCategory}>
                    <Text style={styles.flavorCategoryLabel}>Sweetness</Text>
                    <View style={styles.flavorMeter}>
                      <View style={[styles.flavorMeterFill, { width: '60%' }]} />
                    </View>
                  </View>
                  <View style={styles.flavorCategory}>
                    <Text style={styles.flavorCategoryLabel}>Smokiness</Text>
                    <View style={styles.flavorMeter}>
                      <View style={[styles.flavorMeterFill, { width: '80%' }]} />
                    </View>
                  </View>
                  <View style={styles.flavorCategory}>
                    <Text style={styles.flavorCategoryLabel}>Spiciness</Text>
                    <View style={styles.flavorMeter}>
                      <View style={[styles.flavorMeterFill, { width: '40%' }]} />
                    </View>
                  </View>
                  <View style={styles.flavorCategory}>
                    <Text style={styles.flavorCategoryLabel}>Complexity</Text>
                    <View style={styles.flavorMeter}>
                      <View style={[styles.flavorMeterFill, { width: '90%' }]} />
                    </View>
                  </View>
                </View>
                <View style={styles.flavorTags}>
                  {['Oak', 'Vanilla', 'Caramel', 'Honey', 'Citrus'].map((flavor, index) => (
                    <View key={index} style={styles.flavorTag}>
                      <Text style={styles.flavorTagText}>{flavor}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* History & Heritage */}
              <View style={styles.historyCard}>
                <Text style={styles.historyHeader}>History & Heritage</Text>
                <View style={styles.historyTimeline}>
                  <View style={styles.timelineItem}>
                    <View style={styles.timelineMarker} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineYear}>1887</Text>
                      <Text style={styles.timelineEvent}>Founded by {selectedSpirit.name.split(' ')[0]} family</Text>
                    </View>
                  </View>
                  <View style={styles.timelineItem}>
                    <View style={styles.timelineMarker} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineYear}>1920</Text>
                      <Text style={styles.timelineEvent}>Survived Prohibition through medicinal permits</Text>
                    </View>
                  </View>
                  <View style={styles.timelineItem}>
                    <View style={styles.timelineMarker} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineYear}>Today</Text>
                      <Text style={styles.timelineEvent}>Award-winning heritage spirit, 5th generation master distiller</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.heritageInfo}>
                  <Text style={styles.heritageText}>
                    Crafted using traditional methods passed down through generations, this spirit represents the pinnacle of distilling expertise.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      )}
    </Modal>

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ marginTop: spacing(1) }}>{children}</View>
    </View>
  );
}

function SpiritCarousel({ spirits }: { spirits: any[] }) {
  const { toggleSavedSpirit, isSpiritSaved } = useSavedItems();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleShare = async (brand: any) => {
    try {
      await Share.share({
        message: `Check out ${brand.name}! ${brand.hero?.tagline || `${brand.quickInfo?.style || ''} • ${brand.quickInfo?.origin || ''}`}`,
        title: `${brand.name} - Premium Spirit`,
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share at this time');
    }
  };

  const onExploreBrand = (brand: any) => {
    if (brand.tier === 'gold') {
      nav.navigate('FeaturedSpirit', { spiritId: brand.id, tier: brand.tier });
    } else {
      nav.navigate('BrandDetail', { brandId: brand.id });
    }
  };

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carouselContainer}
    >
      {spirits.map((brand) => (
        <TouchableOpacity 
          key={brand.id} 
          style={styles.spiritCard} 
          onPress={() => onExploreBrand(brand)} 
          activeOpacity={0.8}
        >
          <View style={styles.cardImageContainer}>
            <Image source={{ uri: brand.hero?.image || '' }} style={styles.spiritImage} />
            <TouchableOpacity
              style={styles.cardShareButton}
              onPress={() => handleShare(brand)}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={20} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cardSaveButton}
              onPress={() => toggleSavedSpirit({
                id: brand.id,
                name: brand.name,
                subtitle: brand.category || brand.quickInfo?.origin,
                image: brand.hero?.image
              })}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isSpiritSaved(brand.id) ? "bookmark" : "bookmark-outline"} 
                size={20} 
                color={isSpiritSaved(brand.id) ? colors.accent : colors.white} 
              />
            </TouchableOpacity>
            {brand.tier === 'gold' && (
              <View style={[styles.tierBadge, styles.goldBadge, { position: 'absolute', bottom: 8, left: 8 }]}>
                <Text style={[styles.tierText, styles.goldText]}>GOLD</Text>
              </View>
            )}
            {brand.tier === 'silver' && (
              <View style={[styles.tierBadge, styles.silverBadge, { position: 'absolute', bottom: 8, left: 8 }]}>
                <Text style={[styles.tierText, styles.silverText]}>SILVER</Text>
              </View>
            )}
            {brand.tier === 'bronze' && (
              <View style={[styles.tierBadge, styles.bronzeBadge, { position: 'absolute', bottom: 8, left: 8 }]}>
                <Text style={[styles.tierText, styles.bronzeText]}>BRONZE</Text>
              </View>
            )}
          </View>
          <View style={styles.spiritInfo}>
            <Text style={styles.cardTitle}>{brand.name || 'Unknown Brand'}</Text>
            <Text style={styles.cardSubtitle}>
              {brand.hero?.tagline || `${brand.quickInfo?.style || ''} • ${brand.quickInfo?.origin || ''}`}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  cc: {
    paddingVertical: spacing(2),
  },

  // Navigation chips
  chipsContainer: {
    paddingTop: spacing(2),
    paddingBottom: spacing(1),
  },
  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing(2),
    gap: spacing(1),
  },

  // New Section styles (matching FeaturedScreen template)
  section: { 
    paddingHorizontal: spacing(2), 
    marginTop: spacing(3) 
  },
  sectionTitle: { 
    color: colors.text, 
    fontSize: fonts.h2, 
    fontWeight: '800' 
  },

  // New Carousel styles (matching FeaturedScreen HScroll template)
  carouselContainer: {
    gap: spacing(2),
    paddingHorizontal: spacing(2),
  },
  spiritCard: { 
    width: 260 
  },
  cardImageContainer: {
    position: 'relative',
    marginBottom: spacing(1),
  },
  spiritImage: { 
    width: 260, 
    height: 160, 
    borderRadius: radii.md 
  },
  cardShareButton: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(4),
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSaveButton: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { 
    color: colors.text, 
    fontWeight: '800', 
    fontSize: fonts.h3 
  },
  cardSubtitle: { 
    color: colors.muted, 
    marginTop: 2 
  },
  spiritInfo: {
    paddingHorizontal: spacing(0.5),
  },
  
  // Tier Badges
  tierBadge: {
    paddingHorizontal: spacing(0.75),
    paddingVertical: spacing(0.25),
    borderRadius: radii.sm,
    marginLeft: spacing(1),
  },
  goldBadge: {
    backgroundColor: colors.tierGold,
  },
  silverBadge: {
    backgroundColor: colors.tierSilver,
  },
  bronzeBadge: {
    backgroundColor: colors.tierBronze,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  goldText: {
    color: colors.tierTextOnGold,
  },
  silverText: {
    color: colors.tierTextOnSilver,
  },
  bronzeText: {
    color: colors.tierTextOnBronze,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  modalContent: {
    flex: 1,
  },
  modalInfo: {
    padding: spacing(3),
  },
  modalBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
    textTransform: 'uppercase',
    marginBottom: spacing(0.5),
  },
  modalDescription: {
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing(3),
  },
  recipesHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  recipeCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(3),
    marginBottom: spacing(3),
  },
  recipeImage: {
    width: '100%',
    height: 200,
    borderRadius: radii.md,
    marginBottom: spacing(2),
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(1),
  },
  recipeDescription: {
    fontSize: 15,
    color: colors.subtext,
    marginBottom: spacing(2),
    fontStyle: 'italic',
  },
  ingredientsHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  ingredientsText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing(2),
  },
  moreDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    gap: spacing(1),
  },
  moreDetailsText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  tastingNotesCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(3),
    marginTop: spacing(2),
  },
  tastingNotesHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  tastingNote: {
    marginBottom: spacing(1.5),
  },
  tastingNoteLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing(0.5),
  },
  tastingNoteText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  // Flavor Profile Styles
  flavorProfileCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(3),
    marginTop: spacing(2),
  },
  flavorProfileHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(3),
  },
  flavorCategories: {
    marginBottom: spacing(3),
  },
  flavorCategory: {
    marginBottom: spacing(2),
  },
  flavorCategoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1),
  },
  flavorMeter: {
    height: 8,
    backgroundColor: colors.line,
    borderRadius: 4,
    overflow: 'hidden',
  },
  flavorMeterFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  flavorTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
  },
  flavorTag: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  flavorTagText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  // History Styles
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(3),
    marginTop: spacing(2),
  },
  historyHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(3),
  },
  historyTimeline: {
    marginBottom: spacing(3),
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing(3),
  },
  timelineMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
    marginTop: spacing(0.5),
    marginRight: spacing(2),
  },
  timelineContent: {
    flex: 1,
  },
  timelineYear: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing(0.5),
  },
  timelineEvent: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  heritageInfo: {
    backgroundColor: colors.bg,
    padding: spacing(2.5),
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  heritageText: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});