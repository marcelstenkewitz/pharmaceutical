@echo off
REM Pharmaceutical Tracking System - Startup Script for Windows
REM This script helps you start the application easily

echo ==========================================
echo Pharmaceutical Tracking System
echo Docker Deployment Script
echo ==========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed!
    echo Please install Docker Desktop from:
    echo https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

echo [OK] Docker is installed

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [OK] Docker is running

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] docker-compose is not installed!
    echo Please install docker-compose.
    pause
    exit /b 1
)

echo [OK] docker-compose is available

REM Create data directory if it doesn't exist
if not exist "data" (
    echo Creating data directory...
    mkdir data
    echo [OK] Data directory created
) else (
    echo [OK] Data directory exists
)

REM Check if containers are already running
docker-compose ps 2>nul | findstr "Up" >nul
if not errorlevel 1 (
    echo.
    echo [WARNING] Containers are already running
    echo Current status:
    docker-compose ps
    echo.
    set /p RESTART="Do you want to restart? (y/N): "
    if /i "%RESTART%"=="y" (
        echo Restarting containers...
        docker-compose restart
        echo [OK] Containers restarted
    ) else (
        echo Keeping containers running.
    )
) else (
    REM Start the application
    echo.
    echo Starting the application...
    echo This may take 2-5 minutes on first run...
    echo.

    docker-compose up -d

    echo.
    echo [OK] Application started successfully!
)

REM Wait for services (simplified for Windows)
echo.
echo Waiting for services to start...
timeout /t 10 /nobreak >nul

echo.
echo.
echo ==========================================
echo Service Status:
echo ==========================================
docker-compose ps

echo.
echo ==========================================
echo Access the Application:
echo ==========================================
echo Frontend:     http://localhost:3000
echo Backend API:  http://localhost:3001
echo Health Check: http://localhost:3001/api/health
echo.
echo ==========================================
echo Useful Commands:
echo ==========================================
echo View logs:        docker-compose logs -f
echo Stop application: docker-compose down
echo Restart:          docker-compose restart
echo Status:           docker-compose ps
echo.
echo [OK] Deployment complete!
echo ==========================================
echo.
pause
