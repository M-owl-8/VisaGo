# VisaBuddy Backend - Environment Configuration

Copy this configuration to `.env` file and fill in your actual values.

```bash
# ============================================================================
# DATABASE
# ============================================================================
# PostgreSQL connection string (production)
DATABASE_URL=postgresql://user:password@localhost:5432/visabuddy

# SQLite for development (alternative)
# DATABASE_URL=file:./dev.db

# ============================================================================
# AUTHENTICATION
# ============================================================================
# JWT secret key (MUST be at least 32 characters in production)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-secret-key-min-32-characters-long-please-change-this-immediately

# Google OAuth (optional, for Google Sign-In)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ============================================================================
# AI SERVICES
# ============================================================================
# OpenAI API key (required for AI chat)
OPENAI_API_KEY=sk-your-openai-api-key

# AI Service URL (FastAPI Python service)
AI_SERVICE_URL=http://localhost:8001

# ============================================================================
# FILE STORAGE
# ============================================================================
# Storage type: "local" or "firebase"
STORAGE_TYPE=local

# Local storage path (if STORAGE_TYPE=local)
LOCAL_STORAGE_PATH=uploads

# Firebase configuration (if STORAGE_TYPE=firebase)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# ============================================================================
# EMAIL SERVICES (Optional)
# ============================================================================
# SendGrid API key (recommended)
SENDGRID_API_KEY=SG.your-sendgrid-api-key

# SMTP configuration (alternative to SendGrid)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# ============================================================================
# REDIS CACHE (Optional but recommended for production)
# ============================================================================
REDIS_URL=redis://localhost:6379

# ============================================================================
# CORS CONFIGURATION
# ============================================================================
# Allowed origins (comma-separated, NO SPACES)
# Development: use "*" or specific origins
# Production: MUST specify exact origins (NO "*")
CORS_ORIGIN=http://localhost:3000,http://localhost:19006

# ============================================================================
# SERVER CONFIGURATION
# ============================================================================
NODE_ENV=development
PORT=3000

# ============================================================================
# FEATURE FLAGS
# ============================================================================
ENABLE_MOCK_PAYMENTS=true
ENABLE_RECONCILIATION=false
```

## Required Variables for Production

1. **DATABASE_URL** - PostgreSQL connection string
2. **JWT_SECRET** - At least 32 characters
3. **OPENAI_API_KEY** - For AI chat functionality

## Optional but Recommended

- **GOOGLE_CLIENT_ID/SECRET** - For Google Sign-In
- **FIREBASE_PROJECT_ID** - For cloud storage
- **REDIS_URL** - For caching (improves performance)
- **SENDGRID_API_KEY** - For email notifications

## Security Notes

- Never commit `.env` file to git
- Use strong, randomly generated secrets
- In production, set `NODE_ENV=production`
- In production, set specific CORS origins (not "*")


