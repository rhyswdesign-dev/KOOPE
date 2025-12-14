import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { OCRService } from '../services/ocrService';
import { AIRecipeFormatter } from '../services/aiRecipeFormatter';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { log } from '../lib/logger';

export default function OCRCaptureScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [visionLoading, setVisionLoading] = useState(false);

  useLayoutEffect(() => {
    nav.setOptions({
      title: '📸 Scan Recipe',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
    });
  }, [nav]);

  const handleTakePhoto = async () => {
    try {
      setLoading(true);
      const result = await OCRService.takePhotoAndExtractText();

      if (result) {
        setExtractedText(result.text);
        setImageUri(result.imageUri);
      }
    } catch (error: any) {
      // With the updated OCR service, this shouldn't happen as it returns graceful messages
      log.error('OCRCaptureScreen', 'Unexpected error in handleTakePhoto', error);
      Alert.alert('Camera Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      setLoading(true);
      const result = await OCRService.pickImageAndExtractText();

      if (result) {
        setExtractedText(result.text);
        setImageUri(result.imageUri);
      }
    } catch (error: any) {
      // With the updated OCR service, this shouldn't happen as it returns graceful messages
      log.error('OCRCaptureScreen', 'Unexpected error in handlePickFromGallery', error);
      Alert.alert('Gallery Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseExtractedText = () => {
    if (!extractedText) return;

    // Create a mock recipe object with the extracted text
    const mockRecipe = {
      id: `ocr-${Date.now()}`,
      title: 'Recipe from Image',
      sourceUrl: null,
      imageUrl: imageUri,
      extractedText: extractedText,
      userNotes: 'Recipe extracted from image using OCR',
      createdAt: new Date(),
    };

    // Navigate to AI formatting screen with the extracted text
    nav.navigate('AIRecipeFormat', { recipe: mockRecipe });
  };

  const handleFormatWithAI = () => {
    if (!extractedText) return;

    // Create a mock recipe object with the extracted text
    const mockRecipe = {
      id: `ocr-${Date.now()}`,
      title: 'Recipe from Image',
      sourceUrl: null,
      imageUrl: imageUri,
      extractedText: extractedText,
      userNotes: 'Recipe extracted from image using OCR',
      createdAt: new Date(),
    };

    // Navigate to AI formatting screen with the extracted text
    nav.navigate('AIRecipeFormat', { recipe: mockRecipe });
  };

  const handleVisionAnalysis = async () => {
    if (!imageUri) {
      Alert.alert('Error', 'No image available for analysis');
      return;
    }

    try {
      setVisionLoading(true);

      // Use AI vision to analyze the recipe image directly
      const analysisResult = await AIRecipeFormatter.analyzeRecipeImage(imageUri, 'cocktail');

      // Create recipe object for AI formatting screen
      const mockRecipe = {
        id: `vision-${Date.now()}`,
        title: analysisResult.title,
        sourceUrl: null,
        imageUrl: imageUri,
        extractedText: `Vision Analysis: ${analysisResult.description}`,
        userNotes: 'Recipe analyzed using AI vision',
        createdAt: new Date(),
        visionAnalysis: analysisResult, // Pre-analyzed result
      };

      // Navigate directly to a pre-filled result or AI formatting screen
      nav.navigate('AIRecipeFormat', { recipe: mockRecipe });

    } catch (error: any) {
      log.error('OCRCaptureScreen', 'Vision analysis failed', error);
      Alert.alert(
        'Vision Analysis Failed',
        error.message || 'Could not analyze the recipe image. Please try using text extraction instead.',
        [
          { text: 'Try Text Extraction', onPress: handleFormatWithAI },
          { text: 'OK' }
        ]
      );
    } finally {
      setVisionLoading(false);
    }
  };

  const handleRetry = () => {
    setExtractedText(null);
    setImageUri(null);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>📸 Processing image...</Text>
          <Text style={styles.loadingSubtext}>Extracting text from your recipe</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (extractedText) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Success Header */}
          <View style={styles.successHeader}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={styles.successTitle}>Text Extracted!</Text>
            <Text style={styles.successSubtitle}>
              Found {extractedText.length} characters from your image
            </Text>
          </View>

          {/* Image Preview */}
          {imageUri && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            </View>
          )}

          {/* Extracted Text */}
          <View style={styles.textContainer}>
            <Text style={styles.textLabel}>Extracted Text:</Text>
            <ScrollView style={styles.textPreview} nestedScrollEnabled>
              <Text style={styles.extractedText}>{extractedText}</Text>
            </ScrollView>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity style={styles.primaryButton} onPress={handleFormatWithAI}>
            <Ionicons name="sparkles" size={20} color={colors.white} />
            <Text style={styles.primaryButtonText}>✨ Format with AI</Text>
          </TouchableOpacity>

          {imageUri && (
            <TouchableOpacity
              style={[styles.visionButton, visionLoading && styles.disabledButton]}
              onPress={handleVisionAnalysis}
              disabled={visionLoading}
            >
              {visionLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons name="eye" size={20} color={colors.white} />
              )}
              <Text style={styles.visionButtonText}>
                {visionLoading ? 'Analyzing...' : '👁️ AI Vision Analysis'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.secondaryButton} onPress={handleRetry}>
            <Ionicons name="camera" size={20} color={colors.accent} />
            <Text style={styles.secondaryButtonText}>Take Another Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => nav.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.initialContent}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="camera" size={64} color={colors.accent} />
          <Text style={styles.title}>Scan a Recipe</Text>
          <Text style={styles.subtitle}>
            Take a photo of a recipe or choose one from your gallery. We'll extract the text and format it with AI.
          </Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>📋 For best results:</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.instructionText}>Good lighting and clear text</Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.instructionText}>Hold camera steady</Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.instructionText}>Fill frame with recipe text</Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.instructionText}>Avoid shadows and glare</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleTakePhoto}>
            <Ionicons name="camera" size={24} color={colors.white} />
            <Text style={styles.primaryButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handlePickFromGallery}>
            <Ionicons name="images" size={20} color={colors.accent} />
            <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>
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
  content: {
    flex: 1,
    padding: spacing(2),
  },
  initialContent: {
    flexGrow: 1,
    padding: spacing(2),
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(4),
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing(2),
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: spacing(0.5),
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing(4),
  },
  title: {
    fontSize: fonts.h1,
    fontWeight: '900',
    color: colors.text,
    marginTop: spacing(2),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.subtext,
    marginTop: spacing(1),
    textAlign: 'center',
    lineHeight: 22,
  },
  instructionsContainer: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginBottom: spacing(4),
    borderWidth: 1,
    borderColor: colors.line,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  instructionsList: {
    gap: spacing(1.5),
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  instructionText: {
    fontSize: 14,
    color: colors.subtext,
    flex: 1,
  },
  buttonContainer: {
    gap: spacing(2),
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    gap: spacing(1.5),
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  visionButton: {
    backgroundColor: '#8B5CF6', // Purple color for vision feature
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    gap: spacing(1.5),
    marginTop: spacing(2),
  },
  visionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    gap: spacing(1.5),
    marginTop: spacing(4), // Increased spacing above "Take Another Photo" button
  },
  secondaryButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    marginTop: spacing(1),
  },
  cancelButtonText: {
    color: colors.subtext,
    fontSize: 16,
    fontWeight: '600',
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing(1),
  },
  successSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: spacing(0.5),
    textAlign: 'center',
  },
  imageContainer: {
    marginBottom: spacing(3),
    alignItems: 'center',
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: radii.md,
    backgroundColor: colors.card,
  },
  textContainer: {
    marginBottom: spacing(3),
  },
  textLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1),
  },
  textPreview: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(2),
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.line,
  },
  extractedText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});