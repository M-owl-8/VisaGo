import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  useNotificationStore,
  NotificationPreferences,
} from '../../store/notifications';
import {DEFAULT_TOPIC} from '../../services/pushNotifications';
import Icon from 'react-native-vector-icons/Ionicons';

interface SettingItem {
  key: keyof NotificationPreferences;
  title: string;
  description: string;
  category: 'general' | 'content' | 'reminders';
}

const getSettings = (t: any): SettingItem[] => [
  {
    key: 'emailNotifications',
    title: t('notifications.emailNotifications'),
    description: t('notifications.emailDescription'),
    category: 'general',
  },
  {
    key: 'pushNotifications',
    title: t('notifications.pushNotifications'),
    description: t('notifications.pushDescription'),
    category: 'general',
  },
  {
    key: 'paymentConfirmations',
    title: t('notifications.paymentConfirmations'),
    description: t('notifications.paymentDescription'),
    category: 'content',
  },
  {
    key: 'documentUpdates',
    title: t('notifications.documentUpdates'),
    description: t('notifications.documentDescription'),
    category: 'content',
  },
  {
    key: 'visaStatusUpdates',
    title: t('notifications.visaStatusUpdates'),
    description: t('notifications.visaStatusDescription'),
    category: 'content',
  },
  {
    key: 'dailyReminders',
    title: t('notifications.dailyReminders'),
    description: t('notifications.dailyRemindersDescription'),
    category: 'reminders',
  },
  {
    key: 'newsUpdates',
    title: t('notifications.newsUpdates'),
    description: t('notifications.newsDescription'),
    category: 'reminders',
  },
];

export default function NotificationSettingsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const SETTINGS = getSettings(t);
  const {
    preferences,
    isLoading,
    updatePreferences,
    loadPreferences,
    setPushPermissionStatus,
    deviceToken,
    unsubscribeFromTopic,
    clearDeviceToken,
    pushPermissionStatus,
  } = useNotificationStore();
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  const handleToggle = async (key: string, value: boolean) => {
    const previousValue =
      localPreferences[key as keyof typeof localPreferences];
    const newPreferences = {
      ...localPreferences,
      [key]: value,
    };
    setLocalPreferences(newPreferences);

    setIsSaving(true);

    try {
      await updatePreferences({
        [key]: value,
      } as Partial<NotificationPreferences>);

      if (key === 'pushNotifications') {
        if (value) {
          setPushPermissionStatus('unknown');
        } else {
          setPushPermissionStatus('denied');
          if (deviceToken) {
            unsubscribeFromTopic(DEFAULT_TOPIC, deviceToken).catch(
              () => undefined,
            );
          }
          clearDeviceToken();
        }
      }
    } catch (error) {
      setLocalPreferences(current => ({
        ...current,
        [key]: previousValue,
      }));
      Alert.alert(t('common.error'), t('notifications.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const formatPermissionStatus = () => {
    switch (pushPermissionStatus) {
      case 'granted':
        return t('notifications.permissionGranted');
      case 'provisional':
        return t('notifications.permissionProvisional');
      case 'denied':
        return t('notifications.permissionDenied');
      default:
        return t('notifications.permissionUnknown');
    }
  };

  const openDeviceSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert(
        t('notifications.unableToOpenSettings'),
        t('notifications.openSettingsManually'),
      );
    });
  };

  const renderCategory = (category: string, categoryTitle: string) => {
    const categorySettings = SETTINGS.filter(s => s.category === category);

    return (
      <View key={category} style={styles.categoryContainer}>
        <Text style={styles.categoryTitle}>{categoryTitle}</Text>

        {categorySettings.map(setting => (
          <View key={setting.key} style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{setting.title}</Text>
              <Text style={styles.settingDescription}>
                {setting.description}
              </Text>
            </View>

            <Switch
              value={localPreferences[setting.key] as boolean}
              onValueChange={value => handleToggle(setting.key, value)}
              trackColor={{false: '#ddd', true: '#81C784'}}
              thumbColor={localPreferences[setting.key] ? '#4CAF50' : '#f4f3f4'}
              disabled={isLoading || isSaving}
            />
          </View>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.customHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.headerContainer}>
          <Text style={styles.headerDescription}>
            {t('notifications.manageDescription')}
          </Text>
        </View>

        {renderCategory('general', t('notifications.general'))}
        {renderCategory('content', t('notifications.contentUpdates'))}
        {renderCategory('reminders', t('notifications.reminders'))}

        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>{t('notifications.devicePermissionStatus')}</Text>
          <Text style={styles.permissionValue}>{formatPermissionStatus()}</Text>
          {(pushPermissionStatus === 'denied' ||
            pushPermissionStatus === 'unknown') && (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={openDeviceSettings}>
              <Text style={styles.permissionButtonText}>{t('notifications.openDeviceSettings')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>💡 {t('notifications.tip')}</Text>
          <Text style={styles.infoText}>
            {t('notifications.tipText')}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Text style={styles.saveButtonText}>{t('notifications.changesAutoSaved')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1929',
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#0A1929',
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    backgroundColor: '#0A1929',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  categoryContainer: {
    marginTop: 16,
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    marginHorizontal: 24,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    backgroundColor: 'rgba(15, 30, 45, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 158, 255, 0.1)',
  },
  settingContent: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  infoContainer: {
    marginHorizontal: 8,
    marginTop: 16,
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 18,
  },
  permissionContainer: {
    marginHorizontal: 8,
    marginTop: 16,
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FB8C00',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  permissionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#BF360C',
  },
  permissionButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E65100',
    borderRadius: 6,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonContainer: {
    marginHorizontal: 8,
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2e7d32',
  },
});
