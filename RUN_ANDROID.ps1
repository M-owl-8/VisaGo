#!/usr/bin/env pwsh

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  VisaBuddy - Android Test Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "[1/3] Checking prerequisites..." -ForegroundColor Yellow
$nodeVersion = node --version
$npmVersion = npm --version
$pythonVersion = python --version
Write-Host "  Node.js: $nodeVersion"
Write-Host "  npm: $npmVersion"
Write-Host "  Python: $pythonVersion"
Write-Host ""

# Check dependencies
Write-Host "[2/3] Checking dependencies..." -ForegroundColor Yellow

# Backend
if (Test-Path "c:\work\VisaBuddy\apps\backend\node_modules") {
    Write-Host "  Backend: OK" -ForegroundColor Green
} else {
    Write-Host "  Backend: Installing..." -ForegroundColor Yellow
    Set-Location "c:\work\VisaBuddy\apps\backend"
    npm install --legacy-peer-deps
}

# Frontend
if (Test-Path "c:\work\VisaBuddy\apps\frontend\node_modules") {
    Write-Host "  Frontend: OK" -ForegroundColor Green
} else {
    Write-Host "  Frontend: Installing..." -ForegroundColor Yellow
    Set-Location "c:\work\VisaBuddy\apps\frontend"
    npm install --legacy-peer-deps
}

Write-Host ""
Write-Host "[3/3] Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  NEXT STEPS" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Open 3 SEPARATE PowerShell terminals and run:" -ForegroundColor Cyan
Write-Host ""
Write-Host "TERMINAL 1 - Backend Server" -ForegroundColor Yellow
Write-Host '  Set-Location "c:\work\VisaBuddy\apps\backend"' -ForegroundColor Gray
Write-Host "  npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "TERMINAL 2 - AI Service" -ForegroundColor Yellow
Write-Host '  Set-Location "c:\work\VisaBuddy\apps\ai-service"' -ForegroundColor Gray
Write-Host "  python -m uvicorn main:app --reload --port 8001" -ForegroundColor Gray
Write-Host ""
Write-Host "TERMINAL 3 - Android Emulator" -ForegroundColor Yellow
Write-Host '  Set-Location "c:\work\VisaBuddy\apps\frontend"' -ForegroundColor Gray
Write-Host "  npm run android" -ForegroundColor Gray
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "  1. Make sure PostgreSQL is running at localhost:5432" -ForegroundColor Gray
Write-Host "  2. Start Android emulator BEFORE Terminal 3" -ForegroundColor Gray
Write-Host "  3. Wait 15-30 sec after Terminal 1 starts" -ForegroundColor Gray
Write-Host "  4. Terminal 3 will take 2-3 min on first build" -ForegroundColor Gray
Write-Host ""