import * as Sentry from '@sentry/react-native';
import {ReactNativeTracing} from '@sentry/react-native';
import type {Breadcrumb} from '@sentry/types';
import {APP_VERSION, SENTRY_DSN} from '../config/constants';

let initialized = false;

const createDefaultIntegrations = () => {
  const integrations: any[] = [];
  if (typeof ReactNativeTracing === 'function') {
    integrations.push(new ReactNativeTracing());
  }
  return integrations;
};

export const initializeErrorLogger = () => {
  if (initialized) {
    return;
  }

  if (!SENTRY_DSN || SENTRY_DSN === 'YOUR_SENTRY_DSN_HERE') {
    console.info(
      '[ErrorLogger] Sentry DSN not configured. Error reporting disabled.',
    );
    initialized = false;
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment:
      process.env.NODE_ENV || (__DEV__ ? 'development' : 'production'),
    release: `visabuddy-mobile@${APP_VERSION}`,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
    debug: __DEV__,
    integrations: defaultIntegrations => [
      ...defaultIntegrations,
      ...createDefaultIntegrations(),
    ],
  });

  initialized = true;
  console.info('[ErrorLogger] Sentry initialized');
};

export const logError = (error: unknown, context?: Record<string, unknown>) => {
  if (initialized) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('[Error]', error, context);
  }
};

export const logMessage = (
  message: string,
  context?: Record<string, unknown>,
) => {
  if (initialized) {
    Sentry.captureMessage(message, {
      level: 'info',
      extra: context,
    });
  } else {
    console.log('[Info]', message, context);
  }
};

export const addBreadcrumb = (breadcrumb: Breadcrumb) => {
  if (initialized) {
    Sentry.addBreadcrumb(breadcrumb);
  }
};

export const setUserContext = (user: {id?: string; email?: string} | null) => {
  if (!initialized) {
    return;
  }

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
    });
  } else {
    Sentry.setUser(null);
  }
};
