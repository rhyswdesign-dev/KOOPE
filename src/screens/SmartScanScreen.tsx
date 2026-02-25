/**
 * Smart Scan Screen
 * Tier-gated scan waterfall:
 *
 *   FREE tier  — barcode (device-side, $0 cost) → manual search fallback
 *   PLUS/PRO   — barcode first (fastest) → AI label OCR → visual recognition → manual
 *
 * Google Vision API is only called for PLUS/PRO users, keeping AI costs away
 * from the majority free user base.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { BarcodeService } from '../services/barcodeService';
import CameraCapture from '../components/camera/CameraCapture';
import type { CameraStackParamList } from '../navigation/CameraStack';
import { log } from '../lib/logger';
import { InventoryService } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useUserTier } from '../store/useUserTier';
import DataConsentDialog from '../components/modals/DataConsentDialog';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUBSCRIPTION_ENTITLEMENTS } from '../constants/subscriptions';

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
  const { user } = useAuth();
  const { isSubscriber, customerInfo } = useSubscription();
  const { tier } = useUserTier();

  const [cameraVisible, setCameraVisible] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanMode, setScanMode] = useState<'barcode' | 'ai' | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [hasGivenConsent, setHasGivenConsent] = useState(false);

  const isFree = tier === 'FREE';

  // Check consent status on mount
  useEffect(() => {
    checkConsentStatus();
  }, []);

  // Show camera once consent is confirmed
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
      setCameraVisible(true);
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
      setCameraVisible(true);
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

    // FREE tier: AI scanning not included — redirect to manual.
    // Do NOT store the image (it was never analyzed, don't show it).
    if (isFree) {
      Alert.alert(
        'AI Scan is KŌOPE+',
        'Upgrade to unlock AI label recognition, visual bottle matching, and more. Or add your bottle manually.',
        [
          {
            text: 'Upgrade to PLUS',
            onPress: () => openPaywall('smart_scan_ai_gate'),
          },
          {
            text: 'Add Manually',
            onPress: () => navigation.navigate('ManualBottleEntry', {}),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setCameraVisible(true);
            },
          },
        ]
      );
      return;
    }

    // PLUS/PRO: run full AI waterfall — store the image for preview + BottleDetailScreen
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
  const activeEntitlements = Object.keys(customerInfo?.entitlements.active || {});
  const hasProEntitlement = activeEntitlements.includes(SUBSCRIPTION_ENTITLEMENTS.KOOPE_PRO)
    || activeEntitlements.includes(SUBSCRIPTION_ENTITLEMENTS.KOOPE_PRO_ALT);
  const hasPlusEntitlement = activeEntitlements.includes(SUBSCRIPTION_ENTITLEMENTS.KOOPE_PLUS);
  const hasPrestigeEntitlement = activeEntitlements.includes(SUBSCRIPTION_ENTITLEMENTS.PRESTIGE);

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
        barcodeOnly={isFree}
        title="Smart Scan"
        isPaidUser={isSubscriber}
        isGuest={!user}
      />

      {/* URL import — only for paid users (recipe scanning is PLUS/PRO) */}
      {cameraVisible && !isFree && (
        <View style={styles.urlButtonContainer}>
          <TouchableOpacity style={styles.urlButton} onPress={handleImportFromURL}>
            <Ionicons name="link" size={24} color={colors.white} />
            <Text style={styles.urlButtonText}>URL</Text>
          </TouchableOpacity>
        </View>
      )}

      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Smart Scan</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <View style={styles.debugBanner}>
            <Text style={styles.debugBannerText}>
              Tier: {tier} | Sub: {isSubscriber ? 'yes' : 'no'}
            </Text>
            <Text style={styles.debugBannerSubtext}>
              Entitlements: +:{hasPlusEntitlement ? 'Y' : 'N'} pro:{hasProEntitlement ? 'Y' : 'N'} prestige:{hasPrestigeEntitlement ? 'Y' : 'N'}
            </Text>
          </View>

          {/* Preview image */}
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          )}

          {/* Analyzing state */}
          {analyzing && (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={styles.analyzingTitle}>{analyzingTitle}</Text>
              <Text style={styles.analyzingSubtitle}>{analyzingSubtitle}</Text>
            </View>
          )}

          {/* Action buttons after analysis */}
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: spacing(3),
  },
  debugBanner: {
    width: '100%',
    backgroundColor: 'rgba(214,138,56,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.3)',
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    marginBottom: spacing(2),
  },
  debugBannerText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  debugBannerSubtext: {
    color: colors.subtext,
    fontSize: 11,
    marginTop: spacing(0.5),
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
