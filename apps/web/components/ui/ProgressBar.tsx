import { motion } from 'framer-motion';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  showValue?: boolean;
  tone?: 'primary' | 'accent';
}

export function ProgressBar({
  value,
  showValue = true,
  tone = 'primary',
  className,
  ...props
}: ProgressBarProps) {
  const safeValue = Math.min(100, Math.max(0, value));
  const toneClass =
    tone === 'primary' ? 'from-primary-600 to-primary-400' : 'from-accent-600 to-accent-400';

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {showValue && (
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>Progress</span>
          <span className="font-semibold text-primary-900">{safeValue}%</span>
        </div>
      )}
      <div className="h-2 rounded-full bg-neutral-200/80">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${safeValue}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={cn('h-full rounded-full bg-gradient-to-r', toneClass)}
        />
      </div>
    </div>
  );
}
