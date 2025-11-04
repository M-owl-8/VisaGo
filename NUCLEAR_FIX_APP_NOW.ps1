#!/usr/bin/env pwsh
# VISABUDDY - NUCLEAR RESET AND FIX

Write-Host "VISABUDDY - NUCLEAR RESET (Complete Fix)" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

$ProjectRoot = "c:\work\VisaBuddy"
$FrontendDir = "$ProjectRoot\apps\frontend"
$BackendDir = "$ProjectRoot\apps\backend"

# Kill Process by Port
function Kill-ProcessByPort {
    param([int]$Port)
    try {
        $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
        if ($process) {
            Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
            Write-Host "Killed process on port $Port" -ForegroundColor Green
        }
    } catch {
        # Ignore
    }
}

# PHASE 1: Kill all processes
Write-Host "PHASE 1 - Killing all Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Kill-ProcessByPort -Port 8081
Kill-ProcessByPort -Port 3000
Kill-ProcessByPort -Port 3001
Write-Host "All processes killed" -ForegroundColor Green
Write-Host ""

# PHASE 2: Clear caches
Write-Host "PHASE 2 - Clearing caches..." -ForegroundColor Yellow

$metroCachePath = "$env:LOCALAPPDATA\.metro"
if (Test-Path $metroCachePath) {
    Remove-Item -Recurse -Force -Path $metroCachePath -ErrorAction SilentlyContinue
    Write-Host "Metro cache cleared" -ForegroundColor Green
}

$gradleCache = "$env:USERPROFILE\.gradle"
if (Test-Path $gradleCache) {
    Remove-Item -Recurse -Force -Path "$gradleCache\modules-2" -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force -Path "$gradleCache\build-module-metadata" -ErrorAction SilentlyContinue
    Write-Host "Gradle cache cleared" -ForegroundColor Green
}

Write-Host ""

# PHASE 3: Reset frontend
Write-Host "PHASE 3 - Resetting frontend dependencies..." -ForegroundColor Yellow

Set-Location $FrontendDir

$nodeModulesPath = "$FrontendDir\node_modules"
if (Test-Path $nodeModulesPath) {
    Write-Host "Removing node_modules..." -ForegroundColor Gray
    Remove-Item -Recurse -Force -Path $nodeModulesPath -ErrorAction SilentlyContinue
    Write-Host "node_modules removed" -ForegroundColor Green
}

if (Test-Path "$FrontendDir\package-lock.json") {
    Remove-Item -Force -Path "$FrontendDir\package-lock.json" -ErrorAction SilentlyContinue
    Write-Host "package-lock.json removed" -ForegroundColor Green
}

Write-Host ""

# PHASE 4: Fresh install
Write-Host "PHASE 4 - Installing fresh dependencies..." -ForegroundColor Yellow
Write-Host "This will take 2-3 minutes..." -ForegroundColor Cyan
Write-Host ""

npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed! Retrying..." -ForegroundColor Yellow
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "npm install still failed!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Dependencies installed" -ForegroundColor Green
Write-Host ""

# PHASE 5: Clear emulator
Write-Host "PHASE 5 - Clearing emulator app data..." -ForegroundColor Yellow

$adbPath = "$env:ANDROID_HOME\platform-tools\adb.exe"
$devices = & $adbPath devices | Select-String "emulator"

if ($devices) {
    Write-Host "Found emulator device" -ForegroundColor Green
    & $adbPath shell pm clear com.visabuddy.app 2>$null
    & $adbPath shell pm clear com.facebook.react.devsupport 2>$null
    & $adbPath uninstall com.visabuddy.app 2>$null
    Write-Host "Emulator app data cleared" -ForegroundColor Green
}

Write-Host ""

# PHASE 6: Start Expo server
Write-Host "PHASE 6 - Starting Expo development server..." -ForegroundColor Yellow
Write-Host ""

Set-Location $FrontendDir

Write-Host "EXPO SERVER STARTING" -ForegroundColor Cyan
Write-Host "When you see: Loaded dev server at ..." -ForegroundColor Green
Write-Host "Press R R on the emulator to reload the app" -ForegroundColor Yellow
Write-Host ""

npx expo start --android --reset-cache --localhost