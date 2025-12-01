import {useEffect} from 'react';
import {
  trackScreenLoad,
  completeScreenLoad,
} from '../services/performanceMonitor';
import {addBreadcrumb} from '../services/errorLogger';
import AnalyticsService from '../services/analytics';

/**
 * Hook to track screen views and performance
 */
export const useScreenTracking = (
  screenName: string,
  metadata?: Record<string, any>,
) => {
  useEffect(() => {
    // Track screen load performance
    trackScreenLoad(screenName, metadata);

    // Add breadcrumb for navigation tracking
    addBreadcrumb({
      category: 'navigation',
      message: `Navigated to ${screenName}`,
      level: 'info',
      data: metadata,
    });

    // Track analytics event
    AnalyticsService.trackEvent({
      eventType: 'app_opened',
      metadata: {
        screen: screenName,
        ...metadata,
      },
    });

    // Mark screen load complete after a short delay
    const timer = setTimeout(() => {
      completeScreenLoad(screenName);
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [screenName]);
};
