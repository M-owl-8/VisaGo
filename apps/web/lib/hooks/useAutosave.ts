'use client';

import { useEffect, useRef } from 'react';

type AutosaveOptions<T> = {
  key: string;
  data: T;
  delay?: number;
  onSave?: (data: T) => void;
};

export function useAutosave<T>({ key, data, delay = 800, onSave }: AutosaveOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!key) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
        onSave?.(data);
      } catch (error) {
        // Silently fail - autosave is non-critical
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, data, delay, onSave]);
}
