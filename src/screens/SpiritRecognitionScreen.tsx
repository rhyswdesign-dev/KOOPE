import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { HomeBarService, BarIngredient } from '../services/homeBarService';
import { AIRecommendationEngine } from '../services/aiRecommendationEngine';
import { GoogleVisionService } from '../services/googleVisionService';
import { ScrollView } from 'react-native';
import { log } from '../lib/logger';

const { width, height } = Dimensions.get('window');

export default function SpiritRecognitionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState(CameraType.back);
  const [analyzing, setAnalyzing] = useState(false);
  const [recognizedSpirit, setRecognizedSpirit] = useState<Partial<BarIngredient> | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cocktailRecommendations, setCocktailRecommendations] = useState<any[]>([]);
  const [spiritEducation, setSpiritEducation] = useState<any>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        setAnalyzing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: false,
        });

        setCapturedImage(photo.uri);
        await analyzeImage(photo.uri);
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
        setAnalyzing(false);
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setAnalyzing(true);
        setCapturedImage(result.assets[0].uri);
        await analyzeImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const analyzeImage = async (imageUri: string) => {
    try {
      log.info('SpiritRecognitionScreen', 'Analyzing image with Google Vision API', { imageUri });

      // Use Google Vision Service for real image analysis
      const result = await GoogleVisionService.analyzeImage(imageUri);

      log.info('SpiritRecognitionScreen', 'Vision API results', {
        labelsCount: result.labels.length,
        textCount: result.text?.length || 0,
        confidence: result.confidence,
      });

      // Use the enhanced spirit matching from Google Vision Service
      const matchedSpirit = GoogleVisionService.matchSpirit(result);

      if (matchedSpirit && matchedSpirit.name) {
        // Convert matched spirit to BarIngredient format
        const recognizedIngredient: Partial<BarIngredient> = {
          id: `scanned-${Date.now()}`,
          name: matchedSpirit.name,
          category: (matchedSpirit.category || 'spirit') as BarIngredient['category'],
          subcategory: matchedSpirit.subcategory,
          brand: matchedSpirit.brand,
          abv: matchedSpirit.abv,
          addedAt: new Date(),
        };

        setRecognizedSpirit(recognizedIngredient);
        await loadCocktailRecommendations(recognizedIngredient);
        await loadSpiritEducation(recognizedIngredient);
      } else {
        log.warn('SpiritRecognitionScreen', 'Spirit not recognized from vision results');

        Alert.alert(
          'Spirit Not Recognized',
          'We couldn\'t identify this spirit. Try taking a clearer photo of the label, or add it manually to your bar.',
          [
            { text: 'Try Again', onPress: () => retryCapture() },
            { text: 'Add Manually', onPress: () => handleManualAdd() },
          ]
        );
      }
    } catch (error) {
      log.error('SpiritRecognitionScreen', 'Error analyzing image', error);
      Alert.alert(
        'Analysis Failed',
        'Failed to analyze the image. Please try again or add the spirit manually.',
        [
          { text: 'Try Again', onPress: () => retryCapture() },
          { text: 'Add Manually', onPress: () => handleManualAdd() },
        ]
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const retryCapture = () => {
    setCapturedImage(null);
    setRecognizedSpirit(null);
  };

  const handleManualAdd = () => {
    // In a real app, this would open a manual entry form
    Alert.alert(
      'Manual Entry',
      'Manually add spirits to your home bar by searching our catalog or scanning the barcode.',
      [{ text: 'Got it', style: 'default' }]
    );
  };

  const loadCocktailRecommendations = async (spirit: Partial<BarIngredient>) => {
    setLoadingRecommendations(true);
    try {
      // Get mock home bar data
      const mockHomeBar = await HomeBarService.getMockHomeBar();

      // Get cocktail recommendations based on the recognized spirit
      const recommendations = await AIRecommendationEngine.getRecommendationsForSpirit(
        spirit,
        mockHomeBar,
        {
          favoriteSpirits: [spirit.category || 'whiskey'],
          preferredStrength: 'medium',
          flavorProfile: ['smooth', 'balanced'],
          experienceLevel: 'intermediate'
        }
      );

      setCocktailRecommendations(recommendations.slice(0, 3)); // Show top 3
    } catch (error) {
      log.error('SpiritRecognitionScreen', 'Error loading cocktail recommendations', error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const loadSpiritEducation = async (spirit: Partial<BarIngredient>) => {
    try {
      const education = await HomeBarService.getSpiritEducation(spirit.category || 'whiskey');
      setSpiritEducation(education);
    } catch (error) {
      log.error('SpiritRecognitionScreen', 'Error loading spirit education', error);
    }
  };

  const addToBar = () => {
    if (!recognizedSpirit) return;

    Alert.alert(
      'Add to Home Bar',
      `Add ${recognizedSpirit.name} to your home bar?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: () => {
            Alert.alert('Added!', `${recognizedSpirit.name} has been added to your home bar.`);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleCocktailPress = (cocktail: any) => {
    navigation.navigate('CocktailDetail', { cocktailId: cocktail.id });
  };

  const handleLearnMore = () => {
    if (spiritEducation) {
      Alert.alert(
        `About ${spiritEducation.name}`,
        spiritEducation.description,
        [
          { text: 'Got it!' },
          { text: 'View Lessons', onPress: () => navigation.navigate('Main', { screen: 'Lessons' }) }
        ]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Requesting camera permissions...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-off" size={64} color={colors.muted} />
        <Text style={styles.errorText}>Camera access denied</Text>
        <Text style={styles.errorSubtext}>
          Please enable camera permissions in your device settings to scan spirits.
        </Text>
        <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
          <Ionicons name="images" size={20} color={colors.bg} />
          <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (capturedImage && recognizedSpirit) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Spirit Recognized!</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.resultContainer}>
            <Image source={{ uri: capturedImage }} style={styles.capturedImage} />

            <View style={styles.spiritInfo}>
              <View style={styles.spiritHeader}>
                <Ionicons name="wine" size={32} color={colors.accent} />
                <Text style={styles.spiritName}>{recognizedSpirit.name}</Text>
              </View>

              <View style={styles.spiritDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category:</Text>
                  <Text style={styles.detailValue}>{recognizedSpirit.category}</Text>
                </View>

                {recognizedSpirit.subcategory && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>{recognizedSpirit.subcategory}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tags:</Text>
                  <Text style={styles.detailValue}>{recognizedSpirit.tags?.join(', ')}</Text>
                </View>
              </View>

              {/* Spirit Education Section */}
              {spiritEducation && (
                <View style={styles.educationSection}>
                  <View style={styles.educationHeader}>
                    <Ionicons name="school" size={20} color={colors.accent} />
                    <Text style={styles.educationTitle}>Learn About {spiritEducation.name}</Text>
                  </View>
                  <Text style={styles.educationSnippet}>
                    {spiritEducation.description.substring(0, 120)}...
                  </Text>
                  <TouchableOpacity style={styles.learnMoreButton} onPress={handleLearnMore}>
                    <Text style={styles.learnMoreText}>Learn More</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.actions}>
                <TouchableOpacity style={styles.addButton} onPress={addToBar}>
                  <Ionicons name="add-circle" size={20} color={colors.bg} />
                  <Text style={styles.addButtonText}>Add to My Bar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.retryButton} onPress={retryCapture}>
                  <Ionicons name="camera" size={20} color={colors.accent} />
                  <Text style={styles.retryButtonText}>Try Another</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Cocktail Recommendations Section */}
            <View style={styles.recommendationsSection}>
              <View style={styles.recommendationsHeader}>
                <Ionicons name="sparkles" size={20} color={colors.accent} />
                <Text style={styles.recommendationsTitle}>Cocktails You Can Make</Text>
              </View>

              {loadingRecommendations ? (
                <View style={styles.loadingRecommendations}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={styles.loadingText}>Finding perfect cocktails...</Text>
                </View>
              ) : (
                <View style={styles.cocktailGrid}>
                  {cocktailRecommendations.map((cocktail, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.cocktailCard}
                      onPress={() => handleCocktailPress(cocktail)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.cocktailImageContainer}>
                        <Ionicons name="wine" size={24} color={colors.accent} />
                      </View>
                      <View style={styles.cocktailCardInfo}>
                        <Text style={styles.cocktailCardTitle}>{cocktail.name}</Text>
                        <Text style={styles.cocktailCardSubtitle}>{cocktail.category}</Text>
                        <View style={styles.cocktailMeta}>
                          <Text style={styles.cocktailDifficulty}>{cocktail.difficulty}</Text>
                          <View style={styles.cocktailRating}>
                            <Ionicons name="star" size={12} color={colors.accent} />
                            <Text style={styles.ratingText}>{cocktail.rating}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (capturedImage) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={retryCapture} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analyzing...</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.analyzingContainer}>
          <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
          <View style={styles.analyzingOverlay}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.analyzingText}>Recognizing spirit...</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Spirit</Text>
        <TouchableOpacity onPress={pickImage} style={styles.galleryIcon}>
          <Ionicons name="images" size={24} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <Camera style={styles.camera} type={type} ref={cameraRef}>
        <View style={styles.cameraOverlay}>
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              Position the spirit bottle in the frame and tap to capture
            </Text>
          </View>

          <View style={styles.targetFrame} />

          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => setType(type === CameraType.back ? CameraType.front : CameraType.back)}
            >
              <Ionicons name="camera-reverse" size={24} color={colors.bg} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
              disabled={analyzing}
            >
              {analyzing ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <View style={styles.captureInner} />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
              <Ionicons name="images" size={24} color={colors.bg} />
            </TouchableOpacity>
          </View>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(4),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backButton: {
    padding: spacing(1),
  },
  headerTitle: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  galleryIcon: {
    padding: spacing(1),
  },
  loadingText: {
    fontSize: fonts.body,
    color: colors.text,
    marginTop: spacing(2),
  },
  errorText: {
    fontSize: fonts.h3,
    fontWeight: '600',
    color: colors.error,
    marginVertical: spacing(2),
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: fonts.body,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing(4),
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  instructionContainer: {
    alignItems: 'center',
    paddingTop: spacing(6),
    paddingHorizontal: spacing(4),
  },
  instructionText: {
    fontSize: fonts.body,
    color: colors.bg,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderRadius: radii.md,
  },
  targetFrame: {
    width: width * 0.8,
    height: height * 0.4,
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
    borderRadius: radii.lg,
    backgroundColor: 'transparent',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(8),
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.bg,
  },
  captureInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.bg,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing(1),
  },
  galleryButtonText: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  resultContainer: {
    padding: spacing(3),
  },
  analyzingContainer: {
    flex: 1,
    position: 'relative',
  },
  capturedImage: {
    width: '100%',
    height: height * 0.4,
    borderRadius: radii.md,
    marginBottom: spacing(3),
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.md,
    margin: spacing(3),
  },
  analyzingText: {
    color: colors.bg,
    fontSize: fonts.body,
    marginTop: spacing(2),
    fontWeight: '500',
  },
  spiritInfo: {
    backgroundColor: colors.card,
    padding: spacing(3),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  spiritHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(3),
    gap: spacing(2),
  },
  spiritName: {
    fontSize: fonts.h2,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  spiritDetails: {
    marginBottom: spacing(4),
    gap: spacing(2),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: fonts.body,
    color: colors.subtext,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: fonts.body,
    color: colors.text,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actions: {
    gap: spacing(2),
  },
  addButton: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(3),
    borderRadius: radii.md,
    gap: spacing(1),
  },
  addButtonText: {
    color: colors.bg,
    fontSize: fonts.body,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(3),
    borderRadius: radii.md,
    gap: spacing(1),
  },
  retryButtonText: {
    color: colors.accent,
    fontSize: fonts.body,
    fontWeight: '600',
  },
  educationSection: {
    marginBottom: spacing(3),
    padding: spacing(3),
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  educationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginBottom: spacing(2),
  },
  educationTitle: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.text,
  },
  educationSnippet: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
    marginBottom: spacing(2),
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  learnMoreText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  recommendationsSection: {
    marginTop: spacing(3),
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginBottom: spacing(3),
  },
  recommendationsTitle: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.text,
  },
  loadingRecommendations: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
    paddingVertical: spacing(4),
  },
  cocktailGrid: {
    gap: spacing(2),
  },
  cocktailCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
  },
  cocktailImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cocktailCardInfo: {
    flex: 1,
  },
  cocktailCardTitle: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  cocktailCardSubtitle: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: spacing(1),
  },
  cocktailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  cocktailDifficulty: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cocktailRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  ratingText: {
    fontSize: 11,
    color: colors.subtext,
    fontWeight: '500',
  },
});