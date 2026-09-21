/**
 * Smart Scan Screen
 *
 * ONE presented experience: point the camera at the bottle (scanner spec A.0).
 * There is no barcode mode, no barcode reticle, no mode switch, and nothing
 * anywhere tells the user to find or aim at a UPC.
 *
 * Underneath, two paths race silently and the user never learns which won:
 *
 *   · silent barcode  — on-device decode runs continuously on every frame at
 *     zero cost. If a barcode happens to drift through frame and resolves
 *     confidently, we skip AI vision entirely and go straight to the Answer
 *     Card. If it misses, it fails *silently*: no alert, no mode change, the
 *     camera stays open and the user just keeps framing the bottle.
 *   · photo → bottle-recognize — one consolidated server round trip. This is
 *     the primary path, since front-of-bottle framing rarely shows a barcode.
 *
 * Free tier is scan-unlimited; monetization gate is inventory capacity (10 bottles),
 * not scan capability.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { GoogleVisionService, isConnectivityError } from '../services/googleVisionService';
import { BarcodeService } from '../services/barcodeService';
import CameraCapture from '../components/camera/CameraCapture';
import type { CameraStackParamList } from '../navigation/CameraStack';
import { log } from '../lib/logger';
import { InventoryService } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import DataConsentDialog from '../components/modals/DataConsentDialog';
import BottleNotFoundModal from '../components/BottleNotFoundModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { challengeProgressService } from '../services/challengeProgressService';
import { ImageQualityService } from '../services/imageQualityService';
import { supabase } from '../lib/supabase';
import {
  createScanSession,
  trackScanAttempt,
  trackScanResolved,
  trackScanFailed,
} from '../services/scanTelemetry';

export default function SmartScanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CameraStackParamList>>();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const { isSubscriber } = useSubscription();

  const [cameraVisible, setCameraVisible] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [cameraMode, setCameraMode] = useState<'bottle' | 'recipe' | 'ingredients'>('bottle');
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [hasGivenConsent, setHasGivenConsent] = useState(false);
  const [showBottleNotFound, setShowBottleNotFound] = useState(false);

  // Guard to ensure camera only auto-opens on first mount, not on re-focus
  // after returning from BottleDetail or other downstream screens.
  const hasOpenedOnMountRef = useRef(false);

  // Monotonic id for the current scan attempt. A silent barcode lookup that
  // comes back after the user has already captured a photo (or after another
  // code was decoded) is stale and must be dropped — otherwise a slow
  // background lookup could yank the user off a photo result seconds later.
  const scanRunIdRef = useRef(0);

  // Codes that already came back empty. The decoder's stability gate re-arms
  // every 3s, so without this a barcode parked in frame would be re-queried
  // (and re-logged) on a loop for as long as the user stands there.
  const exhaustedBarcodesRef = useRef<Set<string>>(new Set());

  // Check consent status on mount
  useEffect(() => {
    checkConsentStatus();
  }, []);

  // Open camera once on mount (after consent resolves), never again on re-focus.
  useEffect(() => {
    if (hasOpenedOnMountRef.current) return;
    if (!hasGivenConsent) return;
    hasOpenedOnMountRef.current = true;
    const timer = setTimeout(() => setCameraVisible(true), 120);
    return () => clearTimeout(timer);
  }, [hasGivenConsent]);

  // Close camera when screen loses focus (navigating away, tab switch, etc.)
  useEffect(() => {
    if (!isFocused) {
      setCameraVisible(false);
    }
  }, [isFocused]);

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
        ],
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

  // ─── Silent barcode resolution ────────────────────────────────────────────
  // Fires from the always-on, zero-UI decode running underneath normal
  // bottle framing (spec A.0). Three rules make it invisible:
  //
  //   1. It shows NO UI while it runs — no overlay, no "looking up barcode",
  //      no mode change. The camera stays open and the user keeps framing.
  //   2. It fails SILENTLY. A miss, an unsupported code, an offline lookup —
  //      none of them get an alert, because the user never asked for a barcode
  //      scan and telling them one failed would leak the mechanism. The photo
  //      path is still right there, and it owns every error state.
  //   3. It only emits telemetry when it WINS. The user's scan attempt is the
  //      photo they are lining up; an incidental shelf-tag barcode drifting
  //      through frame is not a scan attempt, and counting one as a failure
  //      (every 3s, for as long as it stays in frame) would bury the 1.3
  //      success-rate KPI in phantom failures. Misses are logged, not tracked.
  //
  // Only a confident hit is allowed to act, and when it does it goes straight
  // to the Answer Card with nothing indicating a barcode was involved.
  const handleBarcodeScanned = useCallback(
    async (result: { type: string; data: string }) => {
      // Same code, already resolved to nothing this session — don't re-query it
      // every time the decoder's stability gate re-arms.
      if (exhaustedBarcodesRef.current.has(result.data)) return;

      const runId = ++scanRunIdRef.current;
      const detectedAt = Date.now();

      try {
        log.info('SmartScanScreen', 'Silent barcode detected', { barcode: result.data });

        const { spirit, barcode, source } = await BarcodeService.lookupBarcode(result.data);
        const networkMs = Date.now() - detectedAt;

        // Superseded by a photo capture or a later decode — drop it.
        if (runId !== scanRunIdRef.current) return;

        if (!spirit) {
          exhaustedBarcodesRef.current.add(result.data);
          return;
        }

        InventoryService.recordScan({
          userId: user?.id || null,
          scanType: 'bottle',
          itemName: spirit.name,
          brandName: spirit.brand,
          addedToInventory: false,
        }).catch(() => {});

        if (user?.id) {
          challengeProgressService.trackScanBottle(user.id, spirit.id || spirit.name, spirit.type);
        }

        // Session clock is backdated to the decode, so DURATION_MS measures the
        // real "frame to Answer Card" time this path is budgeted against (A.4).
        const session = createScanSession('barcode', detectedAt);
        trackScanAttempt(session);
        trackScanResolved(session, {
          resolutionSource: source ? `barcode_${source}` : 'barcode',
          networkMs,
        });

        setCameraVisible(false);
        navigation.replace('BottleDetail', {
          bottle: spirit,
          scannedBarcode: barcode || result.data,
        });
      } catch (error) {
        // Silent by design — the photo path owns every user-visible failure.
        exhaustedBarcodesRef.current.add(result.data);
        log.warn('SmartScanScreen', 'Silent barcode lookup failed', error);
      }
    },
    [user, navigation],
  );

  // ─── Photo capture handler ────────────────────────────────────────────────
  const handleImageCaptured = async (uri: string) => {
    // Capturing supersedes any silent barcode lookup still in flight — the
    // user has committed to this frame, so a late barcode answer must not
    // navigate out from under the photo result.
    scanRunIdRef.current += 1;
    setCameraVisible(false);
    setAnalyzing(true);

    // Telemetry (Phase 1.3) is scoped to bottle scans — recipe/ingredient
    // photo captures share this handler but aren't part of the scan-latency
    // metric, so no session is created for them (an untracked ATTEMPT with
    // no matching RESOLVED/FAILED would silently corrupt the success rate).
    const isBottleScan = cameraMode === 'bottle';
    const session = isBottleScan ? createScanSession('photo') : null;
    if (session) trackScanAttempt(session);

    try {
      log.info('SmartScanScreen', 'Running AI analysis on captured image');

      // ── Stage 1: on-device quality gate ─────────────────────────────────────
      // Runs before any network call so a doomed photo spends none of the
      // 3-second budget (spec A.3). The service picks the specific fix —
      // "more light", "move closer", "hold steady" — and we render it verbatim
      // rather than collapsing everything into one generic retry.
      const quality = await ImageQualityService.check(uri);
      if (!quality.ok) {
        log.warn('SmartScanScreen', 'Stage 1 gate: image quality failed', {
          reason: quality.reason,
        });
        if (session) trackScanFailed(session, quality.reason);
        setAnalyzing(false);
        Alert.alert(quality.title, quality.message, [
          { text: 'Try Again', onPress: () => handleRetake() },
          { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      // ── Bottle mode: ONE consolidated server round trip ──────────────────────
      // bottle-recognize does Vision + spirit-gate + local-catalog match +
      // (on a catalog miss) the Claude fallback, all in a single invocation —
      // this replaces what used to be up to two chained client-initiated
      // calls (vision-analyze, then spirit-lookup on a local-match miss).
      if (cameraMode === 'bottle') {
        const {
          spirit: bottle,
          confidence: scanConfidence,
          isSpiritImage,
          source,
          timings,
        } = await GoogleVisionService.recognizeBottle(uri);

        // Connection failure is not "bottle not found" (audit/sprint-1
        // device-test fix): surface an honest connection state with a retry
        // instead of pretending the bottle isn't in the database.
        if (source === 'network_error') {
          if (session) trackScanFailed(session, 'connection_error');
          setAnalyzing(false);
          handleScanConnectionError();
          return;
        }

        if (!isSpiritImage) {
          log.warn('SmartScanScreen', 'Stage 2 gate: no spirit signal detected');
          if (session) trackScanFailed(session, 'not_a_bottle');
          setAnalyzing(false);
          handleNotABottle();
          return;
        }

        InventoryService.recordScan({
          userId: user?.id || null,
          scanType: 'bottle',
          itemName: bottle?.name,
          brandName: bottle?.brand,
          imageUrl: uri,
          addedToInventory: false,
        }).catch(() => {});

        if (bottle) {
          if (user?.id) {
            challengeProgressService.trackScanBottle(
              user.id,
              bottle.id || bottle.name,
              bottle.type,
            );
          }
          if (session) {
            trackScanResolved(session, {
              resolutionSource: source,
              convertMs: timings?.convertMs,
              networkMs: timings?.networkMs,
              server: timings?.server,
            });
          }
          navigation.replace('BottleDetail', {
            bottle,
            imageUri: uri,
            scanConfidence,
            scanSource: source,
          });
        } else {
          // ── Stage 7: Barcode fallback ─────────────────────────────────────
          // Vision couldn't identify the bottle — offer barcode scan as a
          // 100%-accurate fallback before falling through to "not recognised".
          if (session) trackScanFailed(session, 'not_recognised');
          handleBottleNotFound();
        }
        return;
      }

      // ── Recipe / ingredient modes — unchanged, still use vision-analyze ──────
      const visionResult = await GoogleVisionService.analyzeImage(uri);

      // Map 'ingredients' → 'ingredient' to match the scanType values used below.
      const modeMap: Record<string, string> = {
        recipe: 'recipe',
        ingredients: 'ingredient',
      };
      const scanType = modeMap[cameraMode] ?? GoogleVisionService.detectScanType(visionResult);

      log.info('SmartScanScreen', 'Scan type', { scanType, cameraMode });

      switch (scanType) {
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
              [{ text: 'Try Again', onPress: () => handleRetake() }],
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
      // Connection failures get the honest offline state rather than a
      // generic "Analysis Failed" (audit/sprint-1 device-test fix).
      if (isConnectivityError(error)) {
        if (session) trackScanFailed(session, 'connection_error');
        handleScanConnectionError();
      } else {
        if (session) trackScanFailed(session, 'error');
        Alert.alert('Analysis Failed', 'Failed to analyze the image. Please try again.', [
          { text: 'OK', onPress: () => handleRetake() },
        ]);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBottleNotFound = () => {
    setShowBottleNotFound(true);
  };

  // Branded connection-failure state (audit/sprint-1 device-test fix):
  // scanning needs the backend, and a connection failure must never be a
  // silent retake, a spinner-forever, or a fake "Bottle Not Found".
  // Alert.alert renders through the app's branded modal (installAppAlert).
  const handleScanConnectionError = () => {
    Alert.alert(
      "You're Offline",
      'Scanning needs a connection. Check your internet and try again.',
      [
        { text: 'Retry', onPress: () => handleRetake() },
        { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
      ],
    );
  };

  // Was a plain Alert.alert with only Try Again / Cancel — no way out if this
  // pre-network gate false-negatives on a real bottle photo. Reuses the same
  // BottleNotFoundModal as handleBottleNotFound (below) so both "not a
  // bottle at all" and "a bottle, but couldn't identify which one" land on
  // the same recovery UI, including the Search Library escape hatch.
  const handleNotABottle = () => {
    setShowBottleNotFound(true);
  };

  const handleUnknownIngredient = () => {
    Alert.alert(
      'Ingredient Not Recognized',
      'Could not identify the ingredient. Try a clearer photo with good lighting.',
      [
        { text: 'Try Again', onPress: () => handleRetake() },
        { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
      ],
    );
  };

  const handleUnknownItem = () => {
    Alert.alert("Can't Detect Item", "Couldn't determine what this is. What are you scanning?", [
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
    ]);
  };

  const handleRetake = () => {
    setCameraVisible(true);
  };

  const handleCameraClose = () => {
    navigation.goBack();
  };

  // One copy for every path. The barcode racer never speaks for itself — if it
  // wins we navigate before this ever renders, and if it loses the user is
  // simply looking at the camera (spec A.0).
  const analyzingTitle = 'Identifying bottle...';
  const analyzingSubtitle = 'Reading label';
  return (
    <>
      <DataConsentDialog
        visible={showConsentDialog}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
        isPaidUser={isSubscriber}
      />

      <BottleNotFoundModal
        visible={showBottleNotFound}
        onTryAgain={() => {
          setShowBottleNotFound(false);
          handleRetake();
        }}
        onSearchLibrary={() => {
          setShowBottleNotFound(false);
          // replace, not navigate: SmartScanScreen has nothing to show once
          // the camera/modal is dismissed (cameraVisible never gets set back
          // to true on this path), so leaving it underneath BottleSearch on
          // the stack means the back button lands on a blank screen.
          navigation.replace('BottleSearch');
        }}
        onCancel={() => {
          setShowBottleNotFound(false);
          navigation.goBack();
        }}
      />

      <CameraCapture
        visible={cameraVisible}
        onClose={handleCameraClose}
        onImageCaptured={handleImageCaptured}
        // Always on, always silent (spec A.0). CameraCapture's stability gate
        // (same code decoded on consecutive frames) is what makes leaving this
        // running under normal photo framing safe — without it, any incidental
        // barcode crossing the viewfinder would auto-fire.
        onBarcodeScanned={handleBarcodeScanned}
        autoCloseOnCapture={false}
        title="Smart Scan"
      />

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
