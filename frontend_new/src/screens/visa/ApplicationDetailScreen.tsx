/**
 * Application Detail Screen
 * Shows complete application information with document checklist
 */

import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTranslation} from 'react-i18next';
import {useFocusEffect} from '@react-navigation/native';
import {apiClient} from '../../services/api';
import {getTranslatedCountryName} from '../../data/countryTranslations';
import {getTranslatedVisaTypeName} from '../../utils/visaTypeTranslations';

interface ApplicationDetailProps {
  route: any;
  navigation: any;
}

interface DocumentChecklistItem {
  id: string;
  documentType?: string; // Internal key for upload mapping (e.g., 'passport', 'bank_statement') - optional for backward compatibility
  name: string; // English display name
  nameUz?: string; // Uzbek display name
  nameRu?: string; // Russian display name
  description: string;
  descriptionUz?: string;
  descriptionRu?: string;
  required: boolean;
  status: 'missing' | 'pending' | 'verified' | 'rejected';
  userDocumentId?: string;
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
  verificationNotes?: string;
  aiVerified?: boolean;
  aiConfidence?: number;
}

interface ChecklistSummary {
  total: number;
  uploaded: number;
  verified: number;
  missing: number;
  rejected: number;
  progress: number;
}

export default function ApplicationDetailScreen({
  route,
  navigation,
}: ApplicationDetailProps) {
  const {t, i18n} = useTranslation();
  const language = i18n.language || 'en';
  const applicationId = route.params?.applicationId;

  const [application, setApplication] = useState<any>(null);
  const [checklistItems, setChecklistItems] = useState<DocumentChecklistItem[]>(
    [],
  );
  const [summary, setSummary] = useState<ChecklistSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (applicationId) {
      loadApplicationData();
    } else {
      navigation.goBack();
    }
  }, [applicationId]);

  // Refresh checklist when screen comes into focus (e.g., after returning from upload)
  useFocusEffect(
    useCallback(() => {
      if (applicationId) {
        loadApplicationData();
      }
    }, [applicationId]),
  );

  const loadApplicationData = async () => {
    try {
      setIsLoading(true);

      // Load application details and checklist in parallel
      const [appResponse, checklistResponse] = await Promise.all([
        apiClient.getApplication(applicationId),
        apiClient.getDocumentChecklist(applicationId),
      ]);

      if (appResponse.success && appResponse.data) {
        setApplication(appResponse.data);
      }

      if (checklistResponse.success && checklistResponse.data) {
        setChecklistItems(checklistResponse.data.items || []);
        setSummary(checklistResponse.data.summary);
      } else if (checklistResponse.error) {
        // Check if it's an AI-related error
        const errorMessage = checklistResponse.error.message || '';
        const errorCode = checklistResponse.error.code || '';
        const isAIError =
          errorMessage.toLowerCase().includes('openai') ||
          errorCode.includes('OPENAI') ||
          errorMessage.toLowerCase().includes('ai service');

        if (isAIError) {
          // Show user-friendly AI error message
          const aiErrorMessage =
            language === 'uz'
              ? "Hozircha AI asosida hujjatlar ro'yxatini yaratishda xatolik yuz berdi. Server tomoni bu muammoni hal qiladi. Siz mavjud hujjatlarni yuklashda davom etishingiz mumkin."
              : language === 'ru'
                ? 'При создании списка документов с помощью ИИ произошла ошибка. Команда уже работает над этим. Вы можете продолжать загружать документы.'
                : 'There was an error generating the document list with AI. Our team is working on it. You can still upload your documents.';

          Alert.alert(t('common.error'), aiErrorMessage);
        } else {
          Alert.alert(
            t('common.error'),
            errorMessage || t('errors.loadFailed'),
          );
        }
      }
    } catch (error: any) {
      console.error('Error loading application:', error);
      const errorMessage =
        error?.message || error?.response?.data?.message || '';
      const isAIError =
        errorMessage.toLowerCase().includes('openai') ||
        errorMessage.toLowerCase().includes('ai service');

      if (isAIError) {
        const aiErrorMessage =
          language === 'uz'
            ? "Hozircha AI asosida hujjatlar ro'yxatini yaratishda xatolik yuz berdi. Server tomoni bu muammoni hal qiladi. Siz mavjud hujjatlarni yuklashda davom etishingiz mumkin."
            : language === 'ru'
              ? 'При создании списка документов с помощью ИИ произошла ошибка. Команда уже работает над этим. Вы можете продолжать загружать документы.'
              : 'There was an error generating the document list with AI. Our team is working on it. You can still upload your documents.';

        Alert.alert(t('common.error'), aiErrorMessage);
      } else {
        Alert.alert(t('common.error'), errorMessage || t('errors.loadFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplicationData();
    setRefreshing(false);
  };

  const handleUploadDocument = (documentType: string, documentName: string) => {
    navigation.navigate('DocumentUpload', {
      applicationId,
      documentType,
      documentName,
      onUploadSuccess: () => {
        // Re-fetch checklist after successful upload to show updated status and progress
        loadApplicationData();
      },
    });
  };

  const handleViewDocument = (documentId: string, fileUrl: string) => {
    navigation.navigate('DocumentPreview', {
      documentId,
      fileUrl,
    });
  };

  const handleChatAboutApplication = () => {
    navigation.navigate('Chat', {
      applicationId,
    });
  };

  const getLocalizedText = (
    item: DocumentChecklistItem,
    field: 'name' | 'description',
  ): string => {
    if (language === 'uz' && item[`${field}Uz`]) return item[`${field}Uz`]!;
    if (language === 'ru' && item[`${field}Ru`]) return item[`${field}Ru`]!;
    return item[field];
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      missing: {
        icon: 'time-outline',
        color: '#9CA3AF',
        label: t('visa.documentStatus.missing'),
        bgColor: 'rgba(156, 163, 175, 0.15)',
      },
      pending: {
        icon: 'hourglass-outline',
        color: '#F59E0B',
        label: t('visa.documentStatus.pending'),
        bgColor: 'rgba(245, 158, 11, 0.15)',
      },
      verified: {
        icon: 'checkmark-circle',
        color: '#10B981',
        label: t('visa.documentStatus.verified'),
        bgColor: 'rgba(16, 185, 129, 0.15)',
      },
      rejected: {
        icon: 'close-circle',
        color: '#EF4444',
        label: t('visa.documentStatus.rejected'),
        bgColor: 'rgba(239, 68, 68, 0.15)',
      },
    };
    return configs[status as keyof typeof configs] || configs.missing;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A9EFF" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  if (!application) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{t('errors.loadFailed')}</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        }>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('visa.applicationDetail.title')}
          </Text>
          <View style={{width: 40}} />
        </View>

        {/* Application Header Card */}
        <View style={styles.applicationCard}>
          <View style={styles.applicationHeader}>
            <Text style={styles.countryFlag}>
              {application.country?.flagEmoji || '🌍'}
            </Text>
            <View style={styles.applicationInfo}>
              <Text style={styles.countryName}>
                {application.country
                  ? getTranslatedCountryName(
                      application.country.code || '',
                      language,
                      application.country.name,
                    )
                  : t('applicationDetail.unknownCountry')}
              </Text>
              <Text style={styles.visaTypeName}>
                {getTranslatedVisaTypeName(
                  application.visaType?.name,
                  language,
                )}
              </Text>
            </View>
          </View>

          <View style={styles.applicationMeta}>
            <View style={styles.metaItem}>
              <Icon name="calendar-outline" size={16} color="#94A3B8" />
              <Text style={styles.metaText}>
                {t('visa.applicationDetail.createdOn')}:{' '}
                {new Date(application.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {backgroundColor: getStatusBgColor(application.status)},
              ]}>
              <Text style={styles.statusText}>
                {getStatusLabel(application.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Upload Progress Card */}
        {summary && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressTitle}>
                  {t('applicationDetail.uploadProgress')}
                </Text>
                <Text style={styles.progressSubtitle}>
                  {t('applicationDetail.documentsUploaded', {
                    uploaded: summary.uploaded,
                    total: summary.total,
                  })}
                </Text>
              </View>
              <View style={styles.progressCircle}>
                <Text style={styles.progressPercentage}>
                  {summary.progress}%
                </Text>
              </View>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[styles.progressBar, {width: `${summary.progress}%`}]}
              />
            </View>
          </View>
        )}

        {/* AI Generated Document List Header */}
        <View style={styles.aiGeneratedHeader}>
          <Icon name="sparkles" size={20} color="#8B5CF6" />
          <Text style={styles.aiGeneratedText}>
            {t('applicationDetail.aiGeneratedList')}
          </Text>
          <View style={styles.aiGeneratedBadge}>
            <Text style={styles.aiGeneratedBadgeText}>
              {t('applicationDetail.basedOnAnswers')}
            </Text>
          </View>
        </View>

        {/* Document List */}
        <View style={styles.documentListContainer}>
          {checklistItems.map((item, index) => {
            const statusConfig = getStatusConfig(item.status);
            const isUploaded =
              item.status === 'verified' || item.status === 'pending';

            return (
              <View key={item.id} style={styles.documentItem}>
                {/* Number */}
                <View style={styles.documentNumber}>
                  <Text style={styles.documentNumberText}>{index + 1}</Text>
                </View>

                {/* Document Info */}
                <View style={styles.documentInfo}>
                  <View style={styles.documentHeader}>
                    <Text style={styles.documentName}>
                      {getLocalizedText(item, 'name')}
                    </Text>
                    {/* AI Verification Badge */}
                    {item.aiVerified && item.status === 'verified' && (
                      <View style={styles.aiVerifiedBadge}>
                        <Icon name="sparkles" size={12} color="#10B981" />
                        <Text style={styles.aiVerifiedText}>
                          {language === 'uz'
                            ? 'AI tasdiqladi'
                            : language === 'ru'
                              ? 'Проверено ИИ'
                              : 'Verified by AI'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.documentDescription}>
                    {getLocalizedText(item, 'description')}
                  </Text>
                  {/* AI Verification Notes */}
                  {item.verificationNotes && (
                    <Text style={styles.verificationNotesText}>
                      {item.verificationNotes}
                    </Text>
                  )}
                  {/* Rejected Status with Notes */}
                  {item.status === 'rejected' && item.verificationNotes && (
                    <Text style={styles.rejectedNotesText}>
                      {item.verificationNotes}
                    </Text>
                  )}
                </View>

                {/* Upload Button */}
                <TouchableOpacity
                  style={[
                    styles.uploadButton,
                    isUploaded && styles.uploadButtonSuccess,
                  ]}
                  onPress={() => {
                    if (
                      item.status === 'missing' ||
                      item.status === 'rejected'
                    ) {
                      // Use documentType for internal logic, localized name for display
                      handleUploadDocument(
                        item.documentType || item.id,
                        getLocalizedText(item, 'name'),
                      );
                    } else if (item.userDocumentId && item.fileUrl) {
                      handleViewDocument(item.userDocumentId, item.fileUrl);
                    }
                  }}>
                  {isUploaded ? (
                    <Icon name="checkmark-circle" size={24} color="#10B981" />
                  ) : (
                    <Icon
                      name="cloud-upload-outline"
                      size={24}
                      color="#4A9EFF"
                    />
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Help Section */}
        <View style={styles.helpCard}>
          <Icon name="information-circle-outline" size={24} color="#4A9EFF" />
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>
              {t('applicationDetail.needHelp')}
            </Text>
            <Text style={styles.helpText}>
              {t('applicationDetail.helpText')}
            </Text>
          </View>
        </View>

        {/* AI Chat Button */}
        <TouchableOpacity
          style={styles.chatButton}
          onPress={handleChatAboutApplication}>
          <Icon name="chatbubbles" size={20} color="#FFFFFF" />
          <Text style={styles.chatButtonText}>
            {t('applicationDetail.chatAboutApplication')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  function getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      draft: 'Draft',
      in_progress: 'In Progress',
      ready_for_review: 'Ready',
      submitted: 'Submitted',
      approved: 'Approved',
      rejected: 'Rejected',
    };
    return statusMap[status] || status;
  }

  function getStatusBgColor(status: string): string {
    const colorMap: Record<string, string> = {
      draft: 'rgba(107, 114, 128, 0.2)',
      in_progress: 'rgba(245, 158, 11, 0.2)',
      ready_for_review: 'rgba(16, 185, 129, 0.2)',
      submitted: 'rgba(59, 130, 246, 0.2)',
      approved: 'rgba(16, 185, 129, 0.2)',
      rejected: 'rgba(239, 68, 68, 0.2)',
    };
    return colorMap[status] || colorMap.draft;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1929',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#4A9EFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  errorButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
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
    borderRadius: 20,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  applicationCard: {
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  applicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  countryFlag: {
    fontSize: 48,
  },
  applicationInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  visaTypeName: {
    fontSize: 14,
    color: '#94A3B8',
  },
  applicationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
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
  progressCard: {
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 20,
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
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    borderWidth: 3,
    borderColor: '#4A9EFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4A9EFF',
    borderRadius: 4,
  },
  aiGeneratedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 8,
  },
  aiGeneratedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  aiGeneratedBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  aiGeneratedBadgeText: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  documentListContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    gap: 12,
  },
  documentNumber: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.4)',
  },
  documentNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A9EFF',
  },
  documentInfo: {
    flex: 1,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  aiVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  aiVerifiedText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
  documentDescription: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
    marginTop: 4,
  },
  verificationNotesText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  rejectedNotesText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    lineHeight: 16,
  },
  uploadButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.3)',
  },
  uploadButtonSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    gap: 12,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  chatButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
