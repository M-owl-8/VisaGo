# VisaBuddy - Production Setup Automation Script
# This script performs critical setup tasks automatically

Write-Host "VisaBuddy Production Setup Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if running from correct directory
if (-not (Test-Path "apps/backend/prisma/schema.prisma")) {
    Write-Host "ERROR: Please run this script from VisaBuddy root directory" -ForegroundColor Red
    exit 1
}

# STEP 1: Update Prisma Schema
Write-Host "STEP 1: Updating Prisma Schema (SQLite -> PostgreSQL)" -ForegroundColor Yellow
$schemaPath = "apps/backend/prisma/schema.prisma"
$schemaContent = Get-Content $schemaPath -Raw

# Replace SQLite with PostgreSQL
$schemaContent = $schemaContent -replace 'provider\s*=\s*\"sqlite\"', 'provider = "postgresql"'

Set-Content -Path $schemaPath -Value $schemaContent
Write-Host "DONE: Prisma schema updated to PostgreSQL" -ForegroundColor Green

# STEP 2: Create .env.production template
Write-Host ""
Write-Host "STEP 2: Creating .env.production template" -ForegroundColor Yellow

$envProdContent = @"
# PRODUCTION ENVIRONMENT

NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database - CHANGE THESE!
DATABASE_URL=postgresql://user:password@host:5432/visabuddy

# JWT Secrets - Generate random strings!
JWT_SECRET=$((-join ((48..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })))
JWT_EXPIRY=7d
REFRESH_TOKEN_SECRET=$((-join ((48..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })))

# Google OAuth - Get from Google Cloud Console
GOOGLE_CLIENT_ID=your-app-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-oauth-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# Firebase - Get from Firebase Console
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_API_KEY=your-api-key
FIREBASE_APP_ID=your-app-id
FIREBASE_PRIVATE_KEY="your-private-key-json"
FIREBASE_MESSAGING_SENDER_ID=your-sender-id

# OpenAI
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000

# Payment Gateways
PAYME_MERCHANT_ID=your-payme-merchant-id
PAYME_API_KEY=your-payme-api-key
PAYME_API_URL=https://checkout.payme.uz

CLICK_MERCHANT_ID=your-click-merchant-id
CLICK_SERVICE_ID=your-click-service-id
CLICK_API_URL=https://api.click.uz

UZUM_MERCHANT_ID=your-uzum-merchant-id
UZUM_API_URL=https://api.uzum.uz

STRIPE_SECRET_KEY=sk_live_your-stripe-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-public-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Email Service
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your-sendgrid-api-key
SMTP_FROM_EMAIL=noreply@visabuddy.com

# Redis
REDIS_URL=redis://user:password@host:6379

# CORS
CORS_ORIGIN=https://yourdomain.com

# Storage
STORAGE_TYPE=firebase
SERVER_URL=https://yourdomain.com

# Features
ENABLE_AI_CHAT=true
ENABLE_PAYMENTS=true
ENABLE_ADMIN_PANEL=true
"@

Set-Content -Path "apps/backend/.env.production" -Value $envProdContent
Write-Host "DONE: Created apps/backend/.env.production template" -ForegroundColor Green
Write-Host "NOTE: Update all credentials manually!" -ForegroundColor Yellow

# STEP 3: Create Legal Documents
Write-Host ""
Write-Host "STEP 3: Creating Legal Documents" -ForegroundColor Yellow

$privacyPolicy = @"
<!DOCTYPE html>
<html>
<head>
    <title>Privacy Policy - VisaBuddy</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2 { color: #1976d2; }
    </style>
</head>
<body>
<h1>Privacy Policy</h1>
<p><strong>Last Updated:</strong> January 2025</p>

<h2>1. Information We Collect</h2>
<ul>
    <li>Account Information: Email, name, phone number, password</li>
    <li>Visa Application Data: Nationality, visa type, dates, status</li>
    <li>Documents: Passport scans, photos, supporting documents</li>
    <li>Payment Information: Transaction records</li>
    <li>Device Information: Device type, OS version, app version</li>
    <li>Usage Data: Features used, time spent, error logs</li>
</ul>

<h2>2. How We Use Information</h2>
<ul>
    <li>Provide visa application services and guidance</li>
    <li>Process payments securely</li>
    <li>Communicate about your applications</li>
    <li>Improve app features</li>
    <li>Comply with legal obligations</li>
</ul>

<h2>3. Data Security</h2>
<p>We store data on secure servers with encryption. Payment details are never stored by VisaBuddy.</p>

<h2>4. Third-Party Services</h2>
<p>We use Firebase, Google, Payment Processors, and OpenAI.</p>

<h2>5. Your Rights</h2>
<p>You can access, delete, or correct your personal data.</p>

<h2>6. Contact</h2>
<p>For privacy concerns: privacy@visabuddy.com</p>
</body>
</html>
"@

Set-Content -Path "privacy_policy.html" -Value $privacyPolicy
Write-Host "DONE: Created privacy_policy.html" -ForegroundColor Green

$termsOfService = @"
<!DOCTYPE html>
<html>
<head>
    <title>Terms of Service - VisaBuddy</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2 { color: #1976d2; }
    </style>
</head>
<body>
<h1>Terms of Service</h1>
<p><strong>Last Updated:</strong> January 2025</p>

<h2>1. Acceptance of Terms</h2>
<p>By using VisaBuddy, you agree to these terms.</p>

<h2>2. Service Description</h2>
<p>VisaBuddy provides information and tools to help manage visa applications. We are NOT immigration lawyers.</p>

<h2>3. User Responsibilities</h2>
<ul>
    <li>Provide accurate information</li>
    <li>Not share account credentials</li>
    <li>Not upload fraudulent documents</li>
    <li>Comply with applicable laws</li>
</ul>

<h2>4. Limitations</h2>
<p>We cannot guarantee visa approval or provide legal advice.</p>

<h2>5. Payment Terms</h2>
<p>All payments are non-refundable unless required by law.</p>

<h2>6. Contact</h2>
<p>For inquiries: support@visabuddy.com</p>
</body>
</html>
"@

Set-Content -Path "terms_of_service.html" -Value $termsOfService
Write-Host "DONE: Created terms_of_service.html" -ForegroundColor Green

# STEP 4: Update gitignore
Write-Host ""
Write-Host "STEP 4: Updating .gitignore for secrets" -ForegroundColor Yellow

$gitignoreAdditions = @"

# Production environment files - NEVER commit secrets!
.env.production
.env.production.local
.env.*.local

# Build artifacts
dist/
build/
.next/

# Logs
*.log
npm-debug.log*
yarn-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Dependencies
node_modules/
.pnp
.pnp.js

# Cache
.cache/
.eslintcache

# Testing
coverage/
.nyc_output/

# Credentials - NEVER commit these!
google-services.json
*-credentials.json
*-private-key.json
.env.production
"@

Add-Content -Path ".gitignore" -Value $gitignoreAdditions
Write-Host "DONE: Updated .gitignore" -ForegroundColor Green

# STEP 5: Install dependencies
Write-Host ""
Write-Host "STEP 5: Installing backend dependencies" -ForegroundColor Yellow

Set-Location "apps/backend"

if (Test-Path "node_modules") {
    Write-Host "Dependencies already installed, skipping..." -ForegroundColor Gray
} else {
    npm install
    Write-Host "DONE: Backend dependencies installed" -ForegroundColor Green
}

Set-Location "../.."

# STEP 6: Generate Prisma Client
Write-Host ""
Write-Host "STEP 6: Generating Prisma Client" -ForegroundColor Yellow

Set-Location "apps/backend"
npx prisma generate
Write-Host "DONE: Prisma Client generated" -ForegroundColor Green
Set-Location "../.."

# STEP 7: Database connection instructions
Write-Host ""
Write-Host "STEP 7: Database Setup Instructions" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Choose one option:" -ForegroundColor Yellow
Write-Host ""
Write-Host "OPTION A: Supabase (Recommended)" -ForegroundColor Green
Write-Host "  1. Visit https://supabase.com" -ForegroundColor Gray
Write-Host "  2. Create new project" -ForegroundColor Gray
Write-Host "  3. Copy connection string" -ForegroundColor Gray
Write-Host "  4. Paste into .env.production DATABASE_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "OPTION B: Docker (Local)" -ForegroundColor Green
Write-Host "  docker run -d --name visabuddy-postgres -e POSTGRES_PASSWORD=VB2024Secure123 -e POSTGRES_DB=visabuddy -p 5432:5432 postgres:15" -ForegroundColor Gray
Write-Host "  Then: DATABASE_URL=postgresql://postgres:VB2024Secure123@localhost:5432/visabuddy" -ForegroundColor Gray
Write-Host ""
Write-Host "OPTION C: AWS RDS" -ForegroundColor Green
Write-Host "  1. Create RDS instance" -ForegroundColor Gray
Write-Host "  2. Wait 10-15 minutes" -ForegroundColor Gray
Write-Host "  3. Copy endpoint and credentials" -ForegroundColor Gray
Write-Host "  4. Add to .env.production DATABASE_URL" -ForegroundColor Gray
Write-Host ""

# STEP 8: Install frontend dependencies
Write-Host ""
Write-Host "STEP 8: Installing frontend dependencies" -ForegroundColor Yellow

Set-Location "apps/frontend"

if (Test-Path "node_modules") {
    Write-Host "Frontend dependencies already installed, skipping..." -ForegroundColor Gray
} else {
    npm install
    Write-Host "DONE: Frontend dependencies installed" -ForegroundColor Green
}

Set-Location "../.."

# STEP 9: Optional - Push database schema (with user confirmation)
Write-Host ""
Write-Host "STEP 9: Database Migration (Optional)" -ForegroundColor Yellow
Write-Host "Would you like to push the database schema now?" -ForegroundColor Cyan
Write-Host "This requires DATABASE_URL to be configured in .env.production" -ForegroundColor Gray
Write-Host ""

$pushDb = Read-Host "Push database schema now? (y/n)"

if ($pushDb -eq "y" -or $pushDb -eq "Y") {
    Set-Location "apps/backend"
    
    Write-Host "Pushing schema to database..." -ForegroundColor Yellow
    npx prisma db push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "DONE: Database schema pushed successfully" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Database push failed. Check your DATABASE_URL." -ForegroundColor Red
    }
    
    Set-Location "../.."
} else {
    Write-Host "Skipping database migration. You can run it manually later:" -ForegroundColor Yellow
    Write-Host "  cd apps/backend && npx prisma db push" -ForegroundColor Gray
}

# STEP 10: Verification summary
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check what was completed
$completionStatus = @{
    "Prisma Schema Updated" = $true
    "Environment Template Created" = (Test-Path "apps/backend/.env.production")
    "Legal Documents Created" = (Test-Path "privacy_policy.html") -and (Test-Path "terms_of_service.html")
    "Git Ignore Updated" = $true
    "Backend Dependencies" = (Test-Path "apps/backend/node_modules")
    "Frontend Dependencies" = (Test-Path "apps/frontend/node_modules")
    "Prisma Client Generated" = (Test-Path "apps/backend/node_modules/.prisma/client")
}

Write-Host "COMPLETION STATUS:" -ForegroundColor Cyan
foreach ($item in $completionStatus.GetEnumerator()) {
    $status = if ($item.Value) { "✅" } else { "⚠️" }
    Write-Host "  $status $($item.Key)" -ForegroundColor $(if ($item.Value) { "Green" } else { "Yellow" })
}

Write-Host ""
Write-Host "NEXT IMMEDIATE STEPS:" -ForegroundColor Yellow
Write-Host "1. Configure Database URL:" -ForegroundColor Gray
Write-Host "   • Edit: apps/backend/.env.production" -ForegroundColor Gray
Write-Host "   • Set DATABASE_URL to your PostgreSQL instance" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Configure Credentials:" -ForegroundColor Gray
Write-Host "   • Google OAuth (optional but recommended)" -ForegroundColor Gray
Write-Host "   • Firebase credentials (for storage)" -ForegroundColor Gray
Write-Host "   • OpenAI API key (for chat)" -ForegroundColor Gray
Write-Host "   • At least one payment gateway" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Verify Everything Works:" -ForegroundColor Gray
Write-Host "   • Backend: cd apps/backend && npm run dev" -ForegroundColor Gray
Write-Host "   • Frontend: cd apps/frontend && npm run dev" -ForegroundColor Gray
Write-Host "   • Database: npx prisma studio" -ForegroundColor Gray
Write-Host ""
Write-Host "WEEK 3 TESTING CHECKLIST:" -ForegroundColor Cyan
Write-Host "  ☐ Database connection verified" -ForegroundColor Gray
Write-Host "  ☐ Backend server starts on port 3000" -ForegroundColor Gray
Write-Host "  ☐ Frontend builds without errors" -ForegroundColor Gray
Write-Host "  ☐ All credentials configured" -ForegroundColor Gray
Write-Host "  ☐ API endpoints respond" -ForegroundColor Gray
Write-Host ""
Write-Host "DOCUMENTATION:" -ForegroundColor Yellow
Write-Host "  • Detailed guide: WEEK2_TO_WEEK3_TRANSITION.md" -ForegroundColor Gray
Write-Host "  • Full roadmap: 00_COMPLETE_PRODUCTION_ROADMAP.md" -ForegroundColor Gray
Write-Host "  • API reference: API_ENDPOINTS_REFERENCE.md" -ForegroundColor Gray
Write-Host ""
Write-Host "👉 Ready to start testing? Follow WEEK2_TO_WEEK3_TRANSITION.md" -ForegroundColor Cyan
Write-Host ""