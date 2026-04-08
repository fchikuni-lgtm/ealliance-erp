#!/bin/bash
echo ""
echo "=========================================="
echo "  HOLLIES — Applying Update"
echo "=========================================="
echo ""

if ! docker info &> /dev/null; then
    echo "  ERROR: Docker is not running. Please open Docker Desktop first."
    read -p "Press Enter to close..."
    exit 1
fi

echo "  Applying update (takes 2-5 minutes)..."
echo ""
docker-compose up --build -d

if [ $? -ne 0 ]; then
    echo "  Update failed. Screenshot this and send to Biggie."
    read -p "Press Enter..."
    exit 1
fi

echo ""
echo "=========================================="
echo "  UPDATE COMPLETE!"
echo "=========================================="
echo ""
echo "  Hollies is updated and running."
echo "  Tell staff to refresh their browsers."
echo ""
read -p "Press Enter to close..."
