/**
 * Language Selection Screen
 * Allows users to change app language
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ru', name: 'Русский', nativeName: 'Русский' },
  { code: 'uz', name: "O'zbek", nativeName: "O'zbek" },
];

export const LanguageScreen = ({ navigation }: any) => {
  const { i18n, t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');

  useEffect(() => {
    setSelectedLanguage(i18n.language || 'en');
  }, [i18n.language]);

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await i18n.changeLanguage(languageCode);
      await AsyncStorage.setItem('app_language', languageCode);
      setSelectedLanguage(languageCode);
      
      // Reload user applications after language change to prevent them from disappearing
      try {
        const { useAuthStore } = require('../../store/auth');
        const authStore = useAuthStore.getState();
        if (authStore.isSignedIn && authStore.user) {
          await authStore.fetchUserApplications();
        }
      } catch (error) {
        console.warn('Failed to reload applications after language change:', error);
      }
    } catch (error) {
      console.error('Failed to change language:', error);
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
            <Text style={styles.headerTitle}>{t('profile.language')}</Text>
            <View style={styles.backButton} />
          </View>

          {/* Language Options */}
          <View style={styles.languageContainer}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageItem,
                  selectedLanguage === lang.code && styles.languageItemSelected,
                ]}
                onPress={() => handleLanguageChange(lang.code)}
                activeOpacity={0.7}
              >
                <View style={styles.languageContent}>
                  <Text style={styles.languageName}>{lang.nativeName}</Text>
                  <Text style={styles.languageCode}>{lang.name}</Text>
                </View>
                {selectedLanguage === lang.code && (
                  <Icon name="checkmark-circle" size={24} color="#10B981" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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
  languageContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  languageItemSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  languageContent: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  languageCode: {
    fontSize: 14,
    color: '#94A3B8',
  },
});

