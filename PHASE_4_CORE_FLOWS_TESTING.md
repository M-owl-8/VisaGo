# PHASE 4: Core Flows Testing Guide

**Purpose**: Systematically test all important user flows  
**Time**: 1-2 hours  
**Success Criteria**: All flows pass without errors

---

## 📋 Test Flows Overview

| # | Flow | Time | Priority |
|---|------|------|----------|
| 1 | Google Login | 5 min | 🔴 Critical |
| 2 | Dashboard Navigation | 5 min | 🔴 Critical |
| 3 | AI Chat | 5 min | 🔴 Critical |
| 4 | Document Upload | 10 min | 🟠 High |
| 5 | User Profile | 5 min | 🟠 High |
| 6 | Payment Flow (Test) | 10 min | 🟡 Medium |
| 7 | Logout | 5 min | 🟢 Low |

**Total Time: 45 minutes minimum**

---

## Test 1: Google Login (🔴 CRITICAL)

### Setup
- App is running on emulator/web/phone
- You see the login screen

### Steps

**Step 1.1: Tap "Login with Google"**
- Click the big blue "Login with Google" button
- Expected: Google OAuth dialog opens

**Step 1.2: Enter Google Credentials**
- Select your Google account OR
- Enter email: your-email@gmail.com
- Enter password: your-password
- Expected: OAuth consent screen appears

**Step 1.3: Approve Permissions**
- See permissions requested: "email, profile"
- Click "Allow" or "Continue"
- Expected: Redirects back to app

**Step 1.4: Verify Login Success**
- Check: Are you on the dashboard/home screen?
- Check: Does user name appear at top?
- Check: Can you see welcome message?

### ✅ Success Indicators

```
✅ No error messages
✅ Redirected to dashboard
✅ User profile visible
✅ Name displays correctly
✅ Avatar shows (if available)
✅ Navigation working
```

### ❌ Failure Indicators & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "OAuth error" message | Google credentials wrong | Check GOOGLE_WEB_CLIENT_ID in frontend .env |
| Stays on login screen | OAuth callback failed | Check redirect URL in Google Cloud Console |
| Network error | Can't reach backend | Check API_BASE_URL and backend running |
| "Token invalid" | JWT creation failed | Check JWT_SECRET in backend .env |

### 📋 Test Results

```
Test 1: Google Login
Status: [ ] PASS [ ] FAIL
Notes: ___________________
Issues: __________________
```

---

## Test 2: Dashboard Navigation (🔴 CRITICAL)

### Setup
- You are logged in
- You see the dashboard/home screen
- Bottom navigation visible (or side menu)

### Steps

**Step 2.1: Navigate to Chat**
- Tap "Chat" or "AI Assistant" in navigation
- Expected: Chat screen opens with conversation list

**Step 2.2: Navigate to Documents**
- Tap "Documents" in navigation
- Expected: Documents screen shows

**Step 2.3: Navigate to Applications**
- Tap "Applications" or "Visa Applications" in navigation
- Expected: Applications list screen shows

**Step 2.4: Navigate to Profile**
- Tap "Profile" or "Settings" in navigation
- Expected: User profile screen shows with:
  - Email address
  - Name
  - Avatar
  - Edit button (optional)

**Step 2.5: Navigate back to Home**
- Tap "Home" or "Dashboard" in navigation
- Expected: Back to main dashboard

### ✅ Success Indicators

```
✅ All screens load
✅ No error messages
✅ Transitions are smooth
✅ Content displays correctly
✅ No blank screens
```

### ❌ Failure Indicators & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Screen stuck loading | API not responding | Start backend, check port 3000 |
| White/blank screen | Component not rendering | Check browser console for errors |
| Navigation not working | React Navigation issue | Restart frontend with npm start |
| Data not loading | API endpoint failure | Check backend logs for 500 errors |

### 📋 Test Results

```
Test 2: Dashboard Navigation
Status: [ ] PASS [ ] FAIL
Notes: ___________________
Issues: __________________
```

---

## Test 3: AI Chat (🔴 CRITICAL)

### Setup
- You are logged in
- You are on the Chat screen
- Chat input box visible at bottom

### Steps

**Step 3.1: Open Chat Screen**
- From dashboard, tap "Chat"
- Should show conversation list (empty if first time)
- Should show input box at bottom

**Step 3.2: Send First Message**
- Tap input box
- Type: "What documents do I need for a US visa?"
- Tap "Send" or press Enter
- Expected: Message appears in chat

**Step 3.3: Wait for AI Response**
- Wait up to 5-10 seconds
- Expected: AI response appears with visa document requirements

**Step 3.4: Send Follow-up Question**
- Type: "What about UK visa?"
- Send message
- Expected: AI responds about UK requirements

**Step 3.5: Check Message History**
- Scroll up in chat
- Should see both your questions and AI responses
- History should persist

### ✅ Success Indicators

```
✅ Messages appear in chat
✅ AI responds within 10 seconds
✅ Responses are relevant
✅ Multiple messages work
✅ History persists on reload
✅ No "error" messages
```

### ❌ Failure Indicators & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Service error" | AI service not running | Start `python main.py` in ai-service |
| "API error" | Backend can't reach AI service | Check AI service running on :8001 |
| "Rate limited" | Too many requests | Wait a few minutes, try again |
| "No response" | OpenAI API key invalid | Check OPENAI_API_KEY in backend .env |
| "Invalid token" | Auth token expired | Log out and log back in |

### 📋 Test Results

```
Test 3: AI Chat
Status: [ ] PASS [ ] FAIL
Response quality: [ ] Excellent [ ] Good [ ] Poor
Notes: ___________________
Issues: __________________
```

---

## Test 4: Document Upload (🟠 HIGH)

### Setup
- You are logged in
- You have a test document (PDF or image)
- You are on the Documents screen

### Steps

**Step 4.1: Navigate to Documents**
- From dashboard, tap "Documents"
- Should show document list (empty if first time)

**Step 4.2: Click "Upload Document" Button**
- Tap "+ Upload" or "Add Document" button
- Should open file picker

**Step 4.3: Select a File**
- Choose a test PDF or image from device
- Expected: File picker closes

**Step 4.4: Wait for Upload**
- Should show progress bar
- Expected: Upload completes in 1-3 seconds

**Step 4.5: Verify Document Appears**
- Document should appear in list
- Should show:
  - File name
  - Upload date
  - File size
  - Download button

**Step 4.6: Try to Download/View**
- Tap the document
- Should open or download file
- File should be readable

### ✅ Success Indicators

```
✅ File picker opens
✅ File upload progresses
✅ Upload completes
✅ Document appears in list
✅ Can download/view
✅ Multiple files work
```

### ❌ Failure Indicators & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Upload failed" | Firebase Storage not configured | This is normal for Phase 3 (deferred) |
| "Permission denied" | Firebase auth failed | Check FIREBASE_PROJECT_ID in .env |
| File picker doesn't open | Platform permissions | Grant storage permission in app settings |
| 404 error on download | File not stored properly | Check Firebase Storage bucket settings |

### 📋 Test Results

```
Test 4: Document Upload
Status: [ ] PASS [ ] FAIL [ ] DEFERRED
Notes: ___________________
Issues: __________________
```

---

## Test 5: User Profile (🟠 HIGH)

### Setup
- You are logged in
- You are on the Profile/Settings screen

### Steps

**Step 5.1: Navigate to Profile**
- Tap "Profile" or "Settings"
- Should show user profile screen

**Step 5.2: Verify Profile Data**
- Check displays:
  - ✅ Email address
  - ✅ Full name
  - ✅ User avatar
  - ✅ Account created date
  - ✅ Last login date

**Step 5.3: Check Settings Available**
- Look for settings like:
  - Language selection
  - Notifications toggle
  - Dark mode toggle
  - Privacy settings

**Step 5.4: Try Edit Profile (if available)**
- If edit button available:
  - Tap "Edit Profile"
  - Change name
  - Save changes
  - Verify changes persist

### ✅ Success Indicators

```
✅ Profile data displays
✅ User information correct
✅ Avatar loads
✅ Settings accessible
✅ Changes save properly
```

### ❌ Failure Indicators & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| No profile data | API not returning user info | Check backend GET /api/users/me endpoint |
| Avatar not loading | Avatar URL invalid | Check Firebase Storage or avatar URL |
| Settings not working | State management issue | Restart app and try again |

### 📋 Test Results

```
Test 5: User Profile
Status: [ ] PASS [ ] FAIL
Data accuracy: [ ] Correct [ ] Missing [ ] Wrong
Notes: ___________________
Issues: __________________
```

---

## Test 6: Payment Flow - Test (🟡 MEDIUM)

### Setup
- You are logged in
- You have payment screen accessible
- Stripe test mode is active

### Steps

**Step 6.1: Navigate to Payments (if available)**
- Look for "Payments", "Services", or "Packages" screen
- Tap on it

**Step 6.2: Select a Test Package**
- Choose any service/package
- Should show price

**Step 6.3: Click "Pay Now" or "Purchase"**
- Tap payment button
- Should open payment form

**Step 6.4: Enter Test Card**
- Card Number: `4242 4242 4242 4242`
- Expiry: `12/25` (any future date)
- CVC: `123` (any 3 digits)
- Cardholder: `Test User`

**Step 6.5: Complete Payment**
- Tap "Pay" or "Confirm"
- Expected: Payment succeeds
- Should show confirmation message

**Step 6.6: Verify Payment Stored**
- Check payment appears in history
- Check receipt/confirmation generated

### ✅ Success Indicators

```
✅ Payment form opens
✅ Test card accepted
✅ Payment succeeds
✅ Confirmation message shows
✅ Payment stored in database
✅ Receipt sent (email)
```

### ❌ Failure Indicators & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Payment failed" | Stripe keys not configured | Check STRIPE_API_KEY in backend .env |
| "Invalid card" | Not using test card | Use 4242 4242 4242 4242 exactly |
| "API error" | Backend endpoint failed | Check /api/payments/create endpoint |
| "No email sent" | SendGrid not working | Check SMTP_PASSWORD and sender email |

### 📋 Test Results

```
Test 6: Payment Flow
Status: [ ] PASS [ ] FAIL [ ] SKIPPED
Card: [ ] Test works [ ] Test fails
Notes: ___________________
Issues: __________________
```

---

## Test 7: Logout (🟢 LOW)

### Setup
- You are logged in
- You can see logout option in settings

### Steps

**Step 7.1: Navigate to Settings**
- Tap "Settings" or "Profile"
- Look for "Logout" button

**Step 7.2: Tap Logout**
- Tap "Logout"
- May show confirmation: "Are you sure?"
- Tap "Yes" or "Logout"

**Step 7.3: Verify Logout Success**
- Should return to login screen
- Should NOT show user info

**Step 7.4: Try to Access Protected Screen**
- Try to navigate to any screen
- Should redirect to login screen

**Step 7.5: Log Back In**
- Use Google login again
- Should work normally

### ✅ Success Indicators

```
✅ Logout button works
✅ Returns to login screen
✅ Token cleared
✅ Can't access protected screens
✅ Can log in again
```

### ❌ Failure Indicators & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Logout failed" | Token not cleared | Check auth store reset |
| Still sees user data | Local cache not cleared | Clear app cache and restart |
| Can't log back in | OAuth session issue | Clear cookies and try again |

### 📋 Test Results

```
Test 7: Logout
Status: [ ] PASS [ ] FAIL
Can re-login: [ ] YES [ ] NO
Notes: ___________________
Issues: __________________
```

---

## 🎯 Complete Test Summary

### Record Results

Copy and fill in this section:

```
═══════════════════════════════════════════════════
PHASE 4: CORE FLOWS TEST RESULTS
═══════════════════════════════════════════════════

Date: ____________________
Tester: __________________
Device: [ ] Android [ ] iOS [ ] Web

Test 1: Google Login
  Status: [ ] PASS [ ] FAIL
  Issues: _________________________________

Test 2: Navigation
  Status: [ ] PASS [ ] FAIL
  Issues: _________________________________

Test 3: AI Chat
  Status: [ ] PASS [ ] FAIL
  Issues: _________________________________

Test 4: Document Upload
  Status: [ ] PASS [ ] FAIL [ ] DEFERRED
  Issues: _________________________________

Test 5: User Profile
  Status: [ ] PASS [ ] FAIL
  Issues: _________________________________

Test 6: Payment
  Status: [ ] PASS [ ] FAIL [ ] SKIPPED
  Issues: _________________________________

Test 7: Logout
  Status: [ ] PASS [ ] FAIL
  Issues: _________________________________

═══════════════════════════════════════════════════
SUMMARY
═══════════════════════════════════════════════════

Tests Passed: ____ / 7
Tests Failed: ____ / 7
Tests Deferred: ____ / 7

Overall Status: [ ] READY [ ] ISSUES [ ] BLOCKED

Critical Issues Found:
1. _________________________________
2. _________________________________
3. _________________________________

Recommendations:
_________________________________________
_________________________________________

Next Steps:
[ ] Fix issues and re-test
[ ] Move to Phase 5
[ ] Document for later
```

---

## 📊 Test Status Definitions

- ✅ **PASS**: Flow works as expected
- ❌ **FAIL**: Flow has errors or doesn't work
- ⏸️ **DEFERRED**: Feature not yet available (will be in Phase 4+)
- ⏭️ **SKIPPED**: Chose not to test this flow

---

## 🚀 Next Actions Based on Results

### All Tests Passed ✅
→ Proceed to `PHASE_4_VERIFICATION_CHECKLIST.md`
→ Then move to Phase 5

### Some Tests Failed ❌
→ Review failures
→ See `PHASE_4_TROUBLESHOOTING.md`
→ Fix issues
→ Re-test

### Features Deferred ⏸️
→ This is normal (Firebase Storage, FCM, payments)
→ Will be available in Phase 4+
→ Continue with other tests

---

**Estimated Time: 45 minutes - 2 hours**  
**Recommended**: Test all flows at least once  
**Next**: `PHASE_4_VERIFICATION_CHECKLIST.md`