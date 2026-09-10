@echo off
cls
echo.
echo ════════════════════════════════════════════════════════════
echo    NOREN EMAIL PORTAL - Starting...
echo ════════════════════════════════════════════════════════════
echo.
echo [Step 1/2] Checking backend status...
echo.
curl -s https://noren-iqk3.onrender.com/api/health
echo.
echo.
echo [Step 2/2] Starting email portal frontend...
echo.
echo ════════════════════════════════════════════════════════════
echo    EMAIL PORTAL
echo ════════════════════════════════════════════════════════════
echo.
echo    URL: http://localhost:5177
echo    Backend: https://noren-iqk3.onrender.com
echo.
echo    LOGIN CREDENTIALS:
echo    Email: admin@norenfashion.in
echo    Password: Noren@Admin2024
echo.
echo    Press Ctrl+C to stop
echo ════════════════════════════════════════════════════════════
echo.

cd email-portal
call npm run dev
