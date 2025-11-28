'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowUpRight, MessageCircle, Plus, RefreshCcw, Sparkles } from 'lucide-react';
import ErrorBanner from '@/components/ErrorBanner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/lib/stores/auth';
import { getErrorMessage } from '@/lib/utils/errorMessages';

export default function ApplicationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, userApplications, fetchUserApplications, isSignedIn, isLoading } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const hasFetchedRef = useRef(false);

  const loadApplications = useCallback(async () => {
    if (isRefreshing) return; // Prevent concurrent calls
    try {
      setIsRefreshing(true);
      setError(null);
      await fetchUserApplications();
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setIsRefreshing(false);
      setInitialFetchDone(true);
    }
  }, [fetchUserApplications, t, isRefreshing]);

  // Initial fetch - only ONCE when component mounts and user is signed in
  useEffect(() => {
    if (!isSignedIn) {
      if (!isLoading) {
        router.push('/login');
      }
      return;
    }
    
    // Only fetch once - use ref to prevent re-fetching
    if (!hasFetchedRef.current && !isRefreshing) {
      hasFetchedRef.current = true;
      loadApplications();
    }
    // Intentionally minimal dependencies - only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  const totalApplications = userApplications.length;

  const overallProgress = useMemo(() => {
    if (!totalApplications) return 0;
    const total = userApplications.reduce((sum, app) => sum + (app.progressPercentage || 0), 0);
    return Math.round(total / totalApplications);
  }, [totalApplications, userApplications]);

  const documentsReady = useMemo(() => {
    if (!totalApplications) return { uploaded: 0, required: 0 };
    const requiredPerApplication = 8;
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
        description: `${app.country?.name ?? 'Unknown'} — ${
          app.visaType?.name ?? t('applications.title')
        }`,
        timestamp: app.submissionDate ?? app.updatedAt ?? new Date().toISOString(),
        status: app.status,
      }))
      .slice(0, 4);
  }, [userApplications, t]);

  const statusStyles: Record<string, { label: string; classes: string; chip: string }> = {
    draft: {
      label: t('applications.statusDraft', 'Draft'),
      classes: 'bg-white/10 text-white',
      chip: 'bg-white/5 text-white border border-white/10',
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

  const renderSkeleton = () => (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="glass-panel h-48 animate-pulse bg-white/5" />
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, idx) => (
          <div key={`metric-${idx}`} className="glass-panel h-32 animate-pulse bg-white/5" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="glass-panel h-72 animate-pulse bg-white/5" />
        <div className="glass-panel h-72 animate-pulse bg-white/5" />
      </div>
    </div>
  );

  if (!initialFetchDone && isRefreshing) {
    return <div className="px-2 py-10 sm:px-0">{renderSkeleton()}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 text-white">
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-panel relative overflow-hidden border border-white/10 bg-gradient-to-br from-[#0C1525] to-[#060a18] px-8 py-10 text-white"
        >
          <div className="absolute right-[-10%] top-[-20%] h-60 w-60 rounded-full bg-primary/20 blur-[140px]" />
          <div className="absolute left-[-15%] bottom-[-20%] h-72 w-72 rounded-full bg-[#1D4ED8]/15 blur-[160px]" />
          <div className="relative space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
              <Sparkles size={14} className="text-primary" />
              {t('applications.heroBadge', 'Premium workspace')}
            </div>

            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-white/50">
                {t('applications.heroEyebrow', 'Dashboard')}
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
                {t('applications.heroTitle', {
                  name: user?.firstName || t('applications.heroDefaultName', 'Traveler'),
                })}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-white/70">
                {t(
                  'applications.heroSubtitle',
                  'Keep every visa document, AI chat, and payment status perfectly synced with your mobile app.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/questionnaire">
                <Button className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-base shadow-[0_20px_45px_rgba(62,166,255,0.45)]">
                  <Plus size={18} />
                  <span className="ml-2">{t('applications.startNewApplication')}</span>
                </Button>
              </Link>
              <Link href="/chat">
                <Button
                  variant="secondary"
                  className="rounded-2xl border border-white/10 !bg-transparent px-6 py-3 text-base text-white shadow-[0_15px_35px_rgba(7,12,30,0.7)]"
                >
                  <MessageCircle size={18} />
                  <span className="ml-2">{t('applications.heroAiCta', 'Open AI assistant')}</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="rounded-2xl border border-white/10 px-4 text-white/70 hover:bg-white/5"
                onClick={loadApplications}
              >
                <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                <span className="ml-2">{t('applications.refresh', 'Refresh')}</span>
              </Button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="glass-panel grid gap-4 border border-white/10 bg-white/[0.04] px-6 py-6 text-white"
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

      {totalApplications === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-panel border border-white/10 bg-white/[0.03] px-6 py-6 text-white"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl text-white">
                  {t('applications.activeSectionTitle', 'Active journeys')}
                </h2>
                <p className="text-sm text-white/60">
                  {t('applications.activeSectionSubtitle', 'Continue where you left off')}
                </p>
              </div>
              <Link href="/questionnaire" className="text-sm text-primary hover:underline">
                {t('applications.startNewApplication')}
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {userApplications.slice(0, 4).map((app) => {
                const statusVariant = getStatusVariant(app.status);
                return (
                  <Card
                    key={app.id}
                    className="group relative overflow-hidden border-white/5 bg-white/[0.04] p-5 transition hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(7,12,30,0.6)]"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-white/60">
                          {app.country?.name || t('applications.unknownCountry', 'Unknown country')}
                        </p>
                        <p className="font-medium text-white">{app.visaType?.name}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusVariant.chip}`}
                      >
                        {statusVariant.label}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span>{t('applications.progress')}</span>
                        <span>{app.progressPercentage ?? 0}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-dark transition-[width]"
                          style={{ width: `${app.progressPercentage || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm text-primary">
                      <Link
                        href={`/applications/${app.id}`}
                        className="inline-flex items-center gap-2 text-white"
                      >
                        {t('applications.viewDetails', 'View details')}
                        <ArrowUpRight size={16} />
                      </Link>
                      <Link href={`/applications/${app.id}/documents`} className="text-white/50">
                        {t('applications.uploadDocuments')}
                      </Link>
                    </div>
                  </Card>
                );
              })}
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
    <Card className="glass-panel flex flex-col items-center justify-center border-dashed border-white/10 bg-white/[0.03] px-8 py-16 text-center text-white">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white">
        <Plus size={28} />
      </div>
      <h3 className="font-display text-2xl">{t('applications.noApplicationsYet')}</h3>
      <p className="mt-3 max-w-xl text-sm text-white/60">
        {t(
          'applications.emptySubtitle',
          'Start your first application to unlock personalized timelines, AI planning, and shared mobile progress.'
        )}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/questionnaire">
          <Button className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3 shadow-[0_20px_45px_rgba(62,166,255,0.45)]">
            {t('applications.startNewApplication')}
          </Button>
        </Link>
        <Link href="/chat">
          <Button
            variant="secondary"
            className="rounded-2xl border border-white/10 !bg-transparent text-white shadow-[0_15px_35px_rgba(7,12,30,0.7)]"
          >
            {t('applications.heroAiCta', 'Open AI assistant')}
          </Button>
        </Link>
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
