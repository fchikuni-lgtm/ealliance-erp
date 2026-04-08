@echo off
title Hollies — Updating System
color 0A

echo.
echo  ==========================================
echo   HOLLIES — Applying Update
echo  ==========================================
echo.

docker info >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  ERROR: Docker is not running. Please open Docker Desktop first.
    pause
    exit /b 1
)

echo  Applying update (takes 2-5 minutes)...
echo.
docker-compose up --build -d

if %errorlevel% neq 0 (
    color 0C
    echo  Update failed. Screenshot this and send to Biggie.
    pause
    exit /b 1
)

echo.
echo  ==========================================
echo   UPDATE COMPLETE!
echo  ==========================================
echo.
echo  Hollies is updated and running.
echo  Tell staff to refresh their browsers.
echo.
pause
