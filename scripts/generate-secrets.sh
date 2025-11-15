#!/bin/bash

# ============================================================================
# Generate Secure Secrets for VisaBuddy
# ============================================================================
# 
# This script generates secure random secrets for JWT and other uses
#
# Usage:
#   ./scripts/generate-secrets.sh
#
# ============================================================================

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║     VisaBuddy Secret Generation                                   ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Check if openssl is available
if command -v openssl &> /dev/null; then
    echo "🔐 Generating secure secrets using OpenSSL..."
    echo ""
    
    JWT_SECRET=$(openssl rand -base64 32 | tr -d '\n')
    
    echo "JWT_SECRET (32+ characters, base64):"
    echo "$JWT_SECRET"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 Add this to your apps/backend/.env file:"
    echo ""
    echo "JWT_SECRET=$JWT_SECRET"
    echo ""
    echo "⚠️  IMPORTANT:"
    echo "   - Never share this secret"
    echo "   - Never commit it to git"
    echo "   - Store it securely"
    echo "   - Rotate it every 90 days"
    echo ""
    
elif command -v node &> /dev/null; then
    echo "🔐 Generating secure secrets using Node.js..."
    echo ""
    
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    echo "JWT_SECRET (64 hex characters):"
    echo "$JWT_SECRET"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 Add this to your apps/backend/.env file:"
    echo ""
    echo "JWT_SECRET=$JWT_SECRET"
    echo ""
    echo "⚠️  IMPORTANT:"
    echo "   - Never share this secret"
    echo "   - Never commit it to git"
    echo "   - Store it securely"
    echo "   - Rotate it every 90 days"
    echo ""
else
    echo "❌ ERROR: Neither OpenSSL nor Node.js is available"
    echo ""
    echo "Please install one of the following:"
    echo "  - OpenSSL: https://www.openssl.org/"
    echo "  - Node.js: https://nodejs.org/"
    echo ""
    echo "Or generate manually using:"
    echo "  - Online: https://randomkeygen.com/"
    echo "  - Python: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
    echo ""
    exit 1
fi








