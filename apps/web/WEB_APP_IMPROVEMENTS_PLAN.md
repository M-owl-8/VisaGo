# Web App Stability & Loading States - Implementation Plan

## Step 1: File Identification

### Applications List Page

**File:** `apps/web/app/(dashboard)/applications/page.tsx`

- **Purpose:** Displays user's visa applications with metrics and recent activity
- **Current State:** Has basic skeleton loading, empty state exists, but error handling could be improved
- **Needs:** Better loading states, error retry, improved responsiveness

### Application Detail Page

**File:** `apps/web/app/(dashboard)/applications/[id]/page.tsx`

- **Purpose:** Shows single application details with checklist and actions
- **Current State:** Basic loading spinner, minimal error handling, no empty state for missing checklist
- **Needs:** Proper skeleton loading, error states with retry, empty states

### Chat Page

**File:** `apps/web/app/(dashboard)/chat/page.tsx`

- **Purpose:** AI chat interface with message history
- **Current State:** Basic empty state, error banner exists but could be better
- **Needs:** Loading states for initial fetch, better error handling, improved empty state

### Main Layout / Navbar

**File:** `apps/web/components/layout/AppShell.tsx`

- **Purpose:** Main navigation, header, footer for dashboard
- **Current State:** Good structure, responsive but could be optimized for 1366px/1920px
- **Needs:** Responsive width adjustments, container max-widths

---

## Step 2: Implementation Tasks

1. Create reusable hooks in `apps/web/lib/hooks/`:
   - `useApplications.ts` - Fetch applications list
   - `useApplication.ts` - Fetch single application
   - `useChatSession.ts` - Chat history management

2. Improve loading states:
   - Replace basic spinners with skeleton components
   - Add loading states for refetch operations
   - Show loading indicators during data fetching

3. Improve error states:
   - Add retry buttons
   - User-friendly error messages
   - Clear error boundaries

4. Improve empty states:
   - Better visual design
   - Clear call-to-actions
   - Helpful messaging

5. Responsiveness improvements:
   - Adjust container max-widths for 1366px and 1920px
   - Optimize spacing and layout
   - Ensure content is centered and readable

---

## Step 3: Files to Create/Modify

### New Files:

- `apps/web/lib/hooks/useApplications.ts`
- `apps/web/lib/hooks/useApplication.ts`
- `apps/web/lib/hooks/useChatSession.ts`

### Modified Files:

- `apps/web/app/(dashboard)/applications/page.tsx`
- `apps/web/app/(dashboard)/applications/[id]/page.tsx`
- `apps/web/app/(dashboard)/chat/page.tsx`
- `apps/web/components/layout/AppShell.tsx`
- `apps/web/components/ui/Skeleton.tsx` (enhance if needed)

---

## Step 4: Safety for Mobile App

All changes are isolated to `apps/web/` directory:

- No backend contract changes
- No shared code with mobile app (`frontend_new/`)
- Only web-specific improvements
- Type imports from shared types are safe (read-only)
