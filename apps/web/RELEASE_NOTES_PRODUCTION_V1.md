# Release Notes - Production v1

## Fix: Next.js build failure – createContext not a function

### Problem

During `npm run build` in a production Docker environment (node:20-alpine), Next.js was failing with:

```
TypeError: (0 , a.createContext) is not a function
at /app/.next/server/app/_not-found/page.js
```

This error occurred during the "Collecting page data" phase of the build process.

### Root Cause

1. **`app/not-found.tsx`** was using `useTranslation()` hook from `react-i18next` but was missing the `'use client'` directive, causing Next.js to treat it as a server component during build.
2. **`app/providers.tsx`** was importing `'../lib/i18n'` at the top level, which caused `react-i18next` to be evaluated during build time, triggering `createContext` errors.

### Files Changed

1. **`apps/web/app/not-found.tsx`**
   - Added `'use client'` directive at the top
   - Added `export const dynamic = 'force-dynamic'` to prevent static generation
   - This ensures the page is rendered as a client component and not evaluated during build

2. **`apps/web/app/providers.tsx`**
   - Changed from top-level import: `import '../lib/i18n'`
   - To lazy import inside `useEffect`: `import('../lib/i18n')`
   - This prevents `react-i18next` from being evaluated during build time

### Solution

- All pages using `react-i18next` hooks are now properly marked as client components
- i18n initialization is deferred to client-side only via lazy imports
- Dynamic rendering is enforced for pages that use `useTranslation`

### Verification

- ✅ `npm run build` now succeeds in a clean production environment (Node 20-alpine)
- ✅ `_not-found` page works correctly as a client component
- ✅ Error boundaries (`error.tsx`) continue to work correctly
- ✅ All pages using `useTranslation` are properly configured

### Technical Details

- React version: ^18.3.0 (compatible with Next.js 14.2.0)
- Next.js version: ^14.2.0
- react-i18next version: ^15.3.4
- The fix ensures that `createContext` from React is only called in client-side code, never during server-side rendering or build time.
