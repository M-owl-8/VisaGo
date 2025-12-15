'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { TrendingUp, Clock, CheckCircle, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

interface InsightData {
  averageUploadTime: number; // days
  approvalRate: number; // percentage
  averageProcessingTime: number; // days
  totalUsers: number;
}

interface UserInsightsProps {
  countryCode?: string;
  visaType?: string;
  className?: string;
}

export function UserInsights({ countryCode, visaType, className }: UserInsightsProps) {
  const { t } = useTranslation();
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching insights data
    // In production, this would call: GET /api/analytics/insights?country=XX&visaType=YY
    const fetchInsights = async () => {
      setIsLoading(true);
      
      // Mock data for demonstration
      setTimeout(() => {
        setInsights({
          averageUploadTime: 7,
          approvalRate: countryCode === 'GB' ? 92 : countryCode === 'US' ? 88 : 85,
          averageProcessingTime: 14,
          totalUsers: 1247,
        });
        setIsLoading(false);
      }, 500);
    };

    fetchInsights();
  }, [countryCode, visaType]);

  if (isLoading) {
    return (
      <Card className={`glass-panel border border-white/10 bg-white/[0.03] p-6 ${className || ''}`}>
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }

  if (!insights) return null;

  return (
    <Card className={`glass-panel border border-white/10 bg-white/[0.03] p-6 ${className || ''}`}>
      <h3 className="mb-6 text-lg font-semibold text-white">
        {t('analytics.insights', 'Insights & Benchmarks')}
      </h3>

      <div className="space-y-4">
        {/* Average Upload Time */}
        <div className="flex items-start gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
            <Clock size={20} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {t('analytics.averageUploadTime', 'Average upload time')}
            </p>
            <p className="mt-1 text-xs text-white/60">
              {t('analytics.uploadTimeDesc', 'Most users complete document uploads within')} <span className="font-semibold text-blue-400">{insights.averageUploadTime} {t('analytics.days', 'days')}</span>
            </p>
          </div>
        </div>

        {/* Approval Rate */}
        <div className="flex items-start gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
            <CheckCircle size={20} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {t('analytics.approvalRate', 'Approval rate')}
            </p>
            <p className="mt-1 text-xs text-white/60">
              {t('analytics.approvalRateDesc', 'Users with employment letters have')} <span className="font-semibold text-emerald-400">{insights.approvalRate}%</span> {t('analytics.approvalRate', 'approval rate')}
            </p>
          </div>
        </div>

        {/* Processing Time */}
        <div className="flex items-start gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
            <TrendingUp size={20} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {t('analytics.processingTime', 'Processing time')}
            </p>
            <p className="mt-1 text-xs text-white/60">
              {t('analytics.processingTimeDesc', 'Average embassy processing time:')} <span className="font-semibold text-amber-400">{insights.averageProcessingTime} {t('analytics.days', 'days')}</span>
            </p>
          </div>
        </div>

        {/* Community Size */}
        <div className="flex items-start gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
            <Users size={20} className="text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {t('analytics.community', 'Community')}
            </p>
            <p className="mt-1 text-xs text-white/60">
              <span className="font-semibold text-purple-400">{insights.totalUsers.toLocaleString()}</span> {t('analytics.usersApplied', 'users have applied for this visa')}
            </p>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
        <p className="text-xs text-white/60">
          💡 {t('analytics.dataNote', 'Data is anonymized and aggregated from our user community')}
        </p>
      </div>
    </Card>
  );
}

