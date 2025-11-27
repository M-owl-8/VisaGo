import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-2xl bg-gradient-to-r from-neutral-200/60 via-neutral-100 to-neutral-200/60 bg-[length:400%_100%]',
        className
      )}
      {...props}
    />
  );
}
