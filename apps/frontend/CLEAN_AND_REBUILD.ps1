#!/usr/bin/env pwsh
# Clean Gradle cache and rebuild

Write-Host "Cleaning Gradle cache and local build files..." -ForegroundColor Cyan

$FrontendDir = "c:\work\VisaBuddy\apps\frontend"
$AndroidDir = "$FrontendDir\android"

# Step 1: Clear Gradle cache
Write-Host "1. Clearing Gradle cache..." -ForegroundColor Yellow
$gradleCache = "$env:USERPROFILE\.gradle"
if (Test-Path $gradleCache) {
    Remove-Item -Path $gradleCache -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   Gradle cache cleared" -ForegroundColor Green
}

# Step 2: Clear Android build directories
Write-Host "2. Clearing Android build directories..." -ForegroundColor Yellow
Remove-Item -Path "$AndroidDir\.gradle" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$AndroidDir\app\build" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$AndroidDir\build" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "   Build directories cleared" -ForegroundColor Green

# Step 3: Clear node_modules
Write-Host "3. Clearing node_modules..." -ForegroundColor Yellow
Remove-Item -Path "$FrontendDir\node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$FrontendDir\package-lock.json" -Force -ErrorAction SilentlyContinue
Write-Host "   node_modules cleared" -ForegroundColor Green

# Step 4: Reinstall dependencies
Write-Host "4. Reinstalling npm dependencies..." -ForegroundColor Yellow
Set-Location $FrontendDir
npm install
Write-Host "   npm install complete" -ForegroundColor Green

# Step 5: Build for Android
Write-Host "5. Building for Android..." -ForegroundColor Yellow
npm run android