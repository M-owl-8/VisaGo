#!/usr/bin/env pwsh
# =============================================================================
# VisaBuddy - Fix JavaScript Bundle Loading Error
# =============================================================================

Write-Host "🔧 VisaBuddy - Fixing JavaScript Bundle Error" -ForegroundColor Cyan
Write-Host "==========================================`n" -ForegroundColor Cyan

$ProjectRoot = "c:\work\VisaBuddy"
$FrontendDir = "$ProjectRoot\apps\frontend"
$BackendDir = "$ProjectRoot\apps\backend"

# =============================================================================
# STEP 1: Kill all Node processes
# =============================================================================

Write-Host "Step 1️⃣: Stopping all Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "✅ All Node processes stopped`n" -ForegroundColor Green

# =============================================================================
# STEP 2: Clear Metro cache
# =============================================================================

Write-Host "Step 2️⃣: Clearing Metro bundler cache..." -ForegroundColor Yellow
$metroCachePath = "$env:LOCALAPPDATA\.metro"
if (Test-Path $metroCachePath) {
    Remove-Item -Recurse -Force -Path $metroCachePath -ErrorAction SilentlyContinue
    Write-Host "✅ Metro cache cleared`n" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Metro cache doesn't exist (that's fine)`n" -ForegroundColor Cyan
}

# =============================================================================
# STEP 3: Clean frontend node_modules
# =============================================================================

Write-Host "Step 3️⃣: Clearing frontend node_modules..." -ForegroundColor Yellow
Set-Location $FrontendDir

$nodeModulesPath = "$FrontendDir\node_modules"
if (Test-Path $nodeModulesPath) {
    Write-Host "Removing $nodeModulesPath..." -ForegroundColor Gray
    Remove-Item -Recurse -Force -Path $nodeModulesPath -ErrorAction SilentlyContinue
}

if (Test-Path "$FrontendDir\package-lock.json") {
    Remove-Item -Force -Path "$FrontendDir\package-lock.json" -ErrorAction SilentlyContinue
}

Write-Host "✅ Frontend cleaned`n" -ForegroundColor Green

# =============================================================================
# STEP 4: Reinstall frontend dependencies
# =============================================================================

Write-Host "Step 4️⃣: Installing frontend dependencies..." -ForegroundColor Yellow
Write-Host "This may take 2-3 minutes..." -ForegroundColor Gray
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed`n" -ForegroundColor Green

# =============================================================================
# STEP 5: Verify backend is running
# =============================================================================

Write-Host "Step 5️⃣: Checking backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -ErrorAction Stop -TimeoutSec 3
    Write-Host "✅ Backend is running on http://localhost:3000`n" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend is NOT running!" -ForegroundColor Yellow
    Write-Host "Please start backend first with: npm run dev in $BackendDir`n" -ForegroundColor Yellow
}

# =============================================================================
# STEP 6: Start Expo development server
# =============================================================================

Write-Host "Step 6️⃣: Starting Expo development server..." -ForegroundColor Yellow
Set-Location $FrontendDir

Write-Host "ℹ️  The server will start in this terminal" -ForegroundColor Cyan
Write-Host "Watch for '[Loaded dev server at ...]' message`n" -ForegroundColor Cyan

Write-Host "📱 On emulator, press R R to reload the app`n" -ForegroundColor Yellow

# Start Expo server
npx expo start --android --reset-cache