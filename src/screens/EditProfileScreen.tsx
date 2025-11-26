import React, { useState, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, PanGestureHandler, Animated, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radii } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/RootNavigator';

interface Badge {
  id: string;
  name: string;
  description: string;
  fullDescription: string;
  icon: string;
  earned: boolean;
  category: 'lessons' | 'challenges' | 'recipes' | 'community';
}

const mockEarnedBadges: Badge[] = [
  {
    id: "1",
    name: "Spirit Master",
    description: "Completed 10 spirit lessons",
    fullDescription: "You've successfully completed 10 comprehensive spirit education lessons, mastering the fundamentals of whiskey, gin, vodka, rum, and tequila.",
    icon: "trophy",
    earned: true,
    category: "lessons"
  },
  {
    id: "2", 
    name: "Challenge Champion",
    description: "Won 5 bartending challenges",
    fullDescription: "Emerged victorious in 5 competitive bartending challenges, demonstrating exceptional skill and technique under pressure.",
    icon: "medal",
    earned: true,
    category: "challenges"
  },
  {
    id: "3",
    name: "Cocktail Expert",
    description: "Mastered 25 cocktail recipes",
    fullDescription: "Successfully mastered and perfected 25 classic and modern cocktail recipes, showcasing your mixology expertise.",
    icon: "glass-cocktail",
    earned: true,
    category: "recipes"
  },
  {
    id: "4",
    name: "Community Favorite",
    description: "Recipe featured and voted by community",
    fullDescription: "Your original cocktail recipe was featured on the platform and received over 100 votes from the community.",
    icon: "heart",
    earned: true,
    category: "community"
  },
  {
    id: "5",
    name: "Master Mixologist",
    description: "Completed advanced mixology course",
    fullDescription: "Completed the comprehensive Master Mixology certification course with distinction.",
    icon: "school",
    earned: true,
    category: "lessons"
  },
  {
    id: "6",
    name: "Speed Demon",
    description: "Won speed bartending challenge",
    fullDescription: "Set a new record in the speed bartending challenge, serving 5 perfect cocktails in under 3 minutes.",
    icon: "speedometer",
    earned: true,
    category: "challenges"
  },
];

export default function EditProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [reorderableBadges, setReorderableBadges] = useState<Badge[]>(mockEarnedBadges);
  const [name, setName] = useState(user?.displayName || "");
  const [bio, setBio] = useState("Whiskey enthusiast exploring the world of premium spirits. Love discovering hidden speakeasies and craft cocktails.");
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Edit Profile',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSave}
          style={styles.headerButton}
          activeOpacity={0.7}
          disabled={saving}
        >
          <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [nav, saving]);

  const moveBadge = (fromIndex: number, toIndex: number) => {
    const newBadges = [...reorderableBadges];
    const [removed] = newBadges.splice(fromIndex, 1);
    newBadges.splice(toIndex, 0, removed);
    setReorderableBadges(newBadges);
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to edit your profile');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setSaving(true);

    try {
      // Update Firebase Auth display name
      await updateProfile(user, {
        displayName: name.trim()
      });

      // Save full profile to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        displayName: name.trim(),
        bio: bio.trim(),
        featuredBadges: reorderableBadges.slice(0, 3).map(b => b.id),
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Profile updated successfully');
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => nav.goBack() }
      ]);
    } catch (error: any) {
      console.error('❌ Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Basic Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={colors.subtext}
              keyboardAppearance="dark"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Bio</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself"
              placeholderTextColor={colors.subtext}
              multiline
              numberOfLines={3}
              keyboardAppearance="dark"
            />
          </View>
        </View>

        {/* Badge Reordering Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badge Display Order</Text>
          <Text style={styles.sectionSubtitle}>
            Use the arrows or long press and drag to reorder your badges
          </Text>
          
          <FlatList
            data={reorderableBadges}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <View style={styles.reorderableBadge}>
                <View style={styles.reorderableBadgeContent}>
                  <MaterialCommunityIcons 
                    name={item.icon as any} 
                    size={24} 
                    color={colors.accent} 
                  />
                  <View style={styles.reorderableBadgeText}>
                    <Text style={styles.reorderableBadgeName}>{item.name}</Text>
                    <Text style={styles.reorderableBadgeDesc}>{item.description}</Text>
                  </View>
                </View>
                <View style={styles.dragHandle}>
                  <View style={styles.reorderControls}>
                    <TouchableOpacity 
                      onPress={() => {
                        if (index > 0) moveBadge(index, index - 1);
                      }}
                      style={[styles.reorderButton, index === 0 && styles.disabledButton]}
                      disabled={index === 0}
                    >
                      <Ionicons 
                        name="chevron-up" 
                        size={18} 
                        color={index === 0 ? colors.muted : colors.text} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => {
                        if (index < reorderableBadges.length - 1) moveBadge(index, index + 1);
                      }}
                      style={[styles.reorderButton, index === reorderableBadges.length - 1 && styles.disabledButton]}
                      disabled={index === reorderableBadges.length - 1}
                    >
                      <Ionicons 
                        name="chevron-down" 
                        size={18} 
                        color={index === reorderableBadges.length - 1 ? colors.muted : colors.text} 
                      />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    style={styles.dragGrip}
                    onLongPress={() => {
                      console.log('Long press to initiate drag for:', item.name);
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons 
                      name="drag" 
                      size={20} 
                      color={colors.subtext} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
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
  headerButton: {
    padding: spacing(1),
  },
  saveButton: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: spacing(4),
  },
  section: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(3),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(1),
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(3),
  },
  inputContainer: {
    marginBottom: spacing(2),
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1),
  },
  textInput: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(2),
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.line,
  },
  textAreaInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reorderableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  reorderableBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing(2),
  },
  reorderableBadgeText: {
    flex: 1,
  },
  reorderableBadgeName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  reorderableBadgeDesc: {
    fontSize: 12,
    color: colors.subtext,
  },
  dragHandle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  reorderControls: {
    flexDirection: 'column',
    gap: spacing(1),
  },
  reorderButton: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    padding: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
  },
  dragIndicator: {
    flexDirection: 'column',
    gap: 2,
    paddingHorizontal: spacing(1),
  },
  dragLine: {
    width: 12,
    height: 2,
    backgroundColor: colors.subtext,
    borderRadius: 1,
  },
  disabledButton: {
    opacity: 0.3,
  },
  dragGrip: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    padding: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing(1),
  },
});