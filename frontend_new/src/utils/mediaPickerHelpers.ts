/**
 * Media Picker Utilities
 * Handles camera, gallery, and file picking
 * Uses React Native CLI modules (not Expo)
 */

import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
  MediaType,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import {Platform, Alert, PermissionsAndroid} from 'react-native';

export interface PickedFile {
  uri: string;
  name: string;
  size?: number;
  type?: string;
  mimeType?: string;
}

/**
 * Request permissions for media library and camera (Android)
 */
export const requestMediaPermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      const cameraPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      const storagePermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      );

      if (
        cameraPermission === PermissionsAndroid.RESULTS.GRANTED &&
        storagePermission === PermissionsAndroid.RESULTS.GRANTED
      ) {
        return true;
      }

      Alert.alert(
        'Permissions Denied',
        'Please enable camera and storage permissions in settings',
      );
      return false;
    }
    // iOS permissions are requested automatically by the picker
    return true;
  } catch (error) {
    console.error('Permission request error:', error);
    return false;
  }
};

/**
 * Pick image from camera
 */
export const pickFromCamera = async (): Promise<PickedFile | null> => {
  try {
    const hasPermission = await requestMediaPermissions();
    if (!hasPermission) return null;

    const options: CameraOptions = {
      mediaType: 'photo',
      quality: 1,
      saveToPhotos: true,
    };

    const result: ImagePickerResponse = await launchCamera(options);

    if (result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      return {
        uri: asset.uri || '',
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        size: asset.fileSize,
        type: 'image',
        mimeType: asset.type || 'image/jpeg',
      };
    }

    return null;
  } catch (error) {
    console.error('Camera pick error:', error);
    Alert.alert('Error', 'Failed to capture photo');
    return null;
  }
};

/**
 * Pick image from gallery
 */
export const pickFromGallery = async (): Promise<PickedFile | null> => {
  try {
    const hasPermission = await requestMediaPermissions();
    if (!hasPermission) return null;

    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 1,
    };

    const result: ImagePickerResponse = await launchImageLibrary(options);

    if (result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const fileName =
        asset.fileName ||
        asset.uri?.split('/').pop() ||
        `image_${Date.now()}.jpg`;

      return {
        uri: asset.uri || '',
        name: fileName,
        size: asset.fileSize,
        type: 'image',
        mimeType: asset.type || 'image/jpeg',
      };
    }

    return null;
  } catch (error) {
    console.error('Gallery pick error:', error);
    Alert.alert('Error', 'Failed to pick image');
    return null;
  }
};

/**
 * Pick PDF or document file
 */
export const pickDocument = async (): Promise<PickedFile | null> => {
  try {
    const result = await DocumentPicker.pick({
      type: [
        DocumentPicker.types.pdf,
        DocumentPicker.types.doc,
        DocumentPicker.types.docx,
      ],
      copyTo: 'cachesDirectory',
    });

    if (result && result.length > 0) {
      const file = result[0];
      return {
        uri: file.uri,
        name: file.name || `document_${Date.now()}.pdf`,
        size: file.size,
        type: 'document',
        mimeType: file.type || 'application/pdf',
      };
    }

    return null;
  } catch (error: any) {
    if (DocumentPicker.isCancel(error)) {
      // User cancelled
      return null;
    }
    console.error('Document pick error:', error);
    Alert.alert('Error', 'Failed to pick document');
    return null;
  }
};

/**
 * Convert file URI to FormData-compatible object
 */
export const prepareFileForUpload = (file: PickedFile): any => {
  const fileName = file.name;
  const mimeType = file.mimeType || 'application/octet-stream';

  return {
    uri: file.uri,
    name: fileName,
    type: mimeType,
  };
};

/**
 * Validate file size
 */
export const isFileSizeValid = (
  sizeInBytes: number,
  maxSizeInMB: number = 20,
): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return sizeInBytes <= maxSizeInBytes;
};

/**
 * Get file size in MB
 */
export const getFileSizeInMB = (sizeInBytes: number): number => {
  return Math.round((sizeInBytes / (1024 * 1024)) * 100) / 100;
};

/**
 * Show file picker options
 */
export const showFilePickerOptions = (
  onCameraPress: () => void,
  onGalleryPress: () => void,
  onDocumentPress: () => void,
): void => {
  Alert.alert('Select File Source', 'Choose how to upload your document', [
    {
      text: 'Take Photo',
      onPress: onCameraPress,
    },
    {
      text: 'Choose from Gallery',
      onPress: onGalleryPress,
    },
    {
      text: 'Pick Document (PDF/Word)',
      onPress: onDocumentPress,
    },
    {
      text: 'Cancel',
      onPress: () => {},
      style: 'cancel',
    },
  ]);
};







