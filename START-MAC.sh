#!/bin/bash

echo ""
echo "=========================================="
echo "  HOLLIES — Starting System"
echo "=========================================="
echo ""

# Check Docker is installed
if ! command -v docker &> /dev/null; then
    echo "  ERROR: Docker Desktop is not installed."
    echo ""
    echo "  Please install it from: https://www.docker.com/products/docker-desktop"
    echo "  Then run this file again."
    echo ""
    read -p "Press Enter to close..."
    exit 1
fi

# Check Docker is running
if ! docker info &> /dev/null; then
    echo "  ERROR: Docker Desktop is not running."
    echo ""
    echo "  Please open Docker Desktop from your Applications folder,"
    echo "  wait for the whale icon to appear in the menu bar,"
    echo "  then run this file again."
    echo ""
    read -p "Press Enter to close..."
    exit 1
fi

echo "  Docker is running. Starting Hollies..."
echo ""

# Start everything
docker-compose up --build -d

if [ $? -ne 0 ]; then
    echo ""
    echo "  Something went wrong. Please take a screenshot and send to Biggie."
    echo ""
    read -p "Press Enter to close..."
    exit 1
fi

echo ""
echo "  Waiting for system to be ready (30 seconds)..."
sleep 30

echo ""
echo "=========================================="
echo "  HOLLIES IS READY!"
echo "=========================================="
echo ""
echo "  Opening setup page..."
echo ""
echo "  App:   http://localhost:3000"
echo "  Setup: http://localhost:5000/setup.html"
echo ""

# Open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:5000
else
    xdg-open http://localhost:5000
fi

echo "  Press Enter to close this window."
echo "  (The system keeps running in the background)"
echo ""
read -p ""
