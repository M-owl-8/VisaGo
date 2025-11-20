# Update Railway Backend URL in Frontend Code
# This script helps you update the Railway URL in the mobile app

param(
    [Parameter(Mandatory=$true)]
    [string]$RailwayUrl
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Update Railway Backend URL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Remove trailing slash if present
$RailwayUrl = $RailwayUrl.TrimEnd('/')

Write-Host "Updating Railway URL to: $RailwayUrl" -ForegroundColor Yellow
Write-Host ""

# Files to update
$filesToUpdate = @(
    @{
        Path = "frontend_new\src\services\api.ts"
        Pattern = "https://visabuddy-backend-production.up.railway.app"
        Description = "API service base URL"
    },
    @{
        Path = "frontend_new\src\config\constants.ts"
        Pattern = "https://visabuddy-backend-production.up.railway.app"
        Description = "Constants API URL"
    },
    @{
        Path = "frontend_new\src\services\streaming-api.ts"
        Pattern = "https://visabuddy-backend-production.up.railway.app"
        Description = "Streaming API URL"
    }
)

$updatedCount = 0

foreach ($file in $filesToUpdate) {
    $filePath = Join-Path $PSScriptRoot ".." $file.Path
    
    if (Test-Path $filePath) {
        Write-Host "Updating: $($file.Description)" -ForegroundColor Gray
        $content = Get-Content $filePath -Raw
        $newContent = $content -replace [regex]::Escape($file.Pattern), $RailwayUrl
        
        if ($content -ne $newContent) {
            Set-Content -Path $filePath -Value $newContent -NoNewline
            Write-Host "  ✅ Updated: $($file.Path)" -ForegroundColor Green
            $updatedCount++
        } else {
            Write-Host "  ⚠️  No changes needed: $($file.Path)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ❌ File not found: $($file.Path)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Files updated: $updatedCount" -ForegroundColor $(if ($updatedCount -gt 0) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify the URL is correct: $RailwayUrl" -ForegroundColor White
Write-Host "2. Test the backend: $RailwayUrl/api/health" -ForegroundColor White
Write-Host "3. Rebuild the APK: cd scripts && .\build-standalone-apk.ps1" -ForegroundColor White
Write-Host ""

