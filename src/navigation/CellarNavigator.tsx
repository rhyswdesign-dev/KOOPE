/**
 * CellarNavigator — 5-tab bottom navigator for The Cellar (PRO)
 *
 * Tabs:  CELLAR | MARKET | ＋ | WATCH | VAULT
 *
 * The centre ＋ tab is rendered as a raised amber FAB. Tapping it
 * switches to the Register screen (it's a real tab, not a modal, so
 * the user's form state persists while they peek at other tabs).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { FeedbackPromptModal, getFeatureFeedbackResponse } from '../components/FeedbackPromptModal';

// Tab screens
import TheCellarScreen from '../screens/TheCellarScreen';
import CellarAnalyticsScreen from '../screens/CellarAnalyticsScreen';
import CellarRegisterScreen from '../screens/CellarRegisterScreen';
import CellarWatchlistScreen from '../screens/CellarWatchlistScreen';
import CellarVaultTab from '../screens/CellarVaultTab';

// PRO gate — shown when user has no cellar_mode access
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './RootNavigator';

// ─── tab param list ───────────────────────────────────────────────────────────

export type CellarTabParamList = {
  CellarHome: undefined;
  CellarMarket: undefined;
  CellarAdd: undefined;
  CellarWatch: undefined;
  CellarVault: undefined;
};

const Tab = createBottomTabNavigator<CellarTabParamList>();

// ─── custom tab bar ───────────────────────────────────────────────────────────

const TAB_BG = '#1A120D';
const AMBER = '#D68A38';
const MUTED = '#6B5140';
const TAB_H = 60;
const FAB_SIZE = 56;

interface TabItem {
  route: keyof CellarTabParamList;
  label: string;
  icon: string;
  iconFocused: string;
}

const TABS: TabItem[] = [
  { route: 'CellarHome', label: 'CELLAR', icon: 'cube-outline', iconFocused: 'cube' },
  { route: 'CellarMarket', label: 'MARKET', icon: 'bar-chart-outline', iconFocused: 'bar-chart' },
  { route: 'CellarAdd', label: '', icon: 'add', iconFocused: 'add' }, // FAB centre
  { route: 'CellarWatch', label: 'WATCH', icon: 'eye-outline', iconFocused: 'eye' },
  { route: 'CellarVault', label: 'VAULT', icon: 'shield-outline', iconFocused: 'shield' },
];

// Individual tab item — extracted so hooks are called at component level
function CellarTabItem({
  tab,
  idx,
  state,
  navigation,
}: {
  tab: TabItem;
  idx: number;
  state: any;
  navigation: any;
}) {
  const focused = state.index === idx;
  const isFab = tab.route === 'CellarAdd';

  const onPress = useCallback(() => {
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes[idx].key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate({ name: tab.route, merge: true });
    }
  }, [focused, idx, navigation, state, tab.route]);

  if (isFab) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={styles.fabWrap}
        accessibilityLabel="Register new bottle"
        accessibilityRole="button"
      >
        <View style={[styles.fab, focused && styles.fabActive]}>
          <Ionicons name="add" size={28} color="#1A120D" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.tabItem}
      accessibilityLabel={tab.label}
      accessibilityRole="button"
    >
      <Ionicons
        name={(focused ? tab.iconFocused : tab.icon) as any}
        size={22}
        color={focused ? AMBER : MUTED}
      />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{tab.label}</Text>
    </TouchableOpacity>
  );
}

function CellarTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBar,
        { paddingBottom: Math.max(insets.bottom, 8), height: TAB_H + Math.max(insets.bottom, 8) },
      ]}
    >
      {TABS.map((tab, idx) => (
        <CellarTabItem key={tab.route} tab={tab} idx={idx} state={state} navigation={navigation} />
      ))}
    </View>
  );
}

// ─── PRO gate screen ──────────────────────────────────────────────────────────

function CellarProGate() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [alreadyAnswered, setAlreadyAnswered] = useState<'yes' | 'no' | null>(null);

  useEffect(() => {
    getFeatureFeedbackResponse('cellar_mode').then(setAlreadyAnswered);
  }, []);

  return (
    <LinearGradient colors={['#1A120D', '#2B1F17']} style={styles.gateContainer}>
      {/* This gate has no header (CellarNavigator renders it standalone,
          bypassing the tab navigator entirely — see the comment above
          CellarNavigator) — without an explicit close button there was no
          way to leave this screen at all. */}
      <TouchableOpacity
        style={[styles.gateCloseButton, { top: insets.top + 12 }]}
        onPress={() => nav.goBack()}
        accessibilityLabel="Close"
        accessibilityRole="button"
      >
        <Ionicons name="close" size={22} color={AMBER} />
      </TouchableOpacity>
      <View style={styles.gateIcon}>
        <Ionicons name="wine" size={44} color={AMBER} />
      </View>

      <Text style={styles.gateTitle}>The Cellar</Text>
      <Text style={styles.gateBody}>
        A dedicated space to track, value, and curate your spirits collection — with drinking
        windows, portfolio value, and a curated drop watchlist.
      </Text>

      <View style={styles.gateList}>
        {[
          'Portfolio valuation & tracking',
          'Drinking window management',
          'Curated drop watchlist',
          "Collector's edition vault",
        ].map((item) => (
          <View key={item} style={styles.gateListRow}>
            <Ionicons name="checkmark-circle" size={15} color={AMBER} style={{ marginTop: 1 }} />
            <Text style={styles.gateListText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.feedbackSection}>
        <Text style={styles.feedbackQuestion}>Would this be useful to you?</Text>
        {alreadyAnswered ? (
          <Text style={styles.feedbackThanks}>
            Thanks for the feedback
            {alreadyAnswered === 'yes' ? " — we'll let you know when it's live." : '.'}
          </Text>
        ) : (
          <TouchableOpacity
            style={styles.gateButton}
            onPress={() => setFeedbackVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.gateButtonText}>Tell us →</Text>
          </TouchableOpacity>
        )}
      </View>

      <FeedbackPromptModal
        featureKey="cellar_mode"
        title="Would The Cellar be useful to you?"
        body="We're building a dedicated space to track and value your spirits collection. Is this something you'd actually use?"
        visible={feedbackVisible}
        onDismiss={() => {
          setFeedbackVisible(false);
          getFeatureFeedbackResponse('cellar_mode').then(setAlreadyAnswered);
        }}
      />
    </LinearGradient>
  );
}

// ─── navigator ────────────────────────────────────────────────────────────────

export default function CellarNavigator() {
  // Cellar Mode is coming later — show feedback gate for all tiers
  return <CellarProGate />;

  return (
    <Tab.Navigator
      tabBar={(props) => <CellarTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="CellarHome" component={TheCellarScreen} />
      <Tab.Screen name="CellarMarket" component={CellarAnalyticsScreen} />
      <Tab.Screen name="CellarAdd" component={CellarRegisterScreen} />
      <Tab.Screen name="CellarWatch" component={CellarWatchlistScreen} />
      <Tab.Screen name="CellarVault" component={CellarVaultTab} />
    </Tab.Navigator>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: TAB_BG,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214,138,56,0.15)',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    gap: 3,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: MUTED,
  },
  tabLabelActive: {
    color: AMBER,
  },
  // FAB centre button
  fabWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -(FAB_SIZE / 2 + 4),
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: AMBER,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AMBER,
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabActive: {
    backgroundColor: '#E89C40',
  },
  // PRO gate
  gateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  gateCloseButton: {
    position: 'absolute',
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(214,138,56,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  gateIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(214,138,56,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  gateEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    color: AMBER,
    marginBottom: 6,
  },
  gateTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F2E5D5',
    marginBottom: 12,
  },
  gateBody: {
    fontSize: 15,
    color: '#C7B8A5',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  gateList: {
    alignSelf: 'stretch',
    gap: 10,
    marginBottom: 36,
  },
  gateListRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  gateListText: {
    fontSize: 14,
    color: '#F2E5D5',
    flex: 1,
    lineHeight: 20,
  },
  gateButton: {
    backgroundColor: AMBER,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  gateButtonText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#1A120D',
  },
  feedbackSection: {
    width: '100%',
    marginTop: 8,
    gap: 12,
    alignItems: 'center',
  },
  feedbackQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F2E5D5',
    textAlign: 'center',
  },
  feedbackThanks: {
    fontSize: 13,
    color: '#C7B8A5',
    textAlign: 'center',
    lineHeight: 19,
  },
});
