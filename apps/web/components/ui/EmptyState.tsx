'use client';

import { ReactNode } from 'react';
import { Card } from './Card';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  illustration?: 'embassy' | 'documents' | 'airplane' | 'none';
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  illustration = 'none',
  className,
}: EmptyStateProps) {
  const getIllustration = () => {
    switch (illustration) {
      case 'embassy':
        return (
          <div className="relative mb-8">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary-dark/20">
              <svg
                className="h-16 w-16 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div className="absolute -right-2 -top-2 h-6 w-6 animate-pulse rounded-full bg-primary/30" />
            <div className="absolute -bottom-2 -left-2 h-4 w-4 animate-pulse rounded-full bg-primary/20" style={{ animationDelay: '0.5s' }} />
          </div>
        );
      case 'documents':
        return (
          <div className="relative mb-8">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <svg
                className="h-16 w-16 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="absolute -right-2 top-4 h-5 w-5 animate-bounce rounded-full bg-amber-500/30" />
            <div className="absolute -left-2 bottom-4 h-4 w-4 animate-bounce rounded-full bg-orange-500/20" style={{ animationDelay: '0.3s' }} />
          </div>
        );
      case 'airplane':
        return (
          <div className="relative mb-8">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
              <svg
                className="h-16 w-16 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </div>
            <div className="absolute -right-3 top-8 h-6 w-6 animate-ping rounded-full bg-blue-500/20" />
            <div className="absolute -left-3 top-12 h-4 w-4 animate-ping rounded-full bg-cyan-500/20" style={{ animationDelay: '0.4s' }} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card
      className={`glass-panel flex flex-col items-center justify-center border-dashed border-white/10 bg-white/[0.03] px-8 py-16 text-center text-white sm:py-20 ${className || ''}`}
    >
      {illustration !== 'none' && getIllustration()}
      
      {icon && !illustration && (
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary-dark/20 text-primary">
          {icon}
        </div>
      )}

      <h3 className="font-display text-xl font-semibold text-white sm:text-2xl">
        {title}
      </h3>

      <p className="mt-3 max-w-xl text-sm text-white/60 sm:text-base">
        {description}
      </p>

      {action && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {action}
        </div>
      )}
    </Card>
  );
}

