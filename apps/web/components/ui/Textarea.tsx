'use client';

import { forwardRef, TextareaHTMLAttributes, useState } from 'react';
import { XCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  showCharacterCount?: boolean;
  characterLimit?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      success,
      helperText,
      showCharacterCount,
      characterLimit,
      ...props
    },
    ref
  ) => {
    const [charCount, setCharCount] = useState(
      (props.value?.toString() || props.defaultValue?.toString() || '').length
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      if (props.onChange) {
        props.onChange(e);
      }
    };

    const isOverLimit = characterLimit && charCount > characterLimit;

    return (
      <div className="w-full">
        {label && (
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-white/80">{label}</label>
            {showCharacterCount && (
              <span
                className={cn(
                  'text-xs',
                  isOverLimit ? 'text-rose-400' : 'text-white/50'
                )}
              >
                {charCount}
                {characterLimit && ` / ${characterLimit}`}
              </span>
            )}
          </div>
        )}

        <div className="relative">
          <textarea
            ref={ref}
            className={cn(
              'w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 transition resize-none',
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-rose-500/50 bg-rose-500/5 focus:border-rose-500 focus:ring-rose-500/20',
              success && 'border-emerald-500/50 bg-emerald-500/5 focus:border-emerald-500 focus:ring-emerald-500/20',
              !error && !success && 'border-white/10',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            onChange={handleChange}
            {...props}
          />

          {/* Status icon */}
          {(success || error) && (
            <div className="absolute right-3 top-3">
              {success && <CheckCircle size={18} className="text-emerald-400" />}
              {error && <XCircle size={18} className="text-rose-400" />}
            </div>
          )}
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

Textarea.displayName = 'Textarea';

