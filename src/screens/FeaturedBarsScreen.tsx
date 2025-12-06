import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Feather, Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, textStyles, layouts } from '../theme/tokens';
import { CompactLocationMap } from '../components/ui';
import { BARS } from '../data/bars';
import { BAR_IMAGES, HEADER_IMAGES, BAR_PAGE_HEADERS } from '../data/barImages';

const { width } = Dimensions.get('window');
const CARD = width - 32;

const IMGS = {
  grid1: 'https://images.unsplash.com/photo-1551024709-8f23befc6cf7?q=80&w=1200&auto=format&fit=crop',
  grid2: 'https://images.unsplash.com/photo-1565299715191-8e9d8620bc02?q=80&w=1200&auto=format&fit=crop',
  grid3: 'https://images.unsplash.com/photo-1532634741-369c3c7eac48?q=80&w=1200&auto=format&fit=crop',
  grid4: 'https://images.unsplash.com/photo-1504805572947-34fad45aed93?q=80&w=1200&auto=format&fit=crop',
  grid5: 'https://images.unsplash.com/photo-1527161153336-95b168e1acb0?q=80&w=1200&auto=format&fit=crop',
  grid6: 'https://images.unsplash.com/photo-1544223999-3462e1366cfb?q=80&w=1200&auto=format&fit=crop',

  // Bar of the month (3 image slider)
  ucl1: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c76ac?q=80&w=1600&auto=format&fit=crop',
  ucl2: 'https://images.unsplash.com/photo-1506818144585-74b29c980d4b?q=80&w=1600&auto=format&fit=crop',
  ucl3: 'https://images.unsplash.com/photo-1521017432531-fbd92d4e0cb1?q=80&w=1600&auto=format&fit=crop',

  // Grid cards below “All Bars”
  a: 'https://images.unsplash.com/photo-1582456891925-7f6dcd2c9b3d?q=80&w=1600&auto=format&fit=crop',
  b: 'https://images.unsplash.com/photo-1552321554-8f3d9dc4f3b7?q=80&w=1600&auto=format&fit=crop',
  c: 'https://images.unsplash.com/photo-1514361892635-6ae3d4a1d83e?q=80&w=1600&auto=format&fit=crop',
  d: 'https://images.unsplash.com/photo-1541542684-4a91f9d0228e?q=80&w=1600&auto=format&fit=crop',
  e: 'https://images.unsplash.com/photo-1498654200943-1088dd4438ae?q=80&w=1600&auto=format&fit=crop',
  f: 'https://images.unsplash.com/photo-1526481280698-8fcc13fd76fa?q=80&w=1600&auto=format&fit=crop',
};

const city = 'Toronto, ON';

function SectionTitle({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View
      style={{
        marginTop: 20,
        marginBottom: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Text style={[textStyles.h2, { fontWeight: '800' }]}>{title}</Text>
      {right}
    </View>
  );
}

function MoodPill({ label }: { label: string }) {
  return (
    <View
      style={{
        backgroundColor: colors.chipBg,
        borderColor: colors.line,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        marginRight: 10,
      }}
    >
      <Text style={{ color: colors.subtle, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function GridCard({
  bar,
  onPress,
}: {
  bar: typeof BARS[keyof typeof BARS];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity 
      style={{ width: (width - 16 * 3) / 2, margin: 8 }} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: bar.hero.image }}
        style={{ width: '100%', height: 180, borderRadius: 12 }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        <Text
          style={{
            color: colors.white,
            fontSize: 18,
            fontWeight: '800',
          }}
        >
          {bar.name}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.accent} style={{ marginLeft: 4 }} />
      </View>
      <Text style={{ color: colors.textMuted, marginTop: 2 }}>{bar.quickInfo?.vibe || bar.hero?.location || 'Bar'}</Text>
    </TouchableOpacity>
  );
}

export default function FeaturedBarsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleBarPress = (bar: typeof BARS[keyof typeof BARS]) => {
    // Map bar IDs to their individual screens
    const barScreenMap: Record<string, keyof RootStackParamList> = {
      'the_alchemist': 'TheAlchemist',
      'the_velvet_curtain': 'TheVelvetCurtain',
      'the_gilded_lily': 'TheGildedLily',
      'the_iron_flask': 'TheIronFlask',
      'the_velvet_note': 'TheVelvetNote',
      'skyline_lounge': 'SkylineLounge',
      'the_tiki_hut': 'TheTikiHut',
      'the_wine_cellar': 'TheWineCellar',
      'the_hidden_flask': 'TheHiddenFlask',
      'untitled_champagne_lounge': 'UntitledLounge',
    };

    const screenName = barScreenMap[bar.id];
    
    if (screenName) {
      nav.navigate(screenName);
    } else {
      // Fallback to generic BarDetails for bars without individual screens
      nav.navigate('BarDetails', {
        name: bar.name,
        subtitle: bar.quickInfo?.vibe || bar.hero?.location || 'Bar',
        image: bar.hero.image,
        city: bar.location?.city,
        address: bar.location?.address
      });
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Top app bar */}
      <View
        style={{
          paddingTop: 14,
          paddingBottom: 10,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TouchableOpacity
          onPress={() => nav.dispatch(DrawerActions.openDrawer())}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="menu" size={28} color={colors.white} />
        </TouchableOpacity>
        <Text style={[textStyles.h1, { fontSize: 24 }]}>
          Featured Bars
        </Text>
        <Feather name="search" size={24} color={colors.white} />
      </View>

      {/* City under header (same typeface family) */}
      <View style={{ paddingHorizontal: 16, marginTop: -6, marginBottom: 10 }}>
        <Text style={{ color: colors.textLight, fontSize: 16, fontWeight: '700' }}>
          {city}
        </Text>
      </View>

      {/* Header mosaic grid */}
      <View
        style={{
          paddingHorizontal: 16,
          marginBottom: 12,
          gap: 6,
          flexWrap: 'wrap',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        {[BAR_IMAGES.aqua_lounge, BAR_IMAGES.the_alchemist, BAR_IMAGES.the_velvet_curtain, BAR_IMAGES.the_gilded_lily, BAR_IMAGES.the_iron_flask, BAR_IMAGES.aqua_lounge].map(
          (src, i) => (
            <Image
              key={i}
              source={src}
              style={{
                width: (width - 16 * 2 - 6 * 2) / 3,
                height: 90,
                borderRadius: 8,
              }}
            />
          ),
        )}
      </View>

      {/* Bar of the Month — Untitled Champagne Lounge (3 image slider) */}
      <TouchableOpacity 
        onPress={() => nav.navigate('UntitledLounge')}
        activeOpacity={0.8}
      >
        <View style={{ paddingHorizontal: 16 }}>
          <Image
            source={BAR_PAGE_HEADERS.depth_frame_header_24}
            style={{
              width: CARD,
              height: CARD * 0.56,
              borderRadius: 16,
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 10 }}>
          <Text
            style={{
              color: colors.white,
              fontSize: 28,
              fontWeight: '900',
              flex: 1
            }}
          >
            Untitled Champagne Lounge
          </Text>
          <Ionicons name="chevron-forward" size={24} color={colors.accent} />
        </View>
        <Text style={{ color: colors.textMuted, paddingHorizontal: 16, marginBottom: 6 }}>
          Bar of the Month
        </Text>
      </TouchableOpacity>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 6 }}
      >
        {[BAR_IMAGES.aqua_lounge, BAR_IMAGES.the_alchemist, BAR_IMAGES.the_velvet_curtain].map((src, i) => (
          <Image
            key={i}
            source={src}
            style={{
              width,
              height: width * 0.56,
            }}
          />
        ))}
      </ScrollView>

      {/* Explore the Mood */}
      <SectionTitle title="Explore the Mood" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ paddingLeft: 16, marginBottom: 8 }}
      >
        {[
          'Relaxed & Intimate',
          'Vibrant & Lively',
          'Speakeasy',
          'Live Music',
          'Cocktail Lab',
          'Rooftop Views',
        ].map((m) => (
          <MoodPill key={m} label={m} />
        ))}
      </ScrollView>

      {/* Bar Locations */}
      <SectionTitle title="Bar Locations" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ paddingLeft: 16, marginBottom: 20 }}
      >
        {Object.values(BARS)
          .filter(bar => bar.location)
          .map((bar) => (
            <View key={bar.id} style={{ marginRight: 12, width: 280 }}>
              <CompactLocationMap
                location={bar.location!}
                onMarkerPress={(location) => console.log('Featured bar location pressed:', location.name)}
              />
            </View>
          ))
        }
      </ScrollView>

      {/* All Bars (City) + Filter */}
      <SectionTitle
        title={`All Bars (${city})`}
        right={
          <TouchableOpacity
            onPress={() => {}}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.card,
              borderColor: '#3b312a',
              borderWidth: 1,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              marginRight: 16,
            }}
          >
            <Feather name="sliders" size={16} color={colors.subtle} />
            <Text style={{ color: colors.subtle, marginLeft: 6, fontWeight: '700' }}>
              Filter
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Dynamic 2-column grid using real bar data */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 }}>
        {Object.values(BARS).slice(0, 6).map((bar) => (
          <GridCard 
            key={bar.id}
            bar={bar} 
            onPress={() => handleBarPress(bar)}
          />
        ))}
      </View>

      <View style={{ height: 28 }} />
    </ScrollView>
  );
}
