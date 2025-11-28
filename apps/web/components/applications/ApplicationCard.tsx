'use client';

import Link from 'next/link';
import { ArrowUpRight, Upload } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import type { Application } from '@/lib/hooks/useApplications';

interface ApplicationCardProps {
  application: Application;
  statusStyles: Record<string, { label: string; classes: string; chip: string }>;
  getStatusVariant: (status?: string) => { label: string; classes: string; chip: string };
  t: (key: string, defaultValue?: string) => string;
}

export function ApplicationCard({
  application,
  statusStyles,
  getStatusVariant,
  t,
}: ApplicationCardProps) {
  const statusVariant = getStatusVariant(application.status);
  const countryCode = application.country?.code?.toLowerCase() || 'xx';
  const flagEmoji = getFlagEmoji(countryCode);

  return (
    <Card className="group relative overflow-hidden border-white/5 bg-white/[0.04] p-6 transition-all hover:-translate-y-1 hover:border-white/10 hover:shadow-[0_30px_60px_rgba(7,12,30,0.6)]">
      {/* Country Flag & Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-2xl">
            {flagEmoji}
          </div>
          <div>
            <p className="text-sm font-medium text-white/60">
              {application.country?.name || t('applications.unknownCountry', 'Unknown country')}
            </p>
            <p className="mt-0.5 font-semibold text-white">{application.visaType?.name}</p>
          </div>
        </div>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold',
            statusVariant.chip
          )}
        >
          {statusVariant.label}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>{t('applications.progress', 'Progress')}</span>
          <span className="font-semibold text-white">{application.progressPercentage ?? 0}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-dark transition-[width]"
            style={{ width: `${application.progressPercentage || 0}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 border-t border-white/5 pt-4">
        <Link
          href={`/applications/${application.id}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <span>{t('applications.viewDetails', 'View details')}</span>
          <ArrowUpRight size={16} />
        </Link>
        <Link
          href={`/applications/${application.id}/documents`}
          className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
        >
          <Upload size={16} />
          <span className="hidden sm:inline">{t('applications.uploadDocuments', 'Upload')}</span>
        </Link>
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

