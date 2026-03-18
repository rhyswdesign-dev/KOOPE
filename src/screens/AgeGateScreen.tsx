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
  const [country, setCountry] = useState<SupportedCountryCode | 'OTHER'>('US');
  const [subdivision, setSubdivision] = useState<SupportedSubdivisionCode | undefined>(undefined);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [restrictedReason, setRestrictedReason] = useState<string | null>(null);

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
        return;
      }

      onVerified(verification);
    } finally {
      setSubmitting(false);
    }
  };

  if (restrictedReason) {
    return (
      <SafeAreaView style={styles.container}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            >
              {countryPages.map((page, pageIndex) => (
                <View key={`page-${pageIndex}`} style={[styles.countryPage, { width: width - spacing(6) }]}>
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
                          <Text style={[styles.countryCardTitle, selected && styles.countryCardTitleSelected]}>
                            {option.label}
                          </Text>
                          {isOtherRegion ? (
                            <Text style={[styles.countryCardHint, selected && styles.countryCardHintSelected]}>
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

            <Text style={styles.countryHelpText}>
              If your region is not listed yet, choose `Other region`.
            </Text>

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
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(4),
    gap: spacing(2),
  },
  hero: {
    gap: spacing(1),
    marginTop: spacing(1),
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
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  subtitle: {
    color: colors.subtext,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#201510',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: spacing(1),
  },
  subdivisionLabel: {
    marginTop: spacing(2),
  },
  countryPager: {
    paddingRight: spacing(2),
  },
  countryPage: {
    marginRight: spacing(1.5),
  },
  countryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
  },
  countryCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.25),
    minHeight: 72,
    justifyContent: 'center',
  },
  countryCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '12',
  },
  countryCardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
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
  countryHelpText: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing(1),
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
