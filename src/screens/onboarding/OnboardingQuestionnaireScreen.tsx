import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, serif } from '../../theme/tokens';
import { PRICING_DISPLAY } from '../../constants/subscriptions';
import { useUserTier } from '../../store/useUserTier';
import { useXPSystem } from '../../store/useXPSystem';
import { usePersonalization } from '../../store/usePersonalization';
import {
  OnboardingQuestionnaireAnswers,
  OnboardingGoal,
  SkillLevel,
  Frequency,
  AlcoholFree,
  BudgetRange,
  BottleCountRange,
  ComplexityPreference,
  DiscoverySource,
  SpiritKey,
  FlavorKey,
  buildInitialLearningProfile,
  persistOnboardingQuestionnaire,
  getTrialBenefits,
  getTrialHeadline,
  estimateRecipeMatchCount,
  toPersonalizationPatch,
} from '../../services/onboardingQuestionnaireService';
import { log } from '../../lib/logger';

type Step =
  | 'q1_goal'
  | 'q2_skill'
  | 'q4_flavors'
  | 'q3_spirits'
  | 'q5_dislikes'
  | 'q6_frequency'
  | 'q7_alcohol_free'
  | 'optional_gate'
  | 'q8_occasions'
  | 'q9_budget'
  | 'q10_bottles'
  | 'q11_complexity'
  | 'q12_goal_30'
  | 'q13_discovery'
  | 'q14_rating'
  | 'paywall_prime_value'
  | 'paywall_prime_reminder'
  | 'trial_offer'
  | 'payoff'
  | 'first_action';

type CompleteAction = 'scan' | 'skip';

interface Props {
  onComplete: (action: CompleteAction) => void;
  previewMode?: boolean;
  onViewMasteryLessons?: () => void;
}

const ONBOARDING_TRIAL_DAYS = 7;
const ONBOARDING_MONTHLY_PRICE = PRICING_DISPLAY.PLUS.monthly;
const ONBOARDING_YEARLY_PRICE = PRICING_DISPLAY.FOUNDERS.PLUS.yearly;
const ONBOARDING_YEARLY_PER_MONTH = PRICING_DISPLAY.FOUNDERS.PLUS.yearlyPerMonth;
const ONBOARDING_YEARLY_REGULAR_PRICE = PRICING_DISPLAY.PLUS.yearly;
const ONBOARDING_YEARLY_REGULAR_PER_MONTH = PRICING_DISPLAY.PLUS.yearlyPerMonth;

function PreviewModeBanner() {
  return (
    <View style={styles.previewBanner}>
      <Ionicons name="eye-outline" size={14} color={colors.accent} />
      <Text style={styles.previewBannerText}>Preview Mode: no progress, profile, or trial changes will be saved.</Text>
    </View>
  );
}

function HeaderBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.headerBackButton} hitSlop={10}>
      <Ionicons name="arrow-back" size={18} color={colors.text} />
      <Text style={styles.headerBackText}>Back</Text>
    </Pressable>
  );
}

function ProgressPhoneMock() {
  const cycle = useRef(new Animated.Value(0)).current;
  const scanPulse = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(cycle, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(cycle, { toValue: 2, duration: 2400, useNativeDriver: true }),
        Animated.timing(cycle, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [cycle]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scanPulse, { toValue: 1.03, duration: 1400, useNativeDriver: true }),
        Animated.timing(scanPulse, { toValue: 0.96, duration: 1400, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [scanPulse]);

  const bottleOpacity = cycle.interpolate({
    inputRange: [0, 0.4, 0.8, 1.2, 2],
    outputRange: [1, 1, 0, 0, 1],
  });
  const menuOpacity = cycle.interpolate({
    inputRange: [0, 0.8, 1, 1.4, 2],
    outputRange: [0, 0, 1, 1, 0],
  });
  const ingredientsOpacity = cycle.interpolate({
    inputRange: [0, 1.6, 2],
    outputRange: [0, 0, 1],
  });
  const bottleLabelOpacity = bottleOpacity;
  const menuLabelOpacity = menuOpacity;
  const ingredientsLabelOpacity = ingredientsOpacity;

  return (
    <View style={styles.phoneMock}>
      <View style={styles.phoneNotch} />
      <View style={styles.phoneViewport}>
        <Animated.View style={[styles.mockScanGlow, { transform: [{ scale: scanPulse }] }]} />
        <View style={styles.mockFrameCornerTopLeft} />
        <View style={styles.mockFrameCornerTopRight} />
        <View style={styles.mockPlate}>
          <Animated.View style={[styles.mockBottleWrap, { opacity: bottleOpacity, transform: [{ rotate: '-10deg' }] }]}>
            <View style={styles.mockBottleNeck} />
            <View style={styles.mockBottleBody} />
            <View style={styles.mockBottleLabelBand} />
            <View style={styles.mockBottleCap} />
          </Animated.View>
          <Animated.View style={[styles.mockMenuCard, { opacity: menuOpacity }]}>
            <View style={styles.mockMenuThumb} />
            <View style={styles.mockMenuLineLong} />
            <View style={styles.mockMenuLineShort} />
            <View style={styles.mockMenuLineLong} />
            <View style={styles.mockMenuChip} />
          </Animated.View>
          <Animated.View style={[styles.mockIngredientsCard, { opacity: ingredientsOpacity, transform: [{ rotate: '8deg' }] }]}>
            <View style={styles.mockIngredientBoard} />
            <View style={styles.mockIngredientBottle} />
            <View style={styles.mockIngredientCitrus} />
            <View style={styles.mockIngredientHerb} />
            <View style={styles.mockIngredientIce} />
            <View style={styles.mockIngredientJar} />
            <View style={styles.mockIngredientBerry} />
          </Animated.View>
        </View>
        <View style={styles.mockGlass} />
        <View style={styles.mockDetectedRow}>
          <Animated.View style={[styles.mockDetectedChip, { opacity: bottleLabelOpacity }]}>
            <Ionicons name="checkmark-circle" size={12} color="#1A120D" />
            <Text style={styles.mockDetectedText}>Bottle identified</Text>
          </Animated.View>
          <Animated.View style={[styles.mockDetectedChip, { opacity: menuLabelOpacity }]}>
            <Ionicons name="checkmark-circle" size={12} color="#1A120D" />
            <Text style={styles.mockDetectedText}>Menu recognized</Text>
          </Animated.View>
          <Animated.View style={[styles.mockDetectedChip, { opacity: ingredientsLabelOpacity }]}>
            <Ionicons name="checkmark-circle" size={12} color="#1A120D" />
            <Text style={styles.mockDetectedText}>Ingredients parsed</Text>
          </Animated.View>
        </View>
        <View style={styles.mockControlBar}>
          <Text style={styles.mockControlText}>Scan bottles, recipe cards, and ingredients</Text>
        </View>
        <View style={styles.mockFrameCornerBottomLeft} />
        <View style={styles.mockFrameCornerBottomRight} />
      </View>
    </View>
  );
}

function RatingStars({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <View style={styles.ratingStarsRow}>
      {[1, 2, 3, 4, 5].map((star) => {
        const selected = star <= value;
        return (
          <Pressable
            key={star}
            onPress={() => onChange(value === star ? 0 : star)}
            style={[styles.ratingStarButton, selected && styles.ratingStarButtonActive]}
          >
            <Ionicons
              name={selected ? 'star' : 'star-outline'}
              size={26}
              color={selected ? '#1A120D' : colors.accent}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function PaywallPrimerScreen({
  onBack,
  onContinue,
  onSkip,
  title,
  subtitle,
  body,
  footer,
  cta,
  secondaryCta,
  variant,
  previewMode,
}: {
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
  title: string;
  subtitle?: string;
  body?: React.ReactNode;
  footer: string;
  cta: string;
  secondaryCta: string;
  variant: 'value' | 'reminder';
  previewMode: boolean;
}) {
  return (
    <SafeAreaView style={styles.paywallScreen}>
      <View style={styles.paywallTopBar}>
        <HeaderBackButton onPress={onBack} />
        <Pressable>
          <Text style={styles.paywallRestoreText}>Restore</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.paywallScrollContent} showsVerticalScrollIndicator={false}>
        {previewMode ? <PreviewModeBanner /> : null}

        <View style={styles.paywallHeadlineWrap}>
          <Text style={styles.paywallHeadline}>{title}</Text>
          {subtitle ? <Text style={styles.paywallSubheadline}>{subtitle}</Text> : null}
        </View>

        {variant === 'value' ? (
          <View style={styles.paywallVisualWrap}>
            <View style={styles.valueIntroPill}>
              <Text style={styles.valueIntroPillText}>{ONBOARDING_TRIAL_DAYS}-day KOOPE+ trial</Text>
            </View>
            <ProgressPhoneMock />
            <View style={styles.paywallCaptionRow}>
              <Ionicons name="pricetag-outline" size={18} color="#111111" />
              <Text style={styles.paywallCaptionText}>{ONBOARDING_TRIAL_DAYS} days free, then {ONBOARDING_YEARLY_PRICE}/year ({ONBOARDING_YEARLY_PER_MONTH}/mo)</Text>
            </View>
          </View>
        ) : (
          <View style={styles.reminderVisualWrap}>
            <View style={styles.reminderTrustCard}>
              <View style={styles.reminderBellCard}>
                <Ionicons name="notifications-outline" size={66} color="#F1EADF" />
                <View style={styles.reminderBadge}>
                  <Text style={styles.reminderBadgeText}>1</Text>
                </View>
              </View>
              <View style={styles.reminderTrustBody}>
                <Text style={styles.reminderTrustTitle}>Simple reminder</Text>
                <Text style={styles.reminderTrustText}>
                  We will send one heads-up before billing starts.
                </Text>
                <View style={styles.reminderTrustRow}>
                  <Ionicons name="time-outline" size={16} color={colors.accent} />
                  <Text style={styles.reminderTrustMeta}>Cancel anytime before renewal</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {body}
      </ScrollView>

      <View style={styles.paywallStickyFooter}>
        <Pressable style={styles.paywallPrimaryButton} onPress={onContinue}>
          <Text style={styles.paywallPrimaryButtonText}>{cta}</Text>
        </Pressable>
        <Pressable style={styles.paywallSecondaryAction} onPress={onSkip}>
          <Text style={styles.paywallSecondaryActionText}>{secondaryCta}</Text>
        </Pressable>
        <Text style={styles.paywallFooterText}>{footer}</Text>
      </View>
    </SafeAreaView>
  );
}

const REQUIRED_STEPS: Step[] = [
  'q1_goal',
  'q2_skill',
  'q4_flavors',
  'q3_spirits',
  'q5_dislikes',
  'q6_frequency',
  'q7_alcohol_free',
];

const OPTIONAL_STEPS: Step[] = ['q8_occasions', 'q9_budget', 'q10_bottles', 'q11_complexity', 'q12_goal_30'];

const GOAL_OPTIONS: Array<{ value: OnboardingGoal; label: string; icon: string }> = [
  { value: 'learn_bartending', label: 'Learn bartending', icon: 'school-outline' },
  { value: 'make_better_drinks', label: 'Make better drinks at home', icon: 'home-outline' },
  { value: 'host_parties', label: 'Host parties & events', icon: 'people-outline' },
  { value: 'track_inventory', label: 'Track my bar inventory', icon: 'list-outline' },
  { value: 'explore_spirits', label: 'Explore & discover new spirits', icon: 'compass-outline' },
];

const SKILL_OPTIONS: Array<{ value: SkillLevel; label: string; sub: string }> = [
  { value: 'beginner', label: 'Beginner', sub: "I'm just starting out" },
  { value: 'intermediate', label: 'Intermediate', sub: 'I make drinks regularly' },
  { value: 'advanced', label: 'Advanced', sub: 'I know techniques & theory' },
];

const FLAVOR_OPTIONS: Array<{ value: FlavorKey; label: string; emoji: string }> = [
  { value: 'citrus', label: 'Citrus & Bright', emoji: '🍋' },
  { value: 'sweet', label: 'Sweet & Fruity', emoji: '🍓' },
  { value: 'bitter', label: 'Bitter & Herbal', emoji: '🌿' },
  { value: 'smoky', label: 'Smoky & Peaty', emoji: '🔥' },
  { value: 'spicy', label: 'Spicy & Bold', emoji: '🌶️' },
  { value: 'smooth', label: 'Smooth & Easy', emoji: '💧' },
  { value: 'spirit_forward', label: 'Spirit-Forward', emoji: '🥃' },
  { value: 'creamy', label: 'Creamy & Rich', emoji: '🥥' },
];

const SPIRIT_OPTIONS: Array<{ value: SpiritKey; label: string; emoji: string }> = [
  { value: 'vodka', label: 'Vodka', emoji: '🍸' },
  { value: 'gin', label: 'Gin', emoji: '🌿' },
  { value: 'rum', label: 'Rum', emoji: '🥃' },
  { value: 'tequila', label: 'Tequila', emoji: '🌵' },
  { value: 'mezcal', label: 'Mezcal', emoji: '🔥' },
  { value: 'bourbon', label: 'Bourbon / Whiskey', emoji: '🥃' },
  { value: 'scotch', label: 'Scotch', emoji: '🏴' },
  { value: 'rye', label: 'Rye', emoji: '🌾' },
  { value: 'brandy', label: 'Brandy / Cognac', emoji: '🍇' },
  { value: 'explore', label: 'Not sure / Explore', emoji: '🤷' },
];

const DISLIKE_OPTIONS = [
  'Egg white',
  'Cream/dairy',
  'Mint',
  'Anise/licorice',
  'Overly sweet drinks',
  'Very bitter drinks',
  'Spicy heat',
  'None of the above',
];

const FREQUENCY_OPTIONS: Array<{ value: Frequency; label: string; sub: string }> = [
  { value: 'rare', label: 'Rarely', sub: 'Less than once a week' },
  { value: 'casual', label: 'Casually', sub: '1–2 per week' },
  { value: 'regular', label: 'Regularly', sub: '3–5 per week' },
  { value: 'daily', label: 'Daily', sub: 'Near-daily ritual' },
];

const ALCOHOL_FREE_OPTIONS: Array<{ value: AlcoholFree; label: string; sub: string }> = [
  { value: 'yes', label: 'Yes, show mocktails too', sub: 'Include zero-proof options' },
  { value: 'no', label: 'Alcoholic only', sub: 'No mocktails please' },
  { value: 'both', label: 'Both', sub: 'I like variety' },
];

const OCCASION_OPTIONS = [
  'Solo relaxation',
  'Date night',
  'Small gathering (2–4)',
  'Parties (5+)',
  'Before/after dinner',
  'Special celebrations',
];

const BUDGET_OPTIONS: Array<{ value: BudgetRange; label: string; sub: string }> = [
  { value: 'budget', label: 'Budget-conscious', sub: 'Under $25 per bottle' },
  { value: 'mid', label: 'Mid-range', sub: '$25–50 per bottle' },
  { value: 'premium', label: 'Premium', sub: '$50–100 per bottle' },
  { value: 'luxury', label: 'Luxury', sub: 'Over $100 per bottle' },
  { value: 'varies', label: 'It varies', sub: 'No preference' },
];

const BOTTLE_OPTIONS: Array<{ value: BottleCountRange; label: string; sub: string }> = [
  { value: 'none', label: "None yet", sub: "I'm just starting" },
  { value: '1_5', label: '1–5 bottles', sub: 'Getting started' },
  { value: '6_15', label: '6–15 bottles', sub: 'Decent home bar' },
  { value: '16_30', label: '16–30 bottles', sub: 'Well-stocked' },
  { value: '30_plus', label: '30+ bottles', sub: 'Serious collection' },
];

const COMPLEXITY_OPTIONS: Array<{ value: ComplexityPreference; label: string; sub: string }> = [
  { value: 'simple', label: 'Simple & quick', sub: '2–4 ingredients' },
  { value: 'moderate', label: 'Moderate', sub: '5–7 ingredients' },
  { value: 'advanced', label: 'Advanced craft', sub: 'I love the craft' },
  { value: 'variety', label: 'Mix it up', sub: 'Depends on the mood' },
];

const GOAL_30_OPTIONS = [
  'Build a core home bar',
  'Master classic cocktails',
  'Improve my bartending speed',
  'Host confidently',
  'Discover new spirits & expand my palate',
];

const DISCOVERY_OPTIONS: Array<{ value: DiscoverySource; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'tiktok', label: 'TikTok', icon: 'musical-notes-outline' },
  { value: 'instagram', label: 'Instagram', icon: 'camera-outline' },
  { value: 'youtube', label: 'YouTube', icon: 'play-circle-outline' },
  { value: 'friend', label: 'Friend or bartender', icon: 'people-outline' },
  { value: 'app_store', label: 'App Store search', icon: 'phone-portrait-outline' },
  { value: 'google', label: 'Google search', icon: 'search-outline' },
  { value: 'event', label: 'Event or class', icon: 'wine-outline' },
  { value: 'other', label: 'Somewhere else', icon: 'sparkles-outline' },
];

const STEP_ORDER: Step[] = [
  ...REQUIRED_STEPS,
  'optional_gate',
  ...OPTIONAL_STEPS,
  'q13_discovery',
  'q14_rating',
  'paywall_prime_value',
  'paywall_prime_reminder',
  'trial_offer',
  'payoff',
  'first_action',
];

// ─── Animated sub-screens ───────────────────────────────────────────────────

function GateScreen({
  onBack,
  onYes,
  onSkip,
}: {
  onBack: () => void;
  onYes: () => void;
  onSkip: () => void;
}) {
  const ring = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(ring, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerWrap}>
        <View style={styles.standaloneTopRow}>
          <HeaderBackButton onPress={onBack} />
        </View>
        <Animated.View style={[styles.gateRing, { transform: [{ scale: ring }] }]}>
          <Ionicons name="checkmark" size={40} color={colors.accent} />
        </Animated.View>

        <Animated.View style={{ opacity: fade, alignItems: 'center', gap: spacing(1) }}>
          <Text style={styles.gateEyebrow}>Core profile complete</Text>
          <Text style={[styles.title, { textAlign: 'center' }]}>Your profile is ready</Text>
          <Text style={[styles.subtitle, { textAlign: 'center', marginBottom: spacing(3) }]}>
            Continue to see your 7-day KOOPE+ trial, or jump in with the free version now.
          </Text>
        </Animated.View>

        <View style={styles.gateActions}>
          <Pressable style={[styles.primaryButton, styles.gatePrimaryButton]} onPress={onYes}>
            <Text style={styles.primaryButtonText}>View 7-Day Trial</Text>
          </Pressable>
          <Pressable style={[styles.ghostButton, styles.gateSecondaryButton]} onPress={onSkip}>
            <Text style={styles.ghostButtonText}>Continue Free</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function PayoffScreen({
  recipeMatches,
  startedTrial,
  onBack,
  onNext,
  goalLabel,
  spiritLabel,
  flavorLabel,
  previewMode = false,
}: {
  recipeMatches: number;
  startedTrial: boolean;
  onBack: () => void;
  onNext: () => void;
  goalLabel: string;
  spiritLabel: string;
  flavorLabel: string;
  previewMode?: boolean;
}) {
  const ring = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(ring, { toValue: 1, tension: 52, friction: 7, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.centerWrap}>
        <View style={styles.standaloneTopRow}>
          <HeaderBackButton onPress={onBack} />
        </View>
        <Animated.View style={[styles.payoffRing, { transform: [{ scale: ring }] }]}>
          <Ionicons name="flame" size={40} color={colors.accent} />
        </Animated.View>

        <Animated.View style={{ opacity: fade, alignItems: 'center', width: '100%', gap: spacing(2) }}>
          <Text style={[styles.title, { textAlign: 'center' }]}>Your cocktail profile is ready</Text>

          <Text style={[styles.subtitle, { textAlign: 'center', marginBottom: 0 }]}>
            KOOPE matched drinks to your taste and built a starting path around what you want to make.
          </Text>

          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{recipeMatches}</Text>
              <Text style={styles.statLabel}>recipes matched</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValueSmall}>{spiritLabel}</Text>
              <Text style={styles.statLabel}>best fit spirit</Text>
            </View>
          </View>

          <View style={styles.profileSummaryCard}>
            <View style={styles.profileSummaryRow}>
              <Ionicons name="sparkles-outline" size={16} color={colors.accent} />
              <Text style={styles.profileSummaryText}>Starting path: {goalLabel}</Text>
            </View>
            <View style={styles.profileSummaryRow}>
              <Ionicons name="wine-outline" size={16} color={colors.accent} />
              <Text style={styles.profileSummaryText}>Flavor profile: {flavorLabel}</Text>
            </View>
          </View>

          <Text style={[styles.subtitle, { textAlign: 'center' }]}>
            {previewMode
              ? 'Preview mode only. You can keep exploring the onboarding without saving any account or trial changes.'
              : startedTrial
              ? 'Your 7-day trial is active. Cancel anytime from settings.'
              : 'You can start a free trial anytime from your profile.'}
          </Text>

          <Pressable style={[styles.primaryButton, { width: '100%' }]} onPress={onNext}>
            <Text style={styles.primaryButtonText}>Choose My First Step</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function OnboardingQuestionnaireScreen({ onComplete, previewMode = false, onViewMasteryLessons }: Props) {
  const [step, setStep] = useState<Step>('q1_goal');
  const [optionalEnabled, setOptionalEnabled] = useState(false);
  const [startedTrial, setStartedTrial] = useState(false);
  const [selectedOfferPeriod, setSelectedOfferPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [showFoundersPricing, setShowFoundersPricing] = useState(false);
  const [answers, setAnswers] = useState<Partial<OnboardingQuestionnaireAnswers>>({
    dislikes: [],
  });
  const [dislikeText, setDislikeText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const markProfileComplete = useXPSystem((s) => s.markProfileComplete);

  const requiredIndex = REQUIRED_STEPS.indexOf(step);
  const optionalIndex = OPTIONAL_STEPS.indexOf(step);

  const inferredFlavorPreview = useMemo(() => {
    const flavors = answers.flavors || [];
    if (flavors.includes('citrus')) return ['Margarita', 'Daiquiri', 'Whiskey Sour', 'Paloma'];
    if (flavors.includes('spirit_forward')) return ['Old Fashioned', 'Martini', 'Manhattan', 'Negroni'];
    if (flavors.includes('sweet')) return ['Mai Tai', 'Amaretto Sour', 'French 75', 'Clover Club'];
    return ['Mojito', 'Tom Collins', 'Gin Fizz', 'Sidecar'];
  }, [answers.flavors]);

  const goNext = () => {
    const currentIndex = STEP_ORDER.indexOf(step);
    const next = STEP_ORDER[currentIndex + 1];
    if (!next) return;
    if (next === 'q8_occasions' && !optionalEnabled) {
      setStep('q13_discovery');
      return;
    }
    setStep(next);
  };

  const goToPaywallFlow = () => {
    setOptionalEnabled(false);
    setStep('q13_discovery');
  };

  const goBack = () => {
    if (step === 'q1_goal') return;
    if (step === 'optional_gate') {
      setStep('q7_alcohol_free');
      return;
    }
    if (step === 'q13_discovery') {
      setStep(optionalEnabled ? 'q12_goal_30' : 'optional_gate');
      return;
    }
    if (step === 'q14_rating') {
      setStep('q13_discovery');
      return;
    }
    if (step === 'paywall_prime_value') {
      setStep('q14_rating');
      return;
    }
    if (step === 'paywall_prime_reminder') {
      setStep('paywall_prime_value');
      return;
    }
    if (step === 'trial_offer') {
      setStep('paywall_prime_reminder');
      return;
    }
    if (step === 'payoff') {
      setStep('trial_offer');
      return;
    }
    if (step === 'first_action') {
      setStep('payoff');
      return;
    }

    const currentIndex = STEP_ORDER.indexOf(step);
    const previous = STEP_ORDER[currentIndex - 1];
    if (previous) {
      setStep(previous);
    }
  };

  const setAnswer = <K extends keyof OnboardingQuestionnaireAnswers>(
    key: K,
    value: OnboardingQuestionnaireAnswers[K]
  ) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSingleAnswer = <K extends keyof OnboardingQuestionnaireAnswers>(
    key: K,
    value: NonNullable<OnboardingQuestionnaireAnswers[K]>
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: prev[key] === value ? undefined : value,
    }));
  };

  const toggleMulti = <T extends string>(
    current: T[] | undefined,
    value: T
  ) => {
    const list = current || [];
    if (list.includes(value)) {
      return list.filter((v) => v !== value);
    }
    return [...list, value];
  };

  const canContinue = (): boolean => {
    switch (step) {
      case 'q1_goal': return !!answers.goal;
      case 'q2_skill': return !!answers.skillLevel;
      case 'q4_flavors': return (answers.flavors || []).length >= 2;
      case 'q3_spirits': return (answers.spirits || []).length >= 1;
      case 'q5_dislikes': return true;
      case 'q6_frequency': return !!answers.frequency;
      case 'q7_alcohol_free': return !!answers.alcoholFree;
      case 'q8_occasions': return true;
      case 'q9_budget': return !!answers.budgetRange;
      case 'q10_bottles': return !!answers.currentBottleCount;
      case 'q11_complexity': return !!answers.complexityPreference;
      case 'q12_goal_30': return !!answers.thirtyDayGoal;
      case 'q13_discovery': return !!answers.heardAboutUs;
      case 'q14_rating': return (answers.appRating || 0) > 0;
      default: return true;
    }
  };

  const persistProfile = async () => {
    if (isSaving) return;
    const requiredMissing =
      !answers.goal ||
      !answers.skillLevel ||
      (answers.flavors || []).length < 2 ||
      (answers.spirits || []).length < 1 ||
      !answers.frequency ||
      !answers.alcoholFree;
    if (requiredMissing) return;

    setIsSaving(true);
    try {
      const dislikesFromText = dislikeText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const mergedDislikes = Array.from(
        new Set([...(answers.dislikes || []), ...dislikesFromText])
      );
      const finalized: OnboardingQuestionnaireAnswers = {
        goal: answers.goal as OnboardingGoal,
        skillLevel: answers.skillLevel as SkillLevel,
        flavors: (answers.flavors || []) as FlavorKey[],
        spirits: (answers.spirits || []) as SpiritKey[],
        dislikes: mergedDislikes,
        frequency: answers.frequency as Frequency,
        alcoholFree: answers.alcoholFree as AlcoholFree,
        occasions: answers.occasions,
        budgetRange: answers.budgetRange,
        currentBottleCount: answers.currentBottleCount,
        complexityPreference: answers.complexityPreference,
        thirtyDayGoal: answers.thirtyDayGoal,
        heardAboutUs: answers.heardAboutUs,
        appRating: answers.appRating,
      };
      if (previewMode) {
        return;
      }
      const learningProfile = buildInitialLearningProfile(finalized);
      await persistOnboardingQuestionnaire(finalized, learningProfile);
      const patch = toPersonalizationPatch(finalized);
      await usePersonalization.getState().updateProfile(patch);
      markProfileComplete();
    } catch (error) {
      log.error('OnboardingQuestionnaireScreen', 'Failed to persist onboarding questionnaire', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartTrial = async () => {
    if (!previewMode && selectedOfferPeriod === 'yearly') {
      useUserTier.getState().startTrial('PLUS', ONBOARDING_TRIAL_DAYS);
      setStartedTrial(true);
    }
    if (selectedOfferPeriod !== 'yearly') {
      setStartedTrial(false);
    }
    await persistProfile();
    setStep('payoff');
  };

  const handleSkipTrial = async () => {
    await persistProfile();
    setStep('payoff');
  };

  // ─── Progress dots ─────────────────────────────────────────────────────────

  const renderProgressDots = (total: number, current: number, label: string) => (
    <View style={styles.progressRow}>
      <Text style={styles.progressLabel}>{label}</Text>
      <View style={styles.dotsRow}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < current && styles.dotDone,
              i === current && styles.dotCurrent,
            ]}
          />
        ))}
      </View>
    </View>
  );

  // ─── Option renderers ──────────────────────────────────────────────────────

  const renderListOption = (
    label: string,
    selected: boolean,
    onPress: () => void,
    sub?: string,
    icon?: string
  ) => (
    <Pressable key={label} onPress={onPress} style={[styles.optionCard, selected && styles.optionCardSelected]}>
      {icon ? (
        <Ionicons
          name={icon as any}
          size={18}
          color={selected ? colors.accent : colors.subtext}
          style={{ marginRight: spacing(1.5) }}
        />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
        {sub ? <Text style={[styles.optionSub, selected && styles.optionSubSelected]}>{sub}</Text> : null}
      </View>
      {selected && (
        <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
      )}
    </Pressable>
  );

  const renderGridPill = (
    label: string,
    emoji: string,
    selected: boolean,
    onPress: () => void
  ) => (
    <Pressable key={label} onPress={onPress} style={[styles.gridPill, selected && styles.gridPillSelected]}>
      <Text style={styles.gridPillEmoji}>{emoji}</Text>
      <Text style={[styles.gridPillLabel, selected && styles.gridPillLabelSelected]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );

  // ─── Question shell ────────────────────────────────────────────────────────

  const renderShell = (
    title: string,
    subtitle: string | undefined,
    content: React.ReactNode,
    extra?: React.ReactNode,
    isOptional?: boolean
  ) => {
    const isOpt = optionalIndex >= 0 || isOptional;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.shellHeader}>
          <View style={styles.shellHeaderMain}>
            {step !== 'q1_goal' ? <HeaderBackButton onPress={goBack} /> : <View style={styles.headerBackSpacer} />}
            {isOpt
              ? renderProgressDots(OPTIONAL_STEPS.length, optionalIndex, 'BONUS')
              : renderProgressDots(REQUIRED_STEPS.length, requiredIndex, 'REQUIRED')}
          </View>
          {isOpt && (
            <Pressable onPress={goToPaywallFlow} style={styles.skipLink}>
              <Text style={styles.skipLinkText}>Skip</Text>
              <Ionicons name="arrow-forward" size={13} color={colors.accent} />
            </Pressable>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {previewMode ? <PreviewModeBanner /> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.optionsWrap}>{content}</View>
          {extra}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.primaryButton, !canContinue() && styles.buttonDisabled]}
            disabled={!canContinue()}
            onPress={goNext}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color="#1A120D" style={{ marginLeft: 6 }} />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  };

  // ─── Steps ─────────────────────────────────────────────────────────────────

  if (step === 'q1_goal') {
    return renderShell(
      'What brings you to KŌOPE?',
      undefined,
      GOAL_OPTIONS.map((opt) =>
        renderListOption(
          opt.label,
          answers.goal === opt.value,
          () => toggleSingleAnswer('goal', opt.value),
          undefined,
          opt.icon
        )
      )
    );
  }

  if (step === 'q2_skill') {
    return renderShell(
      'Your current skill level?',
      undefined,
      SKILL_OPTIONS.map((opt) =>
        renderListOption(
          opt.label,
          answers.skillLevel === opt.value,
          () => toggleSingleAnswer('skillLevel', opt.value),
          opt.sub
        )
      )
    );
  }

  if (step === 'q4_flavors') {
    return renderShell(
      'Which flavors do you prefer?',
      'Select at least 2',
      <View style={styles.gridWrap}>
        {FLAVOR_OPTIONS.map((opt) =>
          renderGridPill(
            opt.label,
            opt.emoji,
            (answers.flavors || []).includes(opt.value),
            () => setAnswer('flavors', toggleMulti(answers.flavors, opt.value) as FlavorKey[])
          )
        )}
      </View>,
      (answers.flavors || []).length >= 2 ? (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Great taste — you might love</Text>
          <View style={styles.cocktailChipRow}>
            {inferredFlavorPreview.map((name) => (
              <View key={name} style={styles.cocktailChip}>
                <Text style={styles.cocktailChipText}>{name}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null
    );
  }

  if (step === 'q3_spirits') {
    return renderShell(
      'Which base spirits do you enjoy?',
      'Select at least 1',
      <View style={styles.gridWrap}>
        {SPIRIT_OPTIONS.map((opt) =>
          renderGridPill(
            opt.label,
            opt.emoji,
            (answers.spirits || []).includes(opt.value),
            () => setAnswer('spirits', toggleMulti(answers.spirits, opt.value) as SpiritKey[])
          )
        )}
      </View>
    );
  }

  if (step === 'q5_dislikes') {
    return renderShell(
      'Any ingredients you dislike or avoid?',
      'Optional — helps us filter recommendations',
      <>
        {DISLIKE_OPTIONS.map((label) =>
          renderListOption(
            label,
            (answers.dislikes || []).includes(label),
            () => setAnswer('dislikes', toggleMulti(answers.dislikes, label) as string[])
          )
        )}
        <TextInput
          style={styles.input}
          placeholder="Any others? (comma-separated)"
          placeholderTextColor={colors.subtext}
          value={dislikeText}
          onChangeText={setDislikeText}
        />
      </>
    );
  }

  if (step === 'q6_frequency') {
    return renderShell(
      'How often do you make cocktails?',
      undefined,
      FREQUENCY_OPTIONS.map((opt) =>
        renderListOption(
          opt.label,
          answers.frequency === opt.value,
          () => toggleSingleAnswer('frequency', opt.value),
          opt.sub
        )
      )
    );
  }

  if (step === 'q7_alcohol_free') {
    return renderShell(
      'Include alcohol-free options?',
      undefined,
      ALCOHOL_FREE_OPTIONS.map((opt) =>
        renderListOption(
          opt.label,
          answers.alcoholFree === opt.value,
          () => toggleSingleAnswer('alcoholFree', opt.value),
          opt.sub
        )
      )
    );
  }

  if (step === 'optional_gate') {
    return (
      <GateScreen
        onBack={goBack}
        onYes={() => { setOptionalEnabled(true); setStep('q8_occasions'); }}
        onSkip={goToPaywallFlow}
      />
    );
  }

  if (step === 'q8_occasions') {
    return renderShell(
      'What is your typical drinking occasion?',
      'Select all that apply',
      <>
        {OCCASION_OPTIONS.map((label) =>
          renderListOption(
            label,
            (answers.occasions || []).includes(label),
            () => setAnswer('occasions', toggleMulti(answers.occasions, label) as string[])
          )
        )}
      </>
    );
  }

  if (step === 'q9_budget') {
    return renderShell(
      'Budget comfort per bottle?',
      undefined,
      BUDGET_OPTIONS.map((opt) =>
        renderListOption(
          opt.label,
          answers.budgetRange === opt.value,
          () => toggleSingleAnswer('budgetRange', opt.value),
          opt.sub
        )
      )
    );
  }

  if (step === 'q10_bottles') {
    return renderShell(
      'How many bottles do you currently own?',
      undefined,
      BOTTLE_OPTIONS.map((opt) =>
        renderListOption(
          opt.label,
          answers.currentBottleCount === opt.value,
          () => toggleSingleAnswer('currentBottleCount', opt.value),
          opt.sub
        )
      )
    );
  }

  if (step === 'q11_complexity') {
    return renderShell(
      'Preferred drink complexity?',
      undefined,
      COMPLEXITY_OPTIONS.map((opt) =>
        renderListOption(
          opt.label,
          answers.complexityPreference === opt.value,
          () => toggleSingleAnswer('complexityPreference', opt.value),
          opt.sub
        )
      )
    );
  }

  if (step === 'q12_goal_30') {
    return renderShell(
      "Your main goal in the next 30 days?",
      undefined,
      GOAL_30_OPTIONS.map((label) =>
        renderListOption(
          label,
          answers.thirtyDayGoal === label,
          () => toggleSingleAnswer('thirtyDayGoal', label)
        )
      )
    );
  }

  if (step === 'q13_discovery') {
    return renderShell(
      'Where did you hear about us?',
      'This helps us understand what is working.',
      DISCOVERY_OPTIONS.map((opt) =>
        renderListOption(
          opt.label,
          answers.heardAboutUs === opt.value,
          () => toggleSingleAnswer('heardAboutUs', opt.value),
          undefined,
          opt.icon
        )
      )
    );
  }

  if (step === 'q14_rating') {
    return renderShell(
      'How would you rate KOOPE so far?',
      'Your feedback helps us improve before we show your plan options.',
      <View style={styles.ratingCard}>
        <Text style={styles.ratingCardTitle}>
          {answers.appRating && answers.appRating >= 4 ? 'Love that. We are building this for people like you.' : 'A quick rating before your personalized unlock.'}
        </Text>
        <RatingStars
          value={answers.appRating || 0}
          onChange={(value) => setAnswer('appRating', value)}
        />
        <Text style={styles.ratingCardHint}>
          {(answers.appRating || 0) > 0
            ? `${answers.appRating}/5 selected`
            : 'Tap a star to rate your experience'}
        </Text>
      </View>
    );
  }

  if (step === 'paywall_prime_value') {
    return (
      <PaywallPrimerScreen
        onBack={goBack}
        onContinue={() => setStep('paywall_prime_reminder')}
        onSkip={handleSkipTrial}
        title={`Start your ${ONBOARDING_TRIAL_DAYS}-day free trial.`}
        subtitle="Full KOOPE+ access to scan bottles, recipe cards, and ingredients."
        footer={`${ONBOARDING_TRIAL_DAYS} days free, then ${ONBOARDING_YEARLY_PRICE}/year (${ONBOARDING_YEARLY_PER_MONTH}/mo).`}
        cta="Continue to Trial"
        secondaryCta="Skip to Free Version"
        variant="value"
        previewMode={previewMode}
      />
    );
  }

  if (step === 'paywall_prime_reminder') {
    return (
      <PaywallPrimerScreen
        onBack={goBack}
        onContinue={() => setStep('trial_offer')}
        onSkip={handleSkipTrial}
        title={`Reminder before your ${ONBOARDING_TRIAL_DAYS}-day trial ends.`}
        subtitle="We will send one heads-up before billing starts if you keep KOOPE+."
        footer={`${ONBOARDING_TRIAL_DAYS} days free, then ${ONBOARDING_YEARLY_PRICE}/year (${ONBOARDING_YEARLY_PER_MONTH}/mo).`}
        cta="Continue to Trial"
        secondaryCta="Skip to Free Version"
        variant="reminder"
        previewMode={previewMode}
      />
    );
  }

  if (step === 'trial_offer') {
    const goal = (answers.goal || 'make_better_drinks') as OnboardingGoal;
    const benefits = getTrialBenefits(goal);
    const headline = getTrialHeadline(goal);
    const rating = answers.appRating || 0;
    const ratingLabel =
      rating >= 5 ? 'Rated 5/5 by you just now' :
      rating >= 4 ? 'You are already seeing the value' :
      'Your best experience unlocks with premium tools';

    return (
      <SafeAreaView style={styles.paywallScreen}>
        <View style={styles.paywallTopBar}>
          <HeaderBackButton onPress={goBack} />
          <Pressable disabled>
            <Text style={styles.paywallRestoreText}>Restore</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.paywallScrollContent} showsVerticalScrollIndicator={false}>
          {previewMode ? <PreviewModeBanner /> : null}

          <View style={styles.paywallHeadlineWrap}>
            <Text style={styles.paywallHeadline}>{headline}</Text>
            <Text style={styles.paywallSubheadline}>
              {selectedOfferPeriod === 'yearly'
                ? `Start your ${ONBOARDING_TRIAL_DAYS}-day free trial to continue with your personalized bartending path.`
                : 'Choose monthly to unlock your personalized bartending path without a yearly commitment.'}
            </Text>
          </View>

          <View style={styles.timelineCard}>
            <View style={styles.timelineRow}>
              <View style={[styles.timelineDot, styles.timelineDotActive]}>
                <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Today</Text>
                <Text style={styles.timelineBody}>Unlock smart scanning, tailored recipes, and your full bar plan instantly.</Text>
              </View>
            </View>

            <View style={styles.timelineLine} />

            <View style={styles.timelineRow}>
              <View style={[styles.timelineDot, styles.timelineDotWarm]}>
                <Ionicons name="notifications" size={14} color="#FFFFFF" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>In 6 Days</Text>
                <Text style={styles.timelineBody}>We will send a reminder before your 7-day trial ends.</Text>
              </View>
            </View>

            <View style={styles.timelineLineMuted} />

            <View style={styles.timelineRow}>
              <View style={[styles.timelineDot, styles.timelineDotMuted]}>
                <Ionicons name="card-outline" size={14} color="#FFFFFF" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>In 7 Days</Text>
                <Text style={styles.timelineBody}>Billing starts only if you choose to keep premium access.</Text>
              </View>
            </View>
          </View>

          <Pressable style={styles.offerFoundersCard} onPress={() => setShowFoundersPricing((prev) => !prev)}>
            <View style={styles.offerFoundersRow}>
              <View style={styles.offerFoundersHeader}>
                <Text style={styles.offerFoundersEyebrow}>Founders pricing</Text>
                <Text style={styles.offerFoundersTitle}>Early-member rate for the first 300 people</Text>
                <Text style={styles.offerFoundersSummary}>
                  {showFoundersPricing
                    ? `Founders ${ONBOARDING_YEARLY_PRICE}/year • Regular ${ONBOARDING_YEARLY_REGULAR_PRICE}/year`
                    : `Tap to view founders pricing details`}
                </Text>
              </View>
              <Ionicons
                name={showFoundersPricing ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#7B5D2E"
              />
            </View>
            {showFoundersPricing ? (
              <View style={styles.offerFoundersExpanded}>
                <Text style={styles.offerFoundersBody}>
                  Start with a {ONBOARDING_TRIAL_DAYS}-day free trial, then keep your founders rate of {ONBOARDING_YEARLY_PRICE}/year ({ONBOARDING_YEARLY_PER_MONTH}/mo).
                </Text>
                <Text style={styles.offerFoundersMeta}>
                  Regular price returns to {ONBOARDING_YEARLY_REGULAR_PRICE}/year ({ONBOARDING_YEARLY_REGULAR_PER_MONTH}/mo) after the founders window closes.
                </Text>
              </View>
            ) : null}
          </Pressable>

          <View style={styles.planChoiceRow}>
            <Pressable
              style={[styles.offerPlanCard, selectedOfferPeriod === 'monthly' && styles.offerPlanCardSelected]}
              onPress={() => setSelectedOfferPeriod('monthly')}
            >
              <Text style={styles.offerPlanTitle}>Monthly</Text>
              <Text style={styles.offerPlanPrice}>{ONBOARDING_MONTHLY_PRICE}/mo</Text>
              <Text style={styles.offerPlanCaption}>Regular monthly price</Text>
            </Pressable>

            <Pressable
              style={[styles.offerPlanCard, selectedOfferPeriod === 'yearly' && styles.offerPlanCardSelectedStrong]}
              onPress={() => setSelectedOfferPeriod('yearly')}
            >
              <Text style={styles.offerPlanTitle}>Yearly</Text>
              <Text style={styles.offerPlanPrice}>{ONBOARDING_YEARLY_PER_MONTH}/mo</Text>
              <Text style={styles.offerPlanCaption}>Founders price • billed annually</Text>
            </Pressable>
          </View>

          <View style={styles.paywallMiniProof}>
            <Ionicons name="star" size={14} color="#111111" />
            <Text style={styles.paywallMiniProofText}>{ratingLabel}</Text>
          </View>

          <View style={styles.benefitsCard}>
            {benefits.slice(0, 5).map((benefit) => (
              <View key={benefit} style={styles.benefitRow}>
                <View style={styles.benefitCheckRing}>
                  <Ionicons name="checkmark" size={11} color={colors.accent} />
                </View>
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.paywallStickyFooter}>
          <View style={styles.paywallCaptionRow}>
            <Ionicons name="checkmark" size={18} color="#111111" />
            <Text style={styles.paywallCaptionText}>
              {selectedOfferPeriod === 'yearly' ? 'No payment due now' : 'Switch anytime from settings'}
            </Text>
          </View>
          <Pressable style={styles.paywallPrimaryButton} onPress={handleStartTrial}>
            <Text style={styles.paywallPrimaryButtonText}>
              {selectedOfferPeriod === 'yearly' ? `Start My ${ONBOARDING_TRIAL_DAYS}-Day Free Trial` : 'Continue with Monthly'}
            </Text>
          </Pressable>
          <Text style={styles.paywallFooterText}>
            {selectedOfferPeriod === 'yearly'
              ? `${ONBOARDING_TRIAL_DAYS} days free, then founders ${ONBOARDING_YEARLY_PRICE}/year (${ONBOARDING_YEARLY_PER_MONTH}/mo). Regularly ${ONBOARDING_YEARLY_REGULAR_PRICE}/year (${ONBOARDING_YEARLY_REGULAR_PER_MONTH}/mo).`
              : `${ONBOARDING_MONTHLY_PRICE} billed monthly after checkout`}
          </Text>
          <Pressable style={styles.paywallSecondaryAction} onPress={handleSkipTrial}>
            <Text style={styles.paywallSecondaryActionText}>Use free plan instead</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'payoff') {
    const finalized = answers as OnboardingQuestionnaireAnswers;
    const recipeMatches = estimateRecipeMatchCount(finalized);
    const goalLabel = GOAL_OPTIONS.find((option) => option.value === finalized.goal)?.label || 'Personalized bartending';
    const spiritLabel = SPIRIT_OPTIONS.find((option) => option.value === finalized.spirits?.[0])?.label || 'Your bar';
    const flavorLabel = FLAVOR_OPTIONS.find((option) => option.value === finalized.flavors?.[0])?.label || 'Your taste';
    return (
      <PayoffScreen
        recipeMatches={recipeMatches}
        startedTrial={startedTrial}
        onBack={goBack}
        previewMode={previewMode}
        goalLabel={goalLabel}
        spiritLabel={spiritLabel}
        flavorLabel={flavorLabel}
        onNext={() => setStep('first_action')}
      />
    );
  }

  // first_action
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerWrap}>
        <View style={styles.standaloneTopRow}>
          <HeaderBackButton onPress={goBack} />
        </View>
        {previewMode ? <PreviewModeBanner /> : null}
        <View style={styles.cameraRing}>
          <View style={styles.cameraInner}>
            <Ionicons name="camera" size={36} color={colors.accent} />
          </View>
        </View>
        <Text style={[styles.title, { textAlign: 'center' }]}>Scan your first bottle</Text>
        <Text style={[styles.subtitle, { textAlign: 'center' }]}>
          Open the camera to instantly identify and log any spirit.
        </Text>
        <Pressable
          style={[styles.primaryButton, { width: '100%' }, isSaving && styles.buttonDisabled]}
          disabled={isSaving}
          onPress={() => onComplete('scan')}
        >
          <Ionicons name="camera" size={16} color="#1A120D" style={{ marginRight: 6 }} />
          <Text style={styles.primaryButtonText}>Open Camera to Scan</Text>
        </Pressable>
        {previewMode && onViewMasteryLessons ? (
          <Pressable
            style={[styles.secondaryButton, { width: '100%' }, isSaving && styles.buttonDisabled]}
            disabled={isSaving}
            onPress={onViewMasteryLessons}
          >
            <Ionicons name="school-outline" size={16} color={colors.text} style={{ marginRight: 6 }} />
            <Text style={styles.secondaryButtonText}>Preview Mastery Lessons</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.ghostButton, isSaving && styles.buttonDisabled]}
          disabled={isSaving}
          onPress={() => onComplete('skip')}
        >
          <Text style={styles.ghostButtonText}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Shell
  shellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingTop: spacing(1.5),
    paddingBottom: spacing(1),
  },
  shellHeaderMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    flex: 1,
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing(0.5),
    paddingRight: spacing(0.5),
  },
  headerBackText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  headerBackSpacer: {
    width: 52,
  },
  progressRow: {
    gap: spacing(0.75),
  },
  progressLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: colors.subtext,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 20,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dotDone: {
    backgroundColor: colors.accent,
  },
  dotCurrent: {
    backgroundColor: colors.accent + '55',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  skipLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: spacing(0.5),
  },
  skipLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  scrollContent: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
    paddingBottom: spacing(8),
  },
  footer: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },

  // Typography
  title: {
    fontFamily: serif,
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 34,
    marginBottom: spacing(1),
  },
  subtitle: {
    fontSize: 15,
    color: colors.subtext,
    lineHeight: 22,
    marginBottom: spacing(2),
  },

  // Option cards
  optionsWrap: {
    gap: spacing(1),
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    borderRadius: radii.md,
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(2),
  },
  optionCardSelected: {
    borderColor: colors.accent + '35',
    borderLeftColor: colors.accent,
    backgroundColor: colors.accent + '0E',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
  },
  optionLabelSelected: {
    color: colors.accent,
  },
  optionSub: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2,
  },
  optionSubSelected: {
    color: colors.accent + 'AA',
  },

  // Grid pills (flavors + spirits)
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
  },
  gridPill: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    borderRadius: radii.md,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1.5),
  },
  gridPillSelected: {
    borderColor: colors.accent + '35',
    borderLeftColor: colors.accent,
    backgroundColor: colors.accent + '0E',
  },
  gridPillEmoji: {
    fontSize: 20,
  },
  gridPillLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 17,
  },
  gridPillLabelSelected: {
    color: colors.accent,
  },

  // Flavor preview card
  previewCard: {
    marginTop: spacing(2),
    backgroundColor: '#201510',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent + '30',
    borderLeftWidth: 3,
    borderLeftColor: colors.accent + '60',
    padding: spacing(2),
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing(1.25),
  },
  cocktailChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cocktailChip: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.accent + '18',
    borderWidth: 1,
    borderColor: colors.accent + '35',
  },
  cocktailChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },

  // Dislike text input
  input: {
    marginTop: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    color: colors.text,
    backgroundColor: colors.card,
    fontSize: 14,
  },

  ratingCard: {
    backgroundColor: '#201510',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent + '30',
    padding: spacing(2.25),
    alignItems: 'center',
    gap: spacing(2),
  },
  ratingCardTitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  ratingStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(1),
  },
  ratingStarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.accent + '35',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingStarButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  ratingCardHint: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '600',
  },

  paywallScreen: {
    flex: 1,
    backgroundColor: '#FCFBF8',
  },
  paywallTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
    paddingBottom: spacing(1),
  },
  paywallRestoreText: {
    color: '#B7B1A8',
    fontSize: 16,
    fontWeight: '600',
  },
  paywallScrollContent: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(1),
    paddingBottom: spacing(4),
  },
  paywallHeadlineWrap: {
    alignItems: 'center',
    marginTop: spacing(2),
    marginBottom: spacing(3),
  },
  paywallHeadline: {
    fontFamily: serif,
    fontSize: 31,
    lineHeight: 38,
    color: '#111111',
    textAlign: 'center',
    fontWeight: '900',
    marginBottom: spacing(1),
  },
  paywallSubheadline: {
    fontSize: 16,
    lineHeight: 23,
    color: '#6D675F',
    textAlign: 'center',
    maxWidth: 320,
  },
  paywallVisualWrap: {
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  valueIntroPill: {
    backgroundColor: '#2B1F17',
    borderRadius: 999,
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1),
    marginBottom: spacing(1.5),
  },
  valueIntroPillText: {
    color: '#F7ECDD',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  phoneMock: {
    width: 240,
    height: 430,
    borderRadius: 32,
    backgroundColor: '#0F0F0F',
    padding: 12,
    marginBottom: spacing(2),
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 30,
    elevation: 12,
  },
  phoneNotch: {
    position: 'absolute',
    top: 10,
    left: '30%',
    width: 96,
    height: 18,
    borderRadius: 10,
    backgroundColor: '#0A0A0A',
    zIndex: 2,
  },
  phoneViewport: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#4B372C',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockScanGlow: {
    position: 'absolute',
    width: 158,
    height: 158,
    borderRadius: 79,
    backgroundColor: 'rgba(243, 182, 72, 0.18)',
    top: 118,
  },
  mockFrameCornerTopLeft: {
    position: 'absolute',
    top: 70,
    left: 22,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#FFFFFF',
    borderTopLeftRadius: 8,
  },
  mockFrameCornerTopRight: {
    position: 'absolute',
    top: 70,
    right: 22,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#FFFFFF',
    borderTopRightRadius: 8,
  },
  mockFrameCornerBottomLeft: {
    position: 'absolute',
    bottom: 110,
    left: 22,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#FFFFFF',
    borderBottomLeftRadius: 8,
  },
  mockFrameCornerBottomRight: {
    position: 'absolute',
    bottom: 110,
    right: 22,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#FFFFFF',
    borderBottomRightRadius: 8,
  },
  mockPlate: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 6,
  },
  mockBottleWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockBottleBody: {
    width: 52,
    height: 92,
    borderRadius: 16,
    backgroundColor: '#7C4727',
    borderWidth: 2,
    borderColor: '#B98558',
  },
  mockBottleNeck: {
    position: 'absolute',
    top: -14,
    width: 18,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#A96B3F',
  },
  mockBottleLabelBand: {
    position: 'absolute',
    top: 30,
    width: 38,
    height: 26,
    borderRadius: 10,
    backgroundColor: '#F3E5C9',
  },
  mockBottleCap: {
    position: 'absolute',
    top: -24,
    width: 16,
    height: 12,
    borderRadius: 5,
    backgroundColor: '#E0A24A',
  },
  mockMenuCard: {
    position: 'absolute',
    width: 112,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F6EDE1',
    borderWidth: 1,
    borderColor: '#E2D4C4',
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 5,
  },
  mockMenuThumb: {
    width: '100%',
    height: 46,
    borderRadius: 10,
    backgroundColor: '#D9A15D',
  },
  mockMenuLineLong: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3E2B20',
  },
  mockMenuLineShort: {
    width: '72%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A88C74',
  },
  mockMenuChip: {
    marginTop: 2,
    width: 46,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2B1F17',
  },
  mockIngredientsCard: {
    position: 'absolute',
    width: 118,
    height: 118,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockIngredientBoard: {
    position: 'absolute',
    width: 102,
    height: 102,
    borderRadius: 22,
    backgroundColor: '#F1E2CB',
    borderWidth: 1,
    borderColor: '#DFC8A7',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 5,
  },
  mockIngredientBottle: {
    position: 'absolute',
    width: 22,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#A35E2E',
    top: 20,
    left: 14,
    borderWidth: 1,
    borderColor: '#7A411E',
  },
  mockIngredientCitrus: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0C24B',
    right: 18,
    top: 22,
    borderWidth: 2,
    borderColor: '#FFE3A1',
  },
  mockIngredientHerb: {
    position: 'absolute',
    width: 36,
    height: 14,
    borderRadius: 8,
    backgroundColor: '#7FA15A',
    bottom: 20,
    left: 16,
    transform: [{ rotate: '-18deg' }],
  },
  mockIngredientIce: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#DCE7EF',
    right: 18,
    bottom: 18,
    borderWidth: 1,
    borderColor: '#BDD0DC',
  },
  mockIngredientJar: {
    position: 'absolute',
    width: 22,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F3E5C9',
    borderWidth: 1,
    borderColor: '#D6BFA5',
    top: 46,
    right: 34,
  },
  mockIngredientBerry: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#B23A48',
    bottom: 28,
    right: 38,
  },
  mockGlass: {
    position: 'absolute',
    top: 96,
    right: 42,
    width: 20,
    height: 58,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  mockControlBar: {
    position: 'absolute',
    bottom: 26,
    alignSelf: 'center',
    backgroundColor: '#F8F1E8',
    borderRadius: 999,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderWidth: 1,
    borderColor: '#E5D8C6',
  },
  mockControlText: {
    color: '#1A120D',
    fontSize: 11,
    fontWeight: '700',
  },
  mockDetectedRow: {
    position: 'absolute',
    top: 34,
    alignSelf: 'center',
    width: 160,
    height: 26,
  },
  mockDetectedChip: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3B648',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mockDetectedText: {
    color: '#1A120D',
    fontSize: 11,
    fontWeight: '800',
  },
  reminderVisualWrap: {
    alignItems: 'center',
    marginBottom: spacing(4),
  },
  reminderTrustCard: {
    width: '100%',
    backgroundColor: '#FFF7EC',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E9D8BE',
    paddingHorizontal: spacing(2.25),
    paddingVertical: spacing(2.25),
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  reminderBellCard: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: '#2B1F17',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
  },
  reminderBadge: {
    position: 'absolute',
    top: 54,
    right: 46,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E33C2F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FCFBF8',
  },
  reminderBadgeText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  reminderTrustBody: {
    alignItems: 'center',
    gap: spacing(1),
  },
  reminderTrustTitle: {
    color: '#1A120D',
    fontFamily: serif,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  reminderTrustText: {
    color: '#6A6057',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  reminderTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3E5CC',
    borderRadius: 999,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
  },
  reminderTrustMeta: {
    color: '#3A2A1F',
    fontSize: 12,
    fontWeight: '700',
  },
  paywallCaptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  paywallCaptionText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ECE5DA',
    padding: spacing(2.5),
    marginBottom: spacing(3),
  },
  timelineRow: {
    flexDirection: 'row',
    gap: spacing(1.5),
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  timelineDotActive: {
    backgroundColor: '#F5A524',
  },
  timelineDotWarm: {
    backgroundColor: '#FFB648',
  },
  timelineDotMuted: {
    backgroundColor: '#151515',
  },
  timelineLine: {
    width: 4,
    height: 30,
    backgroundColor: '#FFCD73',
    marginLeft: 14,
    marginVertical: 6,
    borderRadius: 2,
  },
  timelineLineMuted: {
    width: 4,
    height: 30,
    backgroundColor: '#A2A2A2',
    marginLeft: 14,
    marginVertical: 6,
    borderRadius: 2,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  timelineBody: {
    color: '#8D857C',
    fontSize: 14,
    lineHeight: 20,
  },
  planChoiceRow: {
    flexDirection: 'row',
    gap: spacing(1.5),
    marginBottom: spacing(2),
  },
  offerFoundersCard: {
    backgroundColor: '#FFF7E8',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F0D39B',
    padding: spacing(2),
    marginBottom: spacing(2),
  },
  offerFoundersRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing(1.5),
  },
  offerFoundersHeader: {
    gap: 4,
    flex: 1,
  },
  offerFoundersEyebrow: {
    color: '#A56400',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  offerFoundersTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  offerFoundersSummary: {
    color: '#8A735A',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  offerFoundersExpanded: {
    gap: spacing(0.75),
    marginTop: spacing(1.25),
    paddingTop: spacing(1.25),
    borderTopWidth: 1,
    borderTopColor: '#F0D39B',
  },
  offerFoundersBody: {
    color: '#3A2A1B',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  offerFoundersMeta: {
    color: '#8A735A',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  offerPlanCard: {
    flex: 1,
    minHeight: 118,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#D9D3C8',
    backgroundColor: '#FFFFFF',
    padding: spacing(2),
    justifyContent: 'center',
  },
  offerPlanCardSelected: {
    borderColor: '#2B1F17',
  },
  offerPlanCardSelectedStrong: {
    borderColor: '#111111',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  offerPlanTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  offerPlanPrice: {
    color: '#111111',
    fontSize: 24,
    fontWeight: '900',
  },
  offerPlanCaption: {
    color: '#8D857C',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  paywallMiniProof: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: '#FFE6A8',
    borderRadius: 999,
    paddingHorizontal: spacing(1.5),
    paddingVertical: 8,
    marginBottom: spacing(2),
  },
  paywallMiniProofText: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '700',
  },
  paywallStickyFooter: {
    borderTopWidth: 1,
    borderTopColor: '#ECE5DA',
    backgroundColor: '#FCFBF8',
    paddingHorizontal: spacing(3),
    paddingTop: spacing(1.5),
    paddingBottom: spacing(2.5),
    gap: spacing(1),
  },
  paywallPrimaryButton: {
    backgroundColor: '#111111',
    borderRadius: 18,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paywallPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  paywallFooterText: {
    color: '#9E978D',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  paywallSecondaryAction: {
    alignSelf: 'center',
    paddingVertical: spacing(0.5),
  },
  paywallSecondaryActionText: {
    color: '#7A736A',
    fontSize: 14,
    fontWeight: '700',
  },

  // Buttons
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: 52,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#1A120D',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    height: 52,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  ghostButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ghostButtonText: {
    color: colors.subtext,
    fontSize: 15,
    fontWeight: '700',
  },
  ghostLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: spacing(1.5),
  },
  ghostLinkText: {
    color: colors.subtext,
    fontSize: 14,
    fontWeight: '700',
  },

  // Center layout (gate, payoff, first action)
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(4),
    gap: spacing(2),
    alignItems: 'center',
  },
  standaloneTopRow: {
    width: '100%',
    alignItems: 'flex-start',
  },
  previewBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: 'rgba(214, 138, 56, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(214, 138, 56, 0.35)',
    borderRadius: radii.md,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
    marginBottom: spacing(1),
  },
  previewBannerText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },

  // Gate screen
  gateRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: colors.accent + '50',
    backgroundColor: colors.accent + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(1),
  },
  gateEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.success,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  gateActions: {
    width: '100%',
    maxWidth: 360,
    gap: spacing(1.5),
    marginTop: spacing(1),
  },
  gatePrimaryButton: {
    width: '100%',
    height: 56,
  },
  gateSecondaryButton: {
    width: '100%',
    height: 52,
  },

  // Trial offer
  trialIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: colors.accent + '45',
    backgroundColor: colors.accent + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(1),
  },
  trialIconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitsCard: {
    width: '100%',
    backgroundColor: '#201510',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent + '55',
    padding: spacing(2),
    gap: spacing(1.5),
    marginBottom: spacing(1),
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.25),
  },
  benefitCheckRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent + '18',
    borderWidth: 1,
    borderColor: colors.accent + '40',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 19,
  },
  trialButton: {
    width: '100%',
  },

  // Payoff
  payoffRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: colors.accent + '50',
    backgroundColor: colors.accent + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(1),
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing(1.5),
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#201510',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: serif,
    fontSize: 24,
    fontWeight: '900',
    color: colors.accent,
    lineHeight: 28,
  },
  statValueSmall: {
    fontFamily: serif,
    fontSize: 18,
    fontWeight: '800',
    color: colors.accent,
    lineHeight: 24,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.subtext,
    fontWeight: '600',
    textAlign: 'center',
  },
  profileSummaryCard: {
    width: '100%',
    backgroundColor: '#201510',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
    gap: spacing(1.25),
  },
  profileSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  profileSummaryText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    fontWeight: '600',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
    borderRadius: radii.pill,
    backgroundColor: colors.accent + '16',
    borderWidth: 1,
    borderColor: colors.accent + '35',
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.3,
  },

  // First action
  cameraRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: colors.accent + '45',
    backgroundColor: colors.accent + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(1),
  },
  cameraInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
