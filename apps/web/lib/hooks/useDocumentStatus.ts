import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../api/client';

interface DocumentStatus {
  status: 'pending' | 'verified' | 'rejected' | 'missing';
  verifiedByAI: boolean;
  aiConfidence: number | null;
  aiNotesUz: string | null;
  aiNotesEn: string | null;
  aiNotesRu: string | null;
  verificationNotes: string | null;
}

interface UseDocumentStatusResult {
  status: DocumentStatus | null;
  isProcessing: boolean;
  error: string | null;
}

const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_DURATION = 60000; // 60 seconds max

export function useDocumentStatus(
  documentId: string | undefined,
  initialStatus?: 'pending' | 'verified' | 'rejected' | 'missing'
): UseDocumentStatusResult {
  const [status, setStatus] = useState<DocumentStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(initialStatus === 'pending');
  const [error, setError] = useState<string | null>(null);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollStartTimeRef = useRef<number>(Date.now());
  const previousStatusRef = useRef<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!documentId) return;

    try {
      const response = await apiClient.get(`/documents/${documentId}/status`);
      
      if (response.data.success && response.data.data) {
        const newStatus = response.data.data;
        setStatus(newStatus);
        
        // Check if status changed from pending
        if (previousStatusRef.current === 'pending' && newStatus.status !== 'pending') {
          // Status changed - show notification
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('document-status-changed', {
              detail: {
                documentId,
                status: newStatus.status,
                verifiedByAI: newStatus.verifiedByAI,
              },
            });
            window.dispatchEvent(event);
          }
        }
        
        previousStatusRef.current = newStatus.status;
        
        // Stop polling if status is no longer pending
        if (newStatus.status !== 'pending') {
          setIsProcessing(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      }
    } catch (err: any) {
      console.error('[useDocumentStatus] Error fetching status:', err);
      setError(err.message || 'Failed to fetch document status');
    }
  }, [documentId]);

  useEffect(() => {
    if (!documentId || !isProcessing) return;

    // Start polling
    pollStartTimeRef.current = Date.now();
    fetchStatus(); // Initial fetch

    pollIntervalRef.current = setInterval(() => {
      // Check if we've been polling for too long
      if (Date.now() - pollStartTimeRef.current > MAX_POLL_DURATION) {
        setIsProcessing(false);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setError('Document processing is taking longer than expected. Please refresh the page.');
        return;
      }

      fetchStatus();
    }, POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [documentId, isProcessing, fetchStatus]);

  return {
    status,
    isProcessing,
    error,
  };
}

