# Quick Start: Payment Gateway Configuration
# Run this to configure and validate payment setup

param(
    [switch]$Validate = $false,
    [switch]$Test = $false,
    [switch]$Help = $false
)

if ($Help) {
    Write-Host @"
Payment Gateway Configuration - Quick Start Guide

Usage:
  .\START_PAYMENT_SETUP.ps1                    # Show setup menu
  .\START_PAYMENT_SETUP.ps1 -Validate         # Validate configuration
  .\START_PAYMENT_SETUP.ps1 -Test             # Test gateway connections
  .\START_PAYMENT_SETUP.ps1 -Help             # Show this help

Steps to complete payment gateway setup:

1. Gather credentials from each gateway:
   - Payme Dashboard (https://merchant.payme.uz)
   - Click Dashboard (https://merchant.click.uz)
   - Uzum Dashboard (https://merchant.uzum.uz)
   - Stripe Dashboard (https://dashboard.stripe.com)

2. Update .env.production with your credentials:
   - PAYME_MERCHANT_ID=your-value
   - CLICK_MERCHANT_ID=your-value
   - ... and others (see PAYMENT_GATEWAY_SETUP_GUIDE.md)

3. Validate configuration:
   .\START_PAYMENT_SETUP.ps1 -Validate

4. Apply database migration:
   cd apps\backend
   npx prisma migrate dev --name add_webhook_idempotency

5. Rebuild and test:
   npm run build
   npm run dev

For detailed setup instructions, see: PAYMENT_GATEWAY_SETUP_GUIDE.md
"@
    exit 0
}

# Colors
$SUCCESS = "Green"
$ERROR = "Red"
$WARNING = "Yellow"
$INFO = "Cyan"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor $INFO
Write-Host "║  Payment Gateway Configuration - Quick Start              ║" -ForegroundColor $INFO
Write-Host "║  Week 2: Error Handling & Resilience Implementation       ║" -ForegroundColor $INFO
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor $INFO
Write-Host ""

if ($Validate) {
    # Run validation script
    Write-Host "Running configuration validation..." -ForegroundColor $INFO
    Write-Host ""
    
    if (Test-Path "VALIDATE_PAYMENT_SETUP.ps1") {
        & .\VALIDATE_PAYMENT_SETUP.ps1
    } else {
        Write-Host "ERROR: VALIDATE_PAYMENT_SETUP.ps1 not found" -ForegroundColor $ERROR
        exit 1
    }
    exit $LASTEXITCODE
}

if ($Test) {
    # Test gateway connections
    Write-Host "Testing payment gateway connections..." -ForegroundColor $INFO
    Write-Host ""
    
    $backends = @{
        "Payme" = "https://checkout.payme.uz"
        "Click" = "https://api.click.uz"
        "Uzum" = "https://api.uzum.uz"
        "Stripe" = "https://api.stripe.com"
    }
    
    foreach ($gateway in $backends.Keys) {
        Write-Host "Testing $gateway..." -ForegroundColor $INFO
        try {
            $response = Invoke-WebRequest -Uri $backends[$gateway] -Method Head -TimeoutSec 5 -ErrorAction Stop
            Write-Host "  ✓ $gateway is accessible" -ForegroundColor $SUCCESS
        } catch {
            Write-Host "  ✗ $gateway is not responding" -ForegroundColor $ERROR
        }
    }
    
    Write-Host ""
    Write-Host "Backend connection test..." -ForegroundColor $INFO
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 3 -ErrorAction Stop
        Write-Host "  ✓ Backend is running on port 3000" -ForegroundColor $SUCCESS
    } catch {
        Write-Host "  ⚠ Backend not running on port 3000" -ForegroundColor $WARNING
        Write-Host "    Start with: cd apps\backend; npm run dev" -ForegroundColor $INFO
    }
    
    exit 0
}

# Main menu
function Show-Menu {
    Write-Host "What would you like to do?" -ForegroundColor $INFO
    Write-Host ""
    Write-Host "  [1] View setup instructions for Payme" -ForegroundColor $INFO
    Write-Host "  [2] View setup instructions for Click" -ForegroundColor $INFO
    Write-Host "  [3] View setup instructions for Uzum" -ForegroundColor $INFO
    Write-Host "  [4] View setup instructions for Stripe" -ForegroundColor $INFO
    Write-Host "  [5] Validate configuration" -ForegroundColor $INFO
    Write-Host "  [6] Test gateway connections" -ForegroundColor $INFO
    Write-Host "  [7] Show .env.production template" -ForegroundColor $INFO
    Write-Host "  [8] Open PAYMENT_GATEWAY_SETUP_GUIDE.md" -ForegroundColor $INFO
    Write-Host "  [9] Apply database migration" -ForegroundColor $INFO
    Write-Host "  [0] Exit" -ForegroundColor $INFO
    Write-Host ""
}

function Show-Payme-Instructions {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor $INFO
    Write-Host "║  PAYME SETUP INSTRUCTIONS                                 ║" -ForegroundColor $INFO
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor $INFO
    Write-Host ""
    
    Write-Host "Step 1: Visit https://merchant.payme.uz/" -ForegroundColor $INFO
    Write-Host "Step 2: Go to Settings → Merchant Information" -ForegroundColor $INFO
    Write-Host "Step 3: Find and copy:" -ForegroundColor $INFO
    Write-Host "  - PAYME_MERCHANT_ID (your merchant ID)" -ForegroundColor $WARNING
    Write-Host "  - PAYME_SERVICE_ID (your service ID for visa payments)" -ForegroundColor $WARNING
    Write-Host "  - PAYME_API_KEY (request from support if not visible)" -ForegroundColor $WARNING
    Write-Host ""
    Write-Host "Step 4: Generate webhook secret:" -ForegroundColor $INFO
    Write-Host "  openssl rand -hex 32" -ForegroundColor $SUCCESS
    Write-Host ""
    Write-Host "Step 5: Set these in .env.production:" -ForegroundColor $INFO
    Write-Host "  PAYME_MERCHANT_ID=..." -ForegroundColor $SUCCESS
    Write-Host "  PAYME_API_KEY=..." -ForegroundColor $SUCCESS
    Write-Host "  PAYME_SERVICE_ID=..." -ForegroundColor $SUCCESS
    Write-Host "  PAYME_WEBHOOK_SECRET=..." -ForegroundColor $SUCCESS
    Write-Host ""
    Write-Host "Step 6: In Payme dashboard, add webhook:" -ForegroundColor $INFO
    Write-Host "  URL: https://your-domain.com/api/payments/webhook/payme" -ForegroundColor $SUCCESS
    Write-Host "  Secret: (use the value from PAYME_WEBHOOK_SECRET)" -ForegroundColor $SUCCESS
    Write-Host ""
}

function Show-Click-Instructions {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor $INFO
    Write-Host "║  CLICK SETUP INSTRUCTIONS                                 ║" -ForegroundColor $INFO
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor $INFO
    Write-Host ""
    
    Write-Host "Step 1: Visit https://merchant.click.uz/" -ForegroundColor $INFO
    Write-Host "Step 2: Go to Account → Security Settings" -ForegroundColor $INFO
    Write-Host "Step 3: Find and copy:" -ForegroundColor $INFO
    Write-Host "  - CLICK_MERCHANT_ID" -ForegroundColor $WARNING
    Write-Host "  - CLICK_MERCHANT_USER_ID" -ForegroundColor $WARNING
    Write-Host "  - CLICK_SERVICE_ID" -ForegroundColor $WARNING
    Write-Host "  - CLICK_API_KEY (request if not visible)" -ForegroundColor $WARNING
    Write-Host ""
    Write-Host "Step 4: Generate webhook secret:" -ForegroundColor $INFO
    Write-Host "  node -e ""console.log(require('crypto').randomBytes(32).toString('hex'))""" -ForegroundColor $SUCCESS
    Write-Host ""
    Write-Host "Step 5: Set these in .env.production:" -ForegroundColor $INFO
    Write-Host "  CLICK_MERCHANT_ID=..." -ForegroundColor $SUCCESS
    Write-Host "  CLICK_MERCHANT_USER_ID=..." -ForegroundColor $SUCCESS
    Write-Host "  CLICK_SERVICE_ID=..." -ForegroundColor $SUCCESS
    Write-Host "  CLICK_API_KEY=..." -ForegroundColor $SUCCESS
    Write-Host "  CLICK_WEBHOOK_SECRET=..." -ForegroundColor $SUCCESS
    Write-Host ""
}

function Show-Uzum-Instructions {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor $INFO
    Write-Host "║  UZUM SETUP INSTRUCTIONS                                  ║" -ForegroundColor $INFO
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor $INFO
    Write-Host ""
    
    Write-Host "Step 1: Visit https://merchant.uzum.uz/" -ForegroundColor $INFO
    Write-Host "Step 2: Go to API Settings → Credentials" -ForegroundColor $INFO
    Write-Host "Step 3: Find and copy:" -ForegroundColor $INFO
    Write-Host "  - UZUM_MERCHANT_ID" -ForegroundColor $WARNING
    Write-Host "  - UZUM_SERVICE_ID" -ForegroundColor $WARNING
    Write-Host "  - UZUM_API_KEY" -ForegroundColor $WARNING
    Write-Host ""
    Write-Host "Step 4: Generate webhook secret:" -ForegroundColor $INFO
    Write-Host "  python -c ""import secrets; print(secrets.token_hex(32))""" -ForegroundColor $SUCCESS
    Write-Host ""
    Write-Host "Step 5: Set these in .env.production:" -ForegroundColor $INFO
    Write-Host "  UZUM_MERCHANT_ID=..." -ForegroundColor $SUCCESS
    Write-Host "  UZUM_SERVICE_ID=..." -ForegroundColor $SUCCESS
    Write-Host "  UZUM_API_KEY=..." -ForegroundColor $SUCCESS
    Write-Host "  UZUM_WEBHOOK_SECRET=..." -ForegroundColor $SUCCESS
    Write-Host ""
}

function Show-Stripe-Instructions {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor $INFO
    Write-Host "║  STRIPE SETUP INSTRUCTIONS                                ║" -ForegroundColor $INFO
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor $INFO
    Write-Host ""
    
    Write-Host "Step 1: Visit https://dashboard.stripe.com/" -ForegroundColor $INFO
    Write-Host "Step 2: Go to Developers → API Keys" -ForegroundColor $INFO
    Write-Host "Step 3: Find and copy:" -ForegroundColor $INFO
    Write-Host "  - STRIPE_SECRET_KEY (starts with sk_live_)" -ForegroundColor $WARNING
    Write-Host "  - STRIPE_PUBLISHABLE_KEY (starts with pk_live_)" -ForegroundColor $WARNING
    Write-Host ""
    Write-Host "Step 4: Set up webhook endpoint:" -ForegroundColor $INFO
    Write-Host "  - Go to Developers → Webhooks" -ForegroundColor $INFO
    Write-Host "  - Click + Add an endpoint" -ForegroundColor $INFO
    Write-Host "  - URL: https://your-domain.com/api/payments/webhook/stripe" -ForegroundColor $SUCCESS
    Write-Host ""
    Write-Host "Step 5: Select events:" -ForegroundColor $INFO
    Write-Host "  - charge.succeeded" -ForegroundColor $SUCCESS
    Write-Host "  - charge.failed" -ForegroundColor $SUCCESS
    Write-Host "  - payment_intent.succeeded" -ForegroundColor $SUCCESS
    Write-Host ""
    Write-Host "Step 6: Copy webhook secret:" -ForegroundColor $INFO
    Write-Host "  - STRIPE_WEBHOOK_SECRET (starts with whsec_)" -ForegroundColor $WARNING
    Write-Host ""
    Write-Host "Step 7: Set these in .env.production:" -ForegroundColor $INFO
    Write-Host "  STRIPE_SECRET_KEY=..." -ForegroundColor $SUCCESS
    Write-Host "  STRIPE_PUBLISHABLE_KEY=..." -ForegroundColor $SUCCESS
    Write-Host "  STRIPE_WEBHOOK_SECRET=..." -ForegroundColor $SUCCESS
    Write-Host ""
}

function Show-Env-Template {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $INFO
    Write-Host "PAYMENT GATEWAY CONFIGURATION TEMPLATE" -ForegroundColor $INFO
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $INFO
    Write-Host ""
    
    Write-Host "Add these to apps/backend/.env.production:" -ForegroundColor $INFO
    Write-Host ""
    
    $template = @"
# Payme (Primary)
PAYME_MERCHANT_ID=your-merchant-id
PAYME_API_KEY=your-api-key
PAYME_SERVICE_ID=your-service-id
PAYME_WEBHOOK_SECRET=generated-secret

# Click (Fallback 1)
CLICK_MERCHANT_ID=your-merchant-id
CLICK_MERCHANT_USER_ID=your-user-id
CLICK_SERVICE_ID=your-service-id
CLICK_API_KEY=your-api-key
CLICK_WEBHOOK_SECRET=generated-secret

# Uzum (Fallback 2)
UZUM_MERCHANT_ID=your-merchant-id
UZUM_SERVICE_ID=your-service-id
UZUM_API_KEY=your-api-key
UZUM_WEBHOOK_SECRET=generated-secret

# Stripe (Fallback 3)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Retry Settings
PAYMENT_RETRY_MAX_ATTEMPTS=3
PAYMENT_RETRY_INITIAL_DELAY_MS=500
PAYMENT_RETRY_MAX_DELAY_MS=30000
PAYMENT_RETRY_BACKOFF_MULTIPLIER=2

# Webhook Settings
PAYMENT_WEBHOOK_CACHE_SIZE=1000
PAYMENT_WEBHOOK_CACHE_TTL_MINUTES=60
PAYMENT_WEBHOOK_MAX_RETRY_ATTEMPTS=3
"@
    
    Write-Host $template -ForegroundColor $SUCCESS
    Write-Host ""
}

function Apply-Database-Migration {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $INFO
    Write-Host "APPLYING DATABASE MIGRATION" -ForegroundColor $INFO
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $INFO
    Write-Host ""
    
    if (-not (Test-Path "apps/backend")) {
        Write-Host "ERROR: apps/backend directory not found" -ForegroundColor $ERROR
        return
    }
    
    Set-Location "apps/backend"
    
    Write-Host "Running Prisma migration..." -ForegroundColor $INFO
    Write-Host ""
    
    npx prisma migrate dev --name add_webhook_idempotency
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Migration completed successfully!" -ForegroundColor $SUCCESS
    } else {
        Write-Host ""
        Write-Host "⚠ Migration failed. Check error above." -ForegroundColor $WARNING
        Write-Host "You may need to apply migration manually in Supabase Dashboard." -ForegroundColor $INFO
    }
    
    Set-Location "../.."
}

# Main loop
do {
    Show-Menu
    $choice = Read-Host "Enter your choice"
    
    switch ($choice) {
        "1" { Show-Payme-Instructions }
        "2" { Show-Click-Instructions }
        "3" { Show-Uzum-Instructions }
        "4" { Show-Stripe-Instructions }
        "5" { & .\VALIDATE_PAYMENT_SETUP.ps1 }
        "6" { & .\START_PAYMENT_SETUP.ps1 -Test }
        "7" { Show-Env-Template }
        "8" {
            if (Test-Path "PAYMENT_GATEWAY_SETUP_GUIDE.md") {
                & notepad PAYMENT_GATEWAY_SETUP_GUIDE.md
            } else {
                Write-Host "ERROR: PAYMENT_GATEWAY_SETUP_GUIDE.md not found" -ForegroundColor $ERROR
            }
        }
        "9" { Apply-Database-Migration }
        "0" {
            Write-Host ""
            Write-Host "Exiting..." -ForegroundColor $INFO
            exit 0
        }
        default { Write-Host "Invalid choice. Please try again." -ForegroundColor $ERROR }
    }
    
    Write-Host ""
    Read-Host "Press Enter to continue"
    Clear-Host
} while ($true)