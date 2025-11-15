# VisaBuddy Environment Setup Script (PowerShell)
# This script helps set up environment variables for all services

Write-Host "🚀 VisaBuddy Environment Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Function to generate random string
function Generate-Secret {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return [Convert]::ToBase64String($bytes).Substring(0, 32)
}

# Check if .env file exists
function Test-EnvFile {
    param([string]$FilePath)
    
    if (Test-Path $FilePath) {
        Write-Host "⚠️  $FilePath already exists" -ForegroundColor Yellow
        $overwrite = Read-Host "Overwrite? (y/N)"
        if ($overwrite -ne "y" -and $overwrite -ne "Y") {
            return $false
        }
    }
    return $true
}

# Backend .env setup
function Setup-BackendEnv {
    Write-Host "📝 Setting up backend environment..." -ForegroundColor Cyan
    
    $envPath = "apps\backend\.env"
    if (Test-EnvFile -FilePath $envPath) {
        $jwtSecret = Generate-Secret
        $envContent = @"
# Server Configuration
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://visabuddy:changeme@localhost:5432/visabuddy

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=$jwtSecret

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
"@
        Set-Content -Path $envPath -Value $envContent
        Write-Host "✅ Backend .env created" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Skipping backend .env" -ForegroundColor Yellow
    }
}

# Frontend .env setup
function Setup-FrontendEnv {
    Write-Host "📝 Setting up frontend environment..." -ForegroundColor Cyan
    
    $envPath = "apps\frontend\.env"
    if (Test-EnvFile -FilePath $envPath) {
        $envContent = @"
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3000

# Google OAuth
# EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
"@
        Set-Content -Path $envPath -Value $envContent
        Write-Host "✅ Frontend .env created" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Skipping frontend .env" -ForegroundColor Yellow
    }
}

# AI Service .env setup
function Setup-AIServiceEnv {
    Write-Host "📝 Setting up AI service environment..." -ForegroundColor Cyan
    
    $envPath = "apps\ai-service\.env"
    if (Test-EnvFile -FilePath $envPath) {
        $envContent = @"
# OpenAI API Key (REQUIRED)
# OPENAI_API_KEY=sk-...

# AI Service URL (optional)
AI_SERVICE_URL=http://localhost:8001
"@
        Set-Content -Path $envPath -Value $envContent
        Write-Host "✅ AI service .env created" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Skipping AI service .env" -ForegroundColor Yellow
    }
}

# Main setup
Write-Host "This script will create .env files for all services." -ForegroundColor Yellow
Write-Host "You'll need to fill in the required values manually." -ForegroundColor Yellow
Write-Host ""
$continue = Read-Host "Continue? (Y/n)"
if ($continue -eq "n" -or $continue -eq "N") {
    Write-Host "Setup cancelled." -ForegroundColor Red
    exit 0
}

Setup-BackendEnv
Setup-FrontendEnv
Setup-AIServiceEnv

Write-Host ""
Write-Host "✅ Environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit the .env files and add your API keys"
Write-Host "2. See SETUP_GUIDE_COMPLETE.md for detailed instructions"
Write-Host "3. Run: npm run install-all"
Write-Host "4. Run: cd apps/backend && npm run db:migrate"









