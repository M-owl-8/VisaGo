import axios, {
  AxiosInstance,
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuthStore} from '../store/auth';
import {Platform} from 'react-native';
import {useNetworkStore} from '../store/network';
import {logError, logMessage, addBreadcrumb} from './errorLogger';

// Determine API URL based on environment
// IMPORTANT: Physical devices ALWAYS use Railway URL (or env var)
// Only emulators/simulators can use localhost/10.0.2.2 (via explicit env var)
const getApiBaseUrl = (): string => {
  // Priority 1: Environment variable (set at build time)
  // If explicitly set, use it (even if localhost/10.0.2.2 for emulator development)
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    const envUrl = process.env.EXPO_PUBLIC_API_URL.trim();
    if (envUrl) {
      return envUrl;
    }
  }
  if (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) {
    const envUrl = process.env.REACT_APP_API_URL.trim();
    if (envUrl) {
      return envUrl;
    }
  }

  // Priority 2: Always use Railway URL by default
  // This ensures physical devices NEVER try to connect to localhost/10.0.2.2
  // For emulator development, set EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 explicitly
  return 'https://visago-production.up.railway.app';
};

const API_BASE_URL = getApiBaseUrl();
console.log('🌐 API Base URL:', API_BASE_URL);
console.log('[AI CHAT] [ApiClient] API_BASE_URL determined:', API_BASE_URL);
console.log('[AI CHAT] [ApiClient] __DEV__:', __DEV__);
console.log('[AI CHAT] [ApiClient] Platform.OS:', Platform.OS);
console.log(
  '[AI CHAT] [ApiClient] EXPO_PUBLIC_API_URL:',
  typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_URL : 'N/A',
);
console.log(
  '[AI CHAT] [ApiClient] REACT_APP_API_URL:',
  typeof process !== 'undefined' ? process.env?.REACT_APP_API_URL : 'N/A',
);
console.log(
  '[AI CHAT] [ApiClient] Final chat endpoint will be:',
  `${API_BASE_URL}/api/chat/send`,
);

const CSRF_TOKEN_STORAGE_KEY = '@csrf_token';
const SESSION_ID_STORAGE_KEY = '@session_id';
const SAFE_HTTP_METHODS = new Set(['get', 'head', 'options']);

const API_CACHE_PREFIX = '@visabuddy_cache_v1:';
const CACHE_DEFAULT_TTL_MS = 1000 * 60 * 10; // 10 minutes
const OFFLINE_QUEUE_STORAGE_KEY = '@visabuddy_request_queue_v1';
const MAX_OFFLINE_QUEUE_SIZE = 25;

type ApiRequestConfig<T = any> = AxiosRequestConfig<T> & {
  metadata?: RequestMetadata;
};

type CachedApiEntry = {
  data: any;
  status: number;
  headers?: Record<string, any>;
  timestamp: number;
  ttl: number;
};

type OfflineQueuedRequest = {
  id: string;
  url: string;
  method: string;
  data?: any;
  params?: any;
  headers?: Record<string, any>;
  createdAt: number;
  attempts: number;
  nextRetryAt: number;
  metadata?: {
    offlineMessage?: string;
  };
};

interface RequestMetadata {
  cacheKey?: string;
  cacheTtl?: number;
  queueIfOffline?: boolean;
  offlineMessage?: string;
}

let cachedSessionId: string | null = null;
let cachedCsrfToken: string | null = null;
let securityTokensLoaded = false;
let securityTokensLoading: Promise<void> | null = null;

const createRequestId = () =>
  `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const isFormData = (data: unknown): boolean => {
  if (typeof FormData === 'undefined') {
    return false;
  }
  return data instanceof FormData;
};

const normalizeUrl = (config: AxiosRequestConfig): string => {
  const base = config.baseURL ?? '';
  const url = config.url ?? '';
  if (url.startsWith('http')) {
    return url;
  }
  if (!base) {
    return url;
  }
  return `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
};

const sortObject = (obj: any): any => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  const sortedKeys = Object.keys(obj).sort();
  return sortedKeys.reduce(
    (acc, key) => {
      acc[key] = sortObject(obj[key]);
      return acc;
    },
    {} as Record<string, any>,
  );
};

const buildCacheKey = (
  config: AxiosRequestConfig,
  metadata?: RequestMetadata,
): string | undefined => {
  if (metadata?.cacheKey) {
    return `${API_CACHE_PREFIX}${metadata.cacheKey}`;
  }

  if (!config.url) {
    return undefined;
  }

  const method = (config.method || 'get').toLowerCase();
  if (!SAFE_HTTP_METHODS.has(method)) {
    return undefined;
  }

  const url = normalizeUrl(config);
  const params = config.params ? JSON.stringify(sortObject(config.params)) : '';
  return `${API_CACHE_PREFIX}${method}:${url}?${params}`;
};

const setCacheEntry = async (
  key: string,
  response: AxiosResponse,
  ttl: number,
) => {
  try {
    const entry: CachedApiEntry = {
      data: response.data,
      status: response.status ?? 200,
      headers: response.headers ?? {},
      timestamp: Date.now(),
      ttl,
    };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    logError(error, {
      scope: 'ApiClientCache',
      message: 'Failed to persist cache entry',
      key,
    });
  }
};

const getCacheEntry = async (
  key: string | undefined,
  ttl: number,
  config: AxiosRequestConfig,
): Promise<AxiosResponse | null> => {
  if (!key) {
    return null;
  }

  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const entry: CachedApiEntry = JSON.parse(raw);
    const isExpired = Date.now() - entry.timestamp > (entry.ttl || ttl);

    if (isExpired) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    addBreadcrumb({
      category: 'network',
      message: `Serving cached response for ${config.url}`,
      level: 'info',
      data: {key},
    });

    return {
      data: entry.data,
      status: entry.status ?? 200,
      statusText: 'OK (cache)',
      headers: entry.headers ?? {},
      config,
      request: undefined,
    } as AxiosResponse;
  } catch (error) {
    logError(error, {
      scope: 'ApiClientCache',
      message: 'Failed to load cache entry',
      key,
    });
    return null;
  }
};

const loadOfflineQueueFromStorage = async (): Promise<
  OfflineQueuedRequest[]
> => {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as OfflineQueuedRequest[];
    }
    return [];
  } catch (error) {
    logError(error, {
      scope: 'ApiClientQueue',
      message: 'Failed to load offline queue',
    });
    return [];
  }
};

const persistOfflineQueueToStorage = async (queue: OfflineQueuedRequest[]) => {
  try {
    await AsyncStorage.setItem(
      OFFLINE_QUEUE_STORAGE_KEY,
      JSON.stringify(queue),
    );
  } catch (error) {
    logError(error, {
      scope: 'ApiClientQueue',
      message: 'Failed to persist offline queue',
    });
  }
};

const ensureSecurityTokensLoaded = async (): Promise<void> => {
  if (securityTokensLoaded) {
    return;
  }

  if (!securityTokensLoading) {
    securityTokensLoading = (async () => {
      try {
        const entries = await AsyncStorage.multiGet([
          SESSION_ID_STORAGE_KEY,
          CSRF_TOKEN_STORAGE_KEY,
        ]);

        const sessionEntry = entries.find(
          ([key]) => key === SESSION_ID_STORAGE_KEY,
        );
        const csrfEntry = entries.find(
          ([key]) => key === CSRF_TOKEN_STORAGE_KEY,
        );

        cachedSessionId = sessionEntry?.[1] || null;
        cachedCsrfToken = csrfEntry?.[1] || null;

        // If no tokens exist, fetch them from the server
        if (!cachedSessionId || !cachedCsrfToken) {
          try {
            console.log('🔐 Fetching initial security tokens from server...');
            console.log('📍 Requesting:', `${API_BASE_URL}/health`);
            const response = await axios.get(`${API_BASE_URL}/health`, {
              timeout: 5000,
            });
            console.log('✅ Response received! Status:', response.status);

            // Log all headers for debugging
            console.log(
              '📋 Response headers:',
              JSON.stringify(response.headers, null, 2),
            );

            const sessionId = response.headers['x-session-id'];
            const csrfToken = response.headers['x-csrf-token'];

            console.log('🔍 Extracted tokens:', {sessionId, csrfToken});

            if (sessionId) {
              cachedSessionId = sessionId;
              await AsyncStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
              console.log('✅ Session ID obtained:', sessionId);
            } else {
              console.warn('⚠️ No Session ID in response headers');
            }

            if (csrfToken) {
              cachedCsrfToken = csrfToken;
              await AsyncStorage.setItem(CSRF_TOKEN_STORAGE_KEY, csrfToken);
              console.log('✅ CSRF token obtained');
            } else {
              console.warn('⚠️ No CSRF token in response headers');
            }
          } catch (fetchError: any) {
            console.error('❌ Failed to fetch security tokens!');
            console.error('Error message:', fetchError.message);
            console.error('Error code:', fetchError.code);
            console.error(
              'Is network error?',
              fetchError.isAxiosError && !fetchError.response,
            );
            if (fetchError.config) {
              console.error('Request URL:', fetchError.config.url);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load security tokens', error);
        cachedSessionId = null;
        cachedCsrfToken = null;
      } finally {
        securityTokensLoaded = true;
        securityTokensLoading = null;
      }
    })();
  }

  const loadingPromise = securityTokensLoading;
  if (loadingPromise) {
    await loadingPromise;
  }
};

const persistToken = async (
  key: string,
  value: string | null,
): Promise<void> => {
  try {
    if (value === null) {
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn(`Failed to persist ${key}`, error);
  }
};

const updateSessionIdCache = async (
  newSessionId?: string | null,
): Promise<void> => {
  if (typeof newSessionId === 'undefined') {
    return;
  }

  const normalized = newSessionId?.trim() || null;

  if (!normalized) {
    if (cachedSessionId !== null) {
      cachedSessionId = null;
      await persistToken(SESSION_ID_STORAGE_KEY, null);
    }
    return;
  }

  if (cachedSessionId === normalized) {
    return;
  }

  cachedSessionId = normalized;
  await persistToken(SESSION_ID_STORAGE_KEY, normalized);
};

const updateCsrfTokenCache = async (
  newToken?: string | null,
): Promise<void> => {
  if (typeof newToken === 'undefined') {
    return;
  }

  const normalized = newToken?.trim() || null;

  if (!normalized) {
    if (cachedCsrfToken !== null) {
      cachedCsrfToken = null;
      await persistToken(CSRF_TOKEN_STORAGE_KEY, null);
    }
    return;
  }

  if (cachedCsrfToken === normalized) {
    return;
  }

  cachedCsrfToken = normalized;
  await persistToken(CSRF_TOKEN_STORAGE_KEY, normalized);
};

const clearSecurityContext = async (): Promise<void> => {
  await Promise.all([updateSessionIdCache(null), updateCsrfTokenCache(null)]);
};

const getHeaderValue = (
  headers: any,
  headerName: string,
): string | undefined => {
  if (!headers) {
    return undefined;
  }

  if (typeof headers.get === 'function') {
    const value = headers.get(headerName);
    return typeof value === 'string' ? value : undefined;
  }

  const normalized = headerName.toLowerCase();
  const key = Object.keys(headers).find(
    headerKey => headerKey.toLowerCase() === normalized,
  );

  if (!key) {
    return undefined;
  }

  const value = headers[key];

  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : undefined;
  }

  return typeof value === 'string' ? value : undefined;
};

const setHeaderValue = (headers: any, name: string, value: string): void => {
  if (!headers || !value) {
    return;
  }

  if (typeof headers.set === 'function') {
    headers.set(name, value);
  } else {
    headers[name] = value;
  }
};

const removeHeaderValue = (headers: any, name: string): void => {
  if (!headers) {
    return;
  }

  if (typeof headers.delete === 'function') {
    headers.delete(name);
  } else if (headers[name] !== undefined) {
    delete headers[name];
  }
};

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    status: number;
    message: string;
    code?: string;
  };
  message?: string;
}

class ApiClient {
  private api: AxiosInstance;
  private offlineQueue: OfflineQueuedRequest[] = [];
  private offlineQueueReady: Promise<void> | null = null;
  private processingOfflineQueue = false;
  private unsubscribeNetwork?: () => void;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add token
    this.api.interceptors.request.use(
      async config => {
        try {
          await ensureSecurityTokensLoaded();

          if (!config.headers) {
            config.headers = {};
          }

          const headers: any = config.headers;

          const authToken = await AsyncStorage.getItem('@auth_token');
          if (authToken) {
            setHeaderValue(headers, 'Authorization', `Bearer ${authToken}`);
          } else {
            removeHeaderValue(headers, 'Authorization');
          }

          if (cachedSessionId) {
            setHeaderValue(headers, 'X-Session-Id', cachedSessionId);
          } else {
            removeHeaderValue(headers, 'X-Session-Id');
          }

          const method = (config.method || 'get').toLowerCase();
          if (!SAFE_HTTP_METHODS.has(method)) {
            if (cachedCsrfToken) {
              setHeaderValue(headers, 'X-CSRF-Token', cachedCsrfToken);
            } else {
              removeHeaderValue(headers, 'X-CSRF-Token');
            }
          } else {
            removeHeaderValue(headers, 'X-CSRF-Token');
          }
        } catch (error) {
          console.error('Error preparing request headers:', error);
        }
        return config;
      },
      error => Promise.reject(error),
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      async response => {
        const sessionId = getHeaderValue(response.headers, 'x-session-id');
        const csrfToken = getHeaderValue(response.headers, 'x-csrf-token');

        await Promise.all([
          updateSessionIdCache(sessionId),
          updateCsrfTokenCache(csrfToken),
        ]);

        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.headers) {
          const sessionId = getHeaderValue(
            error.response.headers,
            'x-session-id',
          );
          const csrfToken = getHeaderValue(
            error.response.headers,
            'x-csrf-token',
          );
          await Promise.all([
            updateSessionIdCache(sessionId),
            updateCsrfTokenCache(csrfToken),
          ]);
        }

        const errorCode =
          (error.response?.data as any)?.error?.code ?? undefined;

        if (
          error.response?.status === 403 &&
          (errorCode === 'CSRF_TOKEN_INVALID' ||
            errorCode === 'CSRF_TOKEN_MISSING')
        ) {
          await updateCsrfTokenCache(null);
        }

        if (error.response?.status === 401) {
          // Token expired or invalid - handle gracefully
          const authState = useAuthStore.getState();
          const isChatEndpoint = error.config?.url?.includes('/chat');
          const isAIGenerateEndpoint =
            error.config?.url?.includes('/ai-generate');

          // For chat and AI endpoints, don't log warnings or logout - let them handle it
          if (isChatEndpoint || isAIGenerateEndpoint) {
            // Silently handle 401 for chat/AI endpoints - they'll show appropriate messages
            return Promise.reject(error);
          }

          // For other endpoints, check if we should logout
          if (authState.isSignedIn) {
            // Check if the error is specifically about authentication
            const errorMessage =
              (error.response?.data as any)?.error?.message || '';
            const errorCode = (error.response?.data as any)?.error?.code || '';

            // Only logout if it's a clear authentication failure
            if (
              errorMessage.includes('token') ||
              errorMessage.includes('unauthorized') ||
              errorMessage.includes('authentication') ||
              errorCode === 'UNAUTHORIZED' ||
              errorCode === 'INVALID_TOKEN'
            ) {
              console.warn('Authentication failed - logging out');
              await AsyncStorage.removeItem('@auth_token');
              authState.logout();
            } else {
              // For other 401s, just warn but don't logout
              console.warn('Authentication failed - token may be expired');
            }
          }
        }

        // Log 404 errors for debugging (but don't treat as critical)
        if (error.response?.status === 404) {
          const url = error.config?.url || 'unknown';
          console.warn(
            `404 Not Found: ${url} - Backend route may not be available or backend server may not be running`,
          );
        }

        return Promise.reject(error);
      },
    );

    const originalRequest = this.api.request.bind(this.api);
    this.api.request = async <T = any, D = any>(
      config: ApiRequestConfig<D>,
    ): Promise<AxiosResponse<T>> => {
      return this.executeRequest(originalRequest, config);
    };

    this.initializeOfflineSupport();
  }

  private async initializeOfflineSupport(): Promise<void> {
    if (!this.offlineQueueReady) {
      this.offlineQueueReady = loadOfflineQueueFromStorage().then(queue => {
        this.offlineQueue = queue;
      });
    }

    this.unsubscribeNetwork = useNetworkStore.subscribe(
      state => state.isOnline,
      isOnline => {
        if (isOnline) {
          this.processOfflineQueue();
        }
      },
    );

    if (useNetworkStore.getState().isOnline) {
      this.processOfflineQueue();
    }
  }

  private async executeRequest<T = any, D = any>(
    originalRequest: (
      config: AxiosRequestConfig<D>,
    ) => Promise<AxiosResponse<T>>,
    config: ApiRequestConfig<D>,
  ): Promise<AxiosResponse<T>> {
    const normalizedConfig: ApiRequestConfig<D> = {
      ...config,
    };

    const metadata: RequestMetadata = (normalizedConfig as any).metadata || {};
    delete (normalizedConfig as any).metadata;
    const method = (normalizedConfig.method || 'get').toLowerCase();
    normalizedConfig.method = method as AxiosRequestConfig<D>['method'];
    const isSafeMethod = SAFE_HTTP_METHODS.has(method);
    const cacheKey = buildCacheKey(normalizedConfig, metadata);
    const cacheTtl = metadata.cacheTtl ?? CACHE_DEFAULT_TTL_MS;
    const queueIfOffline = metadata.queueIfOffline === true;
    const offlineMessage = metadata.offlineMessage;
    const isMultipart =
      isFormData(normalizedConfig.data) ||
      (typeof normalizedConfig.headers?.['Content-Type'] === 'string' &&
        normalizedConfig.headers['Content-Type'].includes(
          'multipart/form-data',
        ));

    const {isOnline} = useNetworkStore.getState();

    if (!isOnline) {
      if (isSafeMethod && cacheKey) {
        const cachedResponse = await getCacheEntry(
          cacheKey,
          cacheTtl,
          normalizedConfig,
        );
        if (cachedResponse) {
          return cachedResponse as AxiosResponse<T>;
        }
      }

      if (queueIfOffline && !isMultipart) {
        await this.enqueueOfflineRequest(normalizedConfig, metadata);
        addBreadcrumb({
          category: 'network',
          message: `Queued offline request ${normalizedConfig.url}`,
          data: {method: method.toUpperCase()},
        });
        return {
          data: {
            success: true,
            queued: true,
            message:
              offlineMessage ||
              'Request saved offline and will sync once online.',
          } as T,
          status: 202,
          statusText: 'Accepted (queued offline)',
          headers: {},
          config: normalizedConfig,
          request: undefined,
        } as AxiosResponse<T>;
      }

      const offlineError = new AxiosError(
        offlineMessage ||
          'No internet connection. Please try again when you are online.',
        'ERR_NETWORK_OFFLINE',
        normalizedConfig,
      );
      (offlineError as any).isOffline = true;
      throw offlineError;
    }

    try {
      const response = await originalRequest(normalizedConfig);

      if (isSafeMethod && cacheKey && response?.data) {
        await setCacheEntry(cacheKey, response, cacheTtl);
      }

      return response;
    } catch (error: any) {
      if (isSafeMethod && cacheKey) {
        const cachedResponse = await getCacheEntry(
          cacheKey,
          cacheTtl,
          normalizedConfig,
        );
        if (cachedResponse) {
          return cachedResponse as AxiosResponse<T>;
        }
      }

      logError(error, {
        scope: 'ApiClient',
        url: normalizedConfig.url,
        method: method.toUpperCase(),
      });

      throw error;
    }
  }

  private async enqueueOfflineRequest(
    config: AxiosRequestConfig,
    metadata: RequestMetadata,
  ): Promise<void> {
    await (this.offlineQueueReady ?? Promise.resolve());

    const request: OfflineQueuedRequest = {
      id: createRequestId(),
      url: config.url || '',
      method: (config.method || 'post').toUpperCase(),
      data: config.data,
      params: config.params,
      headers: config.headers ? {...config.headers} : undefined,
      createdAt: Date.now(),
      attempts: 0,
      nextRetryAt: Date.now() + 5000,
      metadata: {
        offlineMessage: metadata.offlineMessage,
      },
    };

    if (!request.url) {
      return;
    }

    if (this.offlineQueue.length >= MAX_OFFLINE_QUEUE_SIZE) {
      this.offlineQueue.shift();
    }

    this.offlineQueue.push(request);
    await persistOfflineQueueToStorage(this.offlineQueue);
  }

  private async processOfflineQueue(): Promise<void> {
    await (this.offlineQueueReady ?? Promise.resolve());

    if (this.processingOfflineQueue) {
      return;
    }

    if (!useNetworkStore.getState().isOnline) {
      return;
    }

    this.processingOfflineQueue = true;

    try {
      for (const request of [...this.offlineQueue]) {
        if (Date.now() < request.nextRetryAt) {
          continue;
        }

        try {
          await this.api.request({
            url: request.url,
            method: request.method,
            data: request.data,
            params: request.params,
            headers: request.headers,
          } as ApiRequestConfig);
          logMessage('Offline request synced', {
            url: request.url,
            method: request.method,
          });

          this.offlineQueue = this.offlineQueue.filter(
            item => item.id !== request.id,
          );
          await persistOfflineQueueToStorage(this.offlineQueue);
        } catch (error) {
          request.attempts += 1;
          request.nextRetryAt =
            Date.now() + Math.min(60000, Math.pow(2, request.attempts) * 1000);

          if (request.attempts >= 3) {
            logError(error, {
              scope: 'ApiClientQueue',
              message: 'Dropping offline request after repeated failures',
              url: request.url,
              method: request.method,
            });
            this.offlineQueue = this.offlineQueue.filter(
              item => item.id !== request.id,
            );
            await persistOfflineQueueToStorage(this.offlineQueue);
          }
        }
      }
    } finally {
      this.processingOfflineQueue = false;
    }
  }

  /**
   * ============================================================================
   * AUTHENTICATION ENDPOINTS
   * ============================================================================
   */

  async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
  ): Promise<ApiResponse> {
    const response = await this.api.post('/auth/register', {
      email,
      password,
      firstName,
      lastName,
    });
    return response.data;
  }

  async login(email: string, password: string): Promise<ApiResponse> {
    const response = await this.api.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async loginWithGoogle(
    googleId: string,
    email: string,
    firstName?: string,
    lastName?: string,
    avatar?: string,
  ): Promise<ApiResponse> {
    const response = await this.api.post('/auth/google', {
      googleId,
      email,
      firstName,
      lastName,
      avatar,
    });
    return response.data;
  }

  async getCurrentUser(): Promise<ApiResponse> {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/auth/logout');
      return response.data;
    } catch (error) {
      // Even if logout endpoint fails, consider it successful for client-side logout
      return {success: true};
    }
  }

  async updateProfile(updates: any): Promise<ApiResponse> {
    const response = await this.api.put('/auth/me', updates);
    return response.data;
  }

  async clearSecurityTokens(): Promise<void> {
    await clearSecurityContext();
  }

  async refreshToken(): Promise<ApiResponse> {
    const response = await this.api.post('/auth/refresh');
    return response.data;
  }

  async forgotPassword(email: string): Promise<ApiResponse> {
    const response = await this.api.post('/auth/forgot-password', {email});
    return response.data;
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse> {
    const response = await this.api.post('/auth/reset-password', {
      token,
      password,
    });
    return response.data;
  }

  /**
   * ============================================================================
   * COUNTRIES & VISA TYPES ENDPOINTS
   * ============================================================================
   */

  async getCountries(search?: string): Promise<ApiResponse> {
    const params = search ? {search} : {};
    const response = await this.api.get('/countries', {params});
    return response.data;
  }

  async getPopularCountries(): Promise<ApiResponse> {
    const response = await this.api.get('/countries/popular');
    return response.data;
  }

  async getCountry(id: string): Promise<ApiResponse> {
    const response = await this.api.get(`/countries/${id}`);
    return response.data;
  }

  async getCountryByCode(code: string): Promise<ApiResponse> {
    const response = await this.api.get(`/countries/code/${code}`);
    return response.data;
  }

  async getVisaTypes(countryId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/countries/${countryId}/visa-types`);
    return response.data;
  }

  // New methods for visa type first flow
  async getAllVisaTypes(search?: string): Promise<ApiResponse> {
    const params = search ? {search} : {};
    const response = await this.api.get('/visa-types', {params});
    return response.data;
  }

  async getPopularVisaTypes(): Promise<ApiResponse> {
    const response = await this.api.get('/visa-types/popular');
    return response.data;
  }

  async getCountriesByVisaType(visaTypeName: string): Promise<ApiResponse> {
    const encodedName = encodeURIComponent(visaTypeName);
    const response = await this.api.get(`/visa-types/${encodedName}`);
    return response.data;
  }

  async getVisaTypeByNameAndCountry(
    visaTypeName: string,
    countryId: string,
  ): Promise<ApiResponse> {
    const encodedName = encodeURIComponent(visaTypeName);
    const response = await this.api.get(
      `/visa-types/${encodedName}/countries/${countryId}`,
    );
    return response.data;
  }

  /**
   * ============================================================================
   * VISA APPLICATIONS ENDPOINTS
   * ============================================================================
   */

  async getApplications(): Promise<ApiResponse> {
    const response = await this.api.get('/applications');
    return response.data;
  }

  async getApplication(id: string): Promise<ApiResponse> {
    const response = await this.api.get(`/applications/${id}`);
    return response.data;
  }

  async getDocumentChecklist(applicationId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/document-checklist/${applicationId}`);
    return response.data;
  }

  async createApplication(
    countryId: string,
    visaTypeId: string,
    notes?: string,
  ): Promise<ApiResponse> {
    const response = await this.api.post('/applications', {
      countryId,
      visaTypeId,
      notes,
    });
    return response.data;
  }

  async generateApplicationWithAI(questionnaireData: {
    purpose: string;
    country?: string;
    duration: string;
    traveledBefore: boolean;
    currentStatus: string;
    hasInvitation: boolean;
    financialSituation: string;
    maritalStatus: string;
    hasChildren: string;
    englishLevel: string;
  }): Promise<ApiResponse> {
    const response = await this.api.post('/applications/ai-generate', {
      questionnaireData,
    });
    return response.data;
  }

  async updateApplicationStatus(
    id: string,
    status: string,
  ): Promise<ApiResponse> {
    const response = await this.api.put(`/applications/${id}/status`, {status});
    return response.data;
  }

  async updateCheckpoint(
    applicationId: string,
    checkpointId: string,
    status: string,
  ): Promise<ApiResponse> {
    const response = await this.api.put(
      `/applications/${applicationId}/checkpoints/${checkpointId}`,
      {status},
    );
    return response.data;
  }

  async deleteApplication(id: string): Promise<ApiResponse> {
    const response = await this.api.delete(`/applications/${id}`);
    return response.data;
  }

  /**
   * ============================================================================
   * PAYMENT ENDPOINTS
   * ============================================================================
   */

  async getPaymentMethods(): Promise<ApiResponse> {
    const response = await this.api.get('/payments/methods');
    return response.data;
  }

  async getPaymentFreezeStatus(): Promise<ApiResponse> {
    const response = await this.api.get('/payments/freeze-status');
    return response.data;
  }

  async initiatePayment(
    applicationId: string,
    returnUrl: string,
    paymentMethod: string = 'payme',
  ): Promise<ApiResponse> {
    const response = await this.api.post('/payments/initiate', {
      applicationId,
      returnUrl,
      paymentMethod,
    });
    return response.data;
  }

  async getPayment(transactionId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/payments/${transactionId}`);
    return response.data;
  }

  async getUserPayments(): Promise<ApiResponse> {
    const response = await this.api.get('/payments');
    return response.data;
  }

  async verifyPayment(transactionId: string): Promise<ApiResponse> {
    const response = await this.api.post(`/payments/${transactionId}/verify`);
    return response.data;
  }

  async cancelPayment(transactionId: string): Promise<ApiResponse> {
    const response = await this.api.delete(`/payments/${transactionId}/cancel`);
    return response.data;
  }

  /**
   * ============================================================================
   * DOCUMENT ENDPOINTS
   * ============================================================================
   */

  async uploadDocument(
    applicationId: string,
    documentType: string,
    file: any,
  ): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('applicationId', applicationId);
    formData.append('documentType', documentType);
    formData.append('file', file);

    const response = await this.api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getDocuments(): Promise<ApiResponse> {
    const response = await this.api.get('/documents');
    return response.data;
  }

  async getApplicationDocuments(applicationId: string): Promise<ApiResponse> {
    const response = await this.api.get(
      `/documents/application/${applicationId}`,
    );
    return response.data;
  }

  async getRequiredDocuments(applicationId: string): Promise<ApiResponse> {
    const response = await this.api.get(
      `/documents/application/${applicationId}/required`,
    );
    return response.data;
  }

  async updateDocumentStatus(
    documentId: string,
    status: 'pending' | 'verified' | 'rejected',
    verificationNotes?: string,
  ): Promise<ApiResponse> {
    const response = await this.api.patch(`/documents/${documentId}/status`, {
      status,
      verificationNotes,
    });
    return response.data;
  }

  async getDocument(documentId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/documents/${documentId}`);
    return response.data;
  }

  async deleteDocument(documentId: string): Promise<ApiResponse> {
    const response = await this.api.delete(`/documents/${documentId}`);
    return response.data;
  }

  async getDocumentStats(): Promise<ApiResponse> {
    const response = await this.api.get('/documents/stats/overview');
    return response.data;
  }

  /**
   * ============================================================================
   * CHAT ENDPOINTS
   * ============================================================================
   */

  async sendMessage(
    content: string,
    applicationId?: string,
    conversationHistory?: any[],
  ): Promise<ApiResponse> {
    // Build the full URL for logging
    const fullUrl = `${API_BASE_URL}/api/chat/send`;
    const payload = {
      content,
      applicationId,
      conversationHistory,
    };

    console.log('[AI CHAT] [ApiClient] sendMessage called');
    console.log('[AI CHAT] [ApiClient] URL:', fullUrl);
    console.log('[AI CHAT] [ApiClient] Base URL:', API_BASE_URL);
    console.log(
      '[AI CHAT] [ApiClient] PAYLOAD:',
      JSON.stringify(payload, null, 2),
    );
    console.log(
      '[AI CHAT] [ApiClient] Payload size:',
      JSON.stringify(payload).length,
      'bytes',
    );

    try {
      const response = await this.api.post('/chat/send', payload);

      console.log('[AI CHAT] [ApiClient] Response received:', {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        success: response.data?.success,
        hasResponseData: !!response.data?.data,
        responseDataKeys: response.data?.data
          ? Object.keys(response.data.data)
          : [],
        error: response.data?.error,
        headers: response.headers,
      });

      // Log response body (truncated if too long)
      const responseBodyStr = JSON.stringify(response.data, null, 2);
      if (responseBodyStr.length > 500) {
        console.log(
          '[AI CHAT] [ApiClient] Response body (truncated):',
          responseBodyStr.substring(0, 500) + '...',
        );
      } else {
        console.log('[AI CHAT] [ApiClient] Response body:', responseBodyStr);
      }

      return response.data;
    } catch (error: any) {
      console.log('[AI CHAT] [ApiClient] Request failed:', {
        error: error?.message || error,
        errorType: error?.constructor?.name,
        isAxiosError: error?.isAxiosError,
        responseStatus: error?.response?.status,
        responseStatusText: error?.response?.statusText,
        responseData: error?.response?.data,
        responseHeaders: error?.response?.headers,
        requestUrl: error?.config?.url,
        requestMethod: error?.config?.method,
        requestBaseURL: error?.config?.baseURL,
        requestFullURL:
          error?.config?.baseURL && error?.config?.url
            ? `${error.config.baseURL}${error.config.url}`
            : fullUrl,
        requestData: error?.config?.data,
        requestHeaders: error?.config?.headers,
        code: error?.code,
        errno: error?.errno,
        syscall: error?.syscall,
        address: error?.address,
        port: error?.port,
        stack: error?.stack,
      });

      // Log response body if available
      if (error?.response?.data) {
        const errorBodyStr = JSON.stringify(error.response.data, null, 2);
        if (errorBodyStr.length > 500) {
          console.log(
            '[AI CHAT] [ApiClient] Error response body (truncated):',
            errorBodyStr.substring(0, 500) + '...',
          );
        } else {
          console.log(
            '[AI CHAT] [ApiClient] Error response body:',
            errorBodyStr,
          );
        }
      }

      throw error;
    }
  }

  async getChatHistory(
    applicationId?: string,
    limit?: number,
    offset?: number,
  ): Promise<ApiResponse> {
    const params: any = {};
    if (applicationId) params.applicationId = applicationId;
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;

    const response = await this.api.get('/chat/history', {params});
    return response.data;
  }

  async searchDocuments(
    query: string,
    country?: string,
    visaType?: string,
  ): Promise<ApiResponse> {
    const response = await this.api.post('/chat/search', {
      query,
      country,
      visaType,
      limit: 5,
    });
    return response.data;
  }

  async clearChatHistory(applicationId?: string): Promise<ApiResponse> {
    const params: any = {};
    if (applicationId) params.applicationId = applicationId;

    const response = await this.api.delete('/chat/history', {params});
    return response.data;
  }

  async getChatStats(): Promise<ApiResponse> {
    const response = await this.api.get('/chat/stats');
    return response.data;
  }

  async getChatSessions(
    limit: number = 20,
    offset: number = 0,
  ): Promise<ApiResponse> {
    const response = await this.api.get('/chat/sessions', {
      params: {limit, offset},
    });
    return response.data;
  }

  /**
   * =========================================================================
   * NOTIFICATION ENDPOINTS
   * =========================================================================
   */

  async registerDeviceToken(
    deviceToken: string,
    platform: string,
    deviceId?: string,
    appVersion?: string,
  ): Promise<ApiResponse> {
    const response = await this.api.post(
      '/notifications/register-device',
      {
        deviceToken,
        platform,
        deviceId,
        appVersion,
      },
      {
        metadata: {
          queueIfOffline: true,
          offlineMessage:
            "Device registration saved and will sync once you're online.",
        },
      } as ApiRequestConfig,
    );
    return response.data;
  }

  async subscribeToTopic(
    topic: string,
    deviceToken: string,
  ): Promise<ApiResponse> {
    const response = await this.api.post(
      '/notifications/subscribe-topic',
      {topic, deviceToken},
      {
        metadata: {
          queueIfOffline: true,
          offlineMessage:
            'Topic subscription queued until your device is back online.',
        },
      } as ApiRequestConfig,
    );
    return response.data;
  }

  async unsubscribeFromTopic(
    topic: string,
    deviceToken: string,
  ): Promise<ApiResponse> {
    const response = await this.api.post(
      '/notifications/unsubscribe-topic',
      {topic, deviceToken},
      {
        metadata: {
          queueIfOffline: true,
          offlineMessage:
            'Topic unsubscription queued until your device is back online.',
        },
      } as ApiRequestConfig,
    );
    return response.data;
  }

  async getNotificationPreferences(): Promise<any> {
    const response = await this.api.get('/notifications/preferences', {
      metadata: {
        cacheKey: 'notifications/preferences',
        cacheTtl: 1000 * 60 * 5,
      },
    } as ApiRequestConfig);
    return response.data;
  }

  async updateNotificationPreferences(
    preferences: Record<string, boolean>,
  ): Promise<ApiResponse> {
    const response = await this.api.patch(
      '/notifications/preferences',
      preferences,
      {
        metadata: {
          queueIfOffline: true,
          offlineMessage:
            "We'll update your notification preferences once you're back online.",
        },
      } as ApiRequestConfig,
    );
    return response.data;
  }

  async getNotificationHistory(
    limit: number = 20,
    offset: number = 0,
  ): Promise<any> {
    const response = await this.api.get('/notifications/history', {
      params: {limit, offset},
      metadata: {
        cacheTtl: 1000 * 60,
      },
    } as ApiRequestConfig);
    return response.data;
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse> {
    const response = await this.api.patch(
      `/notifications/mark-read/${notificationId}`,
      {},
      {
        metadata: {
          queueIfOffline: true,
          offlineMessage:
            "We'll sync your notification status once you're back online.",
        },
      } as ApiRequestConfig,
    );
    return response.data;
  }

  async getSessionDetails(sessionId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/chat/sessions/${sessionId}`);
    return response.data;
  }

  async renameSession(sessionId: string, title: string): Promise<ApiResponse> {
    const response = await this.api.patch(`/chat/sessions/${sessionId}`, {
      title,
    });
    return response.data;
  }

  async deleteSession(sessionId: string): Promise<ApiResponse> {
    const response = await this.api.delete(`/chat/sessions/${sessionId}`);
    return response.data;
  }

  async addMessageFeedback(
    messageId: string,
    feedback: 'thumbs_up' | 'thumbs_down',
  ): Promise<ApiResponse> {
    const response = await this.api.post(
      `/chat/messages/${messageId}/feedback`,
      {
        feedback,
      },
    );
    return response.data;
  }

  /**
   * ============================================================================
   * USER PROFILE ENDPOINTS
   * ============================================================================
   */

  async getUserProfile(): Promise<ApiResponse> {
    const response = await this.api.get('/users/me');
    return response.data;
  }

  async updateUserProfile(userId: string, data: any): Promise<ApiResponse> {
    const response = await this.api.patch(`/users/${userId}`, data);
    return response.data;
  }

  async getUserApplications(userId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/users/${userId}/applications`);
    return response.data;
  }

  async getUserPaymentHistory(userId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/users/${userId}/payments`);
    return response.data;
  }

  async updateUserPreferences(
    userId: string,
    preferences: any,
  ): Promise<ApiResponse> {
    const response = await this.api.patch(
      `/users/${userId}/preferences`,
      preferences,
    );
    return response.data;
  }

  /**
   * ============================================================================
   * UTILITY METHODS
   * ============================================================================
   */

  /**
   * Handle API errors in a standardized way
   */
  handleError(error: any): string {
    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An error occurred. Please try again.';
  }

  /**
   * Check if API is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.data.status === 'ok';
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

export default apiClient;
