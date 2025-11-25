import React, { useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, 
  Image, TouchableOpacity, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useSavedItems, SavedItem } from '../hooks/useSavedItems';
import EmptyState from '../components/EmptyState';

type SavedItemsRouteProp = RouteProp<RootStackParamList, 'SavedItems'>;

export default function SavedItemsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<SavedItemsRouteProp>();
  const { category } = route.params;
  const { savedItems, toggleSavedBar, toggleSavedSpirit, toggleSavedCocktail, toggleSavedEvent, toggleFollowedCommunity } = useSavedItems();

  const getCategoryData = () => {
    switch (category) {
      case 'bars':
        return { items: savedItems.savedBars, title: 'Saved Bars', icon: 'heart' as const };
      case 'spirits':
        return { items: savedItems.savedSpirits, title: 'Saved Spirits', icon: 'glass-cocktail' as const };
      case 'cocktails':
        return { items: savedItems.savedCocktails, title: 'Saved Cocktails', icon: 'glass-mug-variant' as const };
      case 'events':
        return { items: savedItems.savedEvents, title: 'Saved Events', icon: 'bookmark' as const };
      case 'communities':
        return { items: savedItems.followedCommunities, title: 'Followed Communities', icon: 'account-group' as const };
      default:
        return { items: [], title: 'Saved Items', icon: 'bookmark' as const };
    }
  };

  const handleToggleItem = (item: SavedItem) => {
    switch (category) {
      case 'bars':
        toggleSavedBar(item);
        break;
      case 'spirits':
        toggleSavedSpirit(item);
        break;
      case 'cocktails':
        toggleSavedCocktail(item);
        break;
      case 'events':
        toggleSavedEvent(item);
        break;
      case 'communities':
        toggleFollowedCommunity(item);
        break;
    }
  };

  const { items, title, icon } = getCategoryData();

  useLayoutEffect(() => {
    nav.setOptions({
      title,
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
    });
  }, [nav, title]);

  const renderItem = ({ item }: { item: SavedItem }) => (
    <TouchableOpacity style={styles.itemCard} activeOpacity={0.8}>
      <View style={styles.itemImageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.itemImage} />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <MaterialCommunityIcons name={icon} size={32} color={colors.accent} />
          </View>
        )}
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.subtitle && <Text style={styles.itemSubtitle}>{item.subtitle}</Text>}
        <View style={styles.itemTypeContainer}>
          <Text style={styles.itemType}>{item.type.toUpperCase()}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.removeButton} 
        onPress={() => handleToggleItem(item)}
      >
        <Ionicons name="close" size={20} color={colors.text} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {items.length === 0 ? (
        <EmptyState
          icon={icon}
          title={`No ${title.toLowerCase()} yet`}
          message="Start saving items by tapping the bookmark icon when you find something you like!"
          actionLabel="Explore Cocktails"
          onAction={() => nav.navigate('Recipes')}
        />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
    paddingBottom: spacing(6),
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  itemImageContainer: {
    marginRight: spacing(2),
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: radii.md,
  },
  itemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  itemContent: {
    flex: 1,
    marginRight: spacing(2),
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  itemSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(1),
  },
  itemTypeContainer: {
    alignSelf: 'flex-start',
  },
  itemType: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
});