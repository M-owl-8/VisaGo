# Week 2 Completion Verification Script
# This script checks if all critical items for Days 1-7 are complete

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Week 2 Completion Verification" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$checklist = @{
    "Database" = @()
    "Backend" = @()
    "Frontend" = @()
    "Configuration" = @()
}

# ============================================================================
# DATABASE CHECKS
# ============================================================================
Write-Host "📦 DATABASE CHECKS" -ForegroundColor Yellow

$schemaPath = "apps/backend/prisma/schema.prisma"
if (Test-Path $schemaPath) {
    $content = Get-Content $schemaPath -Raw
    if ($content -match 'provider\s*=\s*"postgresql"') {
        Write-Host "  ✅ Prisma schema: PostgreSQL configured" -ForegroundColor Green
        $checklist.Database += @("Schema migrated to PostgreSQL")
    } else {
        Write-Host "  ❌ Prisma schema: Still using SQLite" -ForegroundColor Red
        $checklist.Database += @("Schema NOT migrated")
    }
} else {
    Write-Host "  ❌ Prisma schema: Not found" -ForegroundColor Red
}

if (Test-Path "apps/backend/prisma/dev.db") {
    Write-Host "  ℹ️  SQLite dev database exists (OK for development)" -ForegroundColor Gray
}

# Check environment
if (Test-Path "apps/backend/.env.production") {
    $env_content = Get-Content "apps/backend/.env.production" -Raw
    if ($env_content -match "DATABASE_URL=postgresql://") {
        Write-Host "  ✅ Environment: DATABASE_URL configured" -ForegroundColor Green
        $checklist.Configuration += @("DATABASE_URL set")
    } else {
        Write-Host "  ⚠️  Environment: DATABASE_URL not PostgreSQL" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Environment: .env.production not found" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# BACKEND CHECKS
# ============================================================================
Write-Host "🔧 BACKEND CHECKS" -ForegroundColor Yellow

# Check package.json
if (Test-Path "apps/backend/package.json") {
    Write-Host "  ✅ Backend package.json exists" -ForegroundColor Green
    
    $pkg = Get-Content "apps/backend/package.json" | ConvertFrom-Json
    
    # Check key dependencies
    $requiredDeps = @("express", "@prisma/client", "bcryptjs", "jsonwebtoken", "cors", "helmet")
    $missingDeps = @()
    
    foreach ($dep in $requiredDeps) {
        if (-not $pkg.dependencies.PSObject.Properties.Name.Contains($dep)) {
            $missingDeps += $dep
        }
    }
    
    if ($missingDeps.Count -eq 0) {
        Write-Host "  ✅ All required dependencies listed" -ForegroundColor Green
        $checklist.Backend += @("Dependencies configured")
    } else {
        Write-Host "  ⚠️  Missing dependencies: $($missingDeps -join ', ')" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Backend package.json not found" -ForegroundColor Red
}

# Check node_modules
if (Test-Path "apps/backend/node_modules") {
    $moduleCount = (Get-ChildItem "apps/backend/node_modules" -Directory).Count
    Write-Host "  ✅ Backend dependencies installed ($moduleCount modules)" -ForegroundColor Green
    $checklist.Backend += @("Dependencies installed")
} else {
    Write-Host "  ⚠️  Backend dependencies NOT installed - run: npm install" -ForegroundColor Yellow
    $checklist.Backend += @("Dependencies NOT installed - needs: npm install")
}

# Check key backend files
$backendFiles = @(
    "src/index.ts",
    "src/routes/auth.ts",
    "src/routes/payments.ts",
    "src/routes/legal.ts",
    "src/middleware/rate-limit.ts",
    "src/services/auth.service.ts"
)

$missingFiles = @()
foreach ($file in $backendFiles) {
    if (-not (Test-Path "apps/backend/$file")) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -eq 0) {
    Write-Host "  ✅ All critical backend files present" -ForegroundColor Green
    $checklist.Backend += @("All critical files present")
} else {
    Write-Host "  ⚠️  Missing files: $($missingFiles -join ', ')" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# FRONTEND CHECKS
# ============================================================================
Write-Host "📱 FRONTEND CHECKS" -ForegroundColor Yellow

if (Test-Path "apps/frontend/package.json") {
    Write-Host "  ✅ Frontend package.json exists" -ForegroundColor Green
    
    $frontendPkg = Get-Content "apps/frontend/package.json" | ConvertFrom-Json
    
    $frontendDeps = @("expo", "react", "react-native", "axios", "zustand", "zod")
    $missingFrontendDeps = @()
    
    foreach ($dep in $frontendDeps) {
        if (-not $frontendPkg.dependencies.PSObject.Properties.Name.Contains($dep)) {
            $missingFrontendDeps += $dep
        }
    }
    
    if ($missingFrontendDeps.Count -eq 0) {
        Write-Host "  ✅ All required frontend dependencies listed" -ForegroundColor Green
        $checklist.Frontend += @("Dependencies configured")
    } else {
        Write-Host "  ⚠️  Missing dependencies: $($missingFrontendDeps -join ', ')" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Frontend package.json not found" -ForegroundColor Red
}

# Check frontend node_modules
if (Test-Path "apps/frontend/node_modules") {
    $frontendModuleCount = (Get-ChildItem "apps/frontend/node_modules" -Directory).Count
    Write-Host "  ✅ Frontend dependencies installed ($frontendModuleCount modules)" -ForegroundColor Green
    $checklist.Frontend += @("Dependencies installed")
} else {
    Write-Host "  ⚠️  Frontend dependencies NOT installed - run: npm install" -ForegroundColor Yellow
    $checklist.Frontend += @("Dependencies NOT installed - needs: npm install")
}

# Count screens
$screenCount = (Get-ChildItem "apps/frontend/src/screens" -Filter "*.tsx" -Recurse | Measure-Object).Count
Write-Host "  ℹ️  Frontend screens: $screenCount .tsx files found" -ForegroundColor Gray

Write-Host ""

# ============================================================================
# CONFIGURATION CHECKS
# ============================================================================
Write-Host "⚙️  CONFIGURATION CHECKS" -ForegroundColor Yellow

# Check legal documents
$legalFiles = @("privacy_policy.html", "terms_of_service.html")
$missingLegal = @()

foreach ($file in $legalFiles) {
    if (-not (Test-Path $file)) {
        $missingLegal += $file
    }
}

if ($missingLegal.Count -eq 0) {
    Write-Host "  ✅ Legal documents present" -ForegroundColor Green
    $checklist.Configuration += @("Legal docs present")
} else {
    Write-Host "  ❌ Missing legal documents: $($missingLegal -join ', ')" -ForegroundColor Red
}

# Check .env.production
if (Test-Path "apps/backend/.env.production") {
    $envFile = Get-Content "apps/backend/.env.production"
    
    $tempValues = @("your-", "placeholder", "example")
    $needsUpdate = $false
    
    foreach ($tempVal in $tempValues) {
        if ($envFile -match $tempVal) {
            $needsUpdate = $true
            break
        }
    }
    
    if ($needsUpdate) {
        Write-Host "  ⚠️  Environment: .env.production has placeholder values" -ForegroundColor Yellow
        Write-Host "      → Needs real credentials for: Google OAuth, Firebase, OpenAI, Payment Gateways" -ForegroundColor Yellow
        $checklist.Configuration += @("Credentials needed")
    } else {
        Write-Host "  ✅ Environment: .env.production appears configured" -ForegroundColor Green
        $checklist.Configuration += @("Credentials configured")
    }
} else {
    Write-Host "  ⚠️  Environment: .env.production not found" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$totalItems = 0
$completedItems = 0

foreach ($category in $checklist.Keys) {
    Write-Host "  $category:" -ForegroundColor Cyan
    foreach ($item in $checklist[$category]) {
        $totalItems++
        if ($item -like "*NOT*" -or $item -like "*Missing*" -or $item -like "*placeholder*") {
            Write-Host "    ⚠️  $item" -ForegroundColor Yellow
        } else {
            Write-Host "    ✅ $item" -ForegroundColor Green
            $completedItems++
        }
    }
}

Write-Host ""
$percentage = if ($totalItems -gt 0) { [math]::Round(($completedItems / $totalItems) * 100, 0) } else { 0 }

Write-Host "OVERALL PROGRESS: $completedItems/$totalItems items (~$percentage%)" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# RECOMMENDATIONS
# ============================================================================
Write-Host "================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "apps/backend/node_modules")) {
    Write-Host "1. Install backend dependencies:" -ForegroundColor Yellow
    Write-Host "   cd apps\backend && npm install" -ForegroundColor Gray
    Write-Host ""
}

if (-not (Test-Path "apps/frontend/node_modules")) {
    Write-Host "2. Install frontend dependencies:" -ForegroundColor Yellow
    Write-Host "   cd apps\frontend && npm install" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "3. Set up database migrations:" -ForegroundColor Yellow
Write-Host "   cd apps\backend && npx prisma generate && npx prisma db push" -ForegroundColor Gray
Write-Host ""

Write-Host "4. Configure environment credentials:" -ForegroundColor Yellow
Write-Host "   - Edit: apps/backend/.env.production" -ForegroundColor Gray
Write-Host "   - Add: Google OAuth, Firebase, OpenAI, Payment gateway keys" -ForegroundColor Gray
Write-Host ""

Write-Host "5. Verify backend starts:" -ForegroundColor Yellow
Write-Host "   cd apps\backend && npm run dev" -ForegroundColor Gray
Write-Host ""

Write-Host "When all steps are complete, you're ready for Week 3 (Testing)!" -ForegroundColor Green
Write-Host ""