#!/usr/bin/env pwsh

<#
.SYNOPSIS
VisaBuddy Complete Build Script - Phase 3
.DESCRIPTION
Automates the entire build and deployment process for VisaBuddy
.NOTES
Run with: .\BUILD_APP_TODAY.ps1
#>

param(
    [string]$Action = "dev",  # dev, build, deploy
    [string]$Platform = "all"  # all, backend, frontend, ai
)

$ErrorActionPreference = "Stop"
$WarningPreference = "Continue"

# Colors for output
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-Success {
    param($Message)
    Write-Host "$Green✓ $Message$Reset"
}

function Write-Error-Custom {
    param($Message)
    Write-Host "$Red✗ $Message$Reset"
}

function Write-Info {
    param($Message)
    Write-Host "$Blue► $Message$Reset"
}

function Write-Warning-Custom {
    param($Message)
    Write-Host "$Yellow⚠ $Message$Reset"
}

# Check prerequisites
function Check-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    $checks = @(
        @{Name = "Node.js"; Command = "node --version"; MinVersion = "v20" },
        @{Name = "npm"; Command = "npm --version"; MinVersion = "10" },
        @{Name = "Python"; Command = "python --version"; MinVersion = "3.11" }
    )
    
    foreach ($check in $checks) {
        try {
            $version = & $($check.Command.Split()[0]) $($check.Command.Split()[1]) 2>&1
            Write-Success "$($check.Name): $version"
        }
        catch {
            Write-Error-Custom "$($check.Name) not found. Please install it first."
            exit 1
        }
    }
}

# Install dependencies
function Install-Dependencies {
    Write-Info "Installing dependencies..."
    
    # Backend
    if ($Platform -in @("all", "backend")) {
        Write-Info "Installing backend dependencies..."
        Set-Location "c:\work\VisaBuddy\apps\backend"
        npm install
        Write-Success "Backend dependencies installed"
    }
    
    # Frontend
    if ($Platform -in @("all", "frontend")) {
        Write-Info "Installing frontend dependencies..."
        Set-Location "c:\work\VisaBuddy\apps\frontend"
        npm install
        Write-Success "Frontend dependencies installed"
    }
    
    # AI Service
    if ($Platform -in @("all", "ai")) {
        Write-Info "Installing AI service dependencies..."
        Set-Location "c:\work\VisaBuddy\apps\ai-service"
        pip install -r requirements.txt
        Write-Success "AI service dependencies installed"
    }
}

# Setup database
function Setup-Database {
    Write-Info "Setting up database..."
    
    Set-Location "c:\work\VisaBuddy\apps\backend"
    
    # Generate Prisma client
    Write-Info "Generating Prisma client..."
    npx prisma generate
    
    # Run migrations
    Write-Info "Running database migrations..."
    npx prisma migrate dev
    
    Write-Success "Database setup complete"
}

# Start development servers
function Start-Development {
    Write-Info "Starting development servers..."
    Write-Warning-Custom "Run each command in a separate terminal:"
    Write-Host ""
    
    Write-Host "$Yellow--- Terminal 1: Backend ---$Reset"
    Write-Host "cd c:\work\VisaBuddy\apps\backend"
    Write-Host "npm run dev"
    Write-Host ""
    
    Write-Host "$Yellow--- Terminal 2: AI Service ---$Reset"
    Write-Host "cd c:\work\VisaBuddy\apps\ai-service"
    Write-Host "python -m uvicorn main:app --reload --port 8001"
    Write-Host ""
    
    Write-Host "$Yellow--- Terminal 3: Frontend ---$Reset"
    Write-Host "cd c:\work\VisaBuddy\apps\frontend"
    Write-Host "npm start"
    Write-Host ""
    
    Write-Success "Ready for development!"
}

# Build for production
function Build-Production {
    Write-Info "Building for production..."
    
    # Backend
    if ($Platform -in @("all", "backend")) {
        Write-Info "Building backend..."
        Set-Location "c:\work\VisaBuddy\apps\backend"
        npm run build
        Write-Success "Backend built"
    }
    
    # Frontend
    if ($Platform -in @("all", "frontend")) {
        Write-Info "Building frontend..."
        Set-Location "c:\work\VisaBuddy\apps\frontend"
        
        # Web build
        Write-Info "Building web version..."
        npm run build:web
        Write-Success "Web build complete (build/)"
    }
}

# Build mobile apps
function Build-Mobile {
    Write-Info "Building mobile apps..."
    
    Set-Location "c:\work\VisaBuddy\apps\frontend"
    
    # Android
    Write-Info "Building Android APK..."
    Write-Warning-Custom "This requires Android SDK. Install EAS CLI for easier builds:"
    Write-Host "npm install -g eas-cli"
    Write-Host "eas build --platform android"
    
    # iOS
    Write-Info "Building iOS IPA..."
    Write-Warning-Custom "This requires macOS with Xcode. Use EAS for cloud builds:"
    Write-Host "eas build --platform ios"
}

# Deploy
function Deploy-Production {
    Write-Info "Deploying to production..."
    
    Write-Warning-Custom "Deployment requires:"
    Write-Host "1. Railway account (railway.app)"
    Write-Host "2. Environment variables configured"
    Write-Host "3. Database backup"
    Write-Host ""
    
    Write-Info "Backend deployment:"
    Write-Host "cd c:\work\VisaBuddy\apps\backend"
    Write-Host "railway login"
    Write-Host "railway init"
    Write-Host "railway variables set DATABASE_URL=..."
    Write-Host "railway up"
    Write-Host ""
    
    Write-Info "AI Service deployment:"
    Write-Host "cd c:\work\VisaBuddy\apps\ai-service"
    Write-Host "railway init"
    Write-Host "railway variables set OPENAI_API_KEY=..."
    Write-Host "railway up"
}

# Test
function Run-Tests {
    Write-Info "Running tests..."
    
    # Backend tests
    if ($Platform -in @("all", "backend")) {
        Set-Location "c:\work\VisaBuddy\apps\backend"
        npm test
    }
    
    # Frontend tests
    if ($Platform -in @("all", "frontend")) {
        Set-Location "c:\work\VisaBuddy\apps\frontend"
        npm test
    }
}

# Main menu
function Show-Menu {
    Write-Host ""
    Write-Host "$Blue╔════════════════════════════════════════════════╗$Reset"
    Write-Host "$Blue║     VisaBuddy Phase 3 - Complete Build       ║$Reset"
    Write-Host "$Blue╚════════════════════════════════════════════════╝$Reset"
    Write-Host ""
    Write-Host "Usage: .\BUILD_APP_TODAY.ps1 -Action <action> -Platform <platform>"
    Write-Host ""
    Write-Host "Actions:"
    Write-Host "  dev       Start development servers"
    Write-Host "  build     Build for production"
    Write-Host "  mobile    Build mobile apps (APK, IPA)"
    Write-Host "  deploy    Deploy to production"
    Write-Host "  test      Run tests"
    Write-Host "  setup     Install dependencies and setup database"
    Write-Host ""
    Write-Host "Platforms:"
    Write-Host "  all       All components (default)"
    Write-Host "  backend   Express backend only"
    Write-Host "  frontend  React Native frontend only"
    Write-Host "  ai        FastAPI AI service only"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\BUILD_APP_TODAY.ps1 -Action setup"
    Write-Host "  .\BUILD_APP_TODAY.ps1 -Action dev -Platform backend"
    Write-Host "  .\BUILD_APP_TODAY.ps1 -Action build -Platform all"
    Write-Host ""
}

# Execute
try {
    if ($Action -eq "menu" -or [string]::IsNullOrEmpty($Action)) {
        Show-Menu
    }
    else {
        Check-Prerequisites
        
        switch ($Action.ToLower()) {
            "setup" {
                Install-Dependencies
                Setup-Database
                Write-Success "Setup complete!"
            }
            "dev" {
                Start-Development
            }
            "build" {
                Build-Production
                Write-Success "Production build complete!"
            }
            "mobile" {
                Build-Mobile
            }
            "deploy" {
                Deploy-Production
            }
            "test" {
                Run-Tests
            }
            default {
                Write-Error-Custom "Unknown action: $Action"
                Show-Menu
            }
        }
    }
}
catch {
    Write-Host "$Red✗ Error: $_$Reset"
    exit 1
}

Write-Host ""
Write-Success "Build script complete!"