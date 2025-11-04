# ✅ VISABUDDY — REALISTIC COMPLETION ROADMAP (6 WEEKS)

> **Status Assessment:** Backend 95%, Frontend 90%, AI Service 70%, Tests 40%, Security 50%
> This is NOT a "build from scratch" roadmap—it's a "completion + hardening + deployment" roadmap.

---

## **PHASE 0 — IMMEDIATE CRITICAL FIXES (Days 1-3 | 15 hours)**
🔴 **MUST DO FIRST — Production blockers**

### Tasks:
1. **Security Audit & Hotfixes**
   - [ ] Fix JWT secret fallback (middleware/auth.ts:21) → throw error if not in ENV
   - [ ] Add CSRF protection middleware (express-csurf)
   - [ ] Implement strict rate limiting on payment webhooks (max 5/min per IP)
   - [ ] Add input validation to RAG queries (prevent prompt injection)
   - **Time:** 4 hours
   - **Files to fix:** `src/middleware/auth.ts`, `src/index.ts`, `src/routes/payments.ts`, `src/services/rag.service.ts`

2. **Firebase Credentials Security**
   - [ ] Revoke exposed Firebase project (pctt-203e6) immediately
   - [ ] Create NEW Firebase project with clean credentials
   - [ ] Store credentials ONLY in Railway/GitHub secrets (NEVER downloads)
   - [ ] Update .gitignore to block `.json` service accounts
   - **Time:** 2 hours

3. **Database Migration Strategy**
   - [ ] Create PostgreSQL migration script (SQLite → PostgreSQL)
   - [ ] Test migration locally with production schema
   - [ ] Prepare rollback procedure
   - [ ] Document connection string format for production
   - **Time:** 3 hours

4. **Environment Setup**
   - [ ] Create `.env.production` template (separate from `.env.development`)
   - [ ] List ALL required secrets per deployment environment
   - [ ] Validate Railway/GitHub Secrets configuration
   - **Time:** 2 hours

5. **Knowledge Base Data Preparation**
   - [ ] Create visa requirements documents for: Student, Work, Business, Transit, Tourism
   - [ ] Structure documents for RAG chunking (CSV or JSON)
   - [ ] Prepare 50+ Q&A pairs per visa type for testing
   - **Time:** 4 hours

**🎯 Milestone:** Production blockers fixed + Knowledge base ready
**Deliverables:** Security report, migration script, knowledge base CSV

---

## **PHASE 1 — BACKEND COMPLETION & HARDENING (Days 4-11 | 40 hours)**
🟢 **Stabilize + secure backend systems**

### Tasks:

1. **Complete RAG Pipeline** (12 hours)
   - [ ] Set up Pinecone index with correct embedding dimensions (1536 for OpenAI)
   - [ ] Implement document chunking service (500-token chunks with overlap)
   - [ ] Build knowledge base ingestion script (load visa docs → Pinecone)
   - [ ] Test embedding retrieval with sample queries
   - [ ] Add fallback if Pinecone unavailable (cached responses)
   - **Files:** `apps/ai-service/services/rag.py`, `apps/backend/src/services/rag.service.ts`
   - **Testing:** 10 queries per visa type, measure relevance

2. **AI Chat System Completion** (8 hours)
   - [ ] Implement chat message persistence + retrieval
   - [ ] Add conversation context window (last 10 messages)
   - [ ] Integrate RAG results into chat context
   - [ ] Add token counting + cost tracking per user
   - [ ] Implement rate limiting per user (50 messages/day for free)
   - **Files:** `src/services/chat.service.ts`, `src/routes/chat.ts`

3. **Payment System Hardening** (10 hours)
   - [ ] Add webhook signature verification tests for all 4 gateways
   - [ ] Implement idempotency keys for payment retries (prevent double-charging)
   - [ ] Add payment status reconciliation job (check PaymentStatus vs Gateway status)
   - [ ] Test webhook deduplication with duplicate webhook sends
   - [ ] Add timeout handling for slow payment responses
   - **Files:** `src/services/webhook-security.ts`, `src/services/payment-gateway.service.ts`
   - **Testing:** Trigger duplicate webhooks, verify no double entries

4. **Database & Caching Optimization** (10 hours)
   - [ ] Add Redis caching for: Countries list (TTL 24h), Visa types (TTL 24h), User preferences (TTL 1h)
   - [ ] Implement cache invalidation on data changes
   - [ ] Add database connection pooling config (min: 5, max: 20)
   - [ ] Create slow query logging (log queries > 1000ms)
   - [ ] Performance test: measure query times before/after caching
   - **Files:** `src/services/cache.service.ts`, `src/db.ts`
   - **Target:** 90% of API responses < 200ms

**🎯 Milestone:** Backend stable, secure, and optimized
**Deliverables:** RAG operational, all webhooks tested, performance report

---

## **PHASE 2 — FRONTEND INTEGRATION & POLISH (Days 12-19 | 42 hours)**
🎨 **Connect backend systems + polish UX**

### Tasks:

1. **AI Chat Integration** (10 hours)
   - [ ] Connect ChatScreen to real AI backend
   - [ ] Display streaming responses (progressive text rendering)
   - [ ] Add loading states + error messages
   - [ ] Implement message history (fetch previous chats)
   - [ ] Add feedback buttons (thumbs up/down) for chat quality
   - [ ] Support all 3 languages (en, uz, ru) in chat context
   - **Files:** `src/screens/chat/ChatScreen.tsx`, `src/services/api-client.ts`

2. **Document Upload System** (8 hours)
   - [ ] Complete file picker + upload progress UI
   - [ ] Add document verification status display
   - [ ] Show OCR status (placeholder for future OCR integration)
   - [ ] Add document deletion + reupload flow
   - [ ] Test with all 5 document types (PDF, JPG, PNG, DOC, DOCX)
   - **Files:** `src/screens/documents/DocumentUploadScreen.tsx`

3. **Payment Gateway Integration** (10 hours)
   - [ ] Test all 4 payment gateways (Payme, Click, Uzum, Stripe)
   - [ ] Redirect to payment provider + callback handling
   - [ ] Add payment status polling (every 2s for 2 minutes)
   - [ ] Display payment success/failure screens
   - [ ] Add payment history view
   - **Files:** `src/screens/payment/PaymentScreen.tsx`, `src/services/payment-api.ts`
   - **Testing:** Complete payment flow on each gateway (use test credentials)

4. **Notifications System** (8 hours)
   - [ ] Integrate FCM (Firebase Cloud Messaging) for push notifications
   - [ ] Create notification preference UI
   - [ ] Test in-app notification display
   - [ ] Add notification center screen
   - [ ] Test on physical device (Android emulator alone won't show push)
   - **Files:** `src/services/fcm-service.ts`, `src/screens/notifications/`

5. **Multilingual Support Verification** (6 hours)
   - [ ] Test all screens in English, Uzbek, Russian
   - [ ] Fix missing translation keys
   - [ ] Verify RTL layout if needed
   - [ ] Test language switching at runtime
   - **Files:** `src/i18n/translations/*.json`

**🎯 Milestone:** All frontend features connected to backend
**Deliverables:** Fully functional app with real data flow

---

## **PHASE 3 — TESTING, SECURITY & OPTIMIZATION (Days 20-26 | 40 hours)**
🧪 **Comprehensive testing + security hardening**

### Tasks:

1. **Security Testing** (12 hours)
   - [ ] JWT token expiry + refresh token flow test
   - [ ] CORS origin validation test
   - [ ] Rate limiting test (trigger limits, verify 429 response)
   - [ ] Input validation test (SQL injection, XSS attempts)
   - [ ] Admin authorization test (non-admin can't access /admin routes)
   - [ ] Payment webhook signature verification test
   - [ ] Create security test suite
   - **Target:** 0 critical security issues
   - **Files:** `src/__tests__/security/*.test.ts`

2. **Unit & Integration Tests** (12 hours)
   - [ ] Achieve 70%+ code coverage for critical services:
     - `ai-openai.service.ts` (AI chat logic)
     - `payment-gateway.service.ts` (payment routing)
     - `rag.service.ts` (RAG retrieval)
     - `auth.service.ts` (authentication)
   - [ ] Write tests for all edge cases (payment failures, AI timeouts, etc.)
   - [ ] Mock external services (OpenAI, Pinecone, Payme API)
   - **Files:** `src/__tests__/services/*.test.ts`

3. **Frontend E2E Tests** (8 hours)
   - [ ] Write Detox tests for critical flows:
     - User signup → Profile creation
     - Visa selection → Application creation
     - Document upload → Payment → Status update
   - [ ] Run on Android emulator
   - **Files:** `e2e/` folder

4. **Performance & Load Testing** (8 hours)
   - [ ] API response time measurement (target: <300ms for 95th percentile)
   - [ ] Database query profiling (identify slow queries)
   - [ ] AI response time (GPT-4 typically 3-8s, document acceptable baseline)
   - [ ] Frontend: First contentful paint (target: <2s)
   - [ ] Memory usage profiling (frontend + backend)
   - **Tools:** Artillery (load testing), Chrome DevTools (frontend profiling)
   - **Deliverable:** Performance report with optimization recommendations

**🎯 Milestone:** Production-ready code quality
**Deliverables:** Test coverage report, security audit report, performance baseline

---

## **PHASE 4 — ADMIN TOOLS & DATA MANAGEMENT (Days 27-33 | 35 hours)**
⚙️ **Build operational dashboards + admin workflows**

### Tasks:

1. **Admin Dashboard Completion** (12 hours)
   - [ ] Users management: list, ban, edit role, reset password
   - [ ] Applications review: approve/reject with comments
   - [ ] Payments dashboard: view all payments, refund UI, dispute handling
   - [ ] Analytics dashboard: signup trends, payment success rate, AI usage
   - [ ] Add search/filter/export capabilities (CSV export)
   - **Files:** `src/screens/admin/*`, `src/routes/admin.ts`

2. **Analytics Implementation** (10 hours)
   - [ ] Event tracking: user signup, visa selection, document upload, payment success, chat messages
   - [ ] Dashboard: real-time metrics (DAU, MAU, ARPU)
   - [ ] Cohort analysis (retention by signup date)
   - [ ] Funnels (signup → payment conversion)
   - [ ] Sentry integration for error tracking
   - **Files:** `src/services/analytics.service.ts`

3. **Database Seeding & Sample Data** (8 hours)
   - [ ] Create seed script with:
     - 5 countries with visa types
     - 50 sample users (different roles + languages)
     - 20 sample visa applications (various statuses)
     - 10 sample payments (success + failures)
   - [ ] Document how to run seed
   - **Files:** `prisma/seed.ts`

4. **Backup & Recovery Procedures** (5 hours)
   - [ ] Create PostgreSQL backup script
   - [ ] Test restore from backup
   - [ ] Document disaster recovery procedure
   - [ ] Set up automated daily backups (Railway can auto-backup PostgreSQL)

**🎯 Milestone:** Operational dashboards ready for production monitoring
**Deliverables:** Admin guide, backup procedures

---

## **PHASE 5 — DEPLOYMENT PREPARATION (Days 34-40 | 30 hours)**
🚀 **Deploy to production + prepare app stores**

### Tasks:

1. **Production Environment Setup** (8 hours)
   - [ ] Railway PostgreSQL database setup (test connection)
   - [ ] Run database migrations to production
   - [ ] Verify all ENV variables in production
   - [ ] Test backend deployment (Railway deployment)
   - [ ] Verify health check endpoint `/health`
   - [ ] SSL certificate setup (Railway provides auto HTTPS)
   - **Files:** `.env.production`, `railway.json`

2. **Payment Gateway Live Setup** (8 hours)
   - [ ] Switch from test credentials to LIVE credentials for:
     - [ ] Payme (get live merchant ID)
     - [ ] Click (get live keys)
     - [ ] Uzum (get live service ID)
     - [ ] Stripe (get live API keys)
   - [ ] Test payment flow with small amount ($0.01)
   - [ ] Verify webhook signatures with live gateway
   - [ ] Create payment reconciliation report
   - **Files:** GitHub Secrets (store live keys)

3. **Firebase Production Setup** (6 hours)
   - [ ] Create NEW Firebase project for production
   - [ ] Generate service account JSON (store in Railway secrets, NOT repo)
   - [ ] Configure Firebase Storage buckets
   - [ ] Test file upload in production
   - [ ] Set up Firebase Rules (allow authenticated users only)

4. **Mobile App Build & Play Store Submission** (8 hours)
   - [ ] Generate Android release APK/AAB
   - [ ] Create Google Play Developer account (or use existing)
   - [ ] Set up app signing certificate
   - [ ] Create app store listing (screenshots, description, privacy policy)
   - [ ] Submit app for review (typically 24-48 hours review time)
   - [ ] Files:** `eas.json`, `android/app/build.gradle`

**Note:** iOS deployment requires macOS + Apple Developer account ($99/year)

**🎯 Milestone:** App live on Play Store
**Deliverables:** Production deployment guide, app store links

---

## **PHASE 6 — BETA TESTING & LAUNCH (Days 41-42 | 15 hours)**
🧑‍🔬 **Final QA before public launch**

### Tasks:

1. **Internal QA** (4 hours)
   - [ ] Test all critical user flows on physical device
   - [ ] Check for crashes/errors in Sentry
   - [ ] Verify payment success notifications
   - [ ] Test multilingual UI rendering

2. **Beta Testing with 20 Users** (6 hours)
   - [ ] Invite 20 beta testers (colleagues, friends, community)
   - [ ] Collect feedback via Google Form
   - [ ] Monitor Sentry for crashes
   - [ ] Fix critical bugs found during beta
   - [ ] Document known issues (non-blocking)

3. **Launch Checklist** (2 hours)
   - [ ] Verify all payment gateways working
   - [ ] Confirm database backups running
   - [ ] Ensure monitoring alerts configured
   - [ ] Create runbook for incident response
   - [ ] Brief support team on common issues

4. **Announcement & Marketing Prep** (3 hours)
   - [ ] Update README with production URLs
   - [ ] Create launch announcement (social media, email list)
   - [ ] Set up user feedback channel (Discord, Telegram)

**🎯 Milestone:** App publicly available
**Deliverables:** Launch announcement, support runbook

---

## **📊 REVISED TIMELINE**

| Phase | Duration | Focus | Team Size | Status |
|-------|----------|-------|-----------|--------|
| **Phase 0** | 3 days | Critical fixes + security | 1-2 devs | 🔴 START NOW |
| **Phase 1** | 8 days | Backend completion | 2-3 devs | 🟡 Ready to start |
| **Phase 2** | 8 days | Frontend integration | 2 devs | 🟡 Depends on Phase 1 |
| **Phase 3** | 7 days | Testing + optimization | 2-3 devs | 🟡 Parallel with Phase 2 |
| **Phase 4** | 7 days | Admin tools + analytics | 1-2 devs | 🟡 Parallel with Phase 3 |
| **Phase 5** | 7 days | Production deployment | 1-2 devs | 🟢 Final stage |
| **Phase 6** | 2 days | Beta testing + launch | 1-2 devs | 🟢 Final checks |
| **TOTAL** | **42 days** (6 weeks) | All systems operational | 2-3 devs | Production ready |

---

## **⚡ CRITICAL DEPENDENCIES**

```
Phase 0 → ALL OTHER PHASES (blocker on security)
  Phase 1 ──┐
           ├→ Phase 3 (testing depends on Phase 1+2)
  Phase 2 ──┤
           ├→ Phase 5 (deployment depends on testing)
  Phase 4 ──┘
Phase 5 → Phase 6 (launch depends on production setup)
```

**Parallel tracks possible:**
- Phase 1 (backend) + Phase 2 (frontend) after day 4 (can work independently)
- Phase 3 (testing) + Phase 4 (admin) starting day 13 (both depend on Phase 1 only)
- Phase 5 (deployment) starting day 28 (depends on all prior phases)

---

## **🎯 SUCCESS METRICS**

| Metric | Target | Check Point |
|--------|--------|-------------|
| **API Response Time** | <300ms (95th) | Phase 3 |
| **Test Coverage** | >70% critical code | Phase 3 |
| **Security Issues** | 0 critical, 0 high | Phase 3 |
| **Payment Success Rate** | >99% | Phase 5 |
| **App Crash Rate** | <0.5% in beta | Phase 6 |
| **User Signup** | 50+ beta testers | Phase 6 |

---

## **📝 DELIVERABLES PER PHASE**

| Phase | Deliverable |
|-------|-------------|
| Phase 0 | Security audit ✓, Migration script ✓, Knowledge base data ✓ |
| Phase 1 | Backend code ✓, RAG operational ✓, Test results ✓ |
| Phase 2 | Frontend code ✓, Integration tests ✓, Performance baseline ✓ |
| Phase 3 | Test suite ✓, Coverage report ✓, Security report ✓ |
| Phase 4 | Admin dashboard ✓, Analytics ✓, Seed data ✓ |
| Phase 5 | Deployment guide ✓, App on Play Store ✓ |
| Phase 6 | Beta feedback ✓, Incident runbook ✓ |

---

## **🚨 RISK MITIGATIONS**

| Risk | Mitigation |
|------|-----------|
| RAG knowledge base incomplete | Start building immediately in Phase 0 |
| Payment gateway test failures | Test with real test credentials in Phase 1 |
| Frontend-backend integration delays | Parallel development with mock APIs |
| Database migration fails | Test migration locally before production (Phase 5) |
| App crashes on Play Store | Extended beta testing phase |
| Firebase credentials exposed again | Never store in repo; use secrets only |

---

## **✅ COMPLETION CHECKLIST**

Use this to track progress:

- [ ] Phase 0 complete + security approved
- [ ] Phase 1 complete + all services tested
- [ ] Phase 2 complete + all screens working
- [ ] Phase 3 complete + 70%+ coverage achieved
- [ ] Phase 4 complete + admin tools operational
- [ ] Phase 5 complete + deployed to production
- [ ] Phase 6 complete + launched on Play Store

**Target Launch Date:** 6 weeks from Phase 0 start