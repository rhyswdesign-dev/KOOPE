import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable,
  StyleSheet, Switch, KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radii, textStyles, layouts } from '../theme/tokens';
import { log } from '../lib/logger';

const shadows = {
  card: { shadowColor: colors.shadow, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 }
};

const ALL_SPIRITS = ['Whiskey','Gin','Vodka','Tequila','Rum','Bourbon','Brandy','Mezcal'];
const LEVELS = ['Beginner','Intermediate','Advanced'];

interface AccountSetupScreenProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

// Internal component that always has navigation context
function AccountSetupContent({ onComplete, onSkip, navigation }: AccountSetupScreenProps & { navigation?: any }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [birthday, setBirthday] = useState(''); // free text for now
  const [spirits, setSpirits] = useState<string[]>([]);
  const [level, setLevel] = useState<string>('Beginner');
  const [push, setPush] = useState(true);
  const [marketing, setMarketing] = useState(false);

  const valid = useMemo(() => name.trim().length > 1, [name]);

  const toggleSpirit = (s: string) => {
    setSpirits(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const onSave = () => {
    const payload = { name, email, city, birthday, spirits, level, push, marketing };
    log.info('AccountSetupScreen', 'Saving account setup', payload);
    // Wire to your storage / API as needed…
    if (onComplete) {
      onComplete();
    } else if (navigation) {
      // @ts-ignore
      navigation.goBack();
    }
  };

  const handleSkip = () => {
    log.info('AccountSetupScreen', 'Skip button clicked', { hasOnSkip: !!onSkip });
    if (onSkip) {
      onSkip();
    } else if (navigation) {
      // @ts-ignore
      navigation.navigate('XPReminder');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex:1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing(5) }}>
        <Header title="Create your account" subtitle="Tell us a bit about you so we can personalize your experience." />

        {/* Basic Info */}
        <Section title="Basic Info">
          <Field label="Display Name" required>
            <Input value={name} onChangeText={setName} placeholder="e.g., Ava Sterling" />
          </Field>

          <Field label="Email">
            <Input value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" />
          </Field>

          <View style={{ flexDirection: 'row', gap: spacing(2) }}>
            <View style={{ flex:1 }}>
              <Field label="City">
                <Input value={city} onChangeText={setCity} placeholder="Toronto, ON" />
              </Field>
            </View>
            <View style={{ flex:1 }}>
              <Field label="Birthday">
                <Input value={birthday} onChangeText={setBirthday} placeholder="YYYY-MM-DD" />
              </Field>
            </View>
          </View>
        </Section>

        {/* Favorites */}
        <Section title="Favorite Spirits">
          <View style={styles.chipsWrap}>
            {ALL_SPIRITS.map(s => (
              <Chip
                key={s}
                label={s}
                selected={spirits.includes(s)}
                onPress={() => toggleSpirit(s)}
              />
            ))}
          </View>
        </Section>

        {/* Skill level */}
        <Section title="Skill Level">
          <View style={styles.chipsWrap}>
            {LEVELS.map(l => (
              <Chip
                key={l}
                label={l}
                selected={level === l}
                onPress={() => setLevel(l)}
              />
            ))}
          </View>
        </Section>

        {/* Preferences */}
        <Section title="Preferences">
          <ToggleRow
            label="Push notifications"
            value={push}
            onValueChange={setPush}
            hint="Get alerts for events, challenges and new recipes."
          />
          <ToggleRow
            label="Email updates"
            value={marketing}
            onValueChange={setMarketing}
            hint="Tips, promos and product updates."
          />
        </Section>

        {/* Actions */}
        <View style={{ paddingHorizontal: spacing(2), marginTop: spacing(2), gap: spacing(1.25) }}>
          <PrimaryButton title="Save & Continue" disabled={!valid} onPress={onSave} />
          <SecondaryButton title="Skip for now" onPress={handleSkip} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ----------------- UI bits ----------------- */

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ paddingHorizontal: spacing(2), paddingTop: spacing(12), paddingBottom: spacing(1) }}>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{title}</Text>
      {!!subtitle && <Text style={{ color: colors.subtext, marginTop: 6 }}>{subtitle}</Text>}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: spacing(2), marginTop: spacing(2) }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing(1) }}>{title}</Text>
      <View style={{ backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing(1.5), ...shadows.card }}>
        {children}
      </View>
    </View>
  );
}

function Field({ label, children, required }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing(1.25) }}>
      <Text style={{ color: colors.subtext, marginBottom: 6 }}>
        {label}{required ? ' *' : ''}
      </Text>
      {children}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={colors.subtext}
      style={{
        color: colors.text,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radii.md,
        paddingHorizontal: 12,
        height: 46,
      }}
      {...props}
    />
  );
}

function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.chip,
      selected && { backgroundColor: colors.accent, borderColor: colors.accent },
      pressed && { opacity: 0.95 }
    ]}>
      <Text style={[
        styles.chipText,
        selected && { color: colors.goldText, fontWeight: '800' }
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ToggleRow({ label, value, onValueChange, hint }:{
  label:string; value:boolean; onValueChange:(v:boolean)=>void; hint?:string;
}) {
  return (
    <View style={{
      flexDirection:'row', alignItems:'center',
      justifyContent:'space-between', paddingVertical: 8, paddingHorizontal: 8
    }}>
      <View style={{ flex:1, paddingRight: spacing(1) }}>
        <Text style={{ color: colors.text, fontWeight:'600' }}>{label}</Text>
        {!!hint && <Text style={{ color: colors.subtext, marginTop: 3, fontSize: 12 }}>{hint}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? colors.white : colors.subtle}
        trackColor={{ true: colors.accent, false: colors.line }}
      />
    </View>
  );
}

function PrimaryButton({ title, onPress, disabled }:{
  title:string; onPress?:()=>void; disabled?:boolean;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: disabled ? colors.muted : colors.accent,
          height: 50, borderRadius: radii.lg,
          alignItems:'center', justifyContent:'center'
        },
        pressed && !disabled && { transform:[{ scale:0.99 }] }
      ]}>
      <Text style={[textStyles.bodyMedium, { color: colors.goldText, fontSize: 16, fontWeight: '800' }]}>{title}</Text>
    </Pressable>
  );
}

function SecondaryButton({ title, onPress }:{ title:string; onPress?:()=>void }) {
  return (
    <Pressable onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: colors.chipBg,
          borderColor: colors.line, borderWidth: StyleSheet.hairlineWidth,
          height: 50, borderRadius: radii.lg,
          alignItems:'center', justifyContent:'center'
        },
        pressed && { opacity: 0.95 }
      ]}>
      <Text style={[textStyles.bodyMedium, { color: colors.text, fontSize: 16 }]}>{title}</Text>
    </Pressable>
  );
}

// Wrapper component that handles navigation context
export default function AccountSetupScreen({ onComplete, onSkip }: AccountSetupScreenProps) {
  if (onComplete || onSkip) {
    // Onboarding mode - no navigation context needed
    return <AccountSetupContent onComplete={onComplete} onSkip={onSkip} />;
  } else {
    // Regular navigation mode - use navigation hook
    const navigation = useNavigation();
    return <AccountSetupContent navigation={navigation} />;
  }
}

const styles = StyleSheet.create({
  chipsWrap: { flexDirection:'row', flexWrap:'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.chipBg,
    borderColor: colors.line, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
  },
  chipText: { color: colors.text, fontWeight:'600' },
});