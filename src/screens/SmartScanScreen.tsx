/**
 * Smart Scan Screen
 * Universal camera that AI-detects bottles, recipes, or ingredients
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
  Image,
  BackHandler,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { GoogleVisionService } from '../services/googleVisionService';
import CameraCapture from '../components/camera/CameraCapture';
import type { CameraStackParamList } from '../navigation/CameraStack';
import { log } from '../lib/logger';
import { InventoryService } from '../services/inventoryService';
import { useUser } from '../store/useUser';
import { useSubscription } from '../contexts/SubscriptionContext';
import DataConsentDialog from '../components/modals/DataConsentDialog';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SmartScanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CameraStackParamList>>();
  const { user } = useUser();
  const { isPaidSubscriber } = useSubscription();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<{
    type: 'bottle' | 'recipe' | 'ingredient' | 'unknown';
    data: any;
  } | null>(null);
  const [scansRemaining, setScansRemaining] = useState<number>(10);
  const [canScan, setCanScan] = useState(true);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [hasGivenConsent, setHasGivenConsent] = useState(false);

  // Check consent status on mount
  useEffect(() => {
    checkConsentStatus();
  }, []);

  // Show camera on mount after checking consent
  useEffect(() => {
    if (hasGivenConsent) {
      setCameraVisible(true);
    }
  }, [hasGivenConsent]);

  const checkConsentStatus = async () => {
    try {
      const consentGiven = await AsyncStorage.getItem('data_consent_given');
      if (consentGiven === 'true') {
        setHasGivenConsent(true);
      } else {
        // Show consent dialog on first use
        setShowConsentDialog(true);
      }
    } catch (error) {
      log.error('SmartScanScreen', 'Error checking consent status', error);
      // Default to showing consent dialog
      setShowConsentDialog(true);
    }
  };

  const handleConsentAccept = async () => {
    try {
      await AsyncStorage.setItem('data_consent_given', 'true');
      setHasGivenConsent(true);
      setShowConsentDialog(false);
      setCameraVisible(true);
    } catch (error) {
      log.error('SmartScanScreen', 'Error saving consent', error);
    }
  };

  const handleConsentDecline = () => {
    // For paid users who decline
    if (isPaidSubscriber) {
      setShowConsentDialog(false);
      setHasGivenConsent(true); // Allow them to proceed
      setCameraVisible(true);
    } else {
      // Free tier users must accept
      Alert.alert(
        'Data Sharing Required',
        'Data sharing is required for free tier users. Upgrade to Premium for unlimited scans and optional data sharing.',
        [
          {
            text: 'Upgrade to Premium',
            onPress: () => {
              // TODO: Navigate to subscription screen
              navigation.goBack();
            },
          },
          {
            text: 'Go Back',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };

  // Check scan limits when component mounts or user changes
  useEffect(() => {
    checkScanLimits();
  }, [user, isPaidSubscriber]);

  const checkScanLimits = async () => {
    const scanStatus = await InventoryService.canUserScan(user?.id || null, isPaidSubscriber);
    setScansRemaining(scanStatus.scansRemaining);
    setCanScan(scanStatus.canScan);

    // If user has reached limit, show alert
    if (!scanStatus.canScan && !scanStatus.isGuest) {
      Alert.alert(
        'Scan Limit Reached',
        'You\'ve used all 10 free scans this month. Upgrade to Premium for unlimited scans!',
        [
          {
            text: 'Upgrade to Premium',
            onPress: () => {
              // TODO: Navigate to subscription screen
              navigation.goBack();
            },
          },
          {
            text: 'Maybe Later',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };

  // Handle back button - go back to CameraHub
  useEffect(() => {
    const backAction = () => {
      if (cameraVisible) {
        // If camera is visible, close it and go back to hub
        navigation.goBack();
        return true;
      }
      return false; // Allow default back action
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [cameraVisible, navigation]);

  const handleImageCaptured = async (uri: string) => {
    // Check scan limit before processing
    if (!canScan && !isPaidSubscriber) {
      Alert.alert(
        'Scan Limit Reached',
        'You\'ve used all 10 free scans this month. Upgrade to Premium for unlimited scans!',
        [
          { text: 'OK', onPress: () => setCameraVisible(true) },
        ]
      );
      return;
    }

    setCameraVisible(false);
    setImageUri(uri);
    setAnalyzing(true);

    try {
      log.info('SmartScanScreen', 'Analyzing captured image');

      // Analyze image with Google Vision
      const visionResult = await GoogleVisionService.analyzeImage(uri);

      // Detect what type of item was scanned
      const scanType = GoogleVisionService.detectScanType(visionResult);

      log.info('SmartScanScreen', 'Scan type detected', { scanType });

      // Process based on detected type
      switch (scanType) {
        case 'bottle': {
          const bottle = GoogleVisionService.matchBottle(visionResult);

          // Record scan for brand data
          await InventoryService.recordScan({
            userId: user?.id || null,
            scanType: 'bottle',
            itemName: bottle?.name,
            brandName: bottle?.brand,
            imageUrl: uri,
            addedToInventory: false, // Will be updated when user adds to inventory
          });

          // Update scan count
          await checkScanLimits();

          if (bottle) {
            setDetectionResult({ type: 'bottle', data: bottle });
            // Navigate to bottle detail screen with image for data collection
            navigation.replace('BottleDetail', { bottle, imageUri: uri });
          } else {
            // Bottle detected but not in database
            handleUnknownBottle(visionResult);
          }
          break;
        }

        case 'recipe': {
          // Recipe card detected - extract text
          const recipeText = visionResult.text?.join(' ') || '';

          // Record scan for brand data
          await InventoryService.recordScan({
            userId: user?.id || null,
            scanType: 'recipe',
            imageUrl: uri,
          });

          // Update scan count
          await checkScanLimits();

          setDetectionResult({ type: 'recipe', data: { text: recipeText } });
          Alert.alert(
            'Recipe Detected!',
            'I found a recipe card. Recipe extraction coming soon!',
            [
              { text: 'Try Again', onPress: () => handleRetake() },
              { text: 'OK', onPress: () => navigation.goBack() },
            ]
          );
          break;
        }

        case 'ingredient': {
          const ingredient = GoogleVisionService.matchIngredient(visionResult);

          // Record scan for brand data
          await InventoryService.recordScan({
            userId: user?.id || null,
            scanType: 'ingredient',
            itemName: ingredient?.name,
            imageUrl: uri,
            confidence: ingredient?.confidence,
            addedToInventory: false,
          });

          // Update scan count
          await checkScanLimits();

          if (ingredient) {
            setDetectionResult({ type: 'ingredient', data: ingredient });
            // Navigate to ingredient result
            navigation.replace('IngredientScan');
          } else {
            handleUnknownIngredient();
          }
          break;
        }

        case 'unknown':
        default: {
          handleUnknownItem();
          break;
        }
      }
    } catch (error) {
      log.error('SmartScanScreen', 'Error analyzing image', error);
      Alert.alert(
        'Analysis Failed',
        'Failed to analyze the image. Please try again.',
        [{ text: 'OK', onPress: () => handleRetake() }]
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUnknownBottle = (visionResult: any) => {
    const brandName = visionResult.text?.[0] || 'Unknown Brand';
    Alert.alert(
      'Bottle Not Recognized',
      `I detected a bottle (possibly ${brandName}), but it's not in my database yet. Would you like to add it manually?`,
      [
        {
          text: 'Add Manually',
          onPress: () => {
            navigation.navigate('ManualBottleEntry', {
              initialBrand: brandName !== 'Unknown Brand' ? brandName : undefined,
              imageUri: imageUri ?? undefined,
            });
          },
        },
        { text: 'Try Again', onPress: () => handleRetake() },
        { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleUnknownIngredient = () => {
    Alert.alert(
      'Ingredient Not Recognized',
      'Could not identify the ingredient. Try taking a clearer photo with good lighting.',
      [
        { text: 'Try Again', onPress: () => handleRetake() },
        { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleUnknownItem = () => {
    Alert.alert(
      "Can't Detect Item",
      "I couldn't determine what this is. What are you trying to scan?",
      [
        {
          text: 'Bottle',
          onPress: () => {
            // Retry as bottle
            Alert.alert('Bottle Scan', 'Take a clear photo of the bottle label.');
            handleRetake();
          },
        },
        {
          text: 'Recipe',
          onPress: () => {
            // Retry as recipe
            Alert.alert('Recipe Scan', 'Make sure the recipe text is clear and well-lit.');
            handleRetake();
          },
        },
        {
          text: 'Ingredient',
          onPress: () => {
            // Retry as ingredient
            Alert.alert('Ingredient Scan', 'Focus on a single ingredient.');
            handleRetake();
          },
        },
        { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleRetake = () => {
    setImageUri(null);
    setDetectionResult(null);
    setCameraVisible(true);
  };

  const handleCameraClose = () => {
    // Navigate back to CameraHub
    navigation.goBack();
  };

  const handleImportFromURL = () => {
    setCameraVisible(false);
    navigation.navigate('RecipeURLImport');
  };

  return (
    <>
      <DataConsentDialog
        visible={showConsentDialog}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
        isPaidUser={isPaidSubscriber}
      />

      <CameraCapture
        visible={cameraVisible}
        onClose={handleCameraClose}
        onImageCaptured={handleImageCaptured}
        title="Smart Scan"
        allowGallery={true}
        scansRemaining={scansRemaining}
        isPaidUser={isPaidSubscriber}
        isGuest={!user}
      />

      {/* Import from URL button - shows when camera is visible */}
      {cameraVisible && (
        <View style={styles.urlButtonContainer}>
          <TouchableOpacity
            style={styles.urlButton}
            onPress={handleImportFromURL}
          >
            <Ionicons name="link" size={24} color={colors.white} />
            <Text style={styles.urlButtonText}>URL</Text>
          </TouchableOpacity>
        </View>
      )}

      <SafeAreaView style={styles.container}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Smart Scan</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          {/* Preview Image */}
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          )}

          {/* Analyzing State */}
          {analyzing && (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={styles.analyzingTitle}>Analyzing with AI...</Text>
              <Text style={styles.analyzingSubtitle}>
                Detecting bottles, recipes, and ingredients
              </Text>
            </View>
          )}

          {/* Detection Result */}
          {detectionResult && !analyzing && (
            <View style={styles.resultContainer}>
              <View style={styles.resultBadge}>
                <Ionicons
                  name={
                    detectionResult.type === 'bottle'
                      ? 'wine'
                      : detectionResult.type === 'recipe'
                      ? 'document-text'
                      : 'leaf'
                  }
                  size={40}
                  color={colors.gold}
                />
              </View>
              <Text style={styles.resultTitle}>
                {detectionResult.type === 'bottle'
                  ? 'Bottle Detected'
                  : detectionResult.type === 'recipe'
                  ? 'Recipe Detected'
                  : 'Ingredient Detected'}
              </Text>
              <Text style={styles.resultSubtitle}>Processing...</Text>
            </View>
          )}

          {/* Action Buttons */}
          {!analyzing && imageUri && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                <Ionicons name="camera-outline" size={20} color={colors.text} />
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={handleCameraClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(3),
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: radii.lg,
    marginBottom: spacing(3),
  },
  analyzingContainer: {
    alignItems: 'center',
    gap: spacing(2),
  },
  analyzingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(2),
  },
  analyzingSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
  },
  resultContainer: {
    alignItems: 'center',
    gap: spacing(2),
    marginTop: spacing(4),
  },
  resultBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.gold}20`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.gold,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  resultSubtitle: {
    fontSize: 14,
    color: colors.subtext,
  },
  actions: {
    position: 'absolute',
    bottom: spacing(4),
    left: spacing(3),
    right: spacing(3),
    gap: spacing(2),
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  retakeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cancelButton: {
    alignItems: 'center',
    padding: spacing(2),
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.subtext,
  },
  urlButtonContainer: {
    position: 'absolute',
    top: spacing(8),
    right: spacing(3),
    zIndex: 1000,
  },
  urlButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    padding: spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  urlButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    marginTop: spacing(0.5),
  },
});
