'use client';

import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

const baseFieldStyles =
  'w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-primary-900 shadow-inner shadow-white/40 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-60';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, FieldProps>(function InputField(
  { label, error, hint, className, ...props },
  ref,
) {
  return (
    <label className="block space-y-2">
      {label && <span className="text-sm font-medium text-primary-900">{label}</span>}
      <input ref={ref} className={cn(baseFieldStyles, className)} {...props} />
      {hint && !error && <span className="text-xs text-neutral-500">{hint}</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  );
});

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextAreaField(
  { label, error, hint, className, ...props },
  ref,
) {
  return (
    <label className="block space-y-2">
      {label && <span className="text-sm font-medium text-primary-900">{label}</span>}
      <textarea
        ref={ref}
        className={cn(baseFieldStyles, 'min-h-[120px] resize-none', className)}
        {...props}
      />
      {hint && !error && <span className="text-xs text-neutral-500">{hint}</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  );
});

