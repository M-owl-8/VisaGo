# ============================================================================
# VisaBuddy Database Backup Script (PowerShell)
# ============================================================================
# 
# Creates a backup of the production database
# Usage: .\scripts\backup-database.ps1 [output-file]
#
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     VisaBuddy Database Backup                                     ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path "apps\backend\.env") -and -not (Test-Path "apps\backend\.env.production")) {
    Write-Host "❌ No .env file found" -ForegroundColor Red
    exit 1
}

# Load environment variables
$envFile = if (Test-Path "apps\backend\.env.production") { 
    "apps\backend\.env.production" 
} else { 
    "apps\backend\.env" 
}

$envContent = Get-Content $envFile | Where-Object { $_ -match '^\s*[^#]' -and $_ -match 'DATABASE_URL' }
foreach ($line in $envContent) {
    if ($line -match '^\s*DATABASE_URL=(.*)$') {
        $value = $matches[1].Trim()
        $value = $value -replace '^["'']|["'']$', ''
        $env:DATABASE_URL = $value
    }
}

if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL is not set" -ForegroundColor Red
    exit 1
}

# Create backup directory
$BACKUP_DIR = "backups"
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$OUTPUT_FILE = if ($args[0]) { $args[0] } else { "$BACKUP_DIR\visabuddy_backup_$TIMESTAMP.sql" }

Write-Host "📦 Creating backup..." -ForegroundColor Cyan
Write-Host "   Output: $OUTPUT_FILE" -ForegroundColor Cyan
Write-Host ""

# Check if pg_dump is available
if (Get-Command pg_dump -ErrorAction SilentlyContinue) {
    pg_dump $env:DATABASE_URL | Out-File -FilePath $OUTPUT_FILE -Encoding utf8
    $fileSize = (Get-Item $OUTPUT_FILE).Length / 1KB
    Write-Host "✅ Backup created successfully" -ForegroundColor Green
    Write-Host "   File: $OUTPUT_FILE" -ForegroundColor Cyan
    Write-Host "   Size: $([math]::Round($fileSize, 2)) KB" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  pg_dump not found" -ForegroundColor Yellow
    Write-Host "Please install PostgreSQL client tools or use Prisma Studio to export data"
    Write-Host ""
    Write-Host "Alternative: Use Prisma Studio to export data:"
    Write-Host "  npx prisma studio"
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "✅ Backup Complete!"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""








