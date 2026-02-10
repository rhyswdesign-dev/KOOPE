import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing, radii } from '../theme/tokens';
import { Heading } from '../components/ui';

const W = Dimensions.get('window').width;
const CARD = W - 24 * 2;

const hero = {
  title: "King's Cup",
  blurb:
    'A classic card game where players draw cards and perform actions based on the draw.',
  image:
    'https://images.unsplash.com/photo-1560841659-04f9c2b0d0df?q=80&w=1600&auto=format&fit=crop',
  xp: 75,
  link: { screen: 'GameDetails', params: { id: 'kings-cup' } as any },
};

const gridClassic = [
  {
    id: 'flip-cup',
    title: 'Flip Cup',
    meta: 'Easy · 2–4 Players · USA',
    image:
      'https://images.unsplash.com/photo-1541976076758-347942db1971?q=80&w=1200&auto=format&fit=crop',
    link: { screen: 'GameDetails', params: { id: 'flip-cup' } as any },
  },
  {
    id: 'beer-pong',
    title: 'Beer Pong',
    meta: 'Medium · 2–4 Players · USA',
    image:
      'https://images.unsplash.com/photo-1589578527966-fdac0f44566f?q=80&w=1200&auto=format&fit=crop',
    link: { screen: 'GameDetails', params: { id: 'beer-pong' } as any },
  },
];

const gridCultural = [
  {
    id: 'soju-bomb',
    title: 'Soju Bomb',
    meta: 'Medium · 2+ Players · Korea',
    image:
      'https://images.unsplash.com/photo-1612198185721-3e27b3a7fe8c?q=80&w=1200&auto=format&fit=crop',
    link: { screen: 'GameDetails', params: { id: 'soju-bomb' } as any },
  },
  {
    id: 'fuzzy-duck',
    title: 'Fuzzy Duck',
    meta: 'Hard · 2+ Players · UK',
    image:
      'https://images.unsplash.com/photo-1604431641797-2a1163e4b2e0?q=80&w=1200&auto=format&fit=crop',
    link: { screen: 'GameDetails', params: { id: 'fuzzy-duck' } as any },
  },
];

const gridParty = [
  {
    id: 'bartender-battle',
    title: 'Bartender Battle',
    meta: 'Hard · 2+ Players · Global',
    image:
      'https://images.unsplash.com/photo-1514361892635-6e3f9a1f6c5a?q=80&w=1200&auto=format&fit=crop',
    link: { screen: 'GameDetails', params: { id: 'bartender-battle' } as any },
  },
  {
    id: 'dare-wheel',
    title: 'Dare Wheel',
    meta: 'Easy · 2+ Players · Global',
    image:
      'https://images.unsplash.com/photo-1520976194201-b5d7b0aebc42?q=80&w=1200&auto=format&fit=crop',
    link: { screen: 'GameDetails', params: { id: 'dare-wheel' } as any },
  },
];

export default function ExploreScreen() {
  const nav =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing(6) }}>
      {/* Top chips */}
      <View style={styles.chipsRow}>
        <NavChip label="Spirits" onPress={() => nav.navigate('Spirits')} />
        <NavChip label="Bars" onPress={() => nav.navigate('Bars')} />
        <NavChip label="Events" onPress={() => nav.navigate('Events')} />
        <NavChip label="Games" onPress={() => nav.navigate('Games')} />
      </View>

      {/* Hero */}
      <View style={styles.heroCard}>
        <Image source={{ uri: hero.image }} style={styles.heroImg} />
        <View style={styles.heroBody}>
          <Heading level={2} style={styles.heroTitle}>{hero.title}</Heading>
          <Text style={styles.heroBlurb}>{hero.blurb}</Text>
          <Text style={styles.heroMeta}>Earn +{hero.xp} XP</Text>

          <View style={styles.heroChips}>
            <Tag icon="grid" text="Classic Games" />
            <Tag icon="globe" text="Cultural / International" />
          </View>
        </View>
      </View>

      {/* Section: Classic Games */}
      <SectionHeader
        title="Games"
        cta="Random Game"
        onPressCTA={() => nav.navigate('Games')}
      />
      <Heading level={3} style={styles.sectionSub}>Classic Games</Heading>
      <CardGrid items={gridClassic} />

      {/* Section: Cultural Games */}
      <Heading level={3} style={[styles.sectionSub, { marginTop: spacing(2) }]}>Cultural Games</Heading>
      <CardGrid items={gridCultural} />

      {/* Section: Card-Based Games (hero wide) */}
      <Heading level={3} style={[styles.sectionSub, { marginTop: spacing(2) }]}>Card-Based Games</Heading>
      <WidePromo
        image="https://images.unsplash.com/photo-1542401886-65d6c6114f7a?q=80&w=1600&auto=format&fit=crop"
        onPress={() => nav.navigate('Games')}
      />

      {/* Section: App-Enhanced */}
      <Heading level={3} style={[styles.sectionSub, { marginTop: spacing(2) }]}>App-Enhanced</Heading>
      <CardGrid
        items={[
          {
            id: 'truth-or-dare',
            title: 'Truth or Dare',
            meta: '2–10 Players · Medium',
            image:
              'https://images.unsplash.com/photo-1613478223719-8fbcdcf3aa8e?q=80&w=1200&auto=format&fit=crop',
            link: { screen: 'GameDetails', params: { id: 'truth-or-dare' } as any },
          },
          {
            id: 'most-likely-to',
            title: 'Most Likely To',
            meta: '2–10 Players · Easy',
            image:
              'https://images.unsplash.com/photo-1626036813045-9f9b7609201c?q=80&w=1200&auto=format&fit=crop',
            link: { screen: 'GameDetails', params: { id: 'most-likely-to' } as any },
          },
        ]}
      />

      {/* Section: Party Games */}
      <Heading level={3} style={[styles.sectionSub, { marginTop: spacing(2) }]}>Party Games</Heading>
      <CardGrid items={gridParty} />
    </ScrollView>
  );
}

/* ------------------------------- UI bits -------------------------------- */

function NavChip({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.chip}>
      <Text style={styles.chipTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

function Tag({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return (
    <View style={styles.tag}>
      <Feather name={icon} size={14} color={colors.text} />
      <Text style={styles.tagTxt}>{text}</Text>
    </View>
  );
}

function SectionHeader({
  title,
  cta,
  onPressCTA,
}: {
  title: string;
  cta?: string;
  onPressCTA?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Heading level={2} style={styles.sectionTitle}>{title}</Heading>
      {!!cta && (
        <TouchableOpacity style={styles.cta} onPress={onPressCTA}>
          <Feather name="shuffle" size={14} color="#2a1c12" />
          <Text style={styles.ctaTxt}>{cta}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function CardGrid({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    meta: string;
    image: string;
    link: { screen: keyof RootStackParamList; params?: any };
  }>;
}) {
  const nav =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.grid}>
      {items.map((it) => (
        <TouchableOpacity
          key={it.id}
          onPress={() => nav.navigate(it.link.screen as any, it.link.params)}
          style={styles.gridCard}
          activeOpacity={0.9}
        >
          <Image source={{ uri: it.image }} style={styles.gridImg} />
          <Heading level={3} style={styles.gridTitle}>{it.title}</Heading>
          <Text style={styles.gridMeta}>{it.meta}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function WidePromo({ image, onPress }: { image: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.widePromo} activeOpacity={0.9}>
      <Image source={{ uri: image }} style={styles.wideImg} />
    </TouchableOpacity>
  );
}

/* -------------------------------- styles -------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  chipsRow: {
    flexDirection: 'row',
    gap: spacing(1),
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2),
    paddingBottom: spacing(1),
  },
  chip: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.pill,
  },
  chipTxt: {
    color: colors.goldText,
    fontWeight: '700',
  },

  heroCard: {
    marginHorizontal: spacing(2),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  heroImg: {
    width: '100%',
    height: CARD * 0.5,
  },
  heroBody: {
    padding: spacing(2),
    gap: spacing(1),
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  heroBlurb: {
    color: colors.subtext,
    lineHeight: 20,
  },
  heroMeta: {
    color: colors.subtext,
    marginTop: -4,
  },
  heroChips: {
    flexDirection: 'row',
    gap: spacing(1),
    marginTop: spacing(1),
  },
  tag: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: colors.chipBg,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderRadius: 14,
  },
  tagTxt: { color: colors.text, fontSize: 12 },

  sectionHeader: {
    marginTop: spacing(2),
    paddingHorizontal: spacing(2),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  cta: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1),
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  ctaTxt: { color: colors.goldText, fontWeight: '700', fontSize: 12 },

  sectionSub: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: spacing(2),
    marginTop: spacing(1),
    marginBottom: spacing(1),
  },

  grid: {
    paddingHorizontal: spacing(2),
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  gridCard: {
    width: (W - spacing(2) * 2 - spacing(2)) / 2, // 2 columns
  },
  gridImg: {
    width: '100%',
    height: 150,
    borderRadius: radii.md,
  },
  gridTitle: {
    marginTop: spacing(1),
    fontWeight: '700',
  },
  gridMeta: {
    color: colors.subtext,
    marginTop: 2,
  },

  widePromo: {
    marginHorizontal: spacing(2),
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  wideImg: {
    width: '100%',
    height: 220,
  },
});