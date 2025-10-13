#!/bin/bash
# Pharmaceutical Tracking System - Startup Script
# This script helps you start the application easily

set -e  # Exit on error

echo "=========================================="
echo "Pharmaceutical Tracking System"
echo "Docker Deployment Script"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo "Please install Docker Desktop from:"
    echo "https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed and running${NC}"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose is not installed!${NC}"
    echo "Please install docker-compose."
    exit 1
fi

echo -e "${GREEN}✓ docker-compose is available${NC}"

# Create data directory if it doesn't exist
if [ ! -d "data" ]; then
    echo -e "${YELLOW}Creating data directory...${NC}"
    mkdir -p data
    echo -e "${GREEN}✓ Data directory created${NC}"
else
    echo -e "${GREEN}✓ Data directory exists${NC}"
fi

# Check if containers are already running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo -e "${YELLOW}⚠️  Containers are already running${NC}"
    echo "Current status:"
    docker-compose ps
    echo ""
    read -p "Do you want to restart? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Restarting containers..."
        docker-compose restart
        echo -e "${GREEN}✓ Containers restarted${NC}"
    else
        echo "Keeping containers running."
    fi
else
    # Start the application
    echo ""
    echo "Starting the application..."
    echo "This may take 2-5 minutes on first run..."
    echo ""

    docker-compose up -d

    echo ""
    echo -e "${GREEN}✓ Application started successfully!${NC}"
fi

# Wait for services to be healthy
echo ""
echo "Waiting for services to be healthy..."
TIMEOUT=60
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
    BACKEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' pharma-backend 2>/dev/null || echo "starting")
    FRONTEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' pharma-frontend 2>/dev/null || echo "starting")

    if [ "$BACKEND_HEALTH" = "healthy" ] && [ "$FRONTEND_HEALTH" = "healthy" ]; then
        echo -e "${GREEN}✓ All services are healthy${NC}"
        break
    fi

    echo -n "."
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

echo ""
echo ""

# Show status
echo "=========================================="
echo "Service Status:"
echo "=========================================="
docker-compose ps

echo ""
echo "=========================================="
echo "Access the Application:"
echo "=========================================="
echo -e "${GREEN}Frontend:${NC}     http://localhost:3000"
echo -e "${GREEN}Backend API:${NC}  http://localhost:3001"
echo -e "${GREEN}Health Check:${NC} http://localhost:3001/api/health"
echo ""
echo "=========================================="
echo "Useful Commands:"
echo "=========================================="
echo "View logs:        docker-compose logs -f"
echo "Stop application: docker-compose down"
echo "Restart:          docker-compose restart"
echo "Status:           docker-compose ps"
echo ""
echo -e "${GREEN}Deployment complete!${NC}"
echo "=========================================="
