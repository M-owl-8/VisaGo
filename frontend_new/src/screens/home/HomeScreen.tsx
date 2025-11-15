/**
 * Home Screen - Main Dashboard
 * Shows progress, active applications, recent activity, and quick actions
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth';
import { useDocumentStore } from '../../store/documents';
import { apiClient } from '../../services/api';
import { getPromoDaysRemaining } from '../../config/features';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  navigation?: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const userApplications = useAuthStore((state) => state.userApplications);
  const fetchUserApplications = useAuthStore((state) => state.fetchUserApplications);
  
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [documentsStats, setDocumentsStats] = useState({ uploaded: 0, total: 0 });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (userApplications.length > 0) {
      calculateOverallProgress();
    }
  }, [userApplications]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await fetchUserApplications();
      await loadRecentActivity();
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const calculateOverallProgress = async () => {
    if (userApplications.length === 0) {
      setOverallProgress(0);
      setDocumentsStats({ uploaded: 0, total: 0 });
      return;
    }

    try {
      let totalProgress = 0;
      let totalDocsUploaded = 0;
      let totalDocsRequired = 0;

      for (const application of userApplications) {
        // Estimate progress from application data
        // In a real implementation, you would call the checklist endpoint
        // For now, use application's progressPercentage
        const appProgress = application.progressPercentage || 0;
        totalProgress += appProgress;
        
        // Estimate documents (will be accurate once checklist endpoint is called)
        totalDocsRequired += 8; // Average estimate
        totalDocsUploaded += Math.round((appProgress / 100) * 8);
      }

      const avgProgress = userApplications.length > 0 
        ? Math.round(totalProgress / userApplications.length) 
        : 0;

      setOverallProgress(avgProgress);
      setDocumentsStats({
        uploaded: totalDocsUploaded,
        total: totalDocsRequired,
      });
    } catch (error) {
      console.error('Error calculating progress:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      // Generate activity from applications
      const activities: any[] = [];
      
      userApplications.slice(0, 3).forEach((app) => {
        activities.push({
          id: `app_${app.id}`,
          type: 'application_created',
          description: `Created ${app.country?.name} - ${app.visaType?.name}`,
          timestamp: new Date().toISOString(), // Use current date as fallback
          icon: 'document-text',
        });
      });
      
      // Sort by timestamp (most recent first)
      activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setRecentActivities(activities.slice(0, 5));
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Get days remaining using centralized function
  const getDaysRemaining = () => {
    return getPromoDaysRemaining();
  };

  if (isLoading && userApplications.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A9EFF" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background with gradient effect */}
      <View style={styles.gradientBackground}>
        <View style={styles.backgroundPattern}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4A9EFF"
              colors={['#4A9EFF']}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.welcomeText}>
                {t('home.welcomeBack', { firstName: user?.firstName || 'User' })}
              </Text>
              <Text style={styles.subtitleText}>{t('home.letHelpYou')}</Text>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation?.navigate('Profile')}
            >
              <Icon name="person-circle-outline" size={40} color="#4A9EFF" />
            </TouchableOpacity>
          </View>

          {/* Free Promotion Banner */}
          <View style={styles.promoBanner}>
            <View style={styles.promoIconContainer}>
              <Icon name="gift" size={28} color="#FFD700" />
            </View>
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>{t('home.freePromo.title')}</Text>
              <Text style={styles.promoSubtitle}>{t('home.freePromo.subtitle')}</Text>
              <Text style={styles.promoDays}>
                {t('home.freePromo.daysRemaining', { days: getDaysRemaining() })}
              </Text>
            </View>
          </View>

          {/* Overall Progress Card */}
          {userApplications.length > 0 && (
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>{t('home.overallProgress')}</Text>
                <Text style={styles.progressPercentage}>{overallProgress}%</Text>
              </View>
              
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${overallProgress}%` },
                    ]}
                  />
                </View>
              </View>
              
              <Text style={styles.progressSubtext}>
                {t('home.documentsUploaded', {
                  uploaded: documentsStats.uploaded,
                  total: documentsStats.total,
                })}
              </Text>
            </View>
          )}

          {/* Active Applications */}
          {userApplications.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('home.applications')}</Text>
              
              {userApplications.slice(0, 3).map((application) => (
                <TouchableOpacity
                  key={application.id}
                  style={styles.applicationCard}
                  onPress={() =>
                    navigation?.navigate('ApplicationDetail', {
                      applicationId: application.id,
                    })
                  }
                >
                  <View style={styles.applicationHeader}>
                    <Text style={styles.applicationFlag}>
                      {application.country?.flagEmoji || '🌍'}
                    </Text>
                    <View style={styles.applicationInfo}>
                      <Text style={styles.applicationCountry}>
                        {application.country?.name || 'Unknown'}
                      </Text>
                      <Text style={styles.applicationVisaType}>
                        {application.visaType?.name || 'Visa'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, getStatusStyle(application.status)]}>
                      <Text style={styles.statusText}>
                        {getStatusLabel(application.status)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.applicationProgress}>
                    <View style={styles.progressBarSmall}>
                      <View
                        style={[
                          styles.progressBarFillSmall,
                          { width: `${application.progressPercentage || 0}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressPercentageSmall}>
                      {application.progressPercentage || 0}%
                    </Text>
                  </View>
                  
                  <View style={styles.applicationFooter}>
                    <Icon name="arrow-forward" size={20} color="#4A9EFF" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            // Empty State
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Icon name="document-text-outline" size={64} color="#4A9EFF" />
              </View>
              <Text style={styles.emptyTitle}>{t('home.noApplications.title')}</Text>
              <Text style={styles.emptySubtitle}>{t('home.noApplications.subtitle')}</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation?.navigate('Questionnaire')}
              >
                <Icon name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>{t('home.noApplications.action')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Recent Activity */}
          {recentActivities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('home.recentActivity')}</Text>
              
              {recentActivities.map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Icon name={activity.icon} size={20} color="#4A9EFF" />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityDescription}>
                      {activity.description}
                    </Text>
                    <Text style={styles.activityTime}>
                      {getRelativeTime(activity.timestamp)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('home.quickAccess')}</Text>
            
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => navigation?.navigate('Questionnaire')}
              >
                <View style={styles.quickActionIcon}>
                  <Icon name="add-circle-outline" size={28} color="#4A9EFF" />
                </View>
                <Text style={styles.quickActionLabel}>{t('home.startNewApplication')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => navigation?.navigate('Chat')}
              >
                <View style={styles.quickActionIcon}>
                  <Icon name="chatbubbles-outline" size={28} color="#10B981" />
                </View>
                <Text style={styles.quickActionLabel}>{t('home.aiAssistant')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => {
                  if (userApplications.length > 0) {
                    navigation?.navigate('ApplicationDetail', {
                      applicationId: userApplications[0].id,
                    });
                  }
                }}
                disabled={userApplications.length === 0}
              >
                <View style={[
                  styles.quickActionIcon,
                  userApplications.length === 0 && styles.quickActionIconDisabled
                ]}>
                  <Icon name="document-text-outline" size={28} color={userApplications.length > 0 ? "#F59E0B" : "#6B7280"} />
                </View>
                <Text style={[
                  styles.quickActionLabel,
                  userApplications.length === 0 && styles.quickActionLabelDisabled
                ]}>
                  {t('home.trackDocuments')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => navigation?.navigate('Applications')}
              >
                <View style={styles.quickActionIcon}>
                  <Icon name="folder-open-outline" size={28} color="#8B5CF6" />
                </View>
                <Text style={styles.quickActionLabel}>{t('home.applications')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );

  function getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      draft: 'Draft',
      submitted: 'Submitted',
      approved: 'Approved',
      rejected: 'Rejected',
      in_progress: 'In Progress',
      ready_for_review: 'Ready',
    };
    return statusMap[status] || status;
  }

  function getStatusStyle(status: string) {
    const styleMap: Record<string, any> = {
      draft: { backgroundColor: 'rgba(107, 114, 128, 0.2)' },
      in_progress: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
      ready_for_review: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
      submitted: { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
      approved: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
      rejected: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
    };
    return styleMap[status] || styleMap.draft;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1929',
  },
  gradientBackground: {
    flex: 1,
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
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    gap: 16,
  },
  promoIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 13,
    color: '#E2E8F0',
    marginBottom: 4,
  },
  promoDays: {
    fontSize: 12,
    color: '#94A3B8',
  },
  progressCard: {
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A9EFF',
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4A9EFF',
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 13,
    color: '#94A3B8',
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  applicationCard: {
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  applicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  applicationFlag: {
    fontSize: 32,
  },
  applicationInfo: {
    flex: 1,
  },
  applicationCountry: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  applicationVisaType: {
    fontSize: 13,
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  applicationProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progressBarSmall: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFillSmall: {
    height: '100%',
    backgroundColor: '#4A9EFF',
    borderRadius: 3,
  },
  progressPercentageSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A9EFF',
    width: 40,
    textAlign: 'right',
  },
  applicationFooter: {
    alignItems: 'flex-end',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 30, 45, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    color: '#E2E8F0',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: (width - 60) / 2,
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    gap: 12,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionIconDisabled: {
    opacity: 0.4,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    textAlign: 'center',
  },
  quickActionLabelDisabled: {
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(74, 158, 255, 0.3)',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A9EFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

