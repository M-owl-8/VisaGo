# Add Pinecone configuration to .env file
# Run this script: .\add-pinecone-to-env.ps1

$envFile = ".env"
$pineconeConfig = @"

# ============================================================================
# PINECONE CONFIGURATION
# ============================================================================
PINECONE_API_KEY=pcsk_5wZjKa_94AaqNHta1KST7Li3s5kfA6qMa6WWa8LKF5XVvE91MSafAjrgaPFEApKPeRfcrH
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=visabuddy-visa-kb

"@

# Check if .env exists
if (Test-Path $envFile) {
    # Check if Pinecone config already exists
    $content = Get-Content $envFile -Raw
    if ($content -match "PINECONE_API_KEY") {
        Write-Host "⚠️  Pinecone configuration already exists in .env" -ForegroundColor Yellow
        Write-Host "   Please edit .env manually to update" -ForegroundColor Yellow
    } else {
        # Append Pinecone config
        Add-Content -Path $envFile -Value $pineconeConfig
        Write-Host "✅ Pinecone configuration added to .env" -ForegroundColor Green
    }
} else {
    # Create new .env file with Pinecone config
    Set-Content -Path $envFile -Value $pineconeConfig.TrimStart()
    Write-Host "✅ Created .env file with Pinecone configuration" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Create Pinecone index at https://app.pinecone.io/" -ForegroundColor White
Write-Host "   - Name: visabuddy-visa-kb" -ForegroundColor White
Write-Host "   - Dimensions: 1536" -ForegroundColor White
Write-Host "   - Metric: cosine" -ForegroundColor White
Write-Host "2. Run: python ingest_rag.py" -ForegroundColor White
Write-Host "3. Run: python main.py" -ForegroundColor White
Write-Host ""

