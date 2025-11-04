#!/usr/bin/env pwsh
# =============================================================================
# VisaBuddy - Start Backend Server
# =============================================================================

$ProjectRoot = "c:\work\VisaBuddy"
$BackendDir = "$ProjectRoot\apps\backend"

Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  VisaBuddy Backend Server                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n[INFO] Navigating to backend..." -ForegroundColor Cyan
Set-Location $BackendDir

Write-Host "[INFO] Installing dependencies if needed..." -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    npm install
}

Write-Host "[INFO] Generating Prisma client..." -ForegroundColor Cyan
npm run db:generate 2>&1 | Out-Null

Write-Host "[OK] Starting backend server..." -ForegroundColor Green
Write-Host "[URL] http://localhost:3000" -ForegroundColor Green
Write-Host "[INFO] Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host "`n" -ForegroundColor Gray

npm run dev