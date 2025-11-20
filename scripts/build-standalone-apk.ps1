# Build Standalone APK for VisaBuddy
# This script builds a release APK that can be installed on physical devices
# without needing Metro bundler or laptop connection

param(
    [switch]$Clean = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VisaBuddy - Standalone APK Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend directory
$frontendDir = Join-Path $PSScriptRoot ".." "frontend_new"
$androidDir = Join-Path $frontendDir "android"

if (-not (Test-Path $frontendDir)) {
    Write-Host "[ERROR] frontend_new directory not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $androidDir)) {
    Write-Host "[ERROR] android directory not found!" -ForegroundColor Red
    exit 1
}

Set-Location $frontendDir

Write-Host "[STEP 1] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[STEP 2] Cleaning previous builds..." -ForegroundColor Yellow
Set-Location $androidDir

if ($Clean) {
    & .\gradlew.bat clean
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARNING] Clean failed, but continuing..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[STEP 3] Building release APK..." -ForegroundColor Yellow
Write-Host "   This may take several minutes..." -ForegroundColor Gray

# Build the release APK
& .\gradlew.bat assembleRelease
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[SUCCESS] Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Find the APK file
$apkPath = Join-Path $androidDir "app" "build" "outputs" "apk" "release" "app-release.apk"

if (Test-Path $apkPath) {
    $apkInfo = Get-Item $apkPath
    $apkSizeMB = [math]::Round($apkInfo.Length / 1MB, 2)
    
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  APK Build Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "[INFO] APK Location:" -ForegroundColor Cyan
    Write-Host "   $apkPath" -ForegroundColor White
    Write-Host ""
    Write-Host "[INFO] APK Size: $apkSizeMB MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[INFO] To install on your device:" -ForegroundColor Yellow
    Write-Host "   1. Copy the APK file to your Android device" -ForegroundColor White
    Write-Host "   2. On your device, enable 'Install from Unknown Sources'" -ForegroundColor White
    Write-Host "   3. Open the APK file and tap 'Install'" -ForegroundColor White
    Write-Host ""
    Write-Host "[TIP] You can use:" -ForegroundColor Yellow
    Write-Host "   - USB: adb install $apkPath" -ForegroundColor White
    Write-Host "   - Email/Cloud: Send the APK to yourself" -ForegroundColor White
    Write-Host "   - ADB over WiFi: adb connect <device-ip> && adb install $apkPath" -ForegroundColor White
    Write-Host ""
    
    # Try to open the folder in explorer
    $apkDir = Split-Path $apkPath -Parent
    Start-Process explorer.exe -ArgumentList $apkDir
} else {
    Write-Host "[ERROR] APK file not found at expected location!" -ForegroundColor Red
    Write-Host "   Expected: $apkPath" -ForegroundColor Yellow
    exit 1
}

Set-Location $PSScriptRoot
