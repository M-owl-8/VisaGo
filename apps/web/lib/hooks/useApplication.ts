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

// Polling configuration
const CHECKLIST_POLL_INTERVAL = 4000; // 4 seconds
const CHECKLIST_MAX_POLL_ATTEMPTS = 10; // 10 attempts = 40 seconds total
const CHECKLIST_POLL_TIMEOUT = 40000; // 40 seconds in milliseconds

interface UseApplicationResult {
  application: ApplicationDetail | null;
  checklist: DocumentChecklist | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isPollingChecklist: boolean; // New: indicates if we're polling for checklist
  checklistPollTimeout: boolean; // New: indicates if polling timed out
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
  const [isPollingChecklist, setIsPollingChecklist] = useState(false);
  const [checklistPollTimeout, setChecklistPollTimeout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for polling control
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef(0);
  const onErrorRef = useRef(options?.onError);

  useEffect(() => {
    onErrorRef.current = options?.onError;
  }, [options?.onError]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Fetch checklist only (used for polling)
   */
  const fetchChecklist = useCallback(async (): Promise<boolean> => {
    if (!applicationId) return false;

    try {
      const checklistRes = await apiClient.getDocumentChecklist(applicationId);

      if (checklistRes.success && checklistRes.data) {
        const checklistData = checklistRes.data;

        // Check if checklist is still processing
        if (checklistData.status === 'processing') {
          return false; // Still processing, continue polling
        }

        // Check if we have items
        const items = checklistData.items || [];
        if (items.length > 0) {
          // Checklist is ready
          setChecklist({
            id: checklistData.id || '',
            applicationId,
            status: 'ready',
            aiGenerated: checklistData.aiGenerated || false,
            items: items,
          });
          return true; // Checklist is ready, stop polling
        }

        // No items yet, continue polling
        return false;
      }

      return false; // Continue polling on error
    } catch (err) {
      console.error('Error fetching checklist during poll:', err);
      return false; // Continue polling on error
    }
  }, [applicationId]);

  /**
   * Start polling for checklist
   * 
   * Polling behavior:
   * - Polls every CHECKLIST_POLL_INTERVAL (4 seconds) while checklist status is 'processing' or items.length === 0
   * - Stops polling when checklist status === 'ready' AND items.length > 0
   * - Stops polling after CHECKLIST_MAX_POLL_ATTEMPTS (10 attempts) or CHECKLIST_POLL_TIMEOUT (40 seconds)
   * - Sets checklistPollTimeout flag if polling times out
   * 
   * This handles the async checklist generation where the first GET request may happen
   * while the checklist is still being generated in the background.
   */
  const startChecklistPolling = useCallback(() => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }

    setIsPollingChecklist(true);
    setChecklistPollTimeout(false);
    pollAttemptsRef.current = 0;

    // Set timeout to stop polling after max time
    pollingTimeoutRef.current = setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsPollingChecklist(false);
      setChecklistPollTimeout(true);
    }, CHECKLIST_POLL_TIMEOUT);

    // Start polling interval
    pollingIntervalRef.current = setInterval(async () => {
      pollAttemptsRef.current += 1;

      // Check max attempts
      if (pollAttemptsRef.current >= CHECKLIST_MAX_POLL_ATTEMPTS) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsPollingChecklist(false);
        setChecklistPollTimeout(true);
        return;
      }

      // Fetch checklist
      const isReady = await fetchChecklist();
      if (isReady) {
        // Checklist is ready, stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
          pollingTimeoutRef.current = null;
        }
        setIsPollingChecklist(false);
      }
    }, CHECKLIST_POLL_INTERVAL);
  }, [fetchChecklist]);

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
        const checklistData = checklistRes.data;

        // Check if checklist is still processing
        // Backend returns { status: 'processing', items: [] } when still generating
        const isProcessing =
          checklistData.status === 'processing' ||
          (checklistData.items && Array.isArray(checklistData.items) && checklistData.items.length === 0);

        if (isProcessing) {
          // Start polling for checklist
          startChecklistPolling();
          // Set a placeholder checklist with processing status
          setChecklist({
            id: '',
            applicationId,
            status: 'processing',
            aiGenerated: false,
            items: [],
          });
        } else {
          // Checklist is ready - parse it
          // Backend returns { items: [...], summary: {...}, ... }
          const items = checklistData.items || [];
          if (items.length > 0) {
            setChecklist({
              id: checklistData.id || '',
              applicationId,
              status: 'ready',
              aiGenerated: checklistData.aiGenerated || false,
              items: items,
            });
          } else {
            // No items but not processing - might be an error, start polling anyway
            startChecklistPolling();
            setChecklist({
              id: '',
              applicationId,
              status: 'processing',
              aiGenerated: false,
              items: [],
            });
          }
        }
      } else {
        // No checklist data, might be processing
        startChecklistPolling();
        setChecklist({
          id: '',
          applicationId,
          status: 'processing',
          aiGenerated: false,
          items: [],
        });
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
    [applicationId, t, i18n.language, startChecklistPolling]
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
    isPollingChecklist,
    checklistPollTimeout,
    error,
    refetch,
    clearError,
  };
}

