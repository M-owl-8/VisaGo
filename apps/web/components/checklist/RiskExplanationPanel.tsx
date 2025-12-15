'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { AlertCircle, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '@/lib/api/config';

interface RiskExplanation {
  riskLevel: 'low' | 'medium' | 'high';
  summaryEn: string;
  summaryUz: string;
  summaryRu: string;
  recommendations: Array<{
    id: string;
    titleEn: string;
    titleUz: string;
    titleRu: string;
    detailsEn: string;
    detailsUz: string;
    detailsRu: string;
  }>;
}

interface RiskExplanationPanelProps {
  applicationId: string;
  language?: string;
  className?: string;
}

export function RiskExplanationPanel({
  applicationId,
  language = 'en',
  className,
}: RiskExplanationPanelProps) {
  const { t } = useTranslation();
  const [explanation, setExplanation] = useState<RiskExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (!applicationId) return;

    const fetchRiskExplanation = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/api/applications/${applicationId}/risk-explanation`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load risk explanation');
        }

        const data = await response.json();
        if (data.success && data.data) {
          setExplanation(data.data);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('[RiskExplanation] Error fetching explanation:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRiskExplanation();
  }, [applicationId]);

  if (isLoading) {
    return (
      <Card className={`glass-panel border border-white/10 bg-white/[0.03] p-6 ${className || ''}`}>
        <h2 className="mb-4 text-xl font-semibold text-white">
          {t('applications.visaRisk', 'Visa Risk')}
        </h2>
        <Skeleton className="mb-4 h-6 w-32" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-2 h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </Card>
    );
  }

  if (error || !explanation) {
    return (
      <Card className={`glass-panel border border-white/10 bg-white/[0.03] p-6 ${className || ''}`}>
        <h2 className="mb-4 text-xl font-semibold text-white">
          {t('applications.visaRisk', 'Visa Risk')}
        </h2>
        <div className="flex items-center gap-2 text-sm text-white/60">
          <AlertCircle size={16} />
          <span>{t('applications.unableToLoadRiskAnalysis', 'Unable to load risk analysis')}</span>
        </div>
      </Card>
    );
  }

  // Get localized text
  const summary =
    language === 'uz'
      ? explanation.summaryUz
      : language === 'ru'
      ? explanation.summaryRu
      : explanation.summaryEn;

  const riskLevel = explanation.riskLevel;
  const recommendations = explanation.recommendations || [];

  // Calculate profile strength (0-10 scale)
  const profileStrength = riskLevel === 'low' ? 8 : riskLevel === 'medium' ? 6 : 4;
  const strengthPercentage = (profileStrength / 10) * 100;

  // Risk level badge styling
  const getRiskBadge = () => {
    switch (riskLevel) {
      case 'low':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            <TrendingUp size={14} className="mr-1" />
            {t('applications.riskLow', 'Low Risk')}
          </Badge>
        );
      case 'high':
        return (
          <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30">
            <TrendingDown size={14} className="mr-1" />
            {t('applications.riskHigh', 'High Risk')}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
            <Minus size={14} className="mr-1" />
            {t('applications.riskMedium', 'Medium Risk')}
          </Badge>
        );
    }
  };

  return (
    <Card className={`glass-panel border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-6 ${className || ''}`}>
      {/* Header with expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-4 flex w-full items-center justify-between text-left transition hover:opacity-80"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Shield size={20} className="text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-white">
            {t('applications.profileStrength', 'Profile Strength')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {getRiskBadge()}
          {isExpanded ? <ChevronUp size={20} className="text-white/60" /> : <ChevronDown size={20} className="text-white/60" />}
        </div>
      </button>

      {/* Profile Strength Meter */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-white/70">{t('applications.yourProfileStrength', 'Your profile strength')}</span>
          <span className="text-2xl font-bold text-white">{profileStrength}/10</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              riskLevel === 'low'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                : riskLevel === 'medium'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                : 'bg-gradient-to-r from-rose-500 to-rose-400'
            }`}
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-white/60">
          {t('applications.profileStrengthInfo', 'Higher strength = better AI recommendations and approval chances')}
        </p>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm leading-relaxed text-white/80">{summary}</p>
          </div>

          {/* Actionable Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <TrendingUp size={16} className="text-primary" />
                {t('applications.howToImprove', 'How to improve your profile')}
              </h3>
              <ul className="space-y-3">
                {recommendations.map((rec) => {
                  const title =
                    language === 'uz'
                      ? rec.titleUz
                      : language === 'ru'
                      ? rec.titleRu
                      : rec.titleEn;
                  const details =
                    language === 'uz'
                      ? rec.detailsUz
                      : language === 'ru'
                      ? rec.detailsRu
                      : rec.detailsEn;

                  return (
                    <li key={rec.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
                          <span className="text-xs font-bold text-primary">!</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-white/60">{details}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

