#!/bin/bash

# ============================================================================
# VisaBuddy Railway Deployment Script
# ============================================================================
# 
# Helps deploy VisaBuddy to Railway platform
# Usage: ./scripts/deploy-railway.sh
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
echo "║     VisaBuddy Railway Deployment Guide                            ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

echo -e "${BLUE}This script will guide you through deploying to Railway.${NC}"
echo -e "${YELLOW}Make sure you have:${NC}"
echo "  1. Railway account (https://railway.app)"
echo "  2. Railway CLI installed (npm i -g @railway/cli)"
echo "  3. All environment variables ready"
echo ""
read -p "Continue? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Railway Deployment Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}⚠️  Railway CLI not found${NC}"
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

echo -e "${GREEN}✅ Railway CLI found${NC}"
echo ""

echo "Step 1: Login to Railway"
echo "  Run: railway login"
echo ""

echo "Step 2: Create New Project"
echo "  Run: railway init"
echo "  Or create project in Railway dashboard"
echo ""

echo "Step 3: Add Services"
echo "  In Railway dashboard:"
echo "  - Add PostgreSQL database"
echo "  - Add Redis (optional but recommended)"
echo "  - Add Backend service (connect to GitHub repo or upload)"
echo "  - Add AI Service (if deploying separately)"
echo ""

echo "Step 4: Set Environment Variables"
echo "  In Railway dashboard, add all variables from .env.production:"
echo "  - DATABASE_URL (from PostgreSQL service)"
echo "  - REDIS_URL (from Redis service, if added)"
echo "  - JWT_SECRET"
echo "  - CORS_ORIGIN"
echo "  - OPENAI_API_KEY"
echo "  - GOOGLE_CLIENT_ID"
echo "  - GOOGLE_CLIENT_SECRET"
echo "  - And all other required variables"
echo ""

echo "Step 5: Deploy"
echo "  Railway will automatically deploy on git push"
echo "  Or use: railway up"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 Railway Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "The railway.json file is already configured with:"
echo "  - Backend service"
echo "  - AI Service"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Follow the steps above"
echo "  2. See docs/DEPLOYMENT_GUIDE.md for detailed instructions"
echo "  3. Monitor deployment in Railway dashboard"
echo ""








