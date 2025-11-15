#!/bin/bash

# VisaBuddy Environment Setup Script
# This script helps set up environment variables for all services

set -e

echo "🚀 VisaBuddy Environment Setup"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to generate random string
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Check if .env files exist
check_env_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${YELLOW}⚠️  $file already exists${NC}"
        read -p "Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi
    return 0
}

# Backend .env setup
setup_backend_env() {
    echo "📝 Setting up backend environment..."
    
    if check_env_file "apps/backend/.env"; then
        cat > apps/backend/.env << EOF
# Server Configuration
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://visabuddy:changeme@localhost:5432/visabuddy

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=$(generate_secret)

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:19006

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Storage
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=uploads

# Firebase (optional - configure if using Firebase Storage)
# FIREBASE_PROJECT_ID=
# FIREBASE_PRIVATE_KEY=
# FIREBASE_CLIENT_EMAIL=

# OpenAI (REQUIRED for AI chat)
# OPENAI_API_KEY=sk-...

# Google OAuth (REQUIRED for authentication)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=

# Payment Gateways (at least one required)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...

# Payme (Uzbekistan)
# PAYME_MERCHANT_ID=
# PAYME_API_KEY=

# Click (Uzbekistan)
# CLICK_MERCHANT_ID=
# CLICK_API_KEY=

# Uzum (Uzbekistan)
# UZUM_MERCHANT_ID=
# UZUM_API_KEY=

# Email Service
# SENDGRID_API_KEY=SG....
# OR
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=

# Frontend URL
FRONTEND_URL=http://localhost:19006
EOF
        echo -e "${GREEN}✅ Backend .env created${NC}"
    else
        echo -e "${YELLOW}⏭️  Skipping backend .env${NC}"
    fi
}

# Frontend .env setup
setup_frontend_env() {
    echo "📝 Setting up frontend environment..."
    
    if check_env_file "apps/frontend/.env"; then
        cat > apps/frontend/.env << EOF
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3000

# Google OAuth
# EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EOF
        echo -e "${GREEN}✅ Frontend .env created${NC}"
    else
        echo -e "${YELLOW}⏭️  Skipping frontend .env${NC}"
    fi
}

# AI Service .env setup
setup_ai_env() {
    echo "📝 Setting up AI service environment..."
    
    if check_env_file "apps/ai-service/.env"; then
        cat > apps/ai-service/.env << EOF
# OpenAI API Key (REQUIRED)
# OPENAI_API_KEY=sk-...

# AI Service URL (optional)
AI_SERVICE_URL=http://localhost:8001
EOF
        echo -e "${GREEN}✅ AI service .env created${NC}"
    else
        echo -e "${YELLOW}⏭️  Skipping AI service .env${NC}"
    fi
}

# Main setup
main() {
    echo "This script will create .env files for all services."
    echo "You'll need to fill in the required values manually."
    echo ""
    read -p "Continue? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi

    setup_backend_env
    setup_frontend_env
    setup_ai_env

    echo ""
    echo -e "${GREEN}✅ Environment setup complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Edit the .env files and add your API keys"
    echo "2. See SETUP_GUIDE_COMPLETE.md for detailed instructions"
    echo "3. Run: npm run install-all"
    echo "4. Run: cd apps/backend && npm run db:migrate"
}

main









