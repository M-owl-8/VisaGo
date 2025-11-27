'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  FileUp,
  MessageCircle,
  Plus,
  RefreshCcw,
  Sparkles,
} from 'lucide-react';
import ErrorBanner from '@/components/ErrorBanner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/lib/stores/auth';
import { getErrorMessage } from '@/lib/utils/errorMessages';

export default function ApplicationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    user,
    userApplications,
    fetchUserApplications,
    isSignedIn,
    isLoading,
  } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  const loadApplications = useCallback(async () => {
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
  }, [fetchUserApplications, t]);

  useEffect(() => {
    if (!isSignedIn && !isLoading) {
      router.push('/login');
      return;
    }
    if (isSignedIn) {
      loadApplications();
    }
  }, [isSignedIn, isLoading, router, loadApplications]);

  const totalApplications = userApplications.length;

  const overallProgress = useMemo(() => {
    if (!totalApplications) return 0;
    const total = userApplications.reduce(
      (sum, app) => sum + (app.progressPercentage || 0),
      0,
    );
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

  const statusStyles: Record<
    string,
    { label: string; classes: string; chip: string }
  > = {
    draft: {
      label: t('applications.statusDraft', 'Draft'),
      classes: 'bg-neutral-100 text-neutral-700',
      chip: 'bg-white text-neutral-600 border border-neutral-200',
    },
    submitted: {
      label: t('applications.statusSubmitted', 'Submitted'),
      classes: 'bg-blue-50 text-blue-700',
      chip: 'bg-blue-50 text-blue-700 border border-blue-100',
    },
    approved: {
      label: t('applications.statusApproved', 'Approved'),
      classes: 'bg-emerald-50 text-emerald-700',
      chip: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    },
    rejected: {
      label: t('applications.statusRejected', 'Rejected'),
      classes: 'bg-rose-50 text-rose-700',
      chip: 'bg-rose-50 text-rose-700 border border-rose-100',
    },
    in_progress: {
      label: t('applications.statusInProgress', 'In progress'),
      classes: 'bg-amber-50 text-amber-700',
      chip: 'bg-amber-50 text-amber-700 border border-amber-100',
    },
  };

  const getStatusVariant = (status?: string) => {
    if (!status) return statusStyles.draft;
    const normalized = status.toLowerCase().replace(/\s+/g, '_');
    return statusStyles[normalized] ?? statusStyles.in_progress;
  };

  const renderSkeleton = () => (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="glass-panel h-48 animate-pulse bg-white/50" />
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, idx) => (
          <div key={`metric-${idx}`} className="glass-panel h-32 animate-pulse bg-white/50" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="glass-panel h-72 animate-pulse bg-white/50" />
        <div className="glass-panel h-72 animate-pulse bg-white/50" />
      </div>
    </div>
  );

  if (!initialFetchDone && isRefreshing) {
    return <div className="px-2 py-10 sm:px-0">{renderSkeleton()}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-panel relative overflow-hidden px-8 py-10"
        >
          <div className="absolute right-[-5%] top-[-5%] h-48 w-48 rounded-full bg-primary-200/30 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-36 w-36 rounded-full bg-accent-200/30 blur-3xl" />
          <div className="relative space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">
              <Sparkles size={14} />
              {t('applications.heroBadge', 'Premium workspace')}
            </div>

            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-neutral-500">
                {t('applications.heroEyebrow', 'Dashboard')}
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold text-primary-900 sm:text-4xl">
                {t('applications.heroTitle', {
                  name: user?.firstName || t('applications.heroDefaultName', 'Traveler'),
                })}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-neutral-600">
                {t(
                  'applications.heroSubtitle',
                  'Keep every visa document, AI chat, and payment status perfectly synced with your mobile app.',
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/questionnaire">
                <Button className="rounded-2xl px-6 py-3 text-base shadow-card">
                  <Plus size={18} />
                  <span className="ml-2">{t('applications.startNewApplication')}</span>
                </Button>
              </Link>
              <Link href="/chat">
                <Button
                  variant="secondary"
                  className="rounded-2xl border border-primary-900/10 !bg-white px-6 py-3 text-base text-primary-900 shadow-card-soft"
                >
                  <MessageCircle size={18} />
                  <span className="ml-2">{t('applications.heroAiCta', 'Open AI assistant')}</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="rounded-2xl border border-transparent px-4 text-neutral-600 hover:border-neutral-200"
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
          className="glass-panel grid gap-4 px-6 py-6"
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
            className="glass-panel px-6 py-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl text-primary-900">
                  {t('applications.activeSectionTitle', 'Active journeys')}
                </h2>
                <p className="text-sm text-neutral-500">
                  {t('applications.activeSectionSubtitle', 'Continue where you left off')}
                </p>
              </div>
              <Link href="/questionnaire" className="text-sm text-primary-700 hover:underline">
                {t('applications.startNewApplication')}
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {userApplications.slice(0, 4).map((app) => {
                const statusVariant = getStatusVariant(app.status);
                return (
                  <Card
                    key={app.id}
                    className="group relative overflow-hidden border-white/70 bg-white/90 p-5 transition hover:-translate-y-1 hover:shadow-card"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-neutral-500">
                          {app.country?.name || t('applications.unknownCountry', 'Unknown country')}
                        </p>
                        <p className="font-medium text-primary-900">{app.visaType?.name}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusVariant.chip}`}>
                        {statusVariant.label}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-neutral-500">
                        <span>{t('applications.progress')}</span>
                        <span>{app.progressPercentage ?? 0}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full bg-primary-900 transition-[width]"
                          style={{ width: `${app.progressPercentage || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm text-primary-700">
                      <Link href={`/applications/${app.id}`} className="inline-flex items-center gap-2">
                        {t('applications.viewDetails', 'View details')}
                        <ArrowUpRight size={16} />
                      </Link>
                      <Link href={`/applications/${app.id}/documents`} className="text-neutral-500">
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
              className="glass-panel px-6 py-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg text-primary-900">
                  {t('applications.recentActivity', 'Recent activity')}
                </h2>
                <span className="text-xs uppercase tracking-[0.3em] text-neutral-400">
                  {t('applications.synced', 'Synced')}
                </span>
              </div>
              <div className="space-y-4">
                {recentActivities.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    {t('applications.noRecentActivity', 'We will surface highlights here as you progress.')}
                  </p>
                ) : (
                  recentActivities.map((activity) => {
                    const variant = getStatusVariant(activity.status);
                    return (
                      <div key={activity.id} className="rounded-2xl border border-white/60 bg-white/70 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-primary-900">{activity.description}</p>
                          <span className={`rounded-full px-2 py-1 text-xs ${variant.classes}`}>
                            {variant.label}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-neutral-500">
                          {formatRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-panel space-y-4 px-6 py-6"
            >
              <h2 className="font-display text-lg text-primary-900">
                {t('applications.quickActions', 'Quick actions')}
              </h2>
              <div className="space-y-3">
                <QuickAction
                  icon={<Plus size={18} />}
                  title={t('applications.startNewApplication')}
                  description={t('applications.quickStartDescription', 'Launch a new visa journey')}
                  onClick={() => router.push('/questionnaire')}
                />
                <QuickAction
                  icon={<MessageCircle size={18} />}
                  title={t('chat.aiAssistant')}
                  description={t('applications.quickAiDescription', 'Get instant answers powered by AI')}
                  onClick={() => router.push('/chat')}
                />
                <QuickAction
                  icon={<FileUp size={18} />}
                  title={t('applications.uploadDocuments')}
                  description={t('applications.quickDocsDescription', 'Upload proofs & supporting docs')}
                  onClick={() => {
                    if (userApplications[0]) {
                      router.push(`/applications/${userApplications[0].id}/documents`);
                    } else {
                      router.push('/applications');
                    }
                  }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}

const Metric = ({ label, value, helper }: { label: string; value: string | number; helper: string }) => (
  <div className="rounded-3xl border border-white/60 bg-white/90 p-4 shadow-card-soft">
    <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">{label}</p>
    <p className="mt-3 text-3xl font-semibold text-primary-900">{value}</p>
    <p className="text-sm text-neutral-500">{helper}</p>
  </div>
);

const QuickAction = ({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center justify-between rounded-2xl border border-white/50 bg-white/80 px-4 py-3 text-left shadow-card-soft transition hover:-translate-y-0.5 hover:shadow-card"
  >
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-900/10 text-primary-900">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-primary-900">{title}</p>
        <p className="text-xs text-neutral-500">{description}</p>
      </div>
    </div>
    <ArrowUpRight size={16} className="text-neutral-400" />
  </button>
);

const EmptyState = () => {
  const { t } = useTranslation();
  return (
    <Card className="glass-panel flex flex-col items-center justify-center border-dashed border-white/60 bg-white/50 px-8 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-900/10 text-primary-900">
        <Plus size={28} />
      </div>
      <h3 className="font-display text-2xl text-primary-900">{t('applications.noApplicationsYet')}</h3>
      <p className="mt-3 max-w-xl text-sm text-neutral-500">
        {t(
          'applications.emptySubtitle',
          'Start your first application to unlock personalized timelines, AI planning, and shared mobile progress.',
        )}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/questionnaire">
          <Button className="rounded-2xl px-6 py-3">{t('applications.startNewApplication')}</Button>
        </Link>
        <Link href="/chat">
          <Button
            variant="secondary"
            className="rounded-2xl border border-primary-900/10 !bg-white text-primary-900 shadow-card-soft"
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



