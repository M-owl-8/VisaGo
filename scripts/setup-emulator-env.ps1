# ============================================================================
# VisaBuddy - Emulator Environment Setup Script
# ============================================================================
# This script sets up environment variables optimized for Android emulator testing
# Uses SQLite for database (no PostgreSQL required) and emulator-friendly URLs

Write-Host ""
Write-Host "🚀 VisaBuddy Emulator Environment Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Function to generate secure random string
function Generate-SecureSecret {
    param([int]$Length = 64)
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    $random = New-Object System.Random
    $secret = ""
    for ($i = 0; $i -lt $Length; $i++) {
        $secret += $chars[$random.Next(0, $chars.Length)]
    }
    return $secret
}

# Function to check if file exists and prompt
function Test-AndCreateEnv {
    param(
        [string]$FilePath,
        [string]$Content,
        [string]$ServiceName
    )
    
    if (Test-Path $FilePath) {
        Write-Host "⚠️  $ServiceName .env already exists" -ForegroundColor Yellow
        $overwrite = Read-Host "Overwrite? (y/N)"
        if ($overwrite -ne "y" -and $overwrite -ne "Y") {
            Write-Host "⏭️  Skipping $ServiceName .env" -ForegroundColor Yellow
            return $false
        }
    }
    
    Set-Content -Path $FilePath -Value $Content -Encoding UTF8
    Write-Host "✅ $ServiceName .env created" -ForegroundColor Green
    return $true
}

Write-Host "This script will create .env files optimized for emulator testing:" -ForegroundColor Yellow
Write-Host "  • Backend: SQLite database (no PostgreSQL needed)" -ForegroundColor Gray
Write-Host "  • Frontend: API URL configured for Android emulator (10.0.2.2)" -ForegroundColor Gray
Write-Host "  • All secrets auto-generated" -ForegroundColor Gray
Write-Host ""
$continue = Read-Host "Continue? (Y/n)"
if ($continue -eq "n" -or $continue -eq "N") {
    Write-Host "Setup cancelled." -ForegroundColor Red
    exit 0
}

# Generate secrets
Write-Host ""
Write-Host "🔐 Generating secure secrets..." -ForegroundColor Cyan
$jwtSecret = Generate-SecureSecret -Length 64
$refreshSecret = Generate-SecureSecret -Length 64

# ============================================================================
# BACKEND .ENV (SQLite for emulator testing)
# ============================================================================
Write-Host ""
Write-Host "📝 Setting up backend environment..." -ForegroundColor Cyan

$backendEnvPath = "apps\backend\.env"
$backendEnvContent = @"
# ============================================================================
# VisaBuddy Backend - Emulator Configuration
# ============================================================================
# This configuration is optimized for Android emulator testing
# Uses SQLite database (no PostgreSQL required)

# Server Configuration
NODE_ENV=development
PORT=3000

# Database - SQLite (perfect for emulator testing, no setup required)
DATABASE_URL=file:./prisma/dev.db

# JWT Secrets (auto-generated, secure)
JWT_SECRET=$jwtSecret
REFRESH_TOKEN_SECRET=$refreshSecret

# CORS - Allow emulator connections
CORS_ORIGIN=http://localhost:3000,http://localhost:19006,http://10.0.2.2:3000

# Redis (optional - not required for basic testing)
# REDIS_URL=redis://localhost:6379

# Storage - Local file storage (no Firebase needed for testing)
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=uploads

# Firebase (optional - only if you need Firebase Storage)
# FIREBASE_PROJECT_ID=
# FIREBASE_PRIVATE_KEY=
# FIREBASE_CLIENT_EMAIL=

# OpenAI (optional - only if you want AI chat features)
# OPENAI_API_KEY=sk-...

# Google OAuth (optional - can test without it)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=

# Payment Gateways (optional - can test without them)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# PAYME_MERCHANT_ID=
# PAYME_API_KEY=
# CLICK_MERCHANT_ID=
# CLICK_API_KEY=
# UZUM_MERCHANT_ID=
# UZUM_API_KEY=

# Email Service (optional - password reset will log to console if not configured)
# SENDGRID_API_KEY=SG....
# OR
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=

# Frontend URL (for password reset links, etc.)
FRONTEND_URL=http://localhost:19006

# Logging
LOG_LEVEL=INFO
LOG_FILE_ENABLED=false
"@

Test-AndCreateEnv -FilePath $backendEnvPath -Content $backendEnvContent -ServiceName "Backend"

# ============================================================================
# FRONTEND .ENV (Emulator-optimized)
# ============================================================================
Write-Host ""
Write-Host "📝 Setting up frontend environment..." -ForegroundColor Cyan

$frontendEnvPath = "apps\frontend\.env"
$frontendEnvContent = @"
# ============================================================================
# VisaBuddy Frontend - Emulator Configuration
# ============================================================================
# This configuration is optimized for Android emulator testing
# Uses 10.0.2.2 which is the emulator's alias for localhost

# API URL - Use 10.0.2.2 for Android emulator (this is localhost from emulator's perspective)
# For physical device: Use your computer's IP address (e.g., http://192.168.1.100:3000)
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000

# Google OAuth (optional - can test without it)
# Get from: https://console.cloud.google.com/apis/credentials
# EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
"@

Test-AndCreateEnv -FilePath $frontendEnvPath -Content $frontendEnvContent -ServiceName "Frontend"

# ============================================================================
# AI SERVICE .ENV (Optional)
# ============================================================================
Write-Host ""
Write-Host "📝 Setting up AI service environment..." -ForegroundColor Cyan

$aiServiceEnvPath = "apps\ai-service\.env"
$aiServiceEnvContent = @"
# ============================================================================
# VisaBuddy AI Service - Configuration
# ============================================================================
# Optional: Only needed if you want AI chat features

# OpenAI API Key (required for AI chat)
# OPENAI_API_KEY=sk-...

# CORS Origins
CORS_ORIGINS=http://localhost:3000,http://localhost:19006,http://10.0.2.2:3000

# Service Configuration
LOG_LEVEL=INFO
"@

Test-AndCreateEnv -FilePath $aiServiceEnvPath -Content $aiServiceEnvContent -ServiceName "AI Service"

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host ""
Write-Host "✅ Environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Initialize Database:" -ForegroundColor White
Write-Host "   cd apps\backend" -ForegroundColor Gray
Write-Host "   npm run db:migrate" -ForegroundColor Gray
Write-Host "   npm run db:seed  (optional)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Start Backend Server:" -ForegroundColor White
Write-Host "   cd apps\backend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start Frontend Metro:" -ForegroundColor White
Write-Host "   cd apps\frontend" -ForegroundColor Gray
Write-Host "   npm run metro" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Build and Run on Emulator:" -ForegroundColor White
Write-Host "   cd apps\frontend" -ForegroundColor Gray
Write-Host "   npm run android" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Cyan
Write-Host "   • Backend uses SQLite - no PostgreSQL setup needed!" -ForegroundColor Gray
Write-Host "   • API URL is configured for emulator (10.0.2.2)" -ForegroundColor Gray
Write-Host "   • All secrets are auto-generated and secure" -ForegroundColor Gray
Write-Host "   • Optional services (OAuth, Payments, AI) can be added later" -ForegroundColor Gray
Write-Host ""

