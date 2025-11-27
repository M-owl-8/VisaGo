'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon: LucideIcon;
  trailing?: ReactNode;
  hint?: string;
}

export function AuthField({
  label,
  icon: Icon,
  trailing,
  hint,
  className,
  ...props
}: AuthFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-white/90">{label}</span>
      <div className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white/90 shadow-inner shadow-black/20 transition focus-within:border-[#4A9EFF] focus-within:bg-white/10">
        <Icon size={18} className="text-white/60" />
        <input
          className={cn(
            'flex-1 bg-transparent text-base text-white placeholder:text-white/40 focus:outline-none',
            className
          )}
          {...props}
        />
        {trailing}
      </div>
      {hint && <span className="text-xs text-white/50">{hint}</span>}
    </label>
  );
}
