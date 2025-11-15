# VisaBuddy Developer Guide

Comprehensive guide for developers working on the VisaBuddy codebase.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Technology Stack](#technology-stack)
4. [Development Workflow](#development-workflow)
5. [Code Organization](#code-organization)
6. [Key Concepts](#key-concepts)
7. [Adding New Features](#adding-new-features)
8. [Testing](#testing)
9. [Debugging](#debugging)
10. [Best Practices](#best-practices)
11. [Common Patterns](#common-patterns)

---

## Architecture Overview

### System Architecture

VisaBuddy is a monorepo containing three main services:

```
VisaBuddy/
├── apps/
│   ├── backend/          # Express.js API server (Node.js/TypeScript)
│   ├── frontend/         # React Native mobile app
│   └── ai-service/       # FastAPI Python service (RAG)
├── scripts/              # Setup and utility scripts
└── docs/                 # Documentation
```

### Backend Architecture

The backend follows a **layered architecture**:

```
┌─────────────────────────────────────┐
│         Routes (API Endpoints)       │
├─────────────────────────────────────┤
│         Middleware Layer             │
│  (Auth, Validation, Rate Limiting)   │
├─────────────────────────────────────┤
│         Services Layer               │
│  (Business Logic, External APIs)    │
├─────────────────────────────────────┤
│         Data Access Layer            │
│  (Prisma ORM, Database Pool)        │
└─────────────────────────────────────┘
```

### Request Flow

1. **Request** → Express Router
2. **Middleware** → Authentication, Validation, Rate Limiting
3. **Route Handler** → Extracts params, calls service
4. **Service** → Business logic, data processing
5. **Database** → Prisma ORM queries
6. **Response** → Formatted JSON response

---

## Project Structure

### Backend Structure

```
apps/backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── constants.ts    # App constants
│   │   └── env.ts          # Environment validation
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts         # JWT authentication
│   │   ├── validation.ts   # Input validation
│   │   ├── rate-limit.ts   # Rate limiting
│   │   └── logger.ts       # Request/error logging
│   ├── routes/             # API route handlers
│   │   ├── auth.ts         # Authentication routes
│   │   ├── applications.ts # Application routes
│   │   ├── documents.ts    # Document routes
│   │   └── ...
│   ├── services/           # Business logic services
│   │   ├── auth.service.ts
│   │   ├── applications.service.ts
│   │   └── ...
│   ├── utils/              # Utility functions
│   │   ├── errors.ts       # Error handling
│   │   ├── validation.ts  # Validation helpers
│   │   └── response.ts    # Response formatting
│   ├── db.ts              # Prisma client instance
│   └── index.ts           # Application entry point
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
├── __tests__/            # Test files
└── package.json
```

### Key Directories

- **`config/`** - Configuration and constants
- **`middleware/`** - Express middleware functions
- **`routes/`** - API endpoint definitions
- **`services/`** - Business logic (stateless services)
- **`utils/`** - Reusable utility functions
- **`__tests__/`** - Test files (unit, integration, e2e)

---

## Technology Stack

### Backend

- **Runtime:** Node.js >= 20.0.0
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL (Prisma ORM)
- **Cache:** Redis (optional, falls back to in-memory)
- **Authentication:** JWT (jsonwebtoken)
- **Validation:** Zod, express-validator
- **Testing:** Jest, Supertest

### Frontend

- **Framework:** React Native (Expo)
- **Language:** TypeScript
- **State Management:** Context API / Redux (if needed)

### AI Service

- **Framework:** FastAPI (Python)
- **Language:** Python >= 3.10
- **AI:** OpenAI GPT-4
- **RAG:** Vector database for knowledge retrieval

---

## Development Workflow

### 1. Setup Development Environment

```bash
# Clone repository
git clone <repository-url>
cd VisaBuddy

# Install dependencies
npm install
npm run install-all

# Set up environment
./scripts/setup-env.sh  # Linux/macOS
.\scripts\setup-env.ps1  # Windows

# Start database
docker-compose up -d postgres redis

# Run migrations
cd apps/backend
npm run db:migrate
```

### 2. Start Development Servers

```bash
# Terminal 1: Backend
cd apps/backend
npm run dev

# Terminal 2: AI Service
cd apps/ai-service
python -m uvicorn main:app --reload --port 8001

# Terminal 3: Frontend (if needed)
cd apps/frontend
npm run dev
```

### 3. Development Commands

```bash
# Backend
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
npm run lint         # Lint code
npm run format       # Format code
```

---

## Code Organization

### Services

Services contain business logic and are **stateless**. They should:

- Be pure functions (no side effects where possible)
- Handle errors gracefully
- Use dependency injection for testability
- Return typed results

**Example:**
```typescript
// services/applications.service.ts
export class ApplicationsService {
  static async createApplication(
    userId: string,
    data: CreateApplicationData
  ): Promise<Application> {
    // Business logic here
    const application = await prisma.visaApplication.create({
      data: {
        userId,
        ...data,
      },
    });
    return application;
  }
}
```

### Routes

Routes are thin wrappers that:

- Extract request data
- Call service methods
- Format responses
- Handle errors

**Example:**
```typescript
// routes/applications.ts
router.post("/", authenticateToken, async (req, res, next) => {
  try {
    const application = await ApplicationsService.createApplication(
      req.userId!,
      req.body
    );
    res.status(201).json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
});
```

### Middleware

Middleware functions handle cross-cutting concerns:

- **Authentication** - Verify JWT tokens
- **Validation** - Validate request data
- **Rate Limiting** - Prevent abuse
- **Logging** - Log requests and errors
- **Security** - Input sanitization, CORS, CSRF

**Example:**
```typescript
// middleware/auth.ts
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // Verify token...
  next();
};
```

---

## Key Concepts

### Authentication & Authorization

- **JWT Tokens** - Stateless authentication
- **Token Expiration** - 7 days default
- **Role-Based Access** - `user`, `admin` roles
- **Protected Routes** - Use `authenticateToken` middleware

### Database Access

- **Prisma ORM** - Type-safe database queries
- **Connection Pooling** - Managed by Prisma
- **Migrations** - Version-controlled schema changes
- **Resilience** - Retry logic and health checks

### Caching

- **Redis** - Distributed caching (production)
- **In-Memory** - Fallback for development
- **Cache Invalidation** - Automatic on data updates
- **TTL** - Time-to-live for cache entries

### Error Handling

- **Custom Error Classes** - `ApiError` for API errors
- **Global Error Handler** - Catches all errors
- **User-Friendly Messages** - Convert technical errors
- **Error Logging** - Logs with sensitive data redaction

### Rate Limiting

- **Per-IP Limits** - General API routes
- **Per-User Limits** - Chat messages
- **Stricter Limits** - Authentication routes
- **Redis-Based** - Distributed rate limiting

---

## Adding New Features

### Step 1: Database Schema

Update `prisma/schema.prisma`:

```prisma
model NewFeature {
  id        String   @id @default(cuid())
  userId    String
  data      String
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId])
}
```

Run migration:
```bash
npm run db:generate
npm run db:migrate
```

### Step 2: Create Service

Create `services/new-feature.service.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class NewFeatureService {
  static async createFeature(
    userId: string,
    data: CreateFeatureData
  ): Promise<Feature> {
    return await prisma.newFeature.create({
      data: {
        userId,
        ...data,
      },
    });
  }
  
  static async getFeature(id: string, userId: string): Promise<Feature> {
    const feature = await prisma.newFeature.findFirst({
      where: { id, userId },
    });
    
    if (!feature) {
      throw new ApiError(404, "Feature not found");
    }
    
    return feature;
  }
}
```

### Step 3: Create Routes

Create `routes/new-feature.ts`:

```typescript
import express from "express";
import { authenticateToken } from "../middleware/auth";
import { NewFeatureService } from "../services/new-feature.service";
import { validateRequest } from "../middleware/request-validation";

const router = express.Router();

router.use(authenticateToken);

router.post(
  "/",
  validateRequest({
    body: {
      required: ["data"],
    },
  }),
  async (req, res, next) => {
    try {
      const feature = await NewFeatureService.createFeature(
        req.userId!,
        req.body
      );
      res.status(201).json({
        success: true,
        data: feature,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/:id", async (req, res, next) => {
  try {
    const feature = await NewFeatureService.getFeature(
      req.params.id,
      req.userId!
    );
    res.json({
      success: true,
      data: feature,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Step 4: Register Routes

Add to `index.ts`:

```typescript
import newFeatureRoutes from "./routes/new-feature";

app.use("/api/new-feature", newFeatureRoutes);
```

### Step 5: Write Tests

Create `__tests__/services/new-feature.service.test.ts`:

```typescript
import { NewFeatureService } from "../../src/services/new-feature.service";

describe("NewFeatureService", () => {
  test("should create feature", async () => {
    const feature = await NewFeatureService.createFeature(
      "user-id",
      { data: "test" }
    );
    expect(feature).toBeDefined();
    expect(feature.data).toBe("test");
  });
});
```

---

## Testing

### Test Structure

```
__tests__/
├── unit/              # Unit tests (services, utils)
├── integration/       # Integration tests (routes + services)
├── e2e/              # End-to-end tests (full flows)
└── helpers/           # Test utilities
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific file
npm test -- new-feature.service.test.ts
```

### Writing Tests

**Unit Test Example:**
```typescript
import { NewFeatureService } from "../services/new-feature.service";

describe("NewFeatureService", () => {
  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup test data
  });

  test("should create feature", async () => {
    const feature = await NewFeatureService.createFeature(
      "user-id",
      { data: "test" }
    );
    expect(feature.data).toBe("test");
  });
});
```

**Integration Test Example:**
```typescript
import request from "supertest";
import app from "../index";

describe("POST /api/new-feature", () => {
  test("should create feature with valid token", async () => {
    const token = generateTestToken("user-id");
    const response = await request(app)
      .post("/api/new-feature")
      .set("Authorization", `Bearer ${token}`)
      .send({ data: "test" });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

---

## Debugging

### Logging

Use structured logging:

```typescript
import { logInfo, logError, logWarn } from "../middleware/logger";

logInfo("Feature created", {
  userId: "user-id",
  featureId: "feature-id",
});

logError("Feature creation failed", {
  userId: "user-id",
  error: error.message,
});
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npm run dev
```

### Database Queries

Prisma logs queries in development:

```typescript
// In db.ts
export const db = new PrismaClient({
  log: process.env.NODE_ENV === "development" 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});
```

### Error Stack Traces

In development, errors include stack traces. In production, they're sanitized.

---

## Best Practices

### 1. Type Safety

Always use TypeScript types:

```typescript
interface CreateApplicationData {
  countryId: string;
  visaTypeId: string;
  notes?: string;
}

export class ApplicationsService {
  static async createApplication(
    userId: string,
    data: CreateApplicationData
  ): Promise<Application> {
    // ...
  }
}
```

### 2. Error Handling

Use custom error classes:

```typescript
import { ApiError } from "../utils/errors";

if (!user) {
  throw new ApiError(404, "User not found");
}
```

### 3. Input Validation

Always validate input:

```typescript
import { validateRequest } from "../middleware/request-validation";

router.post(
  "/",
  validateRequest({
    body: {
      required: ["email", "password"],
      validate: {
        email: (val) => isValidEmail(val),
      },
    },
  }),
  handler
);
```

### 4. Security

- Never expose sensitive data in responses
- Always sanitize user input
- Use parameterized queries (Prisma handles this)
- Validate file uploads
- Rate limit sensitive endpoints

### 5. Performance

- Use database indexes
- Cache frequently accessed data
- Use connection pooling
- Optimize queries (avoid N+1)
- Use pagination for large datasets

### 6. Code Organization

- Keep services stateless
- Single responsibility principle
- DRY (Don't Repeat Yourself)
- Use utility functions for common operations
- Document complex logic

---

## Common Patterns

### Service Pattern

```typescript
export class FeatureService {
  static async create(data: CreateData): Promise<Feature> {
    // Business logic
  }
  
  static async getById(id: string): Promise<Feature> {
    // Fetch logic
  }
  
  static async update(id: string, data: UpdateData): Promise<Feature> {
    // Update logic
  }
  
  static async delete(id: string): Promise<void> {
    // Delete logic
  }
}
```

### Route Pattern

```typescript
const router = express.Router();

router.use(authenticateToken);

router.post(
  "/",
  validateRequest({ body: { required: ["field"] } }),
  async (req, res, next) => {
    try {
      const result = await Service.create(req.userId!, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);
```

### Error Handling Pattern

```typescript
try {
  // Operation
} catch (error) {
  if (error instanceof ApiError) {
    throw error; // Re-throw API errors
  }
  // Handle unexpected errors
  throw new ApiError(500, "Internal server error");
}
```

### Database Query Pattern

```typescript
// Use Prisma's type-safe queries
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    applications: true,
  },
});

// Handle not found
if (!user) {
  throw new ApiError(404, "User not found");
}
```

### Caching Pattern

```typescript
import { getCacheService } from "../services/cache.service.optimized";

const cache = getCacheService();

// Get from cache or database
const cached = await cache.get<User>(`user:${userId}`);
if (cached) {
  return cached;
}

const user = await prisma.user.findUnique({ where: { id: userId } });
await cache.set(`user:${userId}`, user, 3600); // 1 hour TTL
return user;
```

---

## Environment Variables

### Required

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (32+ chars)
- `NODE_ENV` - Environment (development, production)
- `PORT` - Server port (default: 3000)
- `CORS_ORIGIN` - Allowed CORS origins

### Optional

- `REDIS_URL` - Redis connection (recommended for production)
- `OPENAI_API_KEY` - OpenAI API key (for AI chat)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `FIREBASE_PROJECT_ID` - Firebase Storage
- Payment gateway credentials
- Email service credentials

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for full list.

---

## Database Migrations

### Creating Migrations

```bash
# After changing schema.prisma
npm run db:generate
npm run db:migrate -- --name add_new_feature
```

### Migration Best Practices

- Always review generated migrations
- Test migrations on development first
- Never edit existing migrations
- Use transactions for data migrations
- Backup database before migrations in production

---

## Code Style

### TypeScript

- Use strict mode
- Prefer `interface` over `type` for objects
- Use `const` assertions where appropriate
- Avoid `any` type

### Naming Conventions

- **Files:** `kebab-case.ts`
- **Classes:** `PascalCase`
- **Functions/Variables:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Interfaces:** `PascalCase` (often with `I` prefix for clarity)

### Formatting

```bash
npm run format  # Format code
npm run lint    # Lint code
```

---

## Contributing

### Git Workflow

1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes
3. Write tests
4. Run tests: `npm test`
5. Commit: `git commit -m "Add new feature"`
6. Push: `git push origin feature/new-feature`
7. Create pull request

### Commit Messages

Use conventional commits:

```
feat: Add new feature
fix: Fix bug in authentication
docs: Update API documentation
test: Add tests for new feature
refactor: Refactor service layer
```

---

## Resources

- [API Documentation](./API_DOCUMENTATION.md)
- [Setup Guide](./SETUP_GUIDE.md)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

**Last Updated:** 2024  
**Version:** 1.0.0








