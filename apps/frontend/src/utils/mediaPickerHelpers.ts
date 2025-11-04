/**
 * Media Picker Utilities
 * Handles camera, gallery, and file picking
 */

import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Platform, Alert } from "react-native";

export interface PickedFile {
  uri: string;
  name: string;
  size?: number;
  type?: string;
  mimeType?: string;
}

/**
 * Request permissions for media library and camera
 */
export const requestMediaPermissions = async (): Promise<boolean> => {
  try {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaLibraryPermission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (
      cameraPermission.status === "granted" &&
      mediaLibraryPermission.status === "granted"
    ) {
      return true;
    }

    Alert.alert(
      "Permissions Denied",
      "Please enable camera and photo library permissions in settings"
    );
    return false;
  } catch (error) {
    console.error("Permission request error:", error);
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

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      return {
        uri: asset.uri,
        name: `photo_${Date.now()}.jpg`,
        size: asset.fileSize,
        type: "image",
        mimeType: "image/jpeg",
      };
    }

    return null;
  } catch (error) {
    console.error("Camera pick error:", error);
    Alert.alert("Error", "Failed to capture photo");
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

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      const fileName = asset.uri.split("/").pop() || `image_${Date.now()}.jpg`;

      return {
        uri: asset.uri,
        name: fileName,
        size: asset.fileSize,
        type: "image",
        mimeType: asset.mimeType || "image/jpeg",
      };
    }

    return null;
  } catch (error) {
    console.error("Gallery pick error:", error);
    Alert.alert("Error", "Failed to pick image");
    return null;
  }
};

/**
 * Pick PDF or document file
 */
export const pickDocument = async (): Promise<PickedFile | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      return {
        uri: asset.uri,
        name: asset.name,
        size: asset.size,
        type: "document",
        mimeType: asset.mimeType,
      };
    }

    return null;
  } catch (error) {
    console.error("Document pick error:", error);
    Alert.alert("Error", "Failed to pick document");
    return null;
  }
};

/**
 * Convert file URI to FormData-compatible object
 */
export const prepareFileForUpload = (file: PickedFile): any => {
  const fileName = file.name;
  const mimeType = file.mimeType || "application/octet-stream";

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
  maxSizeInMB: number = 20
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
  onDocumentPress: () => void
): void => {
  Alert.alert("Select File Source", "Choose how to upload your document", [
    {
      text: "Take Photo",
      onPress: onCameraPress,
    },
    {
      text: "Choose from Gallery",
      onPress: onGalleryPress,
    },
    {
      text: "Pick Document (PDF/Word)",
      onPress: onDocumentPress,
    },
    {
      text: "Cancel",
      onPress: () => {},
      style: "cancel",
    },
  ]);
};