# ============================================================================
# Generate Secure Secrets for VisaBuddy (PowerShell)
# ============================================================================
# 
# This script generates secure random secrets for JWT and other uses
#
# Usage:
#   .\scripts\generate-secrets.ps1
#
# ============================================================================

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗"
Write-Host "║     VisaBuddy Secret Generation                                   ║"
Write-Host "╚══════════════════════════════════════════════════════════════════╝"
Write-Host ""

Write-Host "🔐 Generating secure secrets..." -ForegroundColor Cyan
Write-Host ""

# Generate JWT secret using .NET cryptography
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$JWT_SECRET = [Convert]::ToBase64String($bytes)

Write-Host "JWT_SECRET (32+ characters, base64):" -ForegroundColor Green
Write-Host $JWT_SECRET
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""
Write-Host "📋 Add this to your apps/backend/.env file:" -ForegroundColor Yellow
Write-Host ""
Write-Host "JWT_SECRET=$JWT_SECRET" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT:" -ForegroundColor Red
Write-Host "   - Never share this secret"
Write-Host "   - Never commit it to git"
Write-Host "   - Store it securely"
Write-Host "   - Rotate it every 90 days"
Write-Host ""








