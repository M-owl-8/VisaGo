'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface ProgressBreakdownProps {
  questionnaireComplete: boolean;
  totalRequired: number;
  verifiedCount: number;
  pendingCount: number;
  className?: string;
}

export function ProgressBreakdown({
  questionnaireComplete,
  totalRequired,
  verifiedCount,
  pendingCount,
  className,
}: ProgressBreakdownProps) {
  const { t } = useTranslation();

  // Calculate progress percentages
  const questionnaireProgress = questionnaireComplete ? 20 : 0;
  const verifiedProgress = totalRequired > 0 ? (verifiedCount / totalRequired) * 60 : 0;
  const pendingProgress = totalRequired > 0 ? (pendingCount / totalRequired) * 20 : 0;
  const totalProgress = questionnaireProgress + verifiedProgress + pendingProgress;

  // Celebrate when all documents are verified
  useEffect(() => {
    if (totalRequired > 0 && verifiedCount === totalRequired && verifiedCount > 0) {
      const celebrateAll = async () => {
        const { celebrateAllDocumentsVerified } = await import('@/lib/utils/confetti');
        celebrateAllDocumentsVerified();
      };
      celebrateAll();
    }
  }, [verifiedCount, totalRequired]);

  return (
    <Card className={`glass-panel border border-white/10 bg-white/[0.03] p-6 ${className || ''}`}>
      <h3 className="mb-4 text-lg font-semibold text-white">
        {t('progress.breakdown', 'Progress Breakdown')}
      </h3>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-white/70">{t('progress.overall', 'Overall Progress')}</span>
          <span className="text-lg font-bold text-white">{Math.round(totalProgress)}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-emerald-500 transition-all duration-500"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* Breakdown Segments */}
      <div className="space-y-4">
        {/* Questionnaire */}
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              questionnaireComplete ? 'bg-emerald-500/20' : 'bg-white/10'
            }`}
          >
            {questionnaireComplete ? (
              <CheckCircle2 size={16} className="text-emerald-400" />
            ) : (
              <FileText size={16} className="text-white/40" />
            )}
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-white">
                {t('progress.questionnaire', 'Questionnaire')}
              </span>
              <span className="text-sm font-semibold text-white">{questionnaireProgress}%</span>
            </div>
            <p className="text-xs text-white/60">
              {questionnaireComplete
                ? t('progress.questionnaireComplete', 'Application details completed')
                : t('progress.questionnairePending', 'Complete application details')}
            </p>
          </div>
        </div>

        {/* Verified Documents */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-white">
                {t('progress.verifiedDocuments', 'Verified Documents')}
              </span>
              <span className="text-sm font-semibold text-white">{Math.round(verifiedProgress)}%</span>
            </div>
            <p className="text-xs text-white/60">
              {verifiedCount} {t('progress.of', 'of')} {totalRequired} {t('progress.documentsVerified', 'documents verified')}
            </p>
            {verifiedCount > 0 && (
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(verifiedCount / totalRequired) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Pending Documents */}
        {pendingCount > 0 && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
              <Clock size={16} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-white">
                  {t('progress.pendingReview', 'Pending AI Review')}
                </span>
                <span className="text-sm font-semibold text-white">{Math.round(pendingProgress)}%</span>
              </div>
              <p className="text-xs text-white/60">
                {pendingCount} {t('progress.documentsAwaitingReview', 'documents awaiting AI review')}
              </p>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${(pendingCount / totalRequired) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Tooltip */}
      <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
        <p className="text-xs text-white/70">
          💡 {t('progress.tip', 'Progress increases when AI verifies your documents. Pending documents count as partial progress.')}
        </p>
      </div>
    </Card>
  );
}

