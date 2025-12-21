# Setup script for local development database
# This script sets the DATABASE_URL to SQLite for local development

Write-Host "Setting up local development database..." -ForegroundColor Green

# Set DATABASE_URL to SQLite for local development
$env:DATABASE_URL = "file:./dev.db"

# Push schema to database
Write-Host "Pushing Prisma schema to database..." -ForegroundColor Yellow
npx prisma db push

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

Write-Host "Database setup complete!" -ForegroundColor Green
Write-Host "DATABASE_URL is set to: file:./dev.db" -ForegroundColor Cyan


































