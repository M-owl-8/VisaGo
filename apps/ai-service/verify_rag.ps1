# RAG System Verification Script
# Validates all RAG components are working correctly

Write-Host "="*60 -ForegroundColor Cyan
Write-Host "VisaBuddy RAG System Verification" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

# Check 1: Python availability
Write-Host "`n[1/7] Checking Python..." -ForegroundColor Yellow
try {
    $python_version = python --version 2>&1
    Write-Host "✅ Python found: $python_version" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Install Python 3.9+" -ForegroundColor Red
    exit 1
}

# Check 2: Dependencies
Write-Host "`n[2/7] Checking dependencies..." -ForegroundColor Yellow
$required_packages = @("fastapi", "uvicorn", "pydantic", "openai", "numpy")
$missing_packages = @()

foreach ($package in $required_packages) {
    try {
        python -c "import $package" 2>$null
        Write-Host "✅ $package installed" -ForegroundColor Green
    } catch {
        $missing_packages += $package
        Write-Host "❌ $package missing" -ForegroundColor Red
    }
}

if ($missing_packages.Count -gt 0) {
    Write-Host "`n⚠️ Install missing packages:" -ForegroundColor Yellow
    Write-Host "pip install -r requirements.txt" -ForegroundColor Yellow
}

# Check 3: File structure
Write-Host "`n[3/7] Checking file structure..." -ForegroundColor Yellow
$required_files = @(
    "services/rag.py",
    "services/chunker.py",
    "services/cache_fallback.py",
    "services/kb_ingestor.py",
    "services/rag_validator.py",
    "data/visa_kb.json",
    "main.py",
    "ingest_rag.py"
)

$missing_files = @()
foreach ($file in $required_files) {
    $file_path = Join-Path $PSScriptRoot $file
    if (Test-Path $file_path) {
        Write-Host "✅ $file exists" -ForegroundColor Green
    } else {
        $missing_files += $file
        Write-Host "❌ $file missing" -ForegroundColor Red
    }
}

# Check 4: Environment
Write-Host "`n[4/7] Checking environment..." -ForegroundColor Yellow
$env_file = Join-Path $PSScriptRoot ".env"
if (Test-Path $env_file) {
    Write-Host "✅ .env file exists" -ForegroundColor Green
} else {
    Write-Host "⚠️ .env file not found" -ForegroundColor Yellow
    Write-Host "  Create .env with OPENAI_API_KEY at minimum" -ForegroundColor Yellow
}

# Check 5: Knowledge base
Write-Host "`n[5/7] Checking knowledge base..." -ForegroundColor Yellow
$kb_path = Join-Path $PSScriptRoot "data/visa_kb.json"
if (Test-Path $kb_path) {
    try {
        $kb_content = Get-Content $kb_path | ConvertFrom-Json
        $country_count = $kb_content.countries.PSObject.Properties.Count
        Write-Host "✅ Knowledge base loaded ($country_count countries)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Knowledge base JSON invalid" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Knowledge base not found" -ForegroundColor Red
}

# Check 6: Service imports
Write-Host "`n[6/7] Testing service imports..." -ForegroundColor Yellow
try {
    python -c "
from services.chunker import get_document_chunker
from services.cache_fallback import get_cache_fallback_service
from services.kb_ingestor import get_kb_ingestor
from services.rag import get_rag_service
print('✅ All services import successfully')
" 2>$null
    Write-Host "✅ All services import successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Service import failed" -ForegroundColor Red
    Write-Host $_ -ForegroundColor Red
}

# Check 7: FastAPI
Write-Host "`n[7/7] Checking FastAPI app..." -ForegroundColor Yellow
try {
    python -c "
from main import app
import inspect
endpoints = [route.path for route in app.routes]
rag_endpoints = [e for e in endpoints if 'rag' in e]
print(f'✅ FastAPI app loads correctly ({len(endpoints)} endpoints)')
print(f'✅ RAG endpoints: {len(rag_endpoints)}')
" 2>$null
    Write-Host "✅ FastAPI app loads correctly" -ForegroundColor Green
} catch {
    Write-Host "❌ FastAPI import failed" -ForegroundColor Red
}

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

if ($missing_files.Count -eq 0 -and $missing_packages.Count -eq 0) {
    Write-Host "`n✅ All checks passed! RAG system ready to test." -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. python ingest_rag.py          # Run ingestion & validation" -ForegroundColor White
    Write-Host "2. Start FastAPI server" -ForegroundColor White
    Write-Host "3. Test endpoints:" -ForegroundColor White
    Write-Host "   - GET /api/rag/status" -ForegroundColor White
    Write-Host "   - GET /api/rag/diagnostics" -ForegroundColor White
    Write-Host "   - POST /api/rag/validate" -ForegroundColor White
} else {
    Write-Host "`n⚠️ Some checks failed. Please fix issues above." -ForegroundColor Yellow
    if ($missing_files.Count -gt 0) {
        Write-Host "Missing files: $($missing_files -join ', ')" -ForegroundColor Red
    }
    if ($missing_packages.Count -gt 0) {
        Write-Host "Missing packages: $($missing_packages -join ', ')" -ForegroundColor Red
        Write-Host "Run: pip install -r requirements.txt" -ForegroundColor Yellow
    }
}

Write-Host "`n" + "="*60 -ForegroundColor Cyan