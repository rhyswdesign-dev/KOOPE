/**
 * Bottle Search Screen
 *
 * Searchable index of the local SPIRITS_DATABASE — shown when a scan fails
 * so users can find and add a bottle by name without needing a successful scan.
 *
 * Flow: scan fails → "Search bottle library" → this screen → tap result → BottleDetail
 *
 * The Spirit object navigated to BottleDetail has full profile data (ABV, flavour
 * tags, tasting notes, origin, price estimates) so every bottle added this way
 * has the same richness as a successful scan.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { SPIRITS_DATABASE, type Spirit, type SpiritType } from '../data/spiritsDatabase';
import type { CameraStackParamList } from '../navigation/CameraStack';
import { useAuth } from '../contexts/AuthContext';
import { InventoryService } from '../services/inventoryService';
import { HomeBarService } from '../services/homeBarService';

interface OwnedMatch {
  inventoryItemId: string;
  name: string;
}

type Nav = NativeStackNavigationProp<CameraStackParamList, 'BottleSearch'>;

// ── Category filter chips ─────────────────────────────────────────────────────

type FilterKey = 'all' | SpiritType;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'gin', label: 'Gin' },
  { key: 'whiskey', label: 'Whiskey' },
  { key: 'vodka', label: 'Vodka' },
  { key: 'rum', label: 'Rum' },
  { key: 'tequila', label: 'Tequila' },
  { key: 'mezcal', label: 'Mezcal' },
  { key: 'brandy', label: 'Brandy' },
  { key: 'liqueur', label: 'Liqueur' },
  { key: 'other', label: 'Other' },
];

// ── Category → placeholder image fallback ────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  gin: 'wine-outline',
  whiskey: 'wine',
  vodka: 'water-outline',
  rum: 'wine-outline',
  tequila: 'leaf-outline',
  mezcal: 'flame-outline',
  brandy: 'wine-outline',
  liqueur: 'wine-outline',
  other: 'cube-outline',
};

// ── Search scoring ────────────────────────────────────────────────────────────

function scoreSpirit(spirit: Spirit, query: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const name = spirit.name.toLowerCase();
  const brand = spirit.brand.toLowerCase();
  const terms = spirit.searchTerms.map((t) => t.toLowerCase());

  if (name === q) return 120;
  if (name.startsWith(q)) return 90;
  if (name.includes(q)) return 70;
  if (brand === q) return 60;
  if (brand.startsWith(q)) return 45;
  if (brand.includes(q)) return 30;
  if (terms.some((t) => t.includes(q))) return 20;
  return 0;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BottleSearchScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const [query, setQuery] = useState<string>(() => (route?.params as any)?.initialQuery ?? '');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  // 2026-07-27: this screen used to be catalog-only, reached as a second
  // step after a separate shelf-only search modal on the Bar screen. Now
  // it's the one search screen — catalog results carry an "In Your Bar" tag
  // when they match something already owned, so there's one merged list
  // instead of two screens. Matching is name-containment, not exact, since
  // a shelf item like "Malfy Gin" should tag a catalog entry named "Malfy
  // Gin Con Limone".
  const [ownedByName, setOwnedByName] = useState<Map<string, OwnedMatch>>(new Map());

  const loadOwned = useCallback(async () => {
    try {
      const [remote, local] = await Promise.all([
        user?.id ? InventoryService.getUserInventory(user.id) : Promise.resolve([]),
        HomeBarService.getStoredIngredients(),
      ]);
      const map = new Map<string, OwnedMatch>();
      for (const item of remote) {
        const name = (item.item_name || '').trim();
        if (name) map.set(name.toLowerCase(), { inventoryItemId: item.id, name });
      }
      for (const item of local) {
        const name = (item.name || '').trim();
        if (name && !map.has(name.toLowerCase())) {
          map.set(name.toLowerCase(), { inventoryItemId: item.id, name });
        }
      }
      setOwnedByName(map);
    } catch {
      // Non-fatal: search still works, items just won't show as owned.
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadOwned();
    }, [loadOwned]),
  );

  const findOwnedMatch = useCallback(
    (spirit: Spirit): OwnedMatch | undefined => {
      const spiritName = spirit.name.toLowerCase();
      for (const [ownedNameLower, match] of ownedByName) {
        if (spiritName.includes(ownedNameLower) || ownedNameLower.includes(spiritName)) {
          return match;
        }
      }
      return undefined;
    },
    [ownedByName],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    let pool = SPIRITS_DATABASE;
    if (activeFilter !== 'all') {
      pool = pool.filter((s) => s.type === activeFilter);
    }

    if (!q) return pool;

    return pool
      .map((s) => ({ spirit: s, score: scoreSpirit(s, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ spirit }) => spirit);
  }, [query, activeFilter]);

  const handleSelect = useCallback(
    (spirit: Spirit) => {
      const owned = findOwnedMatch(spirit);
      if (owned) {
        // Route back into the Bar tab's own bottle-management modal (Bar
        // Note / Cellar Mode / Remove) rather than the read-only catalog
        // detail view — an owned bottle should open to "manage it," not
        // "here's what this is." HomeBarScreen's focus effect picks up
        // openItemId and opens that item, then clears the param.
        (navigation as any).navigate('Shelf', {
          screen: 'HomeBarMain',
          params: { openItemId: owned.inventoryItemId },
        });
        return;
      }
      navigation.navigate('BottleDetail', { bottle: spirit });
    },
    [navigation, findOwnedMatch],
  );

  const renderItem = ({ item }: { item: Spirit }) => {
    const owned = findOwnedMatch(item);
    return (
      <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)} activeOpacity={0.82}>
        <View style={styles.cardImageWrap}>
          <View style={styles.cardIconFallback}>
            <Ionicons
              name={(CATEGORY_ICONS[item.type] as any) ?? 'wine-outline'}
              size={28}
              color={colors.accent}
            />
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.cardBrand} numberOfLines={1}>
            {item.brand}
          </Text>
          <View style={styles.cardMeta}>
            {owned && (
              <View style={[styles.cardChip, styles.cardChipOwned]}>
                <Ionicons
                  name="checkmark-circle"
                  size={11}
                  color={colors.bg}
                  style={{ marginRight: 3 }}
                />
                <Text style={[styles.cardChipText, styles.cardChipOwnedText]}>In Your Bar</Text>
              </View>
            )}
            <View style={styles.cardChip}>
              <Text style={styles.cardChipText}>
                {item.type[0].toUpperCase() + item.type.slice(1)}
              </Text>
            </View>
            {item.abv > 0 && (
              <View style={styles.cardChip}>
                <Text style={styles.cardChipText}>{item.abv}% ABV</Text>
              </View>
            )}
            {item.flavorProfile.slice(0, 2).map((f) => (
              <View key={f} style={styles.cardChip}>
                <Text style={styles.cardChipText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.subtext} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or brand…"
            placeholderTextColor={colors.muted}
            autoFocus
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Category filter chips */}
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(f) => f.key}
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text
              style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color={colors.subtext} />
            <Text style={styles.emptyTitle}>
              {query ? 'No bottles found' : 'Search the library'}
            </Text>
            <Text style={styles.emptyBody}>
              {query
                ? `No results for "${query}". Try a shorter term or browse by category.`
                : 'Type a bottle name or brand above, or browse by category.'}
            </Text>
          </View>
        }
        ListHeaderComponent={
          results.length > 0 && !query ? (
            <Text style={styles.listHeader}>{results.length} bottles in library</Text>
          ) : results.length > 0 && query ? (
            <Text style={styles.listHeader}>
              {results.length} result{results.length !== 1 ? 's' : ''}
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingTop: spacing(1),
    paddingBottom: spacing(1.5),
    gap: spacing(1),
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.25),
    gap: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
  filterBar: {
    flexGrow: 0,
    marginBottom: spacing(1),
  },
  filterBarContent: {
    paddingHorizontal: spacing(2),
    gap: spacing(1),
  },
  filterChip: {
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: 'transparent',
  },
  filterChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '20',
  },
  filterChipText: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(8),
  },
  listHeader: {
    fontSize: 11,
    color: colors.subtext,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing(1.5),
    marginTop: spacing(0.5),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(1.5),
    gap: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardImageWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: spacing(0.5),
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
  },
  cardBrand: {
    fontSize: 12,
    color: colors.subtext,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.75),
    marginTop: spacing(0.5),
  },
  cardChip: {
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.25),
    backgroundColor: colors.bg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardChipText: {
    fontSize: 10,
    color: colors.subtext,
    fontWeight: '500',
  },
  cardChipOwned: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  cardChipOwnedText: {
    color: colors.bg,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing(10),
    paddingHorizontal: spacing(6),
    gap: spacing(1.5),
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
  },
});
