# Deployment Checklist

Use this checklist before and after deploying the web app to production.

## Pre-Deployment Checklist

### Environment Setup

- [ ] Chosen hosting platform (Vercel/Railway/Netlify/etc.)
- [ ] Created account on hosting platform
- [ ] Connected Git repository to hosting platform
- [ ] Set `NEXT_PUBLIC_API_URL` environment variable in hosting platform
- [ ] Set `NEXT_PUBLIC_AI_SERVICE_URL` environment variable (optional)
- [ ] Verified backend API is accessible from production domain
- [ ] Updated backend CORS to allow production domain

### Domain & DNS

- [ ] Domain purchased/configured
- [ ] DNS records configured (A/CNAME)
- [ ] SSL certificate enabled (usually automatic)
- [ ] Verified HTTPS works

### Code Preparation

- [ ] Run `npm run deploy:check` - all checks pass
- [ ] Run `npm run build` - build succeeds
- [ ] Run `npm run lint` - no linting errors
- [ ] Run `npm run typecheck` - no TypeScript errors
- [ ] Test locally with production environment variables

### Content Review

- [ ] Privacy Policy content finalized
- [ ] Terms of Service content finalized
- [ ] Support page contact information correct
- [ ] All translations reviewed (UZ/RU/EN)
- [ ] Branding consistent throughout app

### Legal & Compliance

- [ ] Privacy Policy page has actual content (not template)
- [ ] Terms of Service page has actual content (not template)
- [ ] Disclaimer about visa approval included in Terms
- [ ] GDPR/CCPA compliance reviewed (if applicable)

---

## Deployment Steps

1. **Push to Git:**

   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

2. **Trigger Deployment:**
   - **Vercel:** Automatic on push, or use dashboard
   - **Railway:** Automatic on push, or use dashboard
   - **Netlify:** Automatic on push, or use dashboard

3. **Monitor Build:**
   - Watch build logs in hosting platform
   - Verify build completes successfully
   - Check for any build errors

---

## Post-Deployment Verification

### Basic Functionality

- [ ] Web app loads at production URL
- [ ] Homepage redirects correctly
- [ ] No console errors in browser (F12)
- [ ] SSL certificate valid (HTTPS lock icon)

### Authentication

- [ ] Login page displays correctly
- [ ] Can register new user
- [ ] Can login with existing user
- [ ] Logout works
- [ ] Forgot password works (if email configured)

### Core Features

- [ ] Applications list page loads
- [ ] Can create new application via questionnaire
- [ ] Application detail page shows data
- [ ] Document upload works
- [ ] Chat interface loads and sends messages
- [ ] Profile page displays user info
- [ ] Support page displays correctly

### API Integration

- [ ] API calls go to correct backend URL (check Network tab)
- [ ] No CORS errors
- [ ] Authentication tokens work
- [ ] All API endpoints respond correctly

### Internationalization

- [ ] Language switcher works (UZ/RU/EN)
- [ ] All pages translate correctly
- [ ] No hardcoded English strings visible

### Legal Pages

- [ ] Privacy Policy page accessible at `/privacy`
- [ ] Terms of Service page accessible at `/terms`
- [ ] Footer links to privacy/terms work
- [ ] Content is not template text

### Performance

- [ ] Pages load quickly (< 3 seconds)
- [ ] No large bundle warnings
- [ ] Mobile responsive (test on phone)
- [ ] Works in Chrome, Firefox, Safari

### Security

- [ ] HTTPS enforced
- [ ] Security headers present (check in DevTools)
- [ ] No sensitive data in client-side code
- [ ] Environment variables not exposed

---

## Monitoring Setup (Optional but Recommended)

- [ ] Set up error tracking (Sentry, etc.)
- [ ] Set up analytics (Google Analytics, etc.)
- [ ] Set up uptime monitoring
- [ ] Configure alerts for downtime

---

## Rollback Plan

If deployment fails:

1. **Vercel:**
   - Go to Deployments → Previous deployment → Promote to Production

2. **Railway:**
   - Go to Deployments → Rollback to previous version

3. **Netlify:**
   - Go to Deploys → Previous deploy → Publish deploy

---

## Troubleshooting

### Build Fails

- Check build logs for errors
- Verify environment variables are set
- Run `npm run deploy:check` locally
- Check Node.js version matches hosting platform

### App Doesn't Load

- Check domain DNS propagation
- Verify SSL certificate
- Check hosting platform status page
- Review error logs in hosting dashboard

### API Errors

- Verify `NEXT_PUBLIC_API_URL` is correct
- Check backend CORS settings
- Test backend API directly
- Check Network tab in browser DevTools

### 404 Errors

- Verify all routes are built correctly
- Check Next.js routing configuration
- Review build output for missing pages

---

## Success Criteria

✅ Deployment is successful when:

- All items in "Post-Deployment Verification" are checked
- No critical errors in browser console
- All core features work as expected
- Performance is acceptable
- Security headers are present

---

**Last Updated:** 2025-11-27
