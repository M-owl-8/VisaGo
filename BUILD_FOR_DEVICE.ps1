#!/usr/bin/env pwsh
# =============================================================================
# VisaBuddy - Build & Deploy to Physical Android Device (Samsung A56)
# =============================================================================
# Prerequisites:
# 1. USB Debugging enabled on device (Settings > Developer Options > USB Debugging)
# 2. Device connected via USB cable
# 3. Install ADB (via Android SDK)
# 4. Accept ADB authorization on device when prompted
# =============================================================================

param(
    [switch]$SkipBackend = $false,
    [string]$DeviceIP = $null
)

$ErrorActionPreference = "Continue"

# Configuration
$ProjectRoot = "c:\work\VisaBuddy"
$FrontendDir = "$ProjectRoot\apps\frontend"
$BackendDir = "$ProjectRoot\apps\backend"
$BackendPort = 3000

Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  VisaBuddy - Build for Samsung A56 Physical Device           ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# =============================================================================
# STEP 1: CHECK DEVICE CONNECTION
# =============================================================================

Write-Host "`n[STEP 1] Checking Device Connection..." -ForegroundColor Yellow

try {
    $devices = & adb devices 2>&1
    Write-Host $devices -ForegroundColor Gray
    
    if ($devices -match "offline") {
        Write-Host "[ERROR] Device is offline. Try:" -ForegroundColor Red
        Write-Host "  1. Reconnect USB cable" -ForegroundColor Yellow
        Write-Host "  2. Accept ADB authorization on device" -ForegroundColor Yellow
        Write-Host "  3. Run: adb kill-server" -ForegroundColor Yellow
        Write-Host "  4. Run: adb start-server" -ForegroundColor Yellow
        exit 1
    }
    
    if ($devices -match "device") {
        Write-Host "[OK] Device connected and authorized" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] No device connected. Connect your Samsung A56 via USB" -ForegroundColor Red
        Write-Host "[TIP] Enable USB Debugging: Settings > Developer Options > USB Debugging" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "[ERROR] ADB not found. Install Android SDK tools first" -ForegroundColor Red
    exit 1
}

# =============================================================================
# STEP 2: GET COMPUTER'S LOCAL IP ADDRESS
# =============================================================================

Write-Host "`n[STEP 2] Detecting Computer IP Address..." -ForegroundColor Yellow

# Get the active network interface IP (not loopback)
$hostIP = (
    Get-NetIPAddress -AddressFamily IPv4 -PrefixLength 24 | 
    Where-Object { $_.AddressState -eq "Preferred" -and $_.InterfaceAlias -notmatch "Loopback" } | 
    Select-Object -First 1 -ExpandProperty IPAddress
)

if (-not $hostIP) {
    Write-Host "[ERROR] Could not detect IP address" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Computer IP: $hostIP" -ForegroundColor Green
Write-Host "[INFO] Device will connect to backend at: http://${hostIP}:${BackendPort}" -ForegroundColor Cyan

# =============================================================================
# STEP 3: UPDATE ENVIRONMENT FOR PHYSICAL DEVICE
# =============================================================================

Write-Host "`n[STEP 3] Updating Environment Configuration..." -ForegroundColor Yellow

$envFile = "$FrontendDir\.env"
$envContent = @"
# API Configuration
# For physical device on same network, use computer's IP address
API_BASE_URL=http://${hostIP}:${BackendPort}

# Google OAuth Configuration
GOOGLE_WEB_CLIENT_ID=70376960035-09cj8bj1lcenp6rm1pmqi6v1m498qu8q.apps.googleusercontent.com

# Firebase Configuration
FIREBASE_PROJECT_ID=pctt-203e6

# Environment
NODE_ENV=development

# Feature flags
ENABLE_OFFLINE_MODE=true
ENABLE_DEBUG_LOGS=true
"@

Set-Content -Path $envFile -Value $envContent -Force
Write-Host "[OK] .env updated with IP: $hostIP" -ForegroundColor Green

# =============================================================================
# STEP 4: SETUP BACKEND
# =============================================================================

if (-not $SkipBackend) {
    Write-Host "`n[STEP 4] Preparing Backend..." -ForegroundColor Yellow
    
    Set-Location $BackendDir
    
    if (-not (Test-Path "node_modules")) {
        Write-Host "[INFO] Installing backend dependencies..." -ForegroundColor Cyan
        npm install --silent
    }
    
    Write-Host "[INFO] Generating Prisma client..." -ForegroundColor Cyan
    npm run db:generate 2>&1 | Out-Null
    
    Write-Host "[OK] Backend ready" -ForegroundColor Green
} else {
    Write-Host "`n[STEP 4] Skipping backend setup (--SkipBackend flag)" -ForegroundColor Yellow
}

# =============================================================================
# STEP 5: SETUP FRONTEND DEPENDENCIES
# =============================================================================

Write-Host "`n[STEP 5] Setting up Frontend..." -ForegroundColor Yellow

Set-Location $FrontendDir

if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installing frontend dependencies (this takes 2-3 min)..." -ForegroundColor Cyan
    npm install --silent
}

Write-Host "[OK] Frontend ready" -ForegroundColor Green

# =============================================================================
# STEP 6: BUILD FOR PHYSICAL DEVICE
# =============================================================================

Write-Host "`n[STEP 6] Building Android App for Device..." -ForegroundColor Yellow
Write-Host "[INFO] This step takes 3-5 minutes..." -ForegroundColor Cyan
Write-Host "[INFO] Watch the build output below:" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Gray

# Clean previous builds to avoid conflicts
Write-Host "[INFO] Cleaning previous builds..." -ForegroundColor Gray
Set-Location "$FrontendDir\android"
.\gradlew.bat clean 2>&1 | Out-Null

# Build APK
Set-Location $FrontendDir
Write-Host "" -ForegroundColor Gray
npx react-native run-android

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Build failed. See errors above." -ForegroundColor Red
    exit 1
}

# =============================================================================
# STEP 7: VERIFY APP ON DEVICE
# =============================================================================

Write-Host "`n[STEP 7] Verifying App Installation..." -ForegroundColor Yellow

Start-Sleep -Seconds 3

$installedApps = & adb shell pm list packages 2>&1
if ($installedApps -match "com.visabuddy.app") {
    Write-Host "[OK] App successfully installed!" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Could not verify app installation" -ForegroundColor Yellow
}

# =============================================================================
# SUCCESS
# =============================================================================

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✓ BUILD COMPLETE - APP READY ON DEVICE!                     ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`n📋 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Start backend in separate terminal:" -ForegroundColor White
Write-Host "   cd c:\work\VisaBuddy\apps\backend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host "" -ForegroundColor White
Write-Host "2. App should launch automatically on your A56 device" -ForegroundColor White
Write-Host "3. Login screen should appear in ~10 seconds" -ForegroundColor White
Write-Host "4. Test credentials: test@visabuddy.com / Test123!" -ForegroundColor White

Write-Host "`n📱 DEVICE INFORMATION:" -ForegroundColor Cyan
Write-Host "Computer IP: $hostIP" -ForegroundColor White
Write-Host "Backend URL: http://${hostIP}:${BackendPort}" -ForegroundColor White
Write-Host "App Package: com.visabuddy.app" -ForegroundColor White

Write-Host "`n🔧 TROUBLESHOOTING:" -ForegroundColor Cyan
Write-Host "• App crashes on launch:" -ForegroundColor Yellow
Write-Host "  - Check backend is running (npm run dev)" -ForegroundColor Gray
Write-Host "  - Check device can reach computer IP" -ForegroundColor Gray
Write-Host "  - Run: adb logcat | findstr visabuddy" -ForegroundColor Gray
Write-Host "" -ForegroundColor White
Write-Host "• Cannot install app:" -ForegroundColor Yellow
Write-Host "  - Run: adb kill-server" -ForegroundColor Gray
Write-Host "  - Run: adb start-server" -ForegroundColor Gray
Write-Host "  - Reconnect device" -ForegroundColor Gray
Write-Host "" -ForegroundColor White
Write-Host "• Device not found:" -ForegroundColor Yellow
Write-Host "  - Enable USB Debugging on device" -ForegroundColor Gray
Write-Host "  - Accept ADB authorization prompt on device" -ForegroundColor Gray
Write-Host "  - Check USB cable connection" -ForegroundColor Gray

Write-Host "`nPress Enter to exit..." -ForegroundColor Yellow
Read-Host