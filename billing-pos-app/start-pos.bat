@echo off
title VENDEXA POS - Starting...
color 0A

echo.
echo ========================================
echo   VENDEXA RetailOS POS System
echo   Starting Development Server...
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [2/3] Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies for first run...
    call npm install
)

echo [3/3] Starting POS application...
echo.
echo ========================================
echo   POS will open in your browser
echo   Keep this window open while using POS
echo ========================================
echo.

start "" "http://localhost:3000"
call npm start

pause
