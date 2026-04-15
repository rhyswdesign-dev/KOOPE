/**
 * Smart Scan Screen
 * Scan waterfall (all tiers):
 *
 *   barcode first (fastest) → AI label OCR → visual recognition → manual fallback
 *
 * Free tier is scan-unlimited; monetization gate is inventory capacity (10 bottles),
 * not scan capability.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { GoogleVisionService } from '../services/googleVisionService';
import { BarcodeService } from '../services/barcodeService';
import CameraCapture from '../components/camera/CameraCapture';
import type { CameraStackParamList } from '../navigation/CameraStack';
import { log } from '../lib/logger';
import { InventoryService } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import DataConsentDialog from '../components/modals/DataConsentDialog';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { challengeProgressService } from '../services/challengeProgressService';
import { achievementService } from '../services/achievementService';
import { ImageQualityService } from '../services/imageQualityService';

function getManualPrefill(productName: string | null, productBrand: string | null): { brand?: string; name?: string } {
  const cleanName = productName?.trim() || '';
  const cleanBrand = productBrand?.trim() || '';

  if (!cleanName && !cleanBrand) return {};
  if (!cleanBrand) return { brand: cleanName };
  if (!cleanName) return { brand: cleanBrand };

  const normalizedName = cleanName.toLowerCase();
  const normalizedBrand = cleanBrand.toLowerCase();
  if (normalizedName.startsWith(normalizedBrand)) {
    const trimmed = cleanName.slice(cleanBrand.length).trim();
    return { brand: cleanBrand, name: trimmed || undefined };
  }

  return { brand: cleanBrand, name: cleanName };
}

export default function SmartScanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CameraStackParamList>>();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const { isSubscriber } = useSubscription();

  const [cameraVisible, setCameraVisible] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanMode, setScanMode] = useState<'barcode' | 'ai' | null>(null);
  const [cameraMode, setCameraMode] = useState<'bottle' | 'recipe' | 'ingredients'>('bottle');
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [hasGivenConsent, setHasGivenConsent] = useState(false);
  // When true, camera opens in barcode-only mode (Stage 7 fallback)
  const [barcodeMode, setBarcodeMode] = useState(false);
  // Always keep full photo scanner enabled; GoogleVisionService handles API fallback.
  const aiScanEnabled = true;

  // Check consent status on mount
  useEffect(() => {
    checkConsentStatus();
  }, []);

  // Show/hide camera based on focus + consent.
  // Small delay avoids modal+jump glitch during stack transition.
  useEffect(() => {
    if (!isFocused) {
      setCameraVisible(false);
      return;
    }
    if (!hasGivenConsent || showConsentDialog) return;

    const timer = setTimeout(() => {
      setCameraVisible(true);
    }, 120);

    return () => clearTimeout(timer);
  }, [hasGivenConsent, isFocused, showConsentDialog]);

  const checkConsentStatus = async () => {
    try {
      const consentGiven = await AsyncStorage.getItem('data_consent_given');
      if (consentGiven === 'true') {
        setHasGivenConsent(true);
      } else {
        setShowConsentDialog(true);
      }
    } catch (error) {
      log.error('SmartScanScreen', 'Error checking consent status', error);
      setShowConsentDialog(true);
    }
  };

  const handleConsentAccept = async () => {
    try {
      await AsyncStorage.setItem('data_consent_given', 'true');
      setHasGivenConsent(true);
      setShowConsentDialog(false);
    } catch (error) {
      log.error('SmartScanScreen', 'Error saving consent', error);
    }
  };

  const openPaywall = (source: string, offering: 'pro' | null = null) => {
    const params = { source, offering, displayCloseButton: true };
    const parentNavigation = navigation.getParent?.();
    if (parentNavigation) {
      (parentNavigation as any).navigate('Paywall', params);
      return;
    }
    (navigation as any).navigate('Paywall', params);
  };

  const handleConsentDecline = () => {
    if (isSubscriber) {
      // Paid users may decline data sharing and still scan
      setShowConsentDialog(false);
      setHasGivenConsent(true);
    } else {
      Alert.alert(
        'Data Sharing Required',
        'Data sharing is required for free tier users. Upgrade to KŌOPE+ for optional data sharing.',
        [
          {
            text: 'Upgrade',
            onPress: () => {
              setShowConsentDialog(false);
              openPaywall('smart_scan_consent_decline');
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

  // Hardware back button — return to CameraHub
  useEffect(() => {
    const backAction = () => {
      if (cameraVisible) {
        navigation.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [cameraVisible, navigation]);

  // ─── Barcode scan handler (FREE + PLUS/PRO) ───────────────────────────────
  const handleBarcodeScanned = useCallback(
    async (result: { type: string; data: string }) => {
      setCameraVisible(false);
      setBarcodeMode(false);
      setAnalyzing(true);
      setScanMode('barcode');

      try {
        log.info('SmartScanScreen', 'Barcode detected', { barcode: result.data });

        const { spirit, productName, productBrand, status, barcode } = await BarcodeService.lookupBarcode(result.data);

        if (status === 'invalid_barcode') {
          Alert.alert(
            'Unsupported Barcode',
            'This code format is not supported for bottle lookup yet. Try scanning the label instead.',
            [
              {
                text: 'Scan Label',
                onPress: () => { setBarcodeMode(false); handleRetake(); },
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => handleRetake(),
              },
            ]
          );
        } else if (status === 'network_error') {
          Alert.alert(
            'Lookup Service Unavailable',
            'We could not reach barcode lookup services. Check your connection and try again.',
            [
              { text: 'Try Again', onPress: () => handleRetake() },
              { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
            ]
          );
        } else if (spirit) {
          await InventoryService.recordScan({
            userId: user?.id || null,
            scanType: 'bottle',
            itemName: spirit.name,
            brandName: spirit.brand,
            addedToInventory: false,
          });

          if (user?.id) {
            challengeProgressService.trackScanBottle(user.id, spirit.id || spirit.name, spirit.type);
          }
          achievementService.trackAction('bottlesScanned');

          navigation.replace('BottleDetail', { bottle: spirit });
        } else {
          // Barcode found but not in our spirits DB — go to manual entry
          const prefill = getManualPrefill(productName, productBrand);
          const labelForAlert = productName ? `"${productName}"` : `barcode ${barcode || result.data}`;
          Alert.alert(
            'Bottle Not Found Yet',
            `We found ${labelForAlert} but it's not in our database yet.\n\nManual search is coming soon — try scanning the label for more detail.`,
            [
              {
                text: 'Scan Again',
                onPress: () => handleRetake(),
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => navigation.goBack(),
              },
            ]
          );
        }
      } catch (error) {
        log.error('SmartScanScreen', 'Error looking up barcode', error);
        handleRetake();
      } finally {
        setAnalyzing(false);
        setScanMode(null);
      }
    },
    [user, navigation]
  );

  // ─── Photo capture handler ────────────────────────────────────────────────
  const handleImageCaptured = async (uri: string) => {
    setCameraVisible(false);
    setAnalyzing(true);
    setScanMode('ai');

    try {
      log.info('SmartScanScreen', 'Running AI analysis on captured image');

      // ── Stage 1: Image quality gate ──────────────────────────────────────────
      // Check before calling Vision API — saves API cost on bad photos.
      const quality = await ImageQualityService.check(uri);
      if (!quality.ok) {
        log.warn('SmartScanScreen', 'Stage 1 gate: image quality failed', { reason: quality.reason });
        setAnalyzing(false);
        setScanMode(null);
        Alert.alert(
          quality.reason === 'too_dark' ? 'Too Dark' : 'Too Blurry',
          quality.message,
          [
            { text: 'Try Again', onPress: () => handleRetake() },
            { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
          ]
        );
        return;
      }

      const visionResult = await GoogleVisionService.analyzeImage(uri);

      // Use the mode the user explicitly selected in the camera UI.
      // Map 'ingredients' → 'ingredient' to match the scanType values used below.
      const modeMap: Record<string, string> = {
        bottle: 'bottle',
        recipe: 'recipe',
        ingredients: 'ingredient',
      };
      const scanType = modeMap[cameraMode] ?? GoogleVisionService.detectScanType(visionResult);

      log.info('SmartScanScreen', 'Scan type', { scanType, cameraMode });

      switch (scanType) {
        case 'bottle': {
          // ── Stage 2: Spirit-signal gate ──────────────────────────────────────
          // Reject if Vision sees no spirit-related labels at all. This prevents
          // plastic objects, hands, shelf tags, and random items from reaching Claude.
          if (!GoogleVisionService.isSpiritImage(visionResult)) {
            log.warn('SmartScanScreen', 'Stage 2 gate: no spirit signal in labels', { labels: visionResult.labels });
            setAnalyzing(false);
            setScanMode(null);
            handleNotABottle();
            break;
          }

          // ── Stage 1+3: Local DB lookup (Web Detection first, then OCR) ───────
          let bottle = GoogleVisionService.matchBottle(visionResult);

          // ── Stage 4: Claude fallback with garbage detection ───────────────────
          if (!bottle) {
            const rawName = GoogleVisionService.extractBottleNameFromOCR(visionResult);

            const isGarbled = (name: string | null): boolean => {
              if (!name) return true;
              const chars = name.replace(/\s/g, '').toUpperCase();
              if (chars.length < 4) return true;
              const freq = [...chars].reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {} as Record<string, number>);
              const maxFreq = Math.max(...Object.values(freq));
              return maxFreq / chars.length > 0.4;
            };

            const extractedName = isGarbled(rawName) ? '' : rawName;
            log.info('SmartScanScreen', 'SpiritLookup', { rawName, extractedName, garbled: isGarbled(rawName) });

            if (extractedName || (visionResult?.labels?.length ?? 0) > 0) {
              try {
                bottle = await GoogleVisionService.lookupBottleProfile(extractedName || 'unknown bottle', visionResult);
              } catch (lookupErr: any) {
                log.warn('SmartScanScreen', 'SpiritLookup threw', { message: lookupErr?.message });
              }
            }
          }

          await InventoryService.recordScan({
            userId: user?.id || null,
            scanType: 'bottle',
            itemName: bottle?.name,
            brandName: bottle?.brand,
            imageUrl: uri,
            addedToInventory: false,
          });

          if (bottle) {
            if (user?.id) {
              challengeProgressService.trackScanBottle(user.id, bottle.id || bottle.name, bottle.type);
            }
            achievementService.trackAction('bottlesScanned');
            navigation.replace('BottleDetail', { bottle, imageUri: uri });
          } else {
            // ── Stage 7: Barcode fallback ─────────────────────────────────────
            // Vision couldn't identify the bottle — offer barcode scan as a
            // 100%-accurate fallback before falling through to "not recognised".
            handleBottleNotFound();
          }
          break;
        }

        case 'recipe': {
          await InventoryService.recordScan({
            userId: user?.id || null,
            scanType: 'recipe',
            imageUrl: uri,
          });

          // Extract the full OCR text block (text[0] is the complete block with newlines)
          const ocrText = visionResult?.text?.[0] || '';

          if (!ocrText.trim()) {
            Alert.alert(
              'No Text Found',
              'Could not read text from this image. Try better lighting or a clearer angle.',
              [{ text: 'Try Again', onPress: () => handleRetake() }]
            );
            break;
          }

          // Navigate to AIRecipeFormatScreen with the raw OCR text.
          // fromMenu: true tells the formatter to isolate a single recipe from the block.
          const parentNav = navigation.getParent?.() as any;
          const targetNav = parentNav || navigation;
          targetNav.navigate('AIRecipeFormat', {
            recipe: {
              extractedText: ocrText,
              fromMenu: true,
              imageUrl: uri,
            },
          });
          break;
        }

        case 'ingredient': {
          const ingredient = GoogleVisionService.matchIngredient(visionResult);

          await InventoryService.recordScan({
            userId: user?.id || null,
            scanType: 'ingredient',
            itemName: ingredient?.name,
            imageUrl: uri,
            confidence: ingredient?.confidence,
            addedToInventory: false,
          });

          if (ingredient) {
            navigation.replace('IngredientScan');
          } else {
            handleUnknownIngredient();
          }
          break;
        }

        default:
          handleUnknownItem();
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
      setScanMode(null);
    }
  };

  const handleBottleNotFound = () => {
    Alert.alert(
      'Bottle Not Recognised',
      'We couldn\'t identify this bottle. Try scanning the barcode on the back, or point the camera directly at the label in good light.',
      [
        {
          text: 'Scan Barcode',
          onPress: () => {
            setBarcodeMode(true);
            setScanMode(null);
            setCameraVisible(true);
          },
        },
        {
          text: 'Try Again',
          onPress: () => handleRetake(),
        },
        { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleNotABottle = () => {
    Alert.alert(
      'No Bottle Detected',
      'Make sure the bottle label is clearly visible and in the frame. Try better lighting or move closer.',
      [
        { text: 'Try Again', onPress: () => handleRetake() },
        { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
      ]
    );
  };


  const handleUnknownIngredient = () => {
    Alert.alert(
      'Ingredient Not Recognized',
      'Could not identify the ingredient. Try a clearer photo with good lighting.',
      [
        { text: 'Try Again', onPress: () => handleRetake() },
        { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleUnknownItem = () => {
    Alert.alert(
      "Can't Detect Item",
      "Couldn't determine what this is. What are you scanning?",
      [
        {
          text: 'Bottle',
          onPress: () => handleRetake(),
        },
        {
          text: 'Recipe',
          onPress: () => handleRetake(),
        },
        {
          text: 'Ingredient',
          onPress: () => handleRetake(),
        },
        { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleRetake = () => {
    setScanMode(null);
    setBarcodeMode(false);
    setCameraVisible(true);
  };

  const handleCameraClose = () => {
    setBarcodeMode(false);
    navigation.goBack();
  };

  const handleImportFromURL = () => {
    setCameraVisible(false);
    navigation.navigate('RecipeURLImport');
  };

  const analyzingTitle = scanMode === 'barcode' ? 'Looking up barcode...' : 'Analyzing with AI...';
  const analyzingSubtitle =
    scanMode === 'barcode'
      ? 'Searching spirits database'
      : 'Detecting bottles, recipes, and ingredients';
  return (
    <>
      <DataConsentDialog
        visible={showConsentDialog}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
        isPaidUser={isSubscriber}
      />

      <CameraCapture
        visible={cameraVisible}
        onClose={handleCameraClose}
        onImageCaptured={handleImageCaptured}
        // Enable barcode scanning in barcode-only mode OR as Stage 7 fallback
        // (barcodeMode=true when Vision failed to identify the bottle).
        // Never wire barcode in normal AI photo mode — causes auto-fire on any
        // barcode that appears in frame.
        onBarcodeScanned={(!aiScanEnabled || barcodeMode) ? handleBarcodeScanned : undefined}
        barcodeOnly={!aiScanEnabled || barcodeMode}
        autoCloseOnCapture={false}
        title="Smart Scan"
        isPaidUser={isSubscriber}
        isGuest={!user}
      />

      {/* URL import remains a paid convenience surface */}
      {cameraVisible && isSubscriber && (
        <View style={styles.urlButtonContainer}>
          <TouchableOpacity style={styles.urlButton} onPress={handleImportFromURL}>
            <Ionicons name="link" size={24} color={colors.white} />
            <Text style={styles.urlButtonText}>URL</Text>
          </TouchableOpacity>
        </View>
      )}
      {analyzing && (
        <View style={styles.analyzingOverlay}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.analyzingTitle}>{analyzingTitle}</Text>
          <Text style={styles.analyzingSubtitle}>{analyzingSubtitle}</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,8,8,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
  },
  analyzingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(2),
    fontFamily: 'Georgia',
  },
  analyzingSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
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
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  urlButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.goldText,
    marginTop: spacing(0.5),
  },
});
