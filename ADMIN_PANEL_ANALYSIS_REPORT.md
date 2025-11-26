# Admin Panel Analysis Report

## VisaBuddy / Ketdik Monorepo

**Date:** 2025-01-27  
**Status:** PARTIAL IMPLEMENTATION

---

## A. Summary — Does an admin panel exist?

**Status: PARTIAL**

The VisaBuddy/Ketdik monorepo has a **fully functional backend admin API** with comprehensive admin endpoints, services, and role-based access control. However, the **frontend admin UI exists but is not accessible** through the mobile app navigation. There is **no separate admin web application**.

**Key Findings:**

- ✅ Backend admin API: Complete and functional
- ⚠️ Frontend admin screens: Implemented but not integrated into navigation
- ❌ Separate admin app: Does not exist
- ⚠️ Frontend role-based access: Not implemented

---

## B. Backend Admin Capabilities

### B.1. Routes

**File:** `apps/backend/src/routes/admin.ts`

All admin routes are mounted at `/api/admin/*` and protected by:

- `authenticateToken` middleware (JWT authentication)
- `requireAdmin` middleware (checks for `admin` or `super_admin` role)

#### Admin Endpoints:

| Method | Path                                            | Description                                                               | Middleware                          |
| ------ | ----------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------- |
| GET    | `/api/admin/dashboard`                          | Get main dashboard metrics (users, applications, revenue, documents)      | `authenticateToken`, `requireAdmin` |
| GET    | `/api/admin/analytics`                          | Get analytics summary (30-day stats, top countries)                       | `authenticateToken`, `requireAdmin` |
| GET    | `/api/admin/users`                              | Get all users with pagination (skip, take)                                | `authenticateToken`, `requireAdmin` |
| GET    | `/api/admin/users/:userId`                      | Get detailed user information (applications, payments, activity logs)     | `authenticateToken`, `requireAdmin` |
| PATCH  | `/api/admin/users/:userId/role`                 | Update user role (user, admin, super_admin)                               | `authenticateToken`, `requireAdmin` |
| GET    | `/api/admin/applications`                       | Get all visa applications with pagination                                 | `authenticateToken`, `requireAdmin` |
| PATCH  | `/api/admin/applications/:applicationId/status` | Update application status (draft, submitted, approved, rejected, expired) | `authenticateToken`, `requireAdmin` |
| GET    | `/api/admin/payments`                           | Get all payments with pagination                                          | `authenticateToken`, `requireAdmin` |
| GET    | `/api/admin/documents/verification-queue`       | Get pending document verification queue                                   | `authenticateToken`, `requireAdmin` |
| PATCH  | `/api/admin/documents/:documentId/verify`       | Verify or reject document (with optional notes)                           | `authenticateToken`, `requireAdmin` |
| GET    | `/api/admin/analytics/metrics`                  | Get detailed metrics for a period (default 30 days)                       | `authenticateToken`, `requireAdmin` |
| GET    | `/api/admin/analytics/conversion-funnel`        | Get conversion funnel data                                                | `authenticateToken`, `requireAdmin` |
| GET    | `/api/admin/analytics/user-acquisition`         | Get user acquisition breakdown by source                                  | `authenticateToken`, `requireAdmin` |
| GET    | `/api/admin/analytics/events`                   | Get event breakdown (default 30 days)                                     | `authenticateToken`, `requireAdmin` |

**Rate Limiting:** Admin routes use `strictLimiter` middleware for additional protection.

### B.2. Models / Roles

**File:** `apps/backend/prisma/schema.prisma`

#### User Role System:

The `User` model includes a `role` field:

```prisma
model User {
  // ... other fields
  role              String    @default("user")
  // ... relations
  @@index([role])
}
```

**Role Values:**

- `"user"` (default) - Regular user
- `"admin"` - Admin user (can access admin endpoints)
- `"super_admin"` - Super admin (can access admin endpoints)

**Role Indexing:** The `role` field is indexed for efficient queries.

#### Admin-Specific Models:

1. **AdminLog** - Tracks admin actions:
   - `action` (create, update, delete, approve, reject)
   - `entityType` (User, VisaApplication, Payment, etc.)
   - `entityId`
   - `performedBy` (Admin user ID)
   - `changes` (JSON with before/after)
   - `reason` (optional)

2. **UserDocument** - Has admin verification fields:
   - `status` (pending, verified, rejected)
   - `verificationNotes` (admin notes)
   - `verifiedByAI` (Boolean)
   - `aiConfidence` (Float)
   - `aiNotesUz`, `aiNotesRu`, `aiNotesEn` (AI-generated notes)

3. **VisaApplication** - Has admin review fields:
   - `status` (draft, submitted, approved, rejected, expired)
   - `approvalDate` (set when status changes to approved)
   - `notes` (admin notes)

**No dedicated Admin model** - Admin status is determined by the `role` field on the User model.

### B.3. Services

#### AdminService (`apps/backend/src/services/admin.service.ts`)

**Methods:**

1. **`getDashboardMetrics()`** - Returns:
   - Total users, applications, revenue, verified documents
   - Application breakdown by status (draft, submitted, approved, rejected, expired)
   - Payment breakdown by status (pending, completed, failed, refunded)
   - Revenue by country (top 10)
   - Document statistics (pending verification, verification rate)

2. **`getUsers(skip, take)`** - Returns paginated user list with:
   - User details (id, email, firstName, lastName, role, createdAt)
   - Application count, document count, total spent

3. **`getUserDetails(userId)`** - Returns full user profile with:
   - All visa applications (with country, visa type, payment, documents)
   - Payment history
   - Activity logs
   - User preferences

4. **`getApplications(skip, take)`** - Returns paginated applications with:
   - User info (email, name)
   - Country and visa type names
   - Status, progress percentage
   - Document counts (total and verified)
   - Payment status and amount

5. **`getPayments(skip, take)`** - Returns paginated payments with:
   - User email
   - Amount, currency, status, payment method
   - Country name
   - Paid date

6. **`getDocumentVerificationQueue(skip, take)`** - Returns pending documents with:
   - User info (email, name)
   - Document name, type
   - Application country
   - Upload date

7. **`updateApplicationStatus(applicationId, status)`** - Updates application status and sets `approvalDate` if approved

8. **`updateDocumentStatus(documentId, status, notes?)`** - Verifies or rejects document with optional notes

9. **`updateUserRole(userId, role)`** - Updates user role (validates: user, admin, super_admin)

10. **`getAnalyticsSummary()`** - Returns 30-day summary:
    - New users, applications, documents, revenue
    - Top 5 countries by application count

**Pagination:** All list endpoints support pagination with:

- `skip` parameter (default: 0)
- `take` parameter (default: 20, max: 100)

**Performance Considerations:**

- ✅ Pagination implemented for all list endpoints
- ⚠️ `getDashboardMetrics()` performs multiple queries (could be optimized with aggregation)
- ⚠️ `getUsers()` loads all related data (applications, documents, payments) - could be optimized with selective includes

#### AnalyticsService (`apps/backend/src/services/analytics.service.ts`)

Used by admin routes for analytics endpoints:

- `getMetrics(days)` - Detailed metrics for a period
- `getConversionFunnel()` - Conversion funnel data
- `getUserAcquisition()` - User acquisition by source
- `getEventBreakdown(days)` - Event breakdown

### B.4. Middleware

**File:** `apps/backend/src/middleware/admin.ts`

**`requireAdmin`** - Checks if user has `admin` or `super_admin` role:

1. Verifies `req.userId` exists (from `authenticateToken`)
2. Fetches user from database
3. Checks if `user.role === "admin" || user.role === "super_admin"`
4. Returns 403 if not admin
5. Sets `req.userRole` for downstream use

**`requireSuperAdmin`** - Checks if user has `super_admin` role:

- Similar to `requireAdmin` but only allows `super_admin` role
- Currently not used in any routes (available for future use)

**Authentication Flow:**

1. JWT token validated by `authenticateToken` middleware
2. `req.userId` extracted from JWT payload
3. `requireAdmin` middleware queries database to verify role
4. Request proceeds if role check passes

---

## C. Frontend Admin UI

### C.1. Separate Admin App?

**Status: NO**

There is **no separate admin web application** in the monorepo. The `apps/` directory contains:

- `apps/backend/` - Backend API server
- `apps/ai-service/` - Python AI service
- No admin web app (no Next.js, Vite, or CRA admin application)

### C.2. Admin Inside frontend_new?

**Status: PARTIAL - Screens exist but are not accessible**

#### Admin Screens Location:

All admin screens are located in `frontend_new/src/screens/admin/`:

1. **AdminDashboard.tsx** - Main dashboard with:
   - Key metrics cards (users, applications, revenue, documents)
   - Application status breakdown
   - Payment status breakdown
   - Document statistics
   - Top countries by revenue
   - Navigation buttons to other admin screens

2. **AdminUsersScreen.tsx** - User management with:
   - Paginated user list
   - User details (email, name, role, stats)
   - Role change modal (user, admin, super_admin)
   - User stats (applications, documents, total spent)

3. **AdminApplicationsScreen.tsx** - Application management with:
   - Paginated application list
   - Application details (country, visa type, user, status)
   - Progress percentage visualization
   - Status change modal (draft, submitted, approved, rejected, expired)
   - Document and payment status

4. **AdminPaymentsScreen.tsx** - Payment tracking with:
   - Paginated payment list
   - Summary cards (total revenue, completed, pending, failed, refunded)
   - Payment details (amount, currency, method, country, dates)

5. **AdminDocumentsScreen.tsx** - Document verification queue with:
   - Pending document list
   - Document details (name, type, user, country)
   - Approve/reject actions with notes
   - Processed count tracking

6. **AdminAnalyticsScreen.tsx** - Analytics dashboard with:
   - Period selector (7, 30, 90 days)
   - Key metrics cards
   - Revenue trend chart (LineChart)
   - Top countries pie chart
   - Conversion funnel modal
   - Payment methods breakdown
   - Top visa types
   - Event breakdown
   - User acquisition sources

#### Navigation Integration:

**CRITICAL ISSUE:** Admin screens are **NOT registered** in the navigation stack.

**File:** `frontend_new/src/App.tsx`

The `MainAppStack` component (lines 211-297) does **NOT** include any admin screen routes. The navigation only includes:

- MainTabs (Applications, Chat, Profile)
- ApplicationDetail
- DocumentUpload
- DocumentPreview
- ProfileEdit
- Questionnaire
- Language
- NotificationSettings
- Security
- HelpSupport

**No admin routes are registered**, meaning:

- ❌ Admin screens cannot be navigated to
- ❌ No role-based access control in navigation
- ❌ No conditional rendering based on user role

#### Role-Based Access Control:

**Status: NOT IMPLEMENTED**

- ❌ No `isAdmin` check in `ProfileScreen.tsx`
- ❌ No admin menu item in profile
- ❌ No role check in navigation
- ❌ User role is not checked before showing admin screens

**User Role Access:**
The `useAuthStore` (`frontend_new/src/store/auth.ts`) stores user data, but there's no check for `user.role === "admin"` or `user.role === "super_admin"` to conditionally show admin navigation.

#### API Integration:

Admin screens use direct `axios` calls to admin endpoints:

- Base URL: `process.env.REACT_APP_API_URL || "http://localhost:3000"`
- Endpoints: `/api/admin/*`
- Authentication: `Authorization: Bearer ${localStorage.getItem("token")}`

**Note:** Using `localStorage` in React Native is problematic - should use `AsyncStorage` instead.

---

## D. What Can an Admin Currently Do?

### D.1. Users

| Capability        | Status           | Details                                        |
| ----------------- | ---------------- | ---------------------------------------------- |
| List all users    | ✅ Available     | Paginated list with stats                      |
| View user details | ✅ Available     | Full profile with applications, payments, logs |
| Update user role  | ✅ Available     | Change to user, admin, or super_admin          |
| Delete users      | ❌ Not available | No DELETE endpoint                             |
| Suspend users     | ❌ Not available | No suspend/ban functionality                   |

### D.2. Applications

| Capability                 | Status                 | Details                                                           |
| -------------------------- | ---------------------- | ----------------------------------------------------------------- |
| View all applications      | ✅ Available           | Paginated list with full details                                  |
| Filter by country          | ❌ Not available       | No filtering endpoints                                            |
| Filter by status           | ❌ Not available       | No filtering endpoints                                            |
| Filter by date             | ❌ Not available       | No date range filtering                                           |
| View questionnaire answers | ⚠️ Partially available | User `bio` field contains questionnaire data (JSON string)        |
| View document status       | ✅ Available           | Document count and verification status shown                      |
| View AI verification       | ✅ Available           | `verifiedByAI`, `aiConfidence`, `aiNotes` fields                  |
| Update application status  | ✅ Available           | Can change status (draft, submitted, approved, rejected, expired) |

### D.3. Documents

| Capability                | Status                 | Details                                                        |
| ------------------------- | ---------------------- | -------------------------------------------------------------- |
| View uploaded documents   | ✅ Available           | Verification queue shows pending documents                     |
| View document details     | ⚠️ Partially available | Shows name, type, user, country, upload date (no file preview) |
| Manually approve document | ✅ Available           | Can verify with optional notes                                 |
| Manually reject document  | ✅ Available           | Can reject with optional notes                                 |
| View document file        | ❌ Not available       | No file preview/download in admin UI                           |

### D.4. Payments

| Capability           | Status           | Details                                 |
| -------------------- | ---------------- | --------------------------------------- |
| View all payments    | ✅ Available     | Paginated list with full details        |
| View payment details | ✅ Available     | Amount, currency, status, method, dates |
| Filter by status     | ❌ Not available | No filtering endpoints                  |
| Filter by date       | ❌ Not available | No date range filtering                 |
| Refund payments      | ❌ Not available | No refund endpoint in admin routes      |

### D.5. Analytics

| Capability             | Status           | Details                                            |
| ---------------------- | ---------------- | -------------------------------------------------- |
| View dashboard metrics | ✅ Available     | Total users, applications, revenue, documents      |
| View analytics summary | ✅ Available     | 30-day stats, top countries                        |
| View conversion funnel | ✅ Available     | Signup → Visa → Payment → Document funnel          |
| View user acquisition  | ✅ Available     | Breakdown by source (email, google, organic, etc.) |
| View event breakdown   | ✅ Available     | Event counts by type                               |
| View revenue trends    | ✅ Available     | Daily trends chart                                 |
| Export data            | ❌ Not available | No CSV/Excel export functionality                  |

### D.6. AI / Logs

| Capability         | Status           | Details                              |
| ------------------ | ---------------- | ------------------------------------ |
| View AI logs       | ❌ Not available | No AI request/response logs endpoint |
| View errors        | ❌ Not available | No error logs endpoint               |
| View slow requests | ❌ Not available | No performance monitoring endpoint   |
| View chat logs     | ❌ Not available | No chat message logs endpoint        |

### D.7. Content Management

| Capability             | Status           | Details                      |
| ---------------------- | ---------------- | ---------------------------- |
| Edit visa requirements | ❌ Not available | No CMS for visa requirements |
| Edit KB articles       | ❌ Not available | No CMS for knowledge base    |
| Edit guides            | ❌ Not available | No content management system |

---

## E. Gaps & Limitations

### E.1. Critical Gaps

1. **Admin UI Not Accessible**
   - Admin screens exist but are not registered in navigation
   - No way for admins to access admin features from mobile app
   - No role-based navigation guards

2. **No Frontend Role Check**
   - User role is not checked before showing admin screens
   - No conditional rendering based on `user.role`
   - Admin screens could be accessed by regular users if navigation was added

3. **No Separate Admin Web App**
   - Admin features are in mobile app (not ideal for desktop admin work)
   - No dedicated admin interface optimized for desktop

4. **Missing Features**
   - No user deletion/suspension
   - No payment refunds from admin panel
   - No document file preview
   - No filtering/search on list endpoints
   - No export functionality
   - No AI/error logs viewing
   - No content management system

### E.2. Current Risks

1. **No Admin Oversight**
   - Admins cannot access admin features (screens not in navigation)
   - No way to manage users, applications, or documents from UI
   - All admin operations must be done via API calls (Postman, curl, etc.)

2. **No Way to Fix AI Issues**
   - Cannot view AI logs or errors
   - Cannot manually override AI decisions without database access
   - No visibility into AI performance

3. **Limited Document Management**
   - Cannot preview documents before verification
   - No bulk verification
   - No document search/filtering

4. **No Audit Trail in UI**
   - `AdminLog` model exists but no UI to view logs
   - Cannot see who made what changes and when

5. **Security Concerns**
   - Admin screens use `localStorage` instead of `AsyncStorage` (React Native issue)
   - No frontend role validation (relies entirely on backend)
   - If navigation is added without role checks, regular users could access admin screens

---

## F. Notes for Future Implementation

### F.1. Immediate Fixes Needed

1. **Add Admin Navigation**
   - Register admin screens in `App.tsx` `MainAppStack`
   - Add role-based navigation guards
   - Conditionally show admin menu item in ProfileScreen based on `user.role`

2. **Fix React Native Issues**
   - Replace `localStorage` with `AsyncStorage` in admin screens
   - Fix API base URL configuration for mobile app

3. **Add Role Checks**
   - Check `user.role === "admin" || user.role === "super_admin"` before showing admin screens
   - Add navigation guards that redirect non-admins

### F.2. Recommended Enhancements

1. **Separate Admin Web App**
   - Create `apps/admin-web/` with Next.js or Vite
   - Desktop-optimized admin interface
   - Better for managing large datasets
   - Can use web-specific features (file uploads, charts, tables)

2. **Enhanced Admin Features**
   - User deletion/suspension
   - Payment refunds
   - Document file preview
   - Advanced filtering/search
   - CSV/Excel export
   - AI logs viewer
   - Error logs viewer
   - Audit log viewer (AdminLog model)
   - Bulk operations (bulk verify documents, bulk update status)

3. **Content Management**
   - CMS for visa requirements
   - CMS for knowledge base articles
   - CMS for guides and FAQs

4. **Performance Optimizations**
   - Optimize `getDashboardMetrics()` with database aggregations
   - Add caching for dashboard metrics
   - Implement virtual scrolling for large lists

5. **Security Enhancements**
   - Add frontend role validation
   - Add admin activity logging to AdminLog
   - Add two-factor authentication for admin accounts
   - Add IP whitelisting for admin endpoints (optional)

### F.3. Code Reuse Opportunities

The following existing code can be reused for a future admin panel:

1. **Backend Services:**
   - `AdminService` - Complete admin business logic
   - `AnalyticsService` - Analytics and metrics
   - Admin routes - All endpoints ready to use

2. **Database Models:**
   - `AdminLog` - Audit trail model (needs UI)
   - Role system - Already implemented in User model
   - All existing models have admin-relevant fields

3. **Frontend Screens:**
   - All admin screens are implemented and functional
   - Just need navigation integration and role checks

---

## G. Conclusion

The VisaBuddy/Ketdik monorepo has a **solid backend admin API foundation** with comprehensive endpoints, services, and role-based access control. However, the **admin UI is not accessible** because:

1. Admin screens are not registered in navigation
2. No role-based access control in frontend
3. No separate admin web application

**Recommendation:** The quickest path to a functional admin panel is to:

1. Add admin screens to navigation with role checks
2. Add admin menu item in ProfileScreen for admin users
3. Fix React Native-specific issues (AsyncStorage, API URLs)

For a production-ready admin experience, consider building a separate admin web application that can leverage the existing backend API.

---

**Report Generated:** 2025-01-27  
**Analysis Scope:** Backend (`apps/backend/`), Frontend (`frontend_new/`), AI Service (`apps/ai-service/`)
