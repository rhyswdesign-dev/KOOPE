import React, { useState, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Alert,
  TouchableOpacity, Switch, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { log } from '../lib/logger';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useAICredits } from '../store/useAICredits';
import { useXPSystem } from '../store/useXPSystem';
import { useUser } from '../store/useUser';
import { HomeBarService } from '../services/homeBarService';
import { useNotifications } from '../services/notificationService';

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export default function SettingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut: supabaseSignOut } = useAuth();
  const { addCredits } = useAICredits();
  const { balance: xpBalance, earnXP, resetXPSystem } = useXPSystem();
  const { resetUser } = useUser();
  const { preferences: notificationPrefs, updatePreferences } = useNotifications();

  const [appearance, setAppearance] = useState({
    theme: 'dark', // 'dark' | 'light' | 'auto'
    textSize: 'medium', // 'small' | 'medium' | 'large'
  });

  const [expandedSections, setExpandedSections] = useState({
    notifications: false,
    appearance: false,
    privacy: false,
    support: false,
    legal: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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
    <LinearGradient colors={['rgba(0,0,0,0)', '#1A120D']} style={styles.container}>
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>

          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleEditProfile}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <Ionicons name="person-outline" size={22} color={colors.text} />
                <Text style={styles.settingItemText}>Edit Profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleAccountInfo}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <Ionicons name="information-circle-outline" size={22} color={colors.text} />
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
                <Ionicons name="log-out-outline" size={22} color={colors.text} />
                <Text style={styles.settingItemText}>Sign Out</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          {/* Subscription Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => nav.navigate('ManageSubscription')}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <Ionicons name="card-outline" size={22} color={colors.text} />
                <Text style={styles.settingItemText}>Manage Subscription</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => nav.navigate('Paywall', { displayCloseButton: true })}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <Ionicons name="diamond-outline" size={22} color={colors.gold} />
                <Text style={styles.settingItemText}>Upgrade to KOOPE+</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => nav.navigate('Referral')}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <Ionicons name="gift-outline" size={22} color={colors.accent} />
                <Text style={styles.settingItemText}>Refer Friends</Text>
              </View>
              <View style={styles.settingItemRight}>
                <Text style={styles.settingItemBadge}>Earn Free Premium</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Notifications Section - Collapsible */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => nav.navigate('NotificationCenter')}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <Ionicons name="notifications-outline" size={22} color={colors.text} />
                <Text style={styles.settingItemText}>Notification Center</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => toggleSection('notifications')}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <Ionicons name="options-outline" size={22} color={colors.text} />
                <Text style={styles.settingItemText}>Notification Settings</Text>
              </View>
              <Ionicons
                name={expandedSections.notifications ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.subtext}
              />
            </TouchableOpacity>

            {expandedSections.notifications && (
              <>
                <View style={styles.settingItem}>
                  <View style={styles.settingItemLeft}>
                    <Ionicons name="school-outline" size={22} color={colors.text} />
                    <View>
                      <Text style={styles.settingItemText}>Lessons</Text>
                      <Text style={styles.settingItemSubtext}>Lesson reminders and streaks</Text>
                    </View>
                  </View>
                  <Switch
                    value={notificationPrefs.lessons}
                    onValueChange={(value) => updatePreferences({ lessons: value })}
                    thumbColor={notificationPrefs.lessons ? colors.white : colors.subtle}
                    trackColor={{ true: colors.accent, false: colors.line }}
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingItemLeft}>
                    <Ionicons name="calendar-outline" size={22} color={colors.text} />
                    <View>
                      <Text style={styles.settingItemText}>Events</Text>
                      <Text style={styles.settingItemSubtext}>Event reminders and updates</Text>
                    </View>
                  </View>
                  <Switch
                    value={notificationPrefs.events}
                    onValueChange={(value) => updatePreferences({ events: value })}
                    thumbColor={notificationPrefs.events ? colors.white : colors.subtle}
                    trackColor={{ true: colors.accent, false: colors.line }}
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingItemLeft}>
                    <Ionicons name="people-outline" size={22} color={colors.text} />
                    <View>
                      <Text style={styles.settingItemText}>Social</Text>
                      <Text style={styles.settingItemSubtext}>Followers, likes, and mentions</Text>
                    </View>
                  </View>
                  <Switch
                    value={notificationPrefs.social}
                    onValueChange={(value) => updatePreferences({ social: value })}
                    thumbColor={notificationPrefs.social ? colors.white : colors.subtle}
                    trackColor={{ true: colors.accent, false: colors.line }}
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingItemLeft}>
                    <Ionicons name="mail-outline" size={22} color={colors.text} />
                    <View>
                      <Text style={styles.settingItemText}>Marketing</Text>
                      <Text style={styles.settingItemSubtext}>Promotional offers and news</Text>
                    </View>
                  </View>
                  <Switch
                    value={notificationPrefs.marketing}
                    onValueChange={(value) => updatePreferences({ marketing: value })}
                    thumbColor={notificationPrefs.marketing ? colors.white : colors.subtle}
                    trackColor={{ true: colors.accent, false: colors.line }}
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingItemLeft}>
                    <Ionicons name="archive-outline" size={22} color={colors.text} />
                    <View>
                      <Text style={styles.settingItemText}>Vault Updates</Text>
                      <Text style={styles.settingItemSubtext}>Hearts refilled, XP milestones</Text>
                    </View>
                  </View>
                  <Switch
                    value={notificationPrefs.vault}
                    onValueChange={(value) => updatePreferences({ vault: value })}
                    thumbColor={notificationPrefs.vault ? colors.white : colors.subtle}
                    trackColor={{ true: colors.accent, false: colors.line }}
                  />
                </View>
              </>
            )}
          </View>

          {/* Appearance Section - Collapsible */}
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => toggleSection('appearance')}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="color-palette-outline" size={22} color={colors.text} />
              <Text style={styles.settingItemText}>Appearance</Text>
            </View>
            <Ionicons
              name={expandedSections.appearance ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.subtext}
            />
          </TouchableOpacity>

          {expandedSections.appearance && (
            <>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  Alert.alert(
                    'Theme',
                    'Choose your preferred theme',
                    [
                      { text: 'Dark (Current)', style: 'default', onPress: () => setAppearance(prev => ({ ...prev, theme: 'dark' })) },
                      { text: 'Light (Coming Soon)', style: 'default' },
                      { text: 'Auto (System)', style: 'default' },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
                activeOpacity={0.7}
              >
                <View style={styles.settingItemLeft}>
                  <Ionicons name="moon-outline" size={22} color={colors.text} />
                  <View>
                    <Text style={styles.settingItemText}>Theme</Text>
                    <Text style={styles.settingItemSubtext}>Dark Mode</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  Alert.alert(
                    'Text Size',
                    'Adjust text size for better readability',
                    [
                      { text: 'Small', style: 'default', onPress: () => setAppearance(prev => ({ ...prev, textSize: 'small' })) },
                      { text: 'Medium (Current)', style: 'default' },
                      { text: 'Large', style: 'default', onPress: () => setAppearance(prev => ({ ...prev, textSize: 'large' })) },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
                activeOpacity={0.7}
              >
                <View style={styles.settingItemLeft}>
                  <Ionicons name="text-outline" size={22} color={colors.text} />
                  <View>
                    <Text style={styles.settingItemText}>Text Size</Text>
                    <Text style={styles.settingItemSubtext}>Medium</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
              </TouchableOpacity>
            </>
          )}

          {/* Privacy & Security Section - Collapsible */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy & Security</Text>

            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => toggleSection('privacy')}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <Ionicons name="shield-outline" size={22} color={colors.text} />
                <Text style={styles.settingItemText}>Privacy Settings</Text>
              </View>
              <Ionicons
                name={expandedSections.privacy ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.subtext}
              />
            </TouchableOpacity>

            {expandedSections.privacy && (
              <>
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() => log.info('SettingsScreen', 'Privacy Settings pressed')}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingItemLeft}>
                    <Ionicons name="lock-closed-outline" size={22} color={colors.text} />
                    <Text style={styles.settingItemText}>Data & Privacy</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() => log.info('SettingsScreen', 'Blocked Users pressed')}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingItemLeft}>
                    <Ionicons name="ban-outline" size={22} color={colors.text} />
                    <Text style={styles.settingItemText}>Blocked Users</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Help & Support</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => nav.navigate('Feedback')}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <Ionicons name="chatbubble-outline" size={22} color={colors.accent} />
                <Text style={styles.settingItemText}>Send Feedback</Text>
              </View>
              <View style={styles.settingItemRight}>
                <Text style={styles.settingItemBadge}>Help Us Improve</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => toggleSection('support')}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <Ionicons name="help-circle-outline" size={22} color={colors.text} />
                <Text style={styles.settingItemText}>Support Center</Text>
              </View>
              <Ionicons
                name={expandedSections.support ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.subtext}
              />
            </TouchableOpacity>

            {expandedSections.support && (
              <>
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={handleHelpSupport}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingItemLeft}>
                    <Ionicons name="information-circle-outline" size={22} color={colors.text} />
                    <Text style={styles.settingItemText}>Help & FAQs</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() => log.info('SettingsScreen', 'Rate App pressed')}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingItemLeft}>
                    <Ionicons name="star-outline" size={22} color={colors.text} />
                    <Text style={styles.settingItemText}>Rate App</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Legal Section - Collapsible */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Legal</Text>

            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => toggleSection('legal')}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <Ionicons name="document-text-outline" size={22} color={colors.text} />
                <Text style={styles.settingItemText}>Terms & Policies</Text>
              </View>
              <Ionicons
                name={expandedSections.legal ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.subtext}
              />
            </TouchableOpacity>

            {expandedSections.legal && (
              <>
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() => nav.navigate('TermsOfService')}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingItemLeft}>
                    <Ionicons name="document-outline" size={22} color={colors.text} />
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
                    <Ionicons name="shield-checkmark-outline" size={22} color={colors.text} />
                    <Text style={styles.settingItemText}>Privacy Policy</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                </TouchableOpacity>
              </>
            )}
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
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
                <Text style={[styles.settingItemText, { color: '#EF4444' }]}>Delete Account</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {/* Dev Tools - Only visible in development */}
          {__DEV__ && (
            <View style={[styles.section, { borderTopWidth: 1, borderTopColor: colors.accent, marginTop: spacing(2) }]}>
              <Text style={[styles.sectionTitle, { color: colors.accent }]}>Dev Tools</Text>

              <View style={[styles.settingItem, { backgroundColor: 'rgba(247, 198, 111, 0.1)' }]}>
                <View style={styles.settingItemLeft}>
                  <Ionicons name="diamond-outline" size={22} color={colors.accent} />
                  <Text style={styles.settingItemText}>Current XP: {xpBalance}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.settingItem, { backgroundColor: 'rgba(247, 198, 111, 0.1)' }]}
                onPress={() => {
                  earnXP(100, 'other', 'Dev: Added 100 XP');
                  Alert.alert('XP Added', 'Added 100 XP for testing');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.settingItemLeft}>
                  <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
                  <Text style={styles.settingItemText}>Add 100 XP</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.accent} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingItem, { backgroundColor: 'rgba(247, 198, 111, 0.1)' }]}
                onPress={() => {
                  Alert.alert(
                    'Reset XP System',
                    'This will reset your XP balance to 0 and clear all unlocked cocktails. Continue?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Reset',
                        style: 'destructive',
                        onPress: () => {
                          resetXPSystem();
                          Alert.alert('Reset Complete', 'XP system has been reset to 0');
                        }
                      }
                    ]
                  );
                }}
                activeOpacity={0.7}
              >
                <View style={styles.settingItemLeft}>
                  <Ionicons name="refresh-outline" size={22} color="#EF4444" />
                  <Text style={[styles.settingItemText, { color: '#EF4444' }]}>Reset XP System</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#EF4444" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingItem, { backgroundColor: 'rgba(247, 198, 111, 0.1)' }]}
                onPress={() => {
                  Alert.alert(
                    'Reset All Progress',
                    'This will reset XP, completed lessons, and all user progress. Continue?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Reset All',
                        style: 'destructive',
                        onPress: () => {
                          resetXPSystem();
                          resetUser();
                          Alert.alert('Reset Complete', 'All progress has been reset');
                        }
                      }
                    ]
                  );
                }}
                activeOpacity={0.7}
              >
                <View style={styles.settingItemLeft}>
                  <Ionicons name="nuclear-outline" size={22} color="#EF4444" />
                  <Text style={[styles.settingItemText, { color: '#EF4444' }]}>Reset All Progress</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}

          {/* App Version */}
          <View style={styles.versionSection}>
            <Text style={styles.versionText}>KOOPE v1.0.0</Text>
            <Text style={styles.versionSubtext}>Build 2024.03.01</Text>
            <Text style={styles.ageNotice}>
              Must be 21+ to consume alcohol. Please drink responsibly.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Background handled by LinearGradient
  },
    scrollContent: {
      paddingBottom: spacing(8),
    },
    headerButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    section: {
      marginBottom: spacing(3),
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.subtext,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      paddingHorizontal: spacing(3),
      paddingTop: spacing(3),
      paddingBottom: spacing(1.5),
      fontFamily: serifFont,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'transparent',
      paddingVertical: spacing(2),
      paddingHorizontal: spacing(3),
      borderBottomWidth: 0.5,
      borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    settingItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing(2),
    },
    settingItemText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    settingItemSubtext: {
      fontSize: 13,
      color: colors.subtext,
      marginTop: 2,
    },
    settingItemRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(1),
    },
    settingItemBadge: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.accent,
      backgroundColor: 'rgba(214, 138, 56, 0.15)',
      paddingHorizontal: spacing(1),
      paddingVertical: 2,
      borderRadius: radii.sm,
    },
    collapsibleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'transparent',
      paddingVertical: spacing(2),
      paddingHorizontal: spacing(3),
      borderBottomWidth: 0.5,
      borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    dangerSection: {
      marginTop: spacing(4),
    },
    dangerItem: {
      backgroundColor: 'rgba(239, 68, 68, 0.03)',
    },
    versionSection: {
      alignItems: 'center',
      paddingVertical: spacing(6),
      paddingTop: spacing(8),
    },
    versionText: {
      fontSize: 13,
      color: colors.subtle,
      fontWeight: '500',
    },
    versionSubtext: {
      fontSize: 11,
      color: colors.subtle,
      marginTop: 4,
      opacity: 0.6,
    },
    ageNotice: {
      fontSize: 11,
      color: colors.subtle,
      marginTop: spacing(2),
      textAlign: 'center',
      opacity: 0.6,
    },
  });
