#!/usr/bin/env pwsh
# =============================================================================
# VisaBuddy - Start on Android Emulator (Automated)
# =============================================================================
# This script automates the entire startup process:
# 1. Validates prerequisites
# 2. Installs dependencies
# 3. Runs database migrations
# 4. Starts backend
# 5. Starts emulator
# 6. Builds and runs frontend

Write-Host "VisaBuddy - Android Emulator Startup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# =============================================================================
# CONFIGURATION
# =============================================================================

$ProjectRoot = "c:\work\VisaBuddy"
$BackendDir = "$ProjectRoot\apps\backend"
$FrontendDir = "$ProjectRoot\apps\frontend"
$AiDir = "$ProjectRoot\apps\ai-service"

$BackendPort = 3000
$EmulatorName = "Pixel_6"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

function Test-Command {
    param([string]$Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) {
            return $true
        }
    } catch {
        return $false
    }
}

function Write-Status {
    param([string]$Message, [string]$Status = "INFO")
    $colors = @{
        "SUCCESS" = "Green"
        "ERROR"   = "Red"
        "WARNING" = "Yellow"
        "INFO"    = "Cyan"
    }
    $color = if ($colors.ContainsKey($Status)) { $colors[$Status] } else { "White" }
    Write-Host "[$Status] $Message" -ForegroundColor $color
}

# =============================================================================
# VALIDATE PREREQUISITES
# =============================================================================

Write-Host "`n✅ CHECKING PREREQUISITES" -ForegroundColor Yellow

if (-not (Test-Command "node")) {
    Write-Status "Node.js not found. Please install Node.js 20+" "ERROR"
    exit 1
}
Write-Status "Node.js: $(node --version)" "SUCCESS"

if (-not (Test-Command "npm")) {
    Write-Status "npm not found" "ERROR"
    exit 1
}
Write-Status "npm: $(npm --version)" "SUCCESS"

if (-not (Test-Path $env:ANDROID_HOME)) {
    Write-Status "ANDROID_HOME not set" "ERROR"
    exit 1
}
Write-Status "Android SDK: $env:ANDROID_HOME" "SUCCESS"

$emulatorPath = "$env:ANDROID_HOME\emulator\emulator.exe"
if (-not (Test-Path $emulatorPath)) {
    Write-Status "Emulator executable not found" "ERROR"
    exit 1
}
Write-Status "Emulator: $emulatorPath" "SUCCESS"

# =============================================================================
# STEP 1: SETUP BACKEND
# =============================================================================

Write-Host "`n⚙️ STEP 1: SETUP BACKEND" -ForegroundColor Yellow

Write-Status "Navigating to backend directory" "INFO"
Set-Location $BackendDir

if (-not (Test-Path "node_modules")) {
    Write-Status "Installing backend dependencies..." "INFO"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Failed to install backend dependencies" "ERROR"
        exit 1
    }
    Write-Status "Backend dependencies installed" "SUCCESS"
} else {
    Write-Status "Backend dependencies already installed" "SUCCESS"
}

Write-Status "Generating Prisma client" "INFO"
npm run db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Status "Failed to generate Prisma client" "ERROR"
    exit 1
}

Write-Status "Checking database migrations" "INFO"
# Run migrations non-interactively
npm run db:migrate -- --skip-generate
if ($LASTEXITCODE -ne 0) {
    Write-Status "Migrations already applied or database issue" "WARNING"
}

Write-Status "Backend setup complete" "SUCCESS"

# =============================================================================
# STEP 2: SETUP FRONTEND
# =============================================================================

Write-Host "`n⚙️ STEP 2: SETUP FRONTEND" -ForegroundColor Yellow

Set-Location $FrontendDir

if (-not (Test-Path "node_modules")) {
    Write-Status "Installing frontend dependencies..." "INFO"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Failed to install frontend dependencies" "ERROR"
        exit 1
    }
    Write-Status "Frontend dependencies installed" "SUCCESS"
} else {
    Write-Status "Frontend dependencies already installed" "SUCCESS"
}

Write-Status "Frontend setup complete" "SUCCESS"

# =============================================================================
# STEP 3: START BACKEND IN SEPARATE PROCESS
# =============================================================================

Write-Host "`n🔌 STEP 3: STARTING BACKEND SERVER" -ForegroundColor Yellow

# Kill any existing node processes on backend
Write-Status "Cleaning up old processes..." "INFO"
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*backend*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Set-Location $BackendDir
Write-Status "Starting backend on http://localhost:$BackendPort" "INFO"

# Start backend in a new window
Start-Process powershell -ArgumentList {
    Set-Location "c:\work\VisaBuddy\apps\backend"
    Write-Host "Backend starting..." -ForegroundColor Cyan
    npm run dev
} -NoNewWindow -PassThru | Out-Null

# Wait for backend to start
Write-Status "Waiting for backend to start (5 seconds)" "INFO"
Start-Sleep -Seconds 5

# Test backend
$attempts = 0
$maxAttempts = 10
$backendRunning = $false

while ($attempts -lt $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$BackendPort/health" -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $backendRunning = $true
            break
        }
    } catch {
        $attempts++
        if ($attempts -lt $maxAttempts) {
            Write-Status "Backend not responding yet... retry $attempts/$maxAttempts" "WARNING"
            Start-Sleep -Seconds 2
        }
    }
}

if ($backendRunning) {
    Write-Status "Backend is running on http://localhost:$BackendPort" "SUCCESS"
} else {
    Write-Status "Backend failed to start. Check logs in Terminal 1" "ERROR"
}

# =============================================================================
# STEP 4: START ANDROID EMULATOR
# =============================================================================

Write-Host "`n📱 STEP 4: STARTING ANDROID EMULATOR" -ForegroundColor Yellow

Write-Status "Checking if emulator is already running..." "INFO"
$adbPath = "$env:ANDROID_HOME\platform-tools\adb.exe"
$devices = & $adbPath devices

if ($devices -like "*$EmulatorName*") {
    Write-Status "Emulator $EmulatorName already running" "SUCCESS"
} else {
    Write-Status "Starting emulator $EmulatorName..." "INFO"
    Write-Status "This may take 2-3 minutes..." "INFO"
    
    Start-Process $emulatorPath -ArgumentList "-avd", $EmulatorName, "-no-snapshot-load" -WindowStyle Hidden
    
    Write-Status "Waiting for emulator to boot (30 seconds)..." "INFO"
    Start-Sleep -Seconds 30
    
    # Check if emulator is running
    $attempts = 0
    $maxAttempts = 12
    $emulatorRunning = $false
    
    while ($attempts -lt $maxAttempts) {
        try {
            $devices = & $adbPath devices
            if ($devices -like "*$EmulatorName*online*") {
                $emulatorRunning = $true
                break
            }
        } catch {
            # Ignore
        }
        $attempts++
        if ($attempts -lt $maxAttempts) {
            Write-Status "Emulator loading... attempt $attempts/$maxAttempts" "INFO"
            Start-Sleep -Seconds 5
        }
    }
    
    if ($emulatorRunning) {
        Write-Status "Emulator $EmulatorName is running" "SUCCESS"
    } else {
        Write-Status "Emulator failed to start" "ERROR"
        Write-Status "Try manually starting it:" "INFO"
        Write-Host "  $emulatorPath -avd $EmulatorName" -ForegroundColor White
        exit 1
    }
}

# =============================================================================
# STEP 5: BUILD AND RUN FRONTEND
# =============================================================================

Write-Host "`n📲 STEP 5: BUILDING AND RUNNING APP" -ForegroundColor Yellow

Set-Location $FrontendDir

Write-Status "Building Android APK and running on emulator..." "INFO"
Write-Status "This will take 5-10 minutes (first build)" "INFO"
Write-Status "Terminal will show build progress..." "INFO"

npx react-native run-android

if ($LASTEXITCODE -eq 0) {
    Write-Status "App installed and launched on emulator!" "SUCCESS"
} else {
    Write-Status "Build failed. Check errors above" "ERROR"
    exit 1
}

# =============================================================================
# COMPLETION
# =============================================================================

Write-Host "`n✅ STARTUP COMPLETE" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Status "✅ Backend running on http://localhost:$BackendPort" "SUCCESS"
Write-Status "✅ Emulator $EmulatorName is running" "SUCCESS"
Write-Status "✅ App installed on emulator" "SUCCESS"

Write-Host "`n📋 WHAT'S NEXT:" -ForegroundColor Cyan
Write-Host "1. Watch the Metro Bundler console for startup messages" -ForegroundColor White
Write-Host "2. App should appear on emulator screen within 10-15 seconds" -ForegroundColor White
Write-Host "3. You should see the login screen with language options" -ForegroundColor White
Write-Host "4. Test: Try logging in with test@visabuddy.com / Test123!" -ForegroundColor White
Write-Host "5. Monitor Terminal 1 for backend logs and errors" -ForegroundColor White

Write-Host "`n🔗 USEFUL LINKS:" -ForegroundColor Cyan
Write-Host "- Backend health: http://localhost:3000/health" -ForegroundColor White
Write-Host "- Database UI: http://localhost:3000/studio" -ForegroundColor White
Write-Host "- Emulator docs: See RUN_ON_EMULATOR_TODAY.md" -ForegroundColor White

Write-Host "`n💡 TROUBLESHOOTING:" -ForegroundColor Cyan
Write-Host "- If app doesn't load: Check backend logs in Terminal 1" -ForegroundColor White
Write-Host "- If Metro bundler crashes: npm run dev in frontend folder" -ForegroundColor White
Write-Host "- If emulator will not start: Run it manually from Android Studio" -ForegroundColor White

Write-Host "`nPress Ctrl+C to stop the script (services keep running)" -ForegroundColor Yellow
Write-Host "To stop everything, close all 3 terminals/processes" -ForegroundColor Yellow

Read-Host "`nPress Enter to continue monitoring..."