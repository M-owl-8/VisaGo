# ============================================================================
# VisaBuddy Production Environment Setup Script (PowerShell)
# ============================================================================
# 
# This script sets up production environment with security best practices
# Usage: .\scripts\setup-production.ps1
#
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     VisaBuddy Production Environment Setup                       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Function to generate secure secret
function Generate-Secret {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return [Convert]::ToBase64String($bytes).Substring(0, 32)
}

# Function to prompt for required value
function Get-RequiredInput {
    param(
        [string]$Prompt,
        [string]$Default = ""
    )
    
    while ($true) {
        if ($Default) {
            $value = Read-Host "$Prompt [$Default]"
            $value = if ($value) { $value } else { $Default }
        } else {
            $value = Read-Host $Prompt
        }
        
        if ($value) {
            return $value
        } else {
            Write-Host "❌ This field is required!" -ForegroundColor Red
        }
    }
}

# Function to prompt for optional value
function Get-OptionalInput {
    param(
        [string]$Prompt,
        [string]$Default = ""
    )
    
    $value = Read-Host "$Prompt$(if ($Default) { " [$Default]" })"
    return if ($value) { $value } else { $Default }
}

Write-Host "This script will help you set up production environment variables." -ForegroundColor Cyan
Write-Host "⚠️  Make sure you have all your API keys and credentials ready." -ForegroundColor Yellow
Write-Host ""
$continue = Read-Host "Continue? (Y/n)"
if ($continue -eq "n" -or $continue -eq "N") {
    Write-Host "Setup cancelled." -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "📋 Collecting Production Configuration"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

# Server Configuration
Write-Host "Server Configuration" -ForegroundColor Cyan
$NODE_ENV = "production"
$PORT = Get-OptionalInput "Port" "3000"

# Database
Write-Host ""
Write-Host "Database Configuration" -ForegroundColor Cyan
$DATABASE_URL = Get-RequiredInput "Database URL (postgresql://user:pass@host:port/db)"

# JWT Secret
Write-Host ""
Write-Host "Security" -ForegroundColor Cyan
$JWT_SECRET = Generate-Secret
Write-Host "✅ Generated secure JWT secret" -ForegroundColor Green

# CORS
Write-Host ""
$CORS_ORIGIN = Get-RequiredInput "CORS Origins (comma-separated, e.g., https://app.visabuddy.com)"

# Redis
Write-Host ""
Write-Host "Redis (Optional but Recommended)" -ForegroundColor Cyan
$REDIS_URL = Get-OptionalInput "Redis URL" ""

# Storage
Write-Host ""
Write-Host "Storage Configuration" -ForegroundColor Cyan
$STORAGE_TYPE = Get-OptionalInput "Storage Type (local/firebase)" "local"
if ($STORAGE_TYPE -eq "firebase") {
    $FIREBASE_PROJECT_ID = Get-RequiredInput "Firebase Project ID"
    $FIREBASE_PRIVATE_KEY = Get-RequiredInput "Firebase Private Key"
    $FIREBASE_CLIENT_EMAIL = Get-RequiredInput "Firebase Client Email"
}

# OpenAI
Write-Host ""
Write-Host "OpenAI (Required for AI Chat)" -ForegroundColor Cyan
$OPENAI_API_KEY = Get-OptionalInput "OpenAI API Key" ""

# Google OAuth
Write-Host ""
Write-Host "Google OAuth (Required for Authentication)" -ForegroundColor Cyan
$GOOGLE_CLIENT_ID = Get-OptionalInput "Google Client ID" ""
$GOOGLE_CLIENT_SECRET = Get-OptionalInput "Google Client Secret" ""

# Payment Gateways
Write-Host ""
Write-Host "Payment Gateways (At least one required)" -ForegroundColor Cyan
$STRIPE_SECRET_KEY = Get-OptionalInput "Stripe Secret Key" ""
$STRIPE_WEBHOOK_SECRET = Get-OptionalInput "Stripe Webhook Secret" ""
$PAYME_MERCHANT_ID = Get-OptionalInput "Payme Merchant ID" ""
$PAYME_API_KEY = Get-OptionalInput "Payme API Key" ""

# Email
Write-Host ""
Write-Host "Email Service" -ForegroundColor Cyan
$SENDGRID_API_KEY = Get-OptionalInput "SendGrid API Key" ""
if (-not $SENDGRID_API_KEY) {
    $SMTP_HOST = Get-OptionalInput "SMTP Host" ""
    $SMTP_PORT = Get-OptionalInput "SMTP Port" "587"
    $SMTP_USER = Get-OptionalInput "SMTP User" ""
    $SMTP_PASS = Get-OptionalInput "SMTP Password" ""
}

# Frontend URL
Write-Host ""
$FRONTEND_URL = Get-OptionalInput "Frontend URL" ""

# Create .env file
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "📝 Creating Production .env File"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

$ENV_FILE = "apps\backend\.env.production"

if (Test-Path $ENV_FILE) {
    Write-Host "⚠️  $ENV_FILE already exists" -ForegroundColor Yellow
    $overwrite = Read-Host "Overwrite? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Setup cancelled." -ForegroundColor Red
        exit 0
    }
}

$envContent = @"
# ============================================================================
# VisaBuddy Production Environment Variables
# ============================================================================
# Generated: $(Get-Date)
# ⚠️  NEVER commit this file to git!
# ============================================================================

# Server Configuration
NODE_ENV=$NODE_ENV
PORT=$PORT

# Database
DATABASE_URL=$DATABASE_URL

# JWT Secret (Auto-generated)
JWT_SECRET=$JWT_SECRET

# CORS
CORS_ORIGIN=$CORS_ORIGIN

# Redis
$(if ($REDIS_URL) { "REDIS_URL=$REDIS_URL" })

# Storage
STORAGE_TYPE=$STORAGE_TYPE
$(if ($STORAGE_TYPE) { "LOCAL_STORAGE_PATH=uploads" })

# Firebase
$(if ($FIREBASE_PROJECT_ID) { "FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID" })
$(if ($FIREBASE_PRIVATE_KEY) { "FIREBASE_PRIVATE_KEY=$FIREBASE_PRIVATE_KEY" })
$(if ($FIREBASE_CLIENT_EMAIL) { "FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL" })

# OpenAI
$(if ($OPENAI_API_KEY) { "OPENAI_API_KEY=$OPENAI_API_KEY" })

# Google OAuth
$(if ($GOOGLE_CLIENT_ID) { "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" })
$(if ($GOOGLE_CLIENT_SECRET) { "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" })

# Payment Gateways
$(if ($STRIPE_SECRET_KEY) { "STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY" })
$(if ($STRIPE_WEBHOOK_SECRET) { "STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET" })
$(if ($PAYME_MERCHANT_ID) { "PAYME_MERCHANT_ID=$PAYME_MERCHANT_ID" })
$(if ($PAYME_API_KEY) { "PAYME_API_KEY=$PAYME_API_KEY" })

# Email Service
$(if ($SENDGRID_API_KEY) { "SENDGRID_API_KEY=$SENDGRID_API_KEY" })
$(if ($SMTP_HOST) { "SMTP_HOST=$SMTP_HOST" })
$(if ($SMTP_PORT) { "SMTP_PORT=$SMTP_PORT" })
$(if ($SMTP_USER) { "SMTP_USER=$SMTP_USER" })
$(if ($SMTP_PASS) { "SMTP_PASS=$SMTP_PASS" })

# Frontend URL
$(if ($FRONTEND_URL) { "FRONTEND_URL=$FRONTEND_URL" })

# Feature Flags
ENABLE_RECONCILIATION=true
ENABLE_MOCK_PAYMENTS=false
"@

Set-Content -Path $ENV_FILE -Value $envContent

Write-Host "✅ Production .env file created: $ENV_FILE" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "✅ Setup Complete!"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""
Write-Host "⚠️  IMPORTANT SECURITY NOTES:" -ForegroundColor Yellow
Write-Host "   1. The .env.production file contains sensitive data"
Write-Host "   2. NEVER commit it to git (it's in .gitignore)"
Write-Host "   3. Store it securely in your deployment platform"
Write-Host "   4. Rotate secrets every 90 days"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Review the .env.production file"
Write-Host "   2. Validate configuration: .\scripts\validate-env.ps1 backend"
Write-Host "   3. Test database connection"
Write-Host "   4. Deploy to your platform (Railway, Heroku, AWS, etc.)"
Write-Host "   5. Set environment variables in your platform dashboard"
Write-Host ""








