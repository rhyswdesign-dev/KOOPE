/**
 * MEDIA UPLOADER COMPONENT
 * Handles image uploading with progress tracking, compression, and editing
 * Integrates with camera capture and gallery picker
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors, spacing, radii } from '../../theme/tokens';
import CameraCapture from '../camera/CameraCapture';
import { log } from '../../lib/logger';

interface MediaUploaderProps {
  onImageSelected: (imageUri: string, metadata?: ImageMetadata) => void;
  placeholder?: string;
  aspectRatio?: [number, number];
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  allowEditing?: boolean;
  style?: any;
}

interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  type: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

const { width: screenWidth } = Dimensions.get('window');

/**
 * Media uploader with camera integration and basic editing
 */
export default function MediaUploader({
  onImageSelected,
  placeholder = "Add Photo",
  aspectRatio = [4, 3],
  maxWidth = 1024,
  maxHeight = 768,
  quality = 0.8,
  allowEditing = true,
  style,
}: MediaUploaderProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  /**
   * Handle image selection from camera or gallery
   */
  const handleImageSelected = async (imageUri: string) => {
    try {
      setIsProcessing(true);

      // Get image info
      const imageInfo = await ImageManipulator.manipulateAsync(
        imageUri,
        [],
        { format: ImageManipulator.SaveFormat.JPEG }
      );

      if (allowEditing) {
        setSelectedImage(imageInfo.uri);
        setShowEditor(true);
      } else {
        await processAndUploadImage(imageInfo.uri);
      }
    } catch (error) {
      log.error('MediaUploader', 'Failed to process image', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Process image with compression and resizing
   */
  const processAndUploadImage = async (imageUri: string) => {
    try {
      setIsProcessing(true);

      // Calculate resize dimensions
      const manipulateActions: ImageManipulator.Action[] = [];

      // Add resize if needed
      if (maxWidth || maxHeight) {
        manipulateActions.push({
          resize: {
            width: maxWidth,
            height: maxHeight,
          },
        });
      }

      // Process image
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        manipulateActions,
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Get metadata
      const metadata: ImageMetadata = {
        width: result.width,
        height: result.height,
        size: 0, // Would need to calculate actual file size
        type: 'image/jpeg',
      };

      // Simulate upload progress
      await simulateUploadProgress();

      setSelectedImage(result.uri);
      onImageSelected(result.uri, metadata);

    } catch (error) {
      log.error('MediaUploader', 'Failed to process and upload image', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  };

  /**
   * Simulate upload progress for demo
   */
  const simulateUploadProgress = (): Promise<void> => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          setUploadProgress({ loaded: 100, total: 100, percentage: 100 });
          clearInterval(interval);
          setTimeout(resolve, 500);
        } else {
          setUploadProgress({ loaded: progress, total: 100, percentage: progress });
        }
      }, 200);
    });
  };

  /**
   * Handle crop/edit confirmation
   */
  const handleEditConfirm = async (editedUri: string) => {
    setShowEditor(false);
    await processAndUploadImage(editedUri);
  };

  /**
   * Remove selected image
   */
  const removeImage = () => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setSelectedImage(null);
            setUploadProgress(null);
          },
        },
      ]
    );
  };

  /**
   * Show action sheet for image source
   */
  const showImageSourceOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose how you want to add a photo',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take Photo',
          onPress: () => setShowCamera(true),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => {
            // This would open gallery picker
            // For now, we'll just open camera
            setShowCamera(true);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, style]}>
      {selectedImage ? (
        // Image Preview
        <View style={styles.imageContainer}>
          <Image source={{ uri: selectedImage }} style={styles.image} />

          {/* Upload Progress Overlay */}
          {uploadProgress && uploadProgress.percentage < 100 && (
            <View style={styles.progressOverlay}>
              <ActivityIndicator size="large" color={colors.white} />
              <Text style={styles.progressText}>
                Uploading... {Math.round(uploadProgress.percentage)}%
              </Text>
            </View>
          )}

          {/* Image Actions */}
          <View style={styles.imageActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => setShowEditor(true)}
            >
              <Ionicons name="create-outline" size={16} color={colors.white} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.removeButton]}
              onPress={removeImage}
            >
              <Ionicons name="trash-outline" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Upload Placeholder
        <TouchableOpacity
          style={[styles.uploadContainer, isProcessing && styles.uploadContainerDisabled]}
          onPress={showImageSourceOptions}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <Ionicons name="camera-outline" size={48} color={colors.subtext} />
              <Text style={styles.placeholderText}>{placeholder}</Text>
              <Text style={styles.placeholderSubtext}>
                Tap to take a photo or select from gallery
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Camera Modal */}
      <CameraCapture
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onImageCaptured={handleImageSelected}
        title="Capture Cocktail"
      />

      {/* Simple Editor Modal */}
      {showEditor && selectedImage && (
        <SimpleImageEditor
          visible={showEditor}
          imageUri={selectedImage}
          onClose={() => setShowEditor(false)}
          onConfirm={handleEditConfirm}
          aspectRatio={aspectRatio}
        />
      )}
    </View>
  );
}

/**
 * Simple image editor component
 */
interface SimpleImageEditorProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onConfirm: (editedUri: string) => void;
  aspectRatio: [number, number];
}

function SimpleImageEditor({
  visible,
  imageUri,
  onClose,
  onConfirm,
  aspectRatio,
}: SimpleImageEditorProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Apply crop to image
   */
  const applyCrop = async () => {
    try {
      setIsProcessing(true);

      // For demo purposes, we'll just apply a simple crop
      // In a real app, you'd implement proper crop functionality
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: 0,
              originY: 0,
              width: 800,
              height: 600,
            },
          },
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      onConfirm(result.uri);
    } catch (error) {
      log.error('SimpleImageEditor', 'Failed to apply crop', error);
      Alert.alert('Error', 'Failed to edit image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.editorContainer}>
        {/* Header */}
        <View style={styles.editorHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.editorCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.editorTitle}>Edit Photo</Text>
          <TouchableOpacity onPress={applyCrop} disabled={isProcessing}>
            <Text style={[styles.editorDoneText, isProcessing && styles.editorDoneTextDisabled]}>
              {isProcessing ? 'Processing...' : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Image Preview */}
        <View style={styles.editorImageContainer}>
          <Image source={{ uri: imageUri }} style={styles.editorImage} />

          {/* Crop Overlay */}
          <View style={styles.cropOverlay}>
            <View style={styles.cropFrame} />
          </View>
        </View>

        {/* Tools */}
        <View style={styles.editorTools}>
          <TouchableOpacity style={styles.toolButton}>
            <Ionicons name="crop-outline" size={24} color={colors.text} />
            <Text style={styles.toolButtonText}>Crop</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton}>
            <Ionicons name="color-filter-outline" size={24} color={colors.text} />
            <Text style={styles.toolButtonText}>Filter</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton}>
            <Ionicons name="sunny-outline" size={24} color={colors.text} />
            <Text style={styles.toolButtonText}>Brightness</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },

  // Upload Container
  uploadContainer: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.line,
    borderStyle: 'dashed',
    padding: spacing(3),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  uploadContainerDisabled: {
    opacity: 0.6,
  },
  placeholderContainer: {
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(0.5),
  },
  placeholderSubtext: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
  },

  // Processing
  processingContainer: {
    alignItems: 'center',
  },
  processingText: {
    fontSize: 16,
    color: colors.accent,
    marginTop: spacing(2),
    fontWeight: '500',
  },

  // Image Preview
  imageContainer: {
    position: 'relative',
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },

  // Progress Overlay
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing(1),
  },

  // Image Actions
  imageActions: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    flexDirection: 'row',
    gap: spacing(1),
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  removeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },

  // Editor
  editorContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  editorCancelText: {
    fontSize: 16,
    color: colors.subtext,
  },
  editorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  editorDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
  editorDoneTextDisabled: {
    color: colors.subtext,
  },

  // Editor Image
  editorImageContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  editorImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  cropOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropFrame: {
    width: screenWidth * 0.8,
    height: (screenWidth * 0.8) * (3/4), // 4:3 aspect ratio
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: radii.md,
  },

  // Editor Tools
  editorTools: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing(2),
    backgroundColor: colors.card,
  },
  toolButton: {
    alignItems: 'center',
    padding: spacing(1),
  },
  toolButtonText: {
    fontSize: 12,
    color: colors.text,
    marginTop: spacing(0.5),
  },
});