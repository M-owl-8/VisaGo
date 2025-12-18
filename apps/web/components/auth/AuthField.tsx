'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon: LucideIcon;
  trailing?: ReactNode;
  hint?: string;
  error?: string;
}

export function AuthField({
  label,
  icon: Icon,
  trailing,
  hint,
  error,
  className,
  ...props
}: AuthFieldProps) {
  return (
    <label className="block space-y-2">
      {label && <span className="text-sm font-semibold text-white/90">{label}</span>}
      <div
        className={cn(
          'group flex items-center gap-3 rounded-full border bg-[#0b1727]/80 px-4 py-3 text-white/90 shadow-sm transition focus-within:shadow-[0_0_0_1px_rgba(74,158,255,0.7)]',
          error
            ? 'border-rose-500/50 focus-within:border-rose-500'
            : 'border-white/10 focus-within:border-[#4A9EFF]'
        )}
      >
        <Icon size={18} className={error ? 'text-rose-400' : 'text-white/60'} />
        <input
          className={cn(
            'flex-1 bg-transparent border-none text-sm md:text-base text-white placeholder:text-white/40 outline-none focus:outline-none',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${props.id}-error` : hint ? `${props.id}-hint` : undefined}
          {...props}
        />
        {trailing}
      </div>
      {error && (
        <span id={`${props.id}-error`} className="text-xs text-rose-400" role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={`${props.id}-hint`} className="text-xs text-white/50">
          {hint}
        </span>
      )}
    </label>
  );
}
