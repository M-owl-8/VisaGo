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
      <div className="group flex items-center gap-3 rounded-full border border-white/10 bg-[#0b1727]/80 px-4 py-3 text-white/90 shadow-sm transition focus-within:border-[#4A9EFF] focus-within:shadow-[0_0_0_1px_rgba(74,158,255,0.7)]">
        <Icon size={18} className="text-white/60" />
        <input
          className={cn(
            'flex-1 bg-transparent border-none text-sm md:text-base text-white placeholder:text-white/40 outline-none focus:outline-none',
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
