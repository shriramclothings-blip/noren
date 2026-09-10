@echo off
title NOREN Email Portal - Frontend Only Startup
color 0A

echo ============================================
echo    NOREN Email Portal - Frontend Startup
echo ============================================
echo.
echo Using Online Backend:
echo   Backend API: https://noren-iqk3.onrender.com
echo   Frontend:    http://localhost:5177
echo.
echo ============================================
echo.

REM Check if email-portal exists
if not exist "email-portal\" (
    echo [ERROR] Email portal directory not found!
    echo Please ensure the email portal is set up.
    pause
    exit /b 1
)

REM Email Portal setup check
echo [EMAIL PORTAL] Checking email portal setup...
cd email-portal
if not exist "node_modules\" (
    echo [EMAIL PORTAL] Installing email portal dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install email portal dependencies!
        cd ..
        pause
        exit /b 1
    )
)
echo [EMAIL PORTAL] Email portal ready!
echo.

echo ============================================
echo          Starting Frontend...
echo ============================================
echo.

REM Start email portal
echo [STARTING] Email Portal Frontend...
call npm run dev

cd ..
echo.
echo Email Portal stopped.
pause