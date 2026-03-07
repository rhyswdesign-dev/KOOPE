import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { colors, spacing, radii, serif } from '../../theme/tokens';
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
  | 'trial_offer'
  | 'payoff'
  | 'first_action';

type CompleteAction = 'scan' | 'skip';

interface Props {
  onComplete: (action: CompleteAction) => void;
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

const GOAL_OPTIONS: Array<{ value: OnboardingGoal; label: string }> = [
  { value: 'learn_bartending', label: 'Learn bartending' },
  { value: 'make_better_drinks', label: 'Make better drinks at home' },
  { value: 'host_parties', label: 'Host parties & events' },
  { value: 'track_inventory', label: 'Track my bar inventory' },
  { value: 'explore_spirits', label: 'Explore & discover new spirits' },
];

const SKILL_OPTIONS: Array<{ value: SkillLevel; label: string }> = [
  { value: 'beginner', label: "Beginner (I'm just starting)" },
  { value: 'intermediate', label: 'Intermediate (I make drinks regularly)' },
  { value: 'advanced', label: 'Advanced (I know techniques & theory)' },
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
  { value: 'bourbon', label: 'Bourbon/Whiskey', emoji: '🥃' },
  { value: 'scotch', label: 'Scotch', emoji: '🏴' },
  { value: 'rye', label: 'Rye', emoji: '🌾' },
  { value: 'brandy', label: 'Brandy/Cognac', emoji: '🍇' },
  { value: 'explore', label: 'Not sure yet / Explore', emoji: '🤷' },
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

const FREQUENCY_OPTIONS: Array<{ value: Frequency; label: string }> = [
  { value: 'rare', label: 'Rarely (< 1 per week)' },
  { value: 'casual', label: 'Casually (1-2 per week)' },
  { value: 'regular', label: 'Regularly (3-5 per week)' },
  { value: 'daily', label: 'Daily or near-daily' },
];

const ALCOHOL_FREE_OPTIONS: Array<{ value: AlcoholFree; label: string }> = [
  { value: 'yes', label: 'Yes, show mocktails too' },
  { value: 'no', label: 'No, only alcoholic cocktails' },
  { value: 'both', label: 'Both (I like variety)' },
];

const OCCASION_OPTIONS = [
  'Solo relaxation',
  'Date night',
  'Small gathering (2-4)',
  'Parties (5+)',
  'Before/after dinner',
  'Special celebrations',
];

const BUDGET_OPTIONS: Array<{ value: BudgetRange; label: string }> = [
  { value: 'budget', label: 'Budget-conscious (< $25)' },
  { value: 'mid', label: 'Mid-range ($25-50)' },
  { value: 'premium', label: 'Premium ($50-100)' },
  { value: 'luxury', label: 'Luxury (> $100)' },
  { value: 'varies', label: 'It varies / no preference' },
];

const BOTTLE_OPTIONS: Array<{ value: BottleCountRange; label: string }> = [
  { value: 'none', label: "None yet (I'm just starting)" },
  { value: '1_5', label: '1-5 bottles' },
  { value: '6_15', label: '6-15 bottles' },
  { value: '16_30', label: '16-30 bottles' },
  { value: '30_plus', label: '30+ bottles' },
];

const COMPLEXITY_OPTIONS: Array<{ value: ComplexityPreference; label: string }> = [
  { value: 'simple', label: 'Simple & quick (2-4 ingredients)' },
  { value: 'moderate', label: 'Moderate (5-7 ingredients)' },
  { value: 'advanced', label: 'Advanced (I love the craft)' },
  { value: 'variety', label: 'Variety / depends on mood' },
];

const GOAL_30_OPTIONS = [
  'Build a core home bar',
  'Master classic cocktails',
  'Improve my bartending speed',
  'Host confidently',
  'Discover new spirits & expand my palate',
];

const STEP_ORDER: Step[] = [
  ...REQUIRED_STEPS,
  'optional_gate',
  ...OPTIONAL_STEPS,
  'trial_offer',
  'payoff',
  'first_action',
];

export default function OnboardingQuestionnaireScreen({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('q1_goal');
  const [optionalEnabled, setOptionalEnabled] = useState(false);
  const [startedTrial, setStartedTrial] = useState(false);
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
      setStep('trial_offer');
      return;
    }
    setStep(next);
  };

  const goToTrial = () => {
    setOptionalEnabled(false);
    setStep('trial_offer');
  };

  const setAnswer = <K extends keyof OnboardingQuestionnaireAnswers>(
    key: K,
    value: OnboardingQuestionnaireAnswers[K]
  ) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMulti = <T extends string>(
    current: T[] | undefined,
    value: T,
    minRequired: number = 0
  ) => {
    const list = current || [];
    if (list.includes(value)) {
      if (list.length <= minRequired) return list;
      return list.filter((v) => v !== value);
    }
    return [...list, value];
  };

  const canContinue = (): boolean => {
    switch (step) {
      case 'q1_goal':
        return !!answers.goal;
      case 'q2_skill':
        return !!answers.skillLevel;
      case 'q4_flavors':
        return (answers.flavors || []).length >= 2;
      case 'q3_spirits':
        return (answers.spirits || []).length >= 1;
      case 'q5_dislikes':
        return true;
      case 'q6_frequency':
        return !!answers.frequency;
      case 'q7_alcohol_free':
        return !!answers.alcoholFree;
      case 'q8_occasions':
        return true;
      case 'q9_budget':
        return !!answers.budgetRange;
      case 'q10_bottles':
        return !!answers.currentBottleCount;
      case 'q11_complexity':
        return !!answers.complexityPreference;
      case 'q12_goal_30':
        return !!answers.thirtyDayGoal;
      default:
        return true;
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
      };

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
    useUserTier.getState().startTrial('PLUS', 7);
    setStartedTrial(true);
    await persistProfile();
    setStep('payoff');
  };

  const handleSkipTrial = async () => {
    await persistProfile();
    setStep('payoff');
  };

  const renderProgress = () => {
    if (requiredIndex >= 0) {
      const progress = (requiredIndex + 1) / REQUIRED_STEPS.length;
      return (
        <View style={styles.progressWrap}>
          <Text style={styles.progressText}>Required {requiredIndex + 1}/{REQUIRED_STEPS.length}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      );
    }
    if (optionalIndex >= 0) {
      const progress = (optionalIndex + 1) / OPTIONAL_STEPS.length;
      return (
        <View style={styles.progressWrap}>
          <Text style={styles.progressText}>Bonus {optionalIndex + 1}/{OPTIONAL_STEPS.length}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      );
    }
    return null;
  };

  const renderOption = (
    label: string,
    selected: boolean,
    onPress: () => void,
    emoji?: string
  ) => (
    <Pressable key={label} onPress={onPress} style={[styles.option, selected && styles.optionSelected]}>
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
        {emoji ? `${emoji} ` : ''}{label}
      </Text>
    </Pressable>
  );

  const renderQuestionShell = (
    title: string,
    subtitle: string | undefined,
    content: React.ReactNode,
    extra?: React.ReactNode
  ) => (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {renderProgress()}
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
        </Pressable>
      </View>
    </SafeAreaView>
  );

  if (step === 'q1_goal') {
    return renderQuestionShell(
      'What brings you to KŌOPE?',
      undefined,
      GOAL_OPTIONS.map((opt) =>
        renderOption(opt.label, answers.goal === opt.value, () => setAnswer('goal', opt.value))
      )
    );
  }

  if (step === 'q2_skill') {
    return renderQuestionShell(
      'Your current skill level?',
      undefined,
      SKILL_OPTIONS.map((opt) =>
        renderOption(opt.label, answers.skillLevel === opt.value, () => setAnswer('skillLevel', opt.value))
      )
    );
  }

  if (step === 'q4_flavors') {
    return renderQuestionShell(
      'Which flavors do you prefer?',
      'Select at least 2',
      FLAVOR_OPTIONS.map((opt) =>
        renderOption(
          opt.label,
          (answers.flavors || []).includes(opt.value),
          () => setAnswer('flavors', toggleMulti(answers.flavors, opt.value, 2) as FlavorKey[]),
          opt.emoji
        )
      ),
      (answers.flavors || []).length >= 2 ? (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>Great taste! You might love:</Text>
          <Text style={styles.feedbackText}>• {inferredFlavorPreview.join('\n• ')}</Text>
        </View>
      ) : null
    );
  }

  if (step === 'q3_spirits') {
    return renderQuestionShell(
      'Which base spirits do you enjoy?',
      'Select at least 1',
      SPIRIT_OPTIONS.map((opt) =>
        renderOption(
          opt.label,
          (answers.spirits || []).includes(opt.value),
          () => setAnswer('spirits', toggleMulti(answers.spirits, opt.value, 1) as SpiritKey[]),
          opt.emoji
        )
      )
    );
  }

  if (step === 'q5_dislikes') {
    return renderQuestionShell(
      'Any ingredients you dislike or avoid?',
      'Optional',
      <>
        {DISLIKE_OPTIONS.map((label) =>
          renderOption(
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
    return renderQuestionShell(
      'How often do you make cocktails?',
      undefined,
      FREQUENCY_OPTIONS.map((opt) =>
        renderOption(opt.label, answers.frequency === opt.value, () => setAnswer('frequency', opt.value))
      )
    );
  }

  if (step === 'q7_alcohol_free') {
    return renderQuestionShell(
      'Do you want alcohol-free options included?',
      undefined,
      ALCOHOL_FREE_OPTIONS.map((opt) =>
        renderOption(opt.label, answers.alcoholFree === opt.value, () => setAnswer('alcoholFree', opt.value))
      )
    );
  }

  if (step === 'optional_gate') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <Text style={styles.gateCheck}>✓</Text>
          <Text style={styles.title}>Nice! 7/7 complete</Text>
          <Text style={styles.subtitle}>Want 5 quick bonus questions for better personalization?</Text>
          <Pressable style={styles.primaryButton} onPress={() => {
            setOptionalEnabled(true);
            setStep('q8_occasions');
          }}>
            <Text style={styles.primaryButtonText}>Yes, let's go</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={goToTrial}>
            <Text style={styles.secondaryButtonText}>Skip to trial offer</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'q8_occasions') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {renderProgress()}
          <Text style={styles.title}>What is your typical drinking occasion?</Text>
          <View style={styles.optionsWrap}>
            {OCCASION_OPTIONS.map((label) =>
              renderOption(
                label,
                (answers.occasions || []).includes(label),
                () => setAnswer('occasions', toggleMulti(answers.occasions, label) as string[])
              )
            )}
          </View>
        </ScrollView>
        <View style={styles.footerRow}>
          <Pressable style={styles.ghostButton} onPress={goToTrial}>
            <Text style={styles.ghostButtonText}>Skip optional</Text>
          </Pressable>
          <Pressable style={styles.primaryButtonSmall} onPress={goNext}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'q9_budget') {
    return renderQuestionShell(
      'Budget comfort per bottle?',
      'Optional',
      BUDGET_OPTIONS.map((opt) =>
        renderOption(opt.label, answers.budgetRange === opt.value, () => setAnswer('budgetRange', opt.value))
      ),
      <Pressable style={styles.inlineSkip} onPress={goToTrial}>
        <Text style={styles.inlineSkipText}>Skip optional</Text>
      </Pressable>
    );
  }

  if (step === 'q10_bottles') {
    return renderQuestionShell(
      'How many bottles do you currently own?',
      'Optional',
      BOTTLE_OPTIONS.map((opt) =>
        renderOption(opt.label, answers.currentBottleCount === opt.value, () => setAnswer('currentBottleCount', opt.value))
      ),
      <Pressable style={styles.inlineSkip} onPress={goToTrial}>
        <Text style={styles.inlineSkipText}>Skip optional</Text>
      </Pressable>
    );
  }

  if (step === 'q11_complexity') {
    return renderQuestionShell(
      'Preferred drink complexity?',
      'Optional',
      COMPLEXITY_OPTIONS.map((opt) =>
        renderOption(opt.label, answers.complexityPreference === opt.value, () => setAnswer('complexityPreference', opt.value))
      ),
      <Pressable style={styles.inlineSkip} onPress={goToTrial}>
        <Text style={styles.inlineSkipText}>Skip optional</Text>
      </Pressable>
    );
  }

  if (step === 'q12_goal_30') {
    return renderQuestionShell(
      "What's your main goal in the next 30 days?",
      'Optional',
      GOAL_30_OPTIONS.map((label) =>
        renderOption(label, answers.thirtyDayGoal === label, () => setAnswer('thirtyDayGoal', label))
      ),
      <Pressable style={styles.inlineSkip} onPress={goToTrial}>
        <Text style={styles.inlineSkipText}>Skip optional</Text>
      </Pressable>
    );
  }

  if (step === 'trial_offer') {
    const goal = (answers.goal || 'make_better_drinks') as OnboardingGoal;
    const benefits = getTrialBenefits(goal);
    const headline = getTrialHeadline(goal);

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.centerWrap}>
          <Text style={styles.emoji}>🎁</Text>
          <Text style={styles.title}>{headline}</Text>
          <Text style={styles.subtitle}>Get full KŌOPE+ access for 7 days. Cancel anytime.</Text>
          <View style={styles.benefitsCard}>
            {benefits.map((benefit) => (
              <Text key={benefit} style={styles.benefitItem}>✓ {benefit}</Text>
            ))}
          </View>
          <Pressable style={styles.primaryButton} onPress={handleStartTrial}>
            <Text style={styles.primaryButtonText}>Start Free Trial</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={handleSkipTrial}>
            <Text style={styles.secondaryButtonText}>Skip trial → Use Free</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'payoff') {
    const finalized = answers as OnboardingQuestionnaireAnswers;
    const recipeMatches = estimateRecipeMatchCount(finalized);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>Your profile is ready</Text>
          <View style={styles.resultsRow}>
            <View style={styles.resultCard}>
              <Text style={styles.resultValue}>{recipeMatches}</Text>
              <Text style={styles.resultLabel}>recipes matched</Text>
            </View>
            <View style={styles.resultCard}>
              <Text style={styles.resultValue}>+100 XP</Text>
              <Text style={styles.resultLabel}>profile completion</Text>
            </View>
          </View>
          <Text style={styles.badge}>🏆 Profile Complete Badge Earned</Text>
          <Text style={styles.subtitle}>
            {startedTrial ? 'Trial active. You can cancel anytime.' : 'You can start a trial later from settings.'}
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => setStep('first_action')}>
            <Text style={styles.primaryButtonText}>Let&apos;s start</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerWrap}>
        <Text style={styles.title}>Let&apos;s scan your first bottle</Text>
        <Text style={styles.subtitle}>Open camera now or skip and continue to the app.</Text>
        <Pressable
          style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
          disabled={isSaving}
          onPress={() => onComplete('scan')}
        >
          <Text style={styles.primaryButtonText}>Open Camera to Scan</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, isSaving && styles.buttonDisabled]}
          disabled={isSaving}
          onPress={() => onComplete('skip')}
        >
          <Text style={styles.secondaryButtonText}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing(3),
    paddingBottom: spacing(6),
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing(3),
    gap: spacing(2),
  },
  progressWrap: {
    marginBottom: spacing(2),
  },
  progressText: {
    color: colors.subtext,
    fontSize: 12,
    marginBottom: spacing(0.75),
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.gold,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    fontFamily: serif,
    lineHeight: 36,
  },
  subtitle: {
    color: colors.subtext,
    fontSize: 16,
    lineHeight: 22,
  },
  optionsWrap: {
    marginTop: spacing(1),
    gap: spacing(1),
  },
  option: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    paddingVertical: spacing(1.4),
    paddingHorizontal: spacing(1.5),
    backgroundColor: colors.card,
  },
  optionSelected: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(212, 175, 55, 0.14)',
  },
  optionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: colors.gold,
  },
  footer: {
    padding: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  footerRow: {
    padding: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    gap: spacing(1),
  },
  primaryButton: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonSmall: {
    flex: 1,
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  ghostButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.5),
    alignItems: 'center',
  },
  ghostButtonText: {
    color: colors.subtext,
    fontWeight: '700',
  },
  inlineSkip: {
    marginTop: spacing(1),
    alignSelf: 'flex-start',
  },
  inlineSkipText: {
    color: colors.gold,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  feedbackCard: {
    marginTop: spacing(1.5),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.lg,
    padding: spacing(1.5),
    gap: spacing(0.75),
  },
  feedbackTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
  feedbackText: {
    color: colors.subtext,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(1.1),
    color: colors.text,
    backgroundColor: colors.bg,
    marginTop: spacing(0.5),
  },
  gateCheck: {
    color: colors.gold,
    fontSize: 36,
    fontWeight: '900',
  },
  emoji: {
    fontSize: 36,
  },
  benefitsCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    padding: spacing(1.5),
    gap: spacing(1),
    backgroundColor: colors.card,
  },
  benefitItem: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  resultsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing(1.25),
  },
  resultCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    padding: spacing(1.5),
    backgroundColor: colors.card,
  },
  resultValue: {
    color: colors.gold,
    fontSize: 22,
    fontWeight: '900',
  },
  resultLabel: {
    color: colors.subtext,
    fontSize: 12,
    marginTop: spacing(0.5),
  },
  badge: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
});
