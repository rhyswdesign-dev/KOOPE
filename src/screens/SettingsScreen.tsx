import React, { useState, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Alert,
  TouchableOpacity, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { log } from '../lib/logger';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function SettingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut: supabaseSignOut } = useAuth();
  const [notifications, setNotifications] = useState({
    events: true,
    social: true,
    marketing: false,
    updates: true,
  });

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Settings',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
      headerLeft: () => null,
    });
  }, [nav]);

  const handleEditProfile = () => {
    nav.navigate('EditProfile');
  };

  const handleHelpSupport = () => {
    nav.navigate('HelpSupport');
  };

  const handleMapsDemo = () => {
    nav.navigate('MapsDemo');
  };

  const handleAccountInfo = () => {
    Alert.alert(
      'Account Information',
      'Email: isaac.mckenzie@example.com\nMember since: March 2024\nAccount ID: HGA-2024-0312',
      [{ text: 'OK' }]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabaseSignOut();
              log.info('SettingsScreen', 'User signed out successfully');
              // AuthContext will handle the state change and redirect automatically
            } catch (error: any) {
              log.error('SettingsScreen', 'Sign out error', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user) {
                Alert.alert('Error', 'No user is currently signed in');
                return;
              }

              // Delete the user account via Supabase Admin API
              const { error } = await supabase.rpc('delete_user');

              if (error) throw error;

              log.info('SettingsScreen', 'Account deleted successfully');

              // Sign out the user
              await supabaseSignOut();
            } catch (error: any) {
              log.error('SettingsScreen', 'Account deletion error', error);
              Alert.alert('Error', 'Failed to delete account. Please contact support.');
            }
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleEditProfile}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="person-outline" size={24} color={colors.text} />
              <Text style={styles.settingItemText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="calendar-outline" size={24} color={colors.text} />
              <View>
                <Text style={styles.settingItemText}>Events</Text>
                <Text style={styles.settingItemSubtext}>Event reminders and updates</Text>
              </View>
            </View>
            <Switch
              value={notifications.events}
              onValueChange={(value) => setNotifications(prev => ({ ...prev, events: value }))}
              thumbColor={notifications.events ? colors.white : colors.subtle}
              trackColor={{ true: colors.accent, false: colors.line }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="people-outline" size={24} color={colors.text} />
              <View>
                <Text style={styles.settingItemText}>Social</Text>
                <Text style={styles.settingItemSubtext}>Followers, likes, and mentions</Text>
              </View>
            </View>
            <Switch
              value={notifications.social}
              onValueChange={(value) => setNotifications(prev => ({ ...prev, social: value }))}
              thumbColor={notifications.social ? colors.white : colors.subtle}
              trackColor={{ true: colors.accent, false: colors.line }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="mail-outline" size={24} color={colors.text} />
              <View>
                <Text style={styles.settingItemText}>Marketing</Text>
                <Text style={styles.settingItemSubtext}>Promotional offers and news</Text>
              </View>
            </View>
            <Switch
              value={notifications.marketing}
              onValueChange={(value) => setNotifications(prev => ({ ...prev, marketing: value }))}
              thumbColor={notifications.marketing ? colors.white : colors.subtle}
              trackColor={{ true: colors.accent, false: colors.line }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
              <View>
                <Text style={styles.settingItemText}>App Updates</Text>
                <Text style={styles.settingItemSubtext}>New features and improvements</Text>
              </View>
            </View>
            <Switch
              value={notifications.updates}
              onValueChange={(value) => setNotifications(prev => ({ ...prev, updates: value }))}
              thumbColor={notifications.updates ? colors.white : colors.subtle}
              trackColor={{ true: colors.accent, false: colors.line }}
            />
          </View>
        </View>

        {/* Privacy & Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => log.info('SettingsScreen', 'Privacy Settings pressed')}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="shield-outline" size={24} color={colors.text} />
              <Text style={styles.settingItemText}>Privacy Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>


          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => log.info('SettingsScreen', 'Blocked Users pressed')}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="ban-outline" size={24} color={colors.text} />
              <Text style={styles.settingItemText}>Blocked Users</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* Subscription Section (Dev/Test) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => nav.navigate('Paywall', { displayCloseButton: true })}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="diamond-outline" size={24} color="#D4AF37" />
              <Text style={styles.settingItemText}>Upgrade to Premium</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => nav.navigate('SubscriptionDebug')}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="bug-outline" size={24} color={colors.text} />
              <Text style={styles.settingItemText}>Subscription Debug</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleHelpSupport}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="help-circle-outline" size={24} color={colors.text} />
              <Text style={styles.settingItemText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleMapsDemo}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="map-outline" size={24} color={colors.text} />
              <Text style={styles.settingItemText}>Maps Demo</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => nav.navigate('Feedback')}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
              <Text style={styles.settingItemText}>Send Feedback</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => log.info('SettingsScreen', 'Rate App pressed')}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="star-outline" size={24} color={colors.text} />
              <Text style={styles.settingItemText}>Rate App</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => nav.navigate('TermsOfService')}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="document-text-outline" size={24} color={colors.text} />
              <Text style={styles.settingItemText}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => nav.navigate('PrivacyPolicy')}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color={colors.text} />
              <Text style={styles.settingItemText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleAccountInfo}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="information-circle-outline" size={24} color={colors.text} />
              <Text style={styles.settingItemText}>Account Information</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="log-out-outline" size={24} color={colors.text} />
              <Text style={styles.settingItemText}>Sign Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, styles.dangerItem]}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
              <Text style={[styles.settingItemText, { color: '#EF4444' }]}>Delete Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>Home Game Advantage v1.0.0</Text>
          <Text style={styles.versionSubtext}>Build 2024.03.01</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingBottom: spacing(6),
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: spacing(3),
    marginBottom: spacing(4),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    marginBottom: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing(2),
  },
  settingItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  settingItemSubtext: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2,
  },
  dangerSection: {
    marginTop: spacing(2),
  },
  dangerItem: {
    borderColor: 'rgba(239, 68, 68, 0.2)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: spacing(4),
  },
  versionText: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '600',
  },
  versionSubtext: {
    fontSize: 12,
    color: colors.subtle,
    marginTop: 4,
  },
});
