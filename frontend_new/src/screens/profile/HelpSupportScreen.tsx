/**
 * Help & Support Screen
 * Get help with your application
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

export const HelpSupportScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  
  const handleContact = (type: 'email' | 'phone') => {
    if (type === 'email') {
      Linking.openURL(`mailto:${t('helpSupport.supportEmail')}`);
    } else {
      Linking.openURL(`tel:${t('helpSupport.supportPhone').replace(/\s/g, '')}`);
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
            <Text style={styles.headerTitle}>{t('helpSupport.title')}</Text>
            <View style={styles.backButton} />
          </View>

          {/* Help Options */}
          <View style={styles.helpContainer}>
            <TouchableOpacity
              style={styles.helpItem}
              onPress={() => handleContact('email')}
              activeOpacity={0.7}
            >
              <View style={[styles.helpIcon, { backgroundColor: 'rgba(6, 182, 212, 0.2)' }]}>
                <Icon name="mail-outline" size={24} color="#06B6D4" />
              </View>
              <View style={styles.helpContent}>
                <Text style={styles.helpTitle}>{t('helpSupport.emailSupport')}</Text>
                <Text style={styles.helpSubtitle}>{t('helpSupport.supportEmail')}</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helpItem}
              onPress={() => handleContact('phone')}
              activeOpacity={0.7}
            >
              <View style={[styles.helpIcon, { backgroundColor: 'rgba(6, 182, 212, 0.2)' }]}>
                <Icon name="call-outline" size={24} color="#06B6D4" />
              </View>
              <View style={styles.helpContent}>
                <Text style={styles.helpTitle}>{t('helpSupport.phoneSupport')}</Text>
                <Text style={styles.helpSubtitle}>{t('helpSupport.supportPhone')}</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>

            <View style={styles.infoCard}>
              <Icon name="information-circle-outline" size={24} color="#06B6D4" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>{t('helpSupport.needHelp')}</Text>
                <Text style={styles.infoText}>
                  {t('helpSupport.supportAvailable')}
                </Text>
              </View>
            </View>
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
  helpContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    gap: 12,
  },
  helpIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  helpSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
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
});

