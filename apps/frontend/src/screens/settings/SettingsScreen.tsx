import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Switch,
  Alert,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { useNotificationStore } from '../../store/notification.store';
import { api } from '../../api/client';
import { colors, spacing } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface UserSettings {
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  paymentNotifications: boolean;
  visaUpdateNotifications: boolean;
  chatNotifications: boolean;
  darkMode: boolean;
  language: string;
  allowAnalytics: boolean;
  allowCookies: boolean;
  dataRetention: string;
}

export const SettingsScreen = ({ navigation }: any) => {
  const { user, logout } = useAuthStore();
  const { showNotification } = useNotificationStore();

  const [settings, setSettings] = useState<UserSettings>({
    notificationsEnabled: true,
    emailNotifications: true,
    paymentNotifications: true,
    visaUpdateNotifications: true,
    chatNotifications: true,
    darkMode: false,
    language: 'en',
    allowAnalytics: true,
    allowCookies: true,
    dataRetention: '1year',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  /**
   * Load settings from server
   */
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/users/settings');
      setSettings(response.data.settings);
    } catch (error) {
      console.error('Error loading settings:', error);
      showNotification('error', 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Save settings to server
   */
  const saveSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      setIsSaving(true);
      const updatedSettings = { ...settings, ...newSettings };

      await api.put('/users/settings', updatedSettings);

      setSettings(updatedSettings);
      showNotification('success', 'Settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle notification toggle
   */
  const handleNotificationToggle = (key: keyof UserSettings, value: boolean) => {
    const newSettings: Partial<UserSettings> = { [key]: value };

    // If disabling all notifications, disable specific types
    if (key === 'notificationsEnabled' && !value) {
      newSettings.emailNotifications = false;
      newSettings.paymentNotifications = false;
      newSettings.visaUpdateNotifications = false;
      newSettings.chatNotifications = false;
    }

    saveSettings(newSettings);
  };

  /**
   * Handle language change
   */
  const handleLanguageChange = () => {
    Alert.alert('Select Language', 'Choose your preferred language', [
      {
        text: 'English',
        onPress: () => saveSettings({ language: 'en' }),
      },
      {
        text: 'Spanish',
        onPress: () => saveSettings({ language: 'es' }),
      },
      {
        text: 'French',
        onPress: () => saveSettings({ language: 'fr' }),
      },
      {
        text: 'German',
        onPress: () => saveSettings({ language: 'de' }),
      },
      {
        text: 'Japanese',
        onPress: () => saveSettings({ language: 'ja' }),
      },
      {
        text: 'Cancel',
        onPress: () => {},
        style: 'cancel',
      },
    ]);
  };

  /**
   * Handle data retention change
   */
  const handleDataRetentionChange = () => {
    Alert.alert('Data Retention', 'How long should we keep your data?', [
      {
        text: '30 Days',
        onPress: () => saveSettings({ dataRetention: '30days' }),
      },
      {
        text: '1 Year',
        onPress: () => saveSettings({ dataRetention: '1year' }),
      },
      {
        text: 'Forever',
        onPress: () => saveSettings({ dataRetention: 'forever' }),
      },
      {
        text: 'Cancel',
        onPress: () => {},
        style: 'cancel',
      },
    ]);
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Logout',
        onPress: async () => {
          try {
            await logout();
            showNotification('success', 'Logged out successfully');
          } catch (error) {
            showNotification('error', 'Failed to logout');
          }
        },
        style: 'destructive',
      },
      {
        text: 'Cancel',
        onPress: () => {},
        style: 'cancel',
      },
    ]);
  };

  /**
   * Handle delete account
   */
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await api.delete('/users/account');
              await logout();
              showNotification('success', 'Account deleted');
            } catch (error) {
              showNotification('error', 'Failed to delete account');
            }
          },
          style: 'destructive',
        },
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
      ]
    );
  };

  /**
   * Open external link
   */
  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      showNotification('error', 'Failed to open link');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const languageMap: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ja: 'Japanese',
  };

  const dataRetentionMap: Record<string, string> = {
    '30days': '30 Days',
    '1year': '1 Year',
    forever: 'Forever',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.backButton} />
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notifications</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>All Notifications</Text>
              <Text style={styles.settingDescription}>
                Enable/disable all notifications
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(value) =>
                handleNotificationToggle('notificationsEnabled', value)
              }
              disabled={isSaving}
              trackColor={{ false: colors.gray300, true: colors.primaryLight }}
              thumbColor={
                settings.notificationsEnabled ? colors.primary : colors.gray400
              }
            />
          </View>

          {settings.notificationsEnabled && (
            <>
              <View style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>Email Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Receive email updates
                  </Text>
                </View>
                <Switch
                  value={settings.emailNotifications}
                  onValueChange={(value) =>
                    handleNotificationToggle('emailNotifications', value)
                  }
                  disabled={isSaving}
                  trackColor={{ false: colors.gray300, true: colors.primaryLight }}
                  thumbColor={
                    settings.emailNotifications ? colors.primary : colors.gray400
                  }
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>Payment Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Payment status updates
                  </Text>
                </View>
                <Switch
                  value={settings.paymentNotifications}
                  onValueChange={(value) =>
                    handleNotificationToggle('paymentNotifications', value)
                  }
                  disabled={isSaving}
                  trackColor={{ false: colors.gray300, true: colors.primaryLight }}
                  thumbColor={
                    settings.paymentNotifications ? colors.primary : colors.gray400
                  }
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>Visa Status Updates</Text>
                  <Text style={styles.settingDescription}>
                    Application status changes
                  </Text>
                </View>
                <Switch
                  value={settings.visaUpdateNotifications}
                  onValueChange={(value) =>
                    handleNotificationToggle('visaUpdateNotifications', value)
                  }
                  disabled={isSaving}
                  trackColor={{ false: colors.gray300, true: colors.primaryLight }}
                  thumbColor={
                    settings.visaUpdateNotifications ? colors.primary : colors.gray400
                  }
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>Chat Messages</Text>
                  <Text style={styles.settingDescription}>
                    New chat responses
                  </Text>
                </View>
                <Switch
                  value={settings.chatNotifications}
                  onValueChange={(value) =>
                    handleNotificationToggle('chatNotifications', value)
                  }
                  disabled={isSaving}
                  trackColor={{ false: colors.gray300, true: colors.primaryLight }}
                  thumbColor={
                    settings.chatNotifications ? colors.primary : colors.gray400
                  }
                />
              </View>
            </>
          )}
        </View>

        {/* Display Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 Display</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleLanguageChange}
          >
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Language</Text>
              <Text style={styles.settingDescription}>
                {languageMap[settings.language] || 'English'}
              </Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingDescription}>
                Coming in next update
              </Text>
            </View>
            <Switch
              value={settings.darkMode}
              onValueChange={(value) => saveSettings({ darkMode: value })}
              disabled={true}
              trackColor={{ false: colors.gray300, true: colors.primaryLight }}
              thumbColor={settings.darkMode ? colors.primary : colors.gray400}
            />
          </View>
        </View>

        {/* Privacy & Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 Privacy & Security</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleDataRetentionChange}
          >
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Data Retention</Text>
              <Text style={styles.settingDescription}>
                {dataRetentionMap[settings.dataRetention] || '1 Year'}
              </Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Analytics</Text>
              <Text style={styles.settingDescription}>
                Help improve VisaBuddy
              </Text>
            </View>
            <Switch
              value={settings.allowAnalytics}
              onValueChange={(value) => saveSettings({ allowAnalytics: value })}
              disabled={isSaving}
              trackColor={{ false: colors.gray300, true: colors.primaryLight }}
              thumbColor={
                settings.allowAnalytics ? colors.primary : colors.gray400
              }
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Cookies</Text>
              <Text style={styles.settingDescription}>
                Allow website cookies
              </Text>
            </View>
            <Switch
              value={settings.allowCookies}
              onValueChange={(value) => saveSettings({ allowCookies: value })}
              disabled={isSaving}
              trackColor={{ false: colors.gray300, true: colors.primaryLight }}
              thumbColor={settings.allowCookies ? colors.primary : colors.gray400}
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Account</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('ProfileEdit')}
          >
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Edit Profile</Text>
              <Text style={styles.settingDescription}>
                Update your information
              </Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => openLink('https://visabuddy.com/change-password')}
          >
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Change Password</Text>
              <Text style={styles.settingDescription}>
                Update your password
              </Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleLogout}
          >
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, styles.logoutText]}>Logout</Text>
              <Text style={styles.settingDescription}>
                Sign out of your account
              </Text>
            </View>
            <Text style={[styles.settingArrow, styles.logoutText]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ About</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => openLink('https://visabuddy.com/privacy')}
          >
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
              <Text style={styles.settingDescription}>
                Read our privacy policy
              </Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => openLink('https://visabuddy.com/terms')}
          >
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Terms of Service</Text>
              <Text style={styles.settingDescription}>
                Read our terms of service
              </Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Version</Text>
              <Text style={styles.settingDescription}>
                VisaBuddy 1.0.0
              </Text>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, styles.dangerZone]}>
          <Text style={styles.sectionTitle}>⚠️ Danger Zone</Text>

          <TouchableOpacity
            style={[styles.settingItem, styles.deleteButton]}
            onPress={handleDeleteAccount}
          >
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, styles.deleteText]}>
                Delete Account
              </Text>
              <Text style={styles.settingDescription}>
                Permanently delete your account
              </Text>
            </View>
            <Text style={[styles.settingArrow, styles.deleteText]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  section: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  dangerZone: {
    borderBottomWidth: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.gray600,
  },
  settingArrow: {
    fontSize: 18,
    color: colors.gray400,
    marginLeft: spacing.md,
  },
  logoutText: {
    color: colors.danger,
  },
  deleteButton: {
    borderBottomWidth: 0,
  },
  deleteText: {
    color: colors.danger,
  },
  bottomSpacing: {
    height: spacing.lg,
  },
});