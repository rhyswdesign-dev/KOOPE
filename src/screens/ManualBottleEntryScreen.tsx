// @ts-nocheck
/**
 * Manual Bottle Entry Screen
 * Uses the same visual structure as Inventory manual add flow.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import type { CameraStackParamList } from '../navigation/CameraStack';
import { InventoryService } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { useXPSystem } from '../store/useXPSystem';
import { useUserTier } from '../store/useUserTier';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { TIER_LIMITS } from '../config/tierAccess';
import { withHaptic } from '../lib/haptics';

type ManualBottleEntryNav = NativeStackNavigationProp<CameraStackParamList, 'ManualBottleEntry'>;
type ManualBottleEntryRoute = RouteProp<CameraStackParamList, 'ManualBottleEntry'>;

const CATEGORIES = ['Spirit', 'Liqueur', 'Bitters', 'Syrup', 'Ingredient', 'Garnish', 'Other'] as const;
const SPIRIT_TYPES = ['Gin', 'Vodka', 'Rum', 'Whiskey', 'Tequila', 'Mezcal', 'Brandy', 'Other'] as const;
const NON_SPIRIT_TYPES: Record<string, readonly string[]> = {
  Liqueur: ['Orange Liqueur', 'Coffee Liqueur', 'Herbal Liqueur', 'Fruit Liqueur', 'Other'],
  Mixer: ['Tonic Water', 'Soda Water', 'Ginger Beer', 'Ginger Ale', 'Cola', 'Juice', 'Other'],
  Bitters: ['Aromatic Bitters', 'Orange Bitters', 'Chocolate Bitters', 'Other'],
  Syrup: ['Simple Syrup', 'Demerara Syrup', 'Honey Syrup', 'Agave Syrup', 'Grenadine', 'Other'],
  Garnish: ['Lime', 'Lemon', 'Orange', 'Cherry', 'Olive', 'Mint', 'Cucumber', 'Other'],
  Ingredient: [
    'Egg White',
    'Cream',
    'Coconut Cream',
    'Honey',
    'Sugar',
    'Salt',
    'Lime Juice',
    'Lemon Juice',
    'Pineapple',
    'Orange',
    'Grapefruit',
    'Strawberry',
    'Blueberry',
    'Raspberry',
    'Blackberry',
    'Mango',
    'Passionfruit',
    'Peach',
    'Apple',
    'Other',
  ],
  Other: ['Citrus', 'Herb', 'Fruit', 'Garnish', 'Other'],
};
const MATCH_ALIASES: Record<string, readonly string[]> = {
  Spirit: ['gin', 'vodka', 'rum', 'whiskey', 'tequila', 'mezcal', 'brandy'],
  Liqueur: ['triple sec', 'campari', 'aperol', 'vermouth'],
  Mixer: ['soda water', 'tonic water', 'ginger beer', 'ginger ale', 'cola', 'orange juice', 'pineapple juice'],
  Bitters: ['angostura bitters', 'orange bitters'],
  Syrup: ['simple syrup', 'demerara syrup', 'honey syrup', 'agave syrup', 'grenadine'],
  Garnish: ['lime', 'lemon', 'orange', 'mint', 'cherry', 'olive'],
  Ingredient: ['egg white', 'cream', 'honey', 'lime juice', 'lemon juice', 'pineapple'],
  Other: ['lime juice', 'lemon juice', 'orange juice', 'mint', 'cucumber'],
};

type Category = typeof CATEGORIES[number];
const sortAlpha = (items: readonly string[]) => [...items].sort((a, b) => a.localeCompare(b));
const cleanPrefill = (value?: string | null): string => {
  const v = String(value || '').trim();
  if (!v) return '';
  if (/^unknown(\s+brand)?$/i.test(v)) return '';
  return v;
};

export default function ManualBottleEntryScreen() {
  const navigation = useNavigation<ManualBottleEntryNav>();
  const insets = useSafeAreaInsets();
  const route = useRoute<ManualBottleEntryRoute>();
  const { user } = useAuth();
  const { earnBottleSubmittedXP } = useXPSystem();
  const { tier } = useUserTier();
  const { gateWithTrigger: inventoryGate } = useFeatureAccess('inventory_unlimited');

  const [name, setName] = useState(route.params?.initialName ?? '');
  const [brand, setBrand] = useState(cleanPrefill(route.params?.initialBrand));
  const [category, setCategory] = useState<Category>('Spirit');
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [matchAs, setMatchAs] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const typeOptions = useMemo(
    () => sortAlpha(category === 'Spirit' ? SPIRIT_TYPES : (NON_SPIRIT_TYPES[category] || NON_SPIRIT_TYPES.Other)),
    [category]
  );
  const matchAliasOptions = useMemo(
    () => sortAlpha(MATCH_ALIASES[category] || MATCH_ALIASES.Other),
    [category]
  );

  const brandPlaceholder = useMemo(() => {
    switch (category) {
      case 'Spirit':
        return 'e.g. Tito\'s';
      case 'Liqueur':
        return 'e.g. Cointreau';
      case 'Mixer':
        return 'e.g. Fever-Tree';
      case 'Bitters':
        return 'e.g. Angostura';
      case 'Syrup':
        return 'e.g. Monin';
      case 'Garnish':
        return 'e.g. Local Market';
      case 'Ingredient':
        return 'e.g. Organic Valley';
      default:
        return 'e.g. House Brand';
    }
  }, [category]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a bottle name.');
      return;
    }
    if (category === 'Spirit' && !subcategory) {
      Alert.alert('Spirit Type Required', 'Please choose a spirit type for better matching.');
      return;
    }

    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to add bottles to your inventory.',
        [
          { text: 'Sign In', onPress: () => navigation.navigate('CameraHub') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    if (tier === 'FREE') {
      const count = await InventoryService.getInventoryCount(user.id);
      if (count >= TIER_LIMITS.FREE.maxBottles) {
        inventoryGate('T1');
        return;
      }
    }

    setSubmitting(true);

    const itemName = name.trim();
    const derivedMatchAs = (matchAs || (category === 'Spirit' ? subcategory : null) || '').toLowerCase().trim();
    const notes = derivedMatchAs ? `match_as=${derivedMatchAs}` : undefined;

    const result = await InventoryService.addToInventory({
      userId: user.id,
      itemType: category === 'Spirit' ? 'spirit' : 'ingredient',
      itemName,
      category: category.toLowerCase(),
      subcategory: subcategory?.toLowerCase(),
      brand: brand.trim() || undefined,
      notes,
      imageUrl: route.params?.imageUri ?? undefined,
    });

    setSubmitting(false);

    if (result.duplicate) {
      Alert.alert('Already in Inventory', `${itemName} is already in your inventory!`, [{ text: 'OK' }]);
      return;
    }

    if (!result.success) {
      Alert.alert('Error', 'Failed to add to inventory. Please try again.');
      return;
    }

    earnBottleSubmittedXP();

    Alert.alert(
      'Added to Inventory!',
      `${itemName} has been added to your inventory.\n\n+150 XP earned`,
      [
        { text: 'View Inventory', onPress: () => navigation.navigate('CameraHub') },
        { text: 'Scan Another', onPress: () => navigation.navigate('SmartScan') },
        { text: 'OK' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 6 : 0}
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing(1) }]}>
          <Text style={styles.headerTitle}>Add Ingredient</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionGhost} onPress={withHaptic(() => navigation.goBack(), 'selection')}>
              <Text style={styles.headerActionGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerActionPrimary, submitting && styles.headerActionPrimaryDisabled]}
              onPress={withHaptic(handleSubmit, 'medium')}
              disabled={submitting}
            >
              <Text style={styles.headerActionPrimaryText}>{submitting ? 'Adding...' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            keyboardVisible ? { paddingBottom: keyboardHeight + spacing(3) } : null,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Text style={styles.modalEyebrow}>Manual Entry</Text>
          <Text style={styles.modalSubtitle}>Add details first, then choose type for better matching.</Text>

          {(route.params?.initialBrand || route.params?.initialName) && (
            <View style={styles.prefillNotice}>
              <Ionicons name="information-circle-outline" size={16} color={colors.gold} />
              <Text style={styles.prefillNoticeText}>
                We pre-filled fields from scan results. Edit anything before saving.
              </Text>
            </View>
          )}

          <View style={styles.formSectionCard}>
            <Text style={styles.sectionTitleCompact}>Details</Text>

            <Text style={styles.formLabel}>Name *</Text>
            <TextInput
              style={styles.formInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. London Dry Gin"
              placeholderTextColor={colors.subtext}
              autoFocus={false}
            />

            <Text style={styles.formLabel}>Brand (Optional)</Text>
            <TextInput
              style={styles.formInput}
              value={brand}
              onChangeText={setBrand}
              placeholder={brandPlaceholder}
              placeholderTextColor={colors.subtext}
            />
          </View>

          <View style={styles.formSectionCard}>
            <Text style={styles.sectionTitleCompact}>Type</Text>
            <Text style={styles.formLabel}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryPickerButton, category === cat && styles.categoryPickerButtonActive]}
                  onPress={withHaptic(() => {
                    setCategory(cat);
                    setSubcategory(null);
                    setMatchAs(null);
                  }, 'selection')}
                >
                  <Text style={[styles.categoryPickerButtonText, category === cat && styles.categoryPickerButtonTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.formLabel}>{category === 'Spirit' ? 'Subtype *' : 'Subtype'}</Text>
            <View style={styles.chipRow}>
              {typeOptions.map((sub) => (
                <TouchableOpacity
                  key={sub}
                  style={[styles.chip, subcategory === sub && styles.chipSelected]}
                  onPress={withHaptic(() => {
                    setSubcategory(sub);
                    if (category === 'Spirit' && !matchAs && sub !== 'Other') {
                      setMatchAs(sub.toLowerCase());
                    }
                  }, 'selection')}
                >
                  <Text style={[styles.chipText, subcategory === sub && styles.chipTextSelected]}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={withHaptic(() => setShowAdvanced((v) => !v), 'selection')}
            >
              <Text style={styles.advancedToggleText}>
                {showAdvanced ? 'Hide advanced matching' : 'Show advanced matching'}
              </Text>
              <Ionicons
                name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.subtext}
              />
            </TouchableOpacity>

            {showAdvanced && (
              <>
                <Text style={styles.formLabel}>Match Alias (Optional)</Text>
                <View style={styles.chipRow}>
                  {matchAliasOptions.map((alias) => (
                    <TouchableOpacity
                      key={alias}
                      style={[styles.chip, matchAs === alias && styles.chipSelected]}
                      onPress={withHaptic(() => setMatchAs(alias), 'selection')}
                    >
                      <Text style={[styles.chipText, matchAs === alias && styles.chipTextSelected]}>{alias}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        </ScrollView>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  headerActionGhost: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  headerActionGhostText: {
    color: colors.subtext,
    fontSize: 13,
    fontWeight: '700',
  },
  headerActionPrimary: {
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1),
    borderRadius: radii.md,
    backgroundColor: colors.gold,
  },
  headerActionPrimaryDisabled: {
    opacity: 0.6,
  },
  headerActionPrimaryText: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing(3),
    paddingBottom: spacing(8),
  },
  modalEyebrow: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing(0.5),
  },
  modalSubtitle: {
    color: colors.subtext,
    fontSize: 13,
    marginBottom: spacing(2),
  },
  prefillNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: 'rgba(214,138,56,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.24)',
    borderRadius: radii.md,
    padding: spacing(1.5),
    marginBottom: spacing(1),
  },
  prefillNoticeText: {
    color: colors.subtext,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  formSectionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
    marginTop: spacing(2),
  },
  sectionTitleCompact: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing(1.25),
  },
  formLabel: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing(0.75),
    marginTop: spacing(1),
  },
  categoryPicker: {
    marginTop: spacing(0.5),
  },
  categoryPickerButton: {
    marginRight: spacing(1),
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  categoryPickerButtonActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  categoryPickerButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  categoryPickerButtonTextActive: {
    color: colors.bg,
  },
  formInput: {
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
    marginBottom: spacing(0.25),
  },
  chip: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderRadius: radii.full,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  chipText: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.bg,
  },
  advancedToggle: {
    marginTop: spacing(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(1),
  },
  advancedToggleText: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '700',
  },
});
