import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth';

export default function ProfileScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout'),
      t('profile.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const menuItems = [
    {
      id: 'personal-info',
      icon: 'person-outline',
      title: t('profile.personalInfo'),
      subtitle: t('profile.updateProfileDetails'),
      color: '#4A9EFF',
      onPress: () => navigation?.navigate('ProfileEdit'),
    },
    {
      id: 'language',
      icon: 'language-outline',
      title: t('profile.language'),
      subtitle: t('profile.changeAppLanguage'),
      color: '#10B981',
      onPress: () => navigation?.navigate('Language'),
    },
    {
      id: 'notifications',
      icon: 'notifications-outline',
      title: t('profile.notifications'),
      subtitle: t('profile.manageNotificationSettings'),
      color: '#F59E0B',
      onPress: () => navigation?.navigate('NotificationSettings'),
    },
    {
      id: 'security',
      icon: 'shield-checkmark-outline',
      title: t('profile.security'),
      subtitle: t('profile.passwordAndSecurity'),
      color: '#8B5CF6',
      onPress: () => navigation?.navigate('Security'),
    },
    {
      id: 'help',
      icon: 'help-circle-outline',
      title: t('profile.helpSupport'),
      subtitle: t('profile.getHelpWithApplication'),
      color: '#06B6D4',
      onPress: () => navigation?.navigate('HelpSupport'),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.gradientBackground}>
        {/* Background Pattern */}
        <View style={styles.backgroundPattern}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Icon name="person" size={48} color="#4A9EFF" />
            </View>
            <Text style={styles.userName}>
              {user?.firstName || 'User'}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
                  <Icon name={item.icon} size={24} color={item.color} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Icon name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Icon name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </TouchableOpacity>

          {/* App Version */}
          <Text style={styles.versionText}>Ketdik v1.0.0</Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </View>
  );
}

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(74, 158, 255, 0.3)',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  userEmail: {
    fontSize: 14,
    color: '#94A3B8',
  },
  menuContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    gap: 12,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 32,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  versionText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 24,
  },
});
