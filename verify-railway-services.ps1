# Railway Service Verification Script
# This script helps verify your Railway services are configured correctly

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Railway Service Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Railway CLI is installed
Write-Host "1. Checking Railway CLI..." -ForegroundColor Yellow
try {
    $railwayVersion = railway --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Railway CLI installed: $railwayVersion" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Railway CLI not found. Install with: npm install -g @railway/cli" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Railway CLI not found. Install with: npm install -g @railway/cli" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check current directory
Write-Host "2. Checking project directory..." -ForegroundColor Yellow
$currentDir = Get-Location
Write-Host "   Current directory: $currentDir" -ForegroundColor Gray

if (-not (Test-Path "railway.json")) {
    Write-Host "   ❌ railway.json not found in current directory" -ForegroundColor Red
    Write-Host "   Please run this script from the project root (C:\work\VisaGo-clean)" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "   ✅ railway.json found" -ForegroundColor Green
}

Write-Host ""

# Check git remote
Write-Host "3. Checking Git repository..." -ForegroundColor Yellow
try {
    $gitRemote = git remote get-url origin 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Git remote: $gitRemote" -ForegroundColor Green
        if ($gitRemote -match "M-owl-8/VisaGo") {
            Write-Host "   ✅ Repository matches expected: M-owl-8/VisaGo" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Repository may not match expected: M-owl-8/VisaGo" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️  Could not determine git remote" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not check git remote" -ForegroundColor Yellow
}

Write-Host ""

# Check if linked to Railway project
Write-Host "4. Checking Railway project link..." -ForegroundColor Yellow
try {
    $railwayStatus = railway status 2>&1
    if ($LASTEXITCODE -eq 0 -and $railwayStatus -notmatch "not linked") {
        Write-Host "   ✅ Project is linked to Railway" -ForegroundColor Green
        Write-Host "   $railwayStatus" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  Project not linked. Run: railway link" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not check Railway link status" -ForegroundColor Yellow
}

Write-Host ""

# List services
Write-Host "5. Checking Railway services..." -ForegroundColor Yellow
try {
    $services = railway service list 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Available services:" -ForegroundColor Gray
        $services | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
        
        # Check for expected services
        $servicesString = $services -join " "
        if ($servicesString -match "VisaGo") {
            Write-Host "   ✅ VisaGo service found" -ForegroundColor Green
        } else {
            Write-Host "   ❌ VisaGo service NOT found" -ForegroundColor Red
        }
        
        if ($servicesString -match "zippy-perfection") {
            Write-Host "   ✅ zippy-perfection service found" -ForegroundColor Green
        } else {
            Write-Host "   ❌ zippy-perfection service NOT found" -ForegroundColor Red
        }
    } else {
        Write-Host "   ⚠️  Could not list services. Make sure you're logged in: railway login" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not check services" -ForegroundColor Yellow
}

Write-Host ""

# Verify railway.json matches actual services
Write-Host "6. Verifying railway.json configuration..." -ForegroundColor Yellow
try {
    $railwayJson = Get-Content "railway.json" | ConvertFrom-Json
    $backendName = $railwayJson.services.backend.name
    $aiServiceName = $railwayJson.services."ai-service".name
    
    Write-Host "   Backend service name in railway.json: $backendName" -ForegroundColor Gray
    Write-Host "   AI service name in railway.json: $aiServiceName" -ForegroundColor Gray
    
    if ($backendName -eq "VisaGo") {
        Write-Host "   ✅ Backend name matches expected: VisaGo" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Backend name mismatch. Expected: VisaGo, Found: $backendName" -ForegroundColor Yellow
    }
    
    if ($aiServiceName -eq "zippy-perfection") {
        Write-Host "   ✅ AI service name matches expected: zippy-perfection" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  AI service name mismatch. Expected: zippy-perfection, Found: $aiServiceName" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Could not read railway.json" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verification Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. If services are not linked, run: railway link" -ForegroundColor White
Write-Host "2. To deploy backend: railway service VisaGo && railway up" -ForegroundColor White
Write-Host "3. To deploy AI service: railway service zippy-perfection && railway up" -ForegroundColor White
Write-Host ""

