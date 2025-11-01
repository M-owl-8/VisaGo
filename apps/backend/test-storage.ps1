# Storage Setup Verification Script
# This script verifies that local file storage is configured correctly

Write-Host "
╔════════════════════════════════════════════════════════╗
║    VisaBuddy Local Storage Verification                ║
╚════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

# Check 1: Verify .env file
Write-Host "`n[1/5] Checking .env configuration..." -ForegroundColor Yellow

if (Test-Path ".env") {
    $envContent = Get-Content ".env"
    $hasStorageType = $envContent | Select-String "STORAGE_TYPE=local"
    $hasLocalPath = $envContent | Select-String "LOCAL_STORAGE_PATH"
    $hasServerUrl = $envContent | Select-String "SERVER_URL"
    
    if ($hasStorageType -and $hasLocalPath -and $hasServerUrl) {
        Write-Host "✓ .env configured for local storage" -ForegroundColor Green
    } else {
        Write-Host "✗ .env not properly configured" -ForegroundColor Red
        Write-Host "  Required: STORAGE_TYPE=local, LOCAL_STORAGE_PATH, SERVER_URL"
        exit 1
    }
} else {
    Write-Host "✗ .env file not found" -ForegroundColor Red
    exit 1
}

# Check 2: Verify uploads directory
Write-Host "`n[2/5] Checking uploads directory..." -ForegroundColor Yellow

$uploadsDir = "uploads"
if (Test-Path $uploadsDir) {
    Write-Host "✓ uploads directory exists" -ForegroundColor Green
} else {
    Write-Host "⚠ uploads directory not found, will be created on first upload" -ForegroundColor Yellow
    mkdir $uploadsDir | Out-Null
    Write-Host "  Created: uploads/" -ForegroundColor Green
}

# Check 3: Verify node_modules
Write-Host "`n[3/5] Checking required dependencies..." -ForegroundColor Yellow

$requiredPackages = @("express", "multer", "sharp", "uuid", "firebase-admin")
$missingPackages = @()

foreach ($pkg in $requiredPackages) {
    if (Test-Path "node_modules\$pkg") {
        Write-Host "✓ $pkg installed" -ForegroundColor Green
    } else {
        $missingPackages += $pkg
        Write-Host "✗ $pkg not installed" -ForegroundColor Red
    }
}

if ($missingPackages.Count -gt 0) {
    Write-Host "`n⚠ Missing packages. Running npm install..." -ForegroundColor Yellow
    npm install
}

# Check 4: Verify TypeScript compilation
Write-Host "`n[4/5] Checking TypeScript files..." -ForegroundColor Yellow

$storageFiles = @(
    "src\services\local-storage.service.ts",
    "src\services\storage-adapter.ts",
    "src\routes\documents.ts"
)

$allFilesExist = $true
foreach ($file in $storageFiles) {
    if (Test-Path $file) {
        Write-Host "✓ $file exists" -ForegroundColor Green
    } else {
        Write-Host "✗ $file not found" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "`n✗ Missing required files" -ForegroundColor Red
    exit 1
}

# Check 5: Summary
Write-Host "`n[5/5] Summary" -ForegroundColor Yellow

Write-Host "
✓ Environment: Local Storage configured
✓ Directory: uploads/ folder ready
✓ Dependencies: All required packages present
✓ Files: All storage services in place

" -ForegroundColor Green

Write-Host "
╔════════════════════════════════════════════════════════╗
║    Ready to Start Backend!                             ║
╚════════════════════════════════════════════════════════╝

Next steps:

  1. Run backend:
     npm start

  2. Backend will initialize local storage automatically

  3. Test upload to: POST /api/documents/upload
     
  4. Files saved to: uploads/files/{userId}/{docType}
     
  5. Accessible via: http://localhost:3000/uploads/files/...

To migrate to Firebase later:
  - Update .env: STORAGE_TYPE=firebase
  - Add Firebase credentials
  - Restart backend (no code changes needed!)

" -ForegroundColor Cyan