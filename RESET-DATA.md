# Reset Mock Data Guide

If you encounter errors like "Client not found with identifier: xxx", it means the backend server is running with old cached data. Follow these steps to reset:

## Quick Fix (Development Mode)

### Step 1: Stop the Backend Server
Press `Ctrl+C` in the terminal running the backend, or:
```bash
# Find and kill the process
lsof -ti:3001 | xargs kill -9
```

### Step 2: Clean and Regenerate Data
```bash
# Remove old data files
rm -f backend/storage/*.json

# Generate fresh mock data
node backend/scripts/seedMockData.js --force
```

### Step 3: Restart Backend Server
```bash
cd backend
npm start
# or for development with auto-reload:
npm run dev
```

### Step 4: Refresh Frontend
- Refresh your browser (F5 or Cmd+R)
- Clear browser cache if needed (Cmd+Shift+R / Ctrl+Shift+R)

## Quick Fix (Docker Mode)

If running in Docker containers:

```bash
# Stop containers
docker-compose down

# Remove data (optional - creates fresh data)
rm -rf data/*.json

# Regenerate mock data
node backend/scripts/seedMockData.js --force

# Restart containers
docker-compose up -d

# View logs to verify
docker-compose logs -f backend
```

## What Happened?

The error occurs when:
1. Old data files exist with specific client IDs
2. New mock data is generated with different client IDs
3. Reports reference old client IDs that no longer exist
4. Backend server has old data cached in memory

## Prevention

Always regenerate data with these steps:
```bash
# 1. Stop backend
# 2. Clean old data
rm -f backend/storage/*.json

# 3. Generate new data
node backend/scripts/seedMockData.js --force

# 4. Restart backend
```

## Verify Data Consistency

Check that all reports reference valid clients:
```bash
python3 << 'EOF'
import json

with open('backend/storage/clients.json', 'r') as f:
    clients = json.load(f)
with open('backend/storage/reports.json', 'r') as f:
    reports = json.load(f)

client_ids = {c['id'] for c in clients}
report_client_ids = {r['clientId'] for r in reports}

print(f"Clients: {len(client_ids)}")
print(f"Reports: {len(reports)}")
print(f"Valid references: {report_client_ids.issubset(client_ids)}")
EOF
```

## Fresh Start Script

Use this helper script for a complete reset:

**reset-data.sh** (Linux/macOS):
```bash
#!/bin/bash
echo "🧹 Cleaning old data..."
rm -f backend/storage/*.json

echo "🌱 Generating fresh mock data..."
node backend/scripts/seedMockData.js --force

echo "✅ Data reset complete!"
echo "⚠️  Remember to restart your backend server!"
```

**reset-data.bat** (Windows):
```batch
@echo off
echo Cleaning old data...
del /f /q backend\storage\*.json

echo Generating fresh mock data...
node backend\scripts\seedMockData.js --force

echo Data reset complete!
echo Remember to restart your backend server!
pause
```

## Production Considerations

In production:
- **Never** use `--force` flag without backing up data first
- Always backup before regenerating: `cp -r data/ data-backup/`
- The seed script has safety checks to prevent accidental data loss
- Consider using proper database migrations instead of file regeneration

---

**Status**: Mock data has been cleaned and regenerated with consistent IDs
**Date**: 2025-10-13
