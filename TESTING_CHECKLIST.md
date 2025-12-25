# Testing Checklist - VisaBuddy/Ketdik Launch

**Date:** 2025-01-XX  
**Status:** In Progress

## ✅ Completed Fixes Verification

### Web App Fixes

- [x] Chat error retry/reload button works
- [x] Language preference saves to backend
- [x] Application detail delete uses Modal (no alert/confirm)
- [x] ApplicationCard delete uses Modal (no alert/confirm)
- [x] ApplicationTypeModal uses Modal for coming soon (no alert)
- [x] ChecklistFeedbackForm shows error state (no alert)
- [x] Admin documents page shows error state (no alert)
- [x] Admin users page shows error state (no alert)
- [x] Visa rule candidates uses Modal for confirmation (no confirm)
- [x] Templates page uses Modal for coming soon (no alert)

### Mobile App Fixes

- [x] Admin evaluation dashboard ported
- [x] Admin visa rules management ported
- [x] Admin activity logs ported
- [x] Admin AI interactions ported
- [x] Admin checklist stats ported
- [x] Admin dashboard enhanced with quick actions

## 🔍 End-to-End Testing

### Critical User Journeys

#### 1. Registration & Login Flow

- [ ] User can register with valid email/password
- [ ] User receives confirmation
- [ ] User can login with credentials
- [ ] Token is stored correctly
- [ ] User is redirected to applications page

#### 2. Application Creation Flow

- [ ] User can access questionnaire
- [ ] User can fill all questionnaire fields
- [ ] User can submit questionnaire
- [ ] Application is created successfully
- [ ] Checklist is generated (or shows polling state)
- [ ] Checklist appears within 30 seconds

#### 3. Document Upload Flow

- [ ] User can upload document from checklist
- [ ] Upload shows progress/loading state
- [ ] Document appears in checklist after upload
- [ ] Document status updates (pending → verified/rejected)
- [ ] User can view uploaded document
- [ ] User can re-upload if rejected

#### 4. Chat Flow

- [ ] User can send message in chat
- [ ] Message appears immediately (optimistic)
- [ ] AI response appears within 30 seconds
- [ ] Chat history persists after refresh
- [ ] Error shows retry button
- [ ] Chat works with application context

#### 5. Admin Flow

- [ ] Admin can access admin dashboard
- [ ] Admin can view users list
- [ ] Admin can change user roles (with Modal confirmation)
- [ ] Admin can view applications
- [ ] Admin can view documents queue
- [ ] Admin can verify/reject documents (with error handling)
- [ ] Admin can view evaluation dashboard
- [ ] Admin can view visa rules
- [ ] Admin can view activity logs
- [ ] Admin can view AI interactions
- [ ] Admin can view checklist stats

## 🧪 Bug Verification

### Fixed Bugs - Manual Testing

#### WEB_BUG_09: Chat Retry Button

- [ ] Trigger chat error (disconnect network)
- [ ] Verify error banner appears
- [ ] Verify retry button is visible
- [ ] Click retry - verify message resends
- [ ] Verify reload button works

#### WEB_BUG_11: Language Preference

- [ ] Change language in AppShell
- [ ] Verify language changes immediately
- [ ] Refresh page - verify language persists
- [ ] Check backend - verify language saved to user profile
- [ ] Login on different device - verify language syncs

#### WEB_BUG_06: Application Detail Delete

- [ ] Open application detail page
- [ ] Click delete button
- [ ] Verify Modal appears (not confirm dialog)
- [ ] Click Cancel - verify modal closes
- [ ] Click Delete in modal - verify application deleted
- [ ] Verify error shows in Modal if delete fails

#### ApplicationCard Delete

- [ ] View applications list
- [ ] Click delete on draft application
- [ ] Verify Modal appears (not confirm dialog)
- [ ] Complete delete flow
- [ ] Verify error handling works

#### ApplicationTypeModal

- [ ] Open application type modal
- [ ] Click "Universities" or "Job Contract"
- [ ] Verify Modal appears (not alert)
- [ ] Verify message is clear

#### ChecklistFeedbackForm

- [ ] Open feedback form
- [ ] Submit with invalid data
- [ ] Verify error appears in form (not alert)
- [ ] Verify error can be dismissed

#### Admin Pages Error Handling

- [ ] Admin documents: Try to verify document (simulate error)
- [ ] Verify error banner appears (not alert)
- [ ] Admin users: Try to change role (simulate error)
- [ ] Verify error appears in modal (not alert)

## 🔒 Security Audit

### Authentication & Authorization

- [ ] JWT tokens are properly validated
- [ ] Expired tokens are rejected
- [ ] Invalid tokens return 401
- [ ] Users can only access their own resources
- [ ] Admin routes require admin role
- [ ] Unauthorized access returns 403

### Input Validation

- [ ] SQL injection attempts are blocked
- [ ] XSS attempts are sanitized
- [ ] File uploads validate MIME type
- [ ] File uploads validate size (20MB limit)
- [ ] File uploads validate extensions
- [ ] Path traversal attempts are blocked

### Rate Limiting

- [ ] Login rate limit works (5 per 15 min)
- [ ] Register rate limit works (10 per hour)
- [ ] Chat rate limit works (50 per day per user)
- [ ] Checklist rate limit works
- [ ] Rate limit headers are returned

### Error Handling

- [ ] Error messages don't leak sensitive info
- [ ] Stack traces hidden in production
- [ ] Generic error messages for users
- [ ] Detailed errors logged to Sentry

## 📊 Performance Testing

### Response Times

- [ ] Application creation < 2s
- [ ] Checklist generation < 30s (or shows polling)
- [ ] Document upload < 5s
- [ ] Chat response < 30s
- [ ] Page loads < 2s

### Load Testing

- [ ] 100 concurrent users can register
- [ ] 50 concurrent document uploads
- [ ] 200 concurrent chat messages
- [ ] No errors > 1%
- [ ] P95 latency < 2s

## 🐛 Known Issues to Verify Fixed

- [ ] Documents no longer stuck in pending
- [ ] Chat history loads after login
- [ ] Applications load on app initialization
- [ ] No alert() calls in production code
- [ ] No confirm() calls in production code
- [ ] All error messages are user-friendly
- [ ] All forms have proper validation

## 📝 Test Execution Log

### Date: [TO BE FILLED]

- Tests run by: [TO BE FILLED]
- Environment: [Development/Staging/Production]
- Results: [TO BE FILLED]

## Next Steps

1. Run automated tests: `npm test` in backend
2. Run security tests: `npm test -- security.test.ts`
3. Manual testing of all fixed bugs
4. Load testing with Artillery/k6
5. Security audit with npm audit
6. Document any remaining issues
