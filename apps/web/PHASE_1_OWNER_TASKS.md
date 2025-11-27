# Phase 1 - Owner Tasks (DO NOT IMPLEMENT)

These tasks are the responsibility of the project owner and should be completed before or during deployment. The development team (Cursor) will NOT modify code for these.

## 1. Production API URL Configuration

**Task:** Set `NEXT_PUBLIC_API_URL` environment variable in hosting platform

**Where:**

- Vercel: Project Settings → Environment Variables
- Railway: Service Settings → Variables
- Other platforms: Follow their environment variable configuration

**Value:**

```
NEXT_PUBLIC_API_URL=https://visago-production.up.railway.app
```

**Verification:**

- Ensure the backend is reachable from the web app's hosting location
- Test that API calls succeed from production domain

---

## 2. Domain & Hosting Setup

**Task:** Choose and connect a domain for the web app

**Options:**

- `app.ketdik.uz`
- `visabuddy.uz`
- `ketdik.com` (or subdomain)
- Other preferred domain

**Steps:**

1. Purchase/configure domain
2. Configure DNS to point to hosting provider
3. Set up SSL certificate (usually automatic with modern hosting)
4. Verify domain is accessible

**Hosting Platforms:**

- Vercel (recommended for Next.js)
- Railway
- Netlify
- Any Node.js hosting with static file serving

---

## 3. Privacy Policy & Legal Pages

**Task:** Provide final content for legal pages

**Required Pages:**

1. **Privacy Policy**
   - Data collection practices
   - How user data is stored and used
   - Third-party services (if any)
   - User rights (GDPR compliance if applicable)

2. **Terms of Use / Disclaimer**
   - **CRITICAL:** "VisaBuddy/Ketdik does not guarantee visa approval. All visa decisions are made by embassies/consulates."
   - Service limitations
   - User responsibilities
   - Intellectual property
   - Limitation of liability

**Languages:**

- Minimum: English (EN)
- Optional: Uzbek (UZ), Russian (RU)

**Implementation Note:**

- Pages can be created as simple Next.js pages in `app/privacy/page.tsx` and `app/terms/page.tsx`
- Content will be provided by owner, developer will only create the page structure

---

## 4. Branding & Copy Review

**Task:** Final check of UI text, slogans, product name

**Areas to Review:**

- App name: "Ketdik" or "VisaBuddy" (ensure consistency)
- Taglines and marketing copy
- Button labels and CTAs
- Error messages (user-facing)
- Support page content
- Email templates (if implemented)

**Action Items:**

- Review all user-facing text in the web app
- Ensure brand voice is consistent
- Verify translations (UZ/RU/EN) match brand guidelines

---

## 5. Third-Party Services (Optional)

### Email Provider (SendGrid/SMTP)

**Purpose:**

- Forgot password emails
- Notification emails (optional)

**Status:** OPTIONAL for initial launch

- Forgot password flow works without email (shows success message)
- Can be added later

**If Implementing:**

- Set up SendGrid account or SMTP server
- Configure backend to send emails
- Test email delivery

### Analytics (Google Analytics / Others)

**Purpose:**

- Track user behavior
- Monitor app performance
- Understand user flows

**Status:** OPTIONAL

- Can be added post-launch
- Requires adding tracking code to Next.js app

**If Implementing:**

- Set up analytics account
- Add tracking code to `app/layout.tsx`
- Configure privacy-compliant tracking

---

## Summary

**Before Launch Checklist:**

- [ ] `NEXT_PUBLIC_API_URL` set in hosting platform
- [ ] Domain configured and SSL active
- [ ] Privacy Policy content provided and page created
- [ ] Terms of Use content provided (with visa disclaimer) and page created
- [ ] Branding/copy reviewed and approved
- [ ] (Optional) Email provider configured
- [ ] (Optional) Analytics configured

**Note:** Development team will proceed with Phase 2 implementation assuming these will be handled by owner.
