import React, { useLayoutEffect } from 'react';
import {
  View, Text, Image, ImageBackground,
  Pressable, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import theme from '../theme/safeTheme';
import PillButton from '../components/PillButton';
import { useSavedItems } from '../hooks/useSavedItems';
import { games } from '../../assets/images/games';
const { colors, spacing, radii, shadows } = theme;

type RootStackParamList = {
  GamesScreen: undefined;
  GameDetails: { id: string } | undefined;
};
type Nav = NativeStackNavigationProp<RootStackParamList>;

const hero = {
  title: "King's Cup",
  desc: 'A classic card game where players draw cards and perform actions based on the card drawn.',
  img: games.kingsCup,
};

const classicGames = [
  { id: 'kings-cup', title: "King's Cup", subtitle: 'Easy · 4–10+ Players · USA',
    img: games.kingsCup },
  { id: 'flip-cup', title: 'Flip Cup', subtitle: 'Easy · 2–4 Players · USA',
    img: games.flipCup },
  { id: 'beer-pong', title: 'Beer Pong', subtitle: 'Medium · 2–4 Players · USA',
    img: games.beerPong },
];

const culturalGames = [
  { id: 'ring-of-fire', title: 'Ring of Fire', subtitle: 'Medium · 2+ Players · UK',
    img: games.ringOfFire },
  { id: 'fuzzy-duck', title: 'Fuzzy Duck', subtitle: 'Hard · 2+ Players · UK',
    img: games.fuzzyDuck },
];

const appEnhanced = [
  { id: 'truth-or-dare', title: 'Truth or Dare', subtitle: '2–10 Players · Medium',
    img: games.truthOrDare },
  { id: 'most-likely-to', title: 'Most Likely To', subtitle: '2–10 Players · Easy',
    img: games.mostLikelyTo },
];

const partyGames = [
  { id: 'rage-cage', title: 'Rage Cage', subtitle: 'Hard · 2+ Players · Global',
    img: games.rageCage },
  { id: 'power-hour', title: 'Power Hour', subtitle: 'Easy · 2+ Players · Global',
    img: games.powerHour },
];

const topChips: Array<{ key: string; label: string }> = [
  { key: 'Home', label: 'Home' },
  { key: 'Spirits', label: 'Spirits' },
  { key: 'NonAlcoholic', label: 'Non-Alcoholic' },
  { key: 'Bars', label: 'Bars' },
  { key: 'Events', label: 'Events' },
  { key: 'Games', label: 'Games' },
  { key: 'Vault', label: 'Vault' },
];

export default function GamesScreen() {
  const nav = useNavigation<Nav>();
  const [activeChip, setActiveChip] = React.useState<string>('Games');
  const { toggleSavedGame, isGameSaved } = useSavedItems();

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Games',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
      headerLeft: () => null,
    });
  }, [nav]);

  const navigateToSection = (section: string) => {
    try {
      if (section === 'Home') {
        nav.navigate('Main', { screen: 'Featured' });
      } else if (section === 'Spirits') {
        nav.navigate('Spirits' as never);
      } else if (section === 'Bars') {
        nav.navigate('Bars' as never);
      } else if (section === 'Events') {
        nav.navigate('Events' as never);
      } else if (section === 'NonAlcoholic') {
        nav.navigate('NonAlcoholic' as never);
      } else if (section === 'Vault') {
        nav.navigate('Vault' as never);
      }
      // Games stays on current screen
    } catch (error) {
      // Silently handle navigation errors for non-existent screens
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing(8) }}>
      {/* Top Navigation Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={{ paddingTop: spacing(2), paddingBottom: spacing(1) }} 
        contentContainerStyle={{ flexDirection: 'row', paddingHorizontal: spacing(2), gap: spacing(1) }}
      >
        {topChips.map(c => {
          const isActive = activeChip === c.key;
          return (
            <PillButton
              key={c.key}
              title={c.label}
              onPress={() => {
                setActiveChip(c.key);
                navigateToSection(c.key);
              }}
              style={!isActive ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line } : undefined}
              textStyle={!isActive ? { color: colors.text } : undefined}
            />
          );
        })}
      </ScrollView>


      <CardHero
        image={hero.img}
        title={hero.title}
        desc={hero.desc}
        tags={['Classic Games','Cultural / International']}
        onPress={() => nav.navigate('KingsCup' as any)}
      />

      <SectionHeader
        title="Classic Games"
        right={
          <Chip
            icon={<Feather name="shuffle" size={16} color={colors.pillText} />}
            label="Random Game"
            onPress={() => {
              const all = [...classicGames, ...culturalGames, ...appEnhanced, ...partyGames];
              const pick = all[Math.floor(Math.random() * all.length)];
              nav.navigate('GameDetails', { id: pick.id });
            }}
          />
        }
      />
      <Row>
        {classicGames.map(g => (
          <GameCard 
            key={g.id} 
            {...g} 
            onPress={() => {
              if (g.id === 'kings-cup') {
                nav.navigate('KingsCup' as any);
              } else {
                nav.navigate('GameDetails', { id: g.id });
              }
            }} 
            onSave={(item) => toggleSavedGame(item)}
            isSaved={isGameSaved(g.id)}
          />
        ))}
      </Row>

      <SectionHeader title="Cultural Games" />
      <Row>
        {culturalGames.map(g => (
          <GameCard 
            key={g.id} 
            {...g} 
            onPress={() => nav.navigate('GameDetails', { id: g.id })} 
            onSave={(item) => toggleSavedGame(item)}
            isSaved={isGameSaved(g.id)}
          />
        ))}
      </Row>

      <SectionHeader title="Card-Based Games" />
      <PosterCard
        image={games.kingsCup}
        onPress={() => nav.navigate('GameDetails', { id: 'cards-category' })}
      />

      <SectionHeader title="App-Enhanced" />
      <Row>
        {appEnhanced.map(g => (
          <GameCard 
            key={g.id} 
            {...g} 
            onPress={() => nav.navigate('GameDetails', { id: g.id })} 
            onSave={(item) => toggleSavedGame(item)}
            isSaved={isGameSaved(g.id)}
          />
        ))}
      </Row>

      <SectionHeader title="Party Games" />
      <Row>
        {partyGames.map(g => (
          <GameCard 
            key={g.id} 
            {...g} 
            onPress={() => nav.navigate('GameDetails', { id: g.id })} 
            onSave={(item) => toggleSavedGame(item)}
            isSaved={isGameSaved(g.id)}
          />
        ))}
      </Row>
    </ScrollView>
    </View>
  );
}

/* ---------- small UI pieces ---------- */

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!right && <View>{right}</View>}
    </View>
  );
}

function Chip({ label, onPress, icon }: { label: string; onPress?: () => void; icon?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.9 }]}>
      {icon ? <View style={{ marginRight: 6 }}>{icon}</View> : null}
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function GameCard({ img, title, subtitle, onPress, id, onSave, isSaved }:{
  img: string | number; title:string; subtitle:string; onPress?:()=>void; id:string; onSave:(item:any)=>void; isSaved:boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={styles.cardImageContainer}>
        <Image source={typeof img === 'string' ? { uri: img } : img} style={styles.cardImage} resizeMode="cover" />
        <Pressable
          style={styles.cardSaveButton}
          onPress={() => onSave({
            id: id,
            name: title,
            subtitle: subtitle,
            image: img
          })}
          hitSlop={12}
        >
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={20}
            color={isSaved ? colors.accent : colors.text}
          />
        </Pressable>
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function PosterCard({ image, onPress }:{ image: string | number; onPress?:()=>void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ marginHorizontal: spacing(2), marginBottom: spacing(3) }, pressed && { opacity: 0.9 }]}>
      <ImageBackground source={typeof image === 'string' ? { uri: image } : image} imageStyle={{ borderRadius: radii.lg }} resizeMode="cover" style={styles.poster}>
        <View style={styles.posterTint} />
        <View style={styles.posterPlay}>
          <MaterialCommunityIcons name="cards" size={28} color={colors.text} />
          <Text style={styles.posterText}>Explore</Text>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

function CardHero({ image, title, desc, tags, onPress }:{
  image: string | number; title:string; desc:string; tags:string[]; onPress?:()=>void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.heroCard, pressed && { opacity: 0.96 }]}>
      <Image source={typeof image === 'string' ? { uri: image } : image} style={styles.heroImage} resizeMode="cover" />
      <View style={{ padding: spacing(2) }}>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroDesc}>{desc}</Text>
        <View style={{ flexDirection:'row', gap:8, marginTop: spacing(1) }}>
          {tags.map(t => <Chip key={t} label={t} />)}
        </View>
      </View>
    </Pressable>
  );
}

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  sectionHeader: {
    marginTop: spacing(3),
    marginBottom: spacing(1.5),
    paddingHorizontal: spacing(2),
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
  },
  sectionTitle: { color: colors.text, fontSize:18, fontWeight:'700' },
  chip: {
    flexDirection:'row', alignItems:'center',
    backgroundColor: colors.pillBg, borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  chipText: { color: colors.pillText, fontWeight:'600', letterSpacing:0.2 },
  row: { paddingHorizontal: spacing(2), gap:12 },
  card: { backgroundColor: colors.card, borderRadius: 16, paddingBottom: spacing(1.5), borderWidth: 1, borderColor: colors.line, ...shadows.card },
  cardImageContainer: {
    position: 'relative',
  },
  cardImage: { width: '100%', height:180, borderTopLeftRadius:16, borderTopRightRadius:16, marginBottom: spacing(1) },
  cardSaveButton: {
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
  cardTitle: { color: colors.text, fontWeight:'700', fontSize:16, paddingHorizontal: spacing(1.5) },
  cardSubtitle: { color: colors.subtext, fontSize:12.5, paddingHorizontal: spacing(1.5), marginTop:2 },
  poster: { height:180, borderRadius:16, overflow:'hidden', justifyContent:'flex-end' },
  posterTint: { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.28)' },
  posterPlay: { flexDirection:'row', alignItems:'center', gap:10, padding: spacing(2) },
  posterText: { color: colors.text, fontWeight:'700', fontSize:16 },
  heroCard: { margin: spacing(2), backgroundColor: colors.card, borderRadius: 16, overflow:'hidden', ...shadows.card },
  heroImage: { height:180, width:'100%' },
  heroTitle: { color: colors.text, fontSize:22, fontWeight:'800', marginBottom:4 },
  heroDesc: { color: colors.subtext, lineHeight:18 },

  // Top navigation chips
  chipsContainer: { paddingTop: spacing(4), paddingBottom: spacing(1) },
  chipsRow: { flexDirection: 'row', paddingHorizontal: spacing(2), gap: spacing(1) },
  topChip: {
    paddingHorizontal: spacing(2), 
    paddingVertical: spacing(1.2),
    backgroundColor: colors.chipBg, 
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  topChipActive: { 
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  topChipText: { 
    color: colors.text, 
    fontSize: 15, 
    fontWeight: '600' 
  },

  // Location options
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
  },
  locationText: {
    color: colors.subtext,
    fontSize: 15,
    fontWeight: '600',
  },
});