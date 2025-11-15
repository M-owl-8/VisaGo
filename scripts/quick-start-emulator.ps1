# ============================================================================
# VisaBuddy - Quick Start Script for Emulator Testing
# ============================================================================
# This script automates the entire setup and start process for emulator testing

Write-Host ""
Write-Host "🚀 VisaBuddy Quick Start - Emulator Testing" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if command exists
function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Cyan

$missing = @()

if (-not (Test-Command "node")) {
    $missing += "Node.js (https://nodejs.org)"
}
if (-not (Test-Command "npm")) {
    $missing += "npm (comes with Node.js)"
}
if (-not (Test-Command "npx")) {
    $missing += "npx (comes with Node.js)"
}

if ($missing.Count -gt 0) {
    Write-Host "❌ Missing prerequisites:" -ForegroundColor Red
    foreach ($item in $missing) {
        Write-Host "   • $item" -ForegroundColor Yellow
    }
    exit 1
}

Write-Host "✅ All prerequisites found" -ForegroundColor Green
Write-Host ""

# Step 1: Environment Setup
Write-Host "📝 Step 1: Setting up environment..." -ForegroundColor Cyan
if (-not (Test-Path "apps\backend\.env")) {
    Write-Host "   Running environment setup..." -ForegroundColor Gray
    & "scripts\setup-emulator-env.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Environment setup failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ✅ Environment files already exist" -ForegroundColor Green
}

Write-Host ""

# Step 2: Install Dependencies
Write-Host "📦 Step 2: Installing dependencies..." -ForegroundColor Cyan
Write-Host "   This may take a few minutes..." -ForegroundColor Gray

# Root dependencies
if (Test-Path "package.json") {
    Write-Host "   Installing root dependencies..." -ForegroundColor Gray
    npm install
}

# Backend dependencies
if (Test-Path "apps\backend\package.json") {
    Write-Host "   Installing backend dependencies..." -ForegroundColor Gray
    Set-Location "apps\backend"
    npm install
    Set-Location ..\..
}

# Frontend dependencies
if (Test-Path "apps\frontend\package.json") {
    Write-Host "   Installing frontend dependencies..." -ForegroundColor Gray
    Set-Location "apps\frontend"
    npm install
    Set-Location ..\..
}

Write-Host "   ✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 3: Database Setup
Write-Host "🗄️  Step 3: Setting up database..." -ForegroundColor Cyan
if (-not (Test-Path "apps\backend\prisma\dev.db")) {
    Write-Host "   Running database setup..." -ForegroundColor Gray
    & "scripts\setup-database.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Database setup failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ✅ Database already exists" -ForegroundColor Green
}

Write-Host ""

# Step 4: Verification
Write-Host "✅ Step 4: Verifying setup..." -ForegroundColor Cyan

$allGood = $true

if (-not (Test-Path "apps\backend\.env")) {
    Write-Host "   ❌ Backend .env missing" -ForegroundColor Red
    $allGood = $false
} else {
    Write-Host "   ✅ Backend .env exists" -ForegroundColor Green
}

if (-not (Test-Path "apps\frontend\.env")) {
    Write-Host "   ⚠️  Frontend .env missing (will use defaults)" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ Frontend .env exists" -ForegroundColor Green
}

if (-not (Test-Path "apps\backend\prisma\dev.db")) {
    Write-Host "   ❌ Database file missing" -ForegroundColor Red
    $allGood = $false
} else {
    Write-Host "   ✅ Database file exists" -ForegroundColor Green
}

if (-not $allGood) {
    Write-Host ""
    Write-Host "❌ Setup incomplete. Please fix the issues above." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 5: Start Instructions
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Start Backend Server (in a new terminal):" -ForegroundColor White
Write-Host "   cd apps\backend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Start Frontend Metro (in another new terminal):" -ForegroundColor White
Write-Host "   cd apps\frontend" -ForegroundColor Gray
Write-Host "   npm run metro" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Build and Run on Emulator (in another new terminal):" -ForegroundColor White
Write-Host "   cd apps\frontend" -ForegroundColor Gray
Write-Host "   npm run android" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Cyan
Write-Host "   • Make sure Android emulator is running before step 3" -ForegroundColor Gray
Write-Host "   • Backend will run on http://localhost:3000" -ForegroundColor Gray
Write-Host "   • Frontend will connect via http://10.0.2.2:3000 (emulator localhost)" -ForegroundColor Gray
Write-Host "   • First build may take 10-20 minutes" -ForegroundColor Gray
Write-Host ""

