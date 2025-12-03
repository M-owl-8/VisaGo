'use client';

import { CheckCircle2, Clock, XCircle, Upload, Eye } from 'lucide-react';
import Link from 'next/link';
import type { TFunction } from 'i18next';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';

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
    status?: 'pending' | 'verified' | 'rejected' | 'not_uploaded';
    fileUrl?: string;
    documentId?: string;
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
  const status = item.status || 'not_uploaded';
  const isVerified = status === 'verified';
  const isRejected = status === 'rejected';
  const isPending = status === 'pending';

  // Get localized text
  const name = language === 'uz' ? item.nameUz || item.name : language === 'ru' ? item.nameRu || item.name : item.name;
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
    if (isVerified) {
      // Check if AI verified
      const aiVerified = (item as any).aiVerified;
      if (aiVerified) {
        return t('documents.statusVerifiedByAI', 'Verified by AI ✅');
      }
      return t('documents.statusVerified', 'Verified');
    }
    if (isRejected) {
      const aiVerified = (item as any).aiVerified;
      if (aiVerified !== undefined) {
        return t('documents.statusRejectedByAI', 'AI found problems ❌');
      }
      return t('documents.statusRejected', 'Rejected');
    }
    if (isPending) {
      return t('documents.statusPendingReview', 'Uploaded, awaiting AI review');
    }
    return t('documents.statusNotUploaded', 'Not uploaded');
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
            href={item.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
          >
            <Eye size={14} />
            {t('documents.viewDocument', 'View')}
          </Link>
        ) : (
          <Link
            href={`/applications/${applicationId}/documents?documentType=${encodeURIComponent(item.documentType || item.document || 'document')}&name=${encodeURIComponent(name)}`}
            className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
          >
            <Upload size={14} />
            {t('documents.uploadDocument', 'Upload')}
          </Link>
        )}
      </div>
    </div>
  );
}

