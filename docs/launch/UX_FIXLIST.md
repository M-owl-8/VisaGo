# UX Fix List

Last updated: 2025-12-17

## P0 Issues

1. Hero overlap & double scroll on mobile
   - Repro: Open landing on 360x640; scroll; background overlays text.
   - Code: `apps/web/app/page.tsx:42-64`, `apps/web/components/landing/HeroSection.tsx:12-77`.
   - Fix: Single scroll container, adjust z-index/padding.

2. Footer spacing causes nested scroll
   - Repro: Scroll to bottom on small screens; double scrollbar visible.
   - Code: `apps/web/components/landing/LandingFooter.tsx`.
   - Fix: Remove extra height/margins; ensure body handles scroll.

3. Auth input styling inconsistency
   - Repro: Safari/Chrome render different borders on login/register.
   - Code: `apps/web/components/auth/AuthField.tsx`.
   - Fix: Normalize input styles (border, radius, focus).

## P1 Issues

4. Error handling via alert()
   - Repro: Questionnaire errors show alert.
   - Code: `apps/web/app/(dashboard)/questionnaire/page.tsx`.
   - Fix: Replace with error banner component.

5. Missing retry on chat error
   - Repro: Disconnect during chat; no retry CTA.
   - Code: `frontend_new/src/screens/chat/ChatScreen.tsx`.
   - Fix: Add retry action when errorMessage set.

6. Incomplete i18n on web dashboard
   - Repro: Some texts in English only (documents, questionnaire).
   - Code: see `apps/web/CURRENT_STATE_SUMMARY.md:98-111`.
   - Fix: Add translation keys and use `t()`.

## Accessibility

- Add focus states & aria labels on buttons/links (audit across `apps/web/components/ui/*`).
- Check contrast on landing gradients and text (`HeroSection.tsx`).
- Keyboard navigation on modals (`apps/web/components/ui/Modal.tsx`).

## Mobile Responsiveness

- Ensure no horizontal scroll on 320–768px; test Landing, Applications list, Documents modal.

## Code References

- Landing layout: `apps/web/app/page.tsx`
- Hero: `apps/web/components/landing/HeroSection.tsx`
- Footer: `apps/web/components/landing/LandingFooter.tsx`
- Auth fields: `apps/web/components/auth/AuthField.tsx`
- Questionnaire: `apps/web/app/(dashboard)/questionnaire/page.tsx`
