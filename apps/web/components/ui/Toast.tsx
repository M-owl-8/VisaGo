'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import type { Toast as ToastType } from '@/lib/stores/toast';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const variantStyles = {
  success: {
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    icon: CheckCircle,
  },
  error: {
    bg: 'bg-rose-500/20',
    border: 'border-rose-500/30',
    text: 'text-rose-300',
    icon: XCircle,
  },
  info: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    text: 'text-blue-300',
    icon: Info,
  },
  warning: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    icon: AlertTriangle,
  },
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const [startTime] = useState(Date.now());
  const variant = variantStyles[toast.variant];
  const Icon = variant.icon;

  useEffect(() => {
    const duration = toast.duration;
    if (!duration) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast.duration, startTime]);

  // Handle swipe to dismiss on touch devices
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe || isRightSwipe) {
      onDismiss(toast.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative rounded-lg border ${variant.border} ${variant.bg} backdrop-blur-sm shadow-lg p-4 max-w-md w-full`}
    >
      <div className="flex items-start gap-3">
        <Icon size={20} className={`shrink-0 ${variant.text}`} />
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${variant.text}`}>{toast.message}</p>
          
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className={`mt-2 text-sm font-semibold ${variant.text} hover:underline`}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 rounded p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      {toast.duration && (
        <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-lg bg-white/10">
          <div
            className={`h-full transition-all duration-50 ${variant.bg}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}

