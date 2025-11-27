import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

type BadgeVariant = 'solid' | 'soft' | 'outline';

const baseClasses =
  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide';

const variantClasses: Record<BadgeVariant, string> = {
  solid: 'bg-primary-900 text-white shadow-card-soft',
  soft: 'bg-primary-900/5 text-primary-900 border border-primary-900/10',
  outline: 'border border-primary-900/30 text-primary-900 bg-transparent',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'soft', ...props }: BadgeProps) {
  return <span className={cn(baseClasses, variantClasses[variant], className)} {...props} />;
}
