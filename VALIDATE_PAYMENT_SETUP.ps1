# Payment Gateway Configuration Validator
# Validates all payment gateway setup for production deployment

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Payment Gateway Configuration Validator - Week 2         ║" -ForegroundColor Cyan
Write-Host "║  Error Handling & Resilience Implementation              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Color codes
$SUCCESS = "Green"
$ERROR = "Red"
$WARNING = "Yellow"
$INFO = "Cyan"

# Load .env.production
$envFile = "apps/backend/.env.production"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env.production not found at $envFile" -ForegroundColor $ERROR
    exit 1
}

$envContent = Get-Content $envFile -Raw
$envVars = @{}

foreach ($line in $envContent -split "`n") {
    if ($line -match "^([^=]+)=(.+)$") {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        # Remove quotes if present
        $value = $value -replace '^"(.*)"$', '$1'
        $envVars[$key] = $value
    }
}

Write-Host "✓ Loaded .env.production configuration" -ForegroundColor $SUCCESS
Write-Host ""

# Define required variables
$paymentGateways = @{
    "Payme" = @(
        "PAYME_MERCHANT_ID",
        "PAYME_API_KEY",
        "PAYME_SERVICE_ID",
        "PAYME_API_URL",
        "PAYME_WEBHOOK_SECRET"
    )
    "Click" = @(
        "CLICK_MERCHANT_ID",
        "CLICK_SERVICE_ID",
        "CLICK_API_KEY",
        "CLICK_MERCHANT_USER_ID",
        "CLICK_API_URL",
        "CLICK_WEBHOOK_SECRET"
    )
    "Uzum" = @(
        "UZUM_MERCHANT_ID",
        "UZUM_SERVICE_ID",
        "UZUM_API_KEY",
        "UZUM_API_URL",
        "UZUM_WEBHOOK_SECRET"
    )
    "Stripe" = @(
        "STRIPE_SECRET_KEY",
        "STRIPE_PUBLISHABLE_KEY",
        "STRIPE_WEBHOOK_SECRET"
    )
}

$retryConfig = @(
    "PAYMENT_RETRY_MAX_ATTEMPTS",
    "PAYMENT_RETRY_INITIAL_DELAY_MS",
    "PAYMENT_RETRY_MAX_DELAY_MS",
    "PAYMENT_RETRY_BACKOFF_MULTIPLIER",
    "PAYMENT_FALLBACK_STRATEGY",
    "PAYMENT_PRIMARY_GATEWAY"
)

$webhookConfig = @(
    "PAYMENT_WEBHOOK_CACHE_SIZE",
    "PAYMENT_WEBHOOK_CACHE_TTL_MINUTES",
    "PAYMENT_WEBHOOK_MAX_RETRY_ATTEMPTS"
)

# Validation counters
$totalChecks = 0
$passedChecks = 0
$warningCount = 0

function Check-Variable {
    param([string]$VarName, [string]$Category, [bool]$Required = $true)
    
    $totalChecks++
    $value = $envVars[$VarName]
    
    if ([string]::IsNullOrWhiteSpace($value) -or $value -like "*your-*") {
        if ($Required) {
            Write-Host "  ✗ $VarName - NOT CONFIGURED" -ForegroundColor $ERROR
            return $false
        } else {
            Write-Host "  ⚠ $VarName - Not set (optional)" -ForegroundColor $WARNING
            $script:warningCount++
            return $false
        }
    } else {
        $displayValue = if ($VarName -like "*SECRET*" -or $VarName -like "*KEY*" -or $VarName -like "*PASSWORD*") {
            $shortValue = $value.Substring(0, [Math]::Min(8, $value.Length)) + "..."
            "***$shortValue***"
        } else {
            $value
        }
        
        Write-Host "  ✓ $VarName = $displayValue" -ForegroundColor $SUCCESS
        $script:passedChecks++
        return $true
    }
}

# Section 1: Gateway Credentials
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $INFO
Write-Host "1. PAYMENT GATEWAY CREDENTIALS" -ForegroundColor $INFO
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $INFO
Write-Host ""

foreach ($gateway in $paymentGateways.Keys) {
    Write-Host "  $gateway Gateway:" -ForegroundColor $INFO
    foreach ($var in $paymentGateways[$gateway]) {
        Check-Variable -VarName $var -Category $gateway
    }
    Write-Host ""
}

# Section 2: Retry Configuration
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $INFO
Write-Host "2. RETRY & FALLBACK CONFIGURATION" -ForegroundColor $INFO
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $INFO
Write-Host ""

foreach ($var in $retryConfig) {
    Check-Variable -VarName $var -Category "Retry" -Required $false
}
Write-Host ""

# Validate retry values make sense
$maxAttempts = [int]$envVars["PAYMENT_RETRY_MAX_ATTEMPTS"]
$initialDelay = [int]$envVars["PAYMENT_RETRY_INITIAL_DELAY_MS"]
$maxDelay = [int]$envVars["PAYMENT_RETRY_MAX_DELAY_MS"]
$multiplier = [int]$envVars["PAYMENT_RETRY_BACKOFF_MULTIPLIER"]

if ($maxAttempts -gt 0 -and $initialDelay -gt 0 -and $maxDelay -gt $initialDelay -and $multiplier -gt 1) {
    # Calculate retry delays
    Write-Host "  Retry Schedule:" -ForegroundColor $INFO
    for ($i = 1; $i -le $maxAttempts; $i++) {
        $delay = $initialDelay * [Math]::Pow($multiplier, $i - 1)
        if ($delay -gt $maxDelay) { $delay = $maxDelay }
        Write-Host "    Attempt $i: ~$([int]$delay)ms delay" -ForegroundColor $SUCCESS
    }
}

Write-Host ""

# Section 3: Webhook Configuration
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $INFO
Write-Host "3. WEBHOOK CONFIGURATION" -ForegroundColor $INFO
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $INFO
Write-Host ""

foreach ($var in $webhookConfig) {
    Check-Variable -VarName $var -Category "Webhook" -Required $false
}
Write-Host ""

# Section 4: Database & Files
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $INFO
Write-Host "4. PROJECT FILES & DEPENDENCIES" -ForegroundColor $INFO
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $INFO
Write-Host ""

$filesToCheck = @(
    "apps/backend/src/services/payment-errors.ts",
    "apps/backend/src/services/payment-retry.ts",
    "apps/backend/src/services/payment-gateway.service.ts",
    "apps/backend/src/services/webhook-security.ts",
    "apps/backend/src/services/payment-audit-logger.ts",
    "apps/backend/prisma/schema.prisma"
)

foreach ($file in $filesToCheck) {
    if (Test-Path $file) {
        $totalChecks++
        $passedChecks++
        $name = Split-Path $file -Leaf
        Write-Host "  ✓ $name - Found" -ForegroundColor $SUCCESS
    } else {
        $totalChecks++
        Write-Host "  ✗ $file - NOT FOUND" -ForegroundColor $ERROR
    }
}

Write-Host ""

# Section 5: Documentation
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $INFO
Write-Host "5. DOCUMENTATION" -ForegroundColor $INFO
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $INFO
Write-Host ""

$docs = @(
    "PAYMENT_GATEWAY_ERROR_HANDLING.md",
    "PAYMENT_QUICK_REFERENCE.md",
    "PAYMENT_DEPLOYMENT_GUIDE.md",
    "PAYMENT_GATEWAY_SETUP_GUIDE.md"
)

foreach ($doc in $docs) {
    if (Test-Path $doc) {
        $totalChecks++
        $passedChecks++
        Write-Host "  ✓ $doc - Found" -ForegroundColor $SUCCESS
    } else {
        Write-Host "  ⚠ $doc - Not found (optional)" -ForegroundColor $WARNING
        $warningCount++
    }
}

Write-Host ""

# Section 6: Summary
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $INFO
Write-Host "VALIDATION SUMMARY" -ForegroundColor $INFO
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $INFO
Write-Host ""

$passPercentage = [Math]::Round(($passedChecks / $totalChecks) * 100, 1)
Write-Host "Total Checks: $totalChecks" -ForegroundColor $INFO
Write-Host "Passed: $passedChecks" -ForegroundColor $SUCCESS
Write-Host "Warnings: $warningCount" -ForegroundColor $WARNING
Write-Host "Failed: $($totalChecks - $passedChecks)" -ForegroundColor $ERROR
Write-Host "Pass Rate: $passPercentage%" -ForegroundColor $INFO
Write-Host ""

if ($passedChecks -eq $totalChecks) {
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor $SUCCESS
    Write-Host "║  ✓ ALL CHECKS PASSED - READY FOR DEPLOYMENT!              ║" -ForegroundColor $SUCCESS
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor $SUCCESS
    exit 0
} elseif ($passPercentage -ge 80) {
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor $WARNING
    Write-Host "║  ⚠ MOST CHECKS PASSED - FEW ISSUES TO RESOLVE             ║" -ForegroundColor $WARNING
    Write-Host "║  Review failed items above before deploying                ║" -ForegroundColor $WARNING
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor $WARNING
    exit 1
} else {
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor $ERROR
    Write-Host "║  ✗ CONFIGURATION INCOMPLETE - CANNOT DEPLOY YET            ║" -ForegroundColor $ERROR
    Write-Host "║  Complete the configuration steps before deploying         ║" -ForegroundColor $ERROR
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor $ERROR
    exit 1
}