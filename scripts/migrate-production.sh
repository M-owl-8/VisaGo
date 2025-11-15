#!/bin/bash

# ============================================================================
# VisaBuddy Production Database Migration Script
# ============================================================================
# 
# Runs Prisma migrations for production database
# Usage: ./scripts/migrate-production.sh
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
echo "║     VisaBuddy Production Database Migration                      ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env file exists
if [ ! -f "apps/backend/.env" ] && [ ! -f "apps/backend/.env.production" ]; then
    echo -e "${RED}❌ No .env file found in apps/backend/${NC}"
    echo "Please run ./scripts/setup-production.sh first"
    exit 1
fi

# Load environment variables
if [ -f "apps/backend/.env.production" ]; then
    echo -e "${BLUE}📋 Loading production environment...${NC}"
    export $(cat apps/backend/.env.production | grep -v '^#' | xargs)
elif [ -f "apps/backend/.env" ]; then
    echo -e "${BLUE}📋 Loading environment...${NC}"
    export $(cat apps/backend/.env | grep -v '^#' | grep DATABASE_URL | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL is not set${NC}"
    echo "Please set DATABASE_URL in your .env file"
    exit 1
fi

echo -e "${BLUE}🔗 Database URL: ${DATABASE_URL%%@*}@***${NC}"
echo ""

# Confirm before proceeding
read -p "⚠️  This will run migrations on the production database. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

cd apps/backend

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Running Database Migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generate Prisma Client
echo -e "${BLUE}1. Generating Prisma Client...${NC}"
npx prisma generate
echo -e "${GREEN}✅ Prisma Client generated${NC}"

# Run migrations
echo ""
echo -e "${BLUE}2. Running migrations...${NC}"
npx prisma migrate deploy
echo -e "${GREEN}✅ Migrations completed${NC}"

# Verify connection
echo ""
echo -e "${BLUE}3. Verifying database connection...${NC}"
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection verified${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify connection (this is okay if migrations succeeded)${NC}"
fi

cd ../..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Migration Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "  1. Verify tables: npx prisma studio (opens at http://localhost:5555)"
echo "  2. Seed database (optional): cd apps/backend && npm run db:seed"
echo "  3. Test your application"
echo ""








