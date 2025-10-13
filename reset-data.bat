@echo off
REM Reset Mock Data Script
REM Cleans old data and generates fresh mock data with consistent IDs

echo ==========================================
echo Reset Mock Data
echo ==========================================
echo.

echo [WARNING] This will delete all existing data!
set /p CONFIRM="Are you sure? (y/N): "
if /i NOT "%CONFIRM%"=="y" (
    echo Cancelled.
    exit /b 0
)

echo.
echo [INFO] Cleaning old data...
del /f /q backend\storage\*.json 2>nul
del /f /q data\*.json 2>nul

echo [OK] Old data removed

echo.
echo [INFO] Generating fresh mock data...
node backend\scripts\seedMockData.js --force

echo.
echo [OK] Data reset complete!
echo.
echo [WARNING] Important: Restart your backend server!
echo.
echo Next steps:
echo 1. Stop backend server (Ctrl+C)
echo 2. Restart: cd backend ^&^& npm start
echo 3. Refresh browser
echo.
echo ==========================================
pause
