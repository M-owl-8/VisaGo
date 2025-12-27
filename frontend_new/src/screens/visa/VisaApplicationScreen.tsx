import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {ScrollView} from 'react-native-gesture-handler';
import {AppIcon, IconSizes, IconColors} from '../../components/icons/AppIcon';
import {
  DocumentIcons,
  ApplicationIcons,
} from '../../components/icons/iconConfig';
import {useTranslation} from 'react-i18next';
import {useAuthStore} from '../../store/auth';
import {useFocusEffect} from '@react-navigation/native';
import {getTranslatedCountryName} from '../../data/countryTranslations';
import {getTranslatedVisaTypeName} from '../../utils/visaTypeTranslations';
import {ApplicationTypeModal} from '../../components/modals/ApplicationTypeModal';

const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return num + 'st';
  if (j === 2 && k !== 12) return num + 'nd';
  if (j === 3 && k !== 13) return num + 'rd';
  return num + 'th';
};

export default function VisaApplicationScreen({navigation}: any) {
  const {t, i18n} = useTranslation();
  const language = i18n.language || 'en';
  const user = useAuthStore(state => state.user);
  const userApplications = useAuthStore(state => state.userApplications);
  const fetchUserApplications = useAuthStore(
    state => state.fetchUserApplications,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showApplicationTypeModal, setShowApplicationTypeModal] =
    useState(false);
  const [stats, setStats] = useState<{
    activeCount: number;
    documentsReady: number;
    documentsTotal: number;
    averageProgress: number;
  }>({
    activeCount: 0,
    documentsReady: 0,
    documentsTotal: 0,
    averageProgress: 0,
  });
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [resumeApplicationId, setResumeApplicationId] = useState<string | null>(
    null,
  );

  // MEDIUM PRIORITY FIX: Refresh applications list when screen comes into focus
  // This ensures newly created applications appear immediately when returning from creation screen
  useFocusEffect(
    React.useCallback(() => {
      loadApplications();
      // Cleanup function to prevent memory leaks
      return () => {
        // Any cleanup if needed
      };
    }, [fetchUserApplications]),
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
        await computeStats(apps);
        setResumeApplicationId(selectMostRecent(apps));
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
    navigation?.navigate('ApplicationDetail', {applicationId});
  };

  const handleStartNewApplication = () => {
    setShowApplicationTypeModal(true);
  };

  const handleSelectVisa = () => {
    navigation?.navigate('Questionnaire');
  };

  const handleSelectUniversities = () => {
    Alert.alert(
      t('applications.applyToUniversities', 'Apply to Universities'),
      t('applications.comingSoon', 'Coming Soon'),
      [{text: t('common.ok', 'OK')}],
    );
  };

  const handleSelectJobContract = () => {
    Alert.alert(
      t('applications.jobContract', 'Job Contract'),
      t('applications.comingSoon', 'Coming Soon'),
      [{text: t('common.ok', 'OK')}],
    );
  };

  const selectMostRecent = (apps: any[]) => {
    if (!apps || apps.length === 0) return null;
    return apps
      .slice()
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime(),
      )[0].id;
  };

  const computeStats = async (apps: any[]) => {
    if (!apps || apps.length === 0) {
      setStats({
        activeCount: 0,
        documentsReady: 0,
        documentsTotal: 0,
        averageProgress: 0,
      });
      return;
    }
    try {
      setIsStatsLoading(true);
      const activeCount = apps.length;
      const avgProgress =
        Math.round(
          apps.reduce((acc, app) => acc + (app.progressPercentage || 0), 0) /
            activeCount,
        ) || 0;

      let documentsReady = 0;
      let documentsTotal = 0;

      // Fetch checklist data for accurate document counts
      const checklistPromises = apps.map(async app => {
        try {
          const resp = await apiClient.getDocumentChecklist(app.id);
          if (resp.success && resp.data) {
            const items =
              resp.data.items ||
              resp.data.documents ||
              resp.data.checklist ||
              [];
            const total = Array.isArray(items) ? items.length : 0;
            const readyCount = Array.isArray(items)
              ? items.filter((item: any) =>
                  [
                    'ready',
                    'approved',
                    'verified',
                    'submitted',
                    'accepted',
                  ].includes((item.status || '').toLowerCase()),
                ).length
              : 0;
            return {total, ready: readyCount};
          }
        } catch (err) {
          console.warn('Failed to load checklist for app', app.id, err);
        }
        return {total: 0, ready: 0};
      });

      const checklistResults = await Promise.all(checklistPromises);
      checklistResults.forEach(res => {
        documentsReady += res.ready;
        documentsTotal += res.total;
      });

      setStats({
        activeCount,
        documentsReady,
        documentsTotal,
        averageProgress: avgProgress,
      });
    } finally {
      setIsStatsLoading(false);
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
          }>
          {/* Resume Card */}
          {userApplications &&
            Array.isArray(userApplications) &&
            userApplications.length > 0 &&
            resumeApplicationId && (
              <View style={styles.resumeCard}>
                <View style={styles.resumeHeader}>
                  <View style={styles.resumePill}>
                    <Text style={styles.resumePillText}>
                      Pick up where you left off
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleApplicationPress(resumeApplicationId)}
                    style={styles.resumeAction}>
                    <Text style={styles.resumeActionText}>Continue</Text>
                    <AppIcon
                      name={ApplicationIcons.chevron.name}
                      library={ApplicationIcons.chevron.library}
                      size={IconSizes.settings}
                      color={IconColors.bright}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.resumeTitle}>
                  Your application is waiting for you
                </Text>
                <Text style={styles.resumeSubtitle}>
                  You have {userApplications.length} application
                  {userApplications.length > 1 ? 's' : ''} ready to continue.
                  Your progress is saved — jump back in anytime.
                </Text>
              </View>
            )}

          {/* Stats Cards */}
          {userApplications &&
            Array.isArray(userApplications) &&
            userApplications.length > 0 && (
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Active applications</Text>
                  <Text style={styles.statValue}>{stats.activeCount}</Text>
                  <Text style={styles.statHint}>Synced with mobile</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Documents ready</Text>
                  <Text style={styles.statValue}>
                    {isStatsLoading
                      ? '...'
                      : `${stats.documentsReady}/${Math.max(stats.documentsTotal, 20)}`}
                  </Text>
                  <Text style={styles.statHint}>Ready for upload</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Average progress</Text>
                  <Text style={styles.statValue}>
                    {isStatsLoading ? '...' : `${stats.averageProgress}%`}
                  </Text>
                  <Text style={styles.statHint}>Across all journeys</Text>
                </View>
              </View>
            )}

          {/* Start New Applications Header */}
          <View style={styles.startNewHeader}>
            <Text style={styles.startNewText}>
              {t('applications.startNewApplications')}
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleStartNewApplication}>
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
            <Text style={styles.myApplicationsTitle}>
              {t('applications.myApplications')}
            </Text>
            <Text style={styles.myApplicationsSubtitle}>
              {t('applications.manageYourApplications')}
            </Text>
          </View>

          {/* Applications List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A9EFF" />
              <Text style={styles.loadingText}>
                {t('applications.loadingApplications')}
              </Text>
            </View>
          ) : userApplications &&
            Array.isArray(userApplications) &&
            userApplications.length > 0 ? (
            <View style={styles.applicationsList}>
              {userApplications.map((application: any, index: number) => (
                <TouchableOpacity
                  key={application.id}
                  style={styles.applicationCard}
                  onPress={() => handleApplicationPress(application.id)}
                  activeOpacity={0.7}>
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
                          <Text
                            style={styles.applicationTitle}
                            numberOfLines={1}>
                            {application.country
                              ? getTranslatedCountryName(
                                  application.country.code || '',
                                  language,
                                  application.country.name,
                                )
                              : t('applicationDetail.unknownCountry')}
                          </Text>
                          <Text style={styles.visaTypeText} numberOfLines={1}>
                            {getTranslatedVisaTypeName(
                              application.visaType?.name,
                              language,
                            ) || t('applicationDetail.unknownVisaType')}
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
                            {application.progressPercentage || 0}%{' '}
                            {t('applications.complete')}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: getStatusBgColor(
                                application.status,
                              ),
                            },
                          ]}>
                          <Text style={styles.statusText}>
                            {getStatusLabel(application.status, t)}
                          </Text>
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
              <Text style={styles.emptyTitle}>
                {t('applications.noApplicationsYet')}
              </Text>
              <Text style={styles.emptyText}>
                {t('applications.startNewApplicationHint')}
              </Text>
            </View>
          )}

          <View style={{height: 40}} />
        </ScrollView>
      </View>

      {/* Application Type Modal */}
      <ApplicationTypeModal
        visible={showApplicationTypeModal}
        onClose={() => setShowApplicationTypeModal(false)}
        onSelectVisa={handleSelectVisa}
        onSelectUniversities={handleSelectUniversities}
        onSelectJobContract={handleSelectJobContract}
      />
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
  resumeCard: {
    backgroundColor: 'rgba(15, 30, 45, 0.9)',
    borderRadius: 16,
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  resumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resumePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.25)',
  },
  resumePillText: {
    color: '#4A9EFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  resumeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(74, 158, 255, 0.18)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.3)',
  },
  resumeActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resumeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  resumeSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.18)',
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statHint: {
    fontSize: 12,
    color: '#6B7280',
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
