# E2E Test Framework

## Overview

End-to-end tests verify complete user flows from start to finish, ensuring all components work together correctly.

## Test Files

- `auth-flow.e2e.test.ts` - Authentication flow tests
- `complete-user-flow.e2e.test.ts` - Complete user journey tests

## Running E2E Tests

```bash
# Run all E2E tests
npm test -- e2e

# Run specific E2E test
npm test -- complete-user-flow.e2e.test.ts
```

## Test Structure

E2E tests should:
1. Test complete user journeys
2. Verify error handling across the flow
3. Test service fallbacks
4. Verify user-friendly error messages
5. Test authentication and authorization

## Prerequisites

- Database must be set up and migrated
- Test environment variables configured
- Services may be mocked or use test instances








