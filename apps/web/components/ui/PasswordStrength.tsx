'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

interface StrengthInfo {
  level: StrengthLevel;
  label: string;
  color: string;
  bars: number;
}

function calculateStrength(password: string): StrengthInfo {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) {
    return { level: 'weak', label: 'Weak', color: 'bg-rose-500', bars: 1 };
  } else if (score <= 3) {
    return { level: 'fair', label: 'Fair', color: 'bg-orange-500', bars: 2 };
  } else if (score <= 4) {
    return { level: 'good', label: 'Good', color: 'bg-yellow-500', bars: 3 };
  } else {
    return { level: 'strong', label: 'Strong', color: 'bg-emerald-500', bars: 4 };
  }
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const strength = useMemo(() => calculateStrength(password), [password]);

  if (!password) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((bar) => (
            <div
              key={bar}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                bar <= strength.bars ? strength.color : 'bg-white/10'
              )}
            />
          ))}
        </div>
        <span className={cn('text-xs font-medium', strength.color.replace('bg-', 'text-'))}>
          {strength.label}
        </span>
      </div>
      <ul className="space-y-0.5 text-xs text-white/60">
        <li className={password.length >= 8 ? 'text-emerald-400' : ''}>
          {password.length >= 8 ? '✓' : '○'} At least 8 characters
        </li>
        <li className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-emerald-400' : ''}>
          {/[A-Z]/.test(password) && /[a-z]/.test(password) ? '✓' : '○'} Upper and lowercase
          letters
        </li>
        <li className={/[0-9]/.test(password) ? 'text-emerald-400' : ''}>
          {/[0-9]/.test(password) ? '✓' : '○'} At least one number
        </li>
      </ul>
    </div>
  );
}










