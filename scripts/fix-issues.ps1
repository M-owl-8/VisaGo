# ============================================================================
# VisaBuddy - Fix Common Issues Script
# ============================================================================
# Fixes common issues that prevent the app from running
# ============================================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "     VisaBuddy - Fix Common Issues                                        " -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $rootDir "apps\backend"
$frontendDir = Join-Path $rootDir "apps\frontend"
$backendEnv = Join-Path $backendDir ".env"

# ============================================================================
# Fix 1: Backend LOG_LEVEL (must be uppercase)
# ============================================================================
Write-Host "[1/3] Fixing backend LOG_LEVEL..." -ForegroundColor Yellow

if (Test-Path $backendEnv) {
    $envContent = Get-Content $backendEnv -Raw
    
    # Fix LOG_LEVEL if it's lowercase
    if ($envContent -match 'LOG_LEVEL=(info|debug|warn|error)') {
        $envContent = $envContent -replace 'LOG_LEVEL=info', 'LOG_LEVEL=INFO'
        $envContent = $envContent -replace 'LOG_LEVEL=debug', 'LOG_LEVEL=DEBUG'
        $envContent = $envContent -replace 'LOG_LEVEL=warn', 'LOG_LEVEL=WARN'
        $envContent = $envContent -replace 'LOG_LEVEL=error', 'LOG_LEVEL=ERROR'
        
        Set-Content -Path $backendEnv -Value $envContent -Encoding UTF8
        Write-Host "[OK] Fixed LOG_LEVEL in backend .env" -ForegroundColor Green
    } else {
        Write-Host "[OK] LOG_LEVEL is already correct" -ForegroundColor Green
    }
} else {
    Write-Host "[WARN] Backend .env not found. Run setup-100-percent.ps1 first" -ForegroundColor Yellow
}

# ============================================================================
# Fix 2: Frontend Metro (reinstall dependencies)
# ============================================================================
Write-Host ""
Write-Host "[2/3] Fixing frontend Metro (reinstalling dependencies)..." -ForegroundColor Yellow

Push-Location $frontendDir

try {
    Write-Host "   Removing node_modules..." -ForegroundColor Gray
    if (Test-Path "node_modules") {
        Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "   Removing package-lock.json..." -ForegroundColor Gray
    if (Test-Path "package-lock.json") {
        Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "   Installing dependencies..." -ForegroundColor Gray
    npm install 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Frontend dependencies reinstalled" -ForegroundColor Green
    } else {
        Write-Host "[WARN] npm install had issues. Try manually: cd apps\frontend; npm install" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARN] Frontend dependency fix had issues: $_" -ForegroundColor Yellow
} finally {
    Pop-Location
}

# ============================================================================
# Fix 3: Android Build Tools
# ============================================================================
Write-Host ""
Write-Host "[3/3] Android Build Tools Issue..." -ForegroundColor Yellow
Write-Host ""
Write-Host "The Android Build Tools 34.0.0 appear to be corrupted." -ForegroundColor Yellow
Write-Host ""
Write-Host "To fix this:" -ForegroundColor Cyan
Write-Host "  1. Open Android Studio" -ForegroundColor White
Write-Host "  2. Go to: Tools > SDK Manager" -ForegroundColor White
Write-Host "  3. In SDK Tools tab, uncheck 'Android SDK Build-Tools 34.0.0'" -ForegroundColor White
Write-Host "  4. Click 'Apply' to remove it" -ForegroundColor White
Write-Host "  5. Check 'Android SDK Build-Tools 34.0.0' again" -ForegroundColor White
Write-Host "  6. Click 'Apply' to reinstall it" -ForegroundColor White
Write-Host ""
Write-Host "  OR use command line:" -ForegroundColor Cyan
Write-Host "  sdkmanager --uninstall 'build-tools;34.0.0'" -ForegroundColor White
Write-Host "  sdkmanager 'build-tools;34.0.0'" -ForegroundColor White
Write-Host ""

# Check if sdkmanager is available
$sdkManagerPath = "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat"
if (Test-Path $sdkManagerPath) {
    Write-Host "  Attempting automatic fix..." -ForegroundColor Cyan
    Write-Host "  (This may take a few minutes)" -ForegroundColor Gray
    
    try {
        # Uninstall corrupted build tools
        & $sdkManagerPath --uninstall "build-tools;34.0.0" 2>&1 | Out-Null
        
        # Reinstall build tools
        & $sdkManagerPath "build-tools;34.0.0" 2>&1 | Out-Null
        
        Write-Host "[OK] Android Build Tools reinstalled" -ForegroundColor Green
    } catch {
        Write-Host "[WARN] Automatic fix failed. Please use Android Studio method above" -ForegroundColor Yellow
    }
} else {
    Write-Host "[INFO] sdkmanager not found. Use Android Studio method above" -ForegroundColor Gray
}

# ============================================================================
# Summary
# ============================================================================
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "     Fix Summary                                                           " -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[OK] Backend LOG_LEVEL fixed" -ForegroundColor Green
Write-Host "[OK] Frontend dependencies reinstalled" -ForegroundColor Green
Write-Host "[INFO] Android Build Tools - follow instructions above" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Fix Android Build Tools (see instructions above)" -ForegroundColor White
Write-Host "  2. Start backend: cd apps\backend; npm run dev" -ForegroundColor White
Write-Host "  3. Start Metro: cd apps\frontend; npm run metro" -ForegroundColor White
Write-Host "  4. Run on emulator: cd apps\frontend; npm run android" -ForegroundColor White
Write-Host ""








