#!/bin/bash

# ============================================================================
# VisaBuddy Production Environment Setup Script
# ============================================================================
# 
# This script sets up production environment with security best practices
# Usage: ./scripts/setup-production.sh
#
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║     VisaBuddy Production Environment Setup                       ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Function to generate secure secret
generate_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
    elif command -v node &> /dev/null; then
        node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    else
        echo "ERROR: Need openssl or node to generate secrets"
        exit 1
    fi
}

# Function to prompt for required value
prompt_required() {
    local prompt=$1
    local var_name=$2
    local default=$3
    
    while true; do
        if [ -n "$default" ]; then
            read -p "$prompt [$default]: " value
            value=${value:-$default}
        else
            read -p "$prompt: " value
        fi
        
        if [ -n "$value" ]; then
            eval "$var_name='$value'"
            return 0
        else
            echo -e "${RED}❌ This field is required!${NC}"
        fi
    done
}

# Function to prompt for optional value
prompt_optional() {
    local prompt=$1
    local var_name=$2
    local default=$3
    
    read -p "$prompt${default:+ [$default]}: " value
    value=${value:-$default}
    eval "$var_name='$value'"
}

echo -e "${BLUE}This script will help you set up production environment variables.${NC}"
echo -e "${YELLOW}⚠️  Make sure you have all your API keys and credentials ready.${NC}"
echo ""
read -p "Continue? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Collecting Production Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Server Configuration
echo -e "${BLUE}Server Configuration${NC}"
NODE_ENV="production"
prompt_optional "Port" PORT "3000"

# Database
echo ""
echo -e "${BLUE}Database Configuration${NC}"
prompt_required "Database URL (postgresql://user:pass@host:port/db)" DATABASE_URL ""

# JWT Secret
echo ""
echo -e "${BLUE}Security${NC}"
JWT_SECRET=$(generate_secret)
echo -e "${GREEN}✅ Generated secure JWT secret${NC}"

# CORS
echo ""
prompt_required "CORS Origins (comma-separated, e.g., https://app.visabuddy.com)" CORS_ORIGIN ""

# Redis
echo ""
echo -e "${BLUE}Redis (Optional but Recommended)${NC}"
prompt_optional "Redis URL" REDIS_URL ""

# Storage
echo ""
echo -e "${BLUE}Storage Configuration${NC}"
prompt_optional "Storage Type (local/firebase)" STORAGE_TYPE "local"
if [ "$STORAGE_TYPE" = "firebase" ]; then
    prompt_required "Firebase Project ID" FIREBASE_PROJECT_ID ""
    prompt_required "Firebase Private Key" FIREBASE_PRIVATE_KEY ""
    prompt_required "Firebase Client Email" FIREBASE_CLIENT_EMAIL ""
fi

# OpenAI
echo ""
echo -e "${BLUE}OpenAI (Required for AI Chat)${NC}"
prompt_optional "OpenAI API Key" OPENAI_API_KEY ""

# Google OAuth
echo ""
echo -e "${BLUE}Google OAuth (Required for Authentication)${NC}"
prompt_optional "Google Client ID" GOOGLE_CLIENT_ID ""
prompt_optional "Google Client Secret" GOOGLE_CLIENT_SECRET ""

# Payment Gateways
echo ""
echo -e "${BLUE}Payment Gateways (At least one required)${NC}"
prompt_optional "Stripe Secret Key" STRIPE_SECRET_KEY ""
prompt_optional "Stripe Webhook Secret" STRIPE_WEBHOOK_SECRET ""
prompt_optional "Payme Merchant ID" PAYME_MERCHANT_ID ""
prompt_optional "Payme API Key" PAYME_API_KEY ""

# Email
echo ""
echo -e "${BLUE}Email Service${NC}"
prompt_optional "SendGrid API Key" SENDGRID_API_KEY ""
if [ -z "$SENDGRID_API_KEY" ]; then
    prompt_optional "SMTP Host" SMTP_HOST ""
    prompt_optional "SMTP Port" SMTP_PORT "587"
    prompt_optional "SMTP User" SMTP_USER ""
    prompt_optional "SMTP Password" SMTP_PASS ""
fi

# Frontend URL
echo ""
prompt_optional "Frontend URL" FRONTEND_URL ""

# Create .env file
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Creating Production .env File"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ENV_FILE="apps/backend/.env.production"

if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  $ENV_FILE already exists${NC}"
    read -p "Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

cat > "$ENV_FILE" << EOF
# ============================================================================
# VisaBuddy Production Environment Variables
# ============================================================================
# Generated: $(date)
# ⚠️  NEVER commit this file to git!
# ============================================================================

# Server Configuration
NODE_ENV=${NODE_ENV}
PORT=${PORT}

# Database
DATABASE_URL=${DATABASE_URL}

# JWT Secret (Auto-generated)
JWT_SECRET=${JWT_SECRET}

# CORS
CORS_ORIGIN=${CORS_ORIGIN}

# Redis
${REDIS_URL:+REDIS_URL=${REDIS_URL}}

# Storage
STORAGE_TYPE=${STORAGE_TYPE}
${STORAGE_TYPE:+LOCAL_STORAGE_PATH=uploads}

# Firebase
${FIREBASE_PROJECT_ID:+FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}}
${FIREBASE_PRIVATE_KEY:+FIREBASE_PRIVATE_KEY=${FIREBASE_PRIVATE_KEY}}
${FIREBASE_CLIENT_EMAIL:+FIREBASE_CLIENT_EMAIL=${FIREBASE_CLIENT_EMAIL}}

# OpenAI
${OPENAI_API_KEY:+OPENAI_API_KEY=${OPENAI_API_KEY}}

# Google OAuth
${GOOGLE_CLIENT_ID:+GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}}
${GOOGLE_CLIENT_SECRET:+GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}}

# Payment Gateways
${STRIPE_SECRET_KEY:+STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}}
${STRIPE_WEBHOOK_SECRET:+STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}}
${PAYME_MERCHANT_ID:+PAYME_MERCHANT_ID=${PAYME_MERCHANT_ID}}
${PAYME_API_KEY:+PAYME_API_KEY=${PAYME_API_KEY}}

# Email Service
${SENDGRID_API_KEY:+SENDGRID_API_KEY=${SENDGRID_API_KEY}}
${SMTP_HOST:+SMTP_HOST=${SMTP_HOST}}
${SMTP_PORT:+SMTP_PORT=${SMTP_PORT}}
${SMTP_USER:+SMTP_USER=${SMTP_USER}}
${SMTP_PASS:+SMTP_PASS=${SMTP_PASS}}

# Frontend URL
${FRONTEND_URL:+FRONTEND_URL=${FRONTEND_URL}}

# Feature Flags
ENABLE_RECONCILIATION=true
ENABLE_MOCK_PAYMENTS=false
EOF

echo -e "${GREEN}✅ Production .env file created: $ENV_FILE${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT SECURITY NOTES:${NC}"
echo "   1. The .env.production file contains sensitive data"
echo "   2. NEVER commit it to git (it's in .gitignore)"
echo "   3. Store it securely in your deployment platform"
echo "   4. Rotate secrets every 90 days"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "   1. Review the .env.production file"
echo "   2. Validate configuration: ./scripts/validate-env.sh backend"
echo "   3. Test database connection"
echo "   4. Deploy to your platform (Railway, Heroku, AWS, etc.)"
echo "   5. Set environment variables in your platform dashboard"
echo ""








