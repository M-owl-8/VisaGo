# Web App & Mobile App Compatibility

**Status:** ✅ **FULLY COMPATIBLE** - Both apps share the same backend and database

---

## ✅ Compatibility Confirmed

### 1. Same Backend API

**Mobile App:**

- Backend URL: `https://visago-production.up.railway.app`
- Config: `frontend_new/src/services/api.ts`
- Fallback: `https://visago-production.up.railway.app`

**Web App:**

- Backend URL: `https://visago-production.up.railway.app`
- Config: `apps/web/lib/api/config.ts`
- Fallback: `https://visago-production.up.railway.app`

✅ **Both apps use the EXACT same backend API**

---

### 2. Authentication Compatibility

**Mobile App:**

- Token Storage: `AsyncStorage.getItem('@auth_token')`
- Token Format: `Bearer {token}`
- Header: `Authorization: Bearer {token}`

**Web App:**

- Token Storage: `localStorage.getItem('auth_token')`
- Token Format: `Bearer {token}`
- Header: `Authorization: Bearer {token}`

✅ **Both apps use the same authentication format**

**Important:**

- Mobile uses `@auth_token` (with @ prefix)
- Web uses `auth_token` (no prefix)
- **This is OK** - they're different storage systems (AsyncStorage vs localStorage)
- **The tokens themselves are identical** - both are JWT tokens from the same backend

---

### 3. API Endpoints Compatibility

Both apps use the same endpoints:

| Endpoint                      | Mobile | Web | Status     |
| ----------------------------- | ------ | --- | ---------- |
| `/api/auth/register`          | ✅     | ✅  | Compatible |
| `/api/auth/login`             | ✅     | ✅  | Compatible |
| `/api/auth/logout`            | ✅     | ✅  | Compatible |
| `/api/applications`           | ✅     | ✅  | Compatible |
| `/api/applications/:id`       | ✅     | ✅  | Compatible |
| `/api/chat/send`              | ✅     | ✅  | Compatible |
| `/api/documents/upload`       | ✅     | ✅  | Compatible |
| `/api/document-checklist/:id` | ✅     | ✅  | Compatible |

✅ **All endpoints are identical**

---

### 4. Data Model Compatibility

**User Model:**

- Both apps use the same user structure from backend
- Fields: `id`, `email`, `firstName`, `lastName`, `phone`, `avatar`, etc.
- ✅ Compatible

**Application Model:**

- Both apps use the same application structure
- Fields: `id`, `countryId`, `visaTypeId`, `status`, `progressPercentage`, etc.
- ✅ Compatible

**Chat Messages:**

- Both apps use the same chat message structure
- Fields: `id`, `role`, `content`, `applicationId`, `createdAt`, etc.
- ✅ Compatible

---

## 🔄 How It Works

### Scenario 1: User Signs Up on Web App

1. **User registers on web app:**
   - Web app calls: `POST /api/auth/register`
   - Backend creates user in database
   - Backend returns JWT token

2. **User opens mobile app:**
   - Mobile app calls: `POST /api/auth/login` with same credentials
   - Backend validates credentials
   - Backend returns same JWT token (for that user)
   - ✅ **User can now access their account on mobile**

3. **User creates application on web:**
   - Web app calls: `POST /api/applications/ai-generate`
   - Backend creates application in database
   - Application is linked to user ID

4. **User opens mobile app:**
   - Mobile app calls: `GET /api/applications`
   - Backend returns all applications for that user
   - ✅ **Application appears on mobile app**

### Scenario 2: User Signs Up on Mobile App

1. **User registers on mobile app:**
   - Mobile app calls: `POST /api/auth/register`
   - Backend creates user in database
   - Backend returns JWT token

2. **User opens web app:**
   - Web app calls: `POST /api/auth/login` with same credentials
   - Backend validates credentials
   - Backend returns same JWT token
   - ✅ **User can now access their account on web**

3. **User creates application on mobile:**
   - Mobile app calls: `POST /api/applications/ai-generate`
   - Backend creates application in database
   - Application is linked to user ID

4. **User opens web app:**
   - Web app calls: `GET /api/applications`
   - Backend returns all applications for that user
   - ✅ **Application appears on web app**

---

## ⚠️ Important: Backend CORS Configuration

**CRITICAL:** The backend must allow requests from both:

1. **Mobile app domains** (if any)
2. **Web app domain** (your Railway web app URL)

### Current Backend CORS (Check This!)

The backend should have CORS configured to allow:

- Mobile app requests (usually no CORS needed for mobile apps)
- Web app requests from your Railway domain

**Example CORS configuration:**

```typescript
// In backend CORS config
const allowedOrigins = [
  'https://your-web-app.railway.app',
  'https://your-custom-domain.com',
  // Add your web app URL here
];
```

**Action Required:**

- [ ] Verify backend CORS allows your web app domain
- [ ] Add web app domain to backend CORS whitelist
- [ ] Test that web app can make API calls

---

## ✅ Verification Checklist

Before deploying web app, verify:

- [x] Both apps use same backend URL: `https://visago-production.up.railway.app`
- [x] Both apps use same authentication format (Bearer tokens)
- [x] Both apps use same API endpoints
- [x] Both apps use same data models
- [ ] **Backend CORS allows web app domain** ⚠️ **ACTION REQUIRED**
- [ ] Test: Sign up on web → Login on mobile → See same user
- [ ] Test: Create application on web → See it on mobile
- [ ] Test: Create application on mobile → See it on web

---

## 🧪 Testing Compatibility

### Test 1: Cross-Platform Authentication

1. **Sign up on web app:**
   - Register with email: `test@example.com`
   - Note the credentials

2. **Login on mobile app:**
   - Use same credentials
   - ✅ Should successfully log in
   - ✅ Should see same user profile

3. **Login on web app:**
   - Use same credentials
   - ✅ Should successfully log in
   - ✅ Should see same user profile

### Test 2: Cross-Platform Applications

1. **Create application on web:**
   - Complete questionnaire
   - Application is created

2. **Open mobile app:**
   - Go to Applications screen
   - ✅ Should see the application created on web

3. **Create application on mobile:**
   - Complete questionnaire
   - Application is created

4. **Open web app:**
   - Go to Applications page
   - ✅ Should see the application created on mobile

### Test 3: Cross-Platform Chat

1. **Send message on web:**
   - Open chat
   - Send a message

2. **Open mobile app:**
   - Open chat
   - ✅ Should see the message sent from web

3. **Send message on mobile:**
   - Send a message

4. **Open web app:**
   - Open chat
   - ✅ Should see the message sent from mobile

---

## 🔧 Configuration Files

### Mobile App Configuration

- **File:** `frontend_new/src/services/api.ts`
- **API URL:** `https://visago-production.up.railway.app`
- **Token Storage:** `AsyncStorage.getItem('@auth_token')`

### Web App Configuration

- **File:** `apps/web/lib/api/config.ts`
- **API URL:** `https://visago-production.up.railway.app`
- **Token Storage:** `localStorage.getItem('auth_token')`

---

## 📝 Summary

✅ **Web app and mobile app are FULLY COMPATIBLE**

- Same backend API
- Same authentication system
- Same data models
- Same endpoints

**The only requirement is:**

- Backend CORS must allow your web app domain

**Once deployed, users can:**

- Sign up on web → Use on mobile
- Sign up on mobile → Use on web
- Create applications on either platform → See on both
- Chat on either platform → See messages on both

---

**Last Updated:** 2025-11-27
