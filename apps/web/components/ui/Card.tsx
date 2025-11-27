import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-3xl bg-white shadow-[0_20px_45px_rgba(15,23,42,0.08)] border border-white/60',
        className,
      )}
      {...props}
    />
  );
}



