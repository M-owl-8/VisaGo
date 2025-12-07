# Test Chat API Script
# Tests the chat endpoint with a sample question

$baseUrl = "https://visago-production.up.railway.app"
$testEmail = "test@example.com"
$testPassword = "TestPassword123!"

Write-Host "Testing Chat API..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Login to get token
Write-Host "1. Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop
    
    if ($loginResponse.success -and $loginResponse.data.token) {
        $token = $loginResponse.data.token
        Write-Host "✓ Login successful" -ForegroundColor Green
    } else {
        Write-Host "✗ Login failed: $($loginResponse.error.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Login error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Note: You may need to create a test account first" -ForegroundColor Yellow
    exit 1
}

# Step 2: Test Chat
Write-Host ""
Write-Host "2. Testing chat with question: 'What is the best country to study?'" -ForegroundColor Yellow

$chatBody = @{
    query = "What is the best country to study?"
    applicationId = $null
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $chatResponse = Invoke-RestMethod -Uri "$baseUrl/api/chat" `
        -Method POST `
        -Headers $headers `
        -Body $chatBody `
        -ErrorAction Stop
    
    if ($chatResponse.success) {
        Write-Host "✓ Chat response received!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Response:" -ForegroundColor Cyan
        Write-Host $chatResponse.data.message -ForegroundColor White
        Write-Host ""
        Write-Host "Model: $($chatResponse.data.model)" -ForegroundColor Gray
        Write-Host "Tokens used: $($chatResponse.data.tokens_used)" -ForegroundColor Gray
        if ($chatResponse.data.sources -and $chatResponse.data.sources.Count -gt 0) {
            Write-Host "Sources: $($chatResponse.data.sources.Count)" -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host "✓ Chat API is working correctly!" -ForegroundColor Green
    } else {
        Write-Host "✗ Chat failed: $($chatResponse.error.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Chat error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
    exit 1
}

Write-Host ""
Write-Host "Test completed successfully!" -ForegroundColor Green




















