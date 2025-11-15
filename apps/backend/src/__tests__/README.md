# VisaBuddy Backend Tests

## Test Structure

```
src/__tests__/
├── setup.ts                    # Test setup and configuration
├── test-utils.ts               # Original test utilities
├── helpers/
│   └── test-helpers.ts         # Enhanced test helpers
├── utils/                       # Unit tests for utilities
│   ├── db-resilience.test.ts
│   ├── user-friendly-errors.test.ts
│   └── service-fallback.test.ts
├── services/                    # Service tests
├── routes/                      # Route tests
└── integration/                 # Integration tests
    ├── auth-flow.test.ts
    └── service-fallback.test.ts
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- db-resilience.test.ts

# Run in watch mode
npm test -- --watch
```

## Test Utilities

### Test Helpers (`helpers/test-helpers.ts`)

- `createMockRequest()` - Create mock Express request
- `createMockResponse()` - Create mock Express response
- `createMockPrismaClient()` - Create mock Prisma client
- `createTestUser()` - Create test user object
- `createTestApplication()` - Create test application object
- `createTestPayment()` - Create test payment object
- `expectErrorResponse()` - Assert error response structure
- `expectSuccessResponse()` - Assert success response structure

## Writing Tests

### Unit Tests

Test individual functions and utilities:

```typescript
import { getUserFriendlyError } from '../../utils/user-friendly-errors';

describe('getUserFriendlyError', () => {
  it('should convert technical errors', () => {
    const error = new Error('Connection timeout');
    const result = getUserFriendlyError(error);
    expect(result.message).toContain('trouble connecting');
  });
});
```

### Integration Tests

Test complete flows:

```typescript
import request from 'supertest';
import app from '../../index';

describe('Authentication Flow', () => {
  it('should register and login user', async () => {
    // Register
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'SecureP@ss123' });
    
    expect(registerRes.status).toBe(201);
    
    // Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'SecureP@ss123' });
    
    expect(loginRes.status).toBe(200);
  });
});
```

## Test Coverage Goals

- **Unit Tests**: 80%+ coverage for utilities and services
- **Integration Tests**: All critical user flows
- **E2E Tests**: Complete authentication and payment flows

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Mock External Services**: Don't call real APIs in tests
3. **Use Test Helpers**: Leverage helper functions for common patterns
4. **Test Error Cases**: Include both success and failure scenarios
5. **User-Friendly Assertions**: Test that error messages are user-friendly








