#!/usr/bin/env pwsh
# VisaBuddy - Start & Test Script
# Automatically starts backend, frontend, and runs on Android

Write-Host "🚀 VisaBuddy - Run, Test & Share" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Function to check if command exists
function Test-CommandExists {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Verify prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-CommandExists node)) {
    Write-Host "❌ Node.js not found. Please install Node.js >= 20" -ForegroundColor Red
    exit 1
}

if (-not (Test-CommandExists npm)) {
    Write-Host "❌ npm not found. Please install npm" -ForegroundColor Red
    exit 1
}

if (-not (Test-CommandExists eas)) {
    Write-Host "⚠️  EAS CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g eas-cli
}

Write-Host "✅ All prerequisites found" -ForegroundColor Green
Write-Host ""

# Start backend
Write-Host "🔧 Starting Backend Server..." -ForegroundColor Cyan
Write-Host "📍 Location: apps/backend" -ForegroundColor Gray

$backendDir = "c:\work\VisaBuddy\apps\backend"
Set-Location $backendDir

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    npm install | Out-Null
}

# Start backend in new PowerShell window
Write-Host "Starting backend in new terminal..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; npm run dev" -PassThru | Out-Null

Write-Host "⏳ Waiting 3 seconds for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Verify backend is running
Write-Host "🔍 Verifying backend..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/status" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend is running!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Backend might still be starting... continuing..." -ForegroundColor Yellow
}

Write-Host ""

# Start frontend
Write-Host "📱 Starting Frontend (Metro Bundler)..." -ForegroundColor Cyan
Write-Host "📍 Location: apps/frontend" -ForegroundColor Gray

$frontendDir = "c:\work\VisaBuddy\apps\frontend"
Set-Location $frontendDir

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install | Out-Null
}

# Start metro bundler in new PowerShell window
Write-Host "Starting Metro bundler in new terminal..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; npm run dev" -PassThru | Out-Null

Write-Host "⏳ Waiting 10 seconds for Metro to compile..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""

# Run on Android
Write-Host "🎮 Running on Android Emulator..." -ForegroundColor Cyan

# Check if emulator is running
Write-Host "🔍 Checking Android Emulator..." -ForegroundColor Gray
$devices = adb devices 2>$null | Select-Object -Skip 1 | Where-Object { $_ -ne "" }

if ($devices.Count -eq 0) {
    Write-Host "❌ No Android device/emulator found!" -ForegroundColor Red
    Write-Host "   Please:" -ForegroundColor Yellow
    Write-Host "   1. Start Android Emulator (AVD Manager)" -ForegroundColor Yellow
    Write-Host "   2. Wait for it to fully load" -ForegroundColor Yellow
    Write-Host "   3. Run this script again" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Android device found: $($devices[0])" -ForegroundColor Green

# Build and run
Write-Host ""
Write-Host "⏳ Building and installing app (this may take 2-5 minutes)..." -ForegroundColor Yellow
npm run android

Write-Host ""
Write-Host "✅ App should now be launching on your emulator!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Wait for app to open" -ForegroundColor Gray
Write-Host "   2. Test features (signup, visa selection, documents, chat)" -ForegroundColor Gray
Write-Host "   3. When ready to share, run: eas build --platform android --profile preview" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Full guide: RUN_TEST_AND_SHARE_GUIDE.md" -ForegroundColor Green