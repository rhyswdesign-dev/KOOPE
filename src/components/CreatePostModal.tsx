/**
 * CREATE POST MODAL
 * Modal for creating community posts
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { log } from '../lib/logger';
import { colors, spacing, radii } from '../theme/tokens';
import * as ImagePicker from 'expo-image-picker';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (postData: { content: string; image?: string; type: string }) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const POST_TYPES = [
  { id: 'general', label: 'General', icon: 'chatbubble', color: colors.accent },
  { id: 'review', label: 'Review', icon: 'star', color: '#FF6B35' },
  { id: 'discovery', label: 'Discovery', icon: 'compass', color: '#8B5CF6' },
  { id: 'achievement', label: 'Achievement', icon: 'trophy', color: '#F59E0B' },
  { id: 'event', label: 'Event', icon: 'calendar', color: '#10B981' },
];

export default function CreatePostModal({
  visible,
  onClose,
  onSuccess,
}: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [postType, setPostType] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setContent('');
    setSelectedImage(null);
    setPostType('general');
    onClose();
  };

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to add images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Content Required', 'Please write something to share with the community.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Prepare post data
      const postData = {
        content,
        image: selectedImage,
        type: postType,
      };

      // TODO: In a real app, this would save to a backend
      log.info('CreatePostModal', 'Creating post', {
        ...postData,
        timestamp: new Date().toISOString(),
      });

      onSuccess(postData);
      handleClose();
      Alert.alert('Success!', 'Your post has been shared with the community.');
    } catch (error) {
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTypeData = POST_TYPES.find(type => type.id === postType);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.modal}>
          <View style={styles.header}>
            <Pressable style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>Create Post</Text>
            <Pressable
              style={[
                styles.postButton,
                (!content.trim() || isSubmitting) && styles.postButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!content.trim() || isSubmitting}
            >
              <Text style={[
                styles.postButtonText,
                (!content.trim() || isSubmitting) && styles.postButtonTextDisabled
              ]}>
                {isSubmitting ? 'Posting...' : 'Post'}
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Post Type Selection */}
            <View style={styles.typeSection}>
              <Text style={styles.sectionLabel}>Post Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {POST_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeOption,
                      postType === type.id && { backgroundColor: type.color + '20', borderColor: type.color }
                    ]}
                    onPress={() => setPostType(type.id)}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={20}
                      color={postType === type.id ? type.color : colors.subtext}
                    />
                    <Text style={[
                      styles.typeText,
                      postType === type.id && { color: type.color }
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Content Input */}
            <View style={styles.contentSection}>
              <Text style={styles.sectionLabel}>What's on your mind?</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Share your thoughts, experiences, or discoveries..."
                placeholderTextColor={colors.subtext}
                value={content}
                onChangeText={setContent}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>{content.length}/500</Text>
            </View>

            {/* Image Section */}
            <View style={styles.imageSection}>
              <View style={styles.imageHeader}>
                <Text style={styles.sectionLabel}>Add Image (Optional)</Text>
                {selectedImage && (
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Ionicons name="trash" size={16} color={colors.error} />
                    <Text style={styles.removeImageText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              {selectedImage ? (
                <TouchableOpacity style={styles.imageContainer} onPress={handleImagePicker}>
                  <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                  <View style={styles.imageOverlay}>
                    <Ionicons name="camera" size={24} color={colors.white} />
                    <Text style={styles.changeImageText}>Tap to change</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.imagePicker} onPress={handleImagePicker}>
                  <Ionicons name="camera" size={32} color={colors.subtext} />
                  <Text style={styles.imagePickerText}>Add a photo</Text>
                  <Text style={styles.imagePickerSubtext}>Share a visual with your post</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Post Preview */}
            {(content.trim() || selectedImage) && (
              <View style={styles.previewSection}>
                <Text style={styles.sectionLabel}>Preview</Text>
                <View style={styles.previewCard}>
                  <View style={styles.previewHeader}>
                    <View style={styles.previewAuthor}>
                      <View style={styles.previewAvatar} />
                      <View>
                        <Text style={styles.previewName}>You</Text>
                        <Text style={styles.previewTime}>Now</Text>
                      </View>
                    </View>
                    {selectedTypeData && (
                      <View style={[styles.previewTypeBadge, { backgroundColor: selectedTypeData.color + '20' }]}>
                        <Ionicons name={selectedTypeData.icon as any} size={14} color={selectedTypeData.color} />
                        <Text style={[styles.previewTypeText, { color: selectedTypeData.color }]}>
                          {selectedTypeData.label}
                        </Text>
                      </View>
                    )}
                  </View>
                  {content.trim() && (
                    <Text style={styles.previewContent}>{content}</Text>
                  )}
                  {selectedImage && (
                    <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: screenHeight * 0.9,
    paddingTop: spacing(3),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  cancelButton: {
    padding: spacing(1),
  },
  cancelText: {
    fontSize: 16,
    color: colors.subtext,
  },
  postButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.md,
  },
  postButtonDisabled: {
    backgroundColor: colors.line,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  postButtonTextDisabled: {
    color: colors.subtext,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing(3),
  },
  typeSection: {
    marginTop: spacing(2),
    marginBottom: spacing(3),
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1.5),
  },
  typeScroll: {
    flexDirection: 'row',
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    marginRight: spacing(1.5),
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(1),
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.subtext,
  },
  contentSection: {
    marginBottom: spacing(3),
  },
  textInput: {
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: spacing(2),
    fontSize: 16,
    color: colors.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.line,
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: colors.subtext,
    marginTop: spacing(1),
  },
  imageSection: {
    marginBottom: spacing(3),
  },
  imageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(1.5),
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  removeImageText: {
    fontSize: 14,
    color: colors.error,
  },
  imagePicker: {
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: spacing(4),
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.line,
    borderStyle: 'dashed',
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing(1),
  },
  imagePickerSubtext: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: spacing(0.5),
  },
  imageContainer: {
    position: 'relative',
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: radii.lg,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeImageText: {
    fontSize: 14,
    color: colors.white,
    marginTop: spacing(0.5),
  },
  previewSection: {
    marginBottom: spacing(4),
  },
  previewCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(1.5),
  },
  previewAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  previewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
  },
  previewName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  previewTime: {
    fontSize: 12,
    color: colors.subtext,
  },
  previewTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
    gap: spacing(0.5),
  },
  previewTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewContent: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing(1.5),
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: radii.md,
  },
});