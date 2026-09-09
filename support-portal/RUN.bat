@echo off
title NOREN Support Portal
color 0A

echo.
echo  ============================================
echo   NOREN Support Portal - Starting...
echo  ============================================
echo.

:: Check if node_modules exists, install if not
if not exist "node_modules" (
    echo  Installing dependencies, please wait...
    echo.
    call npm install --legacy-peer-deps
    echo.
)

echo  Backend : https://noren-iqk3.onrender.com
echo  Portal  : http://localhost:5176
echo.
echo  Opening in browser in 3 seconds...
echo  Press Ctrl+C to stop the server.
echo.

:: Wait 3 seconds then open browser
timeout /t 3 /nobreak >nul
start http://localhost:5176

:: Start the dev server
call npm run dev

pause
