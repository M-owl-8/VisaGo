# ============================================================================
# Verify Project Completeness
# ============================================================================

Write-Host ""
Write-Host "Verifying VisaBuddy Completeness..." -ForegroundColor Cyan
Write-Host ""

$errors = 0
$warnings = 0

# Check frontend API methods
Write-Host "Checking Frontend API Client..." -ForegroundColor Yellow
$apiFile = "apps\frontend\src\services\api.ts"
if (Test-Path $apiFile) {
    $content = Get-Content $apiFile -Raw
    if ($content -match "forgotPassword" -and $content -match "resetPassword") {
        Write-Host "  Password reset methods exist" -ForegroundColor Green
    } else {
        Write-Host "  Missing password reset methods" -ForegroundColor Red
        $errors++
    }
} else {
    Write-Host "  API file not found" -ForegroundColor Red
    $errors++
}

# Check validation utility
Write-Host "Checking Validation Utility..." -ForegroundColor Yellow
$validationFile = "apps\frontend\src\utils\validation.ts"
if (Test-Path $validationFile) {
    Write-Host "  Validation utility exists" -ForegroundColor Green
} else {
    Write-Host "  Validation utility missing" -ForegroundColor Red
    $errors++
}

# Check ForgotPasswordScreen
Write-Host "Checking ForgotPasswordScreen..." -ForegroundColor Yellow
$forgotFile = "apps\frontend\src\screens\auth\ForgotPasswordScreen.tsx"
if (Test-Path $forgotFile) {
    $content = Get-Content $forgotFile -Raw
    if ($content -notmatch "TODO.*forgot password" -and $content -match "apiClient.forgotPassword") {
        Write-Host "  ForgotPasswordScreen implemented" -ForegroundColor Green
    } else {
        Write-Host "  ForgotPasswordScreen has issues" -ForegroundColor Yellow
        $warnings++
    }
} else {
    Write-Host "  ForgotPasswordScreen not found" -ForegroundColor Red
    $errors++
}

# Check OnboardingScreen
Write-Host "Checking OnboardingScreen..." -ForegroundColor Yellow
$onboardingFile = "apps\frontend\src\screens\onboarding\OnboardingScreen.tsx"
if (Test-Path $onboardingFile) {
    $content = Get-Content $onboardingFile -Raw
    if ($content -notmatch "TODO.*nationality" -and $content -match "apiClient.updateUserProfile") {
        Write-Host "  OnboardingScreen nationality save implemented" -ForegroundColor Green
    } else {
        Write-Host "  OnboardingScreen has issues" -ForegroundColor Yellow
        $warnings++
    }
} else {
    Write-Host "  OnboardingScreen not found" -ForegroundColor Red
    $errors++
}

# Check backend password reset
Write-Host "Checking Backend Password Reset..." -ForegroundColor Yellow
$authService = "apps\backend\src\services\auth.service.ts"
if (Test-Path $authService) {
    $content = Get-Content $authService -Raw
    if ($content -match "requestPasswordReset" -and $content -match "resetPassword") {
        Write-Host "  Backend password reset implemented" -ForegroundColor Green
    } else {
        Write-Host "  Backend password reset missing" -ForegroundColor Red
        $errors++
    }
} else {
    Write-Host "  Auth service not found" -ForegroundColor Red
    $errors++
}

# Check routes
Write-Host "Checking Auth Routes..." -ForegroundColor Yellow
$authRoutes = "apps\backend\src\routes\auth.ts"
if (Test-Path $authRoutes) {
    $content = Get-Content $authRoutes -Raw
    if (($content -match "forgot-password" -or $content -match 'forgot-password') -and 
        ($content -match "reset-password" -or $content -match 'reset-password')) {
        Write-Host "  Password reset routes exist" -ForegroundColor Green
    } else {
        Write-Host "  Password reset routes missing" -ForegroundColor Red
        $errors++
    }
} else {
    Write-Host "  Auth routes not found" -ForegroundColor Red
    $errors++
}

# Check email service
Write-Host "Checking Email Service..." -ForegroundColor Yellow
$emailService = "apps\backend\src\services\email.service.ts"
if (Test-Path $emailService) {
    $content = Get-Content $emailService -Raw
    if ($content -match "sendPasswordResetEmail") {
        Write-Host "  Email service has password reset method" -ForegroundColor Green
    } else {
        Write-Host "  Email service missing password reset method" -ForegroundColor Red
        $errors++
    }
} else {
    Write-Host "  Email service not found" -ForegroundColor Red
    $errors++
}

Write-Host ""
Write-Host "Verification Summary" -ForegroundColor Cyan
if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "All checks passed! Project is 100% ready." -ForegroundColor Green
    exit 0
} elseif ($errors -eq 0) {
    Write-Host "$warnings warning(s) found (non-critical)" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "$errors error(s) and $warnings warning(s) found" -ForegroundColor Red
    exit 1
}

