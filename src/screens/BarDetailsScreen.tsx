import React, { useLayoutEffect, useState } from 'react';
import { ScrollView, View, Text, Image, Pressable, Modal, TextInput, Alert, Platform, Share } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing, radii } from '../theme/tokens';
import SectionHeader from '../components/SectionHeader';
import { useSavedItems } from '../hooks/useSavedItems';

type R = RouteProp<RootStackParamList, 'BarDetails'>;

type KV = { icon?: keyof typeof Ionicons.glyphMap; label: string; value?: string };
type Drink = { name: string; image: string; subtitle?: string; price?: string };
type Tile  = { title: string; image: string; subtitle?: string };

const IMG = {
  heroFallback: 'https://images.unsplash.com/photo-1604908177220-6e04c21623d4?q=80&w=1600&auto=format&fit=crop',
  drink1: 'https://images.unsplash.com/photo-1541976076758-347942db1970?q=80&w=1200&auto=format&fit=crop',
  drink2: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?q=80&w=1200&auto=format&fit=crop',
  drink3: 'https://images.unsplash.com/photo-1527169400221-b0e7d9f70a1b?q=80&w=1200&auto=format&fit=crop',
  event1: 'https://images.unsplash.com/photo-1527169402691-feff5539e52c?q=80&w=1200&auto=format&fit=crop',
  event2: 'https://images.unsplash.com/photo-1524592869810-6f6a7f3b1ae5?q=80&w=1200&auto=format&fit=crop',
  event3: 'https://images.unsplash.com/photo-1529694157870-3900cc12e6f0?q=80&w=1200&auto=format&fit=crop', // Happy Hour
  gallery1: 'https://images.unsplash.com/photo-1556713304-9266bd1c2a6b?q=80&w=1200&auto=format&fit=crop',
  gallery2: 'https://images.unsplash.com/photo-1528184039930-bd03972bd974?q=80&w=1200&auto=format&fit=crop',
  avatar: 'https://images.unsplash.com/photo-1544006659-f0b21884ce1d?q=80&w=240&h=240&auto=format&fit=crop',
};

function Divider({ mt = 12, mb = 12 }: { mt?: number; mb?: number }) {
  return <View style={{ height: 1, backgroundColor: colors.line, marginTop: mt, marginBottom: mb }} />;
}

function Pill({ text }: { text: string }) {
  return (
    <View style={{ paddingHorizontal: spacing(1.25), paddingVertical: 8, backgroundColor: colors.card, borderRadius: 999, borderWidth: 1, borderColor: colors.line, marginRight: spacing(1), marginBottom: spacing(1) }}>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

function Row({ icon, label, value }: KV) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
      {icon ? <Ionicons name={icon} size={18} color={colors.text} style={{ marginRight: 8 }} /> : null}
      <Text style={{ color: colors.text, fontWeight: '700' }}>{label}</Text>
      {value ? <Text style={{ color: colors.muted, marginLeft: 6 }}>{value}</Text> : null}
    </View>
  );
}

function HCard({ item }: { item: Tile | Drink }) {
  const title = 'title' in item ? item.title : item.name;
  const subtitle = 'subtitle' in item ? item.subtitle : undefined;
  const price = (item as Drink).price;
  return (
    <View style={{ width: 160, marginRight: spacing(1.25) }}>
      <Image source={{ uri: item.image }} style={{ width: '100%', height: 110, borderRadius: radii.lg }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        <Text style={{ color: colors.text, fontWeight: '800' }}>{title}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.accent} style={{ marginLeft: 4 }} />
      </View>
      {subtitle ? <Text style={{ color: colors.muted }}>{subtitle}</Text> : null}
      {price ? <Text style={{ color: colors.text, fontWeight:'800' }}>{price}</Text> : null}
    </View>
  );
}

function BottomButtons({ onReserve, onDirections, onMenu }: { onReserve?: () => void; onDirections?: () => void; onMenu?: () => void }) {
  return (
    <View style={{ padding: spacing(2), gap: spacing(1), borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg }}>
      <Pressable onPress={onReserve} style={{ backgroundColor: colors.gold, paddingVertical: 14, borderRadius: radii.lg, alignItems: 'center' }}>
        <Text style={{ color: '#120D07', fontWeight: '900' }}>Reserve Table</Text>
      </Pressable>
      <Pressable onPress={onMenu} style={{ backgroundColor: colors.card, paddingVertical: 14, borderRadius: radii.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.line }}>
        <Text style={{ color: colors.text, fontWeight: '900' }}>View Menu</Text>
      </Pressable>
      <Pressable onPress={onDirections} style={{ backgroundColor: colors.card, paddingVertical: 14, borderRadius: radii.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.line }}>
        <Text style={{ color: colors.text, fontWeight: '900' }}>Get Directions</Text>
      </Pressable>
    </View>
  );
}

export default function BarDetailsScreen() {
  const { params } = useRoute<R>();
  const navigation = useNavigation<any>();
  const [reserveOpen, setReserveOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const { savedItems, toggleSavedBar, isBarSaved } = useSavedItems();
  
  const barId = `${params.name}`.toLowerCase().replace(/\s+/g, '_');
  const isSaved = isBarSaved(barId);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${params.name}${params.city ? ` in ${params.city}` : ''}! ${params.subtitle || 'A great place for cocktails and good times.'}`,
        title: `${params.name} - Bar & Lounge`,
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share at this time');
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions?.({
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Pressable hitSlop={10} onPress={() => toggleSavedBar({
            id: barId,
            name: params.name,
            subtitle: params.subtitle || params.city || 'Bar',
            image: params.image
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
  }, [navigation, isSaved]);

  const hero = params.image || IMG.heroFallback;

  const quickFacts: KV[] = [
    { icon: 'musical-notes-outline', label: 'Live Jazz' },
    { icon: 'home-outline', label: 'Speakeasy' },
    { icon: 'reorder-three-outline', label: 'Classic Revival' },
    { icon: 'calendar-outline', label: 'Saturdays' },
    { icon: 'time-outline', label: '4–7 PM Weekdays' },
  ];

  const signatureDrinks: Drink[] = [
    { name: 'Midnight Bloom', image: IMG.drink1, subtitle: 'Floral gin sour', price: '$14' },
    { name: 'Smoked Velvet', image: IMG.drink2, subtitle: 'Bourbon + smoke', price: '$16' },
    { name: 'Velvet Negroni', image: IMG.drink3, subtitle: 'Bitter-sweet twist', price: '$15' },
  ];

  const events: Tile[] = [
    { title: 'Live Jazz', image: IMG.event1, subtitle: 'Sat 9:00 PM' },
    { title: 'Chef’s Late Bites', image: IMG.event2, subtitle: 'Fri 10:30 PM' },
    { title: 'Happy Hour', image: IMG.event3, subtitle: 'Weekdays 4–7 PM' }, // NEW
  ];

  const tips: KV[] = [
    { icon: 'calendar-outline', label: 'Best Times', value: 'Sat after 9 PM' },
    { icon: 'navigate-outline', label: 'Nearest Subway', value: '2 blocks' },
    { icon: 'alert-circle-outline', label: 'Reserve early (peak weekends)' },
  ];

  const musicStyle = 'Jazz / Lo-Fi'; // for Crowd & Atmosphere

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing(3) }}>
        <Image source={{ uri: hero }} style={{ width: '100%', height: 190 }} />
        <View style={{ padding: spacing(2) }}>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900' }}>{params.name}</Text>
          <Text style={{ color: colors.muted, marginTop: 2 }}>{params.city || 'Toronto'} • {params.address || 'Downtown'}</Text>

          <Divider mt={spacing(1.5)} mb={spacing(1.5)} />

          {/* Quick facts like in screenshot */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {quickFacts.map((q, i) => <Pill key={i} text={q.label} />)}
          </View>

          <SectionHeader title="Signature Drinks" />
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={{ marginLeft: spacing(2), marginBottom: spacing(1) }}>
            {signatureDrinks.map(d => <HCard key={d.name} item={d} />)}
          </ScrollView>

          <SectionHeader title="Events & Specials" />
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={{ marginLeft: spacing(2), marginBottom: spacing(1) }}>
            {events.map(e => <HCard key={e.title} item={e} />)}
          </ScrollView>

          <SectionHeader title={`About ${params.name}`} />
          <Text style={{ color: colors.text }}>
            The Velvet Curtain is a low-lit, cocktail-forward speakeasy known for its floral gin sours
            and bourbon smokes. Live jazz on weekends, a compact small-plates menu after 10 PM, and
            a quietly buzzing crowd. Pro-tip: reserve early for a corner table.
          </Text>

          <Divider />
          <SectionHeader title="Crowd & Atmosphere" />
          <Row icon="people-outline" label="Vibe:" value="Date-good" />
          <Row icon="volume-medium-outline" label="Noise:" value="Mid-Low Crowd" />
          <Row icon="musical-notes-outline" label="Music:" value={musicStyle} />

          <Divider />
          <SectionHeader title="Bartender Spotlight" />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image source={{ uri: IMG.avatar }} style={{ width: 44, height: 44, borderRadius: 999, marginRight: 10 }} />
            <View>
              <Text style={{ color: colors.text, fontWeight: '800' }}>Eden Shaw</Text>
              <Text style={{ color: colors.muted }}>Craft/Perfumer</Text>
            </View>
          </View>

          <Divider />
          <SectionHeader title="Travel Tips" />
          {tips.map((t, i) => <Row key={i} icon={t.icon} label={t.label} value={t.value} />)}

          <Divider />
          <SectionHeader title="Photo Gallery" />
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={{ marginLeft: spacing(2), marginBottom: spacing(1) }}>
            {[IMG.gallery1, IMG.gallery2].map((g, i) => (
              <Image key={i} source={{ uri: g }} style={{ width: 180, height: 120, borderRadius: radii.lg, marginRight: spacing(1.25) }} />
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <BottomButtons
        onReserve={() => setReserveOpen(true)}
        onDirections={() => {}}
        onMenu={() => {}}
      />

      {/* Phone prompt */}
      <Modal visible={reserveOpen} transparent animationType="fade" onRequestClose={()=>setReserveOpen(false)}>
        <View style={{ flex:1, backgroundColor:'#00000088', justifyContent:'center', padding: spacing(2) }}>
          <View style={{ backgroundColor: colors.bg, borderRadius: radii.xl, padding: spacing(2), gap: spacing(1) }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight:'900' }}>Reserve Table</Text>
            <Text style={{ color: colors.muted }}>Enter your phone number and we’ll text you a confirmation.</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 123-4567"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              keyboardAppearance="dark"
              style={{ backgroundColor: colors.card, borderColor: colors.line, borderWidth:1, borderRadius: radii.lg, color: colors.text, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 8 }}
            />
            <Pressable onPress={() => { setReserveOpen(false); setPhone(''); Alert.alert('Requested','We’ll text you shortly.'); }}
              style={{ backgroundColor: colors.gold, padding:12, borderRadius: radii.lg, alignItems:'center' }}>
              <Text style={{ color:'#120D07', fontWeight:'900' }}>Submit</Text>
            </Pressable>
            <Pressable onPress={()=> setReserveOpen(false)} style={{ padding:10, alignItems:'center' }}>
              <Text style={{ color: colors.muted, fontWeight:'700' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
