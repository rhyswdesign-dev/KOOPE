import React, { useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Pressable,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radii } from '../theme/tokens';
import { games } from '../../assets/images/games';

const { width } = Dimensions.get('window');

// Data
const KINGS_IMG = games.kingsCup;

const meta = { origin: 'USA' };

const chips = [
  { icon: 'users', label: 'Players: 4–10+' },
  { icon: 'award', label: 'Difficulty: Easy' },
];

const equipment = [
  { icon: 'coffee', title: 'Cups' },
  { icon: 'coffee', title: '1 Large Cup' },
  { icon: 'layers', title: 'Deck of Cards' },
  { icon: 'grid', title: 'Table' },
  { icon: 'droplet', title: 'Drinks' },
];

const style = { icon: 'coffee', title: 'Sips' };

const setup = [
  { icon: 'coffee', text: "Place the empty King's Cup in the center of the table" },
  { icon: 'square', text: 'Spread the deck face-down in a circle around the cup' },
  { icon: 'users', text: 'Players sit in a circle with drinks ready' },
];

const rules = [
  'Ace (Waterfall): Everyone drinks in sequence until the starter stops',
  '2 (You): Choose someone to drink',
  '3 (Me): Drawer drinks',
  '4 (Floor): Last to touch floor drinks',
  '5 (Guys): All men drink',
  '6 (Girls): All women drink',
  '7 (Heaven): Last to raise hand drinks',
  '8 (Mate): Choose a drink buddy',
  '9 (Rhyme): Say a word; others rhyme it',
  '10 (Categories): Pick a category; loser drinks',
  'Jack (Make a Rule): Add a rule for rest of game',
  'Queen (Question Master): Ask questions; those who answer drink',
  "King: Pour some of your drink into King's Cup; last King chugs it",
];

const warnings = [
  { text: 'Game escalates quickly — pace your drinks' },
  { text: 'Not recommended for solo play or very small groups' },
  { text: 'Hydrate between rounds' },
];

// Components
function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionHeader}>{title}</Text>
  );
}

function Chip({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.chip}>
      <Feather name={icon as any} size={16} color={colors.text} style={{ marginRight: 6 }} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function RowItem({ 
  icon, 
  title, 
  subtitle,
  onPress 
}: { 
  icon: any; 
  title: string; 
  subtitle?: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.rowItem}>
      <View style={styles.iconContainer}>
        {typeof icon === 'string' ? (
          <Feather name={icon as any} size={20} color={colors.text} />
        ) : (
          icon
        )}
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

function AccentButton({ title, onPress, style }: { title: string; onPress: () => void; style?: any }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.accentButton, style]} activeOpacity={0.8}>
      <Text style={styles.accentButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function KingsCupScreen() {
  const nav = useNavigation();
  const imageHeight = Math.round(width * 1.2); // Full size hero image


  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: spacing(8) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Image */}
        <Image
          source={KINGS_IMG}
          style={[styles.headerImage, { height: imageHeight }]}
          resizeMode="cover"
        />

        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Title & Meta */}
          <Text style={styles.title}>King's Cup</Text>
          <Text style={styles.meta}>Origin: {meta.origin}</Text>

          {/* Chips Row */}
          <View style={styles.chipsRow}>
            {chips.map((chip, index) => (
              <Chip key={`chip-${chip.label}-${index}`} icon={chip.icon as any} label={chip.label} />
            ))}
          </View>

          {/* Equipment Section */}
          <SectionHeader title="Equipment" />
          <View style={styles.section}>
            {equipment.map((item, index) => (
              <RowItem 
                key={index} 
                icon={item.icon as any} 
                title={item.title} 
              />
            ))}
          </View>

          {/* Drinking Style Section */}
          <SectionHeader title="Drinking Style" />
          <View style={styles.section}>
            <RowItem icon={style.icon as any} title={style.title} />
          </View>

          {/* Setup Instructions Section */}
          <SectionHeader title="Setup Instructions" />
          <View style={styles.section}>
            {setup.map((item, index) => (
              <RowItem 
                key={index} 
                icon={item.icon as any} 
                title={item.text} 
              />
            ))}
          </View>


          {/* Step-by-Step Rules Section */}
          <SectionHeader title="Step-by-Step Rules" />
          <View style={styles.section}>
            {rules.map((rule, index) => (
              <RowItem 
                key={index} 
                icon={<Feather name="square" size={16} color={colors.text} />}
                title={rule} 
              />
            ))}
          </View>

          {/* Warnings Section */}
          <SectionHeader title="Warnings" />
          <View style={styles.section}>
            {warnings.map((warning, index) => (
              <RowItem 
                key={index} 
                icon="check-circle" 
                title={warning.text} 
              />
            ))}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  headerImage: {
    width: '100%',
  },
  contentContainer: {
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2),
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  meta: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: spacing(2),
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing(1),
    marginBottom: spacing(1),
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line || 'rgba(244,237,230,0.12)',
  },
  chipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(3),
    marginBottom: spacing(1),
  },
  section: {
    gap: spacing(0.5),
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: 12,
    paddingVertical: spacing(0.5),
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
  },
  rowSubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
  },
  accentButton: {
    height: 48,
    backgroundColor: colors.gold || '#E0A35B',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 0,
  },
  accentButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.goldText || '#271C14',
  },
});