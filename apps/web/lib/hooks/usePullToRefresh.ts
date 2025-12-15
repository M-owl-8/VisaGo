import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  enabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const startYRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Get scrollable container (body in this case)
    containerRef.current = document.body;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start pull if at top of page
      if (window.scrollY === 0 || document.body.scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!startYRef.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - startYRef.current;

      // Only allow pulling down
      if (distance > 0 && (window.scrollY === 0 || document.body.scrollTop === 0)) {
        setIsPulling(true);
        setPullDistance(Math.min(distance, threshold * 1.5));
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling || isRefreshing) {
        setIsPulling(false);
        setPullDistance(0);
        startYRef.current = null;
        return;
      }

      if (pullDistance >= threshold) {
        // Trigger refresh
        setIsRefreshing(true);
        
        try {
          await onRefresh();
        } catch (error) {
          console.error('[PullToRefresh] Error during refresh:', error);
        } finally {
          setTimeout(() => {
            setIsRefreshing(false);
            setIsPulling(false);
            setPullDistance(0);
            startYRef.current = null;
          }, 500);
        }
      } else {
        // Release without refresh
        setIsPulling(false);
        setPullDistance(0);
        startYRef.current = null;
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onRefresh, threshold, isPulling, isRefreshing, pullDistance]);

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    shouldRefresh: pullDistance >= threshold,
  };
}

