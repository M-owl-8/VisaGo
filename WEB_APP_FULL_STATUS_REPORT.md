# Web App Full Status Report (apps/web)

**Generated:** 2025-11-27  
**Scope:** Complete investigation of `apps/web` - Next.js web application for Ketdik/VisaBuddy

---

## 1. Architecture Overview

### Framework & Tech Stack

- **Framework:** Next.js 14.2.0 with **App Router** (not Pages Router)
- **Language:** TypeScript 5.9.3 (Note: ESLint warns this version is not officially supported - should be <5.6.0)
- **Styling:** Tailwind CSS 3.4.0
- **State Management:** Zustand 5.0.0 (lightweight, no Redux)
- **API Client:** Axios 1.6.8 with custom `ApiClient` class
- **i18n:** react-i18next 15.3.4 + i18next 25.5.3 + i18next-browser-languagedetector 8.0.0
- **Form Handling:** react-hook-form 7.64.0 (installed but not used in questionnaire - uses plain state)
- **Validation:** zod 3.25.0 (installed but not used)

### Project Structure

```
apps/web/
├── app/                    # Next.js App Router pages
│   ├── applications/       # Application management
│   ├── chat/              # AI chat interface
│   ├── login/             # Authentication
│   ├── register/
│   ├── forgot-password/
│   ├── questionnaire/     # Multi-step questionnaire
│   ├── profile/           # User profile
│   ├── support/           # Help & support
│   ├── layout.tsx         # Root layout
│   ├── providers.tsx      # Client-side providers (i18n)
│   └── page.tsx           # Home/redirect page
├── components/            # Shared components
│   └── Layout.tsx         # Navigation layout
├── lib/
│   ├── api/
│   │   ├── config.ts      # API base URL configuration
│   │   └── client.ts       # Axios-based API client
│   ├── stores/
│   │   ├── auth.ts        # Zustand auth store
│   │   └── chat.ts        # Zustand chat store
│   ├── i18n/
│   │   └── index.ts       # i18next initialization
│   └── utils/
│       └── errorMessages.ts # Error message utilities
└── locales/               # Translation files
    ├── en.json
    ├── ru.json
    └── uz.json
```

### API Client Architecture

**File:** `lib/api/client.ts`

- **Base URL:** Configured in `lib/api/config.ts` with fallback logic
- **Authentication:** JWT token stored in `localStorage` as `auth_token`, attached via Axios interceptor
- **Error Handling:** Centralized in `ApiClient` class with structured `ApiResponse<T>` type
- **Endpoints Implemented:**
  - Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/forgot-password`, `/api/auth/reset-password`
  - Applications: `/api/applications`, `/api/applications/:id`, `/api/document-checklist/:id`, `/api/applications/ai-generate`
  - Documents: `/api/documents/upload`, `/api/documents/application/:id`
  - Chat: `/api/chat` (POST for send), `/api/chat/history` (GET), `/api/chat/sessions` (GET)
  - Users: `/api/users/me`, `/api/users/:id/applications`, `/api/users/:id/preferences`

### State Management

**Zustand Stores:**

1. **`lib/stores/auth.ts`** - Authentication & user state
   - Manages: `user`, `token`, `isSignedIn`, `isLoading`, `userApplications`
   - Persists: Token and user data in `localStorage`
   - Actions: `initializeApp`, `login`, `register`, `logout`, `fetchUserProfile`, `fetchUserApplications`

2. **`lib/stores/chat.ts`** - Chat state
   - Manages: `messages`, `isLoading`, `error`, `currentApplicationId`
   - **Does NOT persist** to localStorage (only backend)
   - Actions: `sendMessage`, `loadChatHistory`, `setCurrentApplication`, `clearMessages`

### i18n System

**File:** `lib/i18n/index.ts`

- **Languages:** English (en), Russian (ru), Uzbek (uz)
- **Detection Priority:**
  1. User's saved language from profile (`localStorage.getItem('user')`)
  2. Saved language preference (`localStorage.getItem('app_language')`)
  3. Browser language
  4. Default: English
- **Initialization:** Synchronous on module load (client-side only)
- **Provider:** Wrapped in `app/providers.tsx` with client-side mount check

### Routing Structure

Next.js App Router with the following routes:

- `/` - Home page (redirects to `/applications` or `/login`)
- `/login` - Login form
- `/register` - Registration form
- `/forgot-password` - Password reset request
- `/applications` - Applications dashboard (list view)
- `/applications/[id]` - Application detail page
- `/applications/[id]/documents` - Document upload page
- `/questionnaire` - Multi-step questionnaire v2
- `/chat` - AI chat interface (global or scoped via `?applicationId=...`)
- `/profile` - User profile (read-only)
- `/support` - Help & support contact information

---

## 2. Routes & Features

### Feature Implementation Status

| Feature                                                    | Status                   | Notes                                                                    |
| ---------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------ |
| **Auth**                                                   |
| Login                                                      | ✅ Fully implemented     | Uses i18n, error handling, redirects to `/applications`                  |
| Register                                                   | ✅ Fully implemented     | Form validation, password confirmation, i18n                             |
| Forgot Password                                            | ⚠️ Partially implemented | Calls API but error handling uses raw `err.message` (not translated)     |
| **Applications**                                           |
| View all applications                                      | ✅ Fully implemented     | Fetches from `/api/users/:id/applications`, displays cards with progress |
| View single application                                    | ✅ Fully implemented     | Shows status, progress bar, checklist preview                            |
| View document checklist                                    | ✅ Fully implemented     | Fetches from `/api/document-checklist/:id`                               |
| **Questionnaire v2**                                       |
| Multi-step form                                            | ⚠️ Partially implemented | 5 steps, but **NOT using v2 structure** - uses simplified legacy fields  |
| AI-based application creation                              | ✅ Fully implemented     | Calls `/api/applications/ai-generate`                                    |
| **Documents**                                              |
| Document upload                                            | ✅ Fully implemented     | File size validation (20MB), PDF/JPG/PNG support                         |
| AI validation result display                               | ❌ Not implemented       | Upload succeeds but validation results not shown                         |
| Checklist refresh after upload                             | ⚠️ Partially implemented | Redirects to detail page but doesn't auto-refresh checklist              |
| **AI Chat**                                                |
| View chat history                                          | ✅ Fully implemented     | Loads from `/api/chat/history` on mount                                  |
| Send new messages                                          | ✅ Fully implemented     | Optimistic UI, sends to `/api/chat`                                      |
| Persist chat per user                                      | ✅ Fully implemented     | Backend stores messages, retrievable on login                            |
| Persist chat per application                               | ✅ Fully implemented     | Supports `applicationId` parameter                                       |
| **Profile**                                                |
| View basic info                                            | ✅ Fully implemented     | Read-only display of name, email, phone, language                        |
| Edit profile                                               | ❌ Not implemented       | No edit form, only display                                               |
| Language selection                                         | ⚠️ Partially implemented | Language switcher in Layout, but doesn't save to backend profile         |
| **Support**                                                |
| Contact info (Email, Phone, Telegram, WhatsApp, Instagram) | ✅ Fully implemented     | All links clickable, uses i18n translations                              |
| Fully localized UZ/RU/EN                                   | ✅ Fully implemented     | All support content uses translation keys                                |

### Detailed Route Analysis

#### `/login` - Login Page

**File:** `app/login/page.tsx`

- **Status:** ✅ Production-ready
- **Features:**
  - Email/password form with validation
  - Error display with translated messages
  - Redirects to `/applications` on success
  - Link to register and forgot password
- **API:** `POST /api/auth/login`
- **i18n:** ✅ Fully translated
- **Error Handling:** ✅ Uses `getErrorMessage()` utility with translations

#### `/register` - Registration Page

**File:** `app/register/page.tsx`

- **Status:** ✅ Production-ready
- **Features:**
  - First name, last name, email, password, confirm password
  - Client-side validation (password match, min 6 chars)
  - Error display with translated messages
- **API:** `POST /api/auth/register`
- **i18n:** ✅ Fully translated
- **Error Handling:** ✅ Uses `getErrorMessage()` utility
- **Issues:**
  - ⚠️ Password validation messages are hardcoded in English (lines 30, 36)

#### `/forgot-password` - Password Reset

**File:** `app/forgot-password/page.tsx`

- **Status:** ⚠️ Partially implemented
- **Features:**
  - Email input form
  - Success message display
- **API:** `POST /api/auth/forgot-password`
- **i18n:** ⚠️ Partially translated (UI labels yes, error messages no)
- **Error Handling:** ❌ Uses raw `err.message` without translation (line 24)
- **Issues:**
  - "Back to Login" text is hardcoded in English (lines 43, 96)

#### `/applications` - Applications Dashboard

**File:** `app/applications/page.tsx`

- **Status:** ✅ Production-ready
- **Features:**
  - Lists all user applications as cards
  - Shows country flag, visa type, status, progress percentage
  - "Start New Application" button linking to questionnaire
  - Empty state with call-to-action
- **API:** `GET /api/users/:id/applications` (via `fetchUserApplications()`)
- **i18n:** ✅ Fully translated
- **Error Handling:** ⚠️ No error display if fetch fails (silent failure)

#### `/applications/[id]` - Application Detail

**File:** `app/applications/[id]/page.tsx`

- **Status:** ⚠️ Partially implemented
- **Features:**
  - Displays application info (country, visa type, status, progress)
  - Shows document checklist (items with status)
  - Links to document upload and chat
- **API:** `GET /api/applications/:id`, `GET /api/document-checklist/:id`
- **i18n:** ⚠️ Partially translated (some hardcoded English: "Application not found", "Back to Applications", "Document Checklist", "Actions", "Upload Documents", "Chat about this Application")
- **Error Handling:** ⚠️ Errors logged to console only (line 42)
- **Issues:**
  - ESLint warning: Missing dependencies in `useEffect` (line 26)

#### `/applications/[id]/documents` - Document Upload

**File:** `app/applications/[id]/documents/page.tsx`

- **Status:** ⚠️ Partially implemented
- **Features:**
  - File input (PDF, JPG, PNG)
  - File size validation (20MB max)
  - Success/error messages
  - Auto-redirect to detail page after upload
- **API:** `POST /api/documents/upload`
- **i18n:** ⚠️ Partially translated (hardcoded: "Upload Document", "Select Document", success/error messages)
- **Error Handling:** ⚠️ Shows error but not translated
- **Missing:**
  - ❌ No display of AI validation results
  - ❌ No document type selection (hardcoded as 'document')
  - ❌ No list of uploaded documents

#### `/questionnaire` - Questionnaire v2

**File:** `app/questionnaire/page.tsx`

- **Status:** ⚠️ **NOT using v2 structure** - uses simplified legacy fields
- **Features:**
  - 5-step multi-step form
  - Progress indicator
  - Step validation
  - Calls AI generation endpoint
- **API:** `POST /api/applications/ai-generate`
- **i18n:** ❌ **Mostly hardcoded English** (only uses `t('common.back')`, `t('common.next')`, `t('common.loading')`, `t('common.submit')`)
- **Fields Implemented:**
  - Step 0: `purpose`, `country` (text input), `duration`
  - Step 1: `currentStatus`, `maritalStatus`, `hasChildren`
  - Step 2: `financialSituation`, `hasInvitation`
  - Step 3: `traveledBefore`, `englishLevel`
  - Step 4: Review (read-only)
- **Missing v2 Fields:**
  - ❌ No `targetCountry` (uses text input for country instead of dropdown)
  - ❌ No `visaType` selection (derived from `purpose`)
  - ❌ No `personal.ageRange`, `personal.nationality`, `personal.passportStatus`
  - ❌ No `travel.plannedWhen`, `travel.isExactDatesKnown`
  - ❌ No `status.highestEducation`, `status.isMinor`
  - ❌ No `finance.payer`, `finance.approxMonthlyIncomeRange`, `finance.hasBankStatement`, `finance.hasStableIncome`
  - ❌ No `invitation.studentInvitationType`, `invitation.touristInvitationType`
  - ❌ No `stay`, `history`, `ties`, `documents`, `special` sections
- **Error Handling:** ❌ Uses `alert()` for errors (lines 88, 91) - not user-friendly
- **Issues:**
  - Country is free text input instead of dropdown with country codes
  - Form structure doesn't match mobile app's v2 structure

#### `/chat` - AI Chat

**File:** `app/chat/page.tsx`

- **Status:** ✅ Production-ready
- **Features:**
  - Message list with user/assistant distinction
  - Input field with send button
  - Loading indicator
  - Auto-scroll to bottom
  - Supports `?applicationId=...` query param for scoped chat
- **API:** `POST /api/chat` (send), `GET /api/chat/history` (load)
- **i18n:** ✅ Fully translated
- **Error Handling:** ✅ Displays error banner
- **Persistence:** ✅ Loads from backend on mount, messages persist across devices

#### `/profile` - User Profile

**File:** `app/profile/page.tsx`

- **Status:** ⚠️ Read-only, no edit functionality
- **Features:**
  - Displays: firstName, lastName, email, phone, language
  - Fetches fresh profile on mount
- **API:** `GET /api/users/me` (via `fetchUserProfile()`)
- **i18n:** ✅ Fully translated
- **Missing:**
  - ❌ No edit form
  - ❌ No ability to update profile

#### `/support` - Help & Support

**File:** `app/support/page.tsx`

- **Status:** ✅ Production-ready
- **Features:**
  - Contact cards for Email, Phone, Telegram, WhatsApp, Instagram
  - All links are clickable (`mailto:`, `tel:`, external links)
  - Contact details match requirements:
    - Email: ketdik@gmail.com
    - Phone: +998997614313
    - Telegram: @Ketdikuz
    - WhatsApp: +998997614313
    - Instagram: \_ketdik
- **API:** None (static page)
- **i18n:** ✅ Fully translated

---

## 3. Environment & Configuration

### Environment Variables

**File:** `next.config.js`

```javascript
env: {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://visago-production.up.railway.app',
  NEXT_PUBLIC_AI_SERVICE_URL: process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'https://zippy-perfection-production.up.railway.app',
}
```

**File:** `lib/api/config.ts`

- **Logic:**
  1. Checks `process.env.NEXT_PUBLIC_API_URL` (from `next.config.js` env)
  2. If not set and on localhost → uses `http://localhost:3000`
  3. Otherwise → falls back to `https://visago-production.up.railway.app`
- **Runtime Behavior:**
  - ✅ Does NOT crash if missing (has fallbacks)
  - ✅ Logs warnings in console
  - ✅ Works in both development and production

### Required Variables for Production

| Variable                     | Required       | Default                                              | Used In                                         |
| ---------------------------- | -------------- | ---------------------------------------------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_API_URL`        | ⚠️ Recommended | `https://visago-production.up.railway.app`           | `lib/api/config.ts`                             |
| `NEXT_PUBLIC_AI_SERVICE_URL` | ❌ Not used    | `https://zippy-perfection-production.up.railway.app` | `next.config.js` (defined but never referenced) |

**Note:** `NEXT_PUBLIC_AI_SERVICE_URL` is defined in `next.config.js` but **never used** in the codebase. This is dead code.

### Hardcoded URLs

- ✅ **No hardcoded production URLs in code** (all use env vars with fallbacks)
- ⚠️ **Fallback URLs are hardcoded** in `lib/api/config.ts` and `next.config.js` (acceptable for fallback behavior)

### Configuration Issues

1. **WEB_CONFIG_01:** `NEXT_PUBLIC_AI_SERVICE_URL` is defined but never used
   - **Severity:** LOW
   - **Impact:** Dead code, no functional impact
   - **Recommendation:** Remove from `next.config.js` or implement AI service client

2. **WEB_CONFIG_02:** API URL detection relies on `window.location.hostname` check
   - **Severity:** LOW
   - **Impact:** May incorrectly detect localhost in some deployment scenarios
   - **Recommendation:** Use explicit env var for production builds

---

## 4. Persistence & Cross-Device Behavior

### Applications Persistence

**How it works:**

- **Storage:** Backend database (PostgreSQL via Prisma)
- **Fetch Endpoint:** `GET /api/users/:id/applications`
- **When fetched:**
  - On login (background, non-blocking)
  - On app initialization if user is signed in (background)
  - On `/applications` page mount
- **Local Storage:** Applications stored in Zustand store (`userApplications` array) but **NOT persisted to localStorage**
- **Cross-Device:** ✅ **Works** - applications are fetched from backend on every login

**Issues:**

- ⚠️ Applications are not cached in localStorage, so they're refetched on every page load
- ⚠️ No offline support (requires network connection)

### Chat Persistence

**How it works:**

- **Storage:** Backend database (messages stored per user, optionally per application)
- **Fetch Endpoint:** `GET /api/chat/history?applicationId=...` (optional)
- **When fetched:**
  - On `/chat` page mount
  - When `applicationId` changes via `setCurrentApplication()`
- **Local Storage:** ❌ **NOT persisted** - messages only in Zustand store (in-memory)
- **Cross-Device:** ✅ **Works** - chat history loads from backend on mount

**Issues:**

- ⚠️ Chat messages are lost on page refresh (not in localStorage)
- ⚠️ No optimistic loading from localStorage (unlike mobile app which uses AsyncStorage)
- ⚠️ **WEB_BUG_03:** Optimistic message removal on error uses wrong ID (see Bugs section)

### User Profile Persistence

**How it works:**

- **Storage:** Backend database + `localStorage` (as `user` key)
- **Fetch Endpoint:** `GET /api/users/me`
- **When fetched:**
  - On login/register
  - On app initialization (background)
  - On `/profile` page mount
- **Local Storage:** ✅ Persisted as JSON string in `localStorage.getItem('user')`
- **Cross-Device:** ✅ **Works** - profile fetched from backend, but localStorage is device-specific

### Authentication Token Persistence

**How it works:**

- **Storage:** `localStorage.getItem('auth_token')`
- **Attached:** Via Axios request interceptor
- **Expiration:** Handled by backend (401 response clears token)
- **Cross-Device:** ⚠️ **Token is device-specific** (localStorage), but backend validates token, so login on new device works

### Summary: Cross-Device Behavior

| Data Type     | Backend Storage | LocalStorage | Cross-Device Works?               |
| ------------- | --------------- | ------------ | --------------------------------- |
| Applications  | ✅ Yes          | ❌ No        | ✅ Yes (fetched on login)         |
| Chat Messages | ✅ Yes          | ❌ No        | ✅ Yes (fetched on mount)         |
| User Profile  | ✅ Yes          | ✅ Yes       | ✅ Yes (fetched on login)         |
| Auth Token    | ✅ Yes (JWT)    | ✅ Yes       | ✅ Yes (new login on each device) |

**Overall:** ✅ **Cross-device persistence works** for all critical data. Applications and chat history are stored in backend and retrieved on login/page load.

---

## 5. Questionnaire v2: Implementation & Quality

### Current Implementation vs. Mobile App v2

**Web App (`app/questionnaire/page.tsx`):**

- Uses **simplified legacy fields**, NOT the full v2 structure
- 5 steps with basic fields
- Fields: `purpose`, `country` (text), `duration`, `currentStatus`, `maritalStatus`, `hasChildren`, `financialSituation`, `hasInvitation`, `traveledBefore`, `englishLevel`

**Mobile App (`frontend_new/src/types/questionnaire-v2.ts`):**

- Uses **full v2 structure** with nested objects
- Fields organized into: `personal`, `travel`, `status`, `finance`, `invitation`, `stay`, `history`, `ties`, `documents`, `special`
- ~30-32 questions total

### Field Comparison

| v2 Field Group                                    | Mobile App                     | Web App                           | Status         |
| ------------------------------------------------- | ------------------------------ | --------------------------------- | -------------- |
| `targetCountry`                                   | ✅ Dropdown (US, GB, ES, etc.) | ❌ Text input                     | ❌ Missing     |
| `visaType`                                        | ✅ Explicit selection          | ⚠️ Derived from `purpose`         | ⚠️ Partial     |
| `personal.ageRange`                               | ✅                             | ❌                                | ❌ Missing     |
| `personal.nationality`                            | ✅                             | ❌                                | ❌ Missing     |
| `personal.passportStatus`                         | ✅                             | ❌                                | ❌ Missing     |
| `travel.durationCategory`                         | ✅                             | ⚠️ Similar (`duration`)           | ⚠️ Partial     |
| `travel.plannedWhen`                              | ✅                             | ❌                                | ❌ Missing     |
| `travel.isExactDatesKnown`                        | ✅                             | ❌                                | ❌ Missing     |
| `status.currentStatus`                            | ✅                             | ✅                                | ✅ Implemented |
| `status.highestEducation`                         | ✅                             | ❌                                | ❌ Missing     |
| `status.isMinor`                                  | ✅                             | ❌                                | ❌ Missing     |
| `finance.payer`                                   | ✅                             | ⚠️ Similar (`financialSituation`) | ⚠️ Partial     |
| `finance.approxMonthlyIncomeRange`                | ✅                             | ❌                                | ❌ Missing     |
| `finance.hasBankStatement`                        | ✅                             | ❌                                | ❌ Missing     |
| `finance.hasStableIncome`                         | ✅                             | ⚠️ Similar (`financialSituation`) | ⚠️ Partial     |
| `invitation.hasInvitation`                        | ✅                             | ✅                                | ✅ Implemented |
| `invitation.studentInvitationType`                | ✅                             | ❌                                | ❌ Missing     |
| `invitation.touristInvitationType`                | ✅                             | ❌                                | ❌ Missing     |
| `stay`, `history`, `ties`, `documents`, `special` | ✅                             | ❌                                | ❌ Missing     |

### Questionnaire Quality Assessment

**Current State:**

- ⚠️ **NOT using v2 structure** - web app uses simplified legacy format
- ⚠️ **Missing ~20+ fields** compared to mobile v2
- ⚠️ **Country input is free text** instead of dropdown with country codes
- ❌ **Most labels are hardcoded English** (not using i18n)
- ❌ **Error handling uses `alert()`** (not user-friendly)

**Effectiveness:**

- ⚠️ **Reduced effectiveness** - missing fields like `ageRange`, `nationality`, `passportStatus`, `highestEducation`, `incomeRange`, `travel history`, `ties to home country` reduce AI's ability to generate accurate checklists

**User Experience:**

- ✅ **Multi-step form** (5 steps) - good UX
- ✅ **Progress indicator** - shows step X of Y
- ✅ **Validation** - prevents proceeding without required fields
- ❌ **No field-level help text** or hints
- ❌ **No save/resume** functionality (loses progress on refresh)

### Backend Compatibility

**API Endpoint:** `POST /api/applications/ai-generate`

**Expected Payload (from web app):**

```typescript
{
  questionnaireData: {
    purpose: string,
    country: string,  // Text input, not country code
    duration: string,
    traveledBefore: boolean,
    currentStatus: string,
    hasInvitation: boolean,
    financialSituation: string,
    maritalStatus: string,
    hasChildren: string,
    englishLevel: string
  }
}
```

**Mobile App Sends:** Full `QuestionnaireV2` object with nested structure

**Compatibility:** ⚠️ **Likely works** - backend probably accepts both formats, but web app sends less data, resulting in less accurate AI-generated checklists.

### Recommendations

1. **CRITICAL:** Implement full v2 structure matching mobile app
2. **HIGH:** Replace country text input with dropdown (use country codes: US, GB, ES, etc.)
3. **HIGH:** Add all missing v2 fields (ageRange, nationality, passportStatus, education, income, etc.)
4. **MEDIUM:** Translate all questionnaire labels to UZ/RU/EN
5. **MEDIUM:** Replace `alert()` with proper error display component
6. **LOW:** Add save/resume functionality (store progress in localStorage)

---

## 6. Error Handling & Messages

### Error Handling Architecture

**Centralized Utilities:**

- **File:** `lib/utils/errorMessages.ts`
- **Function:** `getErrorMessage(error, t, language)`
- **Features:**
  - Handles network errors with translated fallbacks
  - Handles 401 (invalid credentials) with translated messages
  - Handles 409 (email exists) with translated messages
  - Falls back to English if translation missing

**API Client Error Handling:**

- **File:** `lib/api/client.ts`
- **Pattern:** All methods return `ApiResponse<T>` with `success`, `data`, `error` structure
- **Network Errors:** Detected and returned as structured error (status: 0, code: 'NETWORK_ERROR')
- **401 Handling:** Axios interceptor clears token and user data

### Error Display in UI

**Good Examples (✅):**

1. **Login Page (`app/login/page.tsx`):**
   - ✅ Uses `getErrorMessage()` utility
   - ✅ Displays error in red banner
   - ✅ Error is translated

2. **Register Page (`app/register/page.tsx`):**
   - ✅ Uses `getErrorMessage()` utility
   - ✅ Displays error in red banner
   - ✅ Error is translated

3. **Chat Page (`app/chat/page.tsx`):**
   - ✅ Displays error banner at bottom of chat
   - ✅ Error message from store

**Bad Examples (❌/⚠️):**

1. **Questionnaire Page (`app/questionnaire/page.tsx`):**
   - ❌ Uses `alert()` for errors (lines 88, 91)
   - ❌ Not user-friendly, not translated, blocks UI

2. **Forgot Password Page (`app/forgot-password/page.tsx`):**
   - ⚠️ Uses raw `err.message` without translation (line 24)
   - ⚠️ "Back to Login" text hardcoded in English

3. **Application Detail Page (`app/applications/[id]/page.tsx`):**
   - ⚠️ Errors logged to console only (line 42)
   - ⚠️ No user-visible error display

4. **Documents Page (`app/applications/[id]/documents/page.tsx`):**
   - ⚠️ Error message not translated
   - ⚠️ Success message hardcoded in English

5. **Home Page (`app/page.tsx`):**
   - ⚠️ Errors logged to console only (line 22)
   - ⚠️ No user-visible error display

### Error Message Coverage

| Error Type              | Handled?   | Translated? | User-Friendly?       |
| ----------------------- | ---------- | ----------- | -------------------- |
| Network errors          | ✅ Yes     | ✅ Yes      | ✅ Yes               |
| 401 Unauthorized        | ✅ Yes     | ✅ Yes      | ✅ Yes               |
| 409 Email exists        | ✅ Yes     | ✅ Yes      | ✅ Yes               |
| Generic API errors      | ⚠️ Partial | ⚠️ Partial  | ⚠️ Partial           |
| Questionnaire errors    | ❌ No      | ❌ No       | ❌ No (uses alert)   |
| Document upload errors  | ⚠️ Partial | ❌ No       | ⚠️ Partial           |
| Application load errors | ❌ No      | ❌ No       | ❌ No (console only) |

### Summary

**Strengths:**

- ✅ Centralized error utility with translations
- ✅ Network errors handled gracefully
- ✅ Auth errors (401, 409) handled well

**Weaknesses:**

- ❌ Questionnaire uses `alert()` instead of proper error display
- ⚠️ Several pages log errors to console without user feedback
- ⚠️ Some error messages not translated (forgot password, documents)

---

## 7. Bugs & Issues (Web App)

### WEB_BUG_01: Chat Store - Optimistic Message Removal Bug

**File:** `lib/stores/chat.ts` (lines 88-91)

**Issue:**

```typescript
// Remove optimistic user message on error
set((state) => ({
  messages: state.messages.filter((msg) => msg.id !== `user-${Date.now()}`),
}));
```

**Problem:** Uses `Date.now()` to generate filter ID, but the user message was added with ID `user-${Date.now()}` at a different time. This will **never match** and the optimistic message won't be removed.

**Severity:** MEDIUM  
**Impact:** User sees duplicate message (optimistic + actual) if send fails, or message stays if error occurs  
**Fix:** Store the user message ID in a variable and use that for filtering.

---

### WEB_BUG_02: Application Detail - Missing useEffect Dependencies

**File:** `app/applications/[id]/page.tsx` (line 26)

**Issue:**

```typescript
useEffect(() => {
  if (!isSignedIn) {
    router.push('/login');
    return;
  }
  loadData();
}, [isSignedIn, params.id]); // Missing: loadData, router
```

**Problem:** ESLint warns about missing dependencies. `loadData` and `router` should be in dependency array, or `loadData` should be wrapped in `useCallback`.

**Severity:** LOW  
**Impact:** May cause stale closures, but unlikely to cause visible bugs  
**Fix:** Add `loadData` and `router` to dependencies, or wrap `loadData` in `useCallback`.

---

### WEB_BUG_03: Questionnaire - Uses alert() for Errors

**File:** `app/questionnaire/page.tsx` (lines 88, 91)

**Issue:**

```typescript
} else {
  alert('Failed to create application');
}
} catch (error: any) {
  alert(error.message || 'Failed to create application');
}
```

**Problem:** Uses browser `alert()` which:

- Blocks UI
- Not translated
- Poor UX
- Not accessible

**Severity:** MEDIUM  
**Impact:** Poor user experience, errors not localized  
**Fix:** Use error state and display in red banner (like login/register pages).

---

### WEB_BUG_04: Register Page - Hardcoded Validation Messages

**File:** `app/register/page.tsx` (lines 30, 36)

**Issue:**

```typescript
if (formData.password !== formData.confirmPassword) {
  setError('Passwords do not match'); // Hardcoded English
  setIsSubmitting(false);
  return;
}

if (formData.password.length < 6) {
  setError('Password must be at least 6 characters'); // Hardcoded English
  setIsSubmitting(false);
  return;
}
```

**Problem:** Validation error messages are hardcoded in English, not using i18n.

**Severity:** LOW  
**Impact:** Users see English errors even if app is in Russian/Uzbek  
**Fix:** Use translation keys: `t('auth.passwordsDoNotMatch')`, `t('auth.passwordMinLength')`.

---

### WEB_BUG_05: Forgot Password - Error Not Translated

**File:** `app/forgot-password/page.tsx` (line 24)

**Issue:**

```typescript
} catch (err: any) {
  setError(err.message || 'Failed to send reset link'); // Not translated
}
```

**Problem:** Error message not passed through `getErrorMessage()` utility.

**Severity:** LOW  
**Impact:** Error messages may not be translated  
**Fix:** Use `getErrorMessage(err, t, i18n.language)`.

---

### WEB_BUG_06: Application Detail - No Error Display

**File:** `app/applications/[id]/page.tsx` (line 42)

**Issue:**

```typescript
} catch (error) {
  console.error('Failed to load application:', error); // Only console
}
```

**Problem:** Errors are logged to console but not shown to user. User sees loading state forever or empty page.

**Severity:** MEDIUM  
**Impact:** Poor UX when API fails (network error, 404, etc.)  
**Fix:** Add error state and display error message to user.

---

### WEB_BUG_07: Documents Page - Hardcoded Success/Error Messages

**File:** `app/applications/[id]/documents/page.tsx` (lines 38, 43, 46)

**Issue:**

```typescript
setSuccess('Document uploaded successfully'); // Hardcoded English
setError(response.error?.message || 'Upload failed'); // Not translated
setError(err.message || 'Upload failed'); // Not translated
```

**Problem:** Success and error messages are hardcoded in English.

**Severity:** LOW  
**Impact:** Messages not localized  
**Fix:** Use translation keys and `getErrorMessage()` utility.

---

### WEB_BUG_08: Questionnaire - Country Input Should Be Dropdown

**File:** `app/questionnaire/page.tsx` (lines 119-125)

**Issue:**

```typescript
<input
  type="text"
  value={formData.country}
  onChange={(e) => updateField('country', e.target.value)}
  placeholder="e.g., US, UK, Spain"
  className="mt-1 block w-full rounded-md border-gray-300"
/>
```

**Problem:** Free text input for country instead of dropdown. Users can type invalid values, typos, etc. Mobile app uses dropdown with country codes.

**Severity:** HIGH  
**Impact:** Invalid country values sent to backend, reduces AI accuracy  
**Fix:** Replace with `<select>` dropdown using country codes (US, GB, ES, DE, JP, AE, CA, AU, etc.).

---

### WEB_BUG_09: Chat - No Retry on Error

**File:** `app/chat/page.tsx`

**Issue:** When `sendMessage()` fails, error is displayed but there's no retry button. User must manually retype message.

**Severity:** LOW  
**Impact:** Minor UX issue  
**Fix:** Add "Retry" button next to error message.

---

### WEB_BUG_10: Profile - No Edit Functionality

**File:** `app/profile/page.tsx`

**Issue:** Profile page is read-only. No way to update name, phone, language, etc.

**Severity:** LOW (may be intentional)  
**Impact:** Users cannot update their profile from web app  
**Fix:** Add edit form with `updateProfile()` API call.

---

### WEB_BUG_11: Layout - Language Change Not Saved to Backend

**File:** `components/Layout.tsx` (lines 27-35)

**Issue:**

```typescript
const changeLanguage = (lang: string) => {
  if (i18n) {
    i18n.changeLanguage(lang);
    setCurrentLang(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_language', lang); // Only localStorage
    }
  }
};
```

**Problem:** Language preference saved to localStorage but not to backend user profile. Language resets on new device.

**Severity:** LOW  
**Impact:** Language preference not synced across devices  
**Fix:** Call `updateProfile({ language: lang })` after changing language.

---

### WEB_BUG_12: TypeScript Version Warning

**File:** `package.json`

**Issue:** TypeScript 5.9.3 is used, but ESLint supports up to 5.6.0.

**Severity:** LOW  
**Impact:** May cause ESLint false positives, but no runtime issues  
**Fix:** Downgrade TypeScript to <5.6.0 or ignore warning.

---

### Summary of Bugs

| Bug ID     | Severity | Status  | Impact                                       |
| ---------- | -------- | ------- | -------------------------------------------- |
| WEB_BUG_01 | MEDIUM   | Unfixed | Chat optimistic message not removed on error |
| WEB_BUG_02 | LOW      | Unfixed | ESLint warning, unlikely to cause issues     |
| WEB_BUG_03 | MEDIUM   | Unfixed | Poor UX, errors not localized                |
| WEB_BUG_04 | LOW      | Unfixed | Validation messages not translated           |
| WEB_BUG_05 | LOW      | Unfixed | Error messages not translated                |
| WEB_BUG_06 | MEDIUM   | Unfixed | No error display on application load failure |
| WEB_BUG_07 | LOW      | Unfixed | Success/error messages not translated        |
| WEB_BUG_08 | HIGH     | Unfixed | Invalid country values, reduces AI accuracy  |
| WEB_BUG_09 | LOW      | Unfixed | No retry button on chat error                |
| WEB_BUG_10 | LOW      | Unfixed | No profile edit functionality                |
| WEB_BUG_11 | LOW      | Unfixed | Language not saved to backend                |
| WEB_BUG_12 | LOW      | Unfixed | TypeScript version warning                   |

**Total:** 12 bugs (2 HIGH, 4 MEDIUM, 6 LOW)

---

## 8. Production Readiness (Web App)

### Current Status

**Overall Assessment:** ⚠️ **BETA / TESTING** - Not ready for production without fixes

**Reasoning:**

- Core features work (auth, applications, chat)
- Questionnaire is simplified and missing v2 fields (reduces effectiveness)
- Several bugs need fixing (especially WEB_BUG_01, WEB_BUG_03, WEB_BUG_06, WEB_BUG_08)
- Some error handling needs improvement
- i18n coverage incomplete in some areas

### Top 5 Blockers for Production

1. **WEB_BUG_08:** Questionnaire uses text input for country instead of dropdown
   - **Impact:** Invalid country values, reduced AI accuracy
   - **Fix:** Replace with dropdown using country codes

2. **Questionnaire v2 Structure:** Web app doesn't use full v2 structure
   - **Impact:** Missing ~20+ fields, less effective AI-generated checklists
   - **Fix:** Implement full v2 structure matching mobile app

3. **WEB_BUG_03:** Questionnaire uses `alert()` for errors
   - **Impact:** Poor UX, errors not localized
   - **Fix:** Replace with proper error display component

4. **WEB_BUG_06:** Application detail page has no error display
   - **Impact:** Users see loading state forever on API failures
   - **Fix:** Add error state and display error message

5. **i18n Coverage:** Several pages have hardcoded English strings
   - **Impact:** Incomplete localization (forgot password, documents, questionnaire)
   - **Fix:** Add translation keys and use `t()` function

### Gaps vs. Mobile App

**What Web App Can Do:**

- ✅ Login, register, forgot password
- ✅ View applications list and details
- ✅ View document checklist
- ✅ Upload documents
- ✅ AI chat (global and per-application)
- ✅ View profile
- ✅ Support page with contact info

**What Only Mobile App Can Do:**

- ✅ Full questionnaire v2 with all fields
- ✅ Profile editing
- ✅ Offline support (AsyncStorage caching)
- ✅ Push notifications (if implemented)

**What Both Can Do (but differently):**

- ⚠️ Questionnaire: Mobile has full v2, web has simplified version
- ⚠️ Chat: Both work, but mobile has AsyncStorage caching for instant display

### Production Readiness Checklist

**For the Owner (Non-Technical Summary):**

- [ ] **Set `NEXT_PUBLIC_API_URL`** environment variable for production deployment
- [ ] **Fix questionnaire** - implement full v2 structure with all fields (currently missing ~20+ fields)
- [ ] **Fix country input** - replace text input with dropdown (currently allows invalid values)
- [ ] **Fix error messages** - replace `alert()` with proper error display in questionnaire
- [ ] **Add error display** - show errors to users when application/documents fail to load
- [ ] **Complete translations** - add missing translation keys for forgot password, documents, questionnaire
- [ ] **Test login + chat + apps cross-device** - verify data syncs between mobile and web
- [ ] **Test questionnaire v2 flow end-to-end** - ensure AI generates accurate checklists
- [ ] **Test document upload and AI validation** - verify validation results are displayed (currently missing)
- [ ] **Verify error messages are human-readable and localized** - test in UZ/RU/EN
- [ ] **Fix chat optimistic message bug** - ensure failed messages are properly removed
- [ ] **Consider adding profile edit** - currently read-only

### Deployment Requirements

**Environment Variables:**

```bash
NEXT_PUBLIC_API_URL=https://visago-production.up.railway.app
# NEXT_PUBLIC_AI_SERVICE_URL is not used, can be removed
```

**Build Command:**

```bash
cd apps/web
npm run build
```

**Start Command:**

```bash
npm run start
```

**Deployment Platforms:**

- ✅ Vercel (recommended for Next.js)
- ✅ Railway (static hosting)
- ✅ Any Node.js hosting with static file serving

### Security Considerations

- ✅ JWT tokens stored in localStorage (acceptable for web)
- ✅ Tokens attached via Axios interceptor (automatic)
- ✅ 401 responses clear tokens (good)
- ⚠️ No CSRF protection (may be needed if using cookies in future)
- ⚠️ No rate limiting on client (relies on backend)

### Performance Considerations

- ✅ Next.js App Router (good performance)
- ✅ Client-side rendering (fast initial load)
- ⚠️ No code splitting optimization (all pages load full bundle)
- ⚠️ No image optimization (if images added in future)
- ⚠️ Applications refetched on every page load (not cached)

### Final Recommendation

**Status:** ⚠️ **BETA - Needs fixes before production**

**Priority Actions:**

1. Fix questionnaire v2 structure (HIGH)
2. Fix country dropdown (HIGH)
3. Fix error handling in questionnaire and application detail (MEDIUM)
4. Complete i18n coverage (MEDIUM)
5. Fix chat optimistic message bug (MEDIUM)

**Estimated Time to Production-Ready:** 2-3 days of development work

---

## Appendix: Comparison with Mobile App

### Questionnaire Structure Comparison

**Mobile App (v2):**

- Full nested structure: `personal`, `travel`, `status`, `finance`, `invitation`, `stay`, `history`, `ties`, `documents`, `special`
- ~30-32 questions
- Dropdowns for all selections
- Country codes (US, GB, ES, etc.)

**Web App (current):**

- Simplified flat structure: `purpose`, `country` (text), `duration`, `currentStatus`, etc.
- ~10 questions
- Mix of text inputs and dropdowns
- Free text for country

### API Endpoint Comparison

**Mobile App:**

- Chat: `POST /api/chat` (same as web)
- History: `GET /api/chat/history` (same as web)
- Applications: `GET /api/users/:id/applications` (same as web)

**Web App:**

- Uses same endpoints as mobile ✅

### State Management Comparison

**Mobile App:**

- Zustand with persistence (AsyncStorage)
- Chat history cached locally

**Web App:**

- Zustand without persistence (localStorage only for auth)
- Chat history not cached (fetched on mount)

---

**End of Report**
