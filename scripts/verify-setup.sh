#!/bin/bash

# ============================================================================
# VisaBuddy Setup Verification Script
# ============================================================================
# 
# Verifies that the environment is properly configured
# Usage: ./scripts/verify-setup.sh
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
echo "║     VisaBuddy Setup Verification                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

ERRORS=0
WARNINGS=0

# Function to check if command exists
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✅ $1 is installed${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 is not installed${NC}"
        ((ERRORS++))
        return 1
    fi
}

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ $1 exists${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $1 not found${NC}"
        ((WARNINGS++))
        return 1
    fi
}

# Function to check if directory exists
check_directory() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✅ $1 exists${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $1 not found${NC}"
        ((WARNINGS++))
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Checking Prerequisites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_command "node"
check_command "npm"
check_command "git"

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 20 ]; then
    echo -e "${GREEN}✅ Node.js version is 20+${NC}"
else
    echo -e "${RED}❌ Node.js version must be 20 or higher (current: $(node -v))${NC}"
    ((ERRORS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 Checking Project Structure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_directory "apps/backend"
check_directory "apps/frontend"
check_directory "apps/ai-service"
check_file "package.json"
check_file "docker-compose.yml"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Checking Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ Root node_modules exists${NC}"
else
    echo -e "${YELLOW}⚠️  Root node_modules not found - run: npm install${NC}"
    ((WARNINGS++))
fi

if [ -d "apps/backend/node_modules" ]; then
    echo -e "${GREEN}✅ Backend node_modules exists${NC}"
else
    echo -e "${YELLOW}⚠️  Backend node_modules not found - run: cd apps/backend && npm install${NC}"
    ((WARNINGS++))
fi

if [ -d "apps/frontend/node_modules" ]; then
    echo -e "${GREEN}✅ Frontend node_modules exists${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend node_modules not found - run: cd apps/frontend && npm install${NC}"
    ((WARNINGS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Checking Environment Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run validation script
if [ -f "scripts/validate-env.sh" ]; then
    echo "Running environment validation..."
    ./scripts/validate-env.sh all || ((WARNINGS++))
else
    echo -e "${YELLOW}⚠️  validate-env.sh not found${NC}"
    ((WARNINGS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Verification Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found (non-critical)${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) and $WARNINGS warning(s) found${NC}"
    echo ""
    echo "Please fix the errors above before proceeding."
    exit 1
fi








