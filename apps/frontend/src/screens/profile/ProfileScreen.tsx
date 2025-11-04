import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/auth';

type ModalType = 'edit-profile' | 'settings' | 'applications' | 'payments' | null;

export default function ProfileScreen() {
  const {
    user,
    logout,
    fetchUserProfile,
    updateProfile,
    updatePreferences,
    fetchUserApplications,
    fetchPaymentHistory,
    userApplications,
    paymentHistory,
    isLoading,
  } = useAuthStore();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edit Profile Modal State
  const [editForm, setEditForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    language: user?.language || 'en',
  });

  // Settings Modal State
  const [settingsForm, setSettingsForm] = useState({
    language: user?.language || 'en',
    notificationsEnabled: user?.preferences?.notificationsEnabled ?? true,
    emailNotifications: user?.preferences?.emailNotifications ?? true,
    pushNotifications: user?.preferences?.pushNotifications ?? true,
    twoFactorEnabled: user?.preferences?.twoFactorEnabled ?? false,
  });

  useEffect(() => {
    // Initialize data on mount
    if (user?.id) {
      loadUserData();
    }
  }, [user?.id]);

  const loadUserData = async () => {
    try {
      await Promise.all([
        fetchUserProfile(),
        fetchUserApplications(),
        fetchPaymentHistory(),
      ]);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadUserData();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEditProfile = async () => {
    try {
      if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
        Alert.alert('Validation', 'First and last name are required');
        return;
      }

      await updateProfile({
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone,
        language: editForm.language,
      });

      Alert.alert('Success', 'Profile updated successfully');
      setActiveModal(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await updatePreferences({
        language: settingsForm.language,
        notificationsEnabled: settingsForm.notificationsEnabled,
        emailNotifications: settingsForm.emailNotifications,
        pushNotifications: settingsForm.pushNotifications,
        twoFactorEnabled: settingsForm.twoFactorEnabled,
      });

      Alert.alert('Success', 'Settings updated successfully');
      setActiveModal(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update settings');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            console.error('Logout error:', error);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved':
        return '#4CAF50';
      case 'submitted':
        return '#2196F3';
      case 'draft':
        return '#FFC107';
      case 'rejected':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getPaymentStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'pending':
        return '#FFC107';
      case 'failed':
        return '#F44336';
      case 'refunded':
        return '#2196F3';
      default:
        return '#999';
    }
  };

  // ============================================================================
  // EDIT PROFILE MODAL
  // ============================================================================

  const EditProfileModal = () => (
    <Modal
      visible={activeModal === 'edit-profile'}
      animationType="slide"
      transparent={false}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setActiveModal(null)}>
            <Icon name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter first name"
              value={editForm.firstName}
              onChangeText={(text) => setEditForm({ ...editForm, firstName: text })}
              placeholderTextColor="#CCC"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter last name"
              value={editForm.lastName}
              onChangeText={(text) => setEditForm({ ...editForm, lastName: text })}
              placeholderTextColor="#CCC"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              value={editForm.phone}
              onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
              keyboardType="phone-pad"
              placeholderTextColor="#CCC"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Language</Text>
            <View style={styles.languageContainer}>
              {['en', 'ru', 'uz'].map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.languageButton,
                    editForm.language === lang && styles.languageButtonActive,
                  ]}
                  onPress={() => setEditForm({ ...editForm, language: lang })}
                >
                  <Text
                    style={[
                      styles.languageButtonText,
                      editForm.language === lang && styles.languageButtonTextActive,
                    ]}
                  >
                    {lang.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleEditProfile}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  // ============================================================================
  // SETTINGS MODAL
  // ============================================================================

  const SettingsModal = () => (
    <Modal
      visible={activeModal === 'settings'}
      animationType="slide"
      transparent={false}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setActiveModal(null)}>
            <Icon name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Language Selection */}
          <View style={styles.settingSection}>
            <Text style={styles.settingSectionTitle}>Language</Text>
            <View style={styles.languageContainer}>
              {['en', 'ru', 'uz'].map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.languageButton,
                    settingsForm.language === lang && styles.languageButtonActive,
                  ]}
                  onPress={() => setSettingsForm({ ...settingsForm, language: lang })}
                >
                  <Text
                    style={[
                      styles.languageButtonText,
                      settingsForm.language === lang && styles.languageButtonTextActive,
                    ]}
                  >
                    {lang === 'en' ? 'English' : lang === 'ru' ? 'Русский' : 'Ўзбек'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notifications */}
          <View style={styles.settingSection}>
            <Text style={styles.settingSectionTitle}>Notifications</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Icon name="notifications-outline" size={20} color="#1E88E5" />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>All Notifications</Text>
                  <Text style={styles.settingDesc}>Enable/disable all notifications</Text>
                </View>
              </View>
              <Switch
                value={settingsForm.notificationsEnabled}
                onValueChange={(value) =>
                  setSettingsForm({ ...settingsForm, notificationsEnabled: value })
                }
                trackColor={{ false: '#767577', true: '#81C784' }}
                thumbColor={settingsForm.notificationsEnabled ? '#1E88E5' : '#f4f3f4'}
              />
            </View>

            {settingsForm.notificationsEnabled && (
              <>
                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Icon name="mail-outline" size={20} color="#1E88E5" />
                    <View style={styles.settingText}>
                      <Text style={styles.settingLabel}>Email Notifications</Text>
                      <Text style={styles.settingDesc}>Receive updates via email</Text>
                    </View>
                  </View>
                  <Switch
                    value={settingsForm.emailNotifications}
                    onValueChange={(value) =>
                      setSettingsForm({ ...settingsForm, emailNotifications: value })
                    }
                    trackColor={{ false: '#767577', true: '#81C784' }}
                    thumbColor={settingsForm.emailNotifications ? '#1E88E5' : '#f4f3f4'}
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Icon name="send-outline" size={20} color="#1E88E5" />
                    <View style={styles.settingText}>
                      <Text style={styles.settingLabel}>Push Notifications</Text>
                      <Text style={styles.settingDesc}>Receive push alerts</Text>
                    </View>
                  </View>
                  <Switch
                    value={settingsForm.pushNotifications}
                    onValueChange={(value) =>
                      setSettingsForm({ ...settingsForm, pushNotifications: value })
                    }
                    trackColor={{ false: '#767577', true: '#81C784' }}
                    thumbColor={settingsForm.pushNotifications ? '#1E88E5' : '#f4f3f4'}
                  />
                </View>
              </>
            )}
          </View>

          {/* Security */}
          <View style={styles.settingSection}>
            <Text style={styles.settingSectionTitle}>Security</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Icon name="shield-checkmark-outline" size={20} color="#F44336" />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Two-Factor Authentication</Text>
                  <Text style={styles.settingDesc}>Add extra security layer</Text>
                </View>
              </View>
              <Switch
                value={settingsForm.twoFactorEnabled}
                onValueChange={(value) =>
                  setSettingsForm({ ...settingsForm, twoFactorEnabled: value })
                }
                trackColor={{ false: '#767577', true: '#81C784' }}
                thumbColor={settingsForm.twoFactorEnabled ? '#F44336' : '#f4f3f4'}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleUpdateSettings}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Save Settings</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  // ============================================================================
  // APPLICATIONS MODAL
  // ============================================================================

  const ApplicationsModal = () => (
    <Modal
      visible={activeModal === 'applications'}
      animationType="slide"
      transparent={false}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setActiveModal(null)}>
            <Icon name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>My Applications</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={userApplications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.applicationCard}>
              <View style={styles.applicationHeader}>
                <View style={styles.applicationFlag}>
                  <Text style={styles.flagEmoji}>{item.country.flagEmoji}</Text>
                </View>
                <View style={styles.applicationInfo}>
                  <Text style={styles.applicationCountry}>{item.country.name}</Text>
                  <Text style={styles.applicationVisa}>{item.visaType.name}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(item.status) },
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{getStatusLabel(item.status)}</Text>
                </View>
              </View>

              <View style={styles.applicationDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fee:</Text>
                  <Text style={styles.detailValue}>${item.visaType.fee}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Processing:</Text>
                  <Text style={styles.detailValue}>{item.visaType.processingDays} days</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Progress:</Text>
                  <Text style={styles.detailValue}>{item.progressPercentage}%</Text>
                </View>
                {item.submissionDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Submitted:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(item.submissionDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="document-outline" size={48} color="#CCC" />
              <Text style={styles.emptyStateText}>No applications yet</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );

  // ============================================================================
  // PAYMENTS MODAL
  // ============================================================================

  const PaymentsModal = () => (
    <Modal
      visible={activeModal === 'payments'}
      animationType="slide"
      transparent={false}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setActiveModal(null)}>
            <Icon name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Payment History</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={paymentHistory}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <View style={styles.paymentFlag}>
                  <Text style={styles.flagEmoji}>{item.application.country.flagEmoji}</Text>
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentCountry}>{item.application.country.name}</Text>
                  <Text style={styles.paymentVisa}>{item.application.visaType.name}</Text>
                </View>
                <View
                  style={[
                    styles.paymentStatusBadge,
                    { backgroundColor: getPaymentStatusColor(item.status) },
                  ]}
                >
                  <Text style={styles.paymentStatusBadgeText}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.paymentDetails}>
                <View style={styles.paymentAmount}>
                  <Text style={styles.paymentAmountLabel}>Amount</Text>
                  <Text style={styles.paymentAmountValue}>
                    ${item.amount} {item.currency}
                  </Text>
                </View>
                <View style={styles.paymentMethod}>
                  <Text style={styles.paymentMethodLabel}>Method</Text>
                  <Text style={styles.paymentMethodValue}>{item.paymentMethod}</Text>
                </View>
                {item.paidAt && (
                  <View style={styles.paymentDate}>
                    <Text style={styles.paymentDateLabel}>Paid</Text>
                    <Text style={styles.paymentDateValue}>
                      {new Date(item.paidAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>

              {item.transactionId && (
                <View style={styles.transactionId}>
                  <Text style={styles.transactionIdLabel}>Transaction ID:</Text>
                  <Text style={styles.transactionIdValue}>{item.transactionId}</Text>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="card-outline" size={48} color="#CCC" />
              <Text style={styles.emptyStateText}>No payments yet</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.charAt(0)}
            {user?.lastName?.charAt(0)}
          </Text>
        </View>
        <Text style={styles.fullName}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.phone && <Text style={styles.phone}>{user?.phone}</Text>}
      </View>

      {/* User Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userApplications.length}</Text>
          <Text style={styles.statLabel}>Applications</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{paymentHistory.length}</Text>
          <Text style={styles.statLabel}>Payments</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.language?.toUpperCase()}</Text>
          <Text style={styles.statLabel}>Language</Text>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            setEditForm({
              firstName: user?.firstName || '',
              lastName: user?.lastName || '',
              phone: user?.phone || '',
              language: user?.language || 'en',
            });
            setActiveModal('edit-profile');
          }}
        >
          <Icon name="person-outline" size={20} color="#1E88E5" />
          <Text style={styles.menuLabel}>Edit Profile</Text>
          <Icon name="chevron-forward" size={20} color="#DDD" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            setSettingsForm({
              language: user?.language || 'en',
              notificationsEnabled: user?.preferences?.notificationsEnabled ?? true,
              emailNotifications: user?.preferences?.emailNotifications ?? true,
              pushNotifications: user?.preferences?.pushNotifications ?? true,
              twoFactorEnabled: user?.preferences?.twoFactorEnabled ?? false,
            });
            setActiveModal('settings');
          }}
        >
          <Icon name="settings-outline" size={20} color="#1E88E5" />
          <Text style={styles.menuLabel}>Settings & Preferences</Text>
          <Icon name="chevron-forward" size={20} color="#DDD" />
        </TouchableOpacity>
      </View>

      {/* Applications & Payments Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setActiveModal('applications')}
        >
          <Icon name="document-outline" size={20} color="#2196F3" />
          <View style={styles.menuItemContent}>
            <Text style={styles.menuLabel}>My Applications</Text>
            <Text style={styles.menuSubtext}>{userApplications.length} applications</Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#DDD" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setActiveModal('payments')}
        >
          <Icon name="card-outline" size={20} color="#4CAF50" />
          <View style={styles.menuItemContent}>
            <Text style={styles.menuLabel}>Payment History</Text>
            <Text style={styles.menuSubtext}>{paymentHistory.length} payments</Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#DDD" />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="log-out-outline" size={20} color="#E53935" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>VisaBuddy v1.0.0</Text>
      </View>

      <View style={{ height: 40 }} />

      {/* Modals */}
      <EditProfileModal />
      <SettingsModal />
      <ApplicationsModal />
      <PaymentsModal />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  profileHeader: {
    backgroundColor: '#1E88E5',
    paddingVertical: 32,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  fullName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  email: {
    fontSize: 14,
    color: '#E3F2FD',
    marginTop: 4,
  },
  phone: {
    fontSize: 12,
    color: '#E3F2FD',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginVertical: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#EEE',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuItemContent: {
    marginLeft: 12,
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  menuSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  logoutSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  logoutButton: {
    backgroundColor: '#FFEBEE',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E53935',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#212121',
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  languageButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  languageButtonActive: {
    backgroundColor: '#1E88E5',
    borderColor: '#1E88E5',
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  languageButtonTextActive: {
    color: '#FFFFFF',
  },
  primaryButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  settingSection: {
    marginBottom: 24,
  },
  settingSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  settingItem: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  settingDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  applicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  applicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  applicationFlag: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagEmoji: {
    fontSize: 24,
  },
  applicationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  applicationCountry: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  applicationVisa: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  applicationDetails: {
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#212121',
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentFlag: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentCountry: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  paymentVisa: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  paymentStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  paymentStatusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  paymentDetails: {
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentAmount: {
    flex: 1,
  },
  paymentAmountLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  paymentAmountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E88E5',
  },
  paymentMethod: {
    flex: 1,
    paddingHorizontal: 12,
  },
  paymentMethodLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  paymentMethodValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  paymentDate: {
    flex: 1,
    alignItems: 'flex-end',
  },
  paymentDateLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  paymentDateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  transactionId: {
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  transactionIdLabel: {
    fontSize: 11,
    color: '#999',
  },
  transactionIdValue: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontFamily: 'monospace',
  },
});