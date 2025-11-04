#!/usr/bin/env pwsh
# Reconnect Expo Go to Metro Bundler

$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"

Write-Host "Getting emulator IP..." -ForegroundColor Cyan

# Get local IP
$ipaddr = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.AddressState -eq "Preferred" } | Select-Object -First 1).IPAddress
Write-Host "Your Machine IP: $ipaddr" -ForegroundColor Yellow

# Press Menu key to reload
Write-Host "Reloading Expo Go..." -ForegroundColor Cyan
& $adb shell input keyevent 82  # Menu button

Start-Sleep -Seconds 2

Write-Host "Done! The app should reload in a few seconds" -ForegroundColor Green
Write-Host "`nMetro is running on: http://localhost:8081" -ForegroundColor Cyan