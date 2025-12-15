'use client';

import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onClear?: () => void;
  showClearButton?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      success,
      helperText,
      leftIcon,
      rightIcon,
      onClear,
      showClearButton,
      ...props
    },
    ref
  ) => {
    const hasValue =
      props.value !== undefined && props.value !== null && props.value !== ''
        ? props.value
        : props.defaultValue;
    const hasValuePresent = hasValue !== undefined && hasValue !== null && hasValue !== '';

    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-white/80">
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            className={cn(
              'w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 transition',
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
              leftIcon ? 'pl-10' : undefined,
              rightIcon || success || error || (showClearButton && hasValuePresent) ? 'pr-10' : undefined,
              error && 'border-rose-500/50 bg-rose-500/5 focus:border-rose-500 focus:ring-rose-500/20',
              success && 'border-emerald-500/50 bg-emerald-500/5 focus:border-emerald-500 focus:ring-emerald-500/20',
              !error && !success && 'border-white/10',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
            {...props}
          />

          {/* Right icons/indicators */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {success && <CheckCircle size={18} className="text-emerald-400" />}
            {error && <XCircle size={18} className="text-rose-400" />}
            {rightIcon && !success && !error && (
              <div className="text-white/60">{rightIcon}</div>
            )}
            {showClearButton && hasValue && !success && !error && onClear && (
              <button
                type="button"
                onClick={onClear}
                className="rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Clear"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p id={`${props.id}-error`} className="mt-1.5 text-xs text-rose-400">
            {error}
          </p>
        )}

        {/* Helper text */}
        {helperText && !error && (
          <p id={`${props.id}-helper`} className="mt-1.5 text-xs text-white/50">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
