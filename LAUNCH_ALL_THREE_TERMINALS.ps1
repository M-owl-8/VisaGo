#!/usr/bin/env pwsh
# =============================================================================
# LAUNCH ALL THREE TERMINALS FOR ANDROID BUILD
# =============================================================================
# This script opens 3 PowerShell terminals with proper setup
# Terminal 1: Backend (npm run dev)
# Terminal 2: Metro Bundler (npm run metro) 
# Terminal 3: Build and Deploy (npm run android)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "LAUNCHING ALL THREE TERMINALS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$BackendDir = "c:\work\VisaBuddy\apps\backend"
$FrontendDir = "c:\work\VisaBuddy\apps\frontend"

# Helper function
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

Write-Status "Starting Terminal 1 (Backend on port 3000)..." "INFO"
Start-Process powershell -NoNewWindow -ArgumentList {
    Write-Host "`n=== BACKEND SERVER ===" -ForegroundColor Green
    Write-Host "Port: 3000" -ForegroundColor Cyan
    Write-Host "Starting backend..." -ForegroundColor Cyan
    Set-Location "c:\work\VisaBuddy\apps\backend"
    npm run dev
}

Write-Status "Backend terminal opened" "SUCCESS"
Write-Status "Waiting 10 seconds before starting Metro..." "INFO"
Start-Sleep -Seconds 10

Write-Status "Starting Terminal 2 (Metro Bundler on port 8081)..." "INFO"
Start-Process powershell -NoNewWindow -ArgumentList {
    Write-Host "`n=== METRO BUNDLER ===" -ForegroundColor Green
    Write-Host "Port: 8081" -ForegroundColor Cyan
    Write-Host "Starting Metro..." -ForegroundColor Cyan
    Set-Location "c:\work\VisaBuddy\apps\frontend"
    npm run metro
}

Write-Status "Metro terminal opened" "SUCCESS"
Write-Status "Waiting 15 seconds before starting build..." "INFO"
Start-Sleep -Seconds 15

Write-Status "Starting Terminal 3 (Build and Deploy to device)..." "INFO"
Start-Process powershell -NoNewWindow -ArgumentList {
    Write-Host "`n=== BUILD AND DEPLOY ===" -ForegroundColor Green
    Write-Host "Building APK and deploying to connected device..." -ForegroundColor Cyan
    Set-Location "c:\work\VisaBuddy\apps\frontend"
    npm run android
}

Write-Status "Build terminal opened" "SUCCESS"

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "ALL THREE TERMINALS LAUNCHED" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Yellow

Write-Host "What's happening:" -ForegroundColor Cyan
Write-Host "1. Terminal 1: Backend server starting on http://localhost:3000" -ForegroundColor White
Write-Host "2. Terminal 2: Metro bundler starting on http://localhost:8081" -ForegroundColor White
Write-Host "3. Terminal 3: Building APK and deploying to your device" -ForegroundColor White

Write-Host "`nExpected timeline:" -ForegroundColor Cyan
Write-Host "- Backend startup: 5-10 seconds" -ForegroundColor Gray
Write-Host "- Metro startup: 10-15 seconds" -ForegroundColor Gray
Write-Host "- First APK build: 5-10 minutes (first time)" -ForegroundColor Gray
Write-Host "- Subsequent builds: 2-3 minutes" -ForegroundColor Gray

Write-Host "`nMonitoring:" -ForegroundColor Cyan
Write-Host "- Watch Terminal 1 for backend logs" -ForegroundColor Gray
Write-Host "- Watch Terminal 2 for Metro bundler status" -ForegroundColor Gray
Write-Host "- Watch Terminal 3 for build progress" -ForegroundColor Gray

Write-Host "`nTroubleshooting:" -ForegroundColor Cyan
Write-Host "- If Terminal 3 fails: Check Terminals 1 and 2 for errors" -ForegroundColor Gray
Write-Host "- If Metro crashes: Metro will auto-reload, just wait" -ForegroundColor Gray
Write-Host "- If build hangs: Press Ctrl+C in Terminal 3 and try again" -ForegroundColor Gray

Write-Host "`nDevice check:" -ForegroundColor Cyan
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"
$devices = & $adb devices 2>&1
if ($devices -like "*device*") {
    Write-Status "Device connected and ready" "SUCCESS"
} else {
    Write-Status "No device connected! Check USB connection." "ERROR"
}

Write-Host "`nThis main window will close in 30 seconds..." -ForegroundColor Yellow
Write-Host "The three terminals will continue running.`n" -ForegroundColor Yellow
Start-Sleep -Seconds 30