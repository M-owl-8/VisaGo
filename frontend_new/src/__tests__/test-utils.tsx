import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';

// Initialize i18n for tests
i18n.init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'common.loading': 'Loading',
        'common.error': 'Error',
        'auth.login': 'Login',
        'auth.signup': 'Sign Up',
      },
    },
  },
});

/**
 * Mock user for testing
 */
export const mockTestUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  emailVerified: false,
};

export const mockTestAdmin = {
  ...mockTestUser,
  id: 'admin-123',
  email: 'admin@example.com',
};

/**
 * Mock visa application
 */
export const mockTestApplication = {
  id: 'app-123',
  userId: 'test-user-123',
  countryId: 'spain-1',
  visaTypeId: 'tourist-1',
  status: 'draft',
  progress: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Mock countries
 */
export const mockTestCountries = [
  {
    id: 'spain-1',
    name: 'Spain',
    code: 'ES',
    flag: '🇪🇸',
  },
  {
    id: 'usa-1',
    name: 'United States',
    code: 'US',
    flag: '🇺🇸',
  },
  {
    id: 'japan-1',
    name: 'Japan',
    code: 'JP',
    flag: '🇯🇵',
  },
];

/**
 * Mock visa types
 */
export const mockTestVisaTypes = [
  {
    id: 'tourist-1',
    name: 'Tourist Visa',
    countryId: 'spain-1',
    fee: 100,
    processingDays: 5,
    validity: '90 days',
    requirements: ['passport', 'bank_statement'],
  },
  {
    id: 'business-1',
    name: 'Business Visa',
    countryId: 'spain-1',
    fee: 200,
    processingDays: 10,
    validity: '1 year',
    requirements: ['passport', 'employment_letter', 'bank_statement'],
  },
];

/**
 * Custom render function with providers
 */
export const renderWithProviders = (
  component: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );

  return render(component, { wrapper: Wrapper, ...options });
};

/**
 * Mock API responses
 */
export const mockApiResponses = {
  login: {
    token: 'mock-jwt-token-123',
    user: mockTestUser,
  },
  signup: {
    token: 'mock-jwt-token-123',
    user: mockTestUser,
  },
  getCountries: {
    countries: mockTestCountries,
  },
  getVisaTypes: {
    visaTypes: mockTestVisaTypes,
  },
  getApplications: {
    applications: [mockTestApplication],
  },
  createApplication: {
    application: mockTestApplication,
  },
  getMetrics: {
    metrics: {
      totalSignups: 1250,
      totalVisaSelections: 980,
      totalPayments: 450,
      totalRevenue: 45000,
      totalDocuments: 1200,
      totalMessages: 3400,
      activeUsers: 340,
      conversionRate: 36,
    },
  },
};

/**
 * Create mock navigation
 */
export const createMockNavigation = () => ({
  navigate: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  popToTop: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
  setParams: jest.fn(),
});

/**
 * Create mock route
 */
export const createMockRoute = (params = {}) => ({
  params,
  name: 'TestScreen',
  key: 'test-key',
});

/**
 * Mock axios instance
 */
export const createMockAxios = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
});

/**
 * Wait for async operations
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Assert screen renders
 */
export const assertScreenRenders = (element: any) => {
  expect(element).toBeTruthy();
};

/**
 * Assert button is pressable
 */
export const assertButtonPressable = (button: any) => {
  expect(button).toBeTruthy();
  expect(button.props.onPress || button.props.onClick).toBeDefined();
};

/**
 * Simulate button press
 */
export const pressButton = (button: any) => {
  if (button.props.onPress) {
    button.props.onPress();
  } else if (button.props.onClick) {
    button.props.onClick();
  }
};

/**
 * Get text from element
 */
export const getElementText = (element: any): string => {
  if (!element) return '';
  if (typeof element.props.children === 'string') {
    return element.props.children;
  }
  if (Array.isArray(element.props.children)) {
    return element.props.children
      .map(child => (typeof child === 'string' ? child : getElementText(child)))
      .join('');
  }
  return '';
};