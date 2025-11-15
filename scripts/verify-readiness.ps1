# ============================================================================
# VisaBuddy - Readiness Verification Script
# ============================================================================
# This script verifies that the project is 100% ready for emulator testing

Write-Host ""
Write-Host "🔍 VisaBuddy Readiness Verification" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$score = 0
$maxScore = 100
$issues = @()

# ============================================================================
# 1. Environment Configuration (25 points)
# ============================================================================
Write-Host "1️⃣  Environment Configuration (25 points)" -ForegroundColor Cyan

# Backend .env
if (Test-Path "apps\backend\.env") {
    $backendEnv = Get-Content "apps\backend\.env" -Raw
    
    # Check for required variables
    $checks = @{
        "DATABASE_URL" = 5
        "JWT_SECRET" = 5
        "PORT" = 2
        "NODE_ENV" = 2
    }
    
    foreach ($var in $checks.Keys) {
        if ($backendEnv -match "$var\s*=") {
            $score += $checks[$var]
            Write-Host "   ✅ $var configured" -ForegroundColor Green
        } else {
            $issues += "Backend .env missing: $var"
            Write-Host "   ❌ $var missing" -ForegroundColor Red
        }
    }
    
    # Check for SQLite (emulator-friendly)
    if ($backendEnv -match "DATABASE_URL=file:") {
        $score += 3
        Write-Host "   ✅ Using SQLite (emulator-friendly)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Not using SQLite (PostgreSQL may require setup)" -ForegroundColor Yellow
    }
    
    # Check JWT_SECRET length
    if ($backendEnv -match "JWT_SECRET=([^\r\n]+)") {
        $jwtSecret = $matches[1].Trim()
        if ($jwtSecret.Length -ge 32) {
            $score += 3
            Write-Host "   ✅ JWT_SECRET is secure (32+ chars)" -ForegroundColor Green
        } else {
            $issues += "JWT_SECRET is too short (must be 32+ characters)"
            Write-Host "   ❌ JWT_SECRET too short" -ForegroundColor Red
        }
    }
} else {
    $issues += "Backend .env file missing"
    Write-Host "   ❌ Backend .env missing" -ForegroundColor Red
}

# Frontend .env
if (Test-Path "apps\frontend\.env") {
    $frontendEnv = Get-Content "apps\frontend\.env" -Raw
    if ($frontendEnv -match "EXPO_PUBLIC_API_URL") {
        $score += 5
        Write-Host "   ✅ Frontend .env configured" -ForegroundColor Green
        
        # Check for emulator-friendly URL
        if ($frontendEnv -match "10\.0\.2\.2") {
            $score += 2
            Write-Host "   ✅ API URL configured for emulator (10.0.2.2)" -ForegroundColor Green
        }
    } else {
        Write-Host "   ⚠️  Frontend .env exists but API URL not configured" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Frontend .env missing (will use defaults)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 2. Database Setup (20 points)
# ============================================================================
Write-Host "2️⃣  Database Setup (20 points)" -ForegroundColor Cyan

if (Test-Path "apps\backend\prisma\dev.db") {
    $score += 15
    Write-Host "   ✅ Database file exists" -ForegroundColor Green
    
    # Check file size (should be > 0)
    $dbSize = (Get-Item "apps\backend\prisma\dev.db").Length
    if ($dbSize -gt 0) {
        $score += 5
        Write-Host "   ✅ Database is initialized" -ForegroundColor Green
    } else {
        $issues += "Database file exists but is empty"
        Write-Host "   ❌ Database file is empty" -ForegroundColor Red
    }
} else {
    $issues += "Database file missing (run setup-database.ps1)"
    Write-Host "   ❌ Database file missing" -ForegroundColor Red
}

# Check Prisma client
if (Test-Path "apps\backend\node_modules\.prisma") {
    $score += 5
    Write-Host "   ✅ Prisma client generated" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Prisma client not generated (run: npm run db:generate)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 3. Android Build Configuration (20 points)
# ============================================================================
Write-Host "3️⃣  Android Build Configuration (20 points)" -ForegroundColor Cyan

# Check build.gradle files
if (Test-Path "apps\frontend\android\build.gradle") {
    $score += 5
    Write-Host "   ✅ Root build.gradle exists" -ForegroundColor Green
} else {
    $issues += "Android root build.gradle missing"
    Write-Host "   ❌ Root build.gradle missing" -ForegroundColor Red
}

if (Test-Path "apps\frontend\android\app\build.gradle") {
    $score += 5
    Write-Host "   ✅ App build.gradle exists" -ForegroundColor Green
    
    # Check for google-services handling
    $appBuild = Get-Content "apps\frontend\android\app\build.gradle" -Raw
    if ($appBuild -match "google-services\.json.*exists") {
        $score += 5
        Write-Host "   ✅ Google Services handled gracefully" -ForegroundColor Green
    }
} else {
    $issues += "Android app build.gradle missing"
    Write-Host "   ❌ App build.gradle missing" -ForegroundColor Red
}

# Check AndroidManifest.xml
if (Test-Path "apps\frontend\android\app\src\main\AndroidManifest.xml") {
    $score += 5
    Write-Host "   ✅ AndroidManifest.xml exists" -ForegroundColor Green
} else {
    $issues += "AndroidManifest.xml missing"
    Write-Host "   ❌ AndroidManifest.xml missing" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# 4. Dependencies (15 points)
# ============================================================================
Write-Host "4️⃣  Dependencies (15 points)" -ForegroundColor Cyan

# Backend node_modules
if (Test-Path "apps\backend\node_modules") {
    $score += 5
    Write-Host "   ✅ Backend dependencies installed" -ForegroundColor Green
} else {
    $issues += "Backend dependencies not installed"
    Write-Host "   ❌ Backend dependencies missing" -ForegroundColor Red
}

# Frontend node_modules
if (Test-Path "apps\frontend\node_modules") {
    $score += 5
    Write-Host "   ✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    $issues += "Frontend dependencies not installed"
    Write-Host "   ❌ Frontend dependencies missing" -ForegroundColor Red
}

# Root node_modules (if exists)
if (Test-Path "package.json") {
    if (Test-Path "node_modules") {
        $score += 5
        Write-Host "   ✅ Root dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Root dependencies not installed (optional)" -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================================================
# 5. Code Completeness (20 points)
# ============================================================================
Write-Host "5️⃣  Code Completeness (20 points)" -ForegroundColor Cyan

# Check for TODOs
$todoCount = (Get-ChildItem -Path "apps" -Recurse -Include "*.ts","*.tsx","*.js","*.jsx" | Select-String -Pattern "TODO|FIXME" -CaseSensitive:$false).Count
if ($todoCount -eq 0) {
    $score += 10
    Write-Host "   ✅ No TODO/FIXME comments found" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Found $todoCount TODO/FIXME comments (non-blocking)" -ForegroundColor Yellow
    $score += 5
}

# Check critical files
$criticalFiles = @(
    "apps\backend\src\index.ts",
    "apps\frontend\src\App.tsx",
    "apps\backend\src\routes\auth.ts",
    "apps\frontend\src\services\api.ts"
)

$foundFiles = 0
foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        $foundFiles++
    }
}

if ($foundFiles -eq $criticalFiles.Count) {
    $score += 10
    Write-Host "   ✅ All critical files present" -ForegroundColor Green
} else {
    $issues += "Some critical files are missing"
    Write-Host "   ❌ Missing $($criticalFiles.Count - $foundFiles) critical file(s)" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# RESULTS
# ============================================================================
Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 READINESS SCORE: $score / $maxScore ($([math]::Round(($score/$maxScore)*100))%)" -ForegroundColor $(if ($score -ge 90) { "Green" } elseif ($score -ge 70) { "Yellow" } else { "Red" })
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($score -ge 90) {
    Write-Host "✅ PROJECT IS READY FOR TESTING!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now:" -ForegroundColor Cyan
    Write-Host "  1. Start backend: cd apps\backend && npm run dev" -ForegroundColor Gray
    Write-Host "  2. Start Metro: cd apps\frontend && npm run metro" -ForegroundColor Gray
    Write-Host "  3. Build app: cd apps\frontend && npm run android" -ForegroundColor Gray
} elseif ($score -ge 70) {
    Write-Host "⚠️  PROJECT IS MOSTLY READY" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Some issues found. Review and fix:" -ForegroundColor Yellow
    foreach ($issue in $issues) {
        Write-Host "  • $issue" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ PROJECT NEEDS SETUP" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the following issues:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "  • $issue" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Run: scripts\quick-start-emulator.ps1" -ForegroundColor Cyan
}

Write-Host ""

