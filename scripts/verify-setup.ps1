# ============================================================================
# VisaBuddy Setup Verification Script (PowerShell)
# ============================================================================
# 
# Verifies that the environment is properly configured
# Usage: .\scripts\verify-setup.ps1
#
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     VisaBuddy Setup Verification                                  ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$script:Errors = 0
$script:Warnings = 0

# Function to check if command exists
function Test-Command {
    param([string]$Command)
    
    if (Get-Command $Command -ErrorAction SilentlyContinue) {
        Write-Host "✅ $Command is installed" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $Command is not installed" -ForegroundColor Red
        $script:Errors++
        return $false
    }
}

# Function to check if file exists
function Test-File {
    param([string]$FilePath)
    
    if (Test-Path $FilePath) {
        Write-Host "✅ $FilePath exists" -ForegroundColor Green
        return $true
    } else {
        Write-Host "⚠️  $FilePath not found" -ForegroundColor Yellow
        $script:Warnings++
        return $false
    }
}

# Function to check if directory exists
function Test-Directory {
    param([string]$DirPath)
    
    if (Test-Path $DirPath -PathType Container) {
        Write-Host "✅ $DirPath exists" -ForegroundColor Green
        return $true
    } else {
        Write-Host "⚠️  $DirPath not found" -ForegroundColor Yellow
        $script:Warnings++
        return $false
    }
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "🔍 Checking Prerequisites"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

Test-Command "node"
Test-Command "npm"
Test-Command "git"

# Check Node version
$nodeVersion = (node -v).Substring(1).Split('.')[0]
if ([int]$nodeVersion -ge 20) {
    Write-Host "✅ Node.js version is 20+" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js version must be 20 or higher (current: $(node -v))" -ForegroundColor Red
    $script:Errors++
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "📁 Checking Project Structure"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

Test-Directory "apps\backend"
Test-Directory "apps\frontend"
Test-Directory "apps\ai-service"
Test-File "package.json"
Test-File "docker-compose.yml"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "📦 Checking Dependencies"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

if (Test-Path "node_modules") {
    Write-Host "✅ Root node_modules exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  Root node_modules not found - run: npm install" -ForegroundColor Yellow
    $script:Warnings++
}

if (Test-Path "apps\backend\node_modules") {
    Write-Host "✅ Backend node_modules exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend node_modules not found - run: cd apps\backend; npm install" -ForegroundColor Yellow
    $script:Warnings++
}

if (Test-Path "apps\frontend\node_modules") {
    Write-Host "✅ Frontend node_modules exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  Frontend node_modules not found - run: cd apps\frontend; npm install" -ForegroundColor Yellow
    $script:Warnings++
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "🔐 Checking Environment Configuration"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

# Run validation script
if (Test-Path "scripts\validate-env.ps1") {
    Write-Host "Running environment validation..."
    & "scripts\validate-env.ps1" all
    if ($LASTEXITCODE -ne 0) {
        $script:Warnings++
    }
} else {
    Write-Host "⚠️  validate-env.ps1 not found" -ForegroundColor Yellow
    $script:Warnings++
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "📊 Verification Summary"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

if ($script:Errors -eq 0 -and $script:Warnings -eq 0) {
    Write-Host "✅ All checks passed!" -ForegroundColor Green
    exit 0
} elseif ($script:Errors -eq 0) {
    Write-Host "⚠️  $($script:Warnings) warning(s) found (non-critical)" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "❌ $($script:Errors) error(s) and $($script:Warnings) warning(s) found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the errors above before proceeding."
    exit 1
}








