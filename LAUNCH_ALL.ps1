#!/usr/bin/env pwsh

# VisaBuddy Android App - One-Click Launcher
# This script opens all 3 required terminals

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  VisaBuddy - Android Launcher" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# Configuration
$BACKEND_DIR = "c:\work\VisaBuddy\apps\backend"
$AI_DIR = "c:\work\VisaBuddy\apps\ai-service"
$FRONTEND_DIR = "c:\work\VisaBuddy\apps\frontend"

Write-Host "Launching 3 terminals..." -ForegroundColor Yellow
Write-Host ""

# Terminal 1: Backend
Write-Host "1. Starting Backend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$BACKEND_DIR'; npm run dev"
Start-Sleep -Seconds 2

# Terminal 2: AI Service
Write-Host "2. Starting AI Service..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$AI_DIR'; python -m uvicorn main:app --reload --port 8001"
Start-Sleep -Seconds 2

# Terminal 3: Frontend
Write-Host "3. Starting Frontend (Android)..." -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Make sure Android emulator is running FIRST!" -ForegroundColor Yellow
Write-Host "Press ENTER to continue..." -ForegroundColor Yellow
Read-Host

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$FRONTEND_DIR'; npm run android"

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  All terminals launched!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Monitor progress in each terminal:" -ForegroundColor Cyan
Write-Host "  - Terminal 1: Backend starting..." -ForegroundColor Gray
Write-Host "  - Terminal 2: AI service starting..." -ForegroundColor Gray
Write-Host "  - Terminal 3: Building and deploying app..." -ForegroundColor Gray
Write-Host ""
Write-Host "Expected timeline:" -ForegroundColor Cyan
Write-Host "  - 10-15 sec: Backend online" -ForegroundColor Gray
Write-Host "  - 15-20 sec: AI service online" -ForegroundColor Gray
Write-Host "  - 2-3 min: App built and deployed" -ForegroundColor Gray
Write-Host "  - 3-5 min: App visible on emulator" -ForegroundColor Gray
Write-Host ""
Write-Host "Once app is running:" -ForegroundColor Yellow
Write-Host "  - Register: test@example.com / password" -ForegroundColor Gray
Write-Host "  - Explore all features" -ForegroundColor Gray
Write-Host "  - Test multilingual support" -ForegroundColor Gray
Write-Host ""