/**
 * Lazy loading utilities for React Native
 * Implements code splitting, component lazy loading, and data prefetching
 */

import { useMemo, useCallback } from 'react';

interface LazyLoadConfig {
  enabled: boolean;
  delayMs?: number;
  placeholder?: React.ReactNode;
}

/**
 * Check if lazy loading is enabled
 */
export function isLazyLoadingEnabled(): boolean {
  // Can be controlled via environment variable or configuration
  return process.env.LAZY_LOADING_ENABLED !== 'false';
}

/**
 * Debounce function for viewport detection
 */
export function createViewportDetector(
  callback: () => void,
  delayMs: number = 500
) {
  let timeoutId: NodeJS.Timeout | null = null;

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      callback();
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Hook for lazy loading data on scroll
 */
export function useLazyLoad<T>(
  loadData: () => Promise<T>,
  shouldLoad: boolean = true,
  delayMs: number = 500
): {
  isLoading: boolean;
  error: Error | null;
  data: T | null;
  retry: () => void;
} {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [data, setData] = React.useState<T | null>(null);

  const load = useCallback(async () => {
    if (!shouldLoad || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await loadData();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      setIsLoading(false);
    }
  }, [loadData, shouldLoad, isLoading]);

  React.useEffect(() => {
    if (!shouldLoad) return;

    const timer = setTimeout(load, delayMs);
    return () => clearTimeout(timer);
  }, [load, shouldLoad, delayMs]);

  return { isLoading, error, data, retry: load };
}

/**
 * Hook for prefetching data
 */
export function usePrefetch<T>(
  loadData: () => Promise<T>,
  dependencies: any[] = []
): () => void {
  const prefetch = useCallback(async () => {
    try {
      await loadData();
    } catch (error) {
      console.warn('Prefetch failed:', error);
    }
  }, [loadData]);

  // Optionally start prefetch on mount if enabled
  React.useEffect(() => {
    if (isLazyLoadingEnabled()) {
      prefetch();
    }
  }, dependencies);

  return prefetch;
}

/**
 * Hook for virtual list optimization
 */
export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  visibleItems: number = 10
): {
  visibleRange: [number, number];
  viewableItems: T[];
  scrollHandler: (offset: number) => void;
} {
  const [scrollOffset, setScrollOffset] = React.useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollOffset / itemHeight) - 1);
    const end = Math.min(items.length, start + visibleItems + 2);
    return [start, end] as [number, number];
  }, [scrollOffset, itemHeight, visibleItems, items.length]);

  const viewableItems = useMemo(
    () => items.slice(visibleRange[0], visibleRange[1]),
    [items, visibleRange]
  );

  return {
    visibleRange,
    viewableItems,
    scrollHandler: setScrollOffset,
  };
}

/**
 * Hook for intersection observer pattern
 */
export function useIntersectionObserver(
  callback: () => void,
  options?: {
    threshold?: number;
    rootMargin?: string;
  }
) {
  const ref = React.useRef<any>(null);

  React.useEffect(() => {
    // React Native doesn't have Intersection Observer
    // This would be used in web version
    // For React Native, use FlatList's onViewableItemsChanged
  }, [callback, options]);

  return ref;
}

/**
 * Batch load items as user scrolls
 */
export function createBatchLoader<T>(
  loadMore: (page: number) => Promise<T[]>,
  batchSize: number = 20
) {
  let currentPage = 0;
  let isLoading = false;

  return async (offset: number, limit: number): Promise<T[]> => {
    const neededPage = Math.floor((offset + limit) / batchSize);

    if (neededPage > currentPage && !isLoading) {
      isLoading = true;
      try {
        const items = await loadMore(neededPage);
        currentPage = neededPage;
        return items;
      } finally {
        isLoading = false;
      }
    }

    return [];
  };
}

/**
 * Debounced search with lazy loading
 */
export function useDebouncedSearch<T>(
  search: (query: string) => Promise<T[]>,
  debounceMs: number = 300
): {
  results: T[];
  isLoading: boolean;
  error: Error | null;
  handleSearch: (query: string) => void;
} {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<T[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(async () => {
        if (!newQuery.trim()) {
          setResults([]);
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          const data = await search(newQuery);
          setResults(data);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Search failed'));
        } finally {
          setIsLoading(false);
        }
      }, debounceMs);
    },
    [search, debounceMs]
  );

  React.useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return { results, isLoading, error, handleSearch };
}

/**
 * Hook for managing pagination with lazy loading
 */
export function useLazyPagination<T>(
  loadPage: (page: number, pageSize: number) => Promise<T[]>,
  pageSize: number = 20
): {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => void;
  reset: () => void;
} {
  const [items, setItems] = React.useState<T[]>([]);
  const [page, setPage] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const newItems = await loadPage(page, pageSize);
      setItems((prev) => [...prev, ...newItems]);
      setPage((prev) => prev + 1);
      setHasMore(newItems.length === pageSize);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load more'));
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, hasMore, isLoading, loadPage]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(0);
    setHasMore(true);
    setError(null);
  }, []);

  return { items, isLoading, hasMore, error, loadMore, reset };
}

/**
 * Request idle callback polyfill for React Native
 */
export function scheduleIdleCallback(callback: () => void, timeout: number = 1000) {
  // React Native doesn't have requestIdleCallback
  // Use setTimeout as fallback
  return setTimeout(callback, timeout);
}

/**
 * Cancel scheduled idle callback
 */
export function cancelIdleCallback(id: NodeJS.Timeout) {
  clearTimeout(id);
}

/**
 * Memoization helper for expensive computations
 */
export function useMemoizedComputation<T>(
  computation: () => T,
  dependencies: any[]
): T {
  return useMemo(computation, dependencies);
}

/**
 * Hook for screen visibility tracking
 */
export function useScreenVisibility(
  onVisible?: () => void,
  onHidden?: () => void
) {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    // React Native doesn't have visibility API like web
    // This would be handled by React Navigation's useFocusEffect
    const onFocus = () => {
      setIsVisible(true);
      onVisible?.();
    };

    const onBlur = () => {
      setIsVisible(false);
      onHidden?.();
    };

    // Navigation listeners would be added here
    // This is a simplified version

    return () => {
      // Cleanup listeners
    };
  }, [onVisible, onHidden]);

  return isVisible;
}

/**
 * Performance monitoring helper
 */
export function measurePerformance(name: string) {
  const startTime = performance.now();

  return () => {
    const endTime = performance.now();
    console.log(`[Performance] ${name}: ${(endTime - startTime).toFixed(2)}ms`);
  };
}

/**
 * Hook for monitoring render performance
 */
export function useRenderMetrics(componentName: string) {
  React.useEffect(() => {
    const startTime = performance.now();

    return () => {
      const renderTime = performance.now() - startTime;
      if (renderTime > 16.67) {
        // 60fps threshold (1000/60)
        console.warn(
          `[Slow Render] ${componentName} took ${renderTime.toFixed(
            2
          )}ms to render`
        );
      }
    };
  }, [componentName]);
}

import React from 'react';