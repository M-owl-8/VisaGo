# VisaBuddy Web App

Modern, production-ready web application for Ketdik/VisaBuddy built with Next.js, TypeScript, and Tailwind CSS.

## Features

- ✅ Authentication (Login, Register, Forgot Password)
- ✅ Applications Dashboard
- ✅ Questionnaire v2 (Multi-step form)
- ✅ Document Upload & Validation
- ✅ AI Chat Interface
- ✅ Profile & Support Pages
- ✅ i18n Support (UZ/RU/EN)

## Setup

1. Install dependencies:

```bash
cd apps/web
npm install
```

2. Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=https://visago-production.up.railway.app
NEXT_PUBLIC_AI_SERVICE_URL=https://zippy-perfection-production.up.railway.app
```

3. Run development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API base URL (required)
- `NEXT_PUBLIC_AI_SERVICE_URL` - AI service base URL (optional)

## Project Structure

```
apps/web/
├── app/                    # Next.js App Router pages
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   ├── applications/      # Applications list & detail
│   ├── questionnaire/     # Questionnaire v2
│   ├── chat/              # AI chat interface
│   ├── profile/           # User profile
│   └── support/           # Support page
├── components/            # React components
├── lib/                   # Core libraries
│   ├── api/              # API client
│   ├── stores/           # Zustand stores
│   └── i18n/             # i18n configuration
└── locales/              # Translation files
```

## Deployment

The app can be deployed to:

- Vercel (recommended for Next.js)
- Railway
- Any static hosting service

Make sure to set the environment variables in your deployment platform.
