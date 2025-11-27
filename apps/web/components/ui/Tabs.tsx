'use client';

import { cn } from '@/lib/utils/cn';

interface TabsProps<T extends string> {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
  className?: string;
}

export function Tabs<T extends string>({ value, options, onChange, className }: TabsProps<T>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 p-1 shadow-inner shadow-white/60',
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            type="button"
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition',
              isActive
                ? 'bg-primary-900 text-white shadow-card'
                : 'text-neutral-500 hover:text-primary-900'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
