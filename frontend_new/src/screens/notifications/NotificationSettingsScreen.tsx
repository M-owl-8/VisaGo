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
import {
  useNotificationStore,
  NotificationPreferences,
} from '../../store/notifications';
import {DEFAULT_TOPIC} from '../../services/pushNotifications';

interface SettingItem {
  key: keyof NotificationPreferences;
  title: string;
  description: string;
  category: 'general' | 'content' | 'reminders';
}

const SETTINGS: SettingItem[] = [
  {
    key: 'emailNotifications',
    title: 'Email Notifications',
    description: 'Receive updates via email',
    category: 'general',
  },
  {
    key: 'pushNotifications',
    title: 'Push Notifications',
    description: 'Receive notifications on your device',
    category: 'general',
  },
  {
    key: 'paymentConfirmations',
    title: 'Payment Confirmations',
    description: 'Get notified when payments are processed',
    category: 'content',
  },
  {
    key: 'documentUpdates',
    title: 'Document Updates',
    description: 'Get notified about document verification status',
    category: 'content',
  },
  {
    key: 'visaStatusUpdates',
    title: 'Visa Status Updates',
    description: 'Get notified about changes to your visa applications',
    category: 'content',
  },
  {
    key: 'dailyReminders',
    title: 'Daily Reminders',
    description: 'Get reminders about missing documents',
    category: 'reminders',
  },
  {
    key: 'newsUpdates',
    title: 'News Updates',
    description: 'Get updates about visa policy changes',
    category: 'reminders',
  },
];

export const NotificationSettingsScreen: React.FC = () => {
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
      Alert.alert('Error', 'Failed to update preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatPermissionStatus = () => {
    switch (pushPermissionStatus) {
      case 'granted':
        return 'Granted';
      case 'provisional':
        return 'Provisional';
      case 'denied':
        return 'Denied';
      default:
        return 'Unknown';
    }
  };

  const openDeviceSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert(
        'Unable to open settings',
        'Please open your device settings manually to update notification permissions.',
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
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Notification Settings</Text>
          <Text style={styles.headerDescription}>
            Manage how you want to receive notifications and updates
          </Text>
        </View>

        {renderCategory('general', 'General')}
        {renderCategory('content', 'Content & Updates')}
        {renderCategory('reminders', 'Reminders')}

        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Device Permission Status</Text>
          <Text style={styles.permissionValue}>{formatPermissionStatus()}</Text>
          {(pushPermissionStatus === 'denied' ||
            pushPermissionStatus === 'unknown') && (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={openDeviceSettings}>
              <Text style={styles.permissionButtonText}>Open Device Settings</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>💡 Tip</Text>
          <Text style={styles.infoText}>
            Enable push notifications to get real-time updates about your visa
            applications.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Text style={styles.saveButtonText}>Changes are auto-saved</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  categoryContainer: {
    marginTop: 16,
    backgroundColor: 'white',
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#f9f9f9',
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
    borderBottomColor: '#f0f0f0',
  },
  settingContent: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#999',
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
