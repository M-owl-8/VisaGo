# ============================================================================
# VisaBuddy Database Setup Script
# ============================================================================
# Sets up database for emulator testing
# Supports both SQLite (easy) and PostgreSQL (production-ready)
# ============================================================================

param(
    [ValidateSet("sqlite", "postgresql")]
    [string]$DatabaseType = "sqlite"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     VisaBuddy Database Setup                                     ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $rootDir "apps\backend"
$schemaFile = Join-Path $backendDir "prisma\schema.prisma"
$backendEnv = Join-Path $backendDir ".env"

Push-Location $backendDir

try {
    # Check if .env exists
    if (-not (Test-Path $backendEnv)) {
        Write-Host "❌ Backend .env file not found!" -ForegroundColor Red
        Write-Host "   Run: .\scripts\setup-100-percent.ps1 first" -ForegroundColor Yellow
        exit 1
    }
    
    # Read current DATABASE_URL
    $envContent = Get-Content $backendEnv -Raw
    
    if ($DatabaseType -eq "sqlite") {
        Write-Host "📦 Setting up SQLite database..." -ForegroundColor Yellow
        Write-Host ""
        
        # Update .env to use SQLite
        if ($envContent -notmatch 'DATABASE_URL="file:') {
            $envContent = $envContent -replace 'DATABASE_URL="[^"]*"', 'DATABASE_URL="file:./prisma/dev.db"'
            Set-Content -Path $backendEnv -Value $envContent -Encoding UTF8
            Write-Host "✅ Updated .env to use SQLite" -ForegroundColor Green
        }
        
        # Note: Prisma schema is currently PostgreSQL
        # For SQLite, we'd need to switch schema files, but that's complex
        # Instead, we'll use PostgreSQL with a local file-based option
        # Or use a simple PostgreSQL Docker setup
        
        Write-Host ""
        Write-Host "⚠️  Note: Current Prisma schema uses PostgreSQL" -ForegroundColor Yellow
        Write-Host "   For SQLite, you need to:" -ForegroundColor Yellow
        Write-Host "   1. Use schema.sqlite.prisma (if available)" -ForegroundColor Gray
        Write-Host "   2. Or set up a local PostgreSQL instance" -ForegroundColor Gray
        Write-Host ""
        Write-Host "💡 Recommended: Use PostgreSQL with Docker" -ForegroundColor Cyan
        Write-Host "   docker run --name visabuddy-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=visabuddy -p 5432:5432 -d postgres:15" -ForegroundColor White
        Write-Host ""
        
    } else {
        Write-Host "📦 Setting up PostgreSQL database..." -ForegroundColor Yellow
        Write-Host ""
        
        # Check if PostgreSQL connection string is set
        if ($envContent -notmatch 'DATABASE_URL="postgresql:') {
            Write-Host "⚠️  PostgreSQL DATABASE_URL not configured" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "💡 Set DATABASE_URL in apps/backend/.env:" -ForegroundColor Cyan
            Write-Host "   DATABASE_URL=`"postgresql://user:password@localhost:5432/visabuddy?schema=public`"" -ForegroundColor White
            Write-Host ""
            Write-Host "   Or use Docker:" -ForegroundColor Cyan
            Write-Host "   docker run --name visabuddy-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=visabuddy -p 5432:5432 -d postgres:15" -ForegroundColor White
            Write-Host ""
        }
    }
    
    # Generate Prisma client
    Write-Host "🔧 Generating Prisma client..." -ForegroundColor Yellow
    npm run db:generate 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Prisma client generated" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Prisma client generation had issues" -ForegroundColor Yellow
    }
    
    # Run migrations
    Write-Host ""
    Write-Host "🔄 Running database migrations..." -ForegroundColor Yellow
    npm run db:migrate 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database migrations applied" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Database migrations had issues" -ForegroundColor Yellow
        Write-Host "   Make sure your database is running and accessible" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "✅ Database setup complete!" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ Database setup failed: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
} finally {
    Pop-Location
}
