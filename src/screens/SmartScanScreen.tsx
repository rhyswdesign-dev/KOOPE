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
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [hasGivenConsent, setHasGivenConsent] = useState(false);
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
      setAnalyzing(true);
      setScanMode('barcode');

      try {
        log.info('SmartScanScreen', 'Barcode detected', { barcode: result.data });

        const { spirit, productName, productBrand, status, barcode } = await BarcodeService.lookupBarcode(result.data);

        if (status === 'invalid_barcode') {
          Alert.alert(
            'Unsupported Barcode',
            'This code format is not supported for bottle lookup yet. Try another angle or add the bottle manually.',
            [
              {
                text: 'Add Manually',
                onPress: () => navigation.navigate('ManualBottleEntry', {}),
              },
              {
                text: 'Scan Again',
                onPress: () => handleRetake(),
              },
            ]
          );
        } else if (status === 'network_error') {
          Alert.alert(
            'Lookup Service Unavailable',
            'We could not reach barcode lookup services. Check your connection and try again, or add manually.',
            [
              { text: 'Add Manually', onPress: () => navigation.navigate('ManualBottleEntry', {}) },
              { text: 'Try Again', onPress: () => handleRetake() },
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

          navigation.replace('BottleDetail', { bottle: spirit });
        } else {
          // Barcode found but not in our spirits DB — go to manual entry
          const prefill = getManualPrefill(productName, productBrand);
          const labelForAlert = productName ? `"${productName}"` : `barcode ${barcode || result.data}`;
          Alert.alert(
            'Bottle Not Found Yet',
            `We found ${labelForAlert} but it is not in our database yet.\n\nTip: you can add it manually now with pre-filled fields, or try scanning the label/front of bottle.`,
            [
              {
                text: 'Add Manually',
                onPress: () =>
                  navigation.navigate('ManualBottleEntry', {
                    initialBrand: prefill.brand,
                    initialName: prefill.name,
                  }),
              },
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
    setImageUri(uri);
    setAnalyzing(true);
    setScanMode('ai');

    try {
      log.info('SmartScanScreen', 'Running AI analysis on captured image');

      const visionResult = await GoogleVisionService.analyzeImage(uri);
      const scanType = GoogleVisionService.detectScanType(visionResult);

      log.info('SmartScanScreen', 'AI scan type detected', { scanType });

      switch (scanType) {
        case 'bottle': {
          const bottle = GoogleVisionService.matchBottle(visionResult);

          await InventoryService.recordScan({
            userId: user?.id || null,
            scanType: 'bottle',
            itemName: bottle?.name,
            brandName: bottle?.brand,
            imageUrl: uri,
            addedToInventory: false,
          });

          if (bottle) {
            navigation.replace('BottleDetail', { bottle, imageUri: uri });
          } else {
            handleUnknownBottle(visionResult);
          }
          break;
        }

        case 'recipe': {
          await InventoryService.recordScan({
            userId: user?.id || null,
            scanType: 'recipe',
            imageUrl: uri,
          });

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

  const handleUnknownBottle = (visionResult: any) => {
    const brandName = visionResult.text?.[0] || 'Unknown Brand';
    Alert.alert(
      'Bottle Not Recognized',
      `Detected a bottle (possibly ${brandName}), but it's not in our database. Add manually?`,
      [
        {
          text: 'Add Manually',
          onPress: () =>
            navigation.navigate('ManualBottleEntry', {
              initialBrand: brandName !== 'Unknown Brand' ? brandName : undefined,
              imageUri: imageUri ?? undefined,
            }),
        },
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
    setImageUri(null);
    setScanMode(null);
    setCameraVisible(true);
  };

  const handleCameraClose = () => {
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
        onBarcodeScanned={handleBarcodeScanned}
        barcodeOnly={!aiScanEnabled}
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
          <ActivityIndicator size="large" color={colors.gold} />
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
