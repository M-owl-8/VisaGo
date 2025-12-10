# iOS Build Script using EAS Build (Cloud-based)
# This works on Windows, Mac, and Linux - no macOS/Xcode needed!

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  iOS Build using EAS Build (Cloud)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if EAS CLI is installed
$easInstalled = Get-Command eas -ErrorAction SilentlyContinue

if (-not $easInstalled) {
    Write-Host "⚠️  EAS CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g eas-cli
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install EAS CLI" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ EAS CLI installed" -ForegroundColor Green
}

# Check if logged in
Write-Host "📋 Checking EAS login status..." -ForegroundColor Cyan
$loginCheck = eas whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not logged in to EAS. Please login:" -ForegroundColor Yellow
    Write-Host "   Run: eas login" -ForegroundColor Yellow
    Write-Host ""
    $shouldLogin = Read-Host "Login now? (y/n)"
    if ($shouldLogin -eq "y" -or $shouldLogin -eq "Y") {
        eas login
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Login failed" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Login required to continue" -ForegroundColor Red
        exit 1
    }
}

# Navigate to frontend_new directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $scriptDir ".."
Set-Location $frontendDir

Write-Host ""
Write-Host "📱 iOS Build Options:" -ForegroundColor Cyan
Write-Host "  1. Development (Simulator) - No Apple Developer account needed" -ForegroundColor White
Write-Host "  2. Preview (Internal) - Requires Apple Developer account" -ForegroundColor White
Write-Host "  3. Production (App Store/TestFlight) - Requires Apple Developer account" -ForegroundColor White
Write-Host ""

$buildType = Read-Host "Select build type (1/2/3)"

switch ($buildType) {
    "1" {
        $profile = "development"
        Write-Host "🚀 Building for iOS Simulator (Development)..." -ForegroundColor Cyan
    }
    "2" {
        $profile = "preview"
        Write-Host "🚀 Building for iOS Device (Preview)..." -ForegroundColor Cyan
    }
    "3" {
        $profile = "production"
        Write-Host "🚀 Building for App Store/TestFlight (Production)..." -ForegroundColor Cyan
    }
    default {
        Write-Host "❌ Invalid selection" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "⏳ Starting EAS build..." -ForegroundColor Yellow
Write-Host "   This will take 30-60 minutes" -ForegroundColor Yellow
Write-Host "   You can monitor progress at: https://expo.dev" -ForegroundColor Yellow
Write-Host ""

# Run EAS build
eas build --platform ios --profile $profile --non-interactive

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📥 To download the build:" -ForegroundColor Cyan
    Write-Host "   eas build:download --latest" -ForegroundColor White
    Write-Host ""
    Write-Host "📤 To submit to TestFlight:" -ForegroundColor Cyan
    Write-Host "   eas submit --platform ios --latest" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Build failed. Check logs at: https://expo.dev" -ForegroundColor Red
    exit 1
}





















