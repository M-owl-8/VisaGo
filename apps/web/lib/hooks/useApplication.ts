import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errorMessages';
import { useTranslation } from 'react-i18next';

export interface ApplicationDetail {
  id: string;
  countryId: string;
  visaTypeId: string;
  status: string;
  progressPercentage: number;
  submissionDate?: string;
  approvalDate?: string;
  expiryDate?: string;
  metadata?: string;
  country?: {
    id: string;
    name: string;
    code: string;
  };
  visaType?: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface DocumentChecklist {
  id: string;
  applicationId: string;
  status: 'processing' | 'ready' | 'failed';
  checklistData?: string; // JSON string
  aiGenerated: boolean;
  generatedAt?: string;
  errorMessage?: string;
  items?: Array<{
    document: string;
    name: string;
    nameUz?: string;
    nameRu?: string;
    category: 'required' | 'highly_recommended' | 'optional';
    required: boolean;
    priority: 'high' | 'medium' | 'low';
    description?: string;
    descriptionUz?: string;
    descriptionRu?: string;
    whereToObtain?: string;
    whereToObtainUz?: string;
    whereToObtainRu?: string;
    status?: 'pending' | 'verified' | 'rejected';
  }>;
}

interface UseApplicationResult {
  application: ApplicationDetail | null;
  checklist: DocumentChecklist | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearError: () => void;
}

export function useApplication(
  applicationId: string | undefined,
  options?: {
    onError?: (error: string) => void;
    autoFetch?: boolean;
  }
): UseApplicationResult {
  const { t, i18n } = useTranslation();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [checklist, setChecklist] = useState<DocumentChecklist | null>(null);
  const shouldAutoFetch = options?.autoFetch !== false;
  const [isLoading, setIsLoading] = useState(shouldAutoFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref for onError callback to avoid dependency issues
  const onErrorRef = useRef(options?.onError);
  useEffect(() => {
    onErrorRef.current = options?.onError;
  }, [options?.onError]);

  const fetchApplication = useCallback(
    async (isRefresh = false) => {
      if (!applicationId) {
        setIsLoading(false);
        return;
      }

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const [appRes, checklistRes] = await Promise.all([
          apiClient.getApplication(applicationId),
          apiClient.getDocumentChecklist(applicationId),
        ]);

        if (appRes.success && appRes.data) {
          setApplication(appRes.data);
          setError(null);
        } else {
          const errorMsg = getErrorMessage(appRes.error || {}, t, i18n.language);
          const finalError = errorMsg || t('errors.failedToLoadApplication', 'Failed to load application');
          setError(finalError);
          if (onErrorRef.current) {
            onErrorRef.current(finalError);
          }
        }

        if (checklistRes.success && checklistRes.data) {
          // Parse checklistData if it's a string
          const checklistData = checklistRes.data;
          if (checklistData.checklistData && typeof checklistData.checklistData === 'string') {
            try {
              const parsed = JSON.parse(checklistData.checklistData);
              setChecklist({
                ...checklistData,
                items: parsed.checklist || parsed.items || [],
              });
            } catch {
              setChecklist(checklistData);
            }
          } else {
            setChecklist(checklistData);
          }
        }
      } catch (err: any) {
        const errorMsg = getErrorMessage(err, t, i18n.language);
        const finalError = errorMsg || t('errors.failedToLoadApplication', 'Failed to load application');
        setError(finalError);
        if (onErrorRef.current) {
          onErrorRef.current(finalError);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [applicationId, t, i18n.language]
  );

  const refetch = useCallback(() => fetchApplication(true), [fetchApplication]);
  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (shouldAutoFetch && applicationId) {
      fetchApplication(false);
    } else {
      setIsLoading(false);
    }
  }, [applicationId, shouldAutoFetch, fetchApplication]);

  return {
    application,
    checklist,
    isLoading,
    isRefreshing,
    error,
    refetch,
    clearError,
  };
}

