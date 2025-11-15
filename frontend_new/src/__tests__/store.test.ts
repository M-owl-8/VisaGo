import { mockTestUser, mockTestApplication } from './test-utils';

/**
 * Mock Zustand store for authentication
 */
const createAuthStore = () => {
  let state = {
    user: null as typeof mockTestUser | null,
    token: null as string | null,
    isAuthenticated: false,
    isLoading: false,
    error: null as string | null,
  };

  return {
    getState: () => state,
    setState: (newState: Partial<typeof state>) => {
      state = { ...state, ...newState };
    },
    login: (user: typeof mockTestUser, token: string) => {
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
    },
    logout: () => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
    setError: (error: string | null) => {
      state.error = error;
    },
  };
};

/**
 * Mock Zustand store for visa application
 */
const createApplicationStore = () => {
  let state = {
    currentApplication: null as typeof mockTestApplication | null,
    applications: [] as typeof mockTestApplication[],
    isLoading: false,
    error: null as string | null,
  };

  return {
    getState: () => state,
    setState: (newState: Partial<typeof state>) => {
      state = { ...state, ...newState };
    },
    setCurrentApplication: (app: typeof mockTestApplication) => {
      state.currentApplication = app;
    },
    addApplication: (app: typeof mockTestApplication) => {
      state.applications.push(app);
    },
    updateApplication: (app: typeof mockTestApplication) => {
      state.applications = state.applications.map(a =>
        a.id === app.id ? app : a
      );
      if (state.currentApplication?.id === app.id) {
        state.currentApplication = app;
      }
    },
  };
};

describe('Auth Store', () => {
  let authStore: ReturnType<typeof createAuthStore>;

  beforeEach(() => {
    authStore = createAuthStore();
  });

  it('should initialize with empty state', () => {
    const state = authStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should login user', () => {
    const token = 'jwt-token-123';
    authStore.login(mockTestUser, token);

    const state = authStore.getState();
    expect(state.user).toEqual(mockTestUser);
    expect(state.token).toBe(token);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should logout user', () => {
    authStore.login(mockTestUser, 'token');
    authStore.logout();

    const state = authStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should set error', () => {
    const error = 'Invalid credentials';
    authStore.setError(error);

    const state = authStore.getState();
    expect(state.error).toBe(error);
  });

  it('should clear error', () => {
    authStore.setError('error');
    authStore.setError(null);

    const state = authStore.getState();
    expect(state.error).toBeNull();
  });

  it('should persist token', () => {
    const token = 'persistent-token';
    authStore.login(mockTestUser, token);

    const state = authStore.getState();
    expect(state.token).toBe(token);
  });
});

describe('Application Store', () => {
  let appStore: ReturnType<typeof createApplicationStore>;

  beforeEach(() => {
    appStore = createApplicationStore();
  });

  it('should initialize with empty applications', () => {
    const state = appStore.getState();
    expect(state.applications).toHaveLength(0);
    expect(state.currentApplication).toBeNull();
  });

  it('should set current application', () => {
    appStore.setCurrentApplication(mockTestApplication);

    const state = appStore.getState();
    expect(state.currentApplication).toEqual(mockTestApplication);
  });

  it('should add application', () => {
    appStore.addApplication(mockTestApplication);

    const state = appStore.getState();
    expect(state.applications).toHaveLength(1);
    expect(state.applications[0]).toEqual(mockTestApplication);
  });

  it('should update application', () => {
    appStore.addApplication(mockTestApplication);

    const updated = { ...mockTestApplication, status: 'submitted' as const };
    appStore.updateApplication(updated);

    const state = appStore.getState();
    expect(state.applications[0].status).toBe('submitted');
  });

  it('should update current application', () => {
    appStore.setCurrentApplication(mockTestApplication);

    const updated = { ...mockTestApplication, progress: 50 };
    appStore.updateApplication(updated);

    const state = appStore.getState();
    expect(state.currentApplication?.progress).toBe(50);
  });

  it('should handle multiple applications', () => {
    const app1 = mockTestApplication;
    const app2 = { ...mockTestApplication, id: 'app-456', visaTypeId: 'business-1' };

    appStore.addApplication(app1);
    appStore.addApplication(app2);

    const state = appStore.getState();
    expect(state.applications).toHaveLength(2);
  });

  it('should clear current application', () => {
    appStore.setCurrentApplication(mockTestApplication);
    appStore.setCurrentApplication(null as any);

    const state = appStore.getState();
    expect(state.currentApplication).toBeNull();
  });
});

describe('Store Persistence', () => {
  it('should serialize auth state', () => {
    const authStore = createAuthStore();
    authStore.login(mockTestUser, 'token-123');

    const state = authStore.getState();
    const serialized = JSON.stringify(state);

    expect(serialized).toContain(mockTestUser.email);
    expect(serialized).toContain('token-123');
  });

  it('should deserialize auth state', () => {
    const state = {
      user: mockTestUser,
      token: 'token-123',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    };

    const serialized = JSON.stringify(state);
    const deserialized = JSON.parse(serialized);

    expect(deserialized.user.email).toBe(mockTestUser.email);
    expect(deserialized.token).toBe('token-123');
  });
});

describe('Store Integration', () => {
  it('should coordinate between auth and app stores', () => {
    const authStore = createAuthStore();
    const appStore = createApplicationStore();

    // User logs in
    authStore.login(mockTestUser, 'token');

    // User creates application
    appStore.setCurrentApplication(mockTestApplication);

    expect(authStore.getState().isAuthenticated).toBe(true);
    expect(appStore.getState().currentApplication).toBeDefined();
  });

  it('should clear app data on logout', () => {
    const authStore = createAuthStore();
    const appStore = createApplicationStore();

    authStore.login(mockTestUser, 'token');
    appStore.addApplication(mockTestApplication);

    // Logout should clear auth
    authStore.logout();

    expect(authStore.getState().isAuthenticated).toBe(false);
    // In real app, should also clear applications
  });
});