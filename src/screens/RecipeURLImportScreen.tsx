/**
 * Recipe URL Import Screen
 * Allows users to import recipes from URLs (paste or share extension)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Keyboard,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { log } from '../lib/logger';
import { useXPSystem } from '../store/useXPSystem';

export default function RecipeURLImportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { earnXP } = useXPSystem();

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if URL was passed via share extension or deep link
  useEffect(() => {
    const params = route.params as any;
    if (params?.url) {
      setUrl(params.url);
    }
  }, [route.params]);

  const handleImport = async () => {
    if (!url.trim()) {
      Alert.alert('Enter URL', 'Please enter a recipe URL to import');
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      Alert.alert('Invalid URL', 'Please enter a valid URL (e.g., https://example.com/recipe)');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      log.info('RecipeURLImportScreen', 'Importing recipe from URL', { url });

      // TODO: Implement actual URL scraping/AI extraction
      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Award XP for importing recipe
      earnXP(10, 'other', 'Imported recipe from URL');

      Alert.alert(
        'Recipe Imported!',
        'The recipe has been saved to your collection.',
        [
          {
            text: 'View Recipe',
            onPress: () => {
              // TODO: Navigate to recipe detail
              navigation.goBack();
            },
          },
          {
            text: 'Import Another',
            onPress: () => setUrl(''),
          },
        ]
      );
    } catch (error) {
      log.error('RecipeURLImportScreen', 'Error importing recipe', error);
      Alert.alert(
        'Import Failed',
        'Could not import the recipe. Make sure the URL contains a valid recipe.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    // Note: Clipboard API requires expo-clipboard
    // For now, show a message to paste manually
    Alert.alert(
      'Paste URL',
      'Tap the URL field and paste the recipe link from your clipboard',
      [{ text: 'OK' }]
    );
  };

  const popularSources = [
    { name: 'Liquor.com', icon: '🍸', url: 'https://www.liquor.com' },
    { name: 'Difford\'s Guide', icon: '📖', url: 'https://www.diffordsguide.com' },
    { name: 'Punch', icon: '🥊', url: 'https://punchdrink.com' },
    { name: 'Imbibe', icon: '📰', url: 'https://imbibemagazine.com' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="link" size={48} color={colors.gold} />
          </View>
          <Text style={styles.title}>Import from URL</Text>
          <Text style={styles.subtitle}>
            Paste a recipe link from any website or use the share button in your browser
          </Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Recipe URL</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="https://example.com/recipe"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleImport}
              editable={!loading}
            />
            {url.length > 0 && !loading && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setUrl('')}
              >
                <Ionicons name="close-circle" size={20} color={colors.subtext} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.pasteButton}
            onPress={handlePasteFromClipboard}
            disabled={loading}
          >
            <Ionicons name="clipboard-outline" size={20} color={colors.accent} />
            <Text style={styles.pasteButtonText}>Paste from Clipboard</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.importButton, loading && styles.importButtonDisabled]}
          onPress={handleImport}
          disabled={loading || !url.trim()}
        >
          {loading ? (
            <>
              <ActivityIndicator color={colors.goldText} />
              <Text style={styles.importButtonText}>Importing...</Text>
            </>
          ) : (
            <>
              <Ionicons name="download-outline" size={24} color={colors.goldText} />
              <Text style={styles.importButtonText}>Import Recipe</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Popular Sources</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.sourcesGrid}>
          {popularSources.map((source) => (
            <TouchableOpacity
              key={source.name}
              style={styles.sourceCard}
              onPress={() => Alert.alert(source.name, `Visit ${source.url} to find recipes`)}
            >
              <Text style={styles.sourceIcon}>{source.icon}</Text>
              <Text style={styles.sourceName}>{source.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="information-circle-outline" size={24} color={colors.accent} />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>How to use Share Extension</Text>
            <Text style={styles.tipText}>
              1. Open a recipe in Safari or any browser{'\n'}
              2. Tap the Share button{'\n'}
              3. Select "KOOPE" from the share menu{'\n'}
              4. Recipe will be imported automatically
            </Text>
          </View>
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
    padding: spacing(3),
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing(4),
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.gold}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  subtitle: {
    fontSize: 15,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: spacing(3),
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(2),
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing(2),
  },
  clearButton: {
    padding: spacing(0.5),
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.5),
    marginTop: spacing(1.5),
    gap: spacing(1),
  },
  pasteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingVertical: spacing(2),
    gap: spacing(1.5),
    marginBottom: spacing(4),
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.goldText,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  dividerText: {
    fontSize: 13,
    color: colors.subtext,
    marginHorizontal: spacing(2),
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  sourcesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
    marginBottom: spacing(3),
  },
  sourceCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(2),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  sourceIcon: {
    fontSize: 32,
    marginBottom: spacing(1),
  },
  sourceName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: `${colors.accent}10`,
    borderRadius: radii.md,
    padding: spacing(2),
    gap: spacing(2),
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: spacing(0.5),
  },
  tipText: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 20,
  },
});
