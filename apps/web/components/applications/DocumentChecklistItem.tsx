'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, XCircle, Upload, Eye, HelpCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { TFunction } from 'i18next';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import { DocumentUploadModal } from '@/components/documents/DocumentUploadModal';
import { useDocumentStatus } from '@/lib/hooks/useDocumentStatus';
import { ContextualHelp } from '@/components/help/ContextualHelp';

interface DocumentChecklistItemProps {
  item: {
    document?: string;
    documentType?: string;
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
    commonMistakes?: string;
    commonMistakesUz?: string;
    commonMistakesRu?: string;
    status?: 'missing' | 'pending' | 'verified' | 'rejected';
    fileUrl?: string;
    documentId?: string;
    aiVerified?: boolean;
    aiConfidence?: number;
    verificationNotes?: string;
  };
  applicationId: string;
  language?: string;
  t: TFunction<'translation', undefined>;
  onPreview?: (documentId: string) => void;
}

export function DocumentChecklistItem({
  item,
  applicationId,
  language = 'en',
  t,
  onPreview,
}: DocumentChecklistItemProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Use polling hook for pending documents
  const { status: liveStatus, isProcessing } = useDocumentStatus(
    item.documentId,
    item.status
  );
  
  // Use live status if available, otherwise fall back to item status
  const status = liveStatus?.status || item.status || 'missing';

  // Listen for status change events
  useEffect(() => {
    const handleStatusChange = async (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.documentId === item.documentId) {
        const newStatus = customEvent.detail.status;
        if (newStatus === 'verified') {
          setToastMessage(t('documents.statusVerified', 'Document verified!'));
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
          
          // Celebrate with confetti
          const { celebrateDocumentVerified } = await import('@/lib/utils/confetti');
          celebrateDocumentVerified();
        } else if (newStatus === 'rejected') {
          setToastMessage(t('documents.statusRejected', 'Document rejected'));
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('document-status-changed', handleStatusChange);
      return () => {
        window.removeEventListener('document-status-changed', handleStatusChange);
      };
    }
  }, [item.documentId, t]);
  
  const documentType = item.documentType || item.document || '';

  // Helper to format snake_case to Title Case
  const formatDocumentName = (name: string): string => {
    if (!name) return '';
    // If already formatted (contains spaces and capitals), return as is
    if (name.includes(' ') && /[A-Z]/.test(name)) return name;
    // Format snake_case or kebab-case
    return name
      .split(/[_-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get localized text with fallback formatting
  const getLocalizedName = () => {
    if (language === 'uz') {
      return item.nameUz || item.name || formatDocumentName(documentType);
    }
    if (language === 'ru') {
      return item.nameRu || item.name || formatDocumentName(documentType);
    }
    return item.name || formatDocumentName(documentType);
  };
  const name = getLocalizedName();
  const description = language === 'uz' 
    ? item.descriptionUz || item.description 
    : language === 'ru' 
    ? item.descriptionRu || item.description 
    : item.description;
  const commonMistakes = language === 'uz'
    ? item.commonMistakesUz || item.commonMistakes
    : language === 'ru'
    ? item.commonMistakesRu || item.commonMistakes
    : item.commonMistakes;

  const isVerified = status === 'verified';
  const isRejected = status === 'rejected';
  const isPending = status === 'pending';

  const getStatusIcon = () => {
    if (isVerified) return <CheckCircle2 size={18} className="text-emerald-400" />;
    if (isRejected) return <XCircle size={18} className="text-rose-400" />;
    if (isPending && isProcessing) return <Loader2 size={18} className="animate-spin text-amber-400" />;
    if (isPending) return <Clock size={18} className="text-amber-400" />;
    return null;
  };

  const getStatusLabel = () => {
    // Status mapping: missing → "Not uploaded", pending → "Uploaded, awaiting AI review", etc.
    let statusLabel = t('documents.statusNotUploaded', 'Not uploaded');
    
    switch (status) {
      case 'missing':
        statusLabel = t('documents.statusNotUploaded', 'Not uploaded');
        break;
      case 'pending':
        statusLabel = isProcessing
          ? t('documents.statusAIReviewing', 'AI reviewing...')
          : t('documents.statusPendingReview', 'Uploaded, awaiting AI review');
        break;
      case 'verified':
        // Check if AI verified
        const aiVerified = liveStatus?.verifiedByAI || (item as any).aiVerified;
        statusLabel = aiVerified
          ? t('documents.statusVerifiedByAI', 'Verified by AI ✅')
          : t('documents.statusVerified', 'Verified');
        break;
      case 'rejected':
        statusLabel = t('documents.statusNeedsFix', 'Needs fix');
        break;
      default:
        statusLabel = t('documents.statusNotUploaded', 'Not uploaded');
    }
    
    return statusLabel;
  };

  const categoryColors = {
    required: 'border-rose-500/30 bg-rose-500/5',
    highly_recommended: 'border-amber-500/30 bg-amber-500/5',
    optional: 'border-white/10 bg-white/5',
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition hover:border-white/20',
        categoryColors[item.category],
        isVerified && 'border-emerald-500/30 bg-emerald-500/5',
        isRejected && 'border-rose-500/30 bg-rose-500/10'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-white">{name}</h4>
            {getStatusIcon()}
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                item.category === 'required' && 'border-rose-400/50 text-rose-300',
                item.category === 'highly_recommended' && 'border-amber-400/50 text-amber-300',
                item.category === 'optional' && 'border-white/30 text-white/70'
              )}
            >
              {item.category === 'required'
                ? t('documents.categoryRequired', 'Required')
                : item.category === 'highly_recommended'
                ? t('documents.categoryHighlyRecommended', 'Highly Recommended')
                : t('documents.categoryOptional', 'Optional')}
            </Badge>
            {/* Contextual Help */}
            {item.category === 'required' && (
              <ContextualHelp
                title={t('help.requiredDocument', 'Required Document')}
                content={t('help.requiredDocumentInfo', 'This document is mandatory for your visa application. Your application cannot proceed without it.')}
                position="top"
              />
            )}
          </div>
          {description && (
            <p className="mt-1 text-sm text-white/60">{description}</p>
          )}
          <div className="mt-2 flex items-center gap-2 text-xs text-white/50">
            <span>{getStatusLabel()}</span>
            {item.priority && (
              <>
                <span>•</span>
                <span className="capitalize">{item.priority} priority</span>
              </>
            )}
          </div>
          {/* Show AI explanation if document is rejected */}
          {isRejected && (
            <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/5 p-2">
              <p className="text-xs font-medium text-red-300 mb-1">
                {t('documents.incorrectDocument', 'Incorrect document')}
              </p>
              <p className="text-xs text-red-200/90 leading-relaxed">
                {item.verificationNotes || (item as any).aiNotesEn || t('documents.pleaseUploadCorrected', 'Please upload a corrected version of this document.')}
              </p>
              {typeof item.aiConfidence === 'number' && (
                <p className="text-xs text-red-200/70 mt-1">
                  {t('documents.aiConfidence', 'AI confidence')}: {Math.round(item.aiConfidence * 100)}%
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Common Mistakes - Only show if data exists */}
      {commonMistakes && (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-amber-300">
              {t('checklist.commonMistakes', 'Common mistakes')}:
            </span>
            <p className="flex-1 text-xs text-white/70">{commonMistakes}</p>
          </div>
        </div>
      )}

      {/* Actions - Optimized for mobile with proper touch targets */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Show Upload button if missing, rejected, or pending (allows re-upload) */}
        {(status === 'missing' || status === 'rejected' || status === 'pending') && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary transition hover:bg-primary/20 active:scale-95 sm:w-auto sm:justify-start"
          >
            <Upload size={18} />
            <span>{t('documents.uploadDocument', 'Upload')}</span>
          </button>
        )}
        {/* Show View button if file exists (for all statuses including rejected/pending) */}
        {item.fileUrl && (
          <button
            onClick={() => onPreview && item.documentId && onPreview(item.documentId)}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 active:scale-95 sm:w-auto sm:justify-start"
          >
            <Eye size={18} />
            <span>{t('documents.viewDocument', 'View')}</span>
          </button>
        )}
      </div>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        applicationId={applicationId}
        documentType={item.documentType || 'document'}
        documentName={name}
        onUploadSuccess={() => {
          // Refresh the page to show updated status
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }}
      />

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <div className="rounded-lg border border-white/10 bg-midnight/95 px-4 py-3 shadow-lg backdrop-blur-sm">
            <p className="text-sm font-medium text-white">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}

