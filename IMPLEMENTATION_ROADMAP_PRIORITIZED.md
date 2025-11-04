# VisaBuddy Implementation Roadmap - Prioritized Tasks

---

## 🎯 EXECUTIVE SUMMARY

**Project Status**: 35% Complete  
**Time to Production**: 6-8 weeks  
**Risk Level**: HIGH (configuration gaps)  
**Team Required**: 2-3 developers

### What's Working ✅
- Project structure and architecture
- Database schema designed
- API routes scaffolded
- Frontend screens created
- Authentication logic coded
- Services layer defined
- Payment services templated
- AI service structure ready

### What's Broken/Missing ❌
- Credentials not configured
- API integrations incomplete
- Database migrations not run
- Frontend-backend not wired
- External services not connected
- Testing infrastructure missing
- Deployment setup missing
- Production configuration missing

---

## 📊 PRIORITIZED TASK BREAKDOWN

### TIER 1: CRITICAL - BLOCKS EVERYTHING (Do First)

**Timeline**: Days 1-5 | **Effort**: 40 hours | **Team**: 1-2 developers

#### 1.1 Fix Security Issues (4 hours) 🔒 URGENT
- [ ] Generate new JWT_SECRET
- [ ] Create .env files (not git committed)
- [ ] Remove .env from git history
- [ ] Update .gitignore
- [ ] Document environment variable setup

**Why**: Currently exposing database credentials in version control

**Code Changes**:
```bash
# Execute in repository root
git rm --cached apps/backend/.env apps/backend/.env.production apps/frontend/.env
echo ".env" >> .gitignore
git commit -m "Remove sensitive env files"
```

---

#### 1.2 Database Setup (3 hours) 🗄️
- [ ] Run: `npm run db:generate`
- [ ] Run: `npm run db:migrate`
- [ ] Run: `npm run db:seed`
- [ ] Verify tables created
- [ ] Verify sample data inserted
- [ ] Test database connection

**Why**: API cannot start without database

**Status Check**:
```bash
cd apps/backend
npm run db:generate
npm run db:migrate
npm run db:seed
```

**Expected Result**: SQLite database with:
- Users table (with 2 test users)
- Countries table (10+ countries)
- VisaTypes table (3+ per country)
- Applications, Documents, Payments tables

---

#### 1.3 Get External API Credentials (3 hours) 📝
- [ ] Create Firebase project → Get credentials
- [ ] Create OpenAI API account → Get API key
- [ ] Create Google Cloud project → Get OAuth credentials
- [ ] Create SendGrid account → Get API key
- [ ] Sign up for Payme → Get merchant ID
- [ ] Sign up for Click → Get merchant ID
- [ ] Create Stripe account → Get test keys

**Why**: Many features blocked without these

**Where to put them**: `.env.local` (not committed to git)

---

#### 1.4 Start Services Locally (2 hours) 🚀
- [ ] Start Backend: `npm run dev:backend`
- [ ] Start Frontend: `npm run dev:frontend`
- [ ] Start AI Service: `npm run dev:ai`
- [ ] Verify all 3 services running
- [ ] Test health endpoints

**Why**: Need to test locally before deployment

**Verification**:
```bash
# In separate terminals:
Terminal 1: cd apps/backend && npm run dev
Terminal 2: cd apps/frontend && npm start
Terminal 3: cd apps/ai-service && python -m uvicorn main:app --reload

# Test:
curl http://localhost:3000/health
curl http://localhost:8001/docs
```

---

#### 1.5 Test Basic API Connectivity (2 hours) 🔗
- [ ] Test POST /api/auth/register
- [ ] Test POST /api/auth/login
- [ ] Test GET /api/countries
- [ ] Test JWT token flow
- [ ] Verify CORS working

**Why**: Ensures API is working before frontend integration

**Test Commands**:
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","firstName":"Test"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'

# Countries
curl http://localhost:3000/api/countries
```

---

#### 1.6 Seed Production Data (3 hours) 📊
- [ ] Add 10+ countries to database
- [ ] Add 3+ visa types per country
- [ ] Add realistic fees and requirements
- [ ] Test data retrieval

**Why**: Users need data to see

**Sample Data**:
```json
Countries: USA, UK, Canada, Germany, France, Japan, Singapore, Australia, UAE, India
For each: Tourist, Work, Student visa types
Requirements: Passport, Photo, Bank statement, etc.
Fees: $50-300 depending on visa
Processing time: 7-30 days
```

---

### TIER 2: HIGH PRIORITY - BLOCKS FEATURES (Week 2)

**Timeline**: Days 6-12 | **Effort**: 60 hours | **Team**: 2-3 developers

#### 2.1 Complete Authentication Flow (15 hours) 🔐
**Backend Tasks**:
- [ ] Complete POST /api/auth/refresh endpoint
- [ ] Complete POST /api/auth/logout endpoint
- [ ] Add POST /api/auth/google/callback endpoint
- [ ] Test with OAuth credentials
- [ ] Add role-based access control middleware
- [ ] Test admin routes protection

**Frontend Tasks**:
- [ ] Wire LoginScreen to API
- [ ] Wire RegisterScreen to API
- [ ] Add token storage in AsyncStorage
- [ ] Add refresh token logic to app startup
- [ ] Handle expired tokens gracefully
- [ ] Add logout functionality
- [ ] Test login/register flows

**Testing**:
- [ ] Create account with email
- [ ] Login with email
- [ ] Verify token saved
- [ ] Refresh token works
- [ ] Logout clears token
- [ ] Protected routes require token

---

#### 2.2 Country & Visa Selection (10 hours) 🌍
**Backend Tasks**:
- [ ] Implement GET /api/countries (with filters, pagination)
- [ ] Implement GET /api/countries/:id/visas
- [ ] Add search functionality
- [ ] Add sorting/filtering

**Frontend Tasks**:
- [ ] Connect CountrySelectorScreen to API
- [ ] Show countries list with search
- [ ] Display visa types for country
- [ ] Show visa details (fee, processing time)
- [ ] Navigate to PaymentScreen on "Pay & Start"

**Testing**:
- [ ] Search for country
- [ ] View visa types
- [ ] See all visa details

---

#### 2.3 Document Upload & Processing (15 hours) 📸
**Backend Tasks**:
- [ ] Complete POST /api/documents/upload
- [ ] Connect Firebase Storage
- [ ] Implement thumbnail generation
- [ ] Add OCR processing
- [ ] Connect to AI verification
- [ ] Store verification results
- [ ] Add GET /api/documents endpoints

**Frontend Tasks**:
- [ ] Create DocumentUploadScreen
- [ ] Camera/gallery image picker
- [ ] Show upload progress
- [ ] Display document preview
- [ ] Show verification status
- [ ] Create CheckpointScreen for progress

**AI Service Tasks**:
- [ ] Set up OpenAI API
- [ ] Implement basic document analysis
- [ ] Return confidence score
- [ ] Flag for human review

**Testing**:
- [ ] Upload image/PDF
- [ ] Verify file stored
- [ ] Check AI verification runs
- [ ] Receive confidence score

---

#### 2.4 Payment Integration - ONE Gateway (15 hours) 💳
**Backend Tasks**:
- [ ] Configure Stripe (test keys)
- [ ] Implement POST /api/payments/create
- [ ] Implement POST /api/payments/webhook/stripe
- [ ] Verify webhook signatures
- [ ] Update payment status on callback
- [ ] Unlock application features after payment

**Frontend Tasks**:
- [ ] Create PaymentScreen
- [ ] Show payment methods
- [ ] Display payment link/form
- [ ] Handle success/failure
- [ ] Navigate to success screen

**Testing**:
- [ ] Create payment link
- [ ] Verify webhook received
- [ ] Check payment status updated
- [ ] Confirm unlocking works

---

#### 2.5 Database Query Optimization (5 hours) ⚡
- [ ] Add database indices where needed
- [ ] Optimize N+1 queries
- [ ] Add pagination to list endpoints
- [ ] Cache frequently accessed data
- [ ] Run performance tests

---

### TIER 3: MEDIUM PRIORITY - COMPLETES CORE (Week 3)

**Timeline**: Days 13-19 | **Effort**: 50 hours | **Team**: 2 developers

#### 3.1 AI Chat Integration (15 hours) 🤖
**Backend Tasks**:
- [ ] Implement POST /api/chat/message
- [ ] Call AI service for responses
- [ ] Store chat messages in DB
- [ ] Add session management
- [ ] Handle errors gracefully

**AI Service Tasks**:
- [ ] Set up vector database (Pinecone or Weaviate)
- [ ] Populate visa knowledge base
- [ ] Implement RAG retrieval
- [ ] Test response quality
- [ ] Add error handling

**Frontend Tasks**:
- [ ] Create ChatScreen
- [ ] Message input & display
- [ ] Show loading indicator
- [ ] Display sources from RAG
- [ ] Handle long responses

**Testing**:
- [ ] Send chat message
- [ ] Receive AI response
- [ ] Verify sources shown
- [ ] Test context awareness

---

#### 3.2 Push Notifications (10 hours) 📢
**Backend Tasks**:
- [ ] Configure Firebase Cloud Messaging
- [ ] Implement notification sending
- [ ] Add notification scheduler
- [ ] Test FCM delivery

**Frontend Tasks**:
- [ ] Request FCM permissions
- [ ] Register FCM token with backend
- [ ] Handle incoming notifications
- [ ] Show notification UI
- [ ] Create notification center screen

**Testing**:
- [ ] Send test notification
- [ ] Verify on device
- [ ] Check notification center

---

#### 3.3 Email Notifications (8 hours) 📧
- [ ] Configure SendGrid or SMTP
- [ ] Implement email sending
- [ ] Create email templates
- [ ] Test email delivery
- [ ] Add to notification events (payment, application, etc.)

---

#### 3.4 Admin Features (12 hours) 👨‍💼
**Backend Tasks**:
- [ ] Implement GET /api/admin/pending-documents
- [ ] Implement POST /api/admin/review/:documentId
- [ ] Add admin analytics endpoints
- [ ] Create admin-only middleware

**Frontend Tasks**:
- [ ] Implement admin navigation
- [ ] Create AdminDashboardScreen
- [ ] Document review interface
- [ ] Admin analytics view
- [ ] Create test admin user

---

#### 3.5 Additional Payment Gateways (5 hours) 💰
- [ ] Payme integration & testing
- [ ] Click integration & testing
- [ ] Uzum integration & testing

---

### TIER 4: IMPORTANT - FINAL TOUCHES (Week 4)

**Timeline**: Days 20-24 | **Effort**: 40 hours | **Team**: 2 developers

#### 4.1 Comprehensive Testing (15 hours) 🧪
- [ ] Unit tests for all services
- [ ] Integration tests for API endpoints
- [ ] E2E tests for critical flows
- [ ] Load testing (100+ concurrent users)
- [ ] Mobile testing on Android/iOS

---

#### 4.2 Performance Optimization (10 hours) ⚙️
- [ ] Enable Redis caching
- [ ] Optimize database queries
- [ ] Optimize frontend bundle
- [ ] Add compression middleware
- [ ] Profile and fix bottlenecks

---

#### 4.3 Security Hardening (10 hours) 🔐
- [ ] Enable HTTPS
- [ ] Set security headers
- [ ] Input validation on all endpoints
- [ ] SQL injection tests
- [ ] XSS tests
- [ ] Rate limiting tests

---

#### 4.4 Monitoring & Logging (5 hours) 📊
- [ ] Set up Sentry error tracking
- [ ] Configure structured logging
- [ ] Create monitoring dashboards
- [ ] Set up alerts
- [ ] Create runbook documentation

---

### TIER 5: DEPLOYMENT & LAUNCH (Week 5-6)

**Timeline**: Days 25-35 | **Effort**: 60 hours | **Team**: 1-2 developers

#### 5.1 Backend Deployment (15 hours)
- [ ] Set up Railway/Heroku account
- [ ] Configure environment variables
- [ ] Set up PostgreSQL database
- [ ] Configure Redis
- [ ] Deploy and test
- [ ] Monitor first 24 hours

---

#### 5.2 Frontend Deployment (15 hours)
- [ ] Build Android APK
- [ ] Test on multiple devices
- [ ] Prepare Play Store listing
- [ ] Upload to beta track
- [ ] Gather feedback
- [ ] Release to production

---

#### 5.3 Documentation (15 hours)
- [ ] API documentation (Swagger)
- [ ] Deployment guide
- [ ] Troubleshooting guide
- [ ] Runbook for operations
- [ ] Backup/recovery procedures
- [ ] Support guide

---

#### 5.4 Launch Preparation (15 hours)
- [ ] Final security audit
- [ ] Final performance testing
- [ ] Launch checklist
- [ ] Support team training
- [ ] Customer communication plan
- [ ] Launch day monitoring plan

---

## 📅 WEEKLY BREAKDOWN

### Week 1: Foundation & Safety
**Goal**: Get services running, fix critical issues

| Day | Task | Hours | Status |
|-----|------|-------|--------|
| 1 | Security fixes + database setup | 8 | ⏳ |
| 2 | Get credentials + start services | 8 | ⏳ |
| 3 | Test API + verify connectivity | 8 | ⏳ |
| 4 | Seed data + documentation | 6 | ⏳ |
| 5 | Buffer + code review | 4 | ⏳ |

**Deliverable**: All services running locally, API responding

---

### Week 2: Core Features
**Goal**: Auth + Country Selection + Document Upload

| Day | Task | Hours | Status |
|-----|------|-------|--------|
| 6 | Complete auth endpoints | 8 | ⏳ |
| 7 | Frontend auth screens | 8 | ⏳ |
| 8 | Country/visa endpoints | 8 | ⏳ |
| 9 | Frontend country screens | 8 | ⏳ |
| 10 | Document upload backend | 8 | ⏳ |

**Deliverable**: Full auth + country selection + basic upload

---

### Week 3: Advanced Features
**Goal**: Payment + AI Chat + Notifications

| Day | Task | Hours | Status |
|-----|------|-------|--------|
| 11 | Payment gateway setup | 8 | ⏳ |
| 12 | Payment frontend | 8 | ⏳ |
| 13 | AI service RAG setup | 8 | ⏳ |
| 14 | Chat integration | 8 | ⏳ |
| 15 | Notifications (push + email) | 8 | ⏳ |

**Deliverable**: Payment + Chat + Notifications working

---

### Week 4: Polish & Admin
**Goal**: Admin features + Testing + Optimization

| Day | Task | Hours | Status |
|-----|------|-------|--------|
| 16 | Admin endpoints | 8 | ⏳ |
| 17 | Admin frontend | 8 | ⏳ |
| 18 | Testing infrastructure | 8 | ⏳ |
| 19 | Performance optimization | 8 | ⏳ |
| 20 | Security hardening | 8 | ⏳ |

**Deliverable**: Complete feature set, testing in place, optimized

---

### Week 5: Deployment
**Goal**: Production ready

| Day | Task | Hours | Status |
|-----|------|-------|--------|
| 21 | Backend deployment | 8 | ⏳ |
| 22 | Frontend deployment | 8 | ⏳ |
| 23 | Integration testing | 8 | ⏳ |
| 24 | Documentation | 8 | ⏳ |
| 25 | Final QA + launch prep | 8 | ⏳ |

**Deliverable**: Production deployment, fully tested

---

### Week 6: Launch & Support
**Goal**: Live with support team ready

| Day | Task | Hours | Status |
|-----|------|-------|--------|
| 26 | Launch + 24h monitoring | 12 | ⏳ |
| 27 | Bug fixes | 8 | ⏳ |
| 28 | Performance monitoring | 8 | ⏳ |
| 29 | User support | 8 | ⏳ |
| 30 | Post-launch retrospective | 4 | ⏳ |

**Deliverable**: Live, stable, supported

---

## 🎯 SUCCESS METRICS

### Development Milestones
- [ ] All 3 services running locally
- [ ] Authentication working end-to-end
- [ ] First payment processed
- [ ] AI chat responding
- [ ] Admin can review documents
- [ ] 95% test coverage on critical paths
- [ ] Load test passing (500+ concurrent users)
- [ ] Production database operational

### Launch Requirements
- [ ] Zero security vulnerabilities
- [ ] 99% API uptime
- [ ] <500ms average response time
- [ ] <2% error rate
- [ ] All features working
- [ ] Documentation complete
- [ ] Support team trained
- [ ] Incident response plan ready

---

## 💰 RESOURCE ALLOCATION

### Team Composition
- **Senior Developer** (40 hrs/week): Architecture, integration, security
- **Mid Developer** (40 hrs/week): Backend endpoints, API integration
- **Junior Developer** (20 hrs/week): Frontend screens, testing

### External Services Costs (Monthly)
- Firebase: ~$25-100 (storage, messaging)
- OpenAI API: ~$50-200 (usage-based)
- SendGrid: ~$20-100 (email)
- Redis (Upstash): ~$10-50
- Database (Supabase): ~$100-500
- Hosting (Railway): ~$100-200
- Total: ~$300-1150/month

---

## 📞 CONTACT & ESCALATION

**Blockers**: Escalate immediately to CTO  
**Design decisions**: Weekly architecture review  
**Budget/Resource**: Report by Friday EOD  
**Launch decisions**: Leadership approval required

---

## ✅ SIGN-OFF

- [ ] Technical Lead: _____________ Date: _____
- [ ] Product Manager: _____________ Date: _____
- [ ] CTO: _____________ Date: _____

---

**Document Version**: 1.0  
**Last Updated**: November 2024  
**Next Review**: Weekly standups