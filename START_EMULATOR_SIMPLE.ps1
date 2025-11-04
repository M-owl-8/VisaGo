#!/usr/bin/env pwsh

Write-Host "VisaBuddy - Android Emulator Startup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$ProjectRoot = "c:\work\VisaBuddy"
$BackendDir = "$ProjectRoot\apps\backend"
$FrontendDir = "$ProjectRoot\apps\frontend"
$BackendPort = 3000
$EmulatorName = "Pixel_6"

Write-Host "`n[1] Setting up backend..." -ForegroundColor Yellow
Set-Location $BackendDir

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
    npm install
    Write-Host "Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "Backend dependencies already installed" -ForegroundColor Green
}

npm run db:generate
npm run db:migrate -- --skip-generate

Write-Host "[2] Setting up frontend..." -ForegroundColor Yellow
Set-Location $FrontendDir

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    npm install
    Write-Host "Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "Frontend dependencies already installed" -ForegroundColor Green
}

Write-Host "`n[3] Starting backend server..." -ForegroundColor Yellow

Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*backend*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Set-Location $BackendDir
Write-Host "Backend starting on http://localhost:$BackendPort" -ForegroundColor Cyan

Start-Process powershell -ArgumentList {
    Set-Location "c:\work\VisaBuddy\apps\backend"
    Write-Host "Backend starting..." -ForegroundColor Cyan
    npm run dev
} -NoNewWindow -PassThru | Out-Null

Start-Sleep -Seconds 5

Write-Host "[4] Starting Android emulator..." -ForegroundColor Yellow
$adbPath = "$env:ANDROID_HOME\platform-tools\adb.exe"
$emulatorPath = "$env:ANDROID_HOME\emulator\emulator.exe"

$devices = & $adbPath devices
if ($devices -like "*$EmulatorName*") {
    Write-Host "Emulator $EmulatorName already running" -ForegroundColor Green
} else {
    Write-Host "Starting emulator $EmulatorName..." -ForegroundColor Cyan
    Write-Host "This may take 2-3 minutes..." -ForegroundColor Yellow
    
    Start-Process $emulatorPath -ArgumentList "-avd", $EmulatorName, "-no-snapshot-load" -WindowStyle Hidden
    
    Write-Host "Waiting for emulator to boot..." -ForegroundColor Cyan
    Start-Sleep -Seconds 30
    
    $attempts = 0
    $emulatorRunning = $false
    
    while ($attempts -lt 12) {
        $devices = & $adbPath devices
        if ($devices -like "*$EmulatorName*online*") {
            $emulatorRunning = $true
            break
        }
        $attempts++
        Write-Host "Emulator loading... attempt $attempts" -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
    
    if ($emulatorRunning) {
        Write-Host "Emulator $EmulatorName is running" -ForegroundColor Green
    } else {
        Write-Host "Emulator failed to start" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n[5] Building and running app..." -ForegroundColor Yellow
Set-Location $FrontendDir

Write-Host "Building Android APK and running on emulator..." -ForegroundColor Cyan
Write-Host "This will take 5-10 minutes for first build" -ForegroundColor Yellow

npx react-native run-android

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nApp installed and launched on emulator!" -ForegroundColor Green
} else {
    Write-Host "`nBuild failed. Check errors above" -ForegroundColor Red
    exit 1
}

Write-Host "`n=====================================" -ForegroundColor Green
Write-Host "STARTUP COMPLETE" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

Write-Host "`nBackend: http://localhost:$BackendPort" -ForegroundColor Cyan
Write-Host "Database UI: http://localhost:$BackendPort/studio" -ForegroundColor Cyan
Write-Host "Emulator: $EmulatorName" -ForegroundColor Cyan

Write-Host "`nPress Ctrl+C to stop (services keep running)" -ForegroundColor Yellow