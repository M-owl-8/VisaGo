# ============================================================================
# VisaBuddy Production Database Migration Script (PowerShell)
# ============================================================================
# 
# Runs Prisma migrations for production database
# Usage: .\scripts\migrate-production.ps1
#
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     VisaBuddy Production Database Migration                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path "apps\backend\.env") -and -not (Test-Path "apps\backend\.env.production")) {
    Write-Host "❌ No .env file found in apps\backend\" -ForegroundColor Red
    Write-Host "Please run .\scripts\setup-production.ps1 first"
    exit 1
}

# Load environment variables
$envFile = if (Test-Path "apps\backend\.env.production") { 
    "apps\backend\.env.production" 
} else { 
    "apps\backend\.env" 
}

Write-Host "📋 Loading environment from $envFile..." -ForegroundColor Cyan

$envContent = Get-Content $envFile | Where-Object { $_ -match '^\s*[^#]' -and $_ -match '=' }
foreach ($line in $envContent) {
    if ($line -match '^\s*([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $value = $value -replace '^["'']|["'']$', ''
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL is not set" -ForegroundColor Red
    Write-Host "Please set DATABASE_URL in your .env file"
    exit 1
}

$dbUrlMasked = $env:DATABASE_URL -replace ':[^:@]+@', ':***@'
Write-Host "🔗 Database URL: $dbUrlMasked" -ForegroundColor Cyan
Write-Host ""

# Confirm before proceeding
$confirm = Read-Host "⚠️  This will run migrations on the production database. Continue? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Migration cancelled." -ForegroundColor Red
    exit 0
}

Push-Location apps\backend

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "📊 Running Database Migrations"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

# Generate Prisma Client
Write-Host "1. Generating Prisma Client..." -ForegroundColor Cyan
npx prisma generate
Write-Host "✅ Prisma Client generated" -ForegroundColor Green

# Run migrations
Write-Host ""
Write-Host "2. Running migrations..." -ForegroundColor Cyan
npx prisma migrate deploy
Write-Host "✅ Migrations completed" -ForegroundColor Green

Pop-Location

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "✅ Migration Complete!"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "  1. Verify tables: npx prisma studio (opens at http://localhost:5555)"
Write-Host "  2. Seed database (optional): cd apps\backend; npm run db:seed"
Write-Host "  3. Test your application"
Write-Host ""








