#!/usr/bin/env pwsh
# ============================================================================
# VisaBuddy - Android Build Fix
# ============================================================================

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "VisaBuddy Android Build - Permanent Fix" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$FrontendDir = "c:\work\VisaBuddy\apps\frontend"
$BackendDir = "c:\work\VisaBuddy\apps\backend"

function Write-Status {
    param([string]$Message, [string]$Status = "INFO")
    $colors = @{
        "SUCCESS" = "Green"
        "ERROR"   = "Red"
        "WARNING" = "Yellow"
        "INFO"    = "Cyan"
    }
    $color = if ($colors.ContainsKey($Status)) { $colors[$Status] } else { "White" }
    Write-Host "[$Status] $Message" -ForegroundColor $color
}

# STEP 1: Kill processes
Write-Host ""
Write-Host "STEP 1: KILLING CONFLICTING PROCESSES" -ForegroundColor Yellow

Write-Status "Killing Node processes..." "INFO"
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Status "Killing ADB daemon..." "INFO"
& "$env:ANDROID_HOME\platform-tools\adb.exe" kill-server -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Status "Killing Java processes..." "INFO"
Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Status "All processes killed" "SUCCESS"

# STEP 2: Clean node_modules
Write-Host ""
Write-Host "STEP 2: CLEANING NODE MODULES" -ForegroundColor Yellow

Set-Location $FrontendDir

if (Test-Path "node_modules") {
    Write-Status "Removing node_modules..." "INFO"
    Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Status "node_modules removed" "SUCCESS"
}

if (Test-Path "package-lock.json") {
    Write-Status "Removing package-lock.json..." "INFO"
    Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
}

Write-Status "Frontend cleaned" "SUCCESS"

# STEP 3: Clean Android build
Write-Host ""
Write-Host "STEP 3: CLEANING ANDROID BUILD (this takes 1-2 minutes)" -ForegroundColor Yellow

Set-Location "$FrontendDir\android"

Write-Status "Running gradle clean..." "INFO"
& ".\gradlew.bat" clean --no-daemon -q
Write-Status "Gradle clean complete" "SUCCESS"

Write-Status "Removing .gradle folder..." "INFO"
Remove-Item -Path ".gradle" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "build" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app\build" -Recurse -Force -ErrorAction SilentlyContinue
Write-Status "Android build cleaned" "SUCCESS"

# STEP 4: Reinstall npm packages
Write-Host ""
Write-Host "STEP 4: REINSTALLING DEPENDENCIES (takes 2-3 minutes)" -ForegroundColor Yellow

Set-Location $FrontendDir

Write-Status "Installing npm packages..." "INFO"
npm install --legacy-peer-deps --verbose | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Status "npm install FAILED" "ERROR"
    exit 1
}

Write-Status "npm packages installed" "SUCCESS"

# STEP 5: Update gradle.properties
Write-Host ""
Write-Host "STEP 5: FIXING GRADLE CONFIGURATION" -ForegroundColor Yellow

$gradlePropsPath = "$FrontendDir\android\gradle.properties"

Write-Status "Updating gradle.properties..." "INFO"

$gradleProps = @"
# Project-wide Gradle settings
org.gradle.jvmargs=-Xmx2048m -XX:MaxPermSize=512m
org.gradle.parallel=true
org.gradle.daemon=false
org.gradle.caching=false

# Android-specific settings
android.useAndroidX=true
android.enableJetifier=true
android.targetSdkVersion=34
android.compileSdkVersion=34
android.buildToolsVersion=34.0.0

# Disable certain checks that cause issues
android.enableUnitTestBinaryResources=false
android.experimental.enableSourceSetPathsMap=true

# Newarch
newArchEnabled=false

# Watchman
watchman.enabled=false
"@

Set-Content -Path $gradlePropsPath -Value $gradleProps -Encoding ASCII
Write-Status "gradle.properties updated" "SUCCESS"

# STEP 6: Update package.json scripts
Write-Host ""
Write-Host "STEP 6: UPDATING BUILD SCRIPTS" -ForegroundColor Yellow

$packageJsonPath = "$FrontendDir\package.json"
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

$packageJson.scripts.android = "npx react-native run-android --no-packager --verbose"
$packageJson.scripts.dev = "npx react-native start --reset-cache"
$packageJson.scripts.metro = "npx react-native start --reset-cache"

Set-Content -Path $packageJsonPath -Value ($packageJson | ConvertTo-Json -Depth 10) -Encoding UTF8
Write-Status "package.json scripts updated" "SUCCESS"

# STEP 7: Final cleanup
Write-Host ""
Write-Host "STEP 7: FINAL CLEANUP" -ForegroundColor Yellow

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
& "$env:ANDROID_HOME\platform-tools\adb.exe" kill-server -ErrorAction SilentlyContinue

Write-Status "Cleanup complete" "SUCCESS"

# SUCCESS
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "FIX COMPLETE! Now follow 3-Terminal Build Process" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""

Write-Host "TERMINAL 1 (Backend - Keep Running):" -ForegroundColor Yellow
Write-Host "  cd c:\work\VisaBuddy\apps\backend" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""

Write-Host "TERMINAL 2 (Metro Bundler - Keep Running):" -ForegroundColor Yellow
Write-Host "  cd c:\work\VisaBuddy\apps\frontend" -ForegroundColor White
Write-Host "  npm run metro" -ForegroundColor White
Write-Host ""

Write-Host "TERMINAL 3 (Build for Device):" -ForegroundColor Yellow
Write-Host "  cd c:\work\VisaBuddy\apps\frontend" -ForegroundColor White
Write-Host "  npm run android" -ForegroundColor White
Write-Host ""

Write-Host "Wait 30 seconds, then build should start! App will appear in ~15 seconds." -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to continue..."