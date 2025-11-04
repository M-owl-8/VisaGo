#!/usr/bin/env pwsh
# =============================================================================
# FINAL VERIFICATION - All systems ready?
# =============================================================================

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           FINAL VERIFICATION - SYSTEMS READY?                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$FrontendDir = "c:\work\VisaBuddy\apps\frontend"
$BackendDir = "c:\work\VisaBuddy\apps\backend"
$allGood = $true

function Write-Check {
    param([string]$Item, [bool]$Passed)
    $symbol = if ($Passed) { "`u{2705}" } else { "`u{274C}" }
    $color = if ($Passed) { "Green" } else { "Red" }
    Write-Host "$symbol $Item" -ForegroundColor $color
}

# Check 1: Frontend dependencies
Write-Host "CHECKING DEPENDENCIES:" -ForegroundColor Yellow
$nodeModulesExist = Test-Path "$FrontendDir\node_modules"
Write-Check "Frontend node_modules installed" $nodeModulesExist
if (-not $nodeModulesExist) { $allGood = $false }

$metroInstalled = Test-Path "$FrontendDir\node_modules\metro"
Write-Check "Metro bundler installed" $metroInstalled
if (-not $metroInstalled) { $allGood = $false }

$rnInstalled = Test-Path "$FrontendDir\node_modules\react-native"
Write-Check "React Native installed" $rnInstalled
if (-not $rnInstalled) { $allGood = $false }

# Check 2: React Native CLI
Write-Host "`nCHECKING REACT NATIVE CLI:" -ForegroundColor Yellow
$rnCli = & react-native --version 2>&1
$rnCliWorks = $LASTEXITCODE -eq 0
Write-Check "react-native CLI available ($rnCli)" $rnCliWorks
if (-not $rnCliWorks) { $allGood = $false }

# Check 3: npm scripts
Write-Host "`nCHECKING NPM SCRIPTS:" -ForegroundColor Yellow
Set-Location $FrontendDir

$metroScript = npm run 2>&1 | Select-String "metro"
Write-Check "npm run metro script defined" ($metroScript.Count -gt 0)

$androidScript = npm run 2>&1 | Select-String "android"
Write-Check "npm run android script defined" ($androidScript.Count -gt 0)

# Check 4: Configuration
Write-Host "`nCHECKING CONFIGURATION:" -ForegroundColor Yellow
$envExists = Test-Path "$FrontendDir\.env"
Write-Check "Frontend .env file exists" $envExists

if ($envExists) {
    $envContent = Get-Content "$FrontendDir\.env"
    $apiUrlConfigured = $envContent | Select-String "API_BASE_URL"
    Write-Check "API_BASE_URL configured" ($apiUrlConfigured.Count -gt 0)
    
    if ($apiUrlConfigured) {
        $apiUrl = $apiUrlConfigured[0].ToString()
        Write-Host "  -> $apiUrl" -ForegroundColor Gray
    }
}

# Check 5: Android setup
Write-Host "`nCHECKING ANDROID SETUP:" -ForegroundColor Yellow
$gradlewExists = Test-Path "$FrontendDir\android\gradlew.bat"
Write-Check "Gradle wrapper installed" $gradlewExists
if (-not $gradlewExists) { $allGood = $false }

$androidSdkExists = $env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)
Write-Check "ANDROID_HOME environment variable set" $androidSdkExists
if ($androidSdkExists) {
    Write-Host "  -> $env:ANDROID_HOME" -ForegroundColor Gray
}

# Check 6: ADB and device
Write-Host "`nCHECKING DEVICE CONNECTION:" -ForegroundColor Yellow
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"
$adbExists = Test-Path $adb
Write-Check "ADB executable found" $adbExists

if ($adbExists) {
    $devices = & $adb devices 2>&1 | Where-Object { $_ -like "*device" -and $_ -notlike "*List*" }
    $deviceConnected = $devices.Count -gt 0
    Write-Check "Device connected via USB" $deviceConnected
    
    if ($deviceConnected) {
        Write-Host "  -> Connected devices:" -ForegroundColor Gray
        $devices | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
    }
}

# Check 7: Backend
Write-Host "`nCHECKING BACKEND:" -ForegroundColor Yellow
$backendExists = Test-Path $BackendDir
Write-Check "Backend directory exists" $backendExists
if ($backendExists) {
    $backendPackageJson = Test-Path "$BackendDir\package.json"
    Write-Check "Backend has package.json" $backendPackageJson
}

# Final verdict
Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "║                   ALL SYSTEMS READY!                           ║" -ForegroundColor Green
    Write-Host "║                  READY FOR DEPLOYMENT                          ║" -ForegroundColor Green
} else {
    Write-Host "║              SOME SYSTEMS NOT READY - SEE ABOVE                ║" -ForegroundColor Red
}
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Summary
Write-Host "SUMMARY:" -ForegroundColor Cyan
Write-Host "--------" -ForegroundColor Cyan
Write-Host "Frontend:    $FrontendDir" -ForegroundColor White
Write-Host "Backend:     $BackendDir" -ForegroundColor White
Write-Host "Android SDK: $env:ANDROID_HOME" -ForegroundColor White

Write-Host "`nTO START BUILDING:" -ForegroundColor Yellow
Write-Host "& 'c:\work\VisaBuddy\LAUNCH_ALL_THREE_TERMINALS.ps1'" -ForegroundColor Cyan

Write-Host "`nOR MANUALLY:" -ForegroundColor Yellow
Write-Host "Terminal 1: Set-Location c:\work\VisaBuddy\apps\backend; npm run dev" -ForegroundColor White
Write-Host "Terminal 2: Set-Location c:\work\VisaBuddy\apps\frontend; npm run metro" -ForegroundColor White
Write-Host "Terminal 3: Set-Location c:\work\VisaBuddy\apps\frontend; npm run android" -ForegroundColor White

Write-Host "`nFULL DOCUMENTATION:" -ForegroundColor Yellow
Write-Host "c:\work\VisaBuddy\FIXED_BUILD_READY_TO_GO.md" -ForegroundColor Cyan

Write-Host ""