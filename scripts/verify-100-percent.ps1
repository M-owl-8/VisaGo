# ============================================================================
# VisaBuddy 100% Readiness Verification Script
# ============================================================================
# This script verifies that the app is 100% ready for testing
# ============================================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     VisaBuddy 100% Readiness Verification                       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $rootDir "apps\backend"
$frontendDir = Join-Path $rootDir "apps\frontend"

$score = 0
$maxScore = 0
$issues = @()
$warnings = @()

# ============================================================================
# 1. Android Build Configuration (15 points)
# ============================================================================
Write-Host "📱 1. Android Build Configuration" -ForegroundColor Yellow
$maxScore += 15

# Check Android project structure
$androidDir = Join-Path $frontendDir "android"
if (Test-Path $androidDir) {
    $score += 3
    Write-Host "   ✅ Android project structure exists" -ForegroundColor Green
} else {
    $issues += "Android project structure missing"
    Write-Host "   ❌ Android project structure missing" -ForegroundColor Red
}

# Check build.gradle
$buildGradle = Join-Path $androidDir "build.gradle"
if (Test-Path $buildGradle) {
    $score += 2
    Write-Host "   ✅ build.gradle exists" -ForegroundColor Green
} else {
    $issues += "build.gradle missing"
    Write-Host "   ❌ build.gradle missing" -ForegroundColor Red
}

# Check AndroidManifest.xml
$manifest = Join-Path $androidDir "app\src\main\AndroidManifest.xml"
if (Test-Path $manifest) {
    $score += 2
    Write-Host "   ✅ AndroidManifest.xml exists" -ForegroundColor Green
} else {
    $issues += "AndroidManifest.xml missing"
    Write-Host "   ❌ AndroidManifest.xml missing" -ForegroundColor Red
}

# Check debug keystore
$keystore = Join-Path $androidDir "app\debug.keystore"
if (Test-Path $keystore) {
    $score += 2
    Write-Host "   ✅ Debug keystore exists" -ForegroundColor Green
} else {
    $warnings += "Debug keystore missing (can be generated)"
    Write-Host "   ⚠️  Debug keystore missing" -ForegroundColor Yellow
}

# Check package.json scripts
$frontendPkg = Join-Path $frontendDir "package.json"
if (Test-Path $frontendPkg) {
    $pkgContent = Get-Content $frontendPkg -Raw
    if ($pkgContent -match '"android"') {
        $score += 3
        Write-Host "   ✅ Android build scripts configured" -ForegroundColor Green
    } else {
        $issues += "Android build scripts missing"
        Write-Host "   ❌ Android build scripts missing" -ForegroundColor Red
    }
} else {
    $issues += "Frontend package.json missing"
    Write-Host "   ❌ Frontend package.json missing" -ForegroundColor Red
}

# Check React Native version
if ($pkgContent -match '"react-native":\s*"[\d.]+"') {
    $score += 3
    Write-Host "   ✅ React Native configured" -ForegroundColor Green
} else {
    $issues += "React Native not configured"
    Write-Host "   ❌ React Native not configured" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# 2. Frontend Code Structure (15 points)
# ============================================================================
Write-Host "💻 2. Frontend Code Structure" -ForegroundColor Yellow
$maxScore += 15

# Check screens directory
$screensDir = Join-Path $frontendDir "src\screens"
if (Test-Path $screensDir) {
    $screenCount = (Get-ChildItem -Path $screensDir -Recurse -Filter "*.tsx" -File).Count
    if ($screenCount -ge 30) {
        $score += 5
        Write-Host "   ✅ Screens implemented ($screenCount screens)" -ForegroundColor Green
    } else {
        $score += 3
        Write-Host "   ⚠️  Screens implemented ($screenCount screens, expected 30+)" -ForegroundColor Yellow
    }
} else {
    $issues += "Screens directory missing"
    Write-Host "   ❌ Screens directory missing" -ForegroundColor Red
}

# Check navigation
$appFile = Join-Path $frontendDir "src\App.tsx"
if (Test-Path $appFile) {
    $appContent = Get-Content $appFile -Raw
    if ($appContent -match "NavigationContainer" -or $appContent -match "@react-navigation") {
        $score += 3
        Write-Host "   ✅ Navigation configured" -ForegroundColor Green
    } else {
        $issues += "Navigation not configured"
        Write-Host "   ❌ Navigation not configured" -ForegroundColor Red
    }
} else {
    $issues += "App.tsx missing"
    Write-Host "   ❌ App.tsx missing" -ForegroundColor Red
}

# Check API client
$apiFile = Join-Path $frontendDir "src\services\api.ts"
if (Test-Path $apiFile) {
    $apiContent = Get-Content $apiFile -Raw
    if ($apiContent -match "forgotPassword" -and $apiContent -match "resetPassword") {
        $score += 4
        Write-Host "   ✅ API client complete (password reset methods)" -ForegroundColor Green
    } else {
        $score += 2
        $warnings += "API client missing password reset methods"
        Write-Host "   ⚠️  API client incomplete" -ForegroundColor Yellow
    }
} else {
    $issues += "API client missing"
    Write-Host "   ❌ API client missing" -ForegroundColor Red
}

# Check validation utility
$validationFile = Join-Path $frontendDir "src\utils\validation.ts"
if (Test-Path $validationFile) {
    $score += 3
    Write-Host "   ✅ Validation utilities exist" -ForegroundColor Green
} else {
    $warnings += "Validation utilities missing"
    Write-Host "   ⚠️  Validation utilities missing" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 3. Backend API Readiness (15 points)
# ============================================================================
Write-Host "🔧 3. Backend API Readiness" -ForegroundColor Yellow
$maxScore += 15

# Check routes
$routesDir = Join-Path $backendDir "src\routes"
if (Test-Path $routesDir) {
    $routeCount = (Get-ChildItem -Path $routesDir -Filter "*.ts" -File).Count
    if ($routeCount -ge 15) {
        $score += 5
        Write-Host "   ✅ Routes implemented ($routeCount route files)" -ForegroundColor Green
    } else {
        $score += 3
        Write-Host "   ⚠️  Routes implemented ($routeCount route files, expected 15+)" -ForegroundColor Yellow
    }
} else {
    $issues += "Routes directory missing"
    Write-Host "   ❌ Routes directory missing" -ForegroundColor Red
}

# Check services
$servicesDir = Join-Path $backendDir "src\services"
if (Test-Path $servicesDir) {
    $serviceCount = (Get-ChildItem -Path $servicesDir -Filter "*.ts" -File).Count
    if ($serviceCount -ge 40) {
        $score += 5
        Write-Host "   ✅ Services implemented ($serviceCount service files)" -ForegroundColor Green
    } else {
        $score += 3
        Write-Host "   ⚠️  Services implemented ($serviceCount service files, expected 40+)" -ForegroundColor Yellow
    }
} else {
    $issues += "Services directory missing"
    Write-Host "   ❌ Services directory missing" -ForegroundColor Red
}

# Check password reset routes
$authRoute = Join-Path $routesDir "auth.ts"
if (Test-Path $authRoute) {
    $authContent = Get-Content $authRoute -Raw
    if (($authContent -match "/forgot-password" -or $authContent -match "forgotPassword") -and 
        ($authContent -match "/reset-password" -or $authContent -match "resetPassword")) {
        $score += 3
        Write-Host "   ✅ Password reset routes implemented" -ForegroundColor Green
    } else {
        $issues += "Password reset routes missing"
        Write-Host "   ❌ Password reset routes missing" -ForegroundColor Red
    }
} else {
    $issues += "Auth routes missing"
    Write-Host "   ❌ Auth routes missing" -ForegroundColor Red
}

# Check environment validation
$envFile = Join-Path $backendDir "src\config\env.ts"
if (Test-Path $envFile) {
    $score += 2
    Write-Host "   ✅ Environment validation configured" -ForegroundColor Green
} else {
    $issues += "Environment validation missing"
    Write-Host "   ❌ Environment validation missing" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# 4. Dependencies and Packages (10 points)
# ============================================================================
Write-Host "📦 4. Dependencies and Packages" -ForegroundColor Yellow
$maxScore += 10

# Check backend node_modules
$backendNodeModules = Join-Path $backendDir "node_modules"
if (Test-Path $backendNodeModules) {
    $score += 3
    Write-Host "   ✅ Backend dependencies installed" -ForegroundColor Green
} else {
    $issues += "Backend dependencies not installed"
    Write-Host "   ❌ Backend dependencies not installed" -ForegroundColor Red
}

# Check frontend node_modules
$frontendNodeModules = Join-Path $frontendDir "node_modules"
if (Test-Path $frontendNodeModules) {
    $score += 3
    Write-Host "   ✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    $issues += "Frontend dependencies not installed"
    Write-Host "   ❌ Frontend dependencies not installed" -ForegroundColor Red
}

# Check Prisma client
$prismaClient = Join-Path $backendDir "node_modules\.prisma"
if (Test-Path $prismaClient) {
    $score += 2
    Write-Host "   ✅ Prisma client generated" -ForegroundColor Green
} else {
    $warnings += "Prisma client not generated (run: npm run db:generate)"
    Write-Host "   ⚠️  Prisma client not generated" -ForegroundColor Yellow
}

# Check package.json files
if ((Test-Path (Join-Path $backendDir "package.json")) -and 
    (Test-Path (Join-Path $frontendDir "package.json"))) {
    $score += 2
    Write-Host "   ✅ Package.json files exist" -ForegroundColor Green
} else {
    $issues += "Package.json files missing"
    Write-Host "   ❌ Package.json files missing" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# 5. Environment Configuration (20 points)
# ============================================================================
Write-Host "⚙️  5. Environment Configuration" -ForegroundColor Yellow
$maxScore += 20

# Check backend .env
$backendEnv = Join-Path $backendDir ".env"
if (Test-Path $backendEnv) {
    $backendEnvContent = Get-Content $backendEnv -Raw
    
    # Check JWT_SECRET
    if ($backendEnvContent -match "JWT_SECRET=.{32,}") {
        $score += 5
        Write-Host "   ✅ Backend JWT_SECRET configured (32+ chars)" -ForegroundColor Green
    } elseif ($backendEnvContent -match "JWT_SECRET=") {
        $issues += "Backend JWT_SECRET too short (need 32+ chars)"
        Write-Host "   ❌ Backend JWT_SECRET too short" -ForegroundColor Red
    } else {
        $issues += "Backend JWT_SECRET missing"
        Write-Host "   ❌ Backend JWT_SECRET missing" -ForegroundColor Red
    }
    
    # Check DATABASE_URL
    if ($backendEnvContent -match "DATABASE_URL=") {
        $score += 5
        Write-Host "   ✅ Backend DATABASE_URL configured" -ForegroundColor Green
    } else {
        $issues += "Backend DATABASE_URL missing"
        Write-Host "   ❌ Backend DATABASE_URL missing" -ForegroundColor Red
    }
    
    # Check other required vars
    $requiredVars = @("NODE_ENV", "PORT", "CORS_ORIGIN")
    $foundVars = 0
    foreach ($var in $requiredVars) {
        if ($backendEnvContent -match "$var=") {
            $foundVars++
        }
    }
    if ($foundVars -eq $requiredVars.Count) {
        $score += 3
        Write-Host "   ✅ Backend required variables configured" -ForegroundColor Green
    } else {
        $warnings += "Some backend required variables missing"
        Write-Host "   ⚠️  Some backend required variables missing" -ForegroundColor Yellow
    }
} else {
    $issues += "Backend .env file missing"
    Write-Host "   ❌ Backend .env file missing" -ForegroundColor Red
}

# Check frontend .env
$frontendEnv = Join-Path $frontendDir ".env"
if (Test-Path $frontendEnv) {
    $frontendEnvContent = Get-Content $frontendEnv -Raw
    
    # Check API URL
    if ($frontendEnvContent -match "EXPO_PUBLIC_API_URL=") {
        $score += 5
        Write-Host "   ✅ Frontend API URL configured" -ForegroundColor Green
    } else {
        $issues += "Frontend EXPO_PUBLIC_API_URL missing"
        Write-Host "   ❌ Frontend EXPO_PUBLIC_API_URL missing" -ForegroundColor Red
    }
    
    # Check Google Client ID (optional)
    if ($frontendEnvContent -match "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=") {
        $score += 2
        Write-Host "   ✅ Frontend Google Client ID configured" -ForegroundColor Green
    } else {
        $warnings += "Frontend Google Client ID not configured (optional)"
        Write-Host "   ⚠️  Frontend Google Client ID not configured (optional)" -ForegroundColor Yellow
    }
} else {
    $issues += "Frontend .env file missing"
    Write-Host "   ❌ Frontend .env file missing" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# 6. App Functionality (10 points)
# ============================================================================
Write-Host "🎯 6. App Functionality" -ForegroundColor Yellow
$maxScore += 10

# Check ForgotPasswordScreen
$forgotPasswordScreen = Join-Path $frontendDir "src\screens\auth\ForgotPasswordScreen.tsx"
if (Test-Path $forgotPasswordScreen) {
    $forgotContent = Get-Content $forgotPasswordScreen -Raw
    if ($forgotContent -match "apiClient\.forgotPassword" -or $forgotContent -match "forgotPassword") {
        $score += 3
        Write-Host "   ✅ ForgotPasswordScreen implemented with API" -ForegroundColor Green
    } else {
        $warnings += "ForgotPasswordScreen exists but API not integrated"
        Write-Host "   ⚠️  ForgotPasswordScreen exists but API not integrated" -ForegroundColor Yellow
    }
} else {
    $issues += "ForgotPasswordScreen missing"
    Write-Host "   ❌ ForgotPasswordScreen missing" -ForegroundColor Red
}

# Check OnboardingScreen
$onboardingScreen = Join-Path $frontendDir "src\screens\onboarding\OnboardingScreen.tsx"
if (Test-Path $onboardingScreen) {
    $onboardingContent = Get-Content $onboardingScreen -Raw
    if ($onboardingContent -match "apiClient\.updateUserProfile" -or $onboardingContent -match "updateUserProfile") {
        $score += 3
        Write-Host "   ✅ OnboardingScreen implemented with API" -ForegroundColor Green
    } else {
        $score += 2
        Write-Host "   ⚠️  OnboardingScreen exists but API integration incomplete" -ForegroundColor Yellow
    }
} else {
    $warnings += "OnboardingScreen missing"
    Write-Host "   ⚠️  OnboardingScreen missing" -ForegroundColor Yellow
}

# Check email service integration
$emailService = Join-Path $backendDir "src\services\email.service.ts"
if (Test-Path $emailService) {
    $emailContent = Get-Content $emailService -Raw
    if ($emailContent -match "sendPasswordResetEmail" -or $emailContent -match "passwordResetEmail") {
        $score += 4
        Write-Host "   ✅ Email service integrated with password reset" -ForegroundColor Green
    } else {
        $warnings += "Email service missing password reset methods"
        Write-Host "   ⚠️  Email service missing password reset methods" -ForegroundColor Yellow
    }
} else {
    $issues += "Email service missing"
    Write-Host "   ❌ Email service missing" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# 7. Build System (10 points)
# ============================================================================
Write-Host "🔨 7. Build System" -ForegroundColor Yellow
$maxScore += 10

# Check Gradle wrapper
$gradlew = Join-Path $androidDir "gradlew.bat"
if (Test-Path $gradlew) {
    $score += 3
    Write-Host "   ✅ Gradle wrapper exists" -ForegroundColor Green
} else {
    $issues += "Gradle wrapper missing"
    Write-Host "   ❌ Gradle wrapper missing" -ForegroundColor Red
}

# Check gradle.properties
$gradleProps = Join-Path $androidDir "gradle.properties"
if (Test-Path $gradleProps) {
    $score += 2
    Write-Host "   ✅ gradle.properties exists" -ForegroundColor Green
} else {
    $warnings += "gradle.properties missing"
    Write-Host "   ⚠️  gradle.properties missing" -ForegroundColor Yellow
}

# Check Metro config
$metroConfig = Join-Path $frontendDir "metro.config.cjs"
if (Test-Path $metroConfig) {
    $score += 2
    Write-Host "   ✅ Metro config exists" -ForegroundColor Green
} else {
    $warnings += "Metro config missing"
    Write-Host "   ⚠️  Metro config missing" -ForegroundColor Yellow
}

# Check TypeScript config
$tsConfig = Join-Path $frontendDir "tsconfig.json"
if (Test-Path $tsConfig) {
    $score += 3
    Write-Host "   ✅ TypeScript config exists" -ForegroundColor Green
} else {
    $warnings += "TypeScript config missing"
    Write-Host "   ⚠️  TypeScript config missing" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 8. Testing Readiness (5 points)
# ============================================================================
Write-Host "🧪 8. Testing Readiness" -ForegroundColor Yellow
$maxScore += 5

# Check database
$dbPath = Join-Path $backendDir "prisma\dev.db"
if (Test-Path $dbPath) {
    $score += 3
    Write-Host "   ✅ Database file exists" -ForegroundColor Green
} else {
    $warnings += "Database file not found (will be created on first run)"
    Write-Host "   ⚠️  Database file not found" -ForegroundColor Yellow
}

# Check uploads directory
$uploadsDir = Join-Path $backendDir "uploads"
if (Test-Path $uploadsDir) {
    $score += 2
    Write-Host "   ✅ Uploads directory exists" -ForegroundColor Green
} else {
    $warnings += "Uploads directory not found (will be created on first run)"
    Write-Host "   ⚠️  Uploads directory not found" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# Summary
# ============================================================================
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Verification Summary                                          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$percentage = [math]::Round(($score / $maxScore) * 100, 1)

Write-Host "📊 Overall Readiness: $percentage%" -ForegroundColor $(if ($percentage -ge 100) { "Green" } elseif ($percentage -ge 80) { "Yellow" } else { "Red" })
Write-Host "   Score: $score / $maxScore points" -ForegroundColor White
Write-Host ""

if ($issues.Count -gt 0) {
    Write-Host "❌ Critical Issues ($($issues.Count)):" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "   - $issue" -ForegroundColor Red
    }
    Write-Host ""
}

if ($warnings.Count -gt 0) {
    Write-Host "⚠️  Warnings ($($warnings.Count)):" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "   - $warning" -ForegroundColor Yellow
    }
    Write-Host ""
}

if ($percentage -ge 100) {
    Write-Host "✅ App is 100% ready for testing!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Yellow
    Write-Host "   1. Start backend:  cd apps\backend && npm run dev" -ForegroundColor White
    Write-Host "   2. Start Metro:    cd apps\frontend && npm run metro" -ForegroundColor White
    Write-Host "   3. Run on emulator: cd apps\frontend && npm run android" -ForegroundColor White
    Write-Host ""
} elseif ($percentage -ge 80) {
    Write-Host "⚠️  App is mostly ready but has some issues to fix" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Run: .\scripts\setup-100-percent.ps1 to fix issues" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "❌ App needs significant setup before testing" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Run: .\scripts\setup-100-percent.ps1 to set up everything" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host ""








