@echo off
title NOREN Email Portal - Setup Checker (Online Backend)
color 0B

echo ============================================
echo  NOREN Email Portal - Setup Checker
echo         (Using Online Backend)
echo ============================================
echo.
echo This script checks if everything is ready
echo to run the email portal frontend.
echo.
echo Backend: https://noren-iqk3.onrender.com
echo Frontend: http://localhost:5177
echo.
echo ============================================
echo.

REM Check Node.js
echo [CHECK] Node.js installation...
where node >nul 2>nul
if errorlevel 1 (
    echo [FAIL] Node.js is NOT installed!
    echo        Download from: https://nodejs.org/
    set HAS_ERROR=1
) else (
    node --version
    echo [PASS] Node.js is installed
)
echo.

REM Check npm
echo [CHECK] npm installation...
where npm >nul 2>nul
if errorlevel 1 (
    echo [FAIL] npm is NOT installed!
    set HAS_ERROR=1
) else (
    npm --version
    echo [PASS] npm is installed
)
echo.

REM Check online backend connectivity
echo [CHECK] Online backend connectivity...
curl -s --connect-timeout 5 https://noren-iqk3.onrender.com >nul 2>nul
if errorlevel 1 (
    echo [WARN] Cannot connect to online backend
    echo        Backend: https://noren-iqk3.onrender.com
    echo        Check your internet connection
) else (
    echo [PASS] Online backend is accessible
)
echo.

REM Check email-portal directory
echo [CHECK] Email Portal directory...
if exist "email-portal\" (
    echo [PASS] Email Portal directory found
    
    REM Check email-portal package.json
    if exist "email-portal\package.json" (
        echo [PASS] Email Portal package.json found
    ) else (
        echo [FAIL] Email Portal package.json NOT found!
        set HAS_ERROR=1
    )
    
    REM Check email-portal node_modules
    if exist "email-portal\node_modules\" (
        echo [PASS] Email Portal dependencies installed
    ) else (
        echo [WARN] Email Portal dependencies NOT installed
        echo        Run: cd email-portal && npm install
    )
    
    REM Check email-portal .env.local
    if exist "email-portal\.env.local" (
        echo [PASS] Email Portal .env.local file found
        
        REM Check if it points to online backend
        findstr "noren-iqk3.onrender.com" "email-portal\.env.local" >nul
        if errorlevel 1 (
            echo [WARN] .env.local may not be configured for online backend
        ) else (
            echo [PASS] .env.local configured for online backend
        )
    ) else (
        echo [WARN] Email Portal .env.local file NOT found
        echo        Should contain: VITE_API_URL=https://noren-iqk3.onrender.com/api
    )
) else (
    echo [FAIL] Email Portal directory NOT found!
    set HAS_ERROR=1
)
echo.

REM Check startup scripts
echo [CHECK] Startup scripts...
if exist "START_EMAIL_PORTAL.BAT" (
    echo [PASS] START_EMAIL_PORTAL.BAT found
) else (
    echo [WARN] START_EMAIL_PORTAL.BAT NOT found
)

if exist "email-portal\RUN.BAT" (
    echo [PASS] email-portal\RUN.BAT found
) else (
    echo [WARN] email-portal\RUN.BAT NOT found
)
echo.

REM Check if frontend port is available
echo [CHECK] Frontend port availability...
netstat -ano | findstr :5177 >nul
if errorlevel 1 (
    echo [PASS] Port 5177 (Email Portal) is available
) else (
    echo [WARN] Port 5177 (Email Portal) is in use
    echo        Run STOP_EMAIL_PORTAL.BAT to free it
)
echo.

REM Final result
echo ============================================
echo              Setup Summary
echo ============================================
echo.

if defined HAS_ERROR (
    echo [RESULT] Setup is INCOMPLETE
    echo.
    echo Please fix the errors above before running
    echo the email portal frontend.
    echo.
    echo Common fixes:
    echo   1. Install Node.js: https://nodejs.org/
    echo   2. Run: cd email-portal ^&^& npm install
    echo   3. Check internet connection for backend access
) else (
    echo [RESULT] Setup is READY!
    echo.
    echo Everything looks good. You can now run:
    echo   START_EMAIL_PORTAL.BAT
    echo.
    echo This will start the frontend using the online backend.
    echo.
    echo URLs:
    echo   Frontend: http://localhost:5177
    echo   Backend:  https://noren-iqk3.onrender.com
)

echo.
echo ============================================
pause