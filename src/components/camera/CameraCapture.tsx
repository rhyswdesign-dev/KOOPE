/**
 * CAMERA CAPTURE COMPONENT (SENSORY SHUTTER)
 * Premium camera interface with Gold Viewfinder and Mode Selection.
 *
 * barcodeOnly mode (FREE tier):
 *   - Passive barcode scanning via onBarcodeScanned — no Google Vision cost
 *   - Instruction text prompts user to point at barcode
 *   - Mode tabs hidden; BARCODE badge shown instead
 *   - Shutter still available to force manual entry fallback
 *
 * Full mode (PLUS/PRO):
 *   - Barcode scanning active simultaneously (fastest path)
 *   - Photo capture triggers AI waterfall (label OCR → visual recognition)
 *   - All scan mode tabs shown
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/tokens';
import ScanCounter from './ScanCounter';
import { withHaptic } from '../../lib/haptics';

const { width } = Dimensions.get('window');

export interface CameraCaptureProps {
  visible: boolean;
  onClose: () => void;
  onImageCaptured: (imageUri: string) => void;
  onBarcodeScanned?: (result: { type: string; data: string }) => void;
  barcodeOnly?: boolean; // FREE tier: barcode + manual only, no AI photo capture
  title?: string;
  allowGallery?: boolean;
  mode?: 'bottle' | 'recipe' | 'ingredients';
  scansRemaining?: number;
  isPaidUser?: boolean;
  isGuest?: boolean;
  autoCloseOnCapture?: boolean;
}

const MODES = [
  { id: 'bottle', label: 'Bottle', icon: 'wine' },
  { id: 'recipe', label: 'Recipe', icon: 'document-text' },
  { id: 'ingredients', label: 'Ingredients', icon: 'leaf' },
];

export default function CameraCapture({
  visible,
  onClose,
  onImageCaptured,
  onBarcodeScanned,
  barcodeOnly = false,
  allowGallery = true,
  mode: initialMode = 'bottle' as 'bottle' | 'recipe' | 'ingredients',
  scansRemaining,
  isPaidUser = false,
  isGuest = false,
  autoCloseOnCapture = true,
}: CameraCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<'back' | 'front'>('back');
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [currentMode, setCurrentMode] = useState(initialMode);

  const cameraRef = useRef<CameraView>(null);
  // Prevent firing onBarcodeScanned multiple times for the same barcode
  const barcodeHandledRef = useRef(false);

  useEffect(() => {
    setCurrentMode(initialMode);
  }, [initialMode]);

  // Reset barcode lock when camera becomes visible again
  useEffect(() => {
    if (visible) {
      barcodeHandledRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, []);

  const handleBarcodeScannedInternal = (result: { type: string; data: string }) => {
    if (barcodeHandledRef.current) return;
    barcodeHandledRef.current = true;
    onBarcodeScanned?.(result);
    // Allow re-scan after 3 seconds if caller doesn't navigate away
    setTimeout(() => { barcodeHandledRef.current = false; }, 3000);
  };

  const capturePhoto = async () => {
    // In barcodeOnly mode, the shutter navigates to manual entry — caller handles this
    // via onImageCaptured with a sentinel, but simpler to just call onImageCaptured normally
    // SmartScanScreen will check tier and redirect to manual.
    if (!cameraRef.current || !isCameraReady || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: false,
      });

      if (photo?.uri) {
        onImageCaptured(photo.uri);
        if (autoCloseOnCapture) {
          onClose();
        }
      }
    } catch (error) {
      console.error('Failed to capture', error);
      Alert.alert('Error', 'Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageCaptured(result.assets[0].uri);
        if (autoCloseOnCapture) {
          onClose();
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Gallery access failed');
    }
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    const canAskAgain = permission.canAskAgain;
    const permissionMessage = canAskAgain
      ? 'Camera access is required to scan bottles. Allow access to continue.'
      : 'Camera access is blocked. Enable camera permission in Settings to continue scanning.';

    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.permissionContainer}>
          <View style={styles.permissionContent}>
            <View style={styles.permissionIconWrap}>
              <Ionicons name="camera-outline" size={38} color={colors.gold} />
            </View>
            <Text style={styles.permissionTitle}>Camera Permission Needed</Text>
            <Text style={styles.permissionSubtitle}>{permissionMessage}</Text>

            <TouchableOpacity
              style={styles.permissionPrimaryButton}
              onPress={withHaptic(async () => {
                if (canAskAgain) {
                  await requestPermission();
                  return;
                }
                await Linking.openSettings();
              }, 'medium')}
            >
              <Text style={styles.permissionPrimaryText}>
                {canAskAgain ? 'Allow Camera Access' : 'Open Settings'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.permissionSecondaryButton} onPress={withHaptic(onClose, 'selection')}>
              <Text style={styles.permissionSecondaryText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  const modeInstructions: Record<string, string> = {
    bottle: 'Point camera at the bottle label\nand tap to identify the spirit',
    recipe: 'Point camera at a recipe card\nor written recipe to capture it',
    ingredients: 'Point camera at your ingredients\nor a shopping list to scan them',
  };
  const instructionText = barcodeOnly
    ? 'Point camera at the bottle\'s barcode\nor tap below to add manually'
    : modeInstructions[currentMode] ?? modeInstructions.bottle;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={cameraType}
          flash={flashMode}
          onCameraReady={() => setIsCameraReady(true)}
          {...(onBarcodeScanned ? {
            onBarcodeScanned: handleBarcodeScannedInternal,
            barcodeScannerSettings: {
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
            },
          } : {})}
        >
          <SafeAreaView style={styles.overlay}>

            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={withHaptic(onClose, 'selection')} style={styles.iconButton}>
                <Ionicons name="close" size={28} color={colors.white} />
              </TouchableOpacity>

              {/* Scan mode badge */}
              <ScanCounter
                scansRemaining={scansRemaining}
                isPaidUser={isPaidUser}
                isGuest={isGuest}
                barcodeOnly={barcodeOnly}
              />

              <TouchableOpacity onPress={withHaptic(() => setFlashMode(f => f === 'off' ? 'on' : 'off'), 'selection')} style={styles.iconButton}>
                <Ionicons name={flashMode === 'on' ? 'flash' : 'flash-off'} size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            {/* Center - Viewfinder */}
            <View style={styles.viewfinderContainer}>
              <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>{instructionText}</Text>
              </View>

              <View style={[
                styles.viewfinderFrame,
                barcodeOnly && styles.viewfinderBarcode,
              ]} />
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>

              {/* Mode tabs — only for paid (full AI) users */}
              {!barcodeOnly && (
                <View style={styles.modeTabs}>
                  {MODES.map((m) => {
                    const isActive = currentMode === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.modeTab, isActive && styles.modeTabActive]}
                        onPress={withHaptic(() => setCurrentMode(m.id as any), 'selection')}
                      >
                        <Ionicons
                          name={m.icon as any}
                          size={18}
                          color={isActive ? colors.gold : 'rgba(255,255,255,0.5)'}
                        />
                        <Text style={[styles.modeTabText, isActive && styles.modeTabTextActive]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Barcode-only mode: manual search shortcut label above shutter */}
              {barcodeOnly && (
                <View style={styles.barcodeHint}>
                  <Ionicons name="barcode-outline" size={16} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.barcodeHintText}>
                    Scanning for barcode automatically
                  </Text>
                </View>
              )}

              {/* Shutter Row */}
              <View style={styles.shutterRow}>
                {!barcodeOnly && allowGallery && (
                  <TouchableOpacity onPress={withHaptic(pickFromGallery, 'selection')} style={styles.sideButton}>
                    <Ionicons name="images-outline" size={26} color={colors.white} />
                  </TouchableOpacity>
                )}

                {(barcodeOnly || !allowGallery) && <View style={styles.sideButton} />}

                <TouchableOpacity
                  style={styles.shutterButton}
                  onPress={withHaptic(capturePhoto, 'medium')}
                  disabled={!isCameraReady || isCapturing}
                >
                  {isCapturing ? (
                    <ActivityIndicator color={colors.gold} />
                  ) : (
                    <View style={styles.shutterRingOuter}>
                      <View style={styles.shutterRingInner} />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={withHaptic(() => setCameraType(t => t === 'back' ? 'front' : 'back'), 'selection')}
                  style={styles.sideButton}
                >
                  <Ionicons name="camera-reverse-outline" size={26} color={colors.white} />
                </TouchableOpacity>
              </View>

            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: spacing(4),
  },
  permissionContent: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: spacing(4),
    alignItems: 'center',
  },
  permissionIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214,138,56,0.12)',
    marginBottom: spacing(2),
  },
  permissionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing(1),
    textAlign: 'center',
  },
  permissionSubtitle: {
    color: colors.subtext,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing(3),
  },
  permissionPrimaryButton: {
    width: '100%',
    borderRadius: 999,
    backgroundColor: colors.gold,
    paddingVertical: spacing(2),
    alignItems: 'center',
    marginBottom: spacing(1.5),
  },
  permissionPrimaryText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 15,
  },
  permissionSecondaryButton: {
    paddingVertical: spacing(1),
  },
  permissionSecondaryText: {
    color: colors.subtext,
    fontSize: 14,
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2),
    paddingTop: spacing(1),
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 22,
  },
  viewfinderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing(4),
  },
  instructionContainer: {
    position: 'absolute',
    top: spacing(4),
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  viewfinderFrame: {
    width: width * 0.75,
    height: width * 0.9,
    borderWidth: 2,
    borderColor: '#D68A38',
    borderRadius: 30,
    backgroundColor: 'transparent',
  },
  // Narrower, landscape-ish frame for barcode scanning
  viewfinderBarcode: {
    width: width * 0.8,
    height: width * 0.35,
    borderRadius: 16,
  },
  bottomControls: {
    paddingBottom: spacing(6),
    paddingTop: spacing(2),
  },
  modeTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(4),
    marginBottom: spacing(4),
  },
  modeTab: {
    alignItems: 'center',
    gap: spacing(0.5),
    opacity: 0.6,
  },
  modeTabActive: {
    opacity: 1,
  },
  modeTabText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: colors.gold,
  },
  barcodeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    marginBottom: spacing(4),
    opacity: 0.6,
  },
  barcodeHintText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(6),
  },
  sideButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterButton: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterRingOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#D68A38',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214, 138, 56, 0.1)',
  },
  shutterRingInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(214, 138, 56, 0.3)',
  },
});
