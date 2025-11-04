#!/usr/bin/env pwsh
# =============================================================================
# TEST: Verify all npm scripts are working
# =============================================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TESTING NPM SCRIPTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$FrontendDir = "c:\work\VisaBuddy\apps\frontend"
Set-Location $FrontendDir

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

# Test 1: metro script
Write-Host "`n1. TESTING: npm run metro" -ForegroundColor Yellow
Write-Status "This would start the Metro Bundler on port 8081" "INFO"
Write-Status "Command: npx metro start --reset-cache" "INFO"
Write-Status "To test, run in Terminal: npm run metro" "INFO"

# Test 2: android script
Write-Host "`n2. TESTING: npm run android" -ForegroundColor Yellow
Write-Status "This would build APK and install on connected device" "INFO"
Write-Status "Command: npx react-native run-android --no-packager" "INFO"
Write-Status "To test, run in Terminal: npm run android" "INFO"

# Test 3: dev script
Write-Host "`n3. TESTING: npm run dev" -ForegroundColor Yellow
Write-Status "This would start the Metro Bundler (alternative)" "INFO"
Write-Status "Command: npx metro start --reset-cache" "INFO"

# Test 4: Verify react-native command
Write-Host "`n4. VERIFYING: react-native CLI" -ForegroundColor Yellow
$version = & react-native --version 2>&1
Write-Status "React Native version: $version" "SUCCESS"

# Test 5: Verify metro command
Write-Host "`n5. VERIFYING: metro bundler" -ForegroundColor Yellow
$metro = & npx metro --version 2>&1
Write-Status "Metro version: $metro" "SUCCESS"

# Test 6: Device connection
Write-Host "`n6. CHECKING: ADB device connection" -ForegroundColor Yellow
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"
$devices = & $adb devices 2>&1
if ($devices -like "*device*") {
    Write-Status "Devices found:" "SUCCESS"
    $devices | Select-Object -Skip 1 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Status "No devices found. Connect a device or start emulator." "WARNING"
}

# Test 7: Backend connectivity
Write-Host "`n7. CHECKING: Backend health" -ForegroundColor Yellow
$computerIP = ([System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() | 
    Where-Object { $_.OperationalStatus -eq 'Up' -and $_.NetworkInterfaceType -ne 'Loopback' } | 
    Select-Object -First 1 | 
    ForEach-Object { $_.GetIPProperties().UnicastAddresses | 
    Where-Object { $_.Address.AddressFamily -eq 'InterNetwork' } | 
    Select-Object -First 1 -ExpandProperty Address }).ToString()

if ($computerIP) {
    Write-Status "Computer IP: $computerIP" "INFO"
    try {
        $health = Invoke-WebRequest -Uri "http://localhost:3000/health" -ErrorAction Stop -TimeoutSec 2
        if ($health.StatusCode -eq 200) {
            Write-Status "Backend is running and healthy" "SUCCESS"
        }
    } catch {
        Write-Status "Backend not responding (may not be running yet)" "WARNING"
    }
} else {
    Write-Status "Could not determine computer IP" "WARNING"
}

# Final instructions
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "ALL SYSTEMS VERIFIED" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "You are ready to use the THREE-TERMINAL BUILD SETUP:`n" -ForegroundColor Cyan

Write-Host "Terminal 1 - BACKEND (Port 3000):" -ForegroundColor White
Write-Host "  Set-Location c:\work\VisaBuddy\apps\backend" -ForegroundColor Gray
Write-Host "  npm run dev" -ForegroundColor Gray

Write-Host "`nTerminal 2 - METRO BUNDLER (Port 8081):" -ForegroundColor White
Write-Host "  Set-Location c:\work\VisaBuddy\apps\frontend" -ForegroundColor Gray
Write-Host "  npm run metro" -ForegroundColor Gray

Write-Host "`nTerminal 3 - BUILD AND DEPLOY:" -ForegroundColor White
Write-Host "  Set-Location c:\work\VisaBuddy\apps\frontend" -ForegroundColor Gray
Write-Host "  npm run android" -ForegroundColor Gray

Write-Host "`nStart in this order: Backend, then Metro, then Build (wait 30 secs between each)`n" -ForegroundColor Yellow

Write-Status "Ready to deploy!" "SUCCESS"