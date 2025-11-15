# ============================================================================
# Fix Prisma Client - Regenerate after schema changes
# ============================================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "     Fix Prisma Client                                                    " -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $rootDir "apps\backend"

Write-Host "Stopping any running Node processes that might lock Prisma files..." -ForegroundColor Yellow

# Try to stop any node processes (be careful!)
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*VisaBuddy*" -or $_.CommandLine -like "*ts-node*" -or $_.CommandLine -like "*prisma*"
}

if ($nodeProcesses) {
    Write-Host "Found Node processes. Please stop the backend server manually if running." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C in the terminal where backend is running, then press Enter here..." -ForegroundColor Yellow
    Read-Host
}

Write-Host ""
Write-Host "Cleaning Prisma client cache..." -ForegroundColor Yellow

# Remove Prisma client from both locations (monorepo root and backend)
$prismaPaths = @(
    Join-Path $rootDir "node_modules\.prisma",
    Join-Path $backendDir "node_modules\.prisma"
)

foreach ($path in $prismaPaths) {
    if (Test-Path $path) {
        Write-Host "  Removing: $path" -ForegroundColor Gray
        try {
            Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        } catch {
            Write-Host "  [WARN] Could not remove $path - may be locked" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "Regenerating Prisma client..." -ForegroundColor Yellow

Push-Location $backendDir

try {
    # Generate Prisma client
    npm run db:generate
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[OK] Prisma client regenerated successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "The resetToken and resetTokenExpiry fields should now be available." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[ERROR] Prisma generation failed" -ForegroundColor Red
        Write-Host ""
        Write-Host "If you see file lock errors:" -ForegroundColor Yellow
        Write-Host "  1. Make sure backend server is NOT running" -ForegroundColor White
        Write-Host "  2. Close any IDEs/editors that might have Prisma files open" -ForegroundColor White
        Write-Host "  3. Try restarting your computer if the issue persists" -ForegroundColor White
        Write-Host ""
        Write-Host "Then run this script again." -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "[ERROR] Failed to regenerate Prisma client: $_" -ForegroundColor Red
} finally {
    Pop-Location
}

Write-Host ""
