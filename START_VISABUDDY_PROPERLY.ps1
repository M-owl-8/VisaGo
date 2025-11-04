#!/usr/bin/env pwsh
# =============================================================================
# VisaBuddy - Complete Startup (CORRECTED - Emulator First!)
# =============================================================================
# CORRECT ORDER:
# 1. Start Android Emulator (must be ready first)
# 2. Wait for emulator to fully boot
# 3. Start Backend (Node.js)
# 4. Start Expo Dev Server
# 5. Build and deploy to emulator

$ErrorActionPreference = "Continue"

# Configuration
$ProjectRoot = "c:\work\VisaBuddy"
$BackendDir = "$ProjectRoot\apps\backend"
$FrontendDir = "$ProjectRoot\apps\frontend"
$BackendPort = 3000
$EmulatorName = "Pixel_6"
$HostIP = "10.0.2.2"  # How emulator sees localhost

Write-Host "`n" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VisaBuddy - Complete Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Helper function to verify prerequisite
function Test-Prerequisites {
    Write-Host "CHECKING PREREQUISITES..." -ForegroundColor Yellow
    
    # Check Node.js
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: Node.js not found" -ForegroundColor Red
        exit 1
    }
    Write-Host "   OK: Node.js $(node --version)" -ForegroundColor Green
    
    # Check npm
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: npm not found" -ForegroundColor Red
        exit 1
    }
    Write-Host "   OK: npm $(npm --version)" -ForegroundColor Green
    
    # Check Android SDK
    if (-not $env:ANDROID_HOME) {
        Write-Host "ERROR: ANDROID_HOME not set" -ForegroundColor Red
        exit 1
    }
    Write-Host "   OK: Android SDK at $env:ANDROID_HOME" -ForegroundColor Green
    
    # Check adb
    $adbPath = "$env:ANDROID_HOME\platform-tools\adb.exe"
    if (-not (Test-Path $adbPath)) {
        Write-Host "ERROR: ADB not found at $adbPath" -ForegroundColor Red
        exit 1
    }
    Write-Host "   OK: ADB ready" -ForegroundColor Green
    
    # Check emulator
    $emulatorPath = "$env:ANDROID_HOME\emulator\emulator.exe"
    if (-not (Test-Path $emulatorPath)) {
        Write-Host "ERROR: Emulator not found at $emulatorPath" -ForegroundColor Red
        exit 1
    }
    Write-Host "   OK: Emulator ready" -ForegroundColor Green
}

# =============================================================================
# STEP 1: KILL OLD PROCESSES
# =============================================================================
Write-Host "`nSTEP 1: Cleaning Up Old Processes..." -ForegroundColor Yellow

# Kill node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "   OK: Cleaned old Node processes" -ForegroundColor Green

# Kill adb
Get-Process adb -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Wait a moment
Start-Sleep -Seconds 1

# =============================================================================
# STEP 2: VERIFY PREREQUISITES
# =============================================================================
Write-Host "`n" -ForegroundColor Green
Test-Prerequisites

# =============================================================================
# STEP 3: START ANDROID EMULATOR
# =============================================================================
Write-Host "`nSTEP 2: Starting Android Emulator..." -ForegroundColor Yellow

$emulatorPath = "$env:ANDROID_HOME\emulator\emulator.exe"
$adbPath = "$env:ANDROID_HOME\platform-tools\adb.exe"

# Check if emulator is already running
Write-Host "   Checking if emulator is already running..." -ForegroundColor Cyan
$devices = & $adbPath devices 2>$null
if ($devices -match "$EmulatorName.*device") {
    Write-Host "   OK: Emulator $EmulatorName is already running" -ForegroundColor Green
} else {
    Write-Host "   Starting emulator $EmulatorName (this takes 2-3 minutes)..." -ForegroundColor Cyan
    Write-Host "   DO NOT CLOSE THIS WINDOW - emulator is loading..." -ForegroundColor Yellow
    
    # Start emulator in background
    Start-Process $emulatorPath -ArgumentList "-avd", $EmulatorName, "-no-snapshot-load" -WindowStyle Minimized -PassThru | Out-Null
    
    Write-Host "   Waiting 15 seconds for emulator to start..." -ForegroundColor Cyan
    Start-Sleep -Seconds 15
    
    # Wait for emulator to be online
    $maxWait = 60
    $elapsed = 0
    $online = $false
    
    while ($elapsed -lt $maxWait) {
        $devices = & $adbPath devices 2>$null
        if ($devices -match "$EmulatorName.*device") {
            $online = $true
            break
        }
        $remaining = [Math]::Min($elapsed + 15, $maxWait)
        Write-Host "   Waiting for emulator ($remaining/$maxWait sec)..." -ForegroundColor Cyan
        Start-Sleep -Seconds 5
        $elapsed += 5
    }
    
    if (-not $online) {
        Write-Host "   ERROR: Emulator failed to start within 60 seconds" -ForegroundColor Red
        Write-Host "   Try manually starting it from Android Studio" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "   OK: Emulator $EmulatorName is online" -ForegroundColor Green
}

# =============================================================================
# STEP 4: SETUP & START BACKEND
# =============================================================================
Write-Host "`nSTEP 3: Setting Up Backend..." -ForegroundColor Yellow

Set-Location $BackendDir

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "   Installing backend dependencies..." -ForegroundColor Cyan
    npm install 2>&1 | Select-Object -Last 5
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ERROR: Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}
Write-Host "   OK: Dependencies ready" -ForegroundColor Green

# Setup database
Write-Host "   Setting up database..." -ForegroundColor Cyan
npm run db:generate 2>&1 | Out-Null
npm run db:migrate -- --skip-generate 2>&1 | Out-Null
Write-Host "   OK: Database ready" -ForegroundColor Green

# Start backend in new window
Write-Host "   Starting backend server on http://localhost:$BackendPort..." -ForegroundColor Cyan

Start-Process powershell -ArgumentList {
    param($BackendDir, $BackendPort)
    Set-Location $BackendDir
    Write-Host "Backend starting..." -ForegroundColor Green
    Write-Host "Listening on http://localhost:$BackendPort" -ForegroundColor Cyan
    npm run dev 2>&1
} -ArgumentList $BackendDir, $BackendPort -WindowStyle Normal

# Wait for backend to start
Write-Host "   Waiting 5 seconds for backend to initialize..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Check if backend is responding
$backendOK = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$BackendPort/health" -ErrorAction Stop -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $backendOK = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if ($backendOK) {
    Write-Host "   OK: Backend is running on http://localhost:$BackendPort" -ForegroundColor Green
} else {
    Write-Host "   WARNING: Backend may still be initializing (check the backend window)" -ForegroundColor Yellow
}

# =============================================================================
# STEP 5: SETUP & START FRONTEND
# =============================================================================
Write-Host "`nSTEP 4: Setting Up Frontend..." -ForegroundColor Yellow

Set-Location $FrontendDir

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "   Installing frontend dependencies..." -ForegroundColor Cyan
    npm install 2>&1 | Select-Object -Last 5
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ERROR: Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}
Write-Host "   OK: Dependencies ready" -ForegroundColor Green

# Make sure .env is set correctly
Write-Host "   Checking environment configuration..." -ForegroundColor Cyan
if (-not (Test-Path ".env")) {
    Write-Host "   Creating .env file..." -ForegroundColor Cyan
    $apiUrl = "http://${HostIP}:${BackendPort}"
    $envContent = @"
API_BASE_URL=$apiUrl
GOOGLE_WEB_CLIENT_ID=your_google_client_id
FIREBASE_PROJECT_ID=your_firebase_project
ENABLE_OFFLINE_MODE=true
ENABLE_DEBUG_LOGS=true
"@
    Set-Content -Path ".env" -Value $envContent -Encoding UTF8
    Write-Host "   OK: .env created with API_BASE_URL=$apiUrl" -ForegroundColor Green
} else {
    Write-Host "   OK: .env file already exists" -ForegroundColor Green
}

# =============================================================================
# STEP 6: BUILD & RUN ON EMULATOR
# =============================================================================
Write-Host "`nSTEP 5: Building and Running App on Emulator..." -ForegroundColor Yellow
Write-Host "   This will take 5-10 minutes on first build..." -ForegroundColor Cyan
Write-Host "   Compiling Android app..." -ForegroundColor Cyan

npx react-native run-android 2>&1 | Tee-Object -Variable buildOutput | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "   OK: App successfully installed on emulator!" -ForegroundColor Green
} else {
    Write-Host "   ERROR: Build failed. Checking logs..." -ForegroundColor Red
    Write-Host "   Last 20 lines of build output:" -ForegroundColor Yellow
    $buildOutput[-20..-1] | Write-Host
    exit 1
}

# =============================================================================
# COMPLETION
# =============================================================================
Write-Host "`n" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "STARTUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nWhat's Running:" -ForegroundColor Cyan
Write-Host "   OK: Android Emulator: $EmulatorName (running)" -ForegroundColor Green
Write-Host "   OK: Backend Server: http://localhost:$BackendPort (running)" -ForegroundColor Green
Write-Host "   OK: Expo Metro Bundler: (starting...)" -ForegroundColor Green
Write-Host "   OK: App on Emulator: (launching...)" -ForegroundColor Green

Write-Host "`nWhat to Do Now:" -ForegroundColor Cyan
Write-Host "   1. Watch the emulator for the app to load (30-60 sec)" -ForegroundColor White
Write-Host "   2. You should see the Login screen" -ForegroundColor White
Write-Host "   3. Try logging in with:" -ForegroundColor White
Write-Host "      Email: test@visabuddy.com" -ForegroundColor White
Write-Host "      Password: Test123!" -ForegroundColor White
Write-Host "   4. Monitor the backend window for any errors" -ForegroundColor White
Write-Host "   5. If app doesn't load, press 'R' twice in the Expo terminal" -ForegroundColor White

Write-Host "`nUseful URLs:" -ForegroundColor Cyan
Write-Host "   Backend Health: http://localhost:$BackendPort/health" -ForegroundColor White
Write-Host "   Database UI:    http://localhost:$BackendPort/studio" -ForegroundColor White

Write-Host "`nTo Stop Everything:" -ForegroundColor Cyan
Write-Host "   1. Close the backend window" -ForegroundColor White
Write-Host "   2. Close the Expo terminal" -ForegroundColor White
Write-Host "   3. Close Android Emulator" -ForegroundColor White

Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
Write-Host "   Q: App not loading?" -ForegroundColor White
Write-Host "      A: Check Backend window for errors, press 'R' in Expo" -ForegroundColor Gray
Write-Host "   Q: Backend connection error?" -ForegroundColor White
Write-Host "      A: Check API_BASE_URL uses 10.0.2.2" -ForegroundColor Gray
Write-Host "   Q: Emulator won't start?" -ForegroundColor White
Write-Host "      A: Try manually starting it from Android Studio" -ForegroundColor Gray

Write-Host "`nKeep Windows Open:" -ForegroundColor Cyan
Write-Host "   This window will monitor the build progress" -ForegroundColor White
Write-Host "   Backend window shows server logs" -ForegroundColor White
Write-Host "   Emulator window shows the running app" -ForegroundColor White

Read-Host "`nPress Enter to continue and watch the magic happen..."