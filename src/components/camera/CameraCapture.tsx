/**
 * CAMERA CAPTURE COMPONENT
 * Professional camera interface for cocktail submissions
 * Includes photo capture, gallery picker, and basic editing
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
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Camera, CameraType, FlashMode } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';
import { log } from '../../lib/logger';

interface CameraCaptureProps {
  visible: boolean;
  onClose: () => void;
  onImageCaptured: (imageUri: string) => void;
  title?: string;
  allowGallery?: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * Camera capture component with professional controls
 */
export default function CameraCapture({
  visible,
  onClose,
  onImageCaptured,
  title = "Take Photo",
  allowGallery = true,
}: CameraCaptureProps) {
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState<CameraType>(CameraType.back);
  const [flashMode, setFlashMode] = useState<FlashMode>(FlashMode.off);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const cameraRef = useRef<Camera>(null);

  // Request permissions when component mounts
  useEffect(() => {
    requestPermissions();
  }, []);

  /**
   * Request camera and media library permissions
   */
  const requestPermissions = async () => {
    try {
      // Request camera permission
      const cameraResult = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(cameraResult.status === 'granted');

      // Request media library permission
      const mediaResult = await MediaLibrary.requestPermissionsAsync();
      setMediaLibraryPermission(mediaResult.status === 'granted');

    } catch (error) {
      log.error('CameraCapture', 'Failed to request permissions', error);
      Alert.alert('Error', 'Failed to request camera permissions');
    }
  };

  /**
   * Handle camera ready event
   */
  const handleCameraReady = () => {
    setIsCameraReady(true);
  };

  /**
   * Capture photo with camera
   */
  const capturePhoto = async () => {
    if (!cameraRef.current || !isCameraReady || isCapturing) {
      return;
    }

    try {
      setIsCapturing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: false,
      });

      if (photo.uri) {
        // Save to media library if permission granted
        if (mediaLibraryPermission) {
          await MediaLibrary.saveToLibraryAsync(photo.uri);
        }

        onImageCaptured(photo.uri);
        onClose();
      }

    } catch (error) {
      log.error('CameraCapture', 'Failed to capture photo', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * Pick image from gallery
   */
  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageCaptured(result.assets[0].uri);
        onClose();
      }
    } catch (error) {
      log.error('CameraCapture', 'Failed to pick from gallery', error);
      Alert.alert('Error', 'Failed to access gallery. Please try again.');
    }
  };

  /**
   * Toggle camera type (front/back)
   */
  const toggleCameraType = () => {
    setCameraType(current =>
      current === CameraType.back ? CameraType.front : CameraType.back
    );
  };

  /**
   * Toggle flash mode
   */
  const toggleFlashMode = () => {
    setFlashMode(current => {
      switch (current) {
        case FlashMode.off: return FlashMode.on;
        case FlashMode.on: return FlashMode.auto;
        case FlashMode.auto: return FlashMode.off;
        default: return FlashMode.off;
      }
    });
  };

  /**
   * Get flash icon based on current mode
   */
  const getFlashIcon = () => {
    switch (flashMode) {
      case FlashMode.on: return 'flash';
      case FlashMode.auto: return 'flash-outline';
      case FlashMode.off: return 'flash-off';
      default: return 'flash-off';
    }
  };

  // Show permission request if needed
  if (cameraPermission === false) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={styles.container}>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={80} color={colors.subtext} />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              Please grant camera access to take photos of your cocktails
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Camera View */}
        <View style={styles.cameraContainer}>
          {cameraPermission && (
            <Camera
              ref={cameraRef}
              style={styles.camera}
              type={cameraType}
              flashMode={flashMode}
              onCameraReady={handleCameraReady}
              ratio="4:3"
            />
          )}

          {/* Camera Overlay */}
          <View style={styles.overlay}>
            {/* Top Controls */}
            <View style={styles.topControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleFlashMode}
              >
                <Ionicons name={getFlashIcon()} size={24} color={colors.white} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleCameraType}
              >
                <Ionicons name="camera-reverse" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            {/* Center Focus Area */}
            <View style={styles.centerArea}>
              <View style={styles.focusSquare} />
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              {allowGallery && (
                <TouchableOpacity
                  style={styles.galleryButton}
                  onPress={pickFromGallery}
                >
                  <Ionicons name="images" size={24} color={colors.white} />
                  <Text style={styles.galleryButtonText}>Gallery</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
                onPress={capturePhoto}
                disabled={isCapturing || !isCameraReady}
              >
                {isCapturing ? (
                  <ActivityIndicator size="large" color={colors.white} />
                ) : (
                  <View style={styles.captureButtonInner} />
                )}
              </TouchableOpacity>

              <View style={styles.spacer} />
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            📸 Capture your cocktail creation or select from gallery
          </Text>
          <Text style={styles.instructionSubtext}>
            Make sure the lighting is good and the drink is clearly visible
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },

  // Camera
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2),
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Focus Area
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusSquare: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: radii.md,
    backgroundColor: 'transparent',
  },

  // Bottom Controls
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(4),
  },
  galleryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  galleryButtonText: {
    color: colors.white,
    fontSize: 12,
    marginTop: spacing(0.5),
    fontWeight: '500',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
  },
  spacer: {
    width: 60,
  },

  // Instructions
  instructions: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
  },
  instructionText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing(0.5),
  },
  instructionSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Permission Screen
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(4),
    backgroundColor: colors.bg,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(3),
    marginBottom: spacing(1),
  },
  permissionText: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing(3),
  },
  permissionButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: radii.md,
    marginBottom: spacing(2),
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  cancelButtonText: {
    color: colors.subtext,
    fontSize: 16,
    fontWeight: '500',
  },
});