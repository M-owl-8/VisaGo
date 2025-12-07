# Fix DATABASE_URL in .env file for local development
# This script updates the .env file to use SQLite for local development

$envFile = Join-Path $PSScriptRoot "..\.env"

if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env file not found at: $envFile" -ForegroundColor Red
    Write-Host "Please create a .env file first by copying ENV_EXAMPLE.md" -ForegroundColor Yellow
    exit 1
}

Write-Host "Updating DATABASE_URL in .env file..." -ForegroundColor Green

# Read the .env file
$content = Get-Content $envFile -Raw

# Replace DATABASE_URL line (handles various formats)
$content = $content -replace '(?m)^DATABASE_URL=.*$', 'DATABASE_URL=file:./dev.db'

# If DATABASE_URL doesn't exist, add it
if ($content -notmatch 'DATABASE_URL=') {
    $content = "DATABASE_URL=file:./dev.db`n" + $content
}

# Write back to file
Set-Content -Path $envFile -Value $content -NoNewline

Write-Host "✅ DATABASE_URL updated to: file:./dev.db" -ForegroundColor Green
Write-Host "Now run: npx prisma db push" -ForegroundColor Cyan



























