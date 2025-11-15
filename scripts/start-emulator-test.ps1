# ============================================================================
# VisaBuddy - Start Emulator Test Script
# ============================================================================
# This script helps you start the app on Android emulator (Pixel 6)

Write-Host ""
Write-Host "VisaBuddy - Start on Emulator" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if emulator is running
Write-Host "Checking Android emulator..." -ForegroundColor Yellow
$devices = adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "device$" }

if ($devices.Count -eq 0) {
    Write-Host "No Android emulator detected!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Open Android Studio" -ForegroundColor White
    Write-Host "2. Go to Tools -> Device Manager" -ForegroundColor White
    Write-Host "3. Start your Pixel 6 emulator" -ForegroundColor White
    Write-Host "4. Wait for it to fully boot" -ForegroundColor White
    Write-Host "5. Run this script again" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "Emulator detected: $($devices.Count) device(s)" -ForegroundColor Green
Write-Host ""

# Check if backend .env exists
if (-not (Test-Path "apps\backend\.env")) {
    Write-Host "Backend .env not found!" -ForegroundColor Yellow
    Write-Host "   Run: .\scripts\setup-emulator-env.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Check if frontend .env exists
if (-not (Test-Path "apps\frontend\.env")) {
    Write-Host "Frontend .env not found!" -ForegroundColor Yellow
    Write-Host "   Run: .\scripts\setup-emulator-env.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Check if backend dependencies are installed
if (-not (Test-Path "apps\backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location "apps\backend"
    npm install
    Set-Location "..\.."
}

# Check if frontend dependencies are installed
if (-not (Test-Path "apps\frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location "apps\frontend"
    npm install
    Set-Location "..\.."
}

# Check if database exists
if (-not (Test-Path "apps\backend\prisma\dev.db")) {
    Write-Host "Setting up database..." -ForegroundColor Yellow
    Set-Location "apps\backend"
    npm run db:generate
    npm run db:migrate
    Set-Location "..\.."
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Start Backend Server (Terminal 1):" -ForegroundColor Yellow
Write-Host "   cd apps\backend" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "2. Start Frontend on Emulator (Terminal 2):" -ForegroundColor Yellow
Write-Host "   cd apps\frontend" -ForegroundColor White
Write-Host "   npm run android" -ForegroundColor White
Write-Host ""
Write-Host "Tip: Open two PowerShell terminals and run the commands above" -ForegroundColor Gray
Write-Host ""
Write-Host "First build takes 10-20 minutes. Be patient!" -ForegroundColor Gray
Write-Host ""
