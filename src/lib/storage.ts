import { storage, auth } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { log } from './logger';

export async function uploadImage(uri: string, path?: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to upload images');
  }

  log.info('Storage', 'Starting image upload', { userId: user.id, uri });

  try {
    // Compress and resize image before upload
    log.debug('Storage', 'Compressing image');
    const compressedImage = await ImageManipulator.manipulateAsync(
      uri,
      [
        { resize: { width: 800 } }, // Resize to max width of 800px
      ],
      {
        compress: 0.8, // 80% quality
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Create a unique filename if no path provided
    const filename = path || `images/${user.id}/${Date.now()}.jpg`;
    log.debug('Storage', 'Upload path determined', { filename });
    const storageRef = ref(storage, filename);

    // Convert URI to blob
    log.debug('Storage', 'Converting to blob');
    const response = await fetch(compressedImage.uri);
    if (!response.ok) {
      throw new Error(`Failed to fetch compressed image: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    log.debug('Storage', 'Blob created', { size: blob.size, type: blob.type });

    // Upload to Firebase Storage
    log.debug('Storage', 'Uploading to Firebase Storage');
    const snapshot = await uploadBytes(storageRef, blob);
    log.info('Storage', 'Upload successful', { bytesTransferred: snapshot.totalBytes });

    // Get download URL
    log.debug('Storage', 'Getting download URL');
    const downloadURL = await getDownloadURL(snapshot.ref);
    log.info('Storage', 'Upload complete', { downloadURL });

    return downloadURL;
  } catch (error) {
    log.error('Storage', 'Upload error', error, {
      code: error?.code,
      message: error?.message,
      serverResponse: error?.serverResponse,
      customData: error?.customData
    });

    // Provide more specific error messages
    if (error?.code === 'storage/unauthorized') {
      throw new Error('Storage access denied. Please check Firebase Storage rules.');
    }
    if (error?.code === 'storage/quota-exceeded') {
      throw new Error('Storage quota exceeded. Please upgrade your Firebase plan.');
    }
    if (error?.code === 'storage/unauthenticated') {
      throw new Error('User authentication expired. Please sign in again.');
    }
    if (error?.code === 'storage/unknown') {
      throw new Error('Unknown storage error. Please check your internet connection and Firebase configuration.');
    }

    log.error('Storage', 'Full error object', error);
    throw new Error(`Failed to upload image: ${error?.message || 'Unknown error'}`);
  }
}

export async function deleteImage(url: string): Promise<void> {
  try {
    // Extract path from URL to create reference
    const imageRef = ref(storage, url);
    await deleteObject(imageRef);
  } catch (error) {
    log.error('Storage', 'Error deleting image', error, { url });
    throw new Error('Failed to delete image');
  }
}

export async function uploadFile(uri: string, filename: string, contentType: string = 'application/octet-stream'): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to upload files');
  }

  try {
    const storageRef = ref(storage, `files/${user.id}/${filename}`);

    const response = await fetch(uri);
    const blob = await response.blob();

    const snapshot = await uploadBytes(storageRef, blob, {
      contentType,
    });

    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    log.error('Storage', 'Error uploading file', error, { filename, contentType });
    throw new Error('Failed to upload file');
  }
}