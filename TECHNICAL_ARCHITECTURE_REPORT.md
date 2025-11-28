# VisaBuddy Technical Architecture Report

**Generated:** January 2025  
**Codebase Version:** 1.0.0  
**Status:** Production Ready

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Product Features (Current)](#product-features-current)
3. [AI & Visa Logic](#ai--visa-logic)
4. [Database & Data Models](#database--data-models)
5. [APIs & Endpoints](#apis--endpoints)
6. [Frontend Structure (Mobile + Web)](#frontend-structure-mobile--web)
7. [Configuration & Deployment](#configuration--deployment)
8. [Technical Debt & Risks](#technical-debt--risks)

---

## Architecture Overview

### Monorepo Structure

```
VisaBuddy/
├── apps/
│   ├── backend/          # Node.js/Express REST API (TypeScript)
│   ├── web/              # Next.js 14 web application (TypeScript)
│   └── ai-service/       # FastAPI Python service for AI/RAG
├── frontend_new/         # React Native mobile app (TypeScript)
├── scripts/              # Setup and utility scripts
├── deployment/           # Deployment configurations
└── docs/                 # Documentation
```

### Technology Stack

#### Backend (`apps/backend/`)

- **Framework:** Express.js 4.18.2
- **Language:** TypeScript 5.9.0
- **Database:** Prisma ORM with PostgreSQL (production) / SQLite (development)
- **Cache:** Redis (via ioredis) with in-memory fallback
- **Storage:** Firebase Storage (primary) / Local filesystem (fallback)
- **Authentication:** JWT (jsonwebtoken) + Google OAuth
- **AI Integration:** OpenAI GPT-4 for checklists, DeepSeek R1 (via Together.ai) for chat
- **Background Jobs:** Bull (Redis-based queue) with node-cron
- **Monitoring:** Sentry for error tracking
- **Security:** Helmet, CORS, rate limiting, input validation

#### Web App (`apps/web/`)

- **Framework:** Next.js 14.2.0 (App Router)
- **Language:** TypeScript 5.5.0
- **Styling:** Tailwind CSS 3.4.0
- **State Management:** Zustand 5.0.0
- **Forms:** React Hook Form 7.64.0 + Zod validation
- **i18n:** i18next 25.5.3 (English, Russian, Uzbek)
- **HTTP Client:** Axios 1.6.8

#### Mobile App (`frontend_new/`)

- **Framework:** React Native 0.72.10
- **Language:** TypeScript 5.9.0
- **Navigation:** React Navigation 6 (Stack + Bottom Tabs)
- **State Management:** Zustand 5.0.0
- **Storage:** AsyncStorage for local persistence
- **Push Notifications:** Firebase Cloud Messaging (FCM)
- **OAuth:** Google Sign-In (@react-native-google-signin/google-signin)
- **i18n:** i18next 25.5.3 (English, Russian, Uzbek, Spanish)
- **HTTP Client:** Axios 1.6.8

#### AI Service (`apps/ai-service/`)

- **Framework:** FastAPI (Python)
- **Language:** Python 3.10+
- **AI Models:**
  - **GPT-4** (OpenAI): Document checklist generation
  - **DeepSeek R1** (via Together.ai): Chat completions
  - **text-embedding-3-small** (OpenAI): Vector embeddings for RAG
- **Vector DB:** Pinecone (primary) / In-memory cache with cosine similarity (fallback)
- **RAG:** Retrieval-Augmented Generation with chunking (500 tokens, 100 overlap)

### Service Communication

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Mobile    │────────▶│   Backend    │────────▶│  AI Service │
│   (RN)      │  HTTP   │  (Express)   │  HTTP   │  (FastAPI)  │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              │
                        ┌─────┴─────┐
                        │           │
                   ┌────▼───┐  ┌───▼────┐
                   │Postgres│  │ Redis  │
                   │  (DB)  │  │(Cache) │
                   └────────┘  └────────┘
```

**Key Points:**

- Mobile and Web apps communicate directly with Backend API
- Backend proxies AI requests to AI Service (FastAPI)
- Backend uses Prisma to access PostgreSQL
- Redis used for caching, rate limiting, and job queues
- Firebase Storage for document uploads (with local fallback)

---

## Product Features (Current)

### Mobile App (`frontend_new/`)

#### Authentication & Onboarding

- **Location:** `frontend_new/src/screens/auth/`
- **Features:**
  - Email/password registration and login (`LoginScreen.tsx`, `RegisterScreen.tsx`)
  - Google OAuth sign-in (`services/google-oauth.ts`)
  - Password reset flow (`ForgotPasswordScreen.tsx`)
  - 10-step questionnaire (V2) for user profiling (`onboarding/QuestionnaireV2Screen.tsx`)
  - Language selection (EN, RU, UZ, ES) with persistence

#### My Applications Screen

- **Location:** `frontend_new/src/screens/visa/VisaApplicationScreen.tsx`
- **Features:**
  - Lists all user's visa applications
  - Application statuses: `draft`, `submitted`, `under_review`, `approved`, `rejected`
  - Progress percentage tracking
  - Pull-to-refresh
  - Navigation to application details
- **Data Source:** `GET /api/applications` (backend)

#### Application Detail Screen

- **Location:** `frontend_new/src/screens/visa/ApplicationDetailScreen.tsx`
- **Features:**
  - Application overview (country, visa type, status, dates)
  - **Document Checklist:**
    - AI-generated personalized checklist (3 categories: required, highly_recommended, optional)
    - Document upload status (pending, verified, rejected)
    - Progress tracking (verified/missing/rejected counts)
    - "Where to obtain" instructions (multilingual)
  - **Checkpoints:** Step-by-step application progress
  - Document upload interface
  - Chat with AI about this application
- **Data Sources:**
  - `GET /api/applications/:id` - Application details
  - `GET /api/document-checklist/:applicationId` - Checklist (with AI generation if needed)

#### AI Assistant (Chat)

- **Location:** `frontend_new/src/screens/chat/ChatScreen.tsx`
- **Features:**
  - Chat interface with message history
  - Application context injection (if chatting about specific application)
  - RAG-powered responses with source citations
  - Rate limiting (20 messages/hour per user)
  - Offline message queue
  - Auto-scroll to latest message
- **Data Flow:**
  1. User sends message → `POST /api/chat` (backend)
  2. Backend extracts application context (if `applicationId` provided)
  3. Backend calls AI Service `POST /api/chat` with RAG context
  4. AI Service uses DeepSeek R1 (via Together.ai) for response
  5. Response saved to `ChatMessage` table, returned to client
- **State Management:** `store/chat.ts` (Zustand) with AsyncStorage persistence

#### Profile & Settings

- **Location:** `frontend_new/src/screens/profile/`
- **Features:**
  - **Profile Edit** (`ProfileEditScreen.tsx`): Name, phone, avatar, bio
  - **Language Settings** (`LanguageScreen.tsx`): Change app language
  - **Security** (`SecurityScreen.tsx`): Password change, 2FA (if enabled)
  - **Notification Settings** (`notifications/NotificationSettingsScreen.tsx`):
    - Push notifications toggle
    - Email notifications toggle
    - Document update notifications
    - Visa status update notifications
  - **Help & Support** (`HelpSupportScreen.tsx`):
    - Contact channels: Email, Phone, Telegram, WhatsApp, Instagram
    - FAQ links
    - Support ticket creation

#### Document Management

- **Location:** `frontend_new/src/screens/documents/`
- **Features:**
  - Document upload (`DocumentUploadScreen.tsx`): Camera or gallery picker
  - Document preview (`DocumentPreviewScreen.tsx`): View uploaded documents
  - Document list (`DocumentsScreen.tsx`): All documents for an application
  - AI document validation (status: pending → verified/rejected)
- **Storage:** Firebase Storage (primary) or local backend storage

#### Admin Panel (if user role = "admin")

- **Location:** `frontend_new/src/screens/admin/`
- **Features:**
  - **Dashboard** (`AdminDashboard.tsx`): Total users, applications, revenue, documents
  - **Users** (`AdminUsersScreen.tsx`): List users, view details, change roles
  - **Applications** (`AdminApplicationsScreen.tsx`): View all applications, filter by status
  - **Documents** (`AdminDocumentsScreen.tsx`): Verify/reject documents
  - **Payments** (`AdminPaymentsScreen.tsx`): View payment transactions, refunds
  - **Analytics** (`AdminAnalyticsScreen.tsx`): Daily metrics, conversion rates

### Web App (`apps/web/`)

#### Structure

- **Framework:** Next.js 14 App Router
- **Location:** `apps/web/app/`
- **Routes:**
  - `/` - Landing page
  - `/login`, `/register`, `/forgot-password` - Auth pages
  - `/applications` - List user applications
  - `/applications/[id]` - Application detail
  - `/applications/[id]/documents` - Document management
  - `/chat` - AI chat interface
  - `/questionnaire` - User questionnaire
  - `/profile` - User profile
  - `/support` - Help & support
  - `/privacy`, `/terms` - Legal pages

#### Features

- **Similar to Mobile:** Most features mirror mobile app functionality
- **Enhanced UI:** Tailwind CSS with custom design system
- **Floating Assistant:** `components/chat/FloatingAssistant.tsx` - Chat widget on any page
- **State Management:** Zustand stores (`lib/stores/auth.ts`, `lib/stores/chat.ts`)
- **API Client:** `lib/api/client.ts` - Axios-based with token injection, request throttling

### Backend APIs

#### Authentication

- **Location:** `apps/backend/src/routes/auth.ts`
- **Endpoints:**
  - `POST /api/auth/register` - Email/password registration
  - `POST /api/auth/login` - Email/password login
  - `POST /api/auth/google` - Google OAuth callback
  - `POST /api/auth/forgot-password` - Password reset request
  - `POST /api/auth/reset-password` - Password reset confirmation
  - `GET /api/auth/me` - Get current user profile

#### Applications

- **Location:** `apps/backend/src/routes/applications.ts`
- **Endpoints:**
  - `GET /api/applications` - List user's applications
  - `GET /api/applications/:id` - Get application details
  - `POST /api/applications` - Create new application
  - `PUT /api/applications/:id/status` - Update application status
  - `DELETE /api/applications/:id` - Delete application

#### Documents

- **Location:** `apps/backend/src/routes/documents.ts`
- **Endpoints:**
  - `POST /api/documents` - Upload document (multipart/form-data)
  - `GET /api/documents/:id` - Get document details
  - `GET /api/documents/application/:applicationId` - List documents for application
  - `PUT /api/documents/:id/status` - Update document status (verify/reject)
  - `DELETE /api/documents/:id` - Delete document

#### Chat

- **Location:** `apps/backend/src/routes/chat.ts`
- **Endpoints:**
  - `POST /api/chat` - Send message, get AI response
  - `GET /api/chat/sessions` - List chat sessions
  - `GET /api/chat/sessions/:sessionId` - Get session with messages
  - `DELETE /api/chat/sessions/:sessionId` - Delete session

#### Document Checklist

- **Location:** `apps/backend/src/routes/document-checklist.ts`
- **Endpoints:**
  - `GET /api/document-checklist/:applicationId` - Get checklist (generates if missing)
  - `POST /api/document-checklist/:applicationId/regenerate` - Force regenerate checklist

#### Admin

- **Location:** `apps/backend/src/routes/admin.ts`
- **Endpoints:**
  - `GET /api/admin/dashboard` - Dashboard metrics
  - `GET /api/admin/users` - List users (paginated)
  - `GET /api/admin/users/:userId` - User details
  - `PATCH /api/admin/users/:userId/role` - Update user role
  - `GET /api/admin/applications` - List all applications
  - `GET /api/admin/analytics` - Analytics summary

#### Payments

- **Location:** `apps/backend/src/routes/payments-complete.ts`
- **Endpoints:**
  - `POST /api/payments` - Create payment
  - `POST /api/payments/:id/complete` - Complete payment
  - `POST /api/payments/webhook/:gateway` - Webhook handlers (Payme, Click, Uzum, Stripe)
  - `GET /api/payments/:id` - Get payment status

---

## AI & Visa Logic

### Checklist Generation Flow

**Location:** `apps/backend/src/services/document-checklist.service.ts`

1. **Trigger:** User creates application → `POST /api/applications`
2. **Checklist Request:** Frontend calls `GET /api/document-checklist/:applicationId`
3. **Backend Processing:**
   - Check if `DocumentChecklist` exists in DB with status `ready`
   - If missing or `processing`, trigger async generation:
     - Build `AIUserContext` from questionnaire (`apps/backend/src/services/ai-context.service.ts`)
     - Call AI Service `POST /api/checklist/generate` with:
       - `user_input`: User's question/request
       - `application_id`: Application ID
       - `auth_token`: JWT for backend authentication
4. **AI Service Processing** (`apps/ai-service/services/checklist.py`):
   - Fetch application context from backend (country, visa type, user questionnaire)
   - Build system prompt with:
     - Questionnaire summary (10-step V2)
     - Risk score
     - Country-specific requirements
     - Document guides from knowledge base
   - Call **GPT-4** with structured prompt
   - Parse JSON response into checklist items (8-15 items, 3 categories)
5. **Response Format:**
   ```json
   {
     "type": "tourist",
     "checklist": [
       {
         "document": "passport",
         "name": "Valid Passport",
         "nameUz": "Yaroqli pasport",
         "nameRu": "Действительный паспорт",
         "category": "required",
         "required": true,
         "priority": "high",
         "description": "Passport valid for at least 6 months after return date",
         "descriptionUz": "...",
         "descriptionRu": "...",
         "whereToObtain": "Obtain from passport office in Uzbekistan",
         "whereToObtainUz": "...",
         "whereToObtainRu": "..."
       }
     ]
   }
   ```
6. **Storage:** Backend saves to `DocumentChecklist.checklistData` (JSON string), status = `ready`

### Chat with RAG Flow

**Location:** `apps/backend/src/services/chat.service.ts` → `apps/ai-service/main.py`

1. **User Message:** `POST /api/chat` with `query`, optional `applicationId`
2. **Backend (`chat.service.ts`):**
   - Extract application context (if `applicationId` provided):
     - Country, visa type, document status, checkpoints
     - User bio, questionnaire summary
   - Get or create `ChatSession`
   - Call AI Service `POST /api/chat` with:
     - `content`: User message
     - `user_id`: User ID
     - `application_context`: Extracted context
     - `conversation_history`: Previous messages
3. **AI Service (`main.py`):**
   - **RAG Retrieval** (`services/rag.py`):
     - Embed user query using OpenAI embeddings
     - Search Pinecone (or cache) for top 5 relevant chunks
     - Retrieve context from knowledge base
   - **Prompt Building** (`services/prompt.py`):
     - Load system prompt from `prompts/system_prompt.txt`
     - Inject RAG context
     - Inject application context
     - Build message array with conversation history
   - **Response Generation** (`services/deepseek.py`):
     - Call **DeepSeek R1** via Together.ai API
     - Model: `deepseek-ai/DeepSeek-R1`
     - Temperature: 0.7 (default)
     - Max tokens: 2048 (default)
   - Return response with sources
4. **Backend:** Save `ChatMessage` to DB, return to client

### RAG Implementation

**Location:** `apps/ai-service/services/rag.py`

**Components:**

1. **Knowledge Base:** `apps/ai-service/data/visa_kb.json` - Structured visa requirements
2. **Chunker** (`services/chunker.py`): Splits documents into 500-token chunks with 100-token overlap
3. **Embeddings** (`services/embeddings.py`): OpenAI `text-embedding-3-small` (1536 dimensions)
4. **Vector Store:**
   - **Primary:** Pinecone (if `PINECONE_API_KEY` configured)
   - **Fallback:** In-memory cache with cosine similarity (`services/cache_fallback.py`)
5. **Ingestion** (`services/kb_ingestor.py`): Loads JSON, chunks, embeds, upserts to Pinecone

**Query Flow:**

```
User Query
    ↓
Embed Query (OpenAI embeddings)
    ↓
Search Pinecone (or cache) with metadata filters (country, visa_type)
    ↓
Retrieve top 5 chunks
    ↓
Inject into system prompt
    ↓
Generate response (DeepSeek R1)
```

### Document Validation

**Location:** `apps/backend/src/services/document-validation.service.ts`

- **AI Validation:** Uses GPT-4 Vision (if available) to verify document authenticity
- **Status Flow:** `pending` → `verified` / `rejected`
- **Fields:** `verifiedByAI`, `aiConfidence`, `aiNotesUz/Ru/En`

### DeepSeek R1 Usage

**Location:** `apps/ai-service/services/deepseek.py`

- **Provider:** Together.ai API
- **Model:** `deepseek-ai/DeepSeek-R1`
- **Purpose:** Chat completions (replaces OpenAI for chat to reduce costs)
- **Configuration:** `DEEPSEEK_API_KEY` environment variable
- **Fallback:** If unavailable, returns error message (no OpenAI fallback for chat)

### GPT-4 Usage

**Location:** `apps/backend/src/services/ai-openai.service.ts`

- **Purpose:** Document checklist generation (structured output)
- **Model:** `gpt-4` (default, configurable via `OPENAI_MODEL`)
- **Temperature:** 0.3 (lower for structured output)
- **Max Tokens:** 2000
- **Fallback:** Database templates if API fails

---

## Database & Data Models

### Schema Location

- **Primary:** `apps/backend/prisma/schema.prisma` (SQLite for dev)
- **PostgreSQL:** `apps/backend/prisma/schema.postgresql.prisma`
- **Schema Selector:** `apps/backend/prisma/schema-selector.js` - Auto-selects based on `DATABASE_URL`

### Core Models

#### User

```prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  googleId          String?   @unique
  firstName         String?
  lastName          String?
  phone             String?
  passwordHash      String?
  avatar            String?
  language          String    @default("en")
  bio               String?   // JSON: questionnaire data
  questionnaireCompleted Boolean @default(false)
  role              String    @default("user") // "user" | "admin"
  // Relations
  visaApplications  VisaApplication[]
  applications      Application[]  // New unified model
  documents         UserDocument[]
  payments          Payment[]
  chatSessions      ChatSession[]
  chatMessages      ChatMessage[]
}
```

#### Application (Unified Model)

```prisma
model Application {
  id                String    @id @default(cuid())
  userId            String
  countryId         String
  visaTypeId        String
  status            String    @default("draft") // draft, submitted, under_review, approved, rejected
  submissionDate    DateTime?
  approvalDate      DateTime?
  expiryDate        DateTime?
  metadata          String?   // JSON
  // Relations
  user              User
  country           Country
  visaType          VisaType
  documentChecklist DocumentChecklist?
}
```

**Note:** There are TWO application models:

- `VisaApplication` (legacy, still used)
- `Application` (new unified model with `DocumentChecklist`)

#### DocumentChecklist

```prisma
model DocumentChecklist {
  id                String    @id @default(cuid())
  applicationId     String    @unique
  status            String    @default("processing") // processing, ready, failed
  checklistData     String?   // JSON string with checklist items
  aiGenerated       Boolean   @default(false)
  generatedAt       DateTime?
  errorMessage      String?
  application       Application @relation(...)
}
```

#### UserDocument

```prisma
model UserDocument {
  id                String    @id @default(cuid())
  userId            String
  applicationId     String
  documentName      String
  documentType      String
  fileUrl           String    // Firebase Storage URL
  status            String    @default("pending") // pending, verified, rejected
  verifiedByAI      Boolean?  @default(false)
  aiConfidence      Float?
  aiNotesUz         String?
  aiNotesRu         String?
  aiNotesEn         String?
}
```

#### ChatSession & ChatMessage

```prisma
model ChatSession {
  id                String    @id @default(cuid())
  userId            String
  applicationId     String?   // null for general chat
  title             String    @default("New Chat")
  messages          ChatMessage[]
}

model ChatMessage {
  id                String    @id @default(cuid())
  sessionId         String
  userId            String
  role              String    // "user" | "assistant"
  content           String
  sources           String?   // JSON array of RAG sources
  model             String    @default("gpt-4")
  tokensUsed        Int       @default(0)
  responseTime      Int?      // milliseconds
}
```

#### Payment

```prisma
model Payment {
  id                String    @id @default(cuid())
  userId            String
  applicationId     String    @unique
  amount            Float
  currency          String    @default("USD")
  status            String    @default("pending") // pending, completed, failed, refunded
  paymentMethod     String    // payme, uzum, click, stripe, card
  transactionId     String?   @unique
  refunds           Refund[]
}
```

#### Country & VisaType

```prisma
model Country {
  id                String    @id @default(cuid())
  name              String    @unique
  code              String    @unique // ISO 3166-1 alpha-2
  flagEmoji         String
  requirements      String?   // JSON
  visaTypes         VisaType[]
}

model VisaType {
  id                String    @id @default(cuid())
  countryId         String
  name              String    // "Tourist Visa", "Work Visa"
  processingDays    Int
  validity          String
  fee               Float
  requirements      String    // JSON
  documentTypes     String    // JSON array
}
```

#### RAG Models

```prisma
model Document {
  id                String    @id @default(cuid())
  title             String
  content           String
  type              String    // visa_requirement, guide, faq
  countryId         String?
  visaTypeId        String?
  embedding         String?   // Vector embedding as JSON
  isPublished       Boolean   @default(false)
}

model RAGChunk {
  id                String    @id @default(cuid())
  documentId        String
  content           String
  chunkIndex        Int
  embedding         String?   // Vector embedding as JSON
}
```

### Important Enums & Constants

**Application Status:**

- `draft` - User is still filling out
- `submitted` - User submitted to embassy
- `under_review` - Embassy is reviewing
- `approved` - Visa approved
- `rejected` - Visa rejected

**Document Status:**

- `pending` - Uploaded, awaiting verification
- `verified` - Admin/AI verified as valid
- `rejected` - Invalid or incorrect document

**User Roles:**

- `user` - Regular user (default)
- `admin` - Admin access to dashboard

**Payment Status:**

- `pending` - Payment initiated
- `completed` - Payment successful
- `failed` - Payment failed
- `refunded` - Fully refunded
- `partially_refunded` - Partially refunded

---

## APIs & Endpoints

### Backend API Base URL

- **Development:** `http://localhost:3000/api`
- **Production:** Configured via `API_BASE_URL` environment variable

### Authentication Routes

**File:** `apps/backend/src/routes/auth.ts`

- `POST /api/auth/register` - Register new user
  - Body: `{ email, password, firstName?, lastName? }`
  - Returns: `{ token, user }`
- `POST /api/auth/login` - Login
  - Body: `{ email, password }`
  - Returns: `{ token, user }`
- `POST /api/auth/google` - Google OAuth callback
  - Body: `{ idToken }`
  - Returns: `{ token, user }`
- `POST /api/auth/forgot-password` - Request password reset
  - Body: `{ email }`
- `POST /api/auth/reset-password` - Reset password
  - Body: `{ token, newPassword }`
- `GET /api/auth/me` - Get current user (requires auth)

### Application Routes

**File:** `apps/backend/src/routes/applications.ts`

- `GET /api/applications` - List user's applications
  - Query: `?status=draft` (optional filter)
  - Returns: `{ success: true, data: Application[], count: number }`
- `GET /api/applications/:id` - Get application details
  - Returns: Application with country, visaType, documents, checkpoints
- `POST /api/applications` - Create application
  - Body: `{ countryId, visaTypeId, notes? }`
- `PUT /api/applications/:id/status` - Update status
  - Body: `{ status: "submitted" }`

### Document Routes

**File:** `apps/backend/src/routes/documents.ts`

- `POST /api/documents` - Upload document
  - FormData: `file`, `applicationId`, `documentType`, `documentName`
  - Returns: `{ success: true, data: UserDocument }`
- `GET /api/documents/:id` - Get document
- `GET /api/documents/application/:applicationId` - List documents for application
- `PUT /api/documents/:id/status` - Update status (admin only)
  - Body: `{ status: "verified" | "rejected", verificationNotes? }`
- `DELETE /api/documents/:id` - Delete document

### Chat Routes

**File:** `apps/backend/src/routes/chat.ts`

- `POST /api/chat` - Send message
  - Body: `{ query, applicationId?, conversationHistory? }`
  - Returns: `{ message, sources, tokens_used, model, id }`
  - Rate limit: 20 messages/hour per user
- `GET /api/chat/sessions` - List chat sessions
- `GET /api/chat/sessions/:sessionId` - Get session with messages
- `DELETE /api/chat/sessions/:sessionId` - Delete session

### Document Checklist Routes

**File:** `apps/backend/src/routes/document-checklist.ts`

- `GET /api/document-checklist/:applicationId` - Get checklist
  - Generates if missing (async, returns `status: "processing"` if generating)
  - Returns: `{ status, checklistData, aiGenerated, errorMessage? }`
- `POST /api/document-checklist/:applicationId/regenerate` - Force regenerate

### Admin Routes

**File:** `apps/backend/src/routes/admin.ts` (requires `role: "admin"`)

- `GET /api/admin/dashboard` - Dashboard metrics
  - Returns: `{ totalUsers, totalApplications, totalRevenue, verifiedDocuments, ... }`
- `GET /api/admin/users` - List users (paginated)
  - Query: `?skip=0&take=20`
- `GET /api/admin/users/:userId` - User details
- `PATCH /api/admin/users/:userId/role` - Update role
  - Body: `{ role: "admin" | "user" }`
- `GET /api/admin/applications` - List all applications
- `GET /api/admin/analytics` - Analytics summary

### Payment Routes

**File:** `apps/backend/src/routes/payments-complete.ts`

- `POST /api/payments` - Create payment
  - Body: `{ applicationId, amount, paymentMethod }`
- `POST /api/payments/:id/complete` - Complete payment
- `POST /api/payments/webhook/:gateway` - Webhook handlers
  - Gateways: `payme`, `click`, `uzum`, `stripe`

### Health & Monitoring

**File:** `apps/backend/src/routes/health.ts`

- `GET /health` - Basic health check
- `GET /api/health` - API status
- `GET /api/health/live` - Liveness probe
- `GET /api/health/ready` - Readiness probe

### AI Service Endpoints

**Base URL:** `http://localhost:8001` (or `AI_SERVICE_URL`)

- `POST /api/chat` - Chat with RAG (called by backend)
- `POST /api/checklist/generate` - Generate checklist (called by backend)
- `POST /api/visa-probability` - Generate visa probability estimate
- `GET /api/rag/status` - RAG service status
- `GET /health` - Health check

---

## Frontend Structure (Mobile + Web)

### Mobile App (`frontend_new/`)

#### Navigation Structure

**File:** `frontend_new/src/App.tsx`

```
App
├── AuthStack (if not signed in)
│   ├── Login
│   ├── Register
│   └── ForgotPassword
└── MainAppStack (if signed in)
    ├── AppTabs (Bottom Tab Navigator)
    │   ├── Applications (VisaApplicationScreen)
    │   ├── Chat (ChatScreen)
    │   ├── Profile (ProfileScreen)
    │   └── AdminPanel (if admin) → AdminNavigator
    └── Modal Screens (Stack Navigator)
        ├── ApplicationDetail
        ├── DocumentUpload
        ├── DocumentPreview
        ├── QuestionnaireV2
        ├── ProfileEdit
        ├── Language
        ├── Security
        ├── NotificationSettings
        └── HelpSupport
```

**Navigation Libraries:**

- `@react-navigation/native` - Core navigation
- `@react-navigation/native-stack` - Stack navigator
- `@react-navigation/bottom-tabs` - Tab navigator

#### State Management

**Zustand Stores:**

- `store/auth.ts` - Authentication state, user profile
- `store/chat.ts` - Chat messages, sessions
- `store/documents.ts` - Document state
- `store/visa.ts` - Application state
- `store/payments.ts` - Payment state
- `store/notifications.ts` - Notification preferences
- `store/onboarding.ts` - Questionnaire state
- `store/network.ts` - Network connectivity

**Persistence:**

- AsyncStorage for offline data
- Chat history cached locally
- User profile cached

#### API Client

**File:** `frontend_new/src/services/api.ts`

- Axios instance with base URL from `config/constants.ts`
- Request interceptor: Adds JWT token from auth store
- Response interceptor: Handles 401 (logout), error formatting
- Offline queue: Queues requests when offline, syncs when online

#### Key Screens

1. **VisaApplicationScreen** (`screens/visa/VisaApplicationScreen.tsx`)
   - Lists applications
   - Pull-to-refresh
   - Navigation to details

2. **ApplicationDetailScreen** (`screens/visa/ApplicationDetailScreen.tsx`)
   - Application overview
   - Document checklist with upload buttons
   - Checkpoints progress
   - Chat button

3. **ChatScreen** (`screens/chat/ChatScreen.tsx`)
   - Message list (FlatList)
   - Input with send button
   - Auto-scroll to bottom
   - Loading states

4. **QuestionnaireV2Screen** (`screens/onboarding/QuestionnaireV2Screen.tsx`)
   - 10-step questionnaire
   - Progress indicator
   - Form validation
   - Submission to backend

### Web App (`apps/web/`)

#### App Router Structure

**Next.js 14 App Router:**

```
app/
├── layout.tsx              # Root layout
├── page.tsx                # Landing page
├── (auth)/                 # Auth route group
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── forgot-password/page.tsx
├── (dashboard)/            # Protected route group
│   ├── layout.tsx         # Dashboard layout with AppShell
│   ├── applications/page.tsx
│   ├── applications/[id]/page.tsx
│   ├── applications/[id]/documents/page.tsx
│   ├── chat/page.tsx
│   ├── questionnaire/page.tsx
│   ├── profile/page.tsx
│   └── support/page.tsx
└── (legal)/
    ├── privacy/page.tsx
    └── terms/page.tsx
```

#### State Management

**Zustand Stores:**

- `lib/stores/auth.ts` - Auth state, token management
- `lib/stores/chat.ts` - Chat messages

**Persistence:**

- `localStorage` for token and user data
- Token injected into API client automatically

#### API Client

**File:** `apps/web/lib/api/client.ts`

- Axios instance with base URL from `lib/api/config.ts`
- Request throttling (100ms minimum between same endpoint)
- Token injection from `localStorage`
- Error handling with user-friendly messages

#### Components

**UI Components** (`components/ui/`):

- `Button.tsx`, `Input.tsx`, `Card.tsx`, `Badge.tsx`, `Tabs.tsx`, `ProgressBar.tsx`, `Skeleton.tsx`

**Layout Components:**

- `layout/AppShell.tsx` - Main dashboard layout with sidebar
- `layout/AuthLayout.tsx` - Auth page layout

**Chat:**

- `chat/FloatingAssistant.tsx` - Floating chat widget

#### i18n

**Location:** `apps/web/lib/i18n/index.ts`

- Languages: English (`locales/en.json`), Russian (`ru.json`), Uzbek (`uz.json`)
- Browser language detection
- Language switcher in profile

---

## Configuration & Deployment

### Environment Variables

#### Backend (`apps/backend/.env`)

**Required:**

- `DATABASE_URL` - PostgreSQL connection string (or SQLite `file:./prisma/dev.db`)
- `JWT_SECRET` - JWT signing secret (32+ characters)
- `NODE_ENV` - `development` | `production`
- `PORT` - Server port (default: 3000)

**AI & Services:**

- `OPENAI_API_KEY` - OpenAI API key (for GPT-4 checklists)
- `DEEPSEEK_API_KEY` - DeepSeek API key (for chat via Together.ai)
- `AI_SERVICE_URL` - AI service URL (default: `http://localhost:8001`)

**Storage:**

- `STORAGE_TYPE` - `firebase` | `local`
- `LOCAL_STORAGE_PATH` - Local uploads path (if `STORAGE_TYPE=local`)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET` (if Firebase)

**Cache:**

- `REDIS_URL` - Redis connection string (optional, uses in-memory if missing)

**OAuth:**

- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

**Email:**

- `SENDGRID_API_KEY` - SendGrid API key (optional)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - SMTP fallback

**Monitoring:**

- `SENTRY_DSN` - Sentry DSN (optional)

**CORS:**

- `CORS_ORIGIN` - Allowed origins (comma-separated, or `*` for dev)

#### Web App (`apps/web/.env.local`)

- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` - Google OAuth web client ID

#### Mobile App (`frontend_new/.env`)

- `API_BASE_URL` - Backend API URL
- `GOOGLE_WEB_CLIENT_ID` - Google OAuth client ID

#### AI Service (`apps/ai-service/.env`)

- `OPENAI_API_KEY` - OpenAI API key
- `DEEPSEEK_API_KEY` - DeepSeek API key (Together.ai)
- `PINECONE_API_KEY` - Pinecone API key (optional, uses cache fallback if missing)
- `PINECONE_INDEX_NAME` - Pinecone index name (default: `visabuddy-visa-kb`)
- `CORS_ORIGINS` - Allowed origins (comma-separated)

### Deployment

#### Docker Compose

**File:** `docker-compose.yml`

Services:

- `postgres` - PostgreSQL 15
- `redis` - Redis 7
- `backend` - Backend API (port 3000)
- `ai-service` - AI service (port 8001)

**Usage:**

```bash
docker-compose up -d
docker-compose exec backend npm run db:migrate:deploy
```

#### Railway

**File:** `railway.json`

- Backend service with PostgreSQL and Redis plugins
- AI service as separate service
- Environment variables configured in Railway dashboard

#### Vercel (Web App)

**File:** `vercel.json`

- Next.js framework detection
- Build command: `npm run build`
- Output directory: `.next`

#### Production Backend

**Dockerfile:** `apps/backend/Dockerfile`

- Multi-stage build
- Node.js 20
- Prisma generation and migration on startup
- Health checks configured

**Startup Script:** `apps/backend/prisma/startup.js`

- Runs schema selector
- Generates Prisma client
- Runs migrations
- Starts server

### CI/CD

**No GitHub Actions workflows found** - CI/CD may be configured externally or not yet set up.

---

## Technical Debt & Risks

### Code Quality Issues

#### 1. Dual Application Models

**Location:** `apps/backend/prisma/schema.prisma`

**Issue:** Two application models exist:

- `VisaApplication` (legacy)
- `Application` (new, with `DocumentChecklist`)

**Risk:** Confusion about which model to use, potential data inconsistency.

**Recommendation:** Migrate all code to use `Application`, deprecate `VisaApplication`.

#### 2. Checklist Generation Race Conditions

**Location:** `apps/backend/src/services/document-checklist.service.ts`

**Issue:** Multiple concurrent requests to `GET /api/document-checklist/:applicationId` can trigger multiple AI generations.

**Risk:** Wasted API calls, duplicate processing.

**Recommendation:** Add distributed lock (Redis) to prevent concurrent generation.

#### 3. Chat Rate Limiting

**Location:** `apps/backend/src/middleware/chat-rate-limit.ts`

**Issue:** Rate limit is per-user, but uses in-memory storage if Redis unavailable.

**Risk:** Rate limits reset on server restart, not shared across instances.

**Recommendation:** Always require Redis for production, or use database-backed rate limiting.

#### 4. RAG Fallback Performance

**Location:** `apps/ai-service/services/cache_fallback.py`

**Issue:** In-memory cache with cosine similarity is O(n) for each query.

**Risk:** Slow queries as knowledge base grows.

**Recommendation:** Use vector database (Pinecone) in production, or implement local vector index (FAISS).

#### 5. Document Storage Duplication

**Location:** `apps/backend/src/services/storage-adapter.ts`

**Issue:** Supports both Firebase and local storage, but no migration path between them.

**Risk:** Data loss if switching storage backends.

**Recommendation:** Add migration utility, or standardize on one storage backend.

### Security Concerns

#### 1. JWT Secret Validation

**Location:** `apps/backend/src/index.ts` (line 75)

**Issue:** JWT_SECRET length check only in production.

**Risk:** Weak secrets in development could leak to production.

**Recommendation:** Always validate JWT_SECRET length, even in development.

#### 2. CORS Configuration

**Location:** `apps/backend/src/index.ts` (line 148)

**Issue:** Allows `*` in development, which could be accidentally deployed.

**Risk:** CORS misconfiguration in production.

**Recommendation:** Never allow `*` in production, always require explicit origins.

#### 3. SQL Injection Prevention

**Location:** `apps/backend/src/middleware/input-validation.ts`

**Issue:** Basic SQL injection checks, but Prisma should handle this.

**Risk:** If raw SQL is used elsewhere, injection is possible.

**Recommendation:** Audit all database queries, ensure Prisma is used everywhere.

#### 4. File Upload Security

**Location:** `apps/backend/src/middleware/fileUploadSecurity.ts`

**Issue:** File type validation exists, but file content validation (virus scanning) is missing.

**Risk:** Malicious files could be uploaded.

**Recommendation:** Add virus scanning service (ClamAV, VirusTotal API).

### Performance Issues

#### 1. Checklist Generation Latency

**Location:** `apps/backend/src/services/document-checklist.service.ts`

**Issue:** AI generation can take 10-30 seconds, user sees "processing" state.

**Risk:** Poor UX, users may refresh and trigger duplicate generation.

**Recommendation:**

- Add WebSocket/SSE for real-time updates
- Show progress indicator
- Cache generated checklists aggressively

#### 2. Chat History Loading

**Location:** `frontend_new/src/screens/chat/ChatScreen.tsx`

**Issue:** Loads all messages on mount, no pagination.

**Risk:** Slow load for users with long chat history.

**Recommendation:** Implement pagination, load last 50 messages initially.

#### 3. Database Connection Pooling

**Location:** `apps/backend/src/services/db-pool.service.ts`

**Issue:** Pool size is 20, but no monitoring of pool exhaustion.

**Risk:** Connection pool exhaustion under load.

**Recommendation:** Add pool metrics, alert on high connection usage.

#### 4. Redis Cache Invalidation

**Location:** `apps/backend/src/services/cache-invalidation.service.ts`

**Issue:** Cache invalidation rules exist, but no TTL on cached data.

**Risk:** Stale data if invalidation fails.

**Recommendation:** Add TTL to all cached data as safety net.

### Scalability Concerns

#### 1. Single AI Service Instance

**Location:** `apps/ai-service/main.py`

**Issue:** No horizontal scaling support, single instance handles all requests.

**Risk:** AI service becomes bottleneck.

**Recommendation:** Add load balancer, deploy multiple AI service instances.

#### 2. File Storage Scalability

**Location:** `apps/backend/src/services/firebase-storage.service.ts`

**Issue:** Firebase Storage has rate limits and costs scale with usage.

**Risk:** High costs or rate limit errors at scale.

**Recommendation:** Consider S3/GCS for production, implement CDN for document delivery.

#### 3. Database Query Optimization

**Location:** Various services

**Issue:** Some queries may not be optimized (N+1 queries, missing indexes).

**Risk:** Slow queries as data grows.

**Recommendation:**

- Add database query logging (`slow-query-logger.ts` exists but may need tuning)
- Audit all Prisma queries for N+1 issues
- Add missing indexes

#### 4. Background Job Processing

**Location:** `apps/backend/src/services/notification-scheduler.service.ts`

**Issue:** Uses Bull with Redis, but no job retry strategy documented.

**Risk:** Failed jobs may be lost.

**Recommendation:** Configure job retries, dead letter queue, monitoring.

### AI-Specific Risks

#### 1. Hallucination in Checklists

**Location:** `apps/backend/src/services/ai-openai.service.ts` (line 431)

**Issue:** GPT-4 may generate fake document names or requirements.

**Risk:** Users upload wrong documents, visa applications rejected.

**Recommendation:**

- Add validation against known document types
- Human review for high-risk applications
- Fallback to database templates if AI confidence is low

#### 2. RAG Context Quality

**Location:** `apps/ai-service/services/rag.py`

**Issue:** RAG retrieval may return irrelevant chunks.

**Risk:** AI responses based on wrong context, misleading users.

**Recommendation:**

- Tune similarity threshold
- Add relevance scoring
- Log and monitor RAG retrieval quality

#### 3. Token Usage Costs

**Location:** `apps/backend/src/services/usage-tracking.service.ts`

**Issue:** Token usage is tracked, but no hard limits per user.

**Risk:** High API costs from heavy users or abuse.

**Recommendation:**

- Add per-user token limits
- Implement tiered usage (free vs. paid)
- Alert on unusual usage patterns

#### 4. DeepSeek API Reliability

**Location:** `apps/ai-service/services/deepseek.py`

**Issue:** No fallback if DeepSeek API is down.

**Risk:** Chat feature completely unavailable.

**Recommendation:** Add OpenAI fallback for chat (with cost consideration).

### Missing Features

#### 1. Email Verification

**Location:** `apps/backend/src/services/auth.service.ts`

**Issue:** `emailVerified` field exists, but no email verification flow.

**Risk:** Fake accounts, spam.

**Recommendation:** Implement email verification on registration.

#### 2. Two-Factor Authentication

**Location:** `apps/backend/prisma/schema.prisma` (UserPreferences.twoFactorEnabled)

**Issue:** Field exists, but no 2FA implementation.

**Risk:** Account security vulnerability.

**Recommendation:** Implement TOTP-based 2FA (Google Authenticator).

#### 3. Document Expiry Tracking

**Location:** `apps/backend/prisma/schema.prisma` (UserDocument.expiryDate)

**Issue:** Expiry date stored, but no notifications or validation.

**Risk:** Users submit expired documents.

**Recommendation:** Add expiry date validation, send reminders.

#### 4. Payment Refund Automation

**Location:** `apps/backend/src/services/payment-refund.service.ts`

**Issue:** Refunds are manual, no automated refund flow.

**Risk:** Delayed refunds, poor customer experience.

**Recommendation:** Implement automated refund processing for failed applications.

---

## Summary

### Strengths

1. **Well-structured monorepo** with clear separation of concerns
2. **Comprehensive AI integration** with RAG, GPT-4, and DeepSeek
3. **Multi-platform support** (mobile + web)
4. **Robust authentication** with JWT and Google OAuth
5. **Admin dashboard** for managing users and applications
6. **Multilingual support** (EN, RU, UZ, ES)
7. **Production-ready infrastructure** with Docker, health checks, monitoring

### Areas for Improvement

1. **Consolidate application models** (remove legacy `VisaApplication`)
2. **Add distributed locking** for checklist generation
3. **Implement pagination** for chat history
4. **Add email verification** flow
5. **Improve RAG retrieval quality** with better chunking and filtering
6. **Add horizontal scaling** support for AI service
7. **Implement 2FA** for enhanced security
8. **Add automated testing** (unit, integration, E2E)

### Next Steps

1. **Performance optimization:\*\*** Database query tuning, caching strategy
2. **Security hardening:\*\*** Email verification, 2FA, file scanning
3. **Scalability:\*\*** Load balancing, horizontal scaling, CDN
4. **Monitoring:\*\*** APM, error tracking, usage analytics
5. **Testing:\*\*** Increase test coverage, add E2E tests

---

**Report Generated:** January 2025  
**Codebase Version:** 1.0.0  
**Status:** Production Ready with identified improvements
