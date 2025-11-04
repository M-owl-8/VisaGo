import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Text,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/auth.store';
import { useNotificationStore } from '../../store/notification.store';
import { api } from '../../api/client';
import { colors, spacing, typography } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ProfileEditData {
  firstName: string;
  lastName: string;
  phone: string;
  language: string;
  profileImage?: string;
}

export const ProfileEditScreen = ({ navigation }: any) => {
  const { user, setUser } = useAuthStore();
  const { showNotification } = useNotificationStore();

  const [formData, setFormData] = useState<ProfileEditData>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    language: user?.language || 'en',
    profileImage: user?.profileImage || '',
  });

  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Reset form when user data changes
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        language: user.language || 'en',
        profileImage: user.profileImage || '',
      });
    }
  }, [user]);

  /**
   * Pick image from device gallery
   */
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        setFormData((prev) => ({
          ...prev,
          profileImage: result.assets[0].uri,
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showNotification('error', 'Failed to pick image');
    }
  };

  /**
   * Take photo with camera
   */
  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        setFormData((prev) => ({
          ...prev,
          profileImage: result.assets[0].uri,
        }));
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showNotification('error', 'Failed to take photo');
    }
  };

  /**
   * Show image picker options
   */
  const handleImageSelection = () => {
    Alert.alert('Profile Picture', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: handleTakePhoto,
      },
      {
        text: 'Choose from Gallery',
        onPress: handlePickImage,
      },
      {
        text: 'Cancel',
        onPress: () => {},
        style: 'cancel',
      },
    ]);
  };

  /**
   * Upload image to server
   */
  const uploadImage = async (imageUri: string): Promise<string> => {
    try {
      const formDataToSend = new FormData();
      const filename = imageUri.split('/').pop() || 'profile.jpg';
      formDataToSend.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: filename,
      } as any);

      const response = await api.post('/users/upload-profile-image', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      showNotification('error', 'First name is required');
      return false;
    }

    if (!formData.lastName.trim()) {
      showNotification('error', 'Last name is required');
      return false;
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone)) {
      showNotification('error', 'Invalid phone number');
      return false;
    }

    return true;
  };

  /**
   * Save profile changes
   */
  const handleSaveProfile = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      let imageUrl = formData.profileImage;

      // Upload new image if selected
      if (selectedImage && selectedImage.uri !== user?.profileImage) {
        imageUrl = await uploadImage(selectedImage.uri);
      }

      // Update profile on server
      const response = await api.put('/users/profile', {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        language: formData.language,
        profileImage: imageUrl,
      });

      // Update local state
      setUser(response.data.user);
      setSelectedImage(null);

      showNotification('success', 'Profile updated successfully');

      // Navigate back
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (error) {
      console.error('Error saving profile:', error);
      showNotification('error', 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle input changes
   */
  const handleInputChange = (field: keyof ProfileEditData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={styles.backButton} />
          </View>

          {/* Profile Picture Section */}
          <View style={styles.profileImageSection}>
            <TouchableOpacity
              onPress={handleImageSelection}
              style={styles.imageContainer}
            >
              {formData.profileImage ? (
                <>
                  <Image
                    source={{ uri: formData.profileImage }}
                    style={styles.profileImage}
                  />
                  <View style={styles.imageOverlay}>
                    <Text style={styles.overlayText}>Change Photo</Text>
                  </View>
                </>
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderText}>📷</Text>
                  <Text style={styles.placeholderLabel}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            {/* First Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter first name"
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
                placeholderTextColor={colors.gray400}
                editable={!isSaving}
              />
            </View>

            {/* Last Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter last name"
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
                placeholderTextColor={colors.gray400}
                editable={!isSaving}
              />
            </View>

            {/* Phone Number */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                keyboardType="phone-pad"
                placeholderTextColor={colors.gray400}
                editable={!isSaving}
              />
              <Text style={styles.helperText}>
                Include country code (e.g., +1 555-123-4567)
              </Text>
            </View>

            {/* Language Preference */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Language</Text>
              <View style={styles.languageSelector}>
                {['en', 'es', 'fr', 'de', 'ja'].map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    onPress={() => handleInputChange('language', lang)}
                    style={[
                      styles.languageButton,
                      formData.language === lang && styles.languageButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.languageButtonText,
                        formData.language === lang &&
                          styles.languageButtonTextActive,
                      ]}
                    >
                      {lang.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={isSaving}
              style={[
                styles.saveButton,
                isSaving && styles.saveButtonDisabled,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            {/* Additional Info */}
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Email Address</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
              <Text style={styles.infoHint}>
                Email cannot be changed. Contact support if needed.
              </Text>
            </View>
          </View>

          {/* Spacing */}
          <View style={styles.spacing} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backButton: {
    width: 60,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
  },
  profileImageSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  placeholderLabel: {
    fontSize: 14,
    color: colors.gray600,
    fontWeight: '500',
  },
  formSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.dark,
    backgroundColor: colors.gray50,
  },
  helperText: {
    fontSize: 12,
    color: colors.gray600,
    marginTop: spacing.xs,
  },
  languageSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  languageButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.gray50,
    alignItems: 'center',
  },
  languageButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  languageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray700,
  },
  languageButtonTextActive: {
    color: colors.white,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  infoSection: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.gray50,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  infoValue: {
    fontSize: 14,
    color: colors.gray700,
    marginBottom: spacing.sm,
  },
  infoHint: {
    fontSize: 12,
    color: colors.gray500,
    fontStyle: 'italic',
  },
  spacing: {
    height: spacing.lg,
  },
});