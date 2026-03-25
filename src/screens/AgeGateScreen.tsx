// @ts-nocheck
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  useWindowDimensions,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, serif } from '../theme/tokens';
import {
  AgeVerificationPayload,
  CANADA_SUBDIVISION_OPTIONS,
  COUNTRY_OPTIONS,
  SupportedCountryCode,
  SupportedSubdivisionCode,
  evaluateAgeEligibility,
  getMinimumLegalAge,
} from '../services/ageVerificationService';
import { trackEvent, ANALYTICS_EVENTS } from '../lib/analytics';

interface AgeGateScreenProps {
  onVerified: (payload: AgeVerificationPayload) => void;
}

function parseDate(year: string, month: string, day: string): Date | null {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const parsed = new Date(y, m - 1, d);
  if (parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) return null;
  return parsed;
}

export default function AgeGateScreen({ onVerified }: AgeGateScreenProps) {
  const { width } = useWindowDimensions();
  const pageWidth = width - spacing(6);
  const insets = useSafeAreaInsets();
  const keyboardVerticalOffset = insets.top + spacing(4);
  const [country, setCountry] = useState<SupportedCountryCode | 'OTHER'>('US');
  const [subdivision, setSubdivision] = useState<SupportedSubdivisionCode | undefined>(undefined);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [restrictedReason, setRestrictedReason] = useState<string | null>(null);
  const [countryPageIndex, setCountryPageIndex] = useState(0);

  const requiresSubdivision = country === 'CA';
  const minimumAge = useMemo(
    () => (country === 'OTHER' ? null : getMinimumLegalAge(country, subdivision)),
    [country, subdivision]
  );
  const validShape = useMemo(
    () =>
      year.length === 4 &&
      month.length >= 1 &&
      day.length >= 1 &&
      (!requiresSubdivision || !!subdivision),
    [day.length, month.length, requiresSubdivision, subdivision, year.length]
  );
  const countryPages = useMemo(() => {
    const basePages = [];
    for (let index = 0; index < COUNTRY_OPTIONS.length; index += 6) {
      basePages.push(COUNTRY_OPTIONS.slice(index, index + 6));
    }
    const lastPage = [...(basePages[basePages.length - 1] || [])];
    lastPage.push({ code: 'OTHER' as const, label: 'Other region' });
    if (basePages.length === 0) {
      return [[{ code: 'OTHER' as const, label: 'Other region' }]];
    }
    basePages[basePages.length - 1] = lastPage;
    return basePages;
  }, []);

  const resetRestriction = () => {
    setRestrictedReason(null);
  };

  const handleContinue = async () => {
    const dob = parseDate(year, month, day);
    if (country === 'OTHER') {
      setRestrictedReason('KOOPE is not available in your region yet.');
      trackEvent(ANALYTICS_EVENTS.AGE_GATE_FAILED, {
        reason: 'unsupported_region',
        country: country,
      });
      return;
    }
    if (!dob || !minimumAge) {
      setRestrictedReason('Please enter a valid date of birth and region to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const verification = evaluateAgeEligibility({
        dateOfBirth: dob,
        country,
        subdivision,
      });

      if (!verification.isOfLegalAge) {
        setRestrictedReason(
          'KOOPE is only available to people of legal drinking age in their selected region.'
        );
        trackEvent(ANALYTICS_EVENTS.AGE_GATE_FAILED, {
          reason: 'underage',
          country: verification.country,
          subdivision: verification.subdivision,
        });
        return;
      }

      trackEvent(ANALYTICS_EVENTS.AGE_GATE_PASSED, {
        country: verification.country,
        subdivision: verification.subdivision,
      });
      onVerified(verification);
    } finally {
      setSubmitting(false);
    }
  };

  if (restrictedReason) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          <View style={styles.restrictedWrap}>
            <View style={styles.restrictedIcon}>
              <Ionicons name="shield-checkmark-outline" size={28} color={colors.accent} />
            </View>
            <Text style={styles.restrictedTitle}>Restricted Access</Text>
            <Text style={styles.restrictedBody}>{restrictedReason}</Text>
            <Text style={styles.restrictedMeta}>
              Alcohol-related features stay locked until legal age is confirmed in a supported region.
            </Text>
            <Pressable style={styles.primaryButton} onPress={resetRestriction}>
              <Text style={styles.primaryButtonText}>Update Region or Date of Birth</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Legal Access Check</Text>
            <Text style={styles.title}>Confirm your legal drinking age</Text>
            <Text style={styles.subtitle}>
              KOOPE is only available to people of legal drinking age in their region. Confirm your region and date of birth before entering the app.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Country / region</Text>
            <ScrollView
              horizontal
              pagingEnabled
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.countryPager}
              onMomentumScrollEnd={(e) => {
                const nextIndex = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
                setCountryPageIndex(Math.max(0, Math.min(countryPages.length - 1, nextIndex)));
              }}
            >
              {countryPages.map((page, pageIndex) => (
                <View key={`page-${pageIndex}`} style={[styles.countryPage, { width: pageWidth }]}>
                  <View style={styles.countryGrid}>
                    {page.map((option) => {
                      const selected = option.code === country;
                      const isOtherRegion = option.code === 'OTHER';
                      return (
                        <Pressable
                          key={option.code}
                          style={[styles.countryCard, selected && styles.countryCardSelected]}
                          onPress={() => {
                            setCountry(option.code);
                            setRestrictedReason(null);
                            if (option.code !== 'CA') setSubdivision(undefined);
                          }}
                        >
                          <Text style={[styles.countryCardTitle, styles.countryCardTitleCentered, selected && styles.countryCardTitleSelected]}>
                            {option.label}
                          </Text>
                          {isOtherRegion ? (
                            <Text style={[styles.countryCardHint, styles.countryCardTitleCentered, selected && styles.countryCardHintSelected]}>
                              Unsupported right now
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.pagerDots}>
              {countryPages.map((_, idx) => (
                <View
                  key={`dot-${idx}`}
                  style={[styles.pagerDot, idx === countryPageIndex && styles.pagerDotActive]}
                />
              ))}
            </View>

            {requiresSubdivision ? (
              <>
                <Text style={[styles.sectionLabel, styles.subdivisionLabel]}>Province / territory</Text>
                <View style={styles.subdivisionGrid}>
                  {CANADA_SUBDIVISION_OPTIONS.map((option) => {
                    const selected = option.code === subdivision;
                    return (
                      <Pressable
                        key={option.code}
                        style={[styles.subdivisionChip, selected && styles.subdivisionChipSelected]}
                        onPress={() => setSubdivision(option.code)}
                      >
                        <Text style={[styles.subdivisionChipText, selected && styles.subdivisionChipTextSelected]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <Text style={[styles.sectionLabel, styles.subdivisionLabel]}>Date of birth</Text>
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>MM</Text>
                <TextInput
                  value={month}
                  onChangeText={(value) => setMonth(value.replace(/[^0-9]/g, '').slice(0, 2))}
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder="MM"
                  placeholderTextColor={colors.subtext}
                  maxLength={2}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>DD</Text>
                <TextInput
                  value={day}
                  onChangeText={(value) => setDay(value.replace(/[^0-9]/g, '').slice(0, 2))}
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder="DD"
                  placeholderTextColor={colors.subtext}
                  maxLength={2}
                />
              </View>
              <View style={styles.fieldYear}>
                <Text style={styles.label}>YYYY</Text>
                <TextInput
                  value={year}
                  onChangeText={(value) => setYear(value.replace(/[^0-9]/g, '').slice(0, 4))}
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder="YYYY"
                  placeholderTextColor={colors.subtext}
                  maxLength={4}
                />
              </View>
            </View>
          </View>

          <Pressable
            style={[styles.primaryButton, (!validShape || submitting) && styles.buttonDisabled]}
            disabled={!validShape || submitting}
            onPress={handleContinue}
          >
            <Text style={styles.primaryButtonText}>{submitting ? 'Checking access...' : 'Continue'}</Text>
          </Pressable>

          <Text style={styles.footnote}>
            We store your date of birth, region, and verification result to enforce legal access requirements and keep alcohol-related content away from minors.
          </Text>
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
  content: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
    gap: spacing(1.5),
  },
  hero: {
    gap: spacing(0.75),
    marginTop: spacing(0.75),
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontFamily: serif,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 34,
  },
  subtitle: {
    color: colors.subtext,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#201510',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(1.25),
    gap: spacing(1),
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  subdivisionLabel: {
    marginTop: spacing(2),
  },
  countryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.3),
  },
  countryCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing(0.55),
    paddingHorizontal: spacing(0.7),
    minHeight: 50,
    justifyContent: 'center',
  },
  countryCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '12',
  },
  countryCardTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  countryCardTitleCentered: {
    textAlign: 'center',
  },
  countryCardTitleSelected: {
    color: colors.accent,
  },
  countryCardHint: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  countryCardHintSelected: {
    color: colors.accent + 'CC',
  },
  countryPager: {
    paddingHorizontal: spacing(0.5),
  },
  countryPage: {
    marginRight: spacing(0.5),
  },
  pagerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(0.75),
    marginTop: spacing(0.75),
  },
  pagerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  pagerDotActive: {
    backgroundColor: colors.accent,
  },
  subdivisionGrid: {
    gap: spacing(0.75),
  },
  subdivisionChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.25),
  },
  subdivisionChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '12',
  },
  subdivisionChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  subdivisionChipTextSelected: {
    color: colors.accent,
  },
  row: {
    flexDirection: 'row',
    gap: spacing(1),
  },
  field: {
    flex: 1,
  },
  fieldYear: {
    flex: 1.4,
  },
  label: {
    color: colors.subtext,
    fontSize: 12,
    marginBottom: spacing(0.5),
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    color: colors.text,
    height: 48,
    paddingHorizontal: spacing(1.25),
    fontSize: 16,
  },
  noticeRow: {
    marginTop: spacing(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  noticeText: {
    color: colors.subtext,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: colors.goldText,
    fontSize: 16,
    fontWeight: '800',
  },
  footnote: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
  restrictedWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing(3),
    gap: spacing(1.5),
  },
  restrictedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent + '10',
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  restrictedTitle: {
    color: colors.text,
    fontFamily: serif,
    fontSize: 28,
    fontWeight: '800',
  },
  restrictedBody: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  restrictedMeta: {
    color: colors.subtext,
    fontSize: 14,
    lineHeight: 21,
  },
});
