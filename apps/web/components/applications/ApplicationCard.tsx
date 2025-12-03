'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Trash2 } from 'lucide-react';
import type { TFunction } from 'i18next';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import type { Application } from '@/lib/hooks/useApplications';
import { apiClient } from '@/lib/api/client';

interface ApplicationCardProps {
  application: Application;
  statusStyles: Record<string, { label: string; classes: string; chip: string }>;
  getStatusVariant: (status?: string) => { label: string; classes: string; chip: string };
  t: TFunction<'translation', undefined>;
  onDelete?: () => void;
}

export function ApplicationCard({
  application,
  statusStyles,
  getStatusVariant,
  t,
  onDelete,
}: ApplicationCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const statusVariant = getStatusVariant(application.status);
  const countryCode = application.country?.code?.toLowerCase() || 'xx';
  const flagEmoji = getFlagEmoji(countryCode);
  const isDraft = application.status?.toLowerCase() === 'draft';

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(t('applications.deleteConfirm', 'Are you sure you want to delete this application? This action cannot be undone.'))) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await apiClient.deleteApplication(application.id);
      if (response.success) {
        onDelete?.();
      } else {
        alert(t('applications.deleteError', 'Failed to delete application. Please try again.'));
      }
    } catch (error) {
      console.error('Delete application error:', error);
      alert(t('applications.deleteError', 'Failed to delete application. Please try again.'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="group relative overflow-hidden border-white/5 bg-white/[0.04] p-4 transition-all hover:-translate-y-1 hover:border-white/10 hover:shadow-[0_30px_60px_rgba(7,12,30,0.6)] sm:p-6">
      {/* Country Flag & Header */}
      <div className="mb-3 flex items-start justify-between gap-2 sm:mb-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xl sm:h-12 sm:w-12 sm:text-2xl">
            {flagEmoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white/60 sm:text-sm">
              {application.country?.name || t('applications.unknownCountry', 'Unknown country')}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-white sm:text-base">
              {application.visaType?.name}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:px-3 sm:py-1 sm:text-xs',
            statusVariant.chip
          )}
        >
          {statusVariant.label}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-3 space-y-1.5 sm:mb-4 sm:space-y-2">
        <div className="flex items-center justify-between text-[10px] text-white/60 sm:text-xs">
          <span>{t('applications.progress', 'Progress')}</span>
          <span className="font-semibold text-white">{application.progressPercentage ?? 0}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/25 border-2 border-white/20 sm:h-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-dark transition-[width] shadow-[0_0_6px_rgba(62,166,255,0.4)]"
            style={{ width: `${application.progressPercentage || 0}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 border-t border-white/5 pt-3 sm:flex-row sm:items-center sm:gap-3 sm:pt-4">
        <Link
          href={`/applications/${application.id}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10 sm:px-4 sm:text-sm"
        >
          <span>{t('applications.viewDetails', 'View details')}</span>
          <ArrowUpRight size={14} className="sm:size-4" />
        </Link>
        {isDraft && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400 transition hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed sm:px-4 sm:text-sm"
            title={t('applications.removeApplication', 'Remove application')}
          >
            <Trash2 size={14} className="sm:size-4" />
            <span className="hidden sm:inline">{t('applications.remove', 'Remove')}</span>
          </button>
        )}
      </div>
    </Card>
  );
}

// Helper to get flag emoji from country code
function getFlagEmoji(countryCode: string): string {
  // Simple mapping for common countries - can be expanded
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

