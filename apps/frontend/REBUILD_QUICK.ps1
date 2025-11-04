#!/usr/bin/env pwsh
# Quick rebuild after fixes

Write-Host "Quick rebuild for Android..." -ForegroundColor Cyan

$FrontendDir = "c:\work\VisaBuddy\apps\frontend"

# Clear Android build directory only
Write-Host "Clearing Android build cache..." -ForegroundColor Yellow
Remove-Item -Path "$FrontendDir\android\app\build" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Cache cleared" -ForegroundColor Green

# Build for Android
Write-Host "Building..." -ForegroundColor Yellow
Set-Location $FrontendDir
npm run android