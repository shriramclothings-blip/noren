@echo off
echo ============================================
echo NOREN Email Portal - Development Server
echo ============================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [SETUP] Node modules not found. Installing dependencies...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to install dependencies!
        echo Please run: npm install
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] Dependencies installed!
    echo.
)

echo [STARTING] Launching Email Portal...
echo.
echo Frontend: http://localhost:5177
echo Backend:  https://noren-iqk3.onrender.com (Online)
echo.
echo Press Ctrl+C to stop the server
echo ============================================
echo.

REM Start the development server
call npm run dev

pause