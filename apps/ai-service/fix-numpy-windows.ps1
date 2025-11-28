# Fix Numpy DLL Issue on Windows
# This script helps resolve the "DLL load failed" error for numpy on Windows

Write-Host "🔧 Fixing Numpy Installation on Windows..." -ForegroundColor Cyan

# Step 1: Uninstall numpy
Write-Host "`n1. Uninstalling numpy..." -ForegroundColor Yellow
pip uninstall numpy -y

# Step 2: Check if Visual C++ Redistributables are needed
Write-Host "`n2. Checking system requirements..." -ForegroundColor Yellow
Write-Host "   Note: If numpy still fails after reinstall, you may need to install:" -ForegroundColor White
Write-Host "   Microsoft Visual C++ Redistributable: https://aka.ms/vs/17/release/vc_redist.x64.exe" -ForegroundColor Cyan

# Step 3: Upgrade pip and setuptools
Write-Host "`n3. Upgrading pip and setuptools..." -ForegroundColor Yellow
python -m pip install --upgrade pip setuptools wheel

# Step 4: Install numpy with pre-built wheel
Write-Host "`n4. Installing numpy (pre-built wheel)..." -ForegroundColor Yellow
pip install numpy==2.3.2 --only-binary :all:

# Step 5: Test import
Write-Host "`n5. Testing numpy import..." -ForegroundColor Yellow
try {
    python -c "import numpy as np; print('✅ Numpy', np.__version__, 'imported successfully!')"
    Write-Host "`n✅ SUCCESS! Numpy is working correctly." -ForegroundColor Green
} catch {
    Write-Host "`n❌ FAILED! Numpy import still failing." -ForegroundColor Red
    Write-Host "`nPlease try the following:" -ForegroundColor Yellow
    Write-Host "1. Install Visual C++ Redistributable: https://aka.ms/vs/17/release/vc_redist.x64.exe" -ForegroundColor White
    Write-Host "2. Restart your terminal/PowerShell" -ForegroundColor White
    Write-Host "3. Run this script again" -ForegroundColor White
    Write-Host "`nOr use Docker instead: docker-compose up ai-service" -ForegroundColor Cyan
    exit 1
}

Write-Host "`n✅ Done! You can now run the AI service." -ForegroundColor Green











