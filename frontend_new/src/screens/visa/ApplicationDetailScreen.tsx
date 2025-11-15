/**
 * Application Detail Screen
 * Shows complete application information with document checklist
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
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api';

interface ApplicationDetailProps {
  route: any;
  navigation: any;
}

interface DocumentChecklistItem {
  id: string;
  name: string;
  nameUz?: string;
  nameRu?: string;
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
  const { t, i18n } = useTranslation();
  const language = i18n.language || 'en';
  const applicationId = route.params?.applicationId;

  const [application, setApplication] = useState<any>(null);
  const [checklistItems, setChecklistItems] = useState<DocumentChecklistItem[]>([]);
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
      }
    } catch (error: any) {
      console.error('Error loading application:', error);
      Alert.alert(t('common.error'), t('errors.loadFailed'));
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

  const getLocalizedText = (item: DocumentChecklistItem, field: 'name' | 'description'): string => {
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
          <Text style={styles.errorText}>Application not found</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
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
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('visa.applicationDetail.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Application Header Card */}
        <View style={styles.applicationCard}>
          <View style={styles.applicationHeader}>
            <Text style={styles.countryFlag}>{application.country?.flagEmoji || '🌍'}</Text>
            <View style={styles.applicationInfo}>
              <Text style={styles.countryName}>{application.country?.name}</Text>
              <Text style={styles.visaTypeName}>{application.visaType?.name}</Text>
            </View>
          </View>
          
          <View style={styles.applicationMeta}>
            <View style={styles.metaItem}>
              <Icon name="calendar-outline" size={16} color="#94A3B8" />
              <Text style={styles.metaText}>
                {t('visa.applicationDetail.createdOn')}: {new Date(application.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(application.status) }]}>
              <Text style={styles.statusText}>{getStatusLabel(application.status)}</Text>
            </View>
          </View>
        </View>

        {/* Document Checklist */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('visa.applicationDetail.documentChecklist')}</Text>
            {summary && (
              <Text style={styles.sectionSubtitle}>
                {t('visa.applicationDetail.documentsProgress', {
                  uploaded: summary.uploaded,
                  total: summary.total,
                })}
              </Text>
            )}
          </View>

          {summary && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${summary.progress}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{summary.progress}%</Text>
            </View>
          )}

          {checklistItems.map((item) => {
            const statusConfig = getStatusConfig(item.status);
            return (
              <View key={item.id} style={styles.checklistItem}>
                <View style={styles.itemHeader}>
                  <View style={[styles.itemIcon, { backgroundColor: statusConfig.bgColor }]}>
                    <Icon name={statusConfig.icon} size={20} color={statusConfig.color} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{getLocalizedText(item, 'name')}</Text>
                    <Text style={styles.itemStatus}>{statusConfig.label}</Text>
                  </View>
                  {item.required && (
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredText}>Required</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.itemDescription}>
                  {getLocalizedText(item, 'description')}
                </Text>

                {item.verificationNotes && item.status === 'rejected' && (
                  <View style={styles.rejectionNote}>
                    <Icon name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.rejectionText}>{item.verificationNotes}</Text>
                  </View>
                )}

                <View style={styles.itemActions}>
                  {item.status === 'missing' && (
                    <TouchableOpacity
                      style={styles.uploadButton}
                      onPress={() => handleUploadDocument(item.id, item.name)}
                    >
                      <Icon name="cloud-upload-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.uploadButtonText}>{t('visa.actions.upload')}</Text>
                    </TouchableOpacity>
                  )}

                  {(item.status === 'pending' || item.status === 'verified') && item.userDocumentId && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => handleViewDocument(item.userDocumentId!, item.fileUrl!)}
                      >
                        <Icon name="eye-outline" size={18} color="#4A9EFF" />
                        <Text style={styles.viewButtonText}>{t('visa.actions.view')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.replaceButton}
                        onPress={() => handleUploadDocument(item.id, item.name)}
                      >
                        <Icon name="refresh-outline" size={18} color="#6B7280" />
                        <Text style={styles.replaceButtonText}>{t('visa.actions.replace')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {item.status === 'rejected' && (
                    <TouchableOpacity
                      style={styles.reuploadButton}
                      onPress={() => handleUploadDocument(item.id, item.name)}
                    >
                      <Icon name="cloud-upload-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.reuploadButtonText}>{t('visa.actions.reupload')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* AI Chat Button */}
        <TouchableOpacity
          style={styles.chatButton}
          onPress={handleChatAboutApplication}
        >
          <Icon name="chatbubbles" size={20} color="#FFFFFF" />
          <Text style={styles.chatButtonText}>{t('visa.applicationDetail.chatAboutThis')}</Text>
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
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A9EFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A9EFF',
    width: 45,
    textAlign: 'right',
  },
  checklistItem: {
    backgroundColor: 'rgba(15, 30, 45, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  itemStatus: {
    fontSize: 12,
    color: '#94A3B8',
  },
  requiredBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EF4444',
  },
  itemDescription: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 12,
  },
  rejectionNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  rejectionText: {
    flex: 1,
    fontSize: 12,
    color: '#EF4444',
    lineHeight: 16,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A9EFF',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.3)',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A9EFF',
  },
  replaceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)',
  },
  replaceButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  reuploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  reuploadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
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
    shadowOffset: { width: 0, height: 4 },
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

