/**
 * CAMERA CAPTURE COMPONENT
 * Manual shutter camera interface with Gold Viewfinder and Mode Selection.
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

// Require this many consecutive frames to decode the same barcode, within
// this window, before committing. expo-camera's onBarcodeScanned fires on
// every frame a code decodes — without this gate, barcode detection running
// silently underneath normal photo-mode framing would auto-fire on any
// incidental barcode crossing the viewfinder (a shelf tag, a second product).
const BARCODE_STABILITY_FRAMES = 2;
const BARCODE_STABILITY_WINDOW_MS = 600;

export interface CameraCaptureProps {
  visible: boolean;
  onClose: () => void;
  onImageCaptured: (imageUri: string) => void;
  onBarcodeScanned?: (result: { type: string; data: string }) => void;
  barcodeOnly?: boolean;
  title?: string;
  allowGallery?: boolean;
  mode?: 'bottle' | 'recipe' | 'ingredients';
  scansRemaining?: number;
  isPaidUser?: boolean;
  isGuest?: boolean;
  autoCloseOnCapture?: boolean;
}


export default function CameraCapture({
  visible,
  onClose,
  onImageCaptured,
  onBarcodeScanned,
  barcodeOnly = false,
  allowGallery = true,
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
  const cameraRef = useRef<CameraView>(null);
  const barcodeHandledRef = useRef(false);
  const barcodeStabilityRef = useRef<{ value: string; count: number; firstSeenAt: number } | null>(null);
  const [barcodeDetectedPulse, setBarcodeDetectedPulse] = useState(false);

  useEffect(() => {
    if (visible) {
      barcodeHandledRef.current = false;
      barcodeStabilityRef.current = null;
      setBarcodeDetectedPulse(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, []);

  const handleBarcodeScannedInternal = (result: { type: string; data: string }) => {
    if (barcodeHandledRef.current) return;

    const now = Date.now();
    const prev = barcodeStabilityRef.current;
    const next = (prev && prev.value === result.data && now - prev.firstSeenAt < BARCODE_STABILITY_WINDOW_MS)
      ? { value: prev.value, count: prev.count + 1, firstSeenAt: prev.firstSeenAt }
      : { value: result.data, count: 1, firstSeenAt: now };
    barcodeStabilityRef.current = next;
    if (next.count < BARCODE_STABILITY_FRAMES) return;

    barcodeHandledRef.current = true;
    setBarcodeDetectedPulse(true);
    onBarcodeScanned?.(result);
    setTimeout(() => {
      barcodeHandledRef.current = false;
      barcodeStabilityRef.current = null;
      setBarcodeDetectedPulse(false);
    }, 3000);
  };

  const capturePhoto = async () => {
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
        if (autoCloseOnCapture) onClose();
      }
    } catch (error) {
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
        if (autoCloseOnCapture) onClose();
      }
    } catch (e) {
      Alert.alert('Error', 'Gallery access failed');
    }
  };

  if (!permission) return null;

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
                if (canAskAgain) { await requestPermission(); return; }
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

  const instructionText = barcodeOnly
    ? 'Point camera at the bottle\'s barcode\nor tap below to add manually'
    : 'Point camera at the label\nand tap to capture';

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
              <ScanCounter
                scansRemaining={scansRemaining}
                isPaidUser={isPaidUser}
                isGuest={isGuest}
                barcodeOnly={barcodeOnly}
              />
              <TouchableOpacity
                onPress={withHaptic(() => setFlashMode(f => f === 'off' ? 'on' : 'off'), 'selection')}
                style={styles.iconButton}
              >
                <Ionicons name={flashMode === 'on' ? 'flash' : 'flash-off'} size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            {/* Viewfinder */}
            <View style={styles.viewfinderContainer}>
              <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>{instructionText}</Text>
              </View>

              {/* Silent barcode detection — a brief pulse, not a mode switch */}
              {barcodeDetectedPulse && (
                <View style={styles.barcodePulse}>
                  <Ionicons name="barcode" size={14} color={colors.gold} />
                  <Text style={styles.barcodePulseText}>Barcode found — checking...</Text>
                </View>
              )}

              {!barcodeOnly ? (
                <View style={styles.viewfinderFrame}>
                  <View style={styles.viewfinderInner}>
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                    {/* Centre alignment rule — helps user align the label horizontally */}
                    <View style={styles.centerLine} />
                    <View style={styles.centerLineLabel}>
                      <Text style={styles.centerLineLabelText}>Align label here</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={[
                  styles.viewfinderFrame,
                  barcodeOnly && styles.viewfinderBarcode,
                ]} />
              )}
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              {barcodeOnly && (
                <View style={styles.barcodeHint}>
                  <Ionicons name="barcode-outline" size={16} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.barcodeHintText}>Scanning for barcode automatically</Text>
                </View>
              )}

              <View style={styles.shutterRow}>
                {!barcodeOnly && allowGallery ? (
                  <TouchableOpacity onPress={withHaptic(pickFromGallery, 'selection')} style={styles.sideButton}>
                    <Ionicons name="images-outline" size={26} color={colors.white} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.sideButton} />
                )}

                <TouchableOpacity
                  style={styles.shutterButton}
                  onPress={withHaptic(capturePhoto, 'medium')}
                  disabled={!isCameraReady || isCapturing}
                >
                  {isCapturing ? (
                    <ActivityIndicator color={colors.gold} size="large" />
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
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between' },
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
  permissionPrimaryText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
  permissionSecondaryButton: { paddingVertical: spacing(1) },
  permissionSecondaryText: { color: colors.subtext, fontSize: 14, fontWeight: '600' },
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
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    borderRadius: 20,
    overflow: 'hidden',
  },
  barcodePulse: {
    position: 'absolute',
    bottom: spacing(2),
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    alignSelf: 'center',
    backgroundColor: 'rgba(10,7,5,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.5)',
    borderRadius: 999,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
  },
  barcodePulseText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '600',
  },
  viewfinderFrame: {
    width: width * 0.75,
    height: width * 0.9,
    borderWidth: 1.5,
    borderColor: 'rgba(214,138,56,0.45)',
    borderRadius: 30,
    backgroundColor: 'transparent',
  },
  viewfinderInner: { flex: 1, position: 'relative' },
  corner: { position: 'absolute', width: 26, height: 26, borderColor: '#D68A38' },
  cornerTL: { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  cornerTR: { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  viewfinderBarcode: { width: width * 0.8, height: width * 0.35, borderRadius: 16 },
  centerLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: '50%',
    height: 1,
    backgroundColor: 'rgba(214,138,56,0.5)',
  },
  centerLineLabel: {
    position: 'absolute',
    top: '50%',
    right: 12,
    marginTop: 6,
  },
  centerLineLabelText: {
    color: 'rgba(214,138,56,0.7)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bottomControls: { paddingBottom: spacing(6), paddingTop: spacing(2) },
  modeTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(1),
    marginBottom: spacing(4),
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 24,
    alignSelf: 'center',
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.75),
  },
  modeTab: { alignItems: 'center', gap: spacing(0.5), paddingHorizontal: spacing(2), paddingVertical: spacing(0.75), borderRadius: 20 },
  modeTabActive: { backgroundColor: 'rgba(214,138,56,0.18)' },
  modeTabText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  modeTabTextActive: { color: colors.gold },
  barcodeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    marginBottom: spacing(4),
    opacity: 0.6,
  },
  barcodeHintText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' },
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 25,
  },
  shutterButton: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  shutterRingOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#D68A38',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  shutterRingInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(214, 138, 56, 0.85)',
  },
});
