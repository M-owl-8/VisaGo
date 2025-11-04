# ============================================================================
# VisaBuddy - GitHub & Railway Deployment Setup Script
# ============================================================================
# This script automates GitHub repository initialization and prepares
# the project for deployment to Railway
#
# Usage: .\SETUP_GITHUB_AND_DEPLOY.ps1
# ============================================================================

param(
    [string]$GitUsername,
    [string]$GitEmail,
    [string]$RepositoryName = "VisaBuddy"
)

# Color output
function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️ $Message" -ForegroundColor Blue
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️ $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# ============================================================================
# Step 1: Get user inputs if not provided
# ============================================================================
Write-Info "Starting VisaBuddy GitHub & Railway Setup..."
Write-Host ""

if (-not $GitUsername) {
    $GitUsername = Read-Host "Enter your GitHub username"
}

if (-not $GitEmail) {
    $GitEmail = Read-Host "Enter your Git email (for commits)"
}

Write-Info "Using GitHub username: $GitUsername"
Write-Info "Using Git email: $GitEmail"
Write-Host ""

# ============================================================================
# Step 2: Verify Git installation
# ============================================================================
Write-Info "Checking Git installation..."
try {
    $gitVersion = git --version
    Write-Success $gitVersion
}
catch {
    Write-Error "Git is not installed or not in PATH"
    Write-Host "Install from: https://git-scm.com/download/win"
    exit 1
}

# ============================================================================
# Step 3: Navigate to project
# ============================================================================
Write-Info "Navigating to project directory..."
$projectPath = "c:\work\VisaBuddy"
if (-not (Test-Path $projectPath)) {
    Write-Error "Project directory not found: $projectPath"
    exit 1
}
Set-Location $projectPath
Write-Success "In directory: $(Get-Location)"

# ============================================================================
# Step 4: Configure Git user
# ============================================================================
Write-Info "Configuring Git user..."
git config user.name $GitUsername
git config user.email $GitEmail
Write-Success "Git configured for $GitUsername"

# ============================================================================
# Step 5: Initialize repository (if not already done)
# ============================================================================
Write-Info "Checking Git repository..."
if (-not (Test-Path .git)) {
    Write-Info "Initializing Git repository..."
    git init
    Write-Success "Repository initialized"
} else {
    Write-Success "Repository already initialized"
}

# ============================================================================
# Step 6: Create comprehensive .gitignore if it doesn't exist
# ============================================================================
Write-Info "Checking .gitignore..."
if (-not (Test-Path .gitignore)) {
    Write-Info "Creating comprehensive .gitignore..."
    $gitignoreContent = @"
# Node modules
node_modules/
npm-debug.log
yarn-error.log
package-lock.json
yarn.lock

# Environment variables
.env
.env.local
.env.*.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Expo
.expo/
.expo-shared/
dist/

# Build outputs
build/
dist/
*.tgz

# Python
venv/
__pycache__/
*.pyc
*.pyo
*.egg-info/
.pytest_cache/

# Temporary files
*.tmp
*.bak
.cache/

# Railway
.railway/

# Logs
logs/
*.log

# Database
*.db
*.sqlite
*.sqlite3

# OS
Thumbs.db
.DS_Store

# Hot reload
.hot-reload
"@
    $gitignoreContent | Out-File -Encoding UTF8 -FilePath .gitignore
    Write-Success "Created .gitignore"
} else {
    Write-Success ".gitignore already exists"
}

# ============================================================================
# Step 7: Stage files
# ============================================================================
Write-Info "Staging files..."
git add .
$stagedCount = @(git diff --cached --name-only).Count
Write-Success "Staged $stagedCount files"

# ============================================================================
# Step 8: Create initial commit
# ============================================================================
Write-Info "Creating initial commit..."
git commit -m "Initial VisaBuddy commit - Phases 0-4.3 complete, production-ready"
Write-Success "Commit created"

# ============================================================================
# Step 9: Create main branch (if not exists)
# ============================================================================
Write-Info "Setting up main branch..."
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -eq "master") {
    git branch -M main
    Write-Success "Renamed master to main"
} else {
    Write-Success "Using branch: $currentBranch"
}

# ============================================================================
# Step 10: Display next steps
# ============================================================================
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              📋 Next Steps: Create GitHub Repository              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host ""
Write-Host "1. Go to https://github.com/new" -ForegroundColor White
Write-Host ""
Write-Host "2. Fill in repository details:" -ForegroundColor White
Write-Host "   Repository name: $RepositoryName" -ForegroundColor Yellow
Write-Host "   Description: AI-powered visa application platform" -ForegroundColor Yellow
Write-Host "   Visibility: Choose Public or Private" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. ⚠️ DO NOT initialize with README/license/.gitignore" -ForegroundColor Red
Write-Host ""
Write-Host "4. Click 'Create repository'" -ForegroundColor White
Write-Host ""
Write-Host "5. Copy your repository URL from GitHub" -ForegroundColor White
Write-Host "   Format: https://github.com/$GitUsername/$RepositoryName.git" -ForegroundColor Yellow
Write-Host ""

# ============================================================================
# Step 11: Get repository URL from user
# ============================================================================
$repoUrl = Read-Host "Enter your GitHub repository URL (or press Enter to skip)"

if ($repoUrl) {
    Write-Info "Connecting to GitHub repository..."
    try {
        git remote add origin $repoUrl
        Write-Success "Remote 'origin' added"
        
        Write-Info "Pushing to main branch..."
        git push -u origin main
        Write-Success "Code pushed to GitHub!"
        
        Write-Success "Your repository is now online!"
        Write-Success "URL: $repoUrl"
    } catch {
        Write-Error "Failed to push to GitHub"
        Write-Warning "You can push later with: git push -u origin main"
    }
} else {
    Write-Info "Skipping GitHub push for now"
    Write-Host ""
    Write-Host "When ready, run these commands:" -ForegroundColor Yellow
    Write-Host "  git remote add origin https://github.com/$GitUsername/$RepositoryName.git" -ForegroundColor Gray
    Write-Host "  git branch -M main" -ForegroundColor Gray
    Write-Host "  git push -u origin main" -ForegroundColor Gray
}

# ============================================================================
# Step 12: Display Railway deployment information
# ============================================================================
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║            🚀 Next: Deploy to Railway (Auto-Deploy)             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host ""
Write-Host "1. Go to https://railway.app" -ForegroundColor White
Write-Host "2. Sign in with GitHub" -ForegroundColor White
Write-Host "3. Click 'New Project' → 'GitHub Repo'" -ForegroundColor White
Write-Host "4. Select $RepositoryName repository" -ForegroundColor Yellow
Write-Host "5. Railway auto-detects Dockerfile and deploys!" -ForegroundColor Green
Write-Host ""
Write-Host "Your backend will be live in 5-10 minutes!" -ForegroundColor Green
Write-Host ""

# ============================================================================
# Step 13: Display environment setup information
# ============================================================================
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        ⚙️ Configure Railway Environment Variables             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host ""
Write-Host "In Railway dashboard, add these variables:" -ForegroundColor White
Write-Host ""
Write-Host "DATABASE_URL=postgresql://..." -ForegroundColor Yellow
Write-Host "  (Get from Supabase: https://supabase.com → Settings → Connection)" -ForegroundColor Gray
Write-Host ""
Write-Host "JWT_SECRET=[32+ character secure string]" -ForegroundColor Yellow
Write-Host "  (Generate: openssl rand -base64 32)" -ForegroundColor Gray
Write-Host ""
Write-Host "NODE_ENV=production" -ForegroundColor Yellow
Write-Host "LOG_LEVEL=info" -ForegroundColor Yellow
Write-Host ""

# ============================================================================
# Step 14: Display CI/CD setup information
# ============================================================================
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       ⚙️ Setup GitHub Secrets for CI/CD Automation            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host ""
Write-Host "1. Go to GitHub repository Settings → Secrets and variables → Actions" -ForegroundColor White
Write-Host ""
Write-Host "2. Add these secrets:" -ForegroundColor White
Write-Host "   DATABASE_URL" -ForegroundColor Yellow
Write-Host "   JWT_SECRET" -ForegroundColor Yellow
Write-Host "   RAILWAY_TOKEN" -ForegroundColor Yellow
Write-Host "   RAILWAY_URL" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Now every push to main auto-deploys!" -ForegroundColor Green
Write-Host ""

# ============================================================================
# Final summary
# ============================================================================
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    ✅ Setup Complete!                            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host ""
Write-Host "Your VisaBuddy project is now:" -ForegroundColor Green
Write-Host "  ✅ Git initialized locally" -ForegroundColor Green
Write-Host "  ✅ Ready to push to GitHub" -ForegroundColor Green
Write-Host "  ✅ Ready for Railway deployment" -ForegroundColor Green
Write-Host "  ✅ Ready for CI/CD automation" -ForegroundColor Green
Write-Host ""

Write-Host "📖 For detailed deployment guide, see: PHASE_4_3_DEPLOYMENT_SETUP.md" -ForegroundColor Cyan
Write-Host "⚡ For quick start, see: PHASE_4_3_QUICK_START.md" -ForegroundColor Cyan
Write-Host ""

Write-Host "Need help? Check the troubleshooting section in PHASE_4_3_DEPLOYMENT_SETUP.md" -ForegroundColor Yellow
Write-Host ""

Write-Host "Press Enter to exit..."
Read-Host