/**
 * Application Detail Screen
 * Shows complete application information with document checklist
 */
// Change summary (2025-11-24): Avoid duplicate checklist fetches, add slow-loading status text, and refresh data only when needed.

import React, {useEffect, useState, useCallback, useRef} from 'react';
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
import {RiskExplanationPanel} from '../../components/risk/RiskExplanationPanel';
import {DocumentExplanationModal} from '../../components/checklist/DocumentExplanationModal';
import {ChecklistSummary} from '../../components/checklist/ChecklistSummary';

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
  priority?: string; // Runtime normalized to "high" | "medium" | "low"
  category?: 'required' | 'highly_recommended' | 'optional'; // May be missing, defaults to "highly_recommended"
  status: 'missing' | 'pending' | 'verified' | 'rejected';
  userDocumentId?: string;
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
  verificationNotes?: string;
  aiVerified?: boolean;
  aiConfidence?: number;
  whereToObtain?: string;
  whereToObtainUz?: string;
  whereToObtainRu?: string;
  aiSource?: 'gpt4' | 'fallback' | string;
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
  const [isProcessing, setIsProcessing] = useState(false); // Track processing state separately
  const [refreshing, setRefreshing] = useState(false);
  const [showSlowChecklistMessage, setShowSlowChecklistMessage] =
    useState(false);
  const [explanationModalVisible, setExplanationModalVisible] = useState(false);
  const [selectedDocumentItem, setSelectedDocumentItem] =
    useState<DocumentChecklistItem | null>(null);
  const isFetchingRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const slowMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const skipNextFocusRefreshRef = useRef(false);

  useEffect(() => {
    if (applicationId) {
      loadApplicationData();
    } else {
      navigation.goBack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  // HIGH PRIORITY FIX: Debounce checklist refresh to prevent expensive AI calls on every focus
  // Only refresh if more than 30 seconds have passed since last load, or if forced
  const lastLoadTimeRef = useRef<number>(0);

  // Refresh checklist when screen comes into focus (e.g., after returning from upload)
  useFocusEffect(
    useCallback(() => {
      if (!applicationId) {
        return;
      }
      if (skipNextFocusRefreshRef.current) {
        skipNextFocusRefreshRef.current = false;
        return;
      }

      // HIGH PRIORITY FIX: Only reload if more than 30 seconds since last load
      // This prevents expensive checklist regeneration on every navigation
      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadTimeRef.current;
      const DEBOUNCE_MS = 30000; // 30 seconds

      if (hasLoadedOnceRef.current && timeSinceLastLoad > DEBOUNCE_MS) {
        loadApplicationData();
        lastLoadTimeRef.current = now;
      } else if (!hasLoadedOnceRef.current) {
        // First load - always load
        loadApplicationData();
        lastLoadTimeRef.current = now;
      }
    }, [applicationId, loadApplicationData]),
  );

  const loadApplicationData = useCallback(
    async (force = false) => {
      // CRITICAL FIX: Allow force refresh after document upload to ensure checklist updates
      // HIGH PRIORITY FIX: Force refresh bypasses debounce to ensure checklist updates after document upload
      if (!applicationId || (isFetchingRef.current && !force)) {
        return;
      }

      // Update last load time when force is true (bypasses debounce)
      if (force) {
        lastLoadTimeRef.current = Date.now();
      }

      isFetchingRef.current = true;
      setIsLoading(true);

      if (slowMessageTimeoutRef.current) {
        clearTimeout(slowMessageTimeoutRef.current);
      }
      slowMessageTimeoutRef.current = setTimeout(() => {
        setShowSlowChecklistMessage(true);
      }, 8000);

      try {
        // Load application details and checklist in parallel
        const [appResponse, checklistResponse] = await Promise.all([
          apiClient.getApplication(applicationId),
          apiClient.getDocumentChecklist(applicationId),
        ]);

        if (appResponse.success && appResponse.data) {
          // Ensure application data has required fields with defaults
          const appData = {
            ...appResponse.data,
            status: appResponse.data.status || 'draft',
            createdAt: appResponse.data.createdAt || new Date().toISOString(),
          };
          setApplication(appData);
        } else {
          // If application fetch fails, set error state
          console.error(
            '[Application] Failed to load application:',
            appResponse.error,
          );
          setApplication(null);
        }

        if (checklistResponse.success && checklistResponse.data) {
          // Handle processing status
          if (checklistResponse.data.status === 'processing') {
            // Checklist is being generated, show loading state
            setIsProcessing(true);
            setChecklistItems([]);
            setSummary(null);
            // Don't show error, just wait for next refresh
            // Set a timeout to retry after a few seconds
            setTimeout(() => {
              if (isProcessing) {
                loadApplicationData(true); // Force refresh
              }
            }, 3000);
          } else if (
            checklistResponse.data.items &&
            checklistResponse.data.items.length > 0
          ) {
            // Valid checklist with items - always show it, even if fallback was used
            // aiFallbackUsed is just metadata, not an error condition
            setIsProcessing(false); // Clear processing state
            setChecklistItems(checklistResponse.data.items);
            setSummary(checklistResponse.data.summary);

            // Log for debugging
            console.log('[Checklist] Loaded successfully:', {
              itemCount: checklistResponse.data.items.length,
              aiFallbackUsed: checklistResponse.data.aiFallbackUsed,
              aiErrorOccurred: checklistResponse.data.aiErrorOccurred,
            });
          } else {
            // Empty items but successful response - should not happen with our backend fix
            // But handle gracefully by showing empty state
            setIsProcessing(false);
            setChecklistItems([]);
            setSummary(null);
            console.warn('[Checklist] Received empty items array from backend');
          }
        } else if (checklistResponse.error) {
          // API returned error - but backend should always return items now
          // Log for debugging but don't show error to user
          console.warn(
            '[Checklist] API error (should not happen):',
            checklistResponse.error,
          );
          setIsProcessing(false);
          // Set empty items to show empty state instead of error
          setChecklistItems([]);
          setSummary(null);
        } else {
          // Response structure unexpected - log for debugging
          console.warn(
            '[Checklist] Unexpected response structure:',
            checklistResponse,
          );
          setIsProcessing(false);
          setChecklistItems([]);
          setSummary(null);
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
          Alert.alert(
            t('common.error'),
            errorMessage || t('errors.loadFailed'),
          );
        }
      } finally {
        if (slowMessageTimeoutRef.current) {
          clearTimeout(slowMessageTimeoutRef.current);
          slowMessageTimeoutRef.current = null;
        }
        setShowSlowChecklistMessage(false);
        setIsLoading(false);
        isFetchingRef.current = false;
        hasLoadedOnceRef.current = true;

        // If we're still processing and have no items, schedule a retry
        if (isProcessing && checklistItems.length === 0) {
          // Retry after 5 seconds if still processing
          setTimeout(() => {
            if (isProcessing && checklistItems.length === 0) {
              console.log('[Checklist] Retrying after processing delay...');
              loadApplicationData(true);
            }
          }, 5000);
        }
      }
    },
    [applicationId, language, t],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplicationData();
    setRefreshing(false);
  };

  useEffect(() => {
    return () => {
      if (slowMessageTimeoutRef.current) {
        clearTimeout(slowMessageTimeoutRef.current);
      }
    };
  }, []);

  const handleUploadDocument = (documentType: string, documentName: string) => {
    navigation.navigate('DocumentUpload', {
      applicationId,
      documentType,
      documentName,
      onUploadSuccess: (force?: boolean) => {
        skipNextFocusRefreshRef.current = false; // Allow refresh after upload
        // CRITICAL FIX: Force refresh checklist after successful upload to show updated status
        loadApplicationData(force !== false); // Force refresh by default, allow override
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

  const handleDeleteApplication = () => {
    Alert.alert(
      t('common.delete') || 'Delete Application',
      language === 'uz'
        ? "Bu arizani o'chirishni xohlaysizmi? Bu amalni bekor qilib bo'lmaydi."
        : language === 'ru'
          ? 'Вы уверены, что хотите удалить это заявление? Это действие нельзя отменить.'
          : 'Are you sure you want to delete this application? This action cannot be undone.',
      [
        {
          text: t('common.cancel') || 'Cancel',
          style: 'cancel',
        },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const response = await apiClient.deleteApplication(applicationId);

              if (response.success) {
                Alert.alert(
                  t('common.success') || 'Success',
                  language === 'uz'
                    ? "Ariza muvaffaqiyatli o'chirildi"
                    : language === 'ru'
                      ? 'Заявление успешно удалено'
                      : 'Application deleted successfully',
                  [
                    {
                      text: t('common.ok'),
                      onPress: () => {
                        // Navigate back to applications list
                        navigation.navigate('MainTabs', {
                          screen: 'Applications',
                        });
                      },
                    },
                  ],
                );
              } else {
                throw new Error(
                  response.error?.message || 'Failed to delete application',
                );
              }
            } catch (error: any) {
              console.error('Error deleting application:', error);
              const errorMessage =
                error?.response?.data?.error?.message ||
                error?.message ||
                (language === 'uz'
                  ? "Arizani o'chirishda xatolik yuz berdi"
                  : language === 'ru'
                    ? 'Произошла ошибка при удалении заявления'
                    : 'Failed to delete application');

              Alert.alert(t('common.error') || 'Error', errorMessage);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const getLocalizedText = (
    item: DocumentChecklistItem,
    field: 'name' | 'description',
  ): string => {
    if (language === 'uz' && item[`${field}Uz`]) return item[`${field}Uz`]!;
    if (language === 'ru' && item[`${field}Ru`]) return item[`${field}Ru`]!;
    return item[field];
  };

  // Derive category from item (for backward compatibility)
  // Default to "highly_recommended" if category is missing
  const getItemCategory = (
    item: DocumentChecklistItem,
  ): 'required' | 'highly_recommended' | 'optional' => {
    if (
      item.category === 'required' ||
      item.category === 'highly_recommended' ||
      item.category === 'optional'
    ) {
      return item.category;
    }
    // Fallback logic: if category is missing, derive from required/priority
    if (item.required) return 'required';
    if (item.priority === 'high' || item.priority === 'medium')
      return 'highly_recommended';
    // Default fallback: treat as "highly_recommended" if category is missing
    return 'highly_recommended';
  };

  // Get category label
  const getCategoryLabel = (
    category: 'required' | 'highly_recommended' | 'optional',
  ): string => {
    const labels: Record<
      'required' | 'highly_recommended' | 'optional',
      Record<'en' | 'uz' | 'ru', string>
    > = {
      required: {
        en: 'Required',
        uz: 'Majburiy',
        ru: 'Обязательно',
      },
      highly_recommended: {
        en: 'Highly Recommended',
        uz: 'Tavsiya etiladi',
        ru: 'Настоятельно рекомендуется',
      },
      optional: {
        en: 'Optional',
        uz: 'Ixtiyoriy',
        ru: 'Необязательно',
      },
    };
    return (
      labels[category]?.[language as 'en' | 'uz' | 'ru'] || labels[category].en
    );
  };

  // Get category badge color
  const getCategoryBadgeColor = (
    category: 'required' | 'highly_recommended' | 'optional',
  ): string => {
    switch (category) {
      case 'required':
        return '#EF4444'; // red
      case 'highly_recommended':
        return '#F59E0B'; // yellow
      case 'optional':
        return '#3B82F6'; // blue
      default:
        return '#9CA3AF'; // gray
    }
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
        label: t('visa.documentStatus.needsFix', 'Needs fix'),
        bgColor: 'rgba(239, 68, 68, 0.15)',
      },
    };
    return configs[status as keyof typeof configs] || configs.missing;
  };

  if (isLoading) {
    const slowMessage =
      language === 'uz'
        ? "AI hujjatlar ro'yxatini tayyorlayapti, bu jarayon 30 sekundgacha davom etishi mumkin..."
        : language === 'ru'
          ? 'ИИ подготавливает список документов, это может занять до 30 секунд...'
          : 'AI is preparing your document list, this may take up to 30 seconds...';

    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A9EFF" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
          {showSlowChecklistMessage && (
            <Text style={styles.slowLoadingText}>{slowMessage}</Text>
          )}
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
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteApplication}
            disabled={isLoading}>
            <Icon name="trash-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
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
                {application.createdAt
                  ? new Date(application.createdAt).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: getStatusBgColor(
                    application.status || 'draft',
                  ),
                },
              ]}>
              <Text style={styles.statusText}>
                {getStatusLabel(application.status || 'draft')}
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

        {/* Risk Explanation Panel - Show when checklist is ready */}
        {checklistItems.length > 0 && !isProcessing && (
          <RiskExplanationPanel
            applicationId={applicationId}
            language={language}
          />
        )}

        {/* Checklist Summary - Show when checklist is ready */}
        {checklistItems.length > 0 && !isProcessing && (
          <ChecklistSummary items={checklistItems} />
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

        {/* Document List - Grouped by Category */}
        <View style={styles.documentListContainer}>
          {isProcessing ? (
            <View style={styles.emptyStateContainer}>
              <ActivityIndicator size="large" color="#4A9EFF" />
              <Text style={styles.emptyStateText}>
                {language === 'uz'
                  ? "AI hujjatlar ro'yxatini tayyorlamoqda..."
                  : language === 'ru'
                    ? 'ИИ создает список документов...'
                    : 'AI is generating document list...'}
              </Text>
            </View>
          ) : checklistItems.length === 0 && !isLoading ? (
            <View style={styles.emptyStateContainer}>
              <Icon name="document-text-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyStateText}>
                {language === 'uz'
                  ? "Hujjatlar ro'yxatini yaratishda xatolik yuz berdi. Iltimos, qayta urining."
                  : language === 'ru'
                    ? 'Произошла ошибка при создании списка документов. Пожалуйста, попробуйте еще раз.'
                    : 'Error creating document list. Please try again.'}
              </Text>
            </View>
          ) : checklistItems.length > 0 ? (
            (['required', 'highly_recommended', 'optional'] as const).map(
              category => {
                const categoryItems = checklistItems.filter(item => {
                  const itemCategory = getItemCategory(item);
                  return itemCategory === category;
                });

                if (categoryItems.length === 0) return null;

                return (
                  <View key={category} style={styles.categorySection}>
                    <View style={styles.categoryHeader}>
                      <View
                        style={[
                          styles.categoryBadge,
                          {
                            backgroundColor:
                              getCategoryBadgeColor(category) + '20',
                          },
                        ]}>
                        <Text
                          style={[
                            styles.categoryBadgeText,
                            {color: getCategoryBadgeColor(category)},
                          ]}>
                          {getCategoryLabel(category)}
                        </Text>
                      </View>
                    </View>
                    {categoryItems.map((item, index) => {
                      const statusConfig = getStatusConfig(item.status);
                      const isUploaded =
                        item.status === 'verified' || item.status === 'pending';

                      return (
                        <View key={item.id} style={styles.documentItem}>
                          {/* Number */}
                          <View style={styles.documentNumber}>
                            <Text style={styles.documentNumberText}>
                              {index + 1}
                            </Text>
                          </View>

                          {/* Document Info */}
                          <View style={styles.documentInfo}>
                            <View style={styles.documentHeader}>
                              <Text style={styles.documentName}>
                                {getLocalizedText(item, 'name')}
                              </Text>
                              <View style={styles.documentHeaderBadges}>
                                {/* Priority Badge */}
                                {item.priority && (
                                  <View style={styles.priorityBadge}>
                                    <Text style={styles.priorityBadgeText}>
                                      {item.priority === 'high'
                                        ? language === 'uz'
                                          ? 'Yuqori'
                                          : language === 'ru'
                                            ? 'Высокий'
                                            : 'High'
                                        : item.priority === 'medium'
                                          ? language === 'uz'
                                            ? "O'rtacha"
                                            : language === 'ru'
                                              ? 'Средний'
                                              : 'Medium'
                                          : language === 'uz'
                                            ? 'Past'
                                            : language === 'ru'
                                              ? 'Низкий'
                                              : 'Low'}
                                    </Text>
                                  </View>
                                )}
                                {/* AI Source Badge */}
                                {item.aiSource === 'fallback' && (
                                  <View style={styles.fallbackBadge}>
                                    <Text style={styles.fallbackBadgeText}>
                                      {language === 'uz'
                                        ? "Standart ro'yxat"
                                        : language === 'ru'
                                          ? 'Стандартный список'
                                          : 'Standard list'}
                                    </Text>
                                  </View>
                                )}
                                {/* AI Verification Badge */}
                                {item.aiVerified &&
                                  item.status === 'verified' && (
                                    <View style={styles.aiVerifiedBadge}>
                                      <Icon
                                        name="sparkles"
                                        size={12}
                                        color="#10B981"
                                      />
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
                            </View>
                            <Text style={styles.documentDescription}>
                              {getLocalizedText(item, 'description')}
                            </Text>
                            {/* Why? Button */}
                            {(item.whereToObtain ||
                              item.commonMistakes ||
                              item.description) && (
                              <TouchableOpacity
                                style={styles.whyButton}
                                onPress={() => {
                                  setSelectedDocumentItem(item);
                                  setExplanationModalVisible(true);
                                }}>
                                <Icon
                                  name="help-circle-outline"
                                  size={16}
                                  color="#4A9EFF"
                                />
                                <Text style={styles.whyButtonText}>
                                  {t('applications.why', 'Why?')}
                                </Text>
                              </TouchableOpacity>
                            )}
                            {/* Rejected Status with Explanation */}
                            {item.status === 'rejected' && (
                              <View style={styles.rejectedExplanationContainer}>
                                <Text style={styles.rejectedExplanationTitle}>
                                  {language === 'uz'
                                    ? "Noto'g'ri hujjat"
                                    : language === 'ru'
                                      ? 'Неправильный документ'
                                      : 'Incorrect document'}
                                </Text>
                                <Text style={styles.rejectedExplanationText}>
                                  {item.verificationNotes ||
                                    item.aiNotesEn ||
                                    (language === 'uz'
                                      ? "Iltimos, ushbu hujjatning to'g'rilangan versiyasini yuklang."
                                      : language === 'ru'
                                        ? 'Пожалуйста, загрузите исправленную версию этого документа.'
                                        : 'Please upload a corrected version of this document.')}
                                </Text>
                                {typeof item.aiConfidence === 'number' && (
                                  <Text style={styles.aiConfidenceText}>
                                    {language === 'uz'
                                      ? `AI ishonchliligi: ${Math.round(item.aiConfidence * 100)}%`
                                      : language === 'ru'
                                        ? `Уверенность ИИ: ${Math.round(item.aiConfidence * 100)}%`
                                        : `AI confidence: ${Math.round(item.aiConfidence * 100)}%`}
                                  </Text>
                                )}
                              </View>
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
                                item.status === 'rejected' ||
                                item.status === 'pending'
                              ) {
                                // Use documentType for internal logic, localized name for display
                                handleUploadDocument(
                                  item.documentType || item.id,
                                  getLocalizedText(item, 'name'),
                                );
                              } else if (item.userDocumentId && item.fileUrl) {
                                handleViewDocument(
                                  item.userDocumentId,
                                  item.fileUrl,
                                );
                              }
                            }}>
                            {isUploaded ? (
                              <Icon
                                name="checkmark-circle"
                                size={24}
                                color="#10B981"
                              />
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
                );
              },
            )
          ) : null}
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

      {/* Document Explanation Modal */}
      <DocumentExplanationModal
        visible={explanationModalVisible}
        onClose={() => {
          setExplanationModalVisible(false);
          setSelectedDocumentItem(null);
        }}
        item={selectedDocumentItem}
        language={language}
      />
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
  slowLoadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#CBD5F5',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 32,
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
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
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
  documentHeaderBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  priorityBadgeText: {
    fontSize: 10,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  fallbackBadge: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)',
  },
  fallbackBadgeText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
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
  whyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  whyButtonText: {
    fontSize: 12,
    color: '#4A9EFF',
    fontWeight: '500',
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
  rejectedExplanationContainer: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  rejectedExplanationTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 4,
  },
  rejectedExplanationText: {
    fontSize: 12,
    color: '#FCA5A5',
    lineHeight: 18,
  },
  aiConfidenceText: {
    fontSize: 11,
    color: '#FCA5A5',
    marginTop: 4,
    opacity: 0.8,
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
