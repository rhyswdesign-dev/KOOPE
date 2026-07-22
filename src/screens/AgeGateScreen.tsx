/**
 * AgeGateScreen — the first and only mandatory gate (Master Plan Phase 1.4).
 *
 * Rebuilt in audit/sprint-1 after founder device review ("should be a lot
 * cleaner, the input of the age isn't smooth enough"). Design: minimal dark
 * editorial layout — wordmark, one headline, the DOB input, one CTA, one
 * legal line. The DOB input is three fields (MM / DD / YYYY, matching the
 * previous field order) with auto-advance focus, numeric keypad,
 * backspace-to-previous, and keyboard auto-dismiss when complete.
 *
 * Region selection is legally required (the minimum age varies by country and
 * by Canadian province) so it survives the cull — but collapsed to a single
 * quiet disclosure row that expands only when tapped, defaulting to the US.
 *
 * The onVerified payload contract (AgeVerificationPayload via
 * evaluateAgeEligibility) is unchanged — nothing downstream is affected.
 */
import React, { useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
  const insets = useSafeAreaInsets();
  const [country, setCountry] = useState<SupportedCountryCode | 'OTHER'>('US');
  const [subdivision, setSubdivision] = useState<SupportedSubdivisionCode | undefined>(undefined);
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [focusedField, setFocusedField] = useState<'month' | 'day' | 'year' | null>(null);
  const [regionOpen, setRegionOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [restrictedReason, setRestrictedReason] = useState<string | null>(null);

  const monthRef = useRef<TextInput>(null);
  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const requiresSubdivision = country === 'CA';
  const minimumAge = useMemo(
    () => (country === 'OTHER' ? null : getMinimumLegalAge(country, subdivision)),
    [country, subdivision]
  );
  const countryLabel = useMemo(
    () =>
      country === 'OTHER'
        ? 'Other region'
        : COUNTRY_OPTIONS.find((option) => option.code === country)?.label ?? country,
    [country]
  );
  const readyToSubmit = useMemo(
    () =>
      year.length === 4 &&
      month.length >= 1 &&
      day.length >= 1 &&
      (!requiresSubdivision || !!subdivision),
    [day.length, month.length, requiresSubdivision, subdivision, year.length]
  );

  // ── Smooth DOB entry: auto-advance focus as each field fills ─────────────
  const handleMonthChange = (value: string) => {
    const next = value.replace(/[^0-9]/g, '').slice(0, 2);
    setMonth(next);
    setRestrictedReason(null);
    if (next.length === 2) dayRef.current?.focus();
  };

  const handleDayChange = (value: string) => {
    const next = value.replace(/[^0-9]/g, '').slice(0, 2);
    setDay(next);
    setRestrictedReason(null);
    if (next.length === 2) yearRef.current?.focus();
  };

  const handleYearChange = (value: string) => {
    const next = value.replace(/[^0-9]/g, '').slice(0, 4);
    setYear(next);
    setRestrictedReason(null);
    // Full date entered — dismiss the keyboard so the CTA is front and centre.
    if (next.length === 4) Keyboard.dismiss();
  };

  // Backspace on an empty field hops back to the previous one.
  const handleDayKeyPress = ({ nativeEvent }: { nativeEvent: { key: string } }) => {
    if (nativeEvent.key === 'Backspace' && day.length === 0) monthRef.current?.focus();
  };
  const handleYearKeyPress = ({ nativeEvent }: { nativeEvent: { key: string } }) => {
    if (nativeEvent.key === 'Backspace' && year.length === 0) dayRef.current?.focus();
  };

  const handleContinue = async () => {
    const dob = parseDate(year, month, day);
    if (country === 'OTHER') {
      setRestrictedReason('KŌOPE is not available in your region yet.');
      trackEvent(ANALYTICS_EVENTS.AGE_GATE_FAILED, {
        reason: 'unsupported_region',
        country: country,
      });
      return;
    }
    if (!dob || !minimumAge) {
      setRestrictedReason('Please enter a valid date of birth to continue.');
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
          'KŌOPE is only available to people of legal drinking age in their region.'
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

  const containerPadding = {
    paddingTop: insets.top + spacing(3),
    paddingBottom: insets.bottom + spacing(2),
  };

  if (restrictedReason) {
    return (
      <View style={[styles.container, containerPadding]}>
        <View style={styles.restrictedWrap}>
          <View style={styles.restrictedIcon}>
            <Ionicons name="shield-checkmark-outline" size={26} color={colors.accent} />
          </View>
          <Text style={styles.restrictedTitle}>Not this time</Text>
          <Text style={styles.restrictedBody}>{restrictedReason}</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => setRestrictedReason(null)}
            hitSlop={8}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.content, containerPadding]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Wordmark */}
        <Text style={styles.wordmark}>KŌOPE</Text>

        {/* Headline */}
        <Text style={styles.headline}>Confirm your age</Text>
        <Text style={styles.subline}>
          {minimumAge ? `You must be ${minimumAge}+ in ${countryLabel}.` : 'Enter your date of birth.'}
        </Text>

        {/* DOB input — three fields, auto-advancing */}
        <View style={styles.dobRow}>
          <View style={styles.dobField}>
            <TextInput
              ref={monthRef}
              value={month}
              onChangeText={handleMonthChange}
              onFocus={() => setFocusedField('month')}
              onBlur={() => setFocusedField(null)}
              style={[styles.dobInput, focusedField === 'month' && styles.dobInputFocused]}
              keyboardType="number-pad"
              placeholder="MM"
              placeholderTextColor={colors.muted}
              maxLength={2}
              autoFocus
              accessibilityLabel="Birth month"
            />
            <Text style={styles.dobLabel}>Month</Text>
          </View>
          <Text style={styles.dobDivider}>/</Text>
          <View style={styles.dobField}>
            <TextInput
              ref={dayRef}
              value={day}
              onChangeText={handleDayChange}
              onKeyPress={handleDayKeyPress}
              onFocus={() => setFocusedField('day')}
              onBlur={() => setFocusedField(null)}
              style={[styles.dobInput, focusedField === 'day' && styles.dobInputFocused]}
              keyboardType="number-pad"
              placeholder="DD"
              placeholderTextColor={colors.muted}
              maxLength={2}
              accessibilityLabel="Birth day"
            />
            <Text style={styles.dobLabel}>Day</Text>
          </View>
          <Text style={styles.dobDivider}>/</Text>
          <View style={[styles.dobField, styles.dobFieldYear]}>
            <TextInput
              ref={yearRef}
              value={year}
              onChangeText={handleYearChange}
              onKeyPress={handleYearKeyPress}
              onFocus={() => setFocusedField('year')}
              onBlur={() => setFocusedField(null)}
              style={[styles.dobInput, focusedField === 'year' && styles.dobInputFocused]}
              keyboardType="number-pad"
              placeholder="YYYY"
              placeholderTextColor={colors.muted}
              maxLength={4}
              accessibilityLabel="Birth year"
            />
            <Text style={styles.dobLabel}>Year</Text>
          </View>
        </View>

        {/* Region — one quiet disclosure row; expands only when tapped */}
        <Pressable
          style={styles.regionRow}
          onPress={() => setRegionOpen((open) => !open)}
          hitSlop={8}
          accessibilityLabel={`Region: ${countryLabel}. Tap to change.`}
        >
          <Text style={styles.regionText}>
            {countryLabel}
            {requiresSubdivision && subdivision
              ? ` · ${CANADA_SUBDIVISION_OPTIONS.find((o) => o.code === subdivision)?.label ?? subdivision}`
              : ''}
          </Text>
          <Ionicons
            name={regionOpen ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.subtext}
          />
        </Pressable>

        {regionOpen && (
          <View style={styles.regionPanel}>
            <View style={styles.chipWrap}>
              {[...COUNTRY_OPTIONS, { code: 'OTHER' as const, label: 'Other' }].map((option) => {
                const selected = option.code === country;
                return (
                  <Pressable
                    key={option.code}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => {
                      setCountry(option.code);
                      setRestrictedReason(null);
                      if (option.code !== 'CA') {
                        setSubdivision(undefined);
                        setRegionOpen(false);
                      }
                    }}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {requiresSubdivision && (
              <>
                <Text style={styles.provinceLabel}>Province / territory</Text>
                <View style={styles.chipWrap}>
                  {CANADA_SUBDIVISION_OPTIONS.map((option) => {
                    const selected = option.code === subdivision;
                    return (
                      <Pressable
                        key={option.code}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => {
                          setSubdivision(option.code);
                          setRegionOpen(false);
                        }}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        {/* CTA */}
        <Pressable
          style={[styles.primaryButton, (!readyToSubmit || submitting) && styles.buttonDisabled]}
          disabled={!readyToSubmit || submitting}
          onPress={handleContinue}
        >
          <Text style={styles.primaryButtonText}>{submitting ? 'One moment…' : 'Enter KŌOPE'}</Text>
        </Pressable>

        {/* Legal line */}
        <Text style={styles.legal}>
          We store your date of birth, region, and verification result to keep alcohol-related
          content away from minors.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing(3),
  },
  wordmark: {
    color: colors.accent,
    fontFamily: serif,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: spacing(4),
  },
  headline: {
    color: colors.text,
    fontFamily: serif,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing(0.75),
  },
  subline: {
    color: colors.subtext,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing(3.5),
  },
  dobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    marginBottom: spacing(2),
  },
  dobField: {
    width: 76,
    alignItems: 'center',
  },
  dobFieldYear: {
    width: 104,
  },
  dobInput: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    color: colors.text,
    height: 60,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  dobInputFocused: {
    borderColor: colors.accent,
  },
  dobLabel: {
    color: colors.subtext,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: spacing(0.75),
  },
  dobDivider: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: '300',
    marginBottom: spacing(2.75),
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.5),
    paddingVertical: spacing(1),
    marginBottom: spacing(2),
  },
  regionText: {
    color: colors.subtext,
    fontSize: 13,
    fontWeight: '600',
  },
  regionPanel: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(1.5),
    marginBottom: spacing(2),
    gap: spacing(1),
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.75),
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.pill,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1.25),
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '14',
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.accent,
  },
  provinceLabel: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing(0.5),
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    paddingHorizontal: spacing(3),
    marginBottom: spacing(2),
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: colors.goldText,
    fontSize: 16,
    fontWeight: '800',
  },
  legal: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: spacing(2),
  },
  restrictedWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(3),
    gap: spacing(1.5),
  },
  restrictedIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    fontWeight: '700',
    textAlign: 'center',
  },
  restrictedBody: {
    color: colors.subtext,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
