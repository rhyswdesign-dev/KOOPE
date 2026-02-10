/**
 * CAMERA CAPTURE COMPONENT (SENSORY SHUTTER)
 * Premium camera interface with Gold Viewfinder and Mode Selection
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
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/tokens';
import ScanCounter from './ScanCounter';

const { width } = Dimensions.get('window');

export interface CameraCaptureProps {
  visible: boolean;
  onClose: () => void;
  onImageCaptured: (imageUri: string) => void;
  mode?: 'bottle' | 'recipe' | 'identify';
  scansRemaining?: number;
  isPaidUser?: boolean;
  isGuest?: boolean;
}

const MODES = [
  { id: 'bottle', label: 'Bottle', icon: 'wine' },
  { id: 'identify', label: 'Identify', icon: 'search' },
  { id: 'recipe', label: 'Recipe', icon: 'document-text' },
];

export default function CameraCapture({
  visible,
  onClose,
  onImageCaptured,
  mode: initialMode = 'bottle',
  scansRemaining = 10,
  isPaidUser = false,
  isGuest = false,
}: CameraCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<'back' | 'front'>('back');
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [currentMode, setCurrentMode] = useState(initialMode);

  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    setCurrentMode(initialMode);
  }, [initialMode]);

  // Request permissions on mount if needed
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, []);

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
        // Optional: Save to library if needed, for now just callback
        onImageCaptured(photo.uri);
        onClose();
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
        onClose();
      }
    } catch (e) {
      Alert.alert('Error', 'Gallery access failed');
    }
  };

  if (!permission || !permission.granted) {
    return null; // Handle loading/denied state simpler for this refactor
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={cameraType}
          flash={flashMode}
          onCameraReady={() => setIsCameraReady(true)}
        >
          <SafeAreaView style={styles.overlay}>

            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                <Ionicons name="close" size={28} color={colors.white} />
              </TouchableOpacity>

              {/* Scan Counter */}
              <ScanCounter
                scansRemaining={scansRemaining}
                isPaidUser={isPaidUser}
                isGuest={isGuest}
              />

              <TouchableOpacity onPress={() => setFlashMode(f => f === 'off' ? 'on' : 'off')} style={styles.iconButton}>
                <Ionicons name={flashMode === 'on' ? 'flash' : 'flash-off'} size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            {/* Center - Viewfinder */}
            <View style={styles.viewfinderContainer}>
              <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>
                  Position the spirit bottle in the frame and{"\n"}tap to capture
                </Text>
              </View>

              <View style={styles.viewfinderFrame} />
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>

              {/* Mode Tabs */}
              <View style={styles.modeTabs}>
                {MODES.map((m) => {
                  const isActive = currentMode === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.modeTab, isActive && styles.modeTabActive]}
                      onPress={() => setCurrentMode(m.id as any)}
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

              {/* Shutter Row */}
              <View style={styles.shutterRow}>
                <TouchableOpacity onPress={pickFromGallery} style={styles.sideButton}>
                  <Ionicons name="images-outline" size={26} color={colors.white} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shutterButton}
                  onPress={capturePhoto}
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
                  onPress={() => setCameraType(t => t === 'back' ? 'front' : 'back')}
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
    borderColor: '#D68A38', // Amber Gold from reference
    borderRadius: 30,
    backgroundColor: 'transparent',
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