# PHASE 1 — Owner Checklist & Architecture Brief

## 1. Architecture Overview

- **Next.js 14 / App Router:** The entire web client lives in `apps/web/app`. `app/layout.tsx` wires typography tokens (`Plus Jakarta Sans`, `Space Grotesk`) plus `<Providers />` for client hydration and translations.
- **Rendering model:** Most route entries (`/applications`, `/chat`, `/questionnaire`, etc.) are Client Components because they talk directly to Zustand stores. Server Components can still be added around data-fetching boundaries.
- **State & data:** Global state comes from `lib/stores/auth.ts` (auth/session, applications) and `lib/stores/chat.ts` (AI chat history). Both wrap the shared Axios singleton (`lib/api/client.ts`) that targets the same backend the mobile app uses.
- **Styling system:** Tailwind CSS + custom `globals.css` utilities (`glass-panel`, `shadow-card`, etc.) mirror mobile gradients. Shared primitives live under `components/ui/` (e.g., `Button`, `Card`) and `components/layout/AppShell` renders the authenticated shell/nav.
- **Internationalization:** `lib/i18n` registers react-i18next; translations sit in `locales/{en,ru,uz}.json`, and language changes persist via `localStorage`.
- **Questionnaire domain:** Form schemas/types live in `lib/types/questionnaire.ts` with mapping helpers in `lib/utils/questionnaireMapper.ts` to keep parity with the mobile Questionnaire V2 config.
- **Deployment & config:** Next standalone build via `Dockerfile` / `nixpacks.toml`, deployed on Railway. Runtime configuration relies on environment variables like `NEXT_PUBLIC_API_URL` declared in `lib/api/config.ts`.

## 2. Route Inventory & Mobile Pairing

| Route                          | Purpose & Data Sources                                                                   | Mobile Screen to Mirror                | Parity / Gaps                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `/`                            | Splash that initializes auth store then redirects to `/applications` or `/login`.        | Mobile splash/loading screen.          | Needs branded animation + copy that matches the app intro.                                                     |
| `/login`                       | Email/password auth via `useAuthStore.login`.                                            | Mobile login.                          | Layout is basic web form; needs full-screen branded art + biometric hints from mobile.                         |
| `/register`                    | Creates account through `apiClient.register`.                                            | Mobile sign-up.                        | Should reuse the same multi-field form, OTP hints, and success states.                                         |
| `/forgot-password`             | Sends reset link via `apiClient.forgotPassword`.                                         | Mobile forgot-password modal.          | Currently plain form; needs storytelling + confirmation animation.                                             |
| `/applications`                | Dashboard fetching `userApplications` from auth store.                                   | Mobile “My Applications” home.         | Already styled towards mobile, but requires exact card layout, motion, and empty state art from mobile assets. |
| `/applications/[id]`           | Fetches single application + checklist (`/applications/:id`, `/document-checklist/:id`). | Mobile application detail timeline.    | Needs segmented tabs, status chips, AI CTA, and progress visuals matching mobile.                              |
| `/applications/[id]/documents` | Upload documents (`apiClient.uploadDocument`).                                           | Mobile documents uploader.             | Should mirror drag/drop zone, document list, and progress feedback used on mobile.                             |
| `/questionnaire`               | 7-step wizard, posts to `applications/ai-generate`.                                      | Mobile questionnaire wizard.           | UI is utilitarian; needs mobile stepper design, autosave indicators, and motion transitions.                   |
| `/chat`                        | AI assistant experience using `useChatStore`.                                            | Mobile AI chat (bubble + full screen). | Missing floating bubble entry point, typing animation, and streaming seen in mobile.                           |
| `/profile`                     | Reads/updates profile via `apiClient.updateProfile`.                                     | Mobile profile/settings.               | Needs sectioned cards, language toggles, notification switches identical to app.                               |
| `/support`                     | Static help + contact info.                                                              | Mobile help center.                    | Requires FAQ accordion, contact chips, and “Report a problem” form parity.                                     |
| `/privacy`, `/terms`           | Legal markdown render.                                                                   | Mobile legal screens.                  | Ensure typography + link styles match; confirm localized content matches mobile copy.                          |

## 3. Owner Inputs & Decisions Required

### Visual & Brand System

- [ ] Deliver the latest mobile design tokens (spacing scale, radii, shadows, gradients, blur levels) plus component specs (buttons, cards, tabs, modals).
- [ ] Provide official SVG/PNG assets: logotype, wordmark, favicon, hero illustration, empty-state art, document icons, chat bubble.
- [ ] Confirm animation direction for page transitions, hover states, skeleton shimmer timing, and chat bubble expansion (motion curves, durations).

### Copywriting & Localization

- [ ] Confirm the supported locales (currently RU / UZ / EN). Indicate ordering + default language.
- [ ] Supply final hero/CTA copy for Applications dashboard, Questionnaire steps, AI assistant prompts, support page, and empty states.
- [ ] Provide translated strings for any new UI text introduced during Phase 2 (skeleton messages, tooltips, toast content, error explanations).

### Product Data & Business Rules

- [ ] Freeze the canonical list of visa types, countries, and status enums (draft/in progress/submitted/etc.) so we can centralize them in config.
- [ ] Decide whether desktop gets any additional onboarding modules (hero carousel, stats) beyond what exists in mobile.
- [ ] Specify document checklist variations per country/visa type and whether AI auto-check rules differ by platform.
- [ ] Define notification preferences (email, SMS, Telegram, push) and which toggles should be exposed on the Profile page.

### Integrations, Ops & Security

- [ ] Provide production-ready API base URLs, analytics IDs (GA4, Mixpanel, Amplitude), and error tracking DSNs (Sentry, LogRocket).
- [ ] Confirm AI provider credentials (OpenAI / DeepSeek / custom) and whether web should call the same Railway AI service as mobile.
- [ ] Share any required 3rd-party SDK keys (Firebase, OneSignal, reCAPTCHA) for parity with the app.
- [ ] Clarify auth requirements: MFA availability, password rules, session timeout, and whether social login will be exposed on web.
- [ ] Validate CDN / file storage strategy for document uploads (max file size, allowed formats, virus scanning policy).

### Legal, Support & Compliance

- [ ] Provide up-to-date Privacy Policy & Terms translations that match what ships on mobile today.
- [ ] Confirm customer support channels (email, WhatsApp, Telegram, hotline) plus SLA/working hours for the Support page.
- [ ] Decide on consent banners or compliance modals needed on web (cookies, analytics, AI disclosures).

## 4. Critical Flows to Test & Sign Off

1. **Authentication lifecycle:** register → (verify, if required) → login → session persistence → logout → forgot/reset flow with proper error handling and disabled states.
2. **Applications dashboard:** initial load (skeletons), stats cards, listing, empty state, refresh, deep links to `/applications/[id]` and chat/documents actions.
3. **Application detail:** combined progress bar, checklist, AI CTA, documents link, error handling when checklist API fails, loading skeletons.
4. **Document handling:** upload >20MB rejection, success toast + redirect, multiple uploads in sequence, retry after API error.
5. **Questionnaire wizard:** step validation, autosave cadence, resume after refresh, final submission generating application and redirecting correctly.
6. **AI assistant:** floating bubble toggle on every page, conversation persistence per application, streaming/typing indicator, failure + retry states.
7. **Profile & preferences:** edit personal info, change language (i18n + persistence), toggle notification settings, logout from header.
8. **Help & support:** FAQ accordion interaction, contact chip actions, “Report a problem” form submission + toast, fallback contact info offline.

## 5. Next Step for Owner

Review this document, fill every unchecked item, attach the required assets/specs, and reply **“PHASE 2 START”** when the inputs are finalized. Only then will we begin hands-on implementation in Phase 2.
