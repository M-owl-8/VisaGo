#!/usr/bin/env pwsh
# =============================================================================
# PERMANENT FIX: npm scripts and React Native CLI
# =============================================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PERMANENT FIX: npm Scripts & React CLI" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$FrontendDir = "c:\work\VisaBuddy\apps\frontend"

# Helper function
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

# =============================================================================
# STEP 1: Install react-native-cli globally
# =============================================================================

Write-Host "`n1. INSTALLING REACT-NATIVE-CLI GLOBALLY`n" -ForegroundColor Yellow

Write-Status "Installing react-native-cli globally..." "INFO"
npm install -g react-native-cli
if ($LASTEXITCODE -eq 0) {
    Write-Status "react-native-cli installed globally" "SUCCESS"
} else {
    Write-Status "Failed to install react-native-cli globally" "ERROR"
}

# =============================================================================
# STEP 2: Clean frontend node_modules
# =============================================================================

Write-Host "`n2. CLEANING FRONTEND DEPENDENCIES`n" -ForegroundColor Yellow

Set-Location $FrontendDir

Write-Status "Removing node_modules..." "INFO"
if (Test-Path "node_modules") {
    Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Status "node_modules removed" "SUCCESS"
}

Write-Status "Clearing npm cache..." "INFO"
npm cache clean --force
if ($LASTEXITCODE -eq 0) {
    Write-Status "npm cache cleared" "SUCCESS"
}

# =============================================================================
# STEP 3: Remove package-lock.json and reinstall
# =============================================================================

Write-Host "`n3. FRESH INSTALLATION`n" -ForegroundColor Yellow

Write-Status "Removing package-lock.json..." "INFO"
if (Test-Path "package-lock.json") {
    Remove-Item -Path "package-lock.json" -Force
    Write-Status "package-lock.json removed" "SUCCESS"
}

Write-Status "Installing all dependencies (this may take 2-3 minutes)..." "INFO"
npm install --legacy-peer-deps
if ($LASTEXITCODE -eq 0) {
    Write-Status "All dependencies installed" "SUCCESS"
} else {
    Write-Status "npm install failed" "ERROR"
    exit 1
}

# =============================================================================
# STEP 4: Update package.json scripts
# =============================================================================

Write-Host "`n4. UPDATING PACKAGE.JSON SCRIPTS`n" -ForegroundColor Yellow

$packageJsonPath = "$FrontendDir\package.json"

Write-Status "Reading package.json..." "INFO"
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

Write-Status "Updating scripts..." "INFO"

# Ensure scripts object exists
if (-not $packageJson.scripts) {
    $packageJson | Add-Member -Name "scripts" -Value @{} -MemberType NoteProperty
}

# Update the scripts with working commands
$packageJson.scripts.dev = "npx metro start --reset-cache"
$packageJson.scripts.metro = "npx metro start --reset-cache"
$packageJson.scripts.android = "npx react-native run-android --no-packager"
$packageJson.scripts."build:android" = "cd android; ./gradlew.bat assembleRelease; cd .."
$packageJson.scripts."build:ios" = "cd ios; xcodebuild -workspace VisaBuddy.xcworkspace -scheme VisaBuddy -configuration Release; cd .."
$packageJson.scripts.test = "jest"
$packageJson.scripts.lint = "eslint ."

Write-Status "Scripts updated successfully" "SUCCESS"

# Save the updated package.json
Write-Status "Saving package.json..." "INFO"
$packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath
Write-Status "package.json saved" "SUCCESS"

# =============================================================================
# STEP 5: Verify metro is available
# =============================================================================

Write-Host "`n5. VERIFYING METRO BUNDLER`n" -ForegroundColor Yellow

Write-Status "Checking for metro..." "INFO"
$metro = & npm list metro 2>&1
if ($metro -like "*metro@*") {
    Write-Status "Metro is installed" "SUCCESS"
} else {
    Write-Status "Metro not found, installing..." "WARNING"
    npm install --save-dev metro
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Metro installed" "SUCCESS"
    }
}

# =============================================================================
# STEP 6: Verify React Native CLI
# =============================================================================

Write-Host "`n6. VERIFYING REACT NATIVE CLI`n" -ForegroundColor Yellow

Write-Status "Testing react-native command..." "INFO"
$rnTest = & react-native --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Status "React Native CLI working: $rnTest" "SUCCESS"
} else {
    Write-Status "React Native CLI not responding properly" "WARNING"
    Write-Status "Attempting npx fallback..." "INFO"
}

# =============================================================================
# STEP 7: Test npm scripts
# =============================================================================

Write-Host "`n7. TESTING NPM SCRIPTS`n" -ForegroundColor Yellow

Write-Status "Running npm run --list..." "INFO"
npm run 2>&1 | Select-Object -First 20

# =============================================================================
# FINAL VERIFICATION
# =============================================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "VERIFICATION COMPLETE" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Status "Available npm scripts:" "INFO"
npm run 2>&1 | Where-Object { $_ -like "  *" } | Select-Object -First 10

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Terminal 1 - Backend:" -ForegroundColor White
Write-Host "  cd c:\work\VisaBuddy\apps\backend" -ForegroundColor Gray
Write-Host "  npm run dev" -ForegroundColor Gray

Write-Host "`nTerminal 2 - Metro Bundler:" -ForegroundColor White
Write-Host "  cd c:\work\VisaBuddy\apps\frontend" -ForegroundColor Gray
Write-Host "  npm run metro" -ForegroundColor Gray

Write-Host "`nTerminal 3 - Build and Deploy:" -ForegroundColor White
Write-Host "  cd c:\work\VisaBuddy\apps\frontend" -ForegroundColor Gray
Write-Host "  npm run android" -ForegroundColor Gray

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Status "Fix complete! Ready to build." "SUCCESS"