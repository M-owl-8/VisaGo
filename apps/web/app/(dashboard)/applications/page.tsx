'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowUpRight, MessageCircle, Plus, RefreshCcw, Sparkles, AlertCircle } from 'lucide-react';
import ErrorBanner from '@/components/ErrorBanner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonCard, SkeletonList } from '@/components/ui/Skeleton';
import { ApplicationCard } from '@/components/applications/ApplicationCard';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { NextStepGuidance } from '@/components/guidance/NextStepGuidance';
import { useAuthStore } from '@/lib/stores/auth';
import { useOnboardingStore } from '@/lib/stores/onboarding';
import { useApplications } from '@/lib/hooks/useApplications';
import { usePullToRefresh } from '@/lib/hooks/usePullToRefresh';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

export default function ApplicationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isSignedIn, isLoading: authLoading } = useAuthStore();
  const { hasCompletedOnboarding } = useOnboardingStore();
  const { applications: userApplications, isLoading, isRefreshing, error, refetch, clearError } = useApplications({
    autoFetch: isSignedIn && !authLoading,
  });

  // Pull-to-refresh for mobile
  const { isPulling, pullDistance, shouldRefresh } = usePullToRefresh({
    onRefresh: refetch,
    enabled: !isLoading && !isRefreshing,
  });

  // All hooks must be called before any early returns
  const totalApplications = userApplications.length;

  const overallProgress = useMemo(() => {
    if (!totalApplications) return 0;
    const total = userApplications.reduce((sum, app) => sum + (app.progressPercentage || 0), 0);
    return Math.round(total / totalApplications);
  }, [totalApplications, userApplications]);

  const documentsReady = useMemo(() => {
    if (!totalApplications) return { uploaded: 0, required: 0 };
    const requiredPerApplication = 20; // Total documents per application (required + highly_recommended + optional)
    const totalRequired = totalApplications * requiredPerApplication;
    const uploaded = userApplications.reduce((sum, app) => {
      const progress = (app.progressPercentage || 0) / 100;
      return sum + Math.round(progress * requiredPerApplication);
    }, 0);
    return { uploaded, required: totalRequired };
  }, [totalApplications, userApplications]);

  const recentActivities = useMemo(() => {
    return userApplications
      .map((app) => ({
        id: app.id,
        description: `${app.country?.name ?? t('common.unknown', 'Unknown')} — ${
          app.visaType?.name ?? t('applications.title')
        }`,
        timestamp: app.submissionDate ?? app.updatedAt ?? new Date().toISOString(),
        status: app.status,
      }))
      .slice(0, 4);
  }, [userApplications, t]);

  // Define renderSkeleton before it's used
  const renderSkeleton = () => (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <SkeletonCard className="h-48" />
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, idx) => (
          <Skeleton key={`metric-${idx}`} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );

  // Show loading while checking auth
  if (authLoading) {
    return <div>{renderSkeleton()}</div>;
  }

  // Redirect if not signed in (after all hooks)
  if (!isSignedIn) {
    router.push('/login');
    return null;
  }

  const statusStyles: Record<string, { label: string; classes: string; chip: string }> = {
    draft: {
      label: t('applications.statusDraft', 'Draft'),
      classes: 'bg-white/20 text-white',
      chip: 'bg-white/20 text-white border-2 border-white/40 shadow-sm',
    },
    submitted: {
      label: t('applications.statusSubmitted', 'Submitted'),
      classes: 'bg-primary/20 text-primary',
      chip: 'bg-primary/10 text-primary border border-primary/30',
    },
    approved: {
      label: t('applications.statusApproved', 'Approved'),
      classes: 'bg-emerald-500/20 text-emerald-300',
      chip: 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/30',
    },
    rejected: {
      label: t('applications.statusRejected', 'Rejected'),
      classes: 'bg-rose-500/20 text-rose-300',
      chip: 'bg-rose-500/10 text-rose-300 border border-rose-400/30',
    },
    in_progress: {
      label: t('applications.statusInProgress', 'In progress'),
      classes: 'bg-amber-500/20 text-amber-200',
      chip: 'bg-amber-500/10 text-amber-200 border border-amber-300/30',
    },
  };

  const getStatusVariant = (status?: string) => {
    if (!status) return statusStyles.draft;
    const normalized = status.toLowerCase().replace(/\s+/g, '_');
    return statusStyles[normalized] ?? statusStyles.in_progress;
  };

  // Loading state
  if (isLoading && !isRefreshing) {
    return <div>{renderSkeleton()}</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-3 text-white sm:space-y-8 sm:px-4 sm:py-4 lg:px-8 lg:py-6">
      {error && (
        <ErrorBanner
          message={error}
          onClose={clearError}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={refetch}
              className="ml-4"
            >
              <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="ml-2">{t('errors.tryAgain', 'Try Again')}</span>
            </Button>
          }
        />
      )}

      {/* Next Step Guidance - Dominant but not loud */}
      <NextStepGuidance applications={userApplications} />

      <section className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[2fr,1fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-panel relative overflow-hidden border border-white/10 bg-gradient-to-br from-[#0C1525] to-[#060a18] px-4 py-6 text-white sm:px-6 sm:py-8 md:px-8 md:py-10"
        >
          <div className="absolute right-[-10%] top-[-20%] h-60 w-60 rounded-full bg-primary/20 blur-[140px]" />
          <div className="absolute left-[-15%] bottom-[-20%] h-72 w-72 rounded-full bg-[#1D4ED8]/15 blur-[160px]" />
          <div className="relative space-y-4 sm:space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/50 sm:text-sm">
                {t('applications.heroEyebrow', 'Dashboard')}
              </p>
              <h1 className="mt-1.5 font-display text-2xl font-semibold text-white sm:mt-2 sm:text-3xl md:text-4xl">
                {t('applications.heroTitle', {
                  name: user?.firstName || t('applications.heroDefaultName', 'Traveler'),
                })}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/70 sm:mt-3 sm:text-base">
                {t(
                  'applications.heroSubtitle',
                  'Keep every visa document, AI chat, and payment status perfectly synced with your mobile app.'
                )}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
              <Link href="/questionnaire" className="w-full sm:w-auto">
                <Button className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-4 py-2.5 text-sm shadow-[0_20px_45px_rgba(62,166,255,0.45)] sm:w-auto sm:px-6 sm:py-3 sm:text-base">
                  <Plus size={16} className="sm:size-5" />
                  <span className="ml-2">{t('applications.startNewApplication')}</span>
                </Button>
              </Link>
              <Link href="/chat" className="w-full sm:w-auto">
                <Button
                  variant="secondary"
                  className="w-full rounded-2xl border border-white/10 !bg-transparent px-4 py-2.5 text-sm text-white shadow-[0_15px_35px_rgba(7,12,30,0.7)] sm:w-auto sm:px-6 sm:py-3 sm:text-base"
                >
                  <MessageCircle size={16} className="sm:size-5" />
                  <span className="ml-2">{t('applications.heroAiCta', 'Open AI assistant')}</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full rounded-2xl border border-white/10 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 sm:w-auto"
                onClick={refetch}
                disabled={isRefreshing}
              >
                <RefreshCcw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                <span className="ml-2">{t('applications.refresh', 'Refresh')}</span>
              </Button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="glass-panel grid grid-cols-1 gap-3 border border-white/10 bg-white/[0.04] px-4 py-4 text-white sm:gap-4 sm:px-6 sm:py-6"
        >
          <Metric
            label={t('applications.metrics.active', 'Active applications')}
            value={totalApplications}
            helper={t('applications.metrics.synced', 'Synced with mobile')}
          />
          <Metric
            label={t('applications.metrics.documentsReady', 'Documents ready')}
            value={`${documentsReady.uploaded}/${documentsReady.required || 1}`}
            helper={t('applications.metrics.documentsLabel', 'Ready for upload')}
          />
          <Metric
            label={t('applications.metrics.avgProgress', 'Average progress')}
            value={`${overallProgress}%`}
            helper={t('applications.metrics.progressHelper', 'Across all journeys')}
          />
        </motion.div>
      </section>

      {/* Show onboarding for first-time users */}
      {totalApplications === 0 && !hasCompletedOnboarding && <OnboardingFlow />}

      {totalApplications === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[2fr,1fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-panel border border-white/10 bg-white/[0.03] px-4 py-4 text-white sm:px-6 sm:py-6"
          >
            <div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-lg text-white sm:text-xl">
                  {t('applications.activeSectionTitle', 'Active journeys')}
                </h2>
                <p className="text-xs text-white/60 sm:text-sm">
                  {t('applications.activeSectionSubtitle', 'Continue where you left off')}
                </p>
              </div>
              <Link href="/questionnaire" className="text-xs text-primary hover:underline sm:text-sm">
                {t('applications.startNewApplication')}
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
              {userApplications.map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  statusStyles={statusStyles}
                  getStatusVariant={getStatusVariant}
                  t={t}
                  onDelete={refetch}
                />
              ))}
            </div>
          </motion.div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-panel border border-white/10 bg-white/[0.03] px-6 py-6 text-white"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg text-white">
                  {t('applications.recentActivity', 'Recent activity')}
                </h2>
                <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                  {t('applications.synced', 'Synced')}
                </span>
              </div>
              <div className="space-y-4">
                {recentActivities.length === 0 ? (
                  <p className="text-sm text-white/60">
                    {t(
                      'applications.noRecentActivity',
                      'We will surface highlights here as you progress.'
                    )}
                  </p>
                ) : (
                  recentActivities.map((activity) => {
                    const variant = getStatusVariant(activity.status);
                    return (
                      <div
                        key={activity.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white">{activity.description}</p>
                          <span className={`rounded-full px-2 py-1 text-xs ${variant.classes}`}>
                            {variant.label}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-white/60">
                          {formatRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}

const Metric = ({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) => (
  <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 text-white shadow-[0_25px_55px_rgba(1,7,17,0.65)]">
    <p className="text-xs uppercase tracking-[0.3em] text-white/50">{label}</p>
    <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    <p className="text-sm text-white/60">{helper}</p>
  </div>
);


const EmptyState = () => {
  const { t } = useTranslation();
  return (
    <Card className="glass-panel flex flex-col items-center justify-center border-dashed border-white/10 bg-white/[0.03] px-8 py-20 text-center text-white">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary-dark/20 text-primary">
        <Sparkles size={32} />
      </div>
      <h3 className="font-display text-2xl font-semibold text-white">
        {t('applications.noApplicationsYet', 'Ready to start your visa journey?')}
      </h3>
      <p className="mt-3 max-w-xl text-sm text-white/70">
        {t(
          'applications.emptySubtitle',
          'Answer a few questions about your trip, and we'll create a personalized checklist with AI-powered guidance. Used by travelers applying to dozens of countries worldwide.'
        )}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/questionnaire">
          <Button className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3 shadow-[0_20px_45px_rgba(62,166,255,0.45)]">
            <Sparkles size={18} />
            <span className="ml-2">{t('applications.startNewApplication', 'Start Your Application')}</span>
          </Button>
        </Link>
        <Link href="/chat">
          <Button
            variant="secondary"
            className="rounded-2xl border border-white/10 !bg-transparent text-white shadow-[0_15px_35px_rgba(7,12,30,0.7)]"
          >
            <MessageCircle size={18} />
            <span className="ml-2">{t('applications.heroAiCta', 'Chat with AI')}</span>
          </Button>
        </Link>
      </div>
      <div className="mt-6 space-y-2">
        <p className="text-xs text-white/40">
          {t('applications.emptyStateConfidence', 'Your data is secure and synced with our mobile app')}
        </p>
        <p className="text-xs text-white/40">
          {t('applications.emptyStateExperience', 'Typical checklist preparation takes 3–5 minutes')}
        </p>
      </div>
    </Card>
  );
};

function formatRelativeTime(timestamp: string) {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = now.getTime() - then.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes || 1}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatTimeAgo(timestamp: string, t: any) {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = now.getTime() - then.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('time.justNow', 'just now');
  if (minutes < 60) return `${minutes}m ${t('time.ago', 'ago')}`;
  if (hours < 24) return `${hours}h ${t('time.ago', 'ago')}`;
  if (days === 1) return t('time.yesterday', 'yesterday');
  if (days < 7) return `${days}d ${t('time.ago', 'ago')}`;
  return then.toLocaleDateString();
}
