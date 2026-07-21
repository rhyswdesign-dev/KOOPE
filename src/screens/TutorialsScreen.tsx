import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { SCREEN_TOURS, ScreenTourId, ScreenTourSlide } from '../config/screenTours';
import ScreenTourModal from '../components/tour/ScreenTourModal';
import { colors, radii, serif, spacing } from '../theme/tokens';
import { log } from '../lib/logger';
import { useTutorialPreferences } from '../store/useTutorialPreferences';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TOUR_STORAGE_PREFIX = '@KOOPE:screen_tour_seen_';

const TOUR_META: Record<ScreenTourId, { title: string; subtitle: string }> = {
  tab_lessons: {
    title: 'Lessons Tab Tour',
    subtitle: 'Learn lessons, challenges, and progression',
  },
  tab_drinks: {
    title: 'Drinks Tab Tour',
    subtitle: 'Saved cocktails, made-it history, and recipe import',
  },
  tab_discover: { title: 'Discover Tab Tour', subtitle: 'Explore recipes and recommendations' },
  tab_camera: { title: 'Camera Tab Tour', subtitle: 'Understand scan flows and capture options' },
  tab_inventory: { title: 'Inventory Tab Tour', subtitle: 'Manage your bar and restock workflow' },
  tab_profile: { title: 'Profile Tab Tour', subtitle: 'Review progress, stats, and settings' },
  feature_lesson_engine: {
    title: 'Lesson Engine Tour',
    subtitle: 'How lessons and summaries work',
  },
  feature_smart_scan: {
    title: 'Smart Scan Tour',
    subtitle: 'Barcode + AI tier behavior explained',
  },
  feature_recipe_detail: {
    title: 'Recipe Detail Tour',
    subtitle: 'Log brands, changes, and rating flow',
  },
  // Cellar
  cellar_home: {
    title: 'Cellar — Dashboard',
    subtitle: 'Portfolio value, ready-to-open cards, and top movers',
  },
  cellar_market: {
    title: 'Cellar — Market',
    subtitle: 'Portfolio analytics, category split, and holdings list',
  },
  cellar_register: {
    title: 'Cellar — Register',
    subtitle: 'Log a new acquisition with condition and strategy',
  },
  cellar_watch: {
    title: 'Cellar — Watchlist',
    subtitle: 'Track bottles you want to buy in the future',
  },
  cellar_vault: {
    title: 'Cellar — Vault',
    subtitle: 'Browse your lots and get deep collector reads',
  },
  cellar_bottle_detail: {
    title: 'Cellar — Bottle Detail',
    subtitle: 'Price history, directive, and edit flow',
  },
  trial_pro_unlock: {
    title: 'PRO Features Tour',
    subtitle: 'Vault drops, recipe builder, and hosting tools',
  },
};

interface ActiveTourState {
  id: ScreenTourId;
  slides: ScreenTourSlide[];
  stepIndex: number;
}

export default function TutorialsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const [activeTour, setActiveTour] = useState<ActiveTourState | null>(null);
  const contextTourId = route.params?.contextTourId as ScreenTourId | undefined;
  const showTutorialIcons = useTutorialPreferences((state) => state.showTutorialIcons);
  const setShowTutorialIcons = useTutorialPreferences((state) => state.setShowTutorialIcons);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Tutorials',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '700', fontSize: 22, fontFamily: serif },
      headerShadowVisible: false,
    });
  }, [navigation]);

  const tourIds = useMemo(() => {
    const allTourIds = Object.keys(SCREEN_TOURS) as ScreenTourId[];
    if (!contextTourId) return allTourIds;

    const contextMap: Record<ScreenTourId, ScreenTourId[]> = {
      tab_lessons: ['tab_lessons', 'feature_lesson_engine'],
      tab_drinks: ['tab_drinks'],
      tab_discover: ['tab_discover', 'feature_recipe_detail'],
      tab_camera: ['tab_camera', 'feature_smart_scan'],
      tab_inventory: ['tab_inventory'],
      tab_profile: ['tab_profile'],
      feature_lesson_engine: ['feature_lesson_engine', 'tab_lessons'],
      feature_smart_scan: ['feature_smart_scan', 'tab_camera'],
      feature_recipe_detail: ['feature_recipe_detail', 'tab_discover'],
      // Cellar — all cellar tours cluster together
      cellar_home: [
        'cellar_home',
        'cellar_market',
        'cellar_register',
        'cellar_watch',
        'cellar_vault',
        'cellar_bottle_detail',
      ],
      cellar_market: [
        'cellar_home',
        'cellar_market',
        'cellar_register',
        'cellar_watch',
        'cellar_vault',
        'cellar_bottle_detail',
      ],
      cellar_register: [
        'cellar_home',
        'cellar_market',
        'cellar_register',
        'cellar_watch',
        'cellar_vault',
        'cellar_bottle_detail',
      ],
      cellar_watch: [
        'cellar_home',
        'cellar_market',
        'cellar_register',
        'cellar_watch',
        'cellar_vault',
        'cellar_bottle_detail',
      ],
      cellar_vault: [
        'cellar_home',
        'cellar_market',
        'cellar_register',
        'cellar_watch',
        'cellar_vault',
        'cellar_bottle_detail',
      ],
      cellar_bottle_detail: [
        'cellar_home',
        'cellar_market',
        'cellar_register',
        'cellar_watch',
        'cellar_vault',
        'cellar_bottle_detail',
      ],
      trial_pro_unlock: ['trial_pro_unlock'],
    };

    const allowed = new Set(contextMap[contextTourId] || [contextTourId]);
    return allTourIds.filter((id) => allowed.has(id));
  }, [contextTourId]);

  const openTour = (id: ScreenTourId) => {
    setActiveTour({
      id,
      slides: SCREEN_TOURS[id],
      stepIndex: 0,
    });
  };

  const closeTour = () => {
    setActiveTour(null);
  };

  const nextStep = () => {
    setActiveTour((prev) => {
      if (!prev) return prev;
      if (prev.stepIndex >= prev.slides.length - 1) return null;
      return { ...prev, stepIndex: prev.stepIndex + 1 };
    });
  };

  const previousStep = () => {
    setActiveTour((prev) => {
      if (!prev) return prev;
      return { ...prev, stepIndex: Math.max(0, prev.stepIndex - 1) };
    });
  };

  const handleResetAll = () => {
    Alert.alert(
      'Reset Tutorials',
      'This will make all screen tours show again on next visit. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const keys = await AsyncStorage.getAllKeys();
              const tutorialKeys = keys.filter((k) => k.startsWith(TOUR_STORAGE_PREFIX));
              if (tutorialKeys.length > 0) {
                await AsyncStorage.multiRemove(tutorialKeys);
              }
              Alert.alert('Done', 'All tutorials were reset.');
            } catch (error) {
              log.error('TutorialsScreen', 'Failed to reset tutorial state', error);
              Alert.alert('Error', 'Could not reset tutorials. Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>Feature Tours</Text>
          <Text style={styles.headerBody}>
            {contextTourId
              ? 'Tutorials for this page and its related features.'
              : 'Replay any tutorial to understand where features live and how each major flow works.'}
          </Text>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>Show tutorial icon</Text>
              <Text style={styles.toggleBody}>
                Display the floating ? quick-access button in the app.
              </Text>
            </View>
            <Switch
              value={showTutorialIcons}
              onValueChange={setShowTutorialIcons}
              thumbColor={showTutorialIcons ? colors.white : colors.subtle}
              trackColor={{ true: colors.accent, false: colors.line }}
            />
          </View>
          <Pressable style={styles.resetButton} onPress={handleResetAll}>
            <Ionicons name="refresh-outline" size={16} color={colors.text} />
            <Text style={styles.resetButtonText}>Reset all tutorials</Text>
          </Pressable>
        </View>

        {tourIds.map((id) => (
          <Pressable key={id} style={styles.itemCard} onPress={() => openTour(id)}>
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemTitle}>{TOUR_META[id].title}</Text>
              <Text style={styles.itemSubtitle}>{TOUR_META[id].subtitle}</Text>
            </View>
            <Ionicons name="play-circle-outline" size={22} color={colors.accent} />
          </Pressable>
        ))}
      </ScrollView>

      <ScreenTourModal
        visible={Boolean(activeTour)}
        slides={activeTour?.slides || []}
        stepIndex={activeTour?.stepIndex || 0}
        onClose={closeTour}
        onNext={nextStep}
        onPrevious={previousStep}
        isFirstStep={(activeTour?.stepIndex || 0) === 0}
        isLastStep={Boolean(activeTour && activeTour.stepIndex >= activeTour.slides.length - 1)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing(2),
    gap: spacing(1.5),
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
    gap: spacing(1),
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  headerBody: {
    color: colors.subtext,
    fontSize: 14,
    lineHeight: 20,
  },
  toggleRow: {
    marginTop: spacing(0.5),
    paddingTop: spacing(1),
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(1),
  },
  toggleTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  toggleBody: {
    color: colors.subtext,
    fontSize: 12,
    marginTop: 2,
    maxWidth: 250,
  },
  resetButton: {
    marginTop: spacing(0.5),
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing(0.75),
    alignItems: 'center',
    backgroundColor: colors.chipBg,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
  },
  resetButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTextWrap: {
    flex: 1,
    paddingRight: spacing(1),
  },
  itemTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  itemSubtitle: {
    color: colors.subtext,
    fontSize: 12,
    marginTop: 2,
  },
});
