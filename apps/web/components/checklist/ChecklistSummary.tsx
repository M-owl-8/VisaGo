'use client';

import { CheckCircle2, FileText, Upload, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useTranslation } from 'react-i18next';

export interface ChecklistItem {
  document?: string;
  documentType?: string;
  name: string;
  category: 'required' | 'highly_recommended' | 'optional';
  required: boolean;
  status?: 'missing' | 'pending' | 'verified' | 'rejected';
  aiVerified?: boolean;
  aiConfidence?: number;
  verificationNotes?: string;
}

interface ChecklistSummaryProps {
  items: ChecklistItem[];
  className?: string;
}

export function ChecklistSummary({ items, className }: ChecklistSummaryProps) {
  const { t } = useTranslation();

  // Calculate stats
  const requiredItems = items.filter((item) => item.category === 'required');
  const totalRequired = requiredItems.length;
  // Uploaded = items with status !== 'missing'
  const uploadedCount = items.filter((item) => item.status !== 'missing').length;
  // Verified = items with status === 'verified'
  const verifiedCount = items.filter((item) => item.status === 'verified').length;
  const completionPercentage =
    totalRequired > 0 ? Math.round((verifiedCount / totalRequired) * 100) : 0;

  const stats = [
    {
      label: t('checklist.summary.totalRequired', 'Total Required'),
      value: totalRequired,
      icon: FileText,
      color: 'text-white',
    },
    {
      label: t('checklist.summary.uploaded', 'Uploaded'),
      value: uploadedCount,
      icon: Upload,
      color: 'text-blue-300',
    },
    {
      label: t('checklist.summary.verified', 'Verified'),
      value: verifiedCount,
      icon: CheckCircle2,
      color: 'text-emerald-300',
    },
  ];

  return (
    <Card className={`glass-panel border border-white/10 bg-white/[0.03] p-6 ${className || ''}`}>
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp size={20} className="text-primary" />
        <h3 className="text-lg font-semibold text-white">
          {t('checklist.summary.title', 'Checklist Summary')}
        </h3>
      </div>

      <div className="space-y-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon size={18} className={stat.color} />
                <span className="text-sm text-white/60">{stat.label}</span>
              </div>
              <span className={`text-lg font-semibold ${stat.color}`}>{stat.value}</span>
            </div>
          );
        })}

        <div className="border-t border-white/10 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-white/60">
              {t('checklist.summary.completion', 'Completion')}
            </span>
            <span className="text-lg font-semibold text-white">{completionPercentage}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/25 border-2 border-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-[width] shadow-[0_0_6px_rgba(16,185,129,0.5)]"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

