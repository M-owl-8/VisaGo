import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // Initialize isLoading based on autoFetch: if autoFetch is false, we don't intend to fetch,
  // so isLoading should be false from the start
  const shouldAutoFetch = options?.autoFetch !== false;
  const [isLoading, setIsLoading] = useState<boolean>(shouldAutoFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store onError callback in a ref to avoid including options in dependencies
  const onErrorRef = useRef(options?.onError);
  useEffect(() => {
    onErrorRef.current = options?.onError;
  }, [options?.onError]);

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
          if (onErrorRef.current) {
            onErrorRef.current(finalError);
          }
        }
      } catch (err: any) {
        const errorMsg = getErrorMessage(err, t, i18n.language);
        const finalError = errorMsg || t('errors.failedToLoadApplications', 'Failed to load applications');
        setError(finalError);
        if (onErrorRef.current) {
          onErrorRef.current(finalError);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [t, i18n.language]
  );

  const refetch = useCallback(() => fetchApplications(true), [fetchApplications]);
  const clearError = useCallback(() => setError(null), []);

  // Extract autoFetch as a boolean to make dependency stable
  const autoFetch = options?.autoFetch !== false;

  useEffect(() => {
    if (autoFetch) {
      fetchApplications(false);
    } else {
      // If we are NOT auto-fetching, ensure loading is false so the UI can show empty state instead of skeleton
      setIsLoading(false);
    }
  }, [autoFetch, fetchApplications]);

  return {
    applications,
    isLoading,
    isRefreshing,
    error,
    refetch,
    clearError,
  };
}

