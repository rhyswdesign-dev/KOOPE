import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { log } from '../lib/logger';

export default function URLRecipeInputScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!url.trim()) {
      Alert.alert('Required Field', 'Please enter a recipe URL');
      return;
    }

    if (!isValidURL(url.trim())) {
      Alert.alert('Invalid URL', 'Please enter a valid URL');
      return;
    }

    setLoading(true);
    try {
      // Navigate to AI Recipe Format screen with the URL
      nav.navigate('AIRecipeFormat', { recipeUrl: url.trim() });
    } catch (error: any) {
      log.error('URLRecipeInputScreen', 'URL processing error', error, { url: url.trim() });
      Alert.alert('Error', 'Failed to process URL');
    } finally {
      setLoading(false);
    }
  };

  const isValidURL = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      // For now, just focus the input - clipboard access requires additional setup
      Alert.alert('Paste URL', 'Please paste your recipe URL in the text field');
    } catch (error) {
      log.error('URLRecipeInputScreen', 'Clipboard error', error);
    }
  };

  const handleVoiceInput = () => {
    nav.navigate('VoiceRecipe');
  };

  const handleCameraInput = () => {
    nav.navigate('OCRCapture');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Recipe</Text>
          <Text style={styles.subtitle}>
            Choose how you'd like to add your recipe
          </Text>
        </View>

        {/* URL Input Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>From URL</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="https://example.com/recipe"
              placeholderTextColor={colors.subtext}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity
              style={styles.pasteButton}
              onPress={handlePasteFromClipboard}
            >
              <Ionicons name="clipboard-outline" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>
            Supported: AllRecipes, Food Network, NYTimes Cooking, and more
          </Text>
        </View>

        {/* Alternative Input Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Options</Text>
          <View style={styles.alternativeOptions}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleCameraInput}
            >
              <Ionicons name="camera" size={24} color={colors.accent} />
              <Text style={styles.optionButtonText}>Scan Recipe</Text>
              <Text style={styles.optionButtonSubtext}>Take photo of recipe</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleVoiceInput}
            >
              <Ionicons name="mic" size={24} color={colors.accent} />
              <Text style={styles.optionButtonText}>Voice Input</Text>
              <Text style={styles.optionButtonSubtext}>Dictate your recipe</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.exampleSection}>
          <Text style={styles.exampleTitle}>Popular Recipe Sites:</Text>
          <Text style={styles.exampleText}>• AllRecipes.com</Text>
          <Text style={styles.exampleText}>• Food Network</Text>
          <Text style={styles.exampleText}>• NYTimes Cooking</Text>
          <Text style={styles.exampleText}>• Epicurious</Text>
          <Text style={styles.exampleText}>• Bon Appétit</Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Processing...' : 'Extract Recipe'}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color={colors.white}
            style={styles.buttonIcon}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => nav.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
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
    padding: spacing(2),
  },
  header: {
    marginBottom: spacing(4),
  },
  title: {
    fontSize: fonts.h1,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.subtext,
    marginTop: spacing(0.5),
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing(3),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  input: {
    flex: 1,
    padding: spacing(2),
    fontSize: 16,
    color: colors.text,
    minHeight: 50,
  },
  pasteButton: {
    padding: spacing(2),
    marginRight: spacing(0.5),
  },
  helperText: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: spacing(1),
    fontStyle: 'italic',
  },
  exampleSection: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1),
  },
  exampleText: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(0.5),
  },
  buttonContainer: {
    padding: spacing(2),
    paddingBottom: spacing(3),
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    padding: spacing(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(1.5),
  },
  submitButtonDisabled: {
    backgroundColor: colors.subtext,
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  buttonIcon: {
    marginLeft: spacing(1),
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: radii.md,
    padding: spacing(2.5),
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.subtext,
    fontSize: 16,
    fontWeight: '600',
  },
  alternativeOptions: {
    gap: spacing(2),
  },
  optionButton: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(2.5),
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing(1),
  },
  optionButtonSubtext: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: spacing(0.5),
  },
});