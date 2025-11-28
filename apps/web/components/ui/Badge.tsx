import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

type BadgeVariant = 'solid' | 'soft' | 'outline';

const baseClasses =
  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold';

const variantClasses: Record<BadgeVariant, string> = {
  solid: 'bg-primary text-white shadow-lg',
  soft: 'bg-primary/10 text-primary border border-primary/30',
  outline: 'border border-white/30 text-white/90 bg-transparent',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'soft', ...props }: BadgeProps) {
  return <span className={cn(baseClasses, variantClasses[variant], className)} {...props} />;
}
