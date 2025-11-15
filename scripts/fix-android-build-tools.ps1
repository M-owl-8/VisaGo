# ============================================================================
# Fix Android Build Tools 34.0.0 Corruption
# ============================================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "     Fix Android Build Tools 34.0.0                                       " -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

$buildToolsPath = "$env:LOCALAPPDATA\Android\Sdk\build-tools\34.0.0"

# Check if build tools directory exists
if (Test-Path $buildToolsPath) {
    Write-Host "Found Build Tools 34.0.0 at: $buildToolsPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Checking for AAPT..." -ForegroundColor Yellow
    
    $aaptPath = Join-Path $buildToolsPath "aapt.exe"
    if (-not (Test-Path $aaptPath)) {
        Write-Host "[ERROR] AAPT is missing! Build Tools are corrupted." -ForegroundColor Red
        Write-Host ""
    } else {
        Write-Host "[OK] AAPT found" -ForegroundColor Green
    }
} else {
    Write-Host "[WARN] Build Tools 34.0.0 not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Attempting to fix using sdkmanager..." -ForegroundColor Cyan
Write-Host ""

# Try to find sdkmanager in common locations
$sdkManagerPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat",
    "$env:LOCALAPPDATA\Android\Sdk\tools\bin\sdkmanager.bat",
    "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat",
    "$env:ANDROID_HOME\tools\bin\sdkmanager.bat"
)

$sdkManager = $null
foreach ($path in $sdkManagerPaths) {
    if (Test-Path $path) {
        $sdkManager = $path
        Write-Host "[OK] Found sdkmanager at: $path" -ForegroundColor Green
        break
    }
}

if ($null -eq $sdkManager) {
    Write-Host "[ERROR] sdkmanager not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix manually using Android Studio:" -ForegroundColor Yellow
    Write-Host "  1. Open Android Studio" -ForegroundColor White
    Write-Host "  2. Go to: Tools > SDK Manager" -ForegroundColor White
    Write-Host "  3. In SDK Tools tab:" -ForegroundColor White
    Write-Host "     - Uncheck 'Android SDK Build-Tools 34.0.0'" -ForegroundColor White
    Write-Host "     - Click 'Apply' to remove" -ForegroundColor White
    Write-Host "     - Check 'Android SDK Build-Tools 34.0.0' again" -ForegroundColor White
    Write-Host "     - Click 'Apply' to reinstall" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Uninstall corrupted build tools
Write-Host ""
Write-Host "Step 1: Uninstalling corrupted Build Tools 34.0.0..." -ForegroundColor Yellow
Write-Host "(This may take a few minutes)" -ForegroundColor Gray

try {
    $uninstallOutput = & $sdkManager --uninstall "build-tools;34.0.0" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Build Tools 34.0.0 uninstalled" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Uninstall may have had issues, continuing anyway..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARN] Uninstall failed: $_" -ForegroundColor Yellow
    Write-Host "Continuing with reinstall..." -ForegroundColor Gray
}

# Wait a bit
Start-Sleep -Seconds 2

# Reinstall build tools
Write-Host ""
Write-Host "Step 2: Reinstalling Build Tools 34.0.0..." -ForegroundColor Yellow
Write-Host "(This will download ~100MB and may take 5-10 minutes)" -ForegroundColor Gray

try {
    # Accept licenses first
    Write-Host "Accepting licenses..." -ForegroundColor Gray
    & $sdkManager --licenses | Out-Null
    
    # Install build tools
    $installOutput = & $sdkManager "build-tools;34.0.0" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Build Tools 34.0.0 reinstalled successfully!" -ForegroundColor Green
        
        # Verify AAPT exists
        $aaptPath = Join-Path $buildToolsPath "aapt.exe"
        if (Test-Path $aaptPath) {
            Write-Host "[OK] AAPT verified at: $aaptPath" -ForegroundColor Green
        } else {
            Write-Host "[WARN] AAPT still not found. Try restarting Android Studio." -ForegroundColor Yellow
        }
    } else {
        Write-Host "[ERROR] Reinstall failed. Please use Android Studio method." -ForegroundColor Red
        Write-Host ""
        Write-Host "Manual fix:" -ForegroundColor Yellow
        Write-Host "  1. Open Android Studio" -ForegroundColor White
        Write-Host "  2. Tools > SDK Manager > SDK Tools" -ForegroundColor White
        Write-Host "  3. Uncheck and recheck 'Android SDK Build-Tools 34.0.0'" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "[ERROR] Reinstall failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please use Android Studio to fix this manually." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "     Fix Complete                                                          " -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[OK] Android Build Tools 34.0.0 should now be fixed!" -ForegroundColor Green
Write-Host ""
Write-Host "Try building again:" -ForegroundColor Yellow
Write-Host "  cd apps\frontend" -ForegroundColor White
Write-Host "  npm run android" -ForegroundColor White
Write-Host ""








