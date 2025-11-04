/**
 * K6 Load Testing Script
 * Run: k6 run load-test-k6.js
 * 
 * Key metrics:
 * - Response time p95 < 500ms
 * - Response time p99 < 1000ms
 * - Error rate < 0.1%
 * - Throughput: >1000 requests/sec
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const registrationTime = new Trend('registration_time');
const loginTime = new Trend('login_time');
const apiTime = new Trend('api_response_time');
const activeUsers = new Gauge('active_users');
const requestsPerSec = new Counter('requests');

// Test configuration
export const options = {
  stages: [
    // Warm up
    { duration: '1m', target: 50 },
    // Ramp up
    { duration: '2m', target: 500 },
    // Peak load
    { duration: '3m', target: 1000 },
    // Soak test
    { duration: '2m', target: 1000 },
    // Cool down
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.001'], // Error rate < 0.1%
    response_time: [
      'p(95)<500', // p95 < 500ms
      'p(99)<1000', // p99 < 1000ms
      'avg<300', // average < 300ms
    ],
    registration_time: ['p(95)<2000'],
    login_time: ['p(95)<500'],
    'http_req_failed': ['rate<0.01'], // HTTP errors < 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
let authToken = '';
let userId = '';

/**
 * Setup function - runs once before test
 */
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  
  // Health check
  const res = http.get(`${BASE_URL}/api/health`);
  check(res, {
    'health check passed': (r) => r.status === 200,
  });

  return {};
}

/**
 * Main test function
 */
export default function (data) {
  activeUsers.add(1);
  
  group('1. Public Content Browsing', () => {
    // Get countries list
    const countriesRes = http.get(`${BASE_URL}/api/countries`, {
      tags: { name: 'GetCountries' },
    });

    check(countriesRes, {
      'get countries status': (r) => r.status === 200,
      'countries have data': (r) => r.body.includes('"id"'),
    });

    responseTime.add(countriesRes.timings.duration);
    requestsPerSec.add(1);
    errorRate.add(countriesRes.status !== 200);

    sleep(1);
  });

  group('2. Authentication', () => {
    // Registration
    const uniqueEmail = `user_${Date.now()}_${Math.random()}@test.com`;
    const registerRes = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({
        email: uniqueEmail,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'Register' },
      }
    );

    check(registerRes, {
      'register status': (r) => r.status === 201 || r.status === 400, // 400 if already exists
      'register returns token': (r) => r.status !== 201 || r.body.includes('token'),
    });

    registrationTime.add(registerRes.timings.duration);
    errorRate.add(registerRes.status > 299);

    // Extract token if successful
    if (registerRes.status === 201) {
      try {
        const body = JSON.parse(registerRes.body);
        authToken = body.token;
        userId = body.user.id;
      } catch (e) {
        console.error('Failed to parse register response:', e);
      }
    }

    // Login
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: uniqueEmail,
        password: 'TestPassword123!',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'Login' },
      }
    );

    check(loginRes, {
      'login status': (r) => r.status === 200,
      'login returns token': (r) => r.body.includes('token'),
    });

    loginTime.add(loginRes.timings.duration);
    errorRate.add(loginRes.status !== 200);

    if (loginRes.status === 200) {
      try {
        const body = JSON.parse(loginRes.body);
        authToken = body.token;
      } catch (e) {
        console.error('Failed to parse login response:', e);
      }
    }

    sleep(1);
  });

  // Authenticated requests require token
  if (authToken) {
    const headers = {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    };

    group('3. Application Management', () => {
      // Create application
      const createAppRes = http.post(
        `${BASE_URL}/api/applications`,
        JSON.stringify({
          countryId: 'clx123abc',
          visaTypeId: 'clx456def',
        }),
        { headers, tags: { name: 'CreateApplication' } }
      );

      check(createAppRes, {
        'create app status': (r) => r.status === 201 || r.status === 400 || r.status === 401,
      });

      apiTime.add(createAppRes.timings.duration);
      errorRate.add(createAppRes.status > 299);

      // Get applications list
      const listAppsRes = http.get(
        `${BASE_URL}/api/applications?page=1&pageSize=20`,
        { headers, tags: { name: 'ListApplications' } }
      );

      check(listAppsRes, {
        'list apps status': (r) => r.status === 200 || r.status === 401,
        'list apps has data': (r) => r.body.includes('data'),
      });

      apiTime.add(listAppsRes.timings.duration);
      errorRate.add(listAppsRes.status > 299);

      sleep(1);
    });

    group('4. Payment Operations', () => {
      // Initiate payment
      const paymentRes = http.post(
        `${BASE_URL}/api/payments/payme`,
        JSON.stringify({
          applicationId: 'clx789ghi',
          amount: 100,
          currency: 'USD',
        }),
        { headers, tags: { name: 'InitiatePayment' } }
      );

      check(paymentRes, {
        'payment status': (r) =>
          r.status === 200 || r.status === 201 || r.status === 400 || r.status === 401,
      });

      apiTime.add(paymentRes.timings.duration);
      errorRate.add(paymentRes.status > 299);

      sleep(1);
    });

    group('5. Chat Operations', () => {
      // Create chat session
      const createSessionRes = http.post(
        `${BASE_URL}/api/chat/sessions`,
        JSON.stringify({
          applicationId: 'clx789ghi',
        }),
        { headers, tags: { name: 'CreateChatSession' } }
      );

      let sessionId = null;
      if (createSessionRes.status === 201) {
        try {
          const body = JSON.parse(createSessionRes.body);
          sessionId = body.id;
        } catch (e) {
          console.error('Failed to parse session response:', e);
        }
      }

      check(createSessionRes, {
        'create session status': (r) =>
          r.status === 201 || r.status === 400 || r.status === 401,
      });

      apiTime.add(createSessionRes.timings.duration);

      // Send message if session created
      if (sessionId) {
        const messageRes = http.post(
          `${BASE_URL}/api/chat/sessions/${sessionId}/messages`,
          JSON.stringify({
            content: 'What are the visa requirements?',
          }),
          { headers, tags: { name: 'SendChatMessage' } }
        );

        check(messageRes, {
          'send message status': (r) => r.status === 201 || r.status === 401,
        });

        apiTime.add(messageRes.timings.duration);

        // Get messages
        const getMessagesRes = http.get(
          `${BASE_URL}/api/chat/sessions/${sessionId}/messages`,
          { headers, tags: { name: 'GetChatMessages' } }
        );

        check(getMessagesRes, {
          'get messages status': (r) => r.status === 200 || r.status === 401,
        });

        apiTime.add(getMessagesRes.timings.duration);
      }

      sleep(1);
    });

    group('6. Analytics', () => {
      // Get dashboard analytics
      const analyticsRes = http.get(`${BASE_URL}/api/analytics/dashboard`, {
        headers,
        tags: { name: 'GetAnalytics' },
      });

      check(analyticsRes, {
        'analytics status': (r) => r.status === 200 || r.status === 401,
      });

      apiTime.add(analyticsRes.timings.duration);
      errorRate.add(analyticsRes.status > 299);

      sleep(1);
    });
  }

  // Random sleep between requests (0-2 seconds)
  sleep(Math.random() * 2);
}

/**
 * Teardown function - runs after test
 */
export function teardown(data) {
  console.log('Load test completed');
  console.log('Check k6 output for detailed metrics');
}

/**
 * Custom function to handle errors gracefully
 */
function safeCheck(res, name, checks) {
  try {
    const result = check(res, checks);
    if (!result) {
      errorRate.add(1);
    }
    return result;
  } catch (e) {
    console.error(`Check failed: ${name}`, e);
    errorRate.add(1);
    return false;
  }
}