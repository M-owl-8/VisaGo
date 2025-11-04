#!/usr/bin/env powershell

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

# Colors for output
$Success = "Green"
$Warning = "Yellow"
$ErrorColor = "Red"
$Info = "Cyan"

function Write-Header {
    param([string]$text)
    Write-Host "`n================================" -ForegroundColor $Info
    Write-Host $text -ForegroundColor $Info
    Write-Host "================================" -ForegroundColor $Info
}

function Write-Success {
    param([string]$text)
    Write-Host "[OK] $text" -ForegroundColor $Success
}

function Write-Error-Custom {
    param([string]$text)
    Write-Host "[ERROR] $text" -ForegroundColor $ErrorColor
}

Write-Header "VisaBuddy Backend and Android Setup"

# Get paths
$backendPath = "c:\work\VisaBuddy\apps\backend"
$frontendPath = "c:\work\VisaBuddy\apps\frontend"

# 1. Check backend dependencies
Write-Header "Step 1: Backend Dependencies"
if (Test-Path "$backendPath\node_modules") {
    Write-Success "Backend dependencies already installed"
} else {
    Write-Host "Installing backend dependencies..." -ForegroundColor $Info
    Set-Location $backendPath
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Backend dependencies installed"
    } else {
        Write-Error-Custom "Failed to install backend dependencies"
        exit 1
    }
}

# 2. Check frontend dependencies
Write-Header "Step 2: Frontend Dependencies"
if (Test-Path "$frontendPath\node_modules") {
    Write-Success "Frontend dependencies already installed"
} else {
    Write-Host "Installing frontend dependencies..." -ForegroundColor $Info
    Set-Location $frontendPath
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Frontend dependencies installed"
    } else {
        Write-Error-Custom "Failed to install frontend dependencies"
        exit 1
    }
}

# 3. Seed Database
Write-Header "Step 3: Database Setup"
Write-Host "Seeding database with test data..." -ForegroundColor $Info
Set-Location $backendPath
npm run db:seed
if ($LASTEXITCODE -eq 0) {
    Write-Success "Database seeded successfully"
} else {
    Write-Warning "Database seed warning (may have already been seeded)"
}

# 4. Start Backend
Write-Header "Step 4: Backend Server"
Write-Host "Starting backend server on port 3000..." -ForegroundColor $Info
Write-Host "Note: Backend will run in a new PowerShell window" -ForegroundColor $Warning

$backendScript = @"
Set-Location "$backendPath"
Write-Host "Starting backend..." -ForegroundColor Green
npm run dev
"@

$backendScriptPath = "$backendPath\TEMP_START.ps1"
$backendScript | Out-File -FilePath $backendScriptPath -Encoding UTF8

$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$backendScriptPath'" -PassThru

Write-Success "Backend started in new window (PID: $($backendProcess.Id))"
Write-Host "Waiting 5 seconds for backend to initialize..." -ForegroundColor $Info
Start-Sleep -Seconds 5

# 5. Test Backend
Write-Header "Step 5: Backend Health Check"
$maxAttempts = 10
$attempt = 0
$backendHealthy = $false

while ($attempt -lt $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Success "Backend is healthy on port 3000"
            $backendHealthy = $true
            break
        }
    } catch {
        $attempt++
        if ($attempt -lt $maxAttempts) {
            Write-Host "  Waiting... (attempt $attempt/$maxAttempts)" -ForegroundColor $Warning
            Start-Sleep -Seconds 2
        }
    }
}

if (-not $backendHealthy) {
    Write-Error-Custom "Backend is not responding. Check the backend window."
}

# 6. Start Frontend Bundler
Write-Header "Step 6: Frontend Metro Bundler"
Write-Host "Starting metro bundler..." -ForegroundColor $Info
Write-Host "Note: Metro bundler will run in a new PowerShell window" -ForegroundColor $Warning

$frontendScript = @"
Set-Location "$frontendPath"
Write-Host "Starting metro bundler..." -ForegroundColor Green
npm run dev
"@

$frontendScriptPath = "$frontendPath\TEMP_START.ps1"
$frontendScript | Out-File -FilePath $frontendScriptPath -Encoding UTF8

$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$frontendScriptPath'" -PassThru

Write-Success "Metro bundler started in new window (PID: $($frontendProcess.Id))"
Write-Host "Waiting 5 seconds for bundler..." -ForegroundColor $Info
Start-Sleep -Seconds 5

# 7. Launch Android
Write-Header "Step 7: Android App Launch"
Write-Host "Launching Android app..." -ForegroundColor $Info

Set-Location $frontendPath
npm run android

# Cleanup
Remove-Item -Force $backendScriptPath -ErrorAction SilentlyContinue
Remove-Item -Force $frontendScriptPath -ErrorAction SilentlyContinue

Write-Header "Setup Complete!"
Write-Host "App is now running:" -ForegroundColor $Info
Write-Host "  Backend: http://localhost:3000" -ForegroundColor $Success
Write-Host "  Database: PostgreSQL (Supabase)" -ForegroundColor $Success
Write-Host "  Frontend: React Native (on emulator)" -ForegroundColor $Success
Write-Host "" -ForegroundColor $Info
Write-Host "Two new PowerShell windows should be open:" -ForegroundColor $Info
Write-Host "  1. Backend server (PID: $($backendProcess.Id))" -ForegroundColor $Success
Write-Host "  2. Metro bundler (PID: $($frontendProcess.Id))" -ForegroundColor $Success
Write-Host "" -ForegroundColor $Info