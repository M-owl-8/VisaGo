#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "  VisaBuddy Phase 3 - Setup" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""

# Check prerequisites
Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Cyan

$nodeVersion = node --version 2>&1
$npmVersion = npm --version 2>&1
$pythonVersion = python --version 2>&1

Write-Host "  Node.js: $nodeVersion"
Write-Host "  npm: $npmVersion"
Write-Host "  Python: $pythonVersion"
Write-Host ""

# Install backend
Write-Host "[2/5] Installing backend dependencies..." -ForegroundColor Cyan
Set-Location "c:\work\VisaBuddy\apps\backend"
npm install --loglevel=error
Write-Host "  Done!" -ForegroundColor Green
Write-Host ""

# Install frontend
Write-Host "[3/5] Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location "c:\work\VisaBuddy\apps\frontend"
npm install --loglevel=error
Write-Host "  Done!" -ForegroundColor Green
Write-Host ""

# Install AI service
Write-Host "[4/5] Installing AI service dependencies..." -ForegroundColor Cyan
Set-Location "c:\work\VisaBuddy\apps\ai-service"
pip install -q -r requirements.txt
Write-Host "  Done!" -ForegroundColor Green
Write-Host ""

# Setup database
Write-Host "[5/5] Setting up database..." -ForegroundColor Cyan
Set-Location "c:\work\VisaBuddy\apps\backend"
npx prisma generate
npx prisma migrate dev --skip-generate
Write-Host "  Done!" -ForegroundColor Green
Write-Host ""

Write-Host "===============================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETE!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps - Open 3 terminals and run:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Terminal 1 - Backend:" -ForegroundColor Cyan
Write-Host "  cd c:\work\VisaBuddy\apps\backend" -ForegroundColor Gray
Write-Host "  npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Terminal 2 - AI Service:" -ForegroundColor Cyan
Write-Host "  cd c:\work\VisaBuddy\apps\ai-service" -ForegroundColor Gray
Write-Host "  python -m uvicorn main:app --reload --port 8001" -ForegroundColor Gray
Write-Host ""
Write-Host "Terminal 3 - Frontend:" -ForegroundColor Cyan
Write-Host "  cd c:\work\VisaBuddy\apps\frontend" -ForegroundColor Gray
Write-Host "  npm start" -ForegroundColor Gray
Write-Host ""