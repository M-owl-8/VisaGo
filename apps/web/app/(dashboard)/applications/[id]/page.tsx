'use client';

import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';
import { ArrowLeft, MessageCircle, CheckCircle2, Clock, XCircle, Trash2, Upload } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';
import { useApplication } from '@/lib/hooks/useApplication';
import ErrorBanner from '@/components/ErrorBanner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/applications/StatusBadge';
import { DocumentChecklist } from '@/components/checklist/DocumentChecklist';
import { ChecklistSummary } from '@/components/checklist/ChecklistSummary';
import { RiskExplanationPanel } from '@/components/checklist/RiskExplanationPanel';
import { ProgressBreakdown } from '@/components/checklist/ProgressBreakdown';
import { BulkUploadModal } from '@/components/documents/BulkUploadModal';
import { UserInsights } from '@/components/analytics/UserInsights';
import { NextStepGuidance } from '@/components/guidance/NextStepGuidance';
import { getProcessingTimeEstimate, getWhatHappensNext, getMilestoneMessage } from '@/lib/utils/processingTimes';
import { Info } from 'lucide-react';
import { Skeleton, SkeletonCard, SkeletonList } from '@/components/ui/Skeleton';
import { RefreshCcw } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useState } from 'react';

export default function ApplicationDetailPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const { isSignedIn } = useAuthStore();
  const applicationId = params.id as string;
  const {
    application,
    checklist,
    isLoading,
    isRefreshing,
    isPollingChecklist,
    checklistPollTimeout,
    error,
    refetch,
    clearError,
  } = useApplication(applicationId, { autoFetch: isSignedIn });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // Redirect if not signed in
  if (!isSignedIn) {
    router.push('/login');
    return null;
  }

  // Loading state
  if (isLoading && !isRefreshing) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <SkeletonCard className="mb-6 h-32" />
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Error state
  if (!application && !isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <ErrorBanner
            message={error}
            onClose={clearError}
            action={
              <Button variant="secondary" size="sm" onClick={refetch} className="ml-4">
                <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                <span className="ml-2">{t('errors.tryAgain', 'Try Again')}</span>
              </Button>
            }
          />
        )}
        <div className="mt-4">
          <Link
            href="/applications"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-white"
          >
            <ArrowLeft size={16} />
            {t('applications.backToApplications', 'Back to Applications')}
          </Link>
        </div>
        <div className="mt-8 flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-white/60">{t('applications.applicationNotFound', 'Application not found')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!application) return null;

  // Parse checklist items
  const checklistItems = checklist?.items || [];

  const countryCode = application.country?.code?.toLowerCase() || 'xx';
  const flagEmoji = getFlagEmoji(countryCode);

  const handleDeleteApplication = async () => {
    if (!confirm(t('applications.deleteConfirm', 'Are you sure you want to delete this application? This action cannot be undone.'))) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await apiClient.deleteApplication(applicationId);
      if (response.success) {
        router.push('/applications');
      } else {
        alert(t('applications.deleteError', 'Failed to delete application. Please try again.'));
      }
    } catch (error) {
      console.error('Delete application error:', error);
      alert(t('applications.deleteError', 'Failed to delete application. Please try again.'));
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 text-white sm:px-4 sm:py-8 lg:px-8">
      {error && (
        <ErrorBanner
          message={error}
          onClose={clearError}
          action={
            <Button variant="secondary" size="sm" onClick={refetch} className="ml-4">
              <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="ml-2">{t('errors.tryAgain', 'Try Again')}</span>
            </Button>
          }
        />
      )}

      {/* Back Button */}
      <Link
        href="/applications"
        className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
      >
        <ArrowLeft size={16} />
        {t('applications.backToApplications', 'Back to Applications')}
      </Link>

      {/* Next Step Guidance - Context-aware */}
      <div className="mb-6">
        <NextStepGuidance 
          application={application} 
          checklist={checklist}
          isPollingChecklist={isPollingChecklist}
        />
      </div>

      {/* Processing Time Estimate & What Happens Next */}
      {application && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {/* Processing Time Estimate */}
          {application.status !== 'approved' && application.status !== 'rejected' && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <Clock size={16} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-1">
                    {t('applications.typicalProcessing', 'Typical Processing Time')}
                  </p>
                  <p className="text-sm text-white/80">
                    {getProcessingTimeEstimate(
                      application.country?.code,
                      application.visaType?.name
                    ).text}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* What Happens Next */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Info size={16} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-1">
                  {t('applications.whatHappensNext', 'What Happens Next?')}
                </p>
                <p className="text-sm text-white/80">
                  {getWhatHappensNext(
                    !!checklist,
                    checklist?.status === 'ready',
                    checklistItems.filter(item => item.status === 'verified').length,
                    checklistItems.filter(item => item.status === 'rejected').length,
                    checklistItems.filter(item => item.status === 'pending' || !item.status).length,
                    checklistItems.filter(item => item.category === 'required').length,
                    application.status === 'submitted'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Section */}
      <Card className="glass-panel mb-6 border border-white/10 bg-white/[0.03] p-4 sm:mb-8 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-3xl sm:h-16 sm:w-16 sm:text-4xl">
              {flagEmoji}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-semibold text-white sm:text-2xl md:text-3xl">
                <span className="block sm:inline">{application.country?.name || t('applications.title')}</span>
                <span className="hidden sm:inline"> - </span>
                <span className="block sm:inline">{application.visaType?.name}</span>
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
                <StatusBadge status={application.status} />
                <span className="text-xs text-white/60 sm:text-sm">
                  {t('applications.progress', 'Progress')}: {application.progressPercentage || 0}%
                </span>
                {application.status === 'draft' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteApplication}
                    disabled={isDeleting}
                    className="h-7 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 text-xs text-rose-300 hover:bg-rose-500/20 hover:text-rose-200"
                    title={t('applications.deleteApplication', 'Delete Application')}
                  >
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="ghost"
              onClick={() => setShowBulkUpload(true)}
              className="w-full rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary hover:bg-primary/20 sm:w-auto sm:px-4 sm:text-sm"
            >
              <Upload size={14} className="sm:size-4" />
              <span className="ml-1.5 sm:ml-2">{t('documents.uploadMultiple', 'Upload Multiple')}</span>
            </Button>
            <Link href={`/chat?applicationId=${applicationId}`} className="w-full sm:w-auto">
              <Button
                variant="ghost"
                className="w-full rounded-xl border border-white/10 !bg-transparent px-3 py-2 text-xs !text-white hover:!bg-white/10 sm:px-4 sm:text-sm"
              >
                <MessageCircle size={14} className="sm:size-4" />
                <span className="ml-1.5 sm:ml-2">{t('applications.askAIAboutApplication', 'Ask AI about this application')}</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm text-white/60">
            <div className="flex items-center gap-2">
              <span>{t('applications.overallProgress', 'Overall Progress')}</span>
              {(() => {
                const milestone = getMilestoneMessage(application.progressPercentage || 0);
                return milestone ? (
                  <span className="text-xs text-emerald-400 font-medium">
                    • {milestone}
                  </span>
                ) : null;
              })()}
            </div>
            <span className="font-semibold text-white">{application.progressPercentage || 0}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-white/25 border-2 border-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-dark transition-[width] shadow-[0_0_8px_rgba(62,166,255,0.5)]"
              style={{ width: `${application.progressPercentage || 0}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[2fr,1fr]">
        {/* Document Checklist */}
        <div className="space-y-6">
          {/* Polling state: Show loading message while checklist is being generated */}
          {isPollingChecklist && (
            <Card className="glass-panel border border-emerald-500/20 bg-emerald-500/5 p-6">
              <div className="flex items-center gap-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {t(
                      'applications.checklistGenerating',
                      "We're preparing your personalized checklist"
                    )}
                  </p>
                  <p className="mt-1 text-xs text-emerald-200/80">
                    {t(
                      'applications.checklistGeneratingSubtext',
                      "This usually takes 10–20 seconds. You don't need to refresh — it'll appear automatically. Based on official embassy requirements."
                    )}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Timeout state: Show warning if polling timed out */}
          {checklistPollTimeout && checklistItems.length === 0 && (
            <Card className="glass-panel border border-amber-500/30 bg-amber-500/10 p-6">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 h-5 w-5 shrink-0 text-amber-400">
                  <Clock size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-200">
                    {t(
                      'applications.checklistTimeout',
                      'Your checklist is taking a bit longer than expected'
                    )}
                  </p>
                  <p className="mt-1 text-xs text-amber-200/80">
                    {t(
                      'applications.checklistTimeoutSubtext',
                      'This sometimes happens when analyzing complex visa requirements. Give it a minute, then try refreshing. Your application is safe — nothing will be lost.'
                    )}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={refetch}
                    className="mt-3 border-amber-500/30 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
                  >
                    <RefreshCcw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                    <span className="ml-2">{t('applications.refreshChecklist', 'Refresh')}</span>
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Risk Explanation Panel - Show when checklist is ready */}
          {checklistItems.length > 0 && !isPollingChecklist && (
            <RiskExplanationPanel
              applicationId={applicationId}
              language={i18n.language}
            />
          )}

          {/* Checklist component - shows empty state if no items and not polling */}
          <DocumentChecklist
            items={checklistItems}
            applicationId={applicationId}
            language={i18n.language}
            isPolling={isPollingChecklist}
            pollTimeout={checklistPollTimeout}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress Breakdown */}
          <ProgressBreakdown
            questionnaireComplete={!!application}
            totalRequired={checklistItems.filter(item => item.category === 'required').length}
            verifiedCount={checklistItems.filter(item => item.status === 'verified').length}
            pendingCount={checklistItems.filter(item => item.status === 'pending').length}
          />
          
          {/* Checklist Summary */}
          <ChecklistSummary items={checklistItems} />

          {/* User Insights */}
          <UserInsights
            countryCode={application.country?.code}
            visaType={application.visaType?.name}
          />
        </div>
      </div>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        applicationId={applicationId}
        onUploadComplete={() => {
          // Refresh the page to show updated documents
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }}
      />
    </div>
  );
}

// Helper to get flag emoji from country code
function getFlagEmoji(countryCode: string): string {
  const flagMap: Record<string, string> = {
    us: '🇺🇸',
    ca: '🇨🇦',
    gb: '🇬🇧',
    au: '🇦🇺',
    de: '🇩🇪',
    fr: '🇫🇷',
    es: '🇪🇸',
    it: '🇮🇹',
    jp: '🇯🇵',
    ae: '🇦🇪',
    uz: '🇺🇿',
  };
  return flagMap[countryCode] || '🌍';
}
