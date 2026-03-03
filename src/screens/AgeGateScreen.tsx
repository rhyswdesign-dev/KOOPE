import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';

interface AgeGateScreenProps {
  onVerified: () => void;
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

function isAtLeast21(dob: Date): boolean {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 21;
}

export default function AgeGateScreen({ onVerified }: AgeGateScreenProps) {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validShape = useMemo(
    () => year.length === 4 && month.length >= 1 && day.length >= 1,
    [year.length, month.length, day.length]
  );

  const handleContinue = async () => {
    const dob = parseDate(year, month, day);
    if (!dob) {
      Alert.alert('Invalid date', 'Please enter a valid date of birth.');
      return;
    }

    setSubmitting(true);
    try {
      if (!isAtLeast21(dob)) {
        Alert.alert(
          'Age restricted',
          'You must be 21+ to access this app in the United States.'
        );
        return;
      }
      onVerified();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Text style={styles.title}>Age Verification</Text>
          <Text style={styles.subtitle}>
            To access KOOPE, confirm your date of birth. You must be 21 or older in the United States.
          </Text>

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

          <Pressable
            style={[styles.button, (!validShape || submitting) && styles.buttonDisabled]}
            disabled={!validShape || submitting}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>{submitting ? 'Checking...' : 'Continue'}</Text>
          </Pressable>

          <Text style={styles.footnote}>
            We use your date of birth only to verify legal access requirements.
          </Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing(3),
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: spacing(1),
  },
  subtitle: {
    color: colors.subtext,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: spacing(3),
  },
  row: {
    flexDirection: 'row',
    gap: spacing(1),
    marginBottom: spacing(2.5),
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
  button: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: colors.goldText,
    fontSize: 16,
    fontWeight: '800',
  },
  footnote: {
    marginTop: spacing(1.25),
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
});
