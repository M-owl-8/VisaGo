#!/usr/bin/env pwsh
# =============================================================================
# VisaBuddy - Android Build Troubleshooter
# =============================================================================
# Interactive tool to diagnose and fix common build failures

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "VisaBuddy Android Build Troubleshooter" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

$FrontendDir = "c:\work\VisaBuddy\apps\frontend"

function Write-Section {
    param([string]$Title)
    Write-Host "`n$Title" -ForegroundColor Yellow
    Write-Host "─" * 50 -ForegroundColor Gray
}

function Write-Status {
    param([string]$Message, [string]$Status = "INFO")
    $colors = @{
        "SUCCESS" = "Green"
        "ERROR"   = "Red"
        "WARNING" = "Yellow"
        "INFO"    = "Cyan"
        "FIX"     = "Magenta"
    }
    $color = if ($colors.ContainsKey($Status)) { $colors[$Status] } else { "White" }
    Write-Host "[$Status] $Message" -ForegroundColor $color
}

# =============================================================================
# DIAGNOSTIC CHECKS
# =============================================================================
Write-Section "🔍 RUNNING DIAGNOSTICS"

$issues = @()

# Check 1: Android SDK
Write-Host "`n1. Checking Android SDK..."
if (Test-Path "$env:ANDROID_HOME\platforms") {
    Write-Status "Android SDK found at: $env:ANDROID_HOME" "SUCCESS"
} else {
    Write-Status "ANDROID_HOME not properly set" "ERROR"
    $issues += "Android SDK"
}

# Check 2: Gradle
Write-Host "`n2. Checking Gradle..."
$gradleVersion = & "$FrontendDir\android\gradlew.bat" -version 2>&1 | Select-String "Gradle" | Select-Object -First 1
if ($gradleVersion) {
    Write-Status "Gradle OK: $gradleVersion" "SUCCESS"
} else {
    Write-Status "Gradle wrapper may be corrupted" "WARNING"
    $issues += "Gradle"
}

# Check 3: ADB
Write-Host "`n3. Checking Android Debug Bridge..."
try {
    $devices = & "$env:ANDROID_HOME\platform-tools\adb.exe" devices
    $deviceCount = ($devices | Select-String "device$|emulator" | Measure-Object).Count
    if ($deviceCount -gt 0) {
        Write-Status "Connected devices: $deviceCount" "SUCCESS"
    } else {
        Write-Status "No devices connected" "WARNING"
        $issues += "No devices"
    }
} catch {
    Write-Status "ADB error: $_" "ERROR"
    $issues += "ADB"
}

# Check 4: Node modules
Write-Host "`n4. Checking dependencies..."
if (Test-Path "$FrontendDir\node_modules") {
    $moduleCount = (Get-ChildItem "$FrontendDir\node_modules" -ErrorAction SilentlyContinue | Measure-Object).Count
    Write-Status "node_modules found ($moduleCount directories)" "SUCCESS"
} else {
    Write-Status "node_modules missing or corrupted" "WARNING"
    $issues += "Dependencies"
}

# Check 5: Metro bundler port
Write-Host "`n5. Checking port availability..."
$portInUse = $false
try {
    $connection = Test-NetConnection -ComputerName localhost -Port 8081 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Status "Port 8081 is in use (OK if Metro is running)" "WARNING"
    } else {
        Write-Status "Port 8081 is available" "SUCCESS"
    }
} catch {
    Write-Status "Port 8081 is available" "SUCCESS"
}

# Check 6: Java
Write-Host "`n6. Checking Java..."
try {
    $javaVersion = java -version 2>&1 | Select-String "version" | Select-Object -First 1
    Write-Status "Java found: $javaVersion" "SUCCESS"
} catch {
    Write-Status "Java not found or not in PATH" "ERROR"
    $issues += "Java"
}

# =============================================================================
# ISSUE SUMMARY
# =============================================================================
Write-Section "📊 DIAGNOSIS SUMMARY"

if ($issues.Count -eq 0) {
    Write-Status "✅ All systems look good!" "SUCCESS"
    Write-Host "`nYour issue might be:" -ForegroundColor Cyan
    Write-Host "  • Metro Bundler not running (start with: npm run metro)" -ForegroundColor White
    Write-Host "  • Device not connected or offline" -ForegroundColor White
    Write-Host "  • Build cache corruption (try: npm run gradle:clean)" -ForegroundColor White
} else {
    Write-Status "⚠️  Found $($issues.Count) potential issue(s)" "WARNING"
    foreach ($issue in $issues) {
        Write-Host "  • $issue" -ForegroundColor Yellow
    }
}

# =============================================================================
# QUICK FIXES MENU
# =============================================================================
Write-Section "🛠️ AVAILABLE FIXES"

Write-Host "`nSelect an option:`n" -ForegroundColor Cyan
Write-Host "1. Clean everything and rebuild (RECOMMENDED)" -ForegroundColor Green
Write-Host "2. Just clean node_modules" -ForegroundColor White
Write-Host "3. Just clean Gradle cache" -ForegroundColor White
Write-Host "4. Kill all conflicting processes" -ForegroundColor White
Write-Host "5. Reset ADB and USB" -ForegroundColor White
Write-Host "6. Fix Metro Bundler port conflict" -ForegroundColor White
Write-Host "7. Run full diagnostic report" -ForegroundColor White
Write-Host "8. Exit" -ForegroundColor Gray

$choice = Read-Host "`nYour choice (1-8)"

# =============================================================================
# EXECUTE FIXES
# =============================================================================
switch ($choice) {
    "1" {
        Write-Section "🧹 FULL CLEAN & REBUILD"
        
        Write-Status "Killing all processes..." "INFO"
        Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        & "$env:ANDROID_HOME\platform-tools\adb.exe" kill-server -ErrorAction SilentlyContinue
        Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        
        Write-Status "Removing node_modules..." "INFO"
        Set-Location $FrontendDir
        Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
        
        Write-Status "Cleaning Gradle..." "INFO"
        Set-Location "$FrontendDir\android"
        & ".\gradlew.bat" clean --no-daemon
        Remove-Item -Path ".gradle" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "build" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "app\build" -Recurse -Force -ErrorAction SilentlyContinue
        
        Write-Status "Installing npm packages (2-3 min)..." "INFO"
        Set-Location $FrontendDir
        npm install --legacy-peer-deps
        
        Write-Status "✅ Full clean complete!" "SUCCESS"
        Write-Host "`nNext steps:" -ForegroundColor Green
        Write-Host "1. Start Metro: cd $FrontendDir && npm run metro" -ForegroundColor Yellow
        Write-Host "2. In another terminal: npm run android" -ForegroundColor Yellow
    }
    
    "2" {
        Write-Section "📦 CLEANING NODE MODULES"
        Set-Location $FrontendDir
        Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
        Write-Status "Running: npm install --legacy-peer-deps" "INFO"
        npm install --legacy-peer-deps
        Write-Status "✅ Done!" "SUCCESS"
    }
    
    "3" {
        Write-Section "🧹 CLEANING GRADLE CACHE"
        Set-Location "$FrontendDir\android"
        & ".\gradlew.bat" clean --no-daemon
        Remove-Item -Path ".gradle" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "build" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "app\build" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Status "✅ Gradle cache cleaned!" "SUCCESS"
    }
    
    "4" {
        Write-Section "🔥 KILLING CONFLICTING PROCESSES"
        Write-Status "Stopping Node processes..." "INFO"
        Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        
        Write-Status "Stopping Java processes..." "INFO"
        Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        
        Write-Status "Killing ADB daemon..." "INFO"
        & "$env:ANDROID_HOME\platform-tools\adb.exe" kill-server -ErrorAction SilentlyContinue
        
        Start-Sleep -Seconds 2
        Write-Status "✅ All processes terminated!" "SUCCESS"
    }
    
    "5" {
        Write-Section "🔌 RESETTING ADB & USB"
        Write-Status "Killing ADB daemon..." "INFO"
        & "$env:ANDROID_HOME\platform-tools\adb.exe" kill-server
        
        Start-Sleep -Seconds 2
        
        Write-Status "Restarting ADB daemon..." "INFO"
        & "$env:ANDROID_HOME\platform-tools\adb.exe" start-server
        
        Start-Sleep -Seconds 2
        
        Write-Status "Connected devices:" "INFO"
        & "$env:ANDROID_HOME\platform-tools\adb.exe" devices
        
        Write-Status "✅ ADB reset complete!" "SUCCESS"
    }
    
    "6" {
        Write-Section "🌐 FIXING METRO BUNDLER PORT"
        Write-Status "Checking port 8081..." "INFO"
        
        # Kill anything on port 8081
        $process = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue
        if ($process) {
            Write-Status "Found process on port 8081, killing..." "INFO"
            Stop-Process -Id $process.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        
        Write-Status "Port 8081 should now be available" "SUCCESS"
        Write-Host "`nStart Metro with:" -ForegroundColor Green
        Write-Host "cd $FrontendDir && npm run metro" -ForegroundColor Yellow
    }
    
    "7" {
        Write-Section "📋 FULL DIAGNOSTIC REPORT"
        Write-Host "`n" -ForegroundColor Gray
        Write-Host "System Info:" -ForegroundColor Cyan
        Write-Host "  OS: Windows $(Get-CimInstance Win32_OperatingSystem).Version" -ForegroundColor White
        Write-Host "  Node: $(node --version)" -ForegroundColor White
        Write-Host "  npm: $(npm --version)" -ForegroundColor White
        Write-Host "  Java: $(java -version 2>&1 | Select-String 'version' | Select-Object -First 1)" -ForegroundColor White
        Write-Host "  Android SDK: $env:ANDROID_HOME" -ForegroundColor White
        
        Write-Host "`nProject Paths:" -ForegroundColor Cyan
        Write-Host "  Frontend: $FrontendDir" -ForegroundColor White
        Write-Host "  node_modules: $(if (Test-Path "$FrontendDir\node_modules") { "✓ Present" } else { "✗ Missing" })" -ForegroundColor White
        Write-Host "  gradle: $(if (Test-Path "$FrontendDir\android\gradlew.bat") { "✓ Present" } else { "✗ Missing" })" -ForegroundColor White
        
        Write-Host "`nRecent Logs:" -ForegroundColor Cyan
        if (Test-Path "$FrontendDir\npm-install.log") {
            Write-Host "  ✓ npm-install.log found" -ForegroundColor Green
        }
        if (Test-Path "$FrontendDir\gradle-clean.log") {
            Write-Host "  ✓ gradle-clean.log found" -ForegroundColor Green
        }
        
        Write-Host "`nRecommendations:" -ForegroundColor Yellow
        if ("Dependencies" -in $issues) {
            Write-Host "  1. Run option 2 to clean node_modules" -ForegroundColor White
        }
        if ("Gradle" -in $issues) {
            Write-Host "  1. Run option 3 to clean Gradle" -ForegroundColor White
        }
        if ("No devices" -in $issues) {
            Write-Host "  1. Connect Android device via USB" -ForegroundColor White
            Write-Host "  2. Enable USB Debugging on device" -ForegroundColor White
            Write-Host "  3. Run option 5 to reset ADB" -ForegroundColor White
        }
    }
    
    "8" {
        Write-Host "`nGoodbye! 👋" -ForegroundColor Green
        exit
    }
    
    default {
        Write-Status "Invalid choice" "ERROR"
    }
}

Write-Host "`n" -ForegroundColor Gray
Read-Host "Press Enter to exit"