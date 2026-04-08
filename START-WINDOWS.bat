@echo off
title Hollies — Starting System
color 0A

echo.
echo  ==========================================
echo   HOLLIES — Starting System
echo  ==========================================
echo.

:: Check Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  ERROR: Docker Desktop is not installed.
    echo.
    echo  Please install it from: https://www.docker.com/products/docker-desktop
    echo  Then run this file again.
    echo.
    pause
    exit /b 1
)

:: Check Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  ERROR: Docker Desktop is not running.
    echo.
    echo  Please open Docker Desktop from your Start Menu,
    echo  wait for the whale icon to appear in the taskbar,
    echo  then run this file again.
    echo.
    pause
    exit /b 1
)

echo  Docker is running. Starting Hollies...
echo.

:: Start everything
docker-compose up --build -d

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  Something went wrong. Please take a screenshot and send to Biggie.
    echo.
    pause
    exit /b 1
)

echo.
echo  ==========================================
echo   Hollies is starting up...
echo   This takes about 30 seconds.
echo  ==========================================
echo.
echo  Waiting for system to be ready...
timeout /t 30 /nobreak >nul

echo.
echo  ==========================================
echo   HOLLIES IS READY!
echo  ==========================================
echo.
echo  Opening setup page in your browser...
echo.
start http://localhost:5000

echo  The app will open at: http://localhost:3000
echo  Setup page:           http://localhost:5000/setup.html
echo.
echo  Press any key to close this window.
echo  (The system keeps running in the background)
echo.
pause
