# ============================================================================
# VisaBuddy Railway Deployment Script (PowerShell)
# ============================================================================
# 
# Helps deploy VisaBuddy to Railway platform
# Usage: .\scripts\deploy-railway.ps1
#
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     VisaBuddy Railway Deployment Guide                            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will guide you through deploying to Railway." -ForegroundColor Cyan
Write-Host "Make sure you have:" -ForegroundColor Yellow
Write-Host "  1. Railway account (https://railway.app)"
Write-Host "  2. Railway CLI installed (npm i -g @railway/cli)"
Write-Host "  3. All environment variables ready"
Write-Host ""
$continue = Read-Host "Continue? (Y/n)"
if ($continue -eq "n" -or $continue -eq "N") {
    exit 0
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "📋 Railway Deployment Steps"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

# Check if Railway CLI is installed
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Railway CLI not found" -ForegroundColor Yellow
    Write-Host "Installing Railway CLI..."
    npm install -g @railway/cli
}

Write-Host "✅ Railway CLI found" -ForegroundColor Green
Write-Host ""

Write-Host "Step 1: Login to Railway"
Write-Host "  Run: railway login"
Write-Host ""

Write-Host "Step 2: Create New Project"
Write-Host "  Run: railway init"
Write-Host "  Or create project in Railway dashboard"
Write-Host ""

Write-Host "Step 3: Add Services"
Write-Host "  In Railway dashboard:"
Write-Host "  - Add PostgreSQL database"
Write-Host "  - Add Redis (optional but recommended)"
Write-Host "  - Add Backend service (connect to GitHub repo or upload)"
Write-Host "  - Add AI Service (if deploying separately)"
Write-Host ""

Write-Host "Step 4: Set Environment Variables"
Write-Host "  In Railway dashboard, add all variables from .env.production:"
Write-Host "  - DATABASE_URL (from PostgreSQL service)"
Write-Host "  - REDIS_URL (from Redis service, if added)"
Write-Host "  - JWT_SECRET"
Write-Host "  - CORS_ORIGIN"
Write-Host "  - OPENAI_API_KEY"
Write-Host "  - GOOGLE_CLIENT_ID"
Write-Host "  - GOOGLE_CLIENT_SECRET"
Write-Host "  - And all other required variables"
Write-Host ""

Write-Host "Step 5: Deploy"
Write-Host "  Railway will automatically deploy on git push"
Write-Host "  Or use: railway up"
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "📚 Railway Configuration"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

Write-Host "The railway.json file is already configured with:"
Write-Host "  - Backend service"
Write-Host "  - AI Service"
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "✅ Setup Complete!"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Follow the steps above"
Write-Host "  2. See docs/DEPLOYMENT_GUIDE.md for detailed instructions"
Write-Host "  3. Monitor deployment in Railway dashboard"
Write-Host ""








