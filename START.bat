@echo off
echo ========================================
echo   SHRI RAM CLOTHINGS - Starting Servers
echo ========================================

echo.
echo [1/2] Starting Backend...
start "SRC Backend" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Main Frontend...
start "SRC Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [3/3] Starting Noren Messaging Frontend...
start "Noren Messaging Frontend" cmd /k "cd /d %~dp0noren-messaging-frontend && npm run dev"

echo.
echo ========================================
echo  Backend         : http://localhost:5000
echo  Main Frontend   : http://localhost:5173
echo  Admin Panel     : http://localhost:5173/admin
echo  Noren Messaging : http://localhost:5175
echo ========================================
echo.
pause
