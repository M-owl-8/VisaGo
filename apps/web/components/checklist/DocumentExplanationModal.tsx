'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '@/lib/api/config';

interface DocumentExplanation {
  documentType: string;
  whyEn: string;
  whyUz: string;
  whyRu: string;
  tipsEn: string[];
  tipsUz: string[];
  tipsRu: string[];
}

interface DocumentExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  documentType: string;
  language?: string;
}

// Client-side cache for explanations
const explanationCache = new Map<string, DocumentExplanation>();

export function DocumentExplanationModal({
  isOpen,
  onClose,
  applicationId,
  documentType,
  language = 'en',
}: DocumentExplanationModalProps) {
  const { t } = useTranslation();
  const [explanation, setExplanation] = useState<DocumentExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !applicationId || !documentType) return;

    // Check cache first
    const cacheKey = `${applicationId}:${documentType}`;
    const cached = explanationCache.get(cacheKey);
    if (cached) {
      setExplanation(cached);
      setIsLoading(false);
      return;
    }

    const fetchExplanation = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(
          `${API_BASE_URL}/api/applications/${applicationId}/checklist/${documentType}/explanation`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to load explanation');
        }

        const data = await response.json();
        if (data.success && data.data) {
          const exp = data.data;
          setExplanation(exp);
          // Cache it
          explanationCache.set(cacheKey, exp);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('[DocumentExplanation] Error fetching explanation:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExplanation();
  }, [isOpen, applicationId, documentType]);

  // Get localized text
  const why = explanation
    ? language === 'uz'
      ? explanation.whyUz
      : language === 'ru'
      ? explanation.whyRu
      : explanation.whyEn
    : '';

  const tips = explanation
    ? language === 'uz'
      ? explanation.tipsUz
      : language === 'ru'
      ? explanation.tipsRu
      : explanation.tipsEn
    : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('applications.whyDoINeedThis', 'Why do I need this document?')}
      size="md"
    >
      <div className="space-y-4">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">
            <AlertCircle size={16} />
            <span>{t('applications.unableToLoadExplanation', 'Unable to load explanation. Please try again.')}</span>
          </div>
        )}

        {explanation && !isLoading && !error && (
          <>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-white">
                {t('applications.whyThisDocument', 'Why this document?')}
              </h3>
              <p className="text-sm leading-relaxed text-white/80">{why}</p>
            </div>

            {tips.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-white">
                  {t('applications.tips', 'Tips')}
                </h3>
                <ul className="space-y-1.5">
                  {tips.map((tip, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="text-sm text-white/70">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

