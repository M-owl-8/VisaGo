# Simple backend startup script
# Run this in PowerShell

Set-Location "c:\work\VisaBuddy\apps\backend"

Write-Host "Installing dependencies..." -ForegroundColor Green
node "C:\Program Files\nodejs\npm.js" install

Write-Host "`nSeeding database..." -ForegroundColor Green
node "C:\Program Files\nodejs\npm.js" run db:seed

Write-Host "`nStarting backend server on port 3000..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Yellow

node "C:\Program Files\nodejs\npm.js" run dev