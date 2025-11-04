#!/usr/bin/env pwsh
# =============================================================================
# VisaBuddy - Pre-Build Checklist for Physical Device
# =============================================================================

$ErrorActionPreference = "Continue"

Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  VisaBuddy - Device Build Pre-Check                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$allGood = $true

# Check 1: Node.js
Write-Host "`n[CHECK 1] Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found. Install Node.js 18+" -ForegroundColor Red
    $allGood = $false
}

# Check 2: npm
Write-Host "`n[CHECK 2] npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "[OK] npm $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] npm not found" -ForegroundColor Red
    $allGood = $false
}

# Check 3: Android SDK
Write-Host "`n[CHECK 3] Android SDK..." -ForegroundColor Yellow
if ($env:ANDROID_HOME) {
    Write-Host "[OK] ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Green
} else {
    Write-Host "[ERROR] ANDROID_HOME not set" -ForegroundColor Red
    Write-Host "[TIP] Set ANDROID_HOME environment variable to your Android SDK path" -ForegroundColor Yellow
    $allGood = $false
}

# Check 4: ADB
Write-Host "`n[CHECK 4] ADB (Android Debug Bridge)..." -ForegroundColor Yellow
try {
    adb version | Out-Null
    Write-Host "[OK] ADB found" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] ADB not found" -ForegroundColor Red
    $allGood = $false
}

# Check 5: Device Connected
Write-Host "`n[CHECK 5] Device Connection..." -ForegroundColor Yellow
try {
    $devices = & adb devices 2>&1
    if ($devices -match "device$") {
        Write-Host "[OK] Device connected and authorized" -ForegroundColor Green
        $devices | Select-Object -Skip 1 | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
    } elseif ($devices -match "offline") {
        Write-Host "[ERROR] Device is OFFLINE" -ForegroundColor Red
        Write-Host "[FIX]" -ForegroundColor Yellow
        Write-Host "  1. Check USB cable connection" -ForegroundColor Gray
        Write-Host "  2. Reconnect device" -ForegroundColor Gray
        Write-Host "  3. Accept ADB authorization on device" -ForegroundColor Gray
        $allGood = $false
    } elseif ($devices -match "unauthorized") {
        Write-Host "[ERROR] Device is UNAUTHORIZED" -ForegroundColor Red
        Write-Host "[FIX]" -ForegroundColor Yellow
        Write-Host "  1. Look for USB authorization prompt on device" -ForegroundColor Gray
        Write-Host "  2. Tap 'Allow' to authorize" -ForegroundColor Gray
        Write-Host "  3. Run adb kill-server" -ForegroundColor Gray
        Write-Host "  4. Run adb start-server" -ForegroundColor Gray
        $allGood = $false
    } else {
        Write-Host "[WARNING] No device found" -ForegroundColor Yellow
        Write-Host "[FIX]" -ForegroundColor Yellow
        Write-Host "  1. Enable USB Debugging on device (Settings > Developer Options)" -ForegroundColor Gray
        Write-Host "  2. Connect device via USB cable" -ForegroundColor Gray
        Write-Host "  3. Accept ADB authorization prompt" -ForegroundColor Gray
        Write-Host "  See: SETUP_DEVICE.txt for detailed instructions" -ForegroundColor Gray
    }
} catch {
    Write-Host "[ERROR] Could not run adb" -ForegroundColor Red
    $allGood = $false
}

# Check 6: Project Structure
Write-Host "`n[CHECK 6] Project Structure..." -ForegroundColor Yellow
$FrontendDir = "c:\work\VisaBuddy\apps\frontend"
$BackendDir = "c:\work\VisaBuddy\apps\backend"

if (Test-Path "$FrontendDir\package.json") {
    Write-Host "[OK] Frontend found: $FrontendDir" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Frontend not found" -ForegroundColor Red
    $allGood = $false
}

if (Test-Path "$BackendDir\package.json") {
    Write-Host "[OK] Backend found: $BackendDir" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Backend not found" -ForegroundColor Red
    $allGood = $false
}

# Check 7: Dependencies
Write-Host "`n[CHECK 7] Dependencies..." -ForegroundColor Yellow

$frontendModules = "$FrontendDir\node_modules"
if (Test-Path $frontendModules) {
    Write-Host "[OK] Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Frontend dependencies not installed" -ForegroundColor Yellow
    Write-Host "[INFO] Will be installed automatically during build" -ForegroundColor Gray
}

$backendModules = "$BackendDir\node_modules"
if (Test-Path $backendModules) {
    Write-Host "[OK] Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Backend dependencies not installed" -ForegroundColor Yellow
    Write-Host "[INFO] Will be installed automatically during build" -ForegroundColor Gray
}

# Check 8: Environment File
Write-Host "`n[CHECK 8] Environment Configuration..." -ForegroundColor Yellow

$envFile = "$FrontendDir\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    $apiUrl = $envContent | Select-String "API_BASE_URL" | ForEach-Object { $_.ToString() }
    Write-Host "[OK] .env file found" -ForegroundColor Green
    Write-Host "     $apiUrl" -ForegroundColor Gray
} else {
    Write-Host "[WARNING] .env file not found" -ForegroundColor Yellow
    Write-Host "[INFO] Will be created/updated with correct IP address" -ForegroundColor Gray
}

# Final Summary
Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "║  ✓ ALL CHECKS PASSED - READY TO BUILD!              ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
    
    Write-Host "`nYou can now run:" -ForegroundColor Green
    Write-Host "  c:\work\VisaBuddy\BUILD_FOR_DEVICE.ps1" -ForegroundColor Cyan
} else {
    Write-Host "║  ✗ SOME CHECKS FAILED - SEE FIXES ABOVE             ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Red
    
    Write-Host "`nFix the issues above, then run pre-check again." -ForegroundColor Yellow
    exit 1
}

Write-Host "`nPress Enter to exit..." -ForegroundColor Yellow
Read-Host | Out-Null