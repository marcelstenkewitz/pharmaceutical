@echo off
REM Pharmaceutical Tracking System - Local Development Startup Script
REM This script starts both backend and frontend services for local development

REM Change to the directory where this script is located
cd /d "%~dp0"

echo ==========================================
echo Pharmaceutical Tracking System
echo Local Development Startup Script
echo ==========================================
echo.

REM Check if Node.js is installed
echo Checking for Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js is installed
node --version

REM Check if we're in the right directory
echo Checking project structure...
echo Current directory: %CD%
if not exist "package.json" (
    echo [ERROR] package.json not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

if not exist "backend" (
    echo [ERROR] backend directory not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

if not exist "frontend" (
    echo [ERROR] frontend directory not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

echo [OK] Project structure verified

REM Install dependencies if node_modules don't exist
echo.
echo Checking dependencies...

if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install backend dependencies!
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Backend dependencies installed
) else (
    echo [OK] Backend dependencies already installed
)

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install frontend dependencies!
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Frontend dependencies installed
) else (
    echo [OK] Frontend dependencies already installed
)

REM Create storage directory and initialize data if needed
if not exist "backend\storage" (
    echo Creating storage directory...
    mkdir backend\storage
    echo [OK] Storage directory created
)

REM Check if data needs to be initialized
if not exist "backend\storage\clients.json" (
    echo Initializing application data...
    cd backend
    npm run init
    if errorlevel 1 (
        echo [WARNING] Failed to initialize data, but continuing...
    ) else (
        echo [OK] Application data initialized
    )
    cd ..
)

echo.
echo ==========================================
echo Starting Services...
echo ==========================================
echo.
echo Starting backend server (http://localhost:3001)...
echo Starting frontend development server (http://localhost:3000)...
echo.
echo [INFO] Both services will open in separate windows
echo [INFO] Backend logs will be in the backend window
echo [INFO] Frontend logs will be in the frontend window
echo.
echo Press Ctrl+C in each window to stop the respective service
echo.

REM Start backend in a new window
start "Backend Server - Pharmaceutical System" cmd /k "cd backend && echo Starting backend server... && node server.js"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in a new window
start "Frontend Server - Pharmaceutical System" cmd /k "cd frontend && npm start"

echo.
echo ==========================================
echo Services Started!
echo ==========================================
echo.
echo Backend API:      http://localhost:3001
echo Frontend App:     http://localhost:3000
echo Health Check:     http://localhost:3001/api/health
echo.
echo The frontend should automatically open in your browser.
echo If not, navigate to: http://localhost:3000
echo.
echo ==========================================
echo Development Notes:
echo ==========================================
echo - Backend runs with nodemon (auto-restart on changes)
echo - Frontend runs with React dev server (hot reload)
echo - Check each service window for logs and errors
echo - Use Ctrl+C in each window to stop services
echo.
echo ==========================================
echo Useful Commands (run in separate terminal):
echo ==========================================
echo Install all deps:     npm run install-all
echo Backend only:         cd backend && npm run dev
echo Frontend only:        cd frontend && npm start
echo Run tests:            cd backend && npm test
echo Seed test data:       cd backend && npm run seed
echo.
echo [OK] Local development environment ready!
echo ==========================================
echo.
pause