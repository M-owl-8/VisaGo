#!/usr/bin/env pwsh
# =============================================================================
# VisaBuddy - Complete Device Build (3-Terminal Orchestration)
# =============================================================================
# This script automatically opens 3 coordinated terminals:
#   Terminal 1: Backend server
#   Terminal 2: Metro bundler
#   Terminal 3: Android build & deploy

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "VisaBuddy Device Build - Complete Orchestration" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

$ProjectRoot = "c:\work\VisaBuddy"
$BackendDir = "$ProjectRoot\apps\backend"
$FrontendDir = "$ProjectRoot\apps\frontend"

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
# PRE-CHECK
# =============================================================================
Write-Host "`n🔍 PRE-CHECKS" -ForegroundColor Yellow

if (-not (Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe")) {
    Write-Status "ANDROID_HOME not set or adb not found" "ERROR"
    exit 1
}
Write-Status "Android SDK found" "SUCCESS"

# Get connected devices
$adbPath = "$env:ANDROID_HOME\platform-tools\adb.exe"
$devices = & $adbPath devices
$deviceCount = ($devices | Select-String "device$" | Measure-Object).Count

if ($deviceCount -eq 0) {
    Write-Status "No Android devices detected" "ERROR"
    Write-Status "Connect device via USB and enable USB Debugging" "INFO"
    exit 1
}
Write-Status "Found $deviceCount device(s)" "SUCCESS"

# =============================================================================
# GET NETWORK IP
# =============================================================================
Write-Host "`n🌐 CONFIGURING NETWORK" -ForegroundColor Yellow

$ip = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.0.*" } | Select-Object -First 1 -ExpandProperty IPAddress

if (-not $ip) {
    $ip = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.PrefixLength -lt 32 } | Select-Object -First 1 -ExpandProperty IPAddress
}

Write-Status "Computer IP: $ip" "SUCCESS"

# Update .env
$envPath = "$FrontendDir\.env"
$envContent = Get-Content $envPath -Raw
$envContent = $envContent -replace 'API_BASE_URL=.*', "API_BASE_URL=http://$($ip):3000"
Set-Content -Path $envPath -Value $envContent -Encoding UTF8

Write-Status "Updated .env with IP: $ip" "SUCCESS"

# =============================================================================
# KILL EXISTING PROCESSES
# =============================================================================
Write-Host "`n🔥 CLEANING UP EXISTING PROCESSES" -ForegroundColor Yellow

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
& $adbPath kill-server -ErrorAction SilentlyContinue
Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2
Write-Status "Cleanup complete" "SUCCESS"

# =============================================================================
# TERMINAL 1: START BACKEND
# =============================================================================
Write-Host "`n🔌 OPENING TERMINAL 1: BACKEND SERVER" -ForegroundColor Yellow

$backendScript = @"
Write-Host '================================' -ForegroundColor Green
Write-Host 'VisaBuddy Backend Server' -ForegroundColor Green
Write-Host '================================`n' -ForegroundColor Green

Set-Location '$BackendDir'

Write-Host 'Installing backend dependencies...' -ForegroundColor Cyan
npm install --silent

Write-Host 'Starting backend server...' -ForegroundColor Cyan
npm run dev

Write-Host 'Backend stopped' -ForegroundColor Yellow
Read-Host 'Press Enter to close this terminal'
"@

$tempBackendScript = "$env:TEMP\start_backend_temp.ps1"
Set-Content -Path $tempBackendScript -Value $backendScript -Encoding UTF8

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript

Write-Status "Backend Terminal opened (Terminal 1)" "SUCCESS"
Write-Status "Waiting 5 seconds for backend to start..." "INFO"
Start-Sleep -Seconds 5

# =============================================================================
# TERMINAL 2: START METRO BUNDLER
# =============================================================================
Write-Host "`n📱 OPENING TERMINAL 2: METRO BUNDLER" -ForegroundColor Yellow

$metroScript = @"
Write-Host '================================' -ForegroundColor Magenta
Write-Host 'VisaBuddy Metro Bundler' -ForegroundColor Magenta
Write-Host '================================`n' -ForegroundColor Magenta

Set-Location '$FrontendDir'

Write-Host 'Starting Metro Bundler...' -ForegroundColor Cyan
Write-Host 'DO NOT close this terminal while building!' -ForegroundColor Yellow
npm run metro

Write-Host 'Metro stopped' -ForegroundColor Yellow
Read-Host 'Press Enter to close this terminal'
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $metroScript

Write-Status "Metro Bundler Terminal opened (Terminal 2)" "SUCCESS"
Write-Status "Waiting 8 seconds for Metro to start..." "INFO"
Start-Sleep -Seconds 8

# =============================================================================
# TERMINAL 3: BUILD AND DEPLOY
# =============================================================================
Write-Host "`n📲 OPENING TERMINAL 3: BUILD & DEPLOY" -ForegroundColor Yellow

$buildScript = @"
Write-Host '================================' -ForegroundColor Cyan
Write-Host 'VisaBuddy Build for Device' -ForegroundColor Cyan
Write-Host '================================`n' -ForegroundColor Cyan

Set-Location '$FrontendDir'

Write-Host 'Building and deploying to device...' -ForegroundColor Yellow
Write-Host 'This takes 3-5 minutes on first build' -ForegroundColor Yellow
Write-Host 'Keep this terminal and Terminal 2 (Metro) OPEN!' -ForegroundColor Yellow
Write-Host ''

Write-Host 'Command: npx react-native run-android --no-packager' -ForegroundColor Gray
npx react-native run-android --no-packager

if (`$LASTEXITCODE -eq 0) {
    Write-Host ''
    Write-Host '✅ BUILD SUCCESSFUL!' -ForegroundColor Green
    Write-Host 'App should appear on device in 10-15 seconds' -ForegroundColor Green
    Write-Host 'Keep Metro Bundler running in Terminal 2' -ForegroundColor Yellow
} else {
    Write-Host ''
    Write-Host '❌ BUILD FAILED' -ForegroundColor Red
    Write-Host 'Check Terminal 2 (Metro) for errors' -ForegroundColor Yellow
}

Write-Host ''
Read-Host 'Press Enter when done testing (or keep open for hot reload)'
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $buildScript

# =============================================================================
# SUMMARY
# =============================================================================
Write-Host "`n✅ ALL TERMINALS OPENED" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green

Write-Host "📌 TERMINAL LAYOUT:" -ForegroundColor Cyan
Write-Host "  Terminal 1: Backend Server (http://$($ip):3000)" -ForegroundColor Green
Write-Host "  Terminal 2: Metro Bundler (KEEP OPEN!)" -ForegroundColor Magenta
Write-Host "  Terminal 3: Build & Deploy (running now)" -ForegroundColor Cyan

Write-Host "`n⏱️ TIMELINE:" -ForegroundColor Yellow
Write-Host "  • 0-5 sec:    Backend starting..." -ForegroundColor White
Write-Host "  • 5-13 sec:   Metro Bundler starting..." -ForegroundColor White
Write-Host "  • 13+ sec:    Android build starting (3-5 min)" -ForegroundColor White
Write-Host "  • Completion: App appears on device in 10-15 sec" -ForegroundColor White

Write-Host "`n🎯 SUCCESS INDICATORS:" -ForegroundColor Green
Write-Host "  ✓ Terminal 1 shows: 'Uvicorn running on'" -ForegroundColor White
Write-Host "  ✓ Terminal 2 shows: 'Metro Bundler is listening on'" -ForegroundColor White
Write-Host "  ✓ Terminal 3 shows: 'BUILD SUCCESSFUL' or 'Installed and running'" -ForegroundColor White
Write-Host "  ✓ Device shows VisaBuddy login screen" -ForegroundColor White

Write-Host "`n💡 KEEPING TERMINALS ORGANIZED:" -ForegroundColor Cyan
Write-Host "  • DON'T close Terminals 1 or 2 during testing" -ForegroundColor Yellow
Write-Host "  • Use hot reload: Save file changes = auto-reload on device" -ForegroundColor Yellow
Write-Host "  • To rebuild: Close Terminal 3, fix issues, rerun this script" -ForegroundColor Yellow
Write-Host "  • To stop everything: Ctrl+C in each terminal" -ForegroundColor Yellow

Write-Host "`n🆘 TROUBLESHOOTING:" -ForegroundColor Yellow
Write-Host "  If build fails:" -ForegroundColor White
Write-Host "    1. Check Terminal 2 (Metro) for bundler errors" -ForegroundColor Gray
Write-Host "    2. Check Terminal 1 (Backend) for API errors" -ForegroundColor Gray
Write-Host "    3. Run: FIX_ANDROID_BUILD_PERMANENTLY.ps1" -ForegroundColor Gray
Write-Host "    4. Then rerun this script" -ForegroundColor Gray

Write-Host "`n🔗 TEST CREDENTIALS:" -ForegroundColor Cyan
Write-Host "  Email: test@visabuddy.com" -ForegroundColor White
Write-Host "  Password: Test123!" -ForegroundColor White

Write-Host "`n📚 CHECK PROGRESS IN:" -ForegroundColor Gray
Write-Host "  Terminal 2 (Metro): Real-time bundling status" -ForegroundColor Gray
Write-Host "  Terminal 1 (Backend): API requests as you use app" -ForegroundColor Gray

Read-Host "`nPress Enter to close this window (terminals keep running)"