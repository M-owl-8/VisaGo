'use client';

import { cn } from '@/lib/utils/cn';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  draft: {
    label: 'Draft',
    classes: 'bg-white/20 text-white border-2 border-white/40 shadow-sm',
  },
  submitted: {
    label: 'Submitted',
    classes: 'bg-primary/10 text-primary border border-primary/30',
  },
  approved: {
    label: 'Approved',
    classes: 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/30',
  },
  rejected: {
    label: 'Rejected',
    classes: 'bg-rose-500/10 text-rose-300 border border-rose-400/30',
  },
  under_review: {
    label: 'Under Review',
    classes: 'bg-amber-500/10 text-amber-200 border border-amber-300/30',
  },
  in_progress: {
    label: 'In Progress',
    classes: 'bg-amber-500/10 text-amber-200 border border-amber-300/30',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  const config = statusConfig[normalized] || statusConfig.draft;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  );
}

