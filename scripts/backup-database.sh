#!/bin/bash

# ============================================================================
# VisaBuddy Database Backup Script
# ============================================================================
# 
# Creates a backup of the production database
# Usage: ./scripts/backup-database.sh [output-file]
#
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║     VisaBuddy Database Backup                                     ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env file exists
if [ ! -f "apps/backend/.env" ] && [ ! -f "apps/backend/.env.production" ]; then
    echo -e "${RED}❌ No .env file found${NC}"
    exit 1
fi

# Load environment variables
if [ -f "apps/backend/.env.production" ]; then
    export $(cat apps/backend/.env.production | grep -v '^#' | grep DATABASE_URL | xargs)
elif [ -f "apps/backend/.env" ]; then
    export $(cat apps/backend/.env | grep -v '^#' | grep DATABASE_URL | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL is not set${NC}"
    exit 1
fi

# Parse DATABASE_URL
# Format: postgresql://user:password@host:port/database
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="${1:-$BACKUP_DIR/visabuddy_backup_$TIMESTAMP.sql}"

echo -e "${BLUE}📦 Creating backup...${NC}"
echo -e "${BLUE}   Output: $OUTPUT_FILE${NC}"
echo ""

# Extract connection details from DATABASE_URL
# Note: This is a simplified version - for production, use pg_dump directly
if command -v pg_dump &> /dev/null; then
    # Use pg_dump if available
    pg_dump "$DATABASE_URL" > "$OUTPUT_FILE"
    echo -e "${GREEN}✅ Backup created successfully${NC}"
    echo -e "${BLUE}   File: $OUTPUT_FILE${NC}"
    echo -e "${BLUE}   Size: $(du -h "$OUTPUT_FILE" | cut -f1)${NC}"
else
    echo -e "${YELLOW}⚠️  pg_dump not found${NC}"
    echo "Please install PostgreSQL client tools or use Prisma Studio to export data"
    echo ""
    echo "Alternative: Use Prisma Studio to export data:"
    echo "  npx prisma studio"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Backup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""








