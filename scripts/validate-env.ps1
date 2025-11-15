# ============================================================================
# VisaBuddy Environment Variable Validation Script (PowerShell)
# ============================================================================
# 
# This script validates that all required environment variables are set
# and have valid values.
#
# Usage:
#   .\scripts\validate-env.ps1 [backend|frontend|ai-service|all]
#
# ============================================================================

param(
    [Parameter(Position=0)]
    [ValidateSet("backend", "frontend", "ai-service", "all")]
    [string]$Service = "all"
)

$ErrorActionPreference = "Stop"

# Counters
$script:Errors = 0
$script:Warnings = 0

# Function to print colored output
function Write-Error-Message {
    param([string]$Message)
    Write-Host "❌ ERROR: $Message" -ForegroundColor Red
    $script:Errors++
}

function Write-Warning-Message {
    param([string]$Message)
    Write-Host "⚠️  WARNING: $Message" -ForegroundColor Yellow
    $script:Warnings++
}

function Write-Success-Message {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Info-Message {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

# Function to validate backend environment
function Validate-Backend {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Host "🔍 Validating Backend Environment Variables"
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Host ""

    Push-Location apps/backend

    # Check if .env file exists
    if (-not (Test-Path .env)) {
        Write-Error-Message ".env file not found in apps/backend/"
        Write-Info-Message "Copy .env.example to .env and fill in the values"
        Pop-Location
        return
    }

    # Load .env file
    $envContent = Get-Content .env | Where-Object { $_ -match '^\s*[^#]' -and $_ -match '=' }
    $envVars = @{}
    foreach ($line in $envContent) {
        if ($line -match '^\s*([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove quotes if present
            $value = $value -replace '^["'']|["'']$', ''
            $envVars[$key] = $value
        }
    }

    # Required variables
    $requiredVars = @("NODE_ENV", "PORT", "DATABASE_URL", "JWT_SECRET")

    foreach ($var in $requiredVars) {
        if (-not $envVars.ContainsKey($var) -or [string]::IsNullOrWhiteSpace($envVars[$var])) {
            Write-Error-Message "$var is not set (REQUIRED)"
        } else {
            Write-Success-Message "$var is set"
            
            # Additional validation
            switch ($var) {
                "JWT_SECRET" {
                    if ($envVars[$var].Length -lt 32) {
                        Write-Error-Message "JWT_SECRET must be at least 32 characters (currently $($envVars[$var].Length))"
                    }
                }
                "DATABASE_URL" {
                    if (-not $envVars[$var].StartsWith("postgresql://")) {
                        Write-Warning-Message "DATABASE_URL should start with 'postgresql://'"
                    }
                }
                "NODE_ENV" {
                    $validEnvs = @("development", "production", "test")
                    if ($validEnvs -notcontains $envVars[$var]) {
                        Write-Error-Message "NODE_ENV must be 'development', 'production', or 'test'"
                    }
                }
            }
        }
    }

    # Check CORS in production
    if ($envVars["NODE_ENV"] -eq "production") {
        if (-not $envVars.ContainsKey("CORS_ORIGIN") -or 
            [string]::IsNullOrWhiteSpace($envVars["CORS_ORIGIN"]) -or 
            $envVars["CORS_ORIGIN"] -eq "*") {
            Write-Error-Message "CORS_ORIGIN cannot be '*' or empty in production"
        } else {
            Write-Success-Message "CORS_ORIGIN is configured for production"
        }
    }

    # Optional but recommended variables
    $optionalVars = @("REDIS_URL", "OPENAI_API_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")

    Write-Host ""
    Write-Info-Message "Checking optional variables..."
    foreach ($var in $optionalVars) {
        if (-not $envVars.ContainsKey($var) -or [string]::IsNullOrWhiteSpace($envVars[$var])) {
            Write-Warning-Message "$var is not set (optional but recommended)"
        } else {
            Write-Success-Message "$var is set"
        }
    }

    Pop-Location
}

# Function to validate frontend environment
function Validate-Frontend {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Host "🔍 Validating Frontend Environment Variables"
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Host ""

    Push-Location apps/frontend

    # Check if .env file exists
    if (-not (Test-Path .env)) {
        Write-Warning-Message ".env file not found in apps/frontend/"
        Write-Info-Message "Copy .env.example to .env and fill in the values"
        Pop-Location
        return
    }

    # Load .env file
    $envContent = Get-Content .env | Where-Object { $_ -match '^\s*[^#]' -and $_ -match '=' }
    $envVars = @{}
    foreach ($line in $envContent) {
        if ($line -match '^\s*([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $value = $value -replace '^["'']|["'']$', ''
            $envVars[$key] = $value
        }
    }

    # Required variables
    $requiredVars = @("EXPO_PUBLIC_API_URL")

    foreach ($var in $requiredVars) {
        if (-not $envVars.ContainsKey($var) -or [string]::IsNullOrWhiteSpace($envVars[$var])) {
            Write-Error-Message "$var is not set (REQUIRED)"
        } else {
            Write-Success-Message "$var is set"
        }
    }

    # Check optional but recommended
    if (-not $envVars.ContainsKey("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID") -or 
        [string]::IsNullOrWhiteSpace($envVars["EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"])) {
        Write-Warning-Message "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set (required for Google Sign-In)"
    } else {
        Write-Success-Message "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set"
    }

    Pop-Location
}

# Function to validate AI service environment
function Validate-AIService {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Host "🔍 Validating AI Service Environment Variables"
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Host ""

    Push-Location apps/ai-service

    # Check if .env file exists
    if (-not (Test-Path .env)) {
        Write-Warning-Message ".env file not found in apps/ai-service/"
        Write-Info-Message "Copy .env.example to .env and fill in the values"
        Pop-Location
        return
    }

    # Load .env file
    $envContent = Get-Content .env | Where-Object { $_ -match '^\s*[^#]' -and $_ -match '=' }
    $envVars = @{}
    foreach ($line in $envContent) {
        if ($line -match '^\s*([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $value = $value -replace '^["'']|["'']$', ''
            $envVars[$key] = $value
        }
    }

    # Required variables
    if (-not $envVars.ContainsKey("OPENAI_API_KEY") -or 
        [string]::IsNullOrWhiteSpace($envVars["OPENAI_API_KEY"])) {
        Write-Error-Message "OPENAI_API_KEY is not set (REQUIRED for AI chat)"
    } else {
        Write-Success-Message "OPENAI_API_KEY is set"
    }

    Pop-Location
}

# Main execution
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗"
Write-Host "║     VisaBuddy Environment Variable Validation                    ║"
Write-Host "╚══════════════════════════════════════════════════════════════════╝"
Write-Host ""

switch ($Service) {
    "backend" {
        Validate-Backend
    }
    "frontend" {
        Validate-Frontend
    }
    "ai-service" {
        Validate-AIService
    }
    "all" {
        Validate-Backend
        Validate-Frontend
        Validate-AIService
    }
}

# Summary
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "📊 Validation Summary"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

if ($script:Errors -eq 0 -and $script:Warnings -eq 0) {
    Write-Success-Message "All checks passed! ✅"
    exit 0
} elseif ($script:Errors -eq 0) {
    Write-Warning-Message "$($script:Warnings) warning(s) found (non-critical)"
    exit 0
} else {
    Write-Error-Message "$($script:Errors) error(s) and $($script:Warnings) warning(s) found"
    Write-Host ""
    Write-Info-Message "Fix the errors above before starting the application"
    exit 1
}








