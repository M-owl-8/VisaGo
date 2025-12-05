# VisaBuddy Codebase - Comprehensive Analysis

**Generated:** January 2025  
**Status:** Complete System Analysis

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Backend Overview](#backend-overview)
3. [Database & Models](#database--models)
4. [AI & Models](#ai--models)
5. [Visa Rules, RAG, Sync](#visa-rules-rag-sync)
6. [User Flows](#user-flows)
7. [Admin & Internal Tools](#admin--internal-tools)
8. [Deployment & Environment](#deployment--environment)
9. [Current Status & TODOs](#current-status--todos)

---

## High-Level Architecture

### Monorepo Structure

VisaBuddy is a **monorepo** managed with npm workspaces:

```
VisaBuddy/
├── apps/
│   ├── backend/          # Express.js/TypeScript REST API (Port 3000)
│   ├── ai-service/        # FastAPI/Python AI service (Port 8001)
│   ├── web/              # Next.js web admin panel
│   └── frontend_new/     # React Native mobile app (iOS/Android)
├── packages/             # Shared libraries (if any)
├── scripts/             # Setup and utility scripts
└── deployment/          # Docker and deployment configs
```

### Technologies

**Backend:**
- **Framework:** Express.js (TypeScript)
- **Database:** PostgreSQL (via Prisma ORM)
- **Cache:** Redis (via ioredis)
- **Queue:** Bull (Redis-backed job queue)
- **Storage:** Firebase Storage (with local fallback)
- **Auth:** JWT + Google OAuth

**AI Service:**
- **Framework:** FastAPI (Python 3.10+)
- **AI Models:** 
  - OpenAI GPT-4o-mini (checklist generation)
  - DeepSeek-R1 via Together.ai (chat)
- **RAG:** Pinecone vector database (with cache fallback)
- **Embeddings:** OpenAI text-embedding-3-small

**Mobile App:**
- **Framework:** React Native (Expo)
- **State:** Zustand
- **Navigation:** React Navigation
- **API Client:** Axios

**Web App:**
- **Framework:** Next.js 14
- **UI:** Tailwind CSS + Framer Motion
- **State:** Zustand

---

## Backend Overview

### Entry Point

**File:** `apps/backend/src/index.ts`

The backend server initializes:
1. Express app with middleware (CORS, Helmet, rate limiting)
2. Database connection pool (PostgreSQL)
3. Redis cache service
4. Storage adapter (Firebase or local)
5. AI services (OpenAI)
6. Notification queues (Bull)
7. Embassy sync scheduler
8. Payment reconciliation jobs

### Main Modules & Services

**Routes** (`apps/backend/src/routes/`):
- `auth.ts` - Authentication (login, register, Google OAuth, password reset)
- `chat.ts` - AI chat endpoints (`POST /api/chat`)
- `document-checklist.ts` - Checklist generation (`GET /api/document-checklist/:applicationId`)
- `documents.ts` - Document upload/management (`POST /api/documents/upload`)
- `applications.ts` - Visa application CRUD
- `payments-complete.ts` - Payment processing (Payme, Click, Uzum, Stripe)
- `admin.ts` - Admin dashboard endpoints
- `analytics.ts` - Analytics and metrics
- `countries.ts` - Country data
- `visa-types.ts` - Visa type data
- `forms.ts` - Form filling/submission
- `doc-check.ts` - Document checking (Phase 3)
- `notifications.ts` - Push notifications
- `users.ts` - User management
- `health.ts` - Health checks
- `monitoring.ts` - Performance monitoring
- `security.ts` - Security endpoints

**Key Services** (`apps/backend/src/services/`):

1. **AI Services:**
   - `ai-openai.service.ts` - GPT-4 checklist generation (hybrid + legacy modes)
   - `deepseek.ts` - DeepSeek-R1 chat via Together.ai
   - `chat.service.ts` - Chat orchestration (calls AI service or backend OpenAI)
   - `chat-enhanced.service.ts` - Enhanced chat with streaming

2. **Document Services:**
   - `document-checklist.service.ts` - Checklist generation with DB caching
   - `document-validation.service.ts` - AI document validation
   - `document-classifier.service.ts` - Document type classification
   - `documents.service.ts` - Document CRUD

3. **Visa Rules:**
   - `visa-rules.service.ts` - Rule set management
   - `visa-checklist-engine.service.ts` - Rule-based checklist engine
   - `checklist-rules.service.ts` - Rule parsing and application
   - `embassy-sync-job.service.ts` - Bull queue processor for embassy sync
   - `embassy-sync-scheduler.service.ts` - Cron scheduler (daily at 2 AM UTC)
   - `embassy-crawler.service.ts` - Web scraping (Cheerio)
   - `ai-embassy-extractor.service.ts` - GPT-4 extraction from HTML

4. **Application Services:**
   - `applications.service.ts` - Application CRUD and progress tracking
   - `ai-application.service.ts` - AI context building
   - `ai-context.service.ts` - User context aggregation

5. **Queue Services:**
   - `notification-scheduler.service.ts` - Bull queues for notifications
   - `embassy-sync-job.service.ts` - Embassy sync queue
   - `payment-reconciliation.service.ts` - Daily payment reconciliation

6. **Storage:**
   - `firebase-storage.service.ts` - Firebase Storage integration
   - `local-storage.service.ts` - Local file storage fallback
   - `storage-adapter.ts` - Unified storage interface

7. **Cache:**
   - `cache.service.optimized.ts` - Redis + in-memory cache
   - `cache-invalidation.service.ts` - Smart cache invalidation

### API Endpoints Summary

**Authentication:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

**Chat:**
- `POST /api/chat` - Send message, get AI response (primary)
- `POST /api/chat/send` - Legacy endpoint (redirects to `/api/chat`)
- `GET /api/chat/sessions` - List chat sessions
- `GET /api/chat/sessions/:sessionId` - Get session messages

**Document Checklist:**
- `GET /api/document-checklist/:applicationId` - Get/Generate checklist
- `PUT /api/document-checklist/:applicationId/items/:itemId` - Update item status

**Documents:**
- `POST /api/documents/upload` - Upload document (multipart/form-data)
- `GET /api/documents/:documentId` - Get document metadata
- `DELETE /api/documents/:documentId` - Delete document

**Applications:**
- `POST /api/applications` - Create application
- `GET /api/applications` - List user's applications
- `GET /api/applications/:id` - Get application details
- `PATCH /api/applications/:id` - Update application

**Payments:**
- `POST /api/payments/create` - Create payment
- `POST /api/payments/webhook/:gateway` - Webhook handlers
- `GET /api/payments/:id` - Get payment status

**Admin:**
- `GET /api/admin/dashboard` - Dashboard metrics
- `GET /api/admin/users` - List users
- `GET /api/admin/applications` - List applications
- `GET /api/admin/visa-rules` - List visa rule sets
- `POST /api/admin/embassy-sync/trigger` - Trigger manual sync

---

## Database & Models

### Prisma Schema

**File:** `apps/backend/prisma/schema.prisma`

**Key Models:**

1. **User & Auth:**
   - `User` - User accounts (email, Google ID, preferences)
   - `UserPreferences` - Notification preferences
   - `ActivityLog` - User activity tracking

2. **Visa Applications:**
   - `VisaApplication` - Main application entity
   - `Application` - Alternative application model (used for checklist)
   - `Checkpoint` - Application progress checkpoints
   - `Country` - Supported countries
   - `VisaType` - Visa types per country

3. **Documents:**
   - `UserDocument` - Uploaded documents
   - `DocumentType` - Document type definitions
   - `DocumentChecklist` - Stored checklist (JSON in `checklistData`)
   - `DocumentCheckResult` - Phase 3 document check results

4. **AI & RAG:**
   - `Document` - Knowledge base documents
   - `RAGChunk` - Chunked documents for RAG
   - `ChatSession` - Chat sessions
   - `ChatMessage` - Chat messages
   - `AIUsageMetrics` - AI usage tracking

5. **Visa Rules:**
   - `EmbassySource` - Embassy URLs to scrape
   - `VisaRuleSet` - Extracted visa rules (JSON)
   - `VisaRuleVersion` - Version history

6. **Payments:**
   - `Payment` - Payment records
   - `Refund` - Refund records
   - `WebhookIdempotency` - Webhook deduplication

7. **Notifications:**
   - `EmailLog` - Email delivery logs
   - `DeviceToken` - FCM device tokens
   - `NotificationLog` - Push notification logs

8. **Analytics:**
   - `AnalyticsEvent` - Event tracking
   - `DailyMetrics` - Aggregated daily metrics

### Important Relationships

- `User` → `VisaApplication[]` (one-to-many)
- `VisaApplication` → `UserDocument[]` (one-to-many)
- `VisaApplication` → `Checkpoint[]` (one-to-many)
- `Application` → `DocumentChecklist` (one-to-one)
- `EmbassySource` → `VisaRuleSet[]` (one-to-many)
- `VisaRuleSet` → `VisaRuleVersion[]` (one-to-many)
- `ChatSession` → `ChatMessage[]` (one-to-many)

### Database Configuration

- **Production:** PostgreSQL (Railway)
- **Development:** SQLite or PostgreSQL (configurable via `DATABASE_URL`)
- **Migrations:** Prisma Migrate
- **Connection Pooling:** Custom pool service (`db-pool.service.ts`)

---

## AI & Models

### OpenAI Integration

**File:** `apps/backend/src/services/ai-openai.service.ts`

**Model:** `gpt-4o-mini` (configurable via `OPENAI_MODEL` env var)

**Primary Use Cases:**

1. **Document Checklist Generation** (`generateChecklist()`):
   - **Hybrid Mode:** Rule engine decides documents, GPT-4 enriches with names/descriptions (EN/UZ/RU)
   - **Legacy Mode:** GPT-4 decides everything (for unsupported countries)
   - **Supported Countries:** US, Canada, UK, Australia, Spain, Germany, Japan, UAE
   - **Output Format:** JSON with multilingual fields
   - **Retry Logic:** Up to 2 attempts with validation
   - **Fallback:** Rule-based minimal checklist if GPT fails

2. **Embassy Rule Extraction** (`ai-embassy-extractor.service.ts`):
   - Extracts structured visa rules from embassy HTML
   - Outputs JSON matching `VisaRuleSet` schema

**Configuration:**
- `OPENAI_API_KEY` - Required
- `OPENAI_MODEL` - Default: `gpt-4o-mini`
- `OPENAI_MAX_TOKENS` - Default: 2000
- Timeout: 35 seconds

### DeepSeek Integration

**File:** `apps/backend/src/services/deepseek.ts`  
**File:** `apps/ai-service/services/deepseek.py`

**Model:** `deepseek-ai/DeepSeek-R1` (via Together.ai)

**Primary Use Case:** Chat assistant responses

**Configuration:**
- `DEEPSEEK_API_KEY` - Together.ai API key
- Timeout: 15 seconds (optimized for speed)
- Max tokens: 500 (bounded responses)
- Temperature: 0.5

**Flow:**
1. Mobile app → Backend `/api/chat`
2. Backend → AI Service `/api/chat` (or direct OpenAI fallback)
3. AI Service → DeepSeek via Together.ai
4. Response includes RAG sources if available

### AI Service (Python)

**File:** `apps/ai-service/main.py`

**Endpoints:**
- `POST /api/chat` - Chat with RAG
- `POST /api/checklist/generate` - Checklist generation (calls backend)
- `POST /api/visa-probability` - Visa probability estimate
- `GET /api/rag/status` - RAG service status
- `POST /api/rag/validate` - RAG validation

**RAG Service** (`apps/ai-service/services/rag.py`):
- **Vector DB:** Pinecone (index: `visabuddy-visa-kb`)
- **Embeddings:** OpenAI text-embedding-3-small (1536 dimensions)
- **Fallback:** In-memory cache if Pinecone unavailable
- **Chunking:** Paragraph-based (500 chars, 100 overlap)

**Knowledge Base:**
- Source: `apps/ai-service/data/visa_kb.json`
- Ingested via `kb_ingestor.py`
- Chunked via `chunker.py`

### Model Selection Logic

**Checklist Generation:**
- Always uses OpenAI GPT-4o-mini
- Model name from `OPENAI_MODEL` env var (default: `gpt-4o-mini`)

**Chat:**
- Primary: DeepSeek-R1 (via Together.ai)
- Fallback: OpenAI GPT-4 (if DeepSeek unavailable)
- Fallback: Static responses (if both unavailable)

**RAG:**
- Embeddings: OpenAI text-embedding-3-small
- Vector search: Pinecone (or cache fallback)

### AI Usage Tracking

- **Database:** `AIUsageMetrics` table (daily aggregation)
- **Tracking:** Token usage, cost, response times
- **Service:** `usage-tracking.service.ts`

---

## Visa Rules, RAG, Sync

### Embassy Sync Pipeline

**Architecture:**

1. **Embassy Sources** (`EmbassySource` model):
   - Stores embassy URLs, country codes, visa types
   - Tracks last fetch time, status, priority
   - Seeded via `scripts/seed-embassy-sources.ts`

2. **Sync Trigger:**
   - **Manual:** `POST /api/admin/embassy-sync/trigger`
   - **Automatic:** Daily at 2 AM UTC (configurable via `EMBASSY_SYNC_CRON`)

3. **Sync Process** (`embassy-sync-job.service.ts`):
   - Bull queue: `embassy-sync`
   - Job processor:
     a. Fetch HTML from embassy URL (Cheerio)
     b. Extract rules via GPT-4 (`ai-embassy-extractor.service.ts`)
     c. Save `VisaRuleSet` + `VisaRuleVersion`
     d. Update source status

4. **Rule Storage:**
   - `VisaRuleSet.data` - JSON structure with documents, requirements, fees
   - `VisaRuleVersion` - Version history for audit

### Rule-Based Checklist Engine

**File:** `apps/backend/src/services/checklist-rules.service.ts`

**Hybrid Mode Flow:**

1. Check if rule set exists for country+visa type
2. Build base checklist from rules:
   - Base documents (always required)
   - Conditional documents (based on user context)
   - Risk-based documents (if risk score high)
3. Send base checklist to GPT-4 for enrichment only
4. GPT-4 adds names, descriptions, whereToObtain (EN/UZ/RU)
5. Validate GPT response matches base checklist exactly
6. Return enriched checklist

**Rule Set Structure:**
```json
{
  "baseDocuments": ["passport", "bank_statement", ...],
  "conditionalDocuments": [
    {
      "documentType": "sponsor_bank_statement",
      "condition": "sponsorType !== 'self'"
    }
  ],
  "riskBasedDocuments": [
    {
      "documentType": "refusal_explanation_letter",
      "condition": "previousRefusals === true"
    }
  ]
}
```

### RAG (Retrieval-Augmented Generation)

**Purpose:** Enhance chat responses with knowledge base context

**Components:**

1. **Knowledge Base** (`apps/ai-service/data/visa_kb.json`):
   - Structured visa information
   - Country-specific requirements
   - Document guides

2. **Chunking** (`chunker.py`):
   - Paragraph-based (500 chars, 100 overlap)
   - Preserves metadata (country, visa type)

3. **Embeddings** (`embeddings.py`):
   - OpenAI text-embedding-3-small
   - 1536 dimensions

4. **Vector Search** (`rag.py`):
   - Pinecone index: `visabuddy-visa-kb`
   - Top-K retrieval (default: 5)
   - Cosine similarity

5. **Fallback:**
   - In-memory cache if Pinecone unavailable
   - Text-based search if embeddings unavailable

**Usage in Chat:**
- Query → Embed → Search Pinecone → Retrieve top chunks → Inject into GPT prompt

### Document Chunking & Storage

**RAG Chunks:**
- Stored in `RAGChunk` table (PostgreSQL)
- Each chunk has embedding (JSON string)
- Linked to `Document` via `documentId`

**Note:** Current implementation uses Pinecone for vector search, but `RAGChunk` table exists for future PostgreSQL vector extension support.

---

## User Flows

### 1. Starting a New Application

**Flow:**

1. **User Registration/Login:**
   - `POST /api/auth/register` or `POST /api/auth/login`
   - Returns JWT token

2. **Select Country & Visa Type:**
   - `GET /api/countries` - List countries
   - `GET /api/visa-types?countryId=xxx` - List visa types

3. **Create Application:**
   - `POST /api/applications`
   - Body: `{ countryId, visaTypeId }`
   - Returns: `{ id, status: "draft", ... }`

4. **Complete Questionnaire (Optional):**
   - Stored in `User.bio` (JSON)
   - Used for AI context

**Files:**
- `apps/backend/src/routes/applications.ts`
- `apps/backend/src/services/applications.service.ts`

### 2. Generating Checklist

**Flow:**

1. **Request Checklist:**
   - `GET /api/document-checklist/:applicationId`
   - Requires authentication

2. **Service Logic** (`document-checklist.service.ts`):
   - Check if checklist exists in DB (`DocumentChecklist` table)
   - If exists and `status === 'ready'`, return cached checklist
   - If `status === 'processing'`, return status object
   - If missing or failed, generate new checklist

3. **Checklist Generation:**
   - Build AI user context (questionnaire, risk score, etc.)
   - Check if hybrid mode enabled (rule set exists)
   - **Hybrid Mode:**
     a. Build base checklist from rules
     b. Call GPT-4 for enrichment only
     c. Validate response matches base checklist
   - **Legacy Mode:**
     a. Call GPT-4 to decide documents
     b. Validate response
   - Save to `DocumentChecklist` table
   - Return checklist with items, progress, summary

4. **Response Format:**
```json
{
  "applicationId": "...",
  "items": [
    {
      "id": "...",
      "documentType": "passport",
      "name": "Passport",
      "nameUz": "Pasport",
      "nameRu": "Паспорт",
      "category": "required",
      "required": true,
      "status": "missing",
      "description": "...",
      "whereToObtain": "..."
    }
  ],
  "summary": {
    "total": 12,
    "uploaded": 3,
    "verified": 1,
    "missing": 9
  },
  "progress": 25
}
```

**Files:**
- `apps/backend/src/routes/document-checklist.ts`
- `apps/backend/src/services/document-checklist.service.ts`
- `apps/backend/src/services/ai-openai.service.ts` (checklist generation)
- `apps/backend/src/services/checklist-rules.service.ts` (hybrid mode)

### 3. Chatting with AI

**Flow:**

1. **Send Message:**
   - `POST /api/chat`
   - Body: `{ query: "message text", applicationId?: "...", conversationHistory?: [...] }`
   - Requires authentication

2. **Backend Processing** (`chat.service.ts`):
   - Get or create chat session
   - Extract application context (if `applicationId` provided)
   - Build RAG context (if AI service available)
   - Call AI service or direct OpenAI

3. **AI Service** (`apps/ai-service/main.py`):
   - Retrieve RAG context (Pinecone search)
   - Build system prompt with RAG context
   - Call DeepSeek-R1 (or OpenAI fallback)
   - Return response with sources

4. **Response:**
```json
{
  "success": true,
  "data": {
    "message": "AI response text",
    "sources": ["source1", "source2"],
    "tokens_used": 150,
    "model": "deepseek-ai/DeepSeek-R1",
    "id": "msg-123"
  },
  "quota": {
    "messagesUsed": 5,
    "messagesRemaining": 45,
    "limit": 50
  }
}
```

5. **Save Message:**
   - User message saved to `ChatMessage` table
   - Assistant response saved to `ChatMessage` table
   - Linked to `ChatSession`

**Files:**
- `apps/backend/src/routes/chat.ts`
- `apps/backend/src/services/chat.service.ts`
- `apps/ai-service/main.py` (chat endpoint)
- `apps/ai-service/services/rag.py` (RAG retrieval)
- `apps/ai-service/services/deepseek.py` (DeepSeek client)

### 4. Uploading Documents

**Flow:**

1. **Upload Document:**
   - `POST /api/documents/upload`
   - Multipart form-data: `{ file, applicationId, documentType }`
   - Requires authentication

2. **Storage:**
   - File uploaded via `StorageAdapter` (Firebase or local)
   - Thumbnail generated for images
   - File URL stored in `UserDocument.fileUrl`

3. **AI Validation** (Non-blocking):
   - `document-validation.service.ts` validates document
   - Checks document type, completeness, quality
   - Updates `UserDocument` with:
     - `verifiedByAI: true/false`
     - `aiConfidence: 0-1`
     - `aiNotesUz`, `aiNotesRu`, `aiNotesEn`

4. **Checklist Update:**
   - Checklist item status updated to "pending" or "verified"
   - Application progress recalculated

5. **Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "documentType": "passport",
    "fileUrl": "https://...",
    "status": "pending",
    "verifiedByAI": true,
    "aiConfidence": 0.95
  }
}
```

**Files:**
- `apps/backend/src/routes/documents.ts`
- `apps/backend/src/services/documents.service.ts`
- `apps/backend/src/services/document-validation.service.ts`
- `apps/backend/src/services/storage-adapter.ts`

### 5. Document Validation (Phase 3)

**Flow:**

1. **Check Documents:**
   - `POST /api/doc-check/:applicationId/check`
   - Compares uploaded documents against checklist

2. **Service** (`doc-check.service.ts`):
   - For each checklist item:
     a. Find matching uploaded document
     b. Validate document type, completeness
     c. Generate problems/suggestions
   - Save results to `DocumentCheckResult` table

3. **Response:**
```json
{
  "results": [
    {
      "checklistItemId": "...",
      "documentId": "...",
      "status": "OK" | "MISSING" | "PROBLEM",
      "problems": [...],
      "suggestions": [...]
    }
  ]
}
```

**Files:**
- `apps/backend/src/routes/doc-check.ts`
- `apps/backend/src/services/doc-check.service.ts`
- `apps/backend/src/services/visa-doc-checker.service.ts`

---

## Admin & Internal Tools

### Admin Dashboard

**Endpoints** (`apps/backend/src/routes/admin.ts`):

- `GET /api/admin/dashboard` - Dashboard metrics
- `GET /api/admin/users` - List users (paginated)
- `GET /api/admin/applications` - List applications
- `GET /api/admin/payments` - List payments
- `GET /api/admin/visa-rules` - List visa rule sets
- `GET /api/admin/embassy-sources` - List embassy sources
- `POST /api/admin/embassy-sync/trigger` - Trigger manual sync
- `PATCH /api/admin/applications/:id/status` - Update application status

**Access:** Requires `role === 'admin'` (enforced by `requireAdmin` middleware)

### Embassy Sync

**Manual Trigger:**
- `POST /api/admin/embassy-sync/trigger`
- Enqueues sync jobs for all sources needing fetch

**Automatic Schedule:**
- Daily at 2 AM UTC (configurable via `EMBASSY_SYNC_CRON`)
- Can be disabled via `ENABLE_EMBASSY_SYNC=false`

**Queue Processing:**
- Bull queue: `embassy-sync`
- Redis-backed
- Retry: 3 attempts with exponential backoff
- Processed in same process as backend

**Files:**
- `apps/backend/src/services/embassy-sync-job.service.ts`
- `apps/backend/src/services/embassy-sync-scheduler.service.ts`
- `apps/backend/src/services/embassy-crawler.service.ts`
- `apps/backend/src/services/ai-embassy-extractor.service.ts`

### Analytics

**Endpoints:**
- `GET /api/analytics/events` - Event tracking
- `GET /api/analytics/metrics` - Aggregated metrics
- `GET /api/analytics/daily` - Daily metrics

**Tracking:**
- Events: `AnalyticsEvent` table
- Daily aggregation: `DailyMetrics` table
- Metrics: signups, visa selections, payments, documents, messages

**Files:**
- `apps/backend/src/routes/analytics.ts`
- `apps/backend/src/services/analytics.service.ts`

### Monitoring

**Endpoints:**
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe
- `GET /api/monitoring/performance` - Performance metrics
- `GET /api/monitoring/slow-queries` - Slow query log

**Files:**
- `apps/backend/src/routes/health.ts`
- `apps/backend/src/routes/monitoring.ts`
- `apps/backend/src/services/slow-query-logger.ts`

---

## Deployment & Environment

### Environment Variables

**Backend** (`apps/backend/.env`):

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (32+ chars)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

**AI Services:**
- `OPENAI_API_KEY` - OpenAI API key
- `DEEPSEEK_API_KEY` - Together.ai API key (for DeepSeek)
- `AI_SERVICE_URL` - AI service URL (default: http://localhost:8001)

**Storage:**
- `STORAGE_TYPE` - `firebase` or `local`
- `LOCAL_STORAGE_PATH` - Local storage path (default: `./uploads`)
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- `FIREBASE_PRIVATE_KEY` - Firebase private key
- `FIREBASE_STORAGE_BUCKET` - Firebase storage bucket

**Cache & Queue:**
- `REDIS_URL` - Redis connection URL (default: redis://127.0.0.1:6379)

**OAuth:**
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

**Email:**
- `SENDGRID_API_KEY` - SendGrid API key (optional)
- `SMTP_HOST` - SMTP host (fallback)
- `SMTP_PORT` - SMTP port
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password

**Payments:**
- `STRIPE_SECRET_KEY` - Stripe secret key
- `PAYME_MERCHANT_ID` - Payme merchant ID
- `CLICK_MERCHANT_ID` - Click merchant ID
- `UZUM_MERCHANT_ID` - Uzum merchant ID

**Embassy Sync:**
- `ENABLE_EMBASSY_SYNC` - Enable sync (default: true)
- `EMBASSY_SYNC_CRON` - Cron expression (default: `0 2 * * *`)

**AI Service** (`apps/ai-service/.env`):

- `OPENAI_API_KEY` - OpenAI API key
- `DEEPSEEK_API_KEY` - Together.ai API key
- `PINECONE_API_KEY` - Pinecone API key
- `PINECONE_INDEX_NAME` - Pinecone index name (default: `visabuddy-visa-kb`)
- `PINECONE_ENVIRONMENT` - Pinecone environment (default: `gcp-starter`)
- `PORT` - Service port (default: 8001)
- `CORS_ORIGINS` - Allowed CORS origins (comma-separated)

**Mobile App** (`frontend_new/.env`):

- `EXPO_PUBLIC_API_URL` - Backend API URL
- `EXPO_PUBLIC_AI_SERVICE_URL` - AI service URL
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` - Google OAuth web client ID

### Deployment Platforms

**Backend:**
- **Railway:** Primary production platform
- **Docker:** `apps/backend/Dockerfile`
- **Start Command:** `npm start` (runs migrations, then starts server)

**AI Service:**
- **Railway:** Separate service
- **Docker:** `apps/ai-service/Dockerfile`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 8001`

**Web App:**
- **Vercel:** Next.js deployment
- **Config:** `apps/web/vercel.json`

**Mobile App:**
- **EAS Build:** Expo Application Services
- **Config:** `frontend_new/eas.json`

### Docker Compose

**File:** `docker-compose.yml`

Services:
- `backend` - Express API
- `ai-service` - FastAPI service
- `postgres` - PostgreSQL database
- `redis` - Redis cache/queue

**Usage:**
```bash
docker-compose up -d
docker-compose logs -f backend
```

---

## Current Status & TODOs

### ✅ Fully Implemented

1. **Authentication:**
   - Email/password registration and login
   - Google OAuth
   - Password reset
   - JWT token management

2. **Visa Applications:**
   - Create, read, update applications
   - Progress tracking
   - Checkpoint system

3. **Document Checklist:**
   - AI-powered generation (hybrid + legacy modes)
   - 8 countries × 2 visa types supported
   - Multilingual (EN/UZ/RU)
   - DB caching (one-time generation)
   - Fallback mechanisms

4. **Document Upload:**
   - File upload (Firebase or local)
   - Thumbnail generation
   - AI validation (non-blocking)
   - Status tracking

5. **Chat:**
   - AI chat with RAG context
   - DeepSeek-R1 integration
   - Conversation history
   - Rate limiting (50 messages/day)

6. **Payments:**
   - Multiple gateways (Payme, Click, Uzum, Stripe)
   - Webhook handling
   - Payment reconciliation
   - Refund support

7. **Embassy Sync:**
   - Web scraping (Cheerio)
   - GPT-4 extraction
   - Rule set storage
   - Version history
   - Scheduled sync (daily)

8. **Admin Dashboard:**
   - User management
   - Application management
   - Payment management
   - Visa rules management
   - Analytics

9. **Notifications:**
   - Email (SendGrid + SMTP fallback)
   - Push notifications (FCM)
   - Scheduled reminders

10. **Analytics:**
    - Event tracking
    - Daily metrics aggregation
    - Performance monitoring

### ⚠️ Partially Implemented

1. **Document Validation (Phase 3):**
   - ✅ Basic structure exists (`doc-check.service.ts`)
   - ✅ `DocumentCheckResult` model exists
   - ⚠️ Full validation logic needs completion
   - ⚠️ UI integration incomplete

2. **RAG System:**
   - ✅ Pinecone integration exists
   - ✅ Embeddings service exists
   - ⚠️ Knowledge base needs expansion
   - ⚠️ Cache fallback needs testing

3. **Mobile App:**
   - ✅ Core screens implemented
   - ✅ API integration complete
   - ⚠️ Some UI polish needed
   - ⚠️ Offline support partial

4. **Web Admin Panel:**
   - ✅ Basic dashboard exists
   - ⚠️ Some admin features need UI
   - ⚠️ Visa rules editor incomplete

5. **Form Filling:**
   - ✅ Service exists (`form-filling.service.ts`)
   - ⚠️ UI integration incomplete
   - ⚠️ Form templates need expansion

### ❌ Missing / TODO

1. **Document Classification:**
   - Model fields exist (`UserDocument.classifiedType`)
   - Service exists (`document-classifier.service.ts`)
   - ⚠️ Not fully integrated into upload flow

2. **Visa Probability:**
   - Endpoint exists (`POST /api/visa-probability`)
   - Service exists (`probability.py`)
   - ⚠️ Not integrated into mobile app

3. **Advanced RAG:**
   - ⚠️ PostgreSQL vector extension support (future)
   - ⚠️ More knowledge base content
   - ⚠️ Better chunking strategies

4. **Testing:**
   - ⚠️ More integration tests needed
   - ⚠️ E2E tests missing
   - ⚠️ Load testing incomplete

5. **Documentation:**
   - ⚠️ API documentation needs expansion
   - ⚠️ Deployment guides need updates
   - ⚠️ Developer onboarding guide incomplete

### Known Issues / Technical Debt

1. **Database Schema:**
   - Some commented-out fields in `UserDocument` model (classification fields)
   - `Application` vs `VisaApplication` duality (consolidation needed)

2. **AI Service:**
   - Checklist generation endpoint exists but not used (backend handles it)
   - Some duplicate logic between backend and AI service

3. **Mobile App:**
   - API URL detection logic could be improved
   - Some error handling needs enhancement

4. **Cache:**
   - Cache invalidation rules need refinement
   - Some cache keys may be inconsistent

---

## Summary

VisaBuddy is a **production-ready** visa application management system with:

- ✅ **Complete backend API** (Express.js + PostgreSQL)
- ✅ **AI-powered features** (checklist generation, chat, document validation)
- ✅ **Mobile app** (React Native)
- ✅ **Admin dashboard** (Next.js)
- ✅ **Payment processing** (multiple gateways)
- ✅ **Embassy sync pipeline** (automated rule extraction)
- ✅ **RAG system** (Pinecone + OpenAI embeddings)

**Architecture Highlights:**
- Monorepo structure with clear separation of concerns
- Hybrid checklist generation (rule engine + GPT-4 enrichment)
- Dual AI models (GPT-4 for checklists, DeepSeek for chat)
- Robust fallback mechanisms (cache, local storage, static responses)
- Queue-based background jobs (Bull + Redis)
- Comprehensive error handling and logging

**Next Steps:**
1. Complete Phase 3 document validation
2. Expand knowledge base for RAG
3. Add more integration tests
4. Improve mobile app UI/UX
5. Expand admin panel features

---

**End of Analysis**




