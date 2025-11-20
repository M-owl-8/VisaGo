/**
 * Profile Edit Screen - Simplified
 * Only allows editing First Name and Phone Number
 * Information is saved and accessible to AI
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth';
import { useNotificationStore } from '../../store/notifications';
import { apiClient } from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ProfileEditData {
  firstName: string;
  phone: string;
}

export const ProfileEditScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const { addNotification } = useNotificationStore();

  const [formData, setFormData] = useState<ProfileEditData>({
    firstName: user?.firstName || '',
    phone: user?.phone || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      addNotification({ 
        type: 'error', 
        title: t('profile.validationError'), 
        message: t('profile.firstNameRequired') 
      });
      return false;
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone)) {
      addNotification({ 
        type: 'error', 
        title: t('profile.validationError'), 
        message: t('profile.invalidPhoneFormat') 
      });
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
      // Update profile on server
      await updateProfile({
        firstName: formData.firstName.trim(),
        phone: formData.phone.trim(),
      });

      addNotification({ 
        type: 'success', 
        title: t('common.success'), 
        message: t('profile.profileUpdated') 
      });

      // Navigate back
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (error) {
      console.error('Error saving profile:', error);
      addNotification({ 
        type: 'error', 
        title: 'Error', 
        message: 'Failed to save profile' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.gradientBackground}>
        {/* Background Pattern */}
        <View style={styles.backgroundPattern}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{t('profile.editProfile')}</Text>
              <View style={styles.backButton} />
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              {/* First Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('profile.firstName')} *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('profile.firstName')}
                  placeholderTextColor="#94A3B8"
                  value={formData.firstName}
                  onChangeText={(value) => setFormData({ ...formData, firstName: value })}
                  editable={!isSaving}
                />
              </View>

              {/* Phone Number */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('profile.phoneNumber')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('profile.enterPhoneNumber')}
                  placeholderTextColor="#94A3B8"
                  value={formData.phone}
                  onChangeText={(value) => setFormData({ ...formData, phone: value })}
                  keyboardType="phone-pad"
                  editable={!isSaving}
                />
                <Text style={styles.helperText}>
                  {t('profile.phoneHint')}
                </Text>
              </View>

              {/* Info Card */}
              <View style={styles.infoCard}>
                <Icon name="information-circle-outline" size={24} color="#4A9EFF" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>{t('profile.yourInformation')}</Text>
                  <Text style={styles.infoText}>
                    {t('profile.informationSaved')}
                  </Text>
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
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>{t('profile.saveChanges')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
    backgroundColor: '#0A1929',
  },
  backgroundPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.1)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -50,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  formSection: {
    paddingHorizontal: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: '#4A9EFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
