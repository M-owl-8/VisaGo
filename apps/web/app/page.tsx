'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { logger } from '@/lib/logger';

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoading, initializeApp } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await initializeApp();
        if (mounted) {
          setInitialized(true);
        }
      } catch (error) {
        logger.error('Initialization error', error);
        if (mounted) {
          setInitialized(true);
        }
      }
    };

    init();

    // Timeout fallback - if initialization takes too long, proceed anyway
    const timeout = setTimeout(() => {
      if (mounted && !initialized) {
        logger.warn('Initialization timeout, proceeding anyway');
        setInitialized(true);
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [initializeApp, initialized]);

  useEffect(() => {
    if (initialized && !isLoading) {
      // Small delay to ensure state is settled
      const timer = setTimeout(() => {
        if (isSignedIn) {
          router.push('/applications');
        } else {
          router.push('/login');
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isSignedIn, isLoading, initialized, router]);

  // Fallback redirect after 5 seconds if still loading
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (isLoading) {
        logger.warn('Loading timeout, redirecting to login');
        router.push('/login');
      }
    }, 5000);
    return () => clearTimeout(fallbackTimer);
  }, [isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-2xl font-bold">Ketdik</div>
        <div className="text-gray-600">Loading...</div>
      </div>
    </div>
  );
}
