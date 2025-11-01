#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔═════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         VisaBuddy - Android Emulator Launch Script              ║" -ForegroundColor Cyan
Write-Host "║                   Phase 3 - Complete Setup                      ║" -ForegroundColor Cyan
Write-Host "╚═════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BACKEND_PORT = 3000
$AI_SERVICE_PORT = 8001
$FRONTEND_BUNDLE_PORT = 8081

# Color definitions
$HeaderColor = "Green"
$SuccessColor = "Green"
$WarningColor = "Yellow"
$ErrorColor = "Red"
$InfoColor = "Cyan"

function Show-Status {
    param([string]$message, [string]$color = "White")
    Write-Host "  ▶ $message" -ForegroundColor $color
}

function Show-Section {
    param([string]$title)
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $HeaderColor
    Write-Host "  $title" -ForegroundColor $HeaderColor
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $HeaderColor
    Write-Host ""
}

function Check-Prerequisites {
    Show-Section "1️⃣  Checking Prerequisites"
    
    $allGood = $true
    
    # Check Node.js
    Show-Status "Checking Node.js..."
    try {
        $nodeVersion = node --version
        Show-Status "✓ Node.js: $nodeVersion" $SuccessColor
    } catch {
        Show-Status "✗ Node.js not found!" $ErrorColor
        $allGood = $false
    }
    
    # Check npm
    Show-Status "Checking npm..."
    try {
        $npmVersion = npm --version
        Show-Status "✓ npm: $npmVersion" $SuccessColor
    } catch {
        Show-Status "✗ npm not found!" $ErrorColor
        $allGood = $false
    }
    
    # Check Python
    Show-Status "Checking Python..."
    try {
        $pythonVersion = python --version
        Show-Status "✓ Python: $pythonVersion" $SuccessColor
    } catch {
        Show-Status "✗ Python not found!" $ErrorColor
        $allGood = $false
    }
    
    # Check Android emulator
    Show-Status "Checking Android emulator..."
    $adbPath = "C:\Android\sdk\platform-tools\adb.exe"
    if (Test-Path $adbPath) {
        try {
            $devices = & $adbPath devices
            if ($devices -like "*emulator*") {
                Show-Status "✓ Android emulator found" $SuccessColor
            } else {
                Show-Status "⚠ No emulator running - start one in Android Studio" $WarningColor
                Show-Status "  Run: emulator -avd your_avd_name" $InfoColor
            }
        } catch {
            Show-Status "⚠ ADB error - make sure Android Studio is installed" $WarningColor
        }
    } else {
        Show-Status "⚠ Android SDK not found at default location" $WarningColor
        Show-Status "  Make sure Android Studio is installed" $InfoColor
    }
    
    return $allGood
}

function Check-Dependencies {
    Show-Section "2️⃣  Checking Node Dependencies"
    
    # Backend
    Show-Status "Backend node_modules..."
    if (Test-Path "c:\work\VisaBuddy\apps\backend\node_modules") {
        Show-Status "✓ Backend dependencies installed" $SuccessColor
    } else {
        Show-Status "✗ Backend dependencies missing!" $WarningColor
        Show-Status "Installing backend dependencies..."
        Set-Location "c:\work\VisaBuddy\apps\backend"
        npm install --legacy-peer-deps
        Show-Status "✓ Backend dependencies installed" $SuccessColor
    }
    
    # Frontend
    Show-Status "Frontend node_modules..."
    if (Test-Path "c:\work\VisaBuddy\apps\frontend\node_modules") {
        Show-Status "✓ Frontend dependencies installed" $SuccessColor
    } else {
        Show-Status "⏳ Frontend dependencies still installing, please wait..."
        $timeout = 0
        while (-not (Test-Path "c:\work\VisaBuddy\apps\frontend\node_modules") -and $timeout -lt 300) {
            Start-Sleep -Seconds 5
            $timeout += 5
        }
        if (Test-Path "c:\work\VisaBuddy\apps\frontend\node_modules") {
            Show-Status "✓ Frontend dependencies installed" $SuccessColor
        } else {
            Show-Status "✗ Frontend dependencies still installing..." $WarningColor
            Show-Status "  Installing now..." $InfoColor
            Set-Location "c:\work\VisaBuddy\apps\frontend"
            npm install --legacy-peer-deps
            Show-Status "✓ Frontend dependencies installed" $SuccessColor
        }
    }
    
    Write-Host ""
}

function Show-Instructions {
    Show-Section "3️⃣  Next: Start Services in Separate Terminals"
    
    Write-Host "You need to open 3 PowerShell terminals and run these commands in each:" -ForegroundColor $InfoColor
    Write-Host ""
    
    Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║ TERMINAL 1 - Backend Server (Port $BACKEND_PORT)                         ║" -ForegroundColor Yellow
    Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host '  Set-Location "c:\work\VisaBuddy\apps\backend"' -ForegroundColor Gray
    Write-Host "  npm run dev" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║ TERMINAL 2 - AI Service (Port $AI_SERVICE_PORT)                        ║" -ForegroundColor Yellow
    Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host '  Set-Location "c:\work\VisaBuddy\apps\ai-service"' -ForegroundColor Gray
    Write-Host "  python -m uvicorn main:app --reload --port $AI_SERVICE_PORT" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║ TERMINAL 3 - Frontend (React Native on Android)               ║" -ForegroundColor Yellow
    Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host '  Set-Location "c:\work\VisaBuddy\apps\frontend"' -ForegroundColor Gray
    Write-Host "  npm run android" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
    Write-Host ""
    Write-Host "IMPORTANT NOTES:" -ForegroundColor $WarningColor
    Write-Host ""
    Write-Host "1. Database Setup:" -ForegroundColor White
    Write-Host "   - PostgreSQL must be running at localhost:5432" -ForegroundColor Gray
    Write-Host "   - Database: visabuddy_dev" -ForegroundColor Gray
    Write-Host "   - User: user, Password: password" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "2. Android Emulator:" -ForegroundColor White
    Write-Host "   - Launch Android Studio -> Virtual Device Manager" -ForegroundColor Gray
    Write-Host "   - Start an emulator BEFORE running Terminal 3" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "3. Wait Times:" -ForegroundColor White
    Write-Host "   - Terminal 1 (Backend): ~15 seconds" -ForegroundColor Gray
    Write-Host "   - Terminal 2 (AI): ~10 seconds" -ForegroundColor Gray
    Write-Host "   - Terminal 3 (Frontend): 2-3 minutes (first build)" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "4. Testing:" -ForegroundColor White
    Write-Host "   - App will auto-load on emulator" -ForegroundColor Gray
    Write-Host "   - Test login with any email/password" -ForegroundColor Gray
    Write-Host ""
}

function Show-ApiEndpoints {
    Show-Section "4️⃣  API Endpoints (for testing)"
    
    Write-Host "Once all services are running, you can test these endpoints:" -ForegroundColor $InfoColor
    Write-Host ""
    Write-Host "  Health Check:" -ForegroundColor White
    Write-Host "    GET http://localhost:$BACKEND_PORT/health" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Authentication:" -ForegroundColor White
    Write-Host "    POST http://localhost:$BACKEND_PORT/api/auth/register" -ForegroundColor Gray
    Write-Host "    POST http://localhost:$BACKEND_PORT/api/auth/login" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Countries:" -ForegroundColor White
    Write-Host "    GET http://localhost:$BACKEND_PORT/api/countries" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  AI Chat:" -ForegroundColor White
    Write-Host "    POST http://localhost:$BACKEND_PORT/api/chat/send" -ForegroundColor Gray
    Write-Host ""
}

# Main execution
try {
    Check-Prerequisites
    Check-Dependencies
    Show-Instructions
    Show-ApiEndpoints
    
    Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✓ SETUP COMPLETE! Ready to launch app on Android emulator   ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "✗ Error during setup: $_" -ForegroundColor $ErrorColor
    exit 1
}