# Web App Deployment Plan

**Generated:** 2025-11-27  
**App Location:** `apps/web`  
**Framework:** Next.js 14.2.0 (App Router)

---

## Deep Analysis Summary

### Architecture Overview

**Tech Stack:**

- **Framework:** Next.js 14.2.0 with App Router (not Pages Router)
- **Language:** TypeScript 5.9.3
- **Styling:** Tailwind CSS 3.4.0
- **State Management:** Zustand 5.0.0
- **API Client:** Axios 1.6.8
- **i18n:** react-i18next 15.3.4 + i18next 25.5.3
- **Form Handling:** react-hook-form 7.64.0 (installed, partially used)
- **Validation:** zod 3.25.0 (installed, not used)

**Build Output:**

- ✅ Build succeeds: `npm run build` completes successfully
- ✅ Static pages: 12 routes generated
- ✅ Bundle size: ~87-129 KB per page (optimized)
- ✅ No critical build errors

**Dependencies:**

- All production dependencies are stable versions
- No security vulnerabilities expected (standard Next.js stack)
- TypeScript strict mode enabled

**Environment Variables:**

- `NEXT_PUBLIC_API_URL` - Required (embedded at build time)
- `NEXT_PUBLIC_AI_SERVICE_URL` - Optional (defined but not used in code)

**Static Assets:**

- No `public/` folder exists (no static images/assets)
- Fonts: Inter (loaded from Google Fonts via Next.js)
- No custom icons or images

**Routes Structure:**

```
/                          → Home/redirect (static)
/login                     → Login page (static)
/register                  → Registration (static)
/forgot-password           → Password reset (static)
/applications              → Applications list (static)
/applications/[id]         → Application detail (dynamic)
/applications/[id]/documents → Document upload (dynamic)
/questionnaire             → Questionnaire v2 (static)
/chat                      → AI chat (static)
/profile                   → User profile (static)
/support                   → Support page (static)
```

**API Integration:**

- All API calls go to: `${NEXT_PUBLIC_API_URL}/api/*`
- Authentication: JWT tokens in localStorage
- CORS: Handled by backend
- No server-side API routes in Next.js (pure client-side)

**Build Configuration:**

- `next.config.js`: Basic config with env vars
- `tsconfig.json`: Strict TypeScript
- `tailwind.config.ts`: Custom primary color theme
- No custom webpack config
- No image optimization config (no images to optimize)

**Deployment Readiness:**

- ✅ Build succeeds
- ✅ No hardcoded localhost URLs (uses env vars)
- ✅ Production fallbacks configured
- ✅ All routes are client-side rendered (no SSR dependencies)
- ✅ No database connections in web app
- ✅ No file system dependencies
- ✅ Can be deployed as static export OR Node.js app

---

## Deployment Plan: Two Phases

---

## PHASE 1: Owner Tasks (You Must Do These)

These tasks require your action and cannot be automated by code.

### 1.1 Choose Hosting Platform

**Options:**

- **Vercel** (Recommended) - Best for Next.js, zero-config, free tier available
- **Railway** - Already using for backend, can deploy web app there
- **Netlify** - Good alternative, free tier
- **Cloudflare Pages** - Fast CDN, free tier
- **Self-hosted VPS** - More control, requires server management

**Decision Required:**

- [ ] Choose platform: ********\_\_\_********
- [ ] Create account (if new platform)
- [ ] Verify payment method (if needed for production)

**Estimated Time:** 15-30 minutes

---

### 1.2 Domain & DNS Configuration

**Tasks:**

1. **Choose Domain:**
   - [ ] Decide on domain (e.g., `app.ketdik.uz`, `visabuddy.uz`, `ketdik.com`)
   - [ ] Purchase domain (if not owned)
   - [ ] Verify domain ownership

2. **Configure DNS:**
   - [ ] Point domain to hosting platform
   - [ ] Add A/CNAME records as required by platform
   - [ ] Wait for DNS propagation (can take up to 48 hours, usually < 1 hour)

3. **SSL Certificate:**
   - [ ] Enable SSL (usually automatic on modern platforms)
   - [ ] Verify HTTPS works

**Estimated Time:** 30-60 minutes (plus DNS propagation wait)

---

### 1.3 Set Production Environment Variables

**In Your Hosting Platform Dashboard:**

Set these environment variables:

```env
NEXT_PUBLIC_API_URL=https://visago-production.up.railway.app
NEXT_PUBLIC_AI_SERVICE_URL=https://zippy-perfection-production.up.railway.app
```

**Platform-Specific Instructions:**

**Vercel:**

- Go to: Project Settings → Environment Variables
- Add: `NEXT_PUBLIC_API_URL` = `https://visago-production.up.railway.app`
- Add: `NEXT_PUBLIC_AI_SERVICE_URL` = `https://zippy-perfection-production.up.railway.app`
- Select: "Production", "Preview", "Development" (all environments)

**Railway:**

- Go to: Service Settings → Variables
- Add variables as above

**Netlify:**

- Go to: Site Settings → Environment Variables
- Add variables

**Important:** These must be set BEFORE the first build/deployment.

**Estimated Time:** 5-10 minutes

---

### 1.4 Verify Backend API Accessibility

**Tasks:**

1. **Test Backend from Production Domain:**
   - [ ] Ensure backend is accessible from the web app's production domain
   - [ ] Check CORS settings on backend allow your web domain
   - [ ] Test: `curl https://visago-production.up.railway.app/api/health` (should return 200)

2. **Backend CORS Configuration:**
   - [ ] Verify backend allows requests from your web app domain
   - [ ] If needed, update backend CORS to include: `https://your-web-domain.com`

**Estimated Time:** 10-15 minutes

---

### 1.5 Legal Pages Content (Optional but Recommended)

**Tasks:**

1. **Privacy Policy:**
   - [ ] Write privacy policy content (or use template)
   - [ ] Include: data collection, storage, user rights
   - [ ] Minimum: English version
   - [ ] Optional: UZ/RU translations

2. **Terms of Service:**
   - [ ] Write terms of service
   - [ ] **CRITICAL:** Include disclaimer: "VisaBuddy/Ketdik does not guarantee visa approval. All visa decisions are made by embassies/consulates."
   - [ ] Minimum: English version
   - [ ] Optional: UZ/RU translations

**Note:** I will create the page structure in Phase 2. You provide the content.

**Estimated Time:** 1-2 hours (if writing from scratch)

---

### 1.6 Branding & Content Review

**Tasks:**

- [ ] Review all UI text for final branding
- [ ] Verify product name consistency (Ketdik vs VisaBuddy)
- [ ] Check support page contact info is correct
- [ ] Review error messages are appropriate
- [ ] Verify translations (UZ/RU/EN) match brand voice

**Estimated Time:** 30-60 minutes

---

### 1.7 Third-Party Services (Optional)

**Email Provider (for forgot password):**

- [ ] Set up SendGrid account (or SMTP server)
- [ ] Configure backend to send emails
- [ ] Test forgot password email delivery

**Analytics (Optional):**

- [ ] Set up Google Analytics (or similar)
- [ ] Get tracking code
- [ ] Provide tracking code to developer (I'll add it in Phase 2)

**Estimated Time:** 30-60 minutes (if implementing)

---

## PHASE 2: Automated Tasks (I Will Do These)

These tasks will be automated and prepared by me.

### 2.1 Pre-Deployment Code Preparation

**Tasks I'll Complete:**

1. **Fix TypeScript Build Errors:**
   - ✅ Fix questionnaire type issues (already done)
   - ✅ Ensure all types are correct
   - ✅ Verify `npm run build` succeeds

2. **Optimize Next.js Configuration:**
   - [ ] Add production optimizations to `next.config.js`
   - [ ] Configure output settings (static export vs Node.js)
   - [ ] Add compression settings
   - [ ] Configure image optimization (if images added later)

3. **Create Production Build Scripts:**
   - [ ] Add `build:prod` script
   - [ ] Add `deploy:check` script (validates before deploy)
   - [ ] Create build verification script

4. **Environment Variable Validation:**
   - [ ] Create script to validate env vars before build
   - [ ] Add warnings for missing required vars

**Estimated Time:** 30 minutes

---

### 2.2 Create Deployment Configuration Files

**Files I'll Create:**

1. **`vercel.json`** (if using Vercel):

   ```json
   {
     "buildCommand": "cd apps/web && npm run build",
     "outputDirectory": "apps/web/.next",
     "installCommand": "npm install",
     "framework": "nextjs",
     "env": {
       "NEXT_PUBLIC_API_URL": "@api-url",
       "NEXT_PUBLIC_AI_SERVICE_URL": "@ai-service-url"
     }
   }
   ```

2. **`railway.json`** (if using Railway):

   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS",
       "buildCommand": "cd apps/web && npm install && npm run build"
     },
     "deploy": {
       "startCommand": "cd apps/web && npm start",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

3. **`.dockerfile`** (if using Docker/self-hosted):
   - Multi-stage build for production
   - Optimized Node.js image
   - Proper security settings

4. **`netlify.toml`** (if using Netlify):
   - Build settings
   - Redirect rules
   - Headers configuration

**Estimated Time:** 45 minutes

---

### 2.3 Create Legal Pages Structure

**Pages I'll Create:**

1. **`app/privacy/page.tsx`:**
   - Page structure ready
   - Placeholder for your content
   - i18n support (UZ/RU/EN)
   - Link in footer/navigation

2. **`app/terms/page.tsx`:**
   - Page structure ready
   - Placeholder for your content
   - i18n support
   - **Critical disclaimer section** (you provide exact wording)

3. **Update Layout/Footer:**
   - Add links to privacy/terms pages
   - Ensure accessibility

**Estimated Time:** 30 minutes

---

### 2.4 Add Analytics Integration (If Provided)

**If you provide Google Analytics code:**

1. **Create Analytics Component:**
   - `components/Analytics.tsx`
   - Loads GA script
   - Respects privacy (GDPR considerations)

2. **Integrate into Layout:**
   - Add to `app/layout.tsx`
   - Only loads in production
   - Configurable via env var

**Estimated Time:** 20 minutes

---

### 2.5 Create Deployment Scripts & Documentation

**Scripts I'll Create:**

1. **`scripts/deploy-check.ps1`** (PowerShell):
   - Validates environment variables
   - Runs build
   - Checks for errors
   - Verifies API connectivity

2. **`scripts/deploy-check.sh`** (Bash):
   - Same as above, for Linux/Mac

3. **`DEPLOYMENT_CHECKLIST.md`:**
   - Step-by-step deployment guide
   - Pre-deployment checklist
   - Post-deployment verification steps

4. **`DEPLOYMENT_TROUBLESHOOTING.md`:**
   - Common deployment issues
   - Solutions
   - Platform-specific notes

**Estimated Time:** 45 minutes

---

### 2.6 Optimize for Production

**Optimizations I'll Add:**

1. **Next.js Config Optimizations:**
   - Enable compression
   - Configure caching headers
   - Set proper security headers
   - Optimize bundle splitting

2. **Code Optimizations:**
   - Review and optimize large components
   - Add React.memo where beneficial
   - Optimize re-renders
   - Add loading states

3. **Performance:**
   - Verify bundle sizes are reasonable
   - Check for unnecessary dependencies
   - Optimize translation loading

**Estimated Time:** 1 hour

---

### 2.7 Create Health Check & Monitoring

**Files I'll Create:**

1. **`app/api/health/route.ts`** (optional):
   - Health check endpoint
   - Returns app status
   - Useful for monitoring

2. **`app/api/version/route.ts`** (optional):
   - Returns app version
   - Build timestamp
   - Useful for debugging

**Estimated Time:** 20 minutes

---

### 2.8 Update Documentation

**Documentation I'll Update/Create:**

1. **`DEPLOYMENT_GUIDE.md`:**
   - Complete deployment instructions
   - Platform-specific guides
   - Troubleshooting

2. **`PRODUCTION_CHECKLIST.md`:**
   - Pre-launch checklist
   - Post-launch verification
   - Monitoring setup

3. **Update `README.md`:**
   - Add deployment section
   - Update environment variables section
   - Add production notes

**Estimated Time:** 30 minutes

---

### 2.9 Security Hardening

**Security Improvements I'll Add:**

1. **Security Headers:**
   - Add to `next.config.js`
   - CSP headers
   - XSS protection
   - HSTS

2. **Environment Variable Security:**
   - Ensure no secrets in code
   - Verify all sensitive data uses env vars
   - Add warnings for missing vars

3. **Content Security Policy:**
   - Configure CSP headers
   - Allow only necessary sources

**Estimated Time:** 45 minutes

---

### 2.10 Final Build & Verification

**Tasks I'll Complete:**

1. **Run Full Build:**
   - `npm run build` with production env vars
   - Verify no errors
   - Check bundle sizes

2. **Lint & Type Check:**
   - `npm run lint`
   - TypeScript compilation
   - Fix any issues

3. **Create Build Artifacts:**
   - Generate `.next` folder
   - Verify all routes build correctly
   - Check static assets

4. **Create Deployment Package:**
   - Document what needs to be deployed
   - Create `.deployignore` if needed
   - Verify gitignore is correct

**Estimated Time:** 30 minutes

---

## Deployment Workflow Summary

### Phase 1 (Your Tasks) - Estimated: 2-4 hours

1. Choose hosting platform (15-30 min)
2. Configure domain & DNS (30-60 min + propagation wait)
3. Set environment variables (5-10 min)
4. Verify backend CORS (10-15 min)
5. Legal pages content (1-2 hours, optional)
6. Branding review (30-60 min)
7. Third-party services (30-60 min, optional)

### Phase 2 (My Tasks) - Estimated: 5-6 hours

1. Pre-deployment code prep (30 min)
2. Deployment config files (45 min)
3. Legal pages structure (30 min)
4. Analytics integration (20 min, if provided)
5. Deployment scripts (45 min)
6. Production optimizations (1 hour)
7. Health checks (20 min)
8. Documentation (30 min)
9. Security hardening (45 min)
10. Final build & verification (30 min)

---

## Recommended Deployment Platforms

### Option 1: Vercel (Recommended)

**Pros:**

- Zero-config Next.js deployment
- Automatic SSL
- Global CDN
- Free tier available
- Easy environment variable management
- Automatic deployments from Git

**Cons:**

- Requires GitHub/GitLab/Bitbucket connection
- Free tier has limits

**Setup Time:** ~15 minutes

### Option 2: Railway

**Pros:**

- Already using for backend
- Familiar interface
- Good for monorepos
- Can deploy from Git

**Cons:**

- Slightly more configuration needed
- Less Next.js-specific optimizations

**Setup Time:** ~20 minutes

### Option 3: Netlify

**Pros:**

- Good Next.js support
- Free tier
- Easy setup
- Good documentation

**Cons:**

- Less Next.js-optimized than Vercel

**Setup Time:** ~20 minutes

---

## Post-Deployment Verification Checklist

After deployment, verify:

- [ ] Web app loads at production URL
- [ ] Login page displays correctly
- [ ] Can register new user
- [ ] Can login with existing user
- [ ] API calls go to correct backend URL
- [ ] All pages load without errors
- [ ] Translations work (UZ/RU/EN)
- [ ] Chat functionality works
- [ ] Document upload works
- [ ] Questionnaire submission works
- [ ] No console errors in browser
- [ ] Mobile responsive (test on phone)
- [ ] SSL certificate valid (HTTPS)
- [ ] Performance is acceptable

---

## Next Steps

1. **You complete Phase 1 tasks** (choose platform, set env vars, etc.)
2. **I complete Phase 2 tasks** (all automated preparation)
3. **Deploy** (push to Git or use platform's deploy button)
4. **Verify** (run through checklist above)

---

**Ready to proceed?** Let me know which hosting platform you choose, and I'll start Phase 2 immediately.
