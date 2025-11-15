#!/bin/bash

# ============================================================================
# Generate .env.example files from templates
# ============================================================================

cat > apps/backend/.env.example << 'EOF'
# ============================================================================
# VisaBuddy Backend - Environment Variables Template
# ============================================================================
# Copy this to .env and fill in values

NODE_ENV=development
PORT=3000

# REQUIRED
DATABASE_URL=postgresql://user:password@localhost:5432/visabuddy
JWT_SECRET=

# CORS (REQUIRED for production)
CORS_ORIGIN=

# OPTIONAL
REDIS_URL=
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=uploads
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
OPENAI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYME_MERCHANT_ID=
PAYME_API_KEY=
CLICK_MERCHANT_ID=
CLICK_API_KEY=
UZUM_MERCHANT_ID=
UZUM_API_KEY=
SENDGRID_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FRONTEND_URL=
ENABLE_RECONCILIATION=true
ENABLE_MOCK_PAYMENTS=false
EOF

cat > apps/frontend/.env.example << 'EOF'
# ============================================================================
# VisaBuddy Frontend - Environment Variables Template
# ============================================================================
# Copy this to .env and fill in values

EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANALYTICS_ID=
EXPO_PUBLIC_ENABLE_ANALYTICS=false
EOF

cat > apps/ai-service/.env.example << 'EOF'
# ============================================================================
# VisaBuddy AI Service - Environment Variables Template
# ============================================================================
# Copy this to .env and fill in values

OPENAI_API_KEY=
AI_SERVICE_PORT=8001
LOG_LEVEL=INFO
RAG_MODEL=gpt-4
EMBEDDING_MODEL=text-embedding-3-small
MAX_TOKENS=2000
TEMPERATURE=0.7
CACHE_ENABLED=true
CACHE_TTL=3600
EOF

echo "✅ .env.example files generated successfully!"








