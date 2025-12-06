# Verify Backend is Online and Accessible
# This script checks if the backend API is accessible

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Backend Connectivity Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$backendUrl = "https://visabuddy-backend-production.up.railway.app"
$healthEndpoint = "$backendUrl/api/health"

Write-Host "[INFO] Checking backend connectivity..." -ForegroundColor Yellow
Write-Host "[INFO] Backend URL: $backendUrl" -ForegroundColor Gray
Write-Host ""

# Test 1: Basic connectivity
Write-Host "[TEST 1] Testing basic connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $healthEndpoint -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "[SUCCESS] Backend is online!" -ForegroundColor Green
    Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor Gray
    Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "[ERROR] Backend is not accessible!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "[INFO] Possible causes:" -ForegroundColor Yellow
    Write-Host "   1. Backend is down (check Railway dashboard)" -ForegroundColor White
    Write-Host "   2. Backend URL is incorrect" -ForegroundColor White
    Write-Host "   3. Network/firewall blocking connection" -ForegroundColor White
    Write-Host "   4. Backend is not publicly accessible" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Test 2: Check if it's the correct backend
Write-Host "[TEST 2] Verifying backend response..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $healthEndpoint -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "[SUCCESS] Backend is responding correctly!" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Backend returned status: $($response.StatusCode)" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "[ERROR] Failed to verify backend response" -ForegroundColor Red
    Write-Host ""
}

# Test 3: Check DNS resolution
Write-Host "[TEST 3] Checking DNS resolution..." -ForegroundColor Yellow
try {
    $hostname = ([System.Uri]$backendUrl).Host
    $dnsResult = Resolve-DnsName -Name $hostname -ErrorAction Stop
    Write-Host "[SUCCESS] DNS resolution works!" -ForegroundColor Green
    Write-Host "   Hostname: $hostname" -ForegroundColor Gray
    Write-Host "   IP Address: $($dnsResult[0].IPAddress)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "[ERROR] DNS resolution failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[RESULT] Backend Status: ONLINE" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Your app should work correctly if:" -ForegroundColor Yellow
Write-Host "   1. Phone has internet connection" -ForegroundColor White
Write-Host "   2. Backend remains online" -ForegroundColor White
Write-Host "   3. No firewall blocking the connection" -ForegroundColor White
Write-Host ""
Write-Host "[TIP] Test on your phone:" -ForegroundColor Yellow
Write-Host "   Open browser and visit: $healthEndpoint" -ForegroundColor White
Write-Host "   If you see a response, the app will work!" -ForegroundColor White
Write-Host ""























