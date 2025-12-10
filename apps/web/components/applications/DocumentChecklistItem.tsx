'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, XCircle, Upload, Eye, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import type { TFunction } from 'i18next';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import { DocumentExplanationModal } from '@/components/checklist/DocumentExplanationModal';

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
}

export function DocumentChecklistItem({
  item,
  applicationId,
  language = 'en',
  t,
}: DocumentChecklistItemProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const status = item.status || 'missing';
  const isVerified = status === 'verified';
  const isRejected = status === 'rejected';
  const isPending = status === 'pending';
  
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
  const whereToObtain = language === 'uz'
    ? item.whereToObtainUz || item.whereToObtain
    : language === 'ru'
    ? item.whereToObtainRu || item.whereToObtain
    : item.whereToObtain;
  const commonMistakes = language === 'uz'
    ? item.commonMistakesUz || item.commonMistakes
    : language === 'ru'
    ? item.commonMistakesRu || item.commonMistakes
    : item.commonMistakes;

  const getStatusIcon = () => {
    if (isVerified) return <CheckCircle2 size={18} className="text-emerald-400" />;
    if (isRejected) return <XCircle size={18} className="text-rose-400" />;
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
        statusLabel = t('documents.statusPendingReview', 'Uploaded, awaiting AI review');
        break;
      case 'verified':
        // Check if AI verified
        const aiVerified = (item as any).aiVerified;
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

      {/* Where to Obtain */}
      {whereToObtain && (
        <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-blue-300">
              {t('checklist.whereToObtain', 'Where to obtain')}:
            </span>
            <p className="flex-1 text-xs text-white/70">{whereToObtain}</p>
          </div>
        </div>
      )}

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

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        {item.fileUrl ? (
          <Link
            href={
              typeof window !== 'undefined' && item.fileUrl.startsWith('http://localhost')
                ? item.fileUrl.replace('http://localhost:3000', window.location.origin)
                : item.fileUrl
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
          >
            <Eye size={14} />
            {t('documents.viewDocument', 'View')}
          </Link>
        ) : (
          <Link
            href={`/applications/${applicationId}/documents?documentType=${encodeURIComponent(item.documentType || 'document')}&name=${encodeURIComponent(name || 'Document')}`}
            className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
          >
            <Upload size={14} />
            {t('documents.uploadDocument', 'Upload')}
          </Link>
        )}
        {documentType && (
          <button
            onClick={() => setShowExplanation(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            title={t('applications.whyDoINeedThis', 'Why do I need this document?')}
          >
            <HelpCircle size={14} />
            <span>{t('applications.why', 'Why?')}</span>
          </button>
        )}
      </div>

      {/* Explanation Modal */}
      {documentType && (
        <DocumentExplanationModal
          isOpen={showExplanation}
          onClose={() => setShowExplanation(false)}
          applicationId={applicationId}
          documentType={documentType}
          language={language}
        />
      )}
    </div>
  );
}

