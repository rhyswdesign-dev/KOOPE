import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, spacing, radii } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { log } from '../lib/logger';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ExtraProfileData = {
  username: string;
  city: string;
};

const DEFAULT_BIO =
  'Home bartender building better drinks one bottle at a time.';

const getExtraProfileStorageKey = (userId: string) => `profile_extra_${userId}`;

export default function EditProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [bio, setBio] = useState(DEFAULT_BIO);
  const [username, setUsername] = useState('');
  const [city, setCity] = useState('');
  const initials = useMemo(() => {
    const source = name.trim() || user?.email || 'K';
    return source.substring(0, 1).toUpperCase();
  }, [name, user?.email]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Edit Profile',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '800' },
      headerShadowVisible: false,
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSave}
          style={styles.headerButton}
          activeOpacity={0.7}
          disabled={saving || loading}
        >
          <Text style={[styles.headerButtonText, (saving || loading) && styles.headerButtonTextDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, saving, loading, name, bio, username, city]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!user) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const [{ data: profile }, storedExtra] = await Promise.all([
          supabase.from('profiles').select('display_name, bio').eq('id', user.id).single(),
          AsyncStorage.getItem(getExtraProfileStorageKey(user.id)),
        ]);

        if (!isMounted) return;

        setName(profile?.display_name || '');
        setBio(profile?.bio || DEFAULT_BIO);

        if (storedExtra) {
          const parsed = JSON.parse(storedExtra) as ExtraProfileData;
          setUsername(parsed.username || '');
          setCity(parsed.city || '');
        } else {
          setUsername('');
          setCity('');
        }
      } catch (error) {
        log.warn('EditProfileScreen', 'Unable to fully load profile, using defaults', { error });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to edit your profile.');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter your display name.');
      return;
    }

    if (username.trim() && !/^[a-z0-9_]{3,20}$/i.test(username.trim())) {
      Alert.alert('Invalid username', 'Use 3-20 letters, numbers, or underscores.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: name.trim(),
          bio: bio.trim(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      const extraData: ExtraProfileData = {
        username: username.trim(),
        city: city.trim(),
      };

      await AsyncStorage.setItem(getExtraProfileStorageKey(user.id), JSON.stringify(extraData));

      log.info('EditProfileScreen', 'Profile saved', {
        userId: user.id,
        hasUsername: Boolean(extraData.username),
      });

      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      log.error('EditProfileScreen', 'Failed to save profile', error);
      Alert.alert('Save failed', 'We could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{initials}</Text>
          </View>
          <Text style={styles.heroName}>{name.trim() || 'Your Name'}</Text>
          <Text style={styles.heroEmail}>{user?.email || 'Signed in user'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Identity</Text>

          <Text style={styles.inputLabel}>Display Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.subtle}
            maxLength={40}
            keyboardAppearance="dark"
          />

          <Text style={styles.inputLabel}>Username</Text>
          <View style={styles.handleInputWrap}>
            <Text style={styles.handlePrefix}>@</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              style={styles.handleInput}
              placeholder="mixmaster"
              placeholderTextColor={colors.subtle}
              autoCapitalize="none"
              maxLength={20}
              keyboardAppearance="dark"
            />
          </View>

          <Text style={styles.inputLabel}>City</Text>
          <TextInput
            value={city}
            onChangeText={setCity}
            style={styles.input}
            placeholder="City, State"
            placeholderTextColor={colors.subtle}
            maxLength={50}
            keyboardAppearance="dark"
          />

          <Text style={styles.inputLabel}>Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            style={[styles.input, styles.bioInput]}
            placeholder="Tell people what you like to make"
            placeholderTextColor={colors.subtle}
            multiline
            maxLength={200}
            textAlignVertical="top"
            keyboardAppearance="dark"
          />
          <Text style={styles.helperText}>{bio.length}/200</Text>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.goldText} />
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
  },
  loadingText: {
    color: colors.subtext,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
    paddingBottom: spacing(6),
    gap: spacing(2),
  },
  headerButton: {
    paddingHorizontal: spacing(1),
  },
  headerButtonText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 15,
  },
  headerButtonTextDisabled: {
    color: colors.subtle,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2.5),
    alignItems: 'center',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(214, 138, 56, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(214, 138, 56, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '800',
  },
  heroName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: spacing(1.5),
  },
  heroEmail: {
    color: colors.subtext,
    fontSize: 13,
    marginTop: spacing(0.5),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing(1.5),
  },
  inputLabel: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing(0.75),
    marginTop: spacing(1),
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.5),
    fontSize: 15,
  },
  handleInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(1.5),
  },
  handlePrefix: {
    color: colors.subtext,
    fontSize: 15,
    fontWeight: '700',
    marginRight: spacing(0.5),
  },
  handleInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: spacing(1.5),
    fontSize: 15,
  },
  bioInput: {
    minHeight: 90,
  },
  helperText: {
    color: colors.subtext,
    fontSize: 12,
    marginTop: spacing(0.75),
  },
  saveButton: {
    marginTop: spacing(0.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.75),
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(2),
  },
  saveButtonText: {
    color: colors.goldText,
    fontSize: 16,
    fontWeight: '800',
  },
});
