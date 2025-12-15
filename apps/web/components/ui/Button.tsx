'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonState = 'idle' | 'loading' | 'success' | 'error';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  state?: ButtonState;
}

const baseStyles =
  'inline-flex items-center justify-center rounded-2xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white shadow-lg shadow-primary-500/30 hover:bg-primary-500 hover:shadow-xl hover:shadow-primary-500/40 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  secondary:
    'bg-white text-primary-700 shadow-inner shadow-primary-600/10 border border-primary-100 hover:border-primary-200 hover:bg-gray-50 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/30',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 border border-transparent active:scale-[0.98]',
  danger: 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 hover:bg-rose-600 hover:shadow-xl hover:shadow-rose-500/40 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-rose/50',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading,
  state = 'idle',
  ...props
}: ButtonProps) {
  const actualState = loading ? 'loading' : state;

  return (
    <button
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        actualState === 'success' && 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30',
        actualState === 'error' && 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30 animate-shake',
        className
      )}
      data-variant={variant}
      data-state={actualState}
      disabled={props.disabled || actualState === 'loading'}
      {...props}
    >
      {leftIcon && actualState === 'idle' && <span className="mr-2 flex-shrink-0">{leftIcon}</span>}
      
      <span className="flex items-center gap-2">
        {actualState === 'loading' && <Loader2 size={16} className="animate-spin" />}
        {actualState === 'success' && <CheckCircle size={16} />}
        {actualState === 'error' && <XCircle size={16} />}
        {children}
      </span>
      
      {rightIcon && actualState === 'idle' && <span className="ml-2 flex-shrink-0">{rightIcon}</span>}
    </button>
  );
}
