import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/5 bg-white/[0.04] shadow-[0_25px_55px_rgba(0,0,0,0.45)] backdrop-blur-xl',
        className
      )}
      {...props}
    />
  );
}
