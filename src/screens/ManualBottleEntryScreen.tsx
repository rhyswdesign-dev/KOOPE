/**
 * Manual Bottle Entry Screen
 * Fallback flow when smart scan doesn't recognize a bottle.
 * Allows users to manually enter bottle details and add to inventory.
 */

import React, { useState, useLayoutEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

type ManualBottleEntryNav = NativeStackNavigationProp<CameraStackParamList, 'ManualBottleEntry'>;
type ManualBottleEntryRoute = RouteProp<CameraStackParamList, 'ManualBottleEntry'>;

const CATEGORIES = ['Spirit', 'Liqueur', 'Mixer', 'Bitters', 'Syrup', 'Other'] as const;
const SUBCATEGORIES = ['Gin', 'Vodka', 'Rum', 'Whiskey', 'Tequila', 'Mezcal', 'Brandy', 'Other'] as const;

type Category = typeof CATEGORIES[number];
type Subcategory = typeof SUBCATEGORIES[number];

export default function ManualBottleEntryScreen() {
  const navigation = useNavigation<ManualBottleEntryNav>();
  const route = useRoute<ManualBottleEntryRoute>();
  const { user } = useAuth();
  const { earnInventoryXP } = useXPSystem();
  const { tier } = useUserTier();
  const { gateWithTrigger: inventoryGate } = useFeatureAccess('inventory_unlimited');

  const [name, setName] = useState(route.params?.initialName ?? '');
  const [brand, setBrand] = useState(route.params?.initialBrand ?? '');
  const [category, setCategory] = useState<Category>('Spirit');
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Add Bottle Manually',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '700' },
      headerShadowVisible: false,
    });
  }, [navigation]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a bottle name.');
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

    // T1: Check inventory limit for free users
    if (tier === 'FREE') {
      const count = await InventoryService.getInventoryCount(user.id);
      if (count >= TIER_LIMITS.FREE.maxBottles) {
        inventoryGate('T1');
        return;
      }
    }

    setSubmitting(true);

    const itemName = brand.trim() ? `${brand.trim()} ${name.trim()}` : name.trim();
    const itemCategory = category === 'Spirit' && subcategory
      ? subcategory.toLowerCase()
      : category.toLowerCase();

    const result = await InventoryService.addToInventory({
      userId: user.id,
      itemType: category === 'Spirit' ? 'spirit' : 'ingredient',
      itemName,
      category: itemCategory,
      imageUrl: route.params?.imageUri ?? undefined,
    });

    setSubmitting(false);

    if (result.duplicate) {
      Alert.alert(
        'Already in Inventory',
        `${itemName} is already in your inventory!`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (!result.success) {
      Alert.alert('Error', 'Failed to add to inventory. Please try again.');
      return;
    }

    // Award XP
    earnInventoryXP(itemName);

    Alert.alert(
      'Added to Inventory!',
      `${itemName} has been added to your inventory.\n\n+5 XP earned`,
      [
        {
          text: 'View Inventory',
          onPress: () => navigation.navigate('CameraHub'),
        },
        {
          text: 'Scan Another',
          onPress: () => navigation.navigate('SmartScan'),
        },
        { text: 'OK' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Name */}
          <Text style={styles.label}>Bottle Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. London Dry Gin"
            placeholderTextColor={colors.subtext}
            autoFocus={!name}
          />

          {/* Brand */}
          <Text style={styles.label}>Brand</Text>
          <TextInput
            style={styles.input}
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g. Tanqueray"
            placeholderTextColor={colors.subtext}
          />

          {/* Category */}
          <Text style={styles.label}>Category *</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipSelected]}
                onPress={() => {
                  setCategory(cat);
                  if (cat !== 'Spirit') setSubcategory(null);
                }}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Subcategory (spirits only) */}
          {category === 'Spirit' && (
            <>
              <Text style={styles.label}>Spirit Type</Text>
              <View style={styles.chipRow}>
                {SUBCATEGORIES.map((sub) => (
                  <TouchableOpacity
                    key={sub}
                    style={[styles.chip, subcategory === sub && styles.chipSelected]}
                    onPress={() => setSubcategory(sub)}
                  >
                    <Text style={[styles.chipText, subcategory === sub && styles.chipTextSelected]}>
                      {sub}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Ionicons name="add-circle" size={22} color={colors.bg} />
            <Text style={styles.submitButtonText}>
              {submitting ? 'Adding...' : 'Add to Inventory'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing(4),
    paddingBottom: spacing(8),
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing(1),
    marginTop: spacing(3),
  },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(214, 138, 56, 0.2)',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1.5),
  },
  chip: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: radii.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(214, 138, 56, 0.15)',
  },
  chipSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  chipText: {
    color: colors.subtext,
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.bg,
    fontWeight: '700',
  },
  footer: {
    padding: spacing(4),
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 138, 56, 0.1)',
  },
  submitButton: {
    backgroundColor: colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
    paddingVertical: spacing(3),
    borderRadius: radii.full,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '700',
  },
});
