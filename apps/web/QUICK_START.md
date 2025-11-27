# Quick Start Guide

## ✅ Setup Complete!

The web app is fully configured and ready to run.

## 🚀 Start the App

1. **Navigate to web app directory:**

   ```bash
   cd apps/web
   ```

2. **Install dependencies (if not already done):**

   ```bash
   npm install
   ```

3. **Start development server:**

   ```bash
   npm run dev
   ```

4. **Open in browser:**
   - Go to: http://localhost:3000
   - The app will automatically redirect to `/login` if not authenticated

## 📝 Environment Variables (Optional)

The app has default API URLs configured. To override, create `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://visago-production.up.railway.app
NEXT_PUBLIC_AI_SERVICE_URL=https://zippy-perfection-production.up.railway.app
```

## 🎯 Features Available

- ✅ **Authentication**: Login, Register, Forgot Password
- ✅ **Applications**: View and manage visa applications
- ✅ **Questionnaire**: Multi-step visa questionnaire
- ✅ **Documents**: Upload and track documents
- ✅ **AI Chat**: Chat with AI assistant
- ✅ **Profile**: View user profile
- ✅ **Support**: Contact information and help

## 🔧 Troubleshooting

### Port already in use

If port 3000 is busy, Next.js will automatically use the next available port (3001, 3002, etc.)

### Build errors

```bash
# Clean and rebuild
rm -rf .next
npm run build
```

### TypeScript errors

```bash
# Check types
npm run lint
```

## 📦 Build for Production

```bash
npm run build
npm start
```

## 🌐 Deployment

Ready to deploy to:

- **Vercel** (recommended)
- **Railway**
- **Any static hosting**

Set environment variables in your deployment platform.
