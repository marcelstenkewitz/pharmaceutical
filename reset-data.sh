#!/bin/bash
# Reset Mock Data Script
# Cleans old data and generates fresh mock data with consistent IDs

set -e

echo "=========================================="
echo "Reset Mock Data"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}⚠️  This will delete all existing data!${NC}"
read -p "Are you sure? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}🧹 Cleaning old data...${NC}"
rm -f backend/storage/*.json
rm -f data/*.json 2>/dev/null || true

echo -e "${GREEN}✓ Old data removed${NC}"

echo ""
echo -e "${YELLOW}🌱 Generating fresh mock data...${NC}"
node backend/scripts/seedMockData.js --force

echo ""
echo -e "${GREEN}✅ Data reset complete!${NC}"
echo ""
echo -e "${YELLOW}⚠️  Important: Restart your backend server!${NC}"
echo ""
echo "Next steps:"
echo "1. Stop backend server (Ctrl+C or kill process)"
echo "2. Restart: cd backend && npm start"
echo "3. Refresh browser"
echo ""
echo "=========================================="
