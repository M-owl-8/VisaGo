import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {AppIcon, IconSizes, IconColors} from '../../components/icons/AppIcon';
import {DocumentIcons, ApplicationIcons} from '../../components/icons/iconConfig';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth';
import { useFocusEffect } from '@react-navigation/native';
import { getTranslatedCountryName } from '../../data/countryTranslations';
import { getTranslatedVisaTypeName } from '../../utils/visaTypeTranslations';

const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return num + 'st';
  if (j === 2 && k !== 12) return num + 'nd';
  if (j === 3 && k !== 13) return num + 'rd';
  return num + 'th';
};

export default function VisaApplicationScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const language = i18n.language || 'en';
  const user = useAuthStore((state) => state.user);
  const userApplications = useAuthStore((state) => state.userApplications);
  const fetchUserApplications = useAuthStore((state) => state.fetchUserApplications);
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadApplications();
      // Cleanup function to prevent memory leaks
      return () => {
        // Any cleanup if needed
      };
    }, [fetchUserApplications])
  );

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      console.log('Loading applications...');
      await fetchUserApplications();
      const apps = useAuthStore.getState().userApplications;
      console.log('Applications loaded:', apps?.length || 0, 'applications');
      if (apps && apps.length > 0) {
        console.log('First application:', apps[0]);
      }
    } catch (error: any) {
      console.error('Error loading applications:', error);
      console.error('Error details:', error.message, error.stack);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  const handleApplicationPress = (applicationId: string) => {
    navigation?.navigate('ApplicationDetail', { applicationId });
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
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4A9EFF"
              colors={['#4A9EFF']}
            />
          }
        >
          {/* Start New Applications Header */}
          <View style={styles.startNewHeader}>
            <Text style={styles.startNewText}>{t('applications.startNewApplications')}</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation?.navigate('Questionnaire')}
            >
              <AppIcon
                name={DocumentIcons.add.name}
                library={DocumentIcons.add.library}
                size={IconSizes.settings}
                color={IconColors.bright}
              />
            </TouchableOpacity>
          </View>

          {/* My Applications Section */}
          <View style={styles.myApplicationsSection}>
            <Text style={styles.myApplicationsTitle}>{t('applications.myApplications')}</Text>
            <Text style={styles.myApplicationsSubtitle}>
              {t('applications.manageYourApplications')}
            </Text>
          </View>

          {/* Applications List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A9EFF" />
              <Text style={styles.loadingText}>{t('applications.loadingApplications')}</Text>
            </View>
          ) : userApplications && Array.isArray(userApplications) && userApplications.length > 0 ? (
            <View style={styles.applicationsList}>
              {userApplications.map((application: any, index: number) => (
                <TouchableOpacity
                  key={application.id}
                  style={styles.applicationCard}
                  onPress={() => handleApplicationPress(application.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.applicationCardContent}>
                    <View style={styles.applicationNumber}>
                      <Text style={styles.applicationNumberText}>
                        {getOrdinalSuffix(index + 1)}
                      </Text>
                    </View>
                    <View style={styles.applicationInfo}>
                      <View style={styles.applicationHeader}>
                        <Text style={styles.countryFlag}>
                          {application.country?.flagEmoji || '🌍'}
                        </Text>
                        <View style={styles.applicationTitleContainer}>
                          <Text style={styles.applicationTitle} numberOfLines={1}>
                            {application.country
                              ? getTranslatedCountryName(
                                  application.country.code || '',
                                  language,
                                  application.country.name
                                )
                              : t('applicationDetail.unknownCountry')}
                          </Text>
                          <Text style={styles.visaTypeText} numberOfLines={1}>
                            {getTranslatedVisaTypeName(application.visaType?.name, language) || t('applicationDetail.unknownVisaType')}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.applicationMeta}>
                        <View style={styles.progressInfo}>
                          <AppIcon
                            name={DocumentIcons.document.name}
                            library={DocumentIcons.document.library}
                            size={IconSizes.small}
                            color={IconColors.muted}
                          />
                          <Text style={styles.progressText}>
                            {application.progressPercentage || 0}% {t('applications.complete')}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(application.status) }]}>
                          <Text style={styles.statusText}>{getStatusLabel(application.status, t)}</Text>
                        </View>
                      </View>
                    </View>
                    <AppIcon
                      name={ApplicationIcons.chevron.name}
                      library={ApplicationIcons.chevron.library}
                      size={IconSizes.settings}
                      color={IconColors.muted}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <AppIcon
                name={DocumentIcons.document.name}
                library={DocumentIcons.document.library}
                size={IconSizes.large * 2}
                color={IconColors.muted}
              />
              <Text style={styles.emptyTitle}>{t('applications.noApplicationsYet')}</Text>
              <Text style={styles.emptyText}>
                {t('applications.startNewApplicationHint')}
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    draft: 'Draft',
    in_progress: 'In Progress',
    ready_for_review: 'Ready',
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  return statusMap[status] || status;
};

const getStatusBgColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    draft: 'rgba(107, 114, 128, 0.2)',
    in_progress: 'rgba(245, 158, 11, 0.2)',
    ready_for_review: 'rgba(16, 185, 129, 0.2)',
    submitted: 'rgba(59, 130, 246, 0.2)',
    approved: 'rgba(16, 185, 129, 0.2)',
    rejected: 'rgba(239, 68, 68, 0.2)',
  };
  return colorMap[status] || colorMap.draft;
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  startNewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  startNewText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#4A9EFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.3)',
  },
  myApplicationsSection: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  myApplicationsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  myApplicationsSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  applicationsList: {
    paddingHorizontal: 24,
  },
  applicationCard: {
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  applicationCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  applicationNumber: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.4)',
  },
  applicationNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4A9EFF',
  },
  applicationInfo: {
    flex: 1,
  },
  applicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  countryFlag: {
    fontSize: 24,
  },
  applicationTitleContainer: {
    flex: 1,
  },
  applicationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  visaTypeText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  applicationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 16,
  },
});
