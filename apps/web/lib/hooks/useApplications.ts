import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errorMessages';
import { useTranslation } from 'react-i18next';

export interface Application {
  id: string;
  countryId: string;
  visaTypeId: string;
  status: string;
  progressPercentage: number;
  submissionDate?: string;
  approvalDate?: string;
  expiryDate?: string;
  updatedAt: string;
  createdAt: string;
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

interface UseApplicationsResult {
  applications: Application[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearError: () => void;
}

export function useApplications(
  options?: {
    onError?: (error: string) => void;
    autoFetch?: boolean;
  }
): UseApplicationsResult {
  const { t, i18n } = useTranslation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await apiClient.getApplications();

        if (response.success && response.data) {
          const apps = Array.isArray(response.data) ? response.data : response.data.data || [];
          setApplications(apps);
          setError(null);
        } else {
          const errorMsg = getErrorMessage(response.error || {}, t, i18n.language);
          const finalError = errorMsg || t('errors.failedToLoadApplications', 'Failed to load applications');
          setError(finalError);
          if (options?.onError) {
            options.onError(finalError);
          }
        }
      } catch (err: any) {
        const errorMsg = getErrorMessage(err, t, i18n.language);
        const finalError = errorMsg || t('errors.failedToLoadApplications', 'Failed to load applications');
        setError(finalError);
        if (options?.onError) {
          options.onError(finalError);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [t, i18n.language, options]
  );

  const refetch = useCallback(() => fetchApplications(true), [fetchApplications]);
  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (options?.autoFetch !== false) {
      fetchApplications(false);
    }
  }, [fetchApplications, options?.autoFetch]);

  return {
    applications,
    isLoading,
    isRefreshing,
    error,
    refetch,
    clearError,
  };
}

