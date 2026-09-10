@echo off
cls
echo ╔════════════════════════════════════════════════════════════╗
echo ║   NOREN EMAIL PORTAL - Complete Startup                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/4] Checking admin users...
cd backend
node check-user.js
echo.

echo [2/4] Verifying email portal tables...
node check-tables.js
echo.

echo [3/4] Checking email configuration...
echo RESEND_API_KEY: %RESEND_API_KEY:~0,15%...
echo EMAIL_FROM: %EMAIL_FROM%
echo.

echo [4/4] Starting email portal frontend...
echo.
echo ════════════════════════════════════════════════════════════
echo    EMAIL PORTAL IS STARTING
echo ════════════════════════════════════════════════════════════
echo.
echo    Frontend: http://localhost:5177
echo    Backend:  https://noren-iqk3.onrender.com
echo.
echo    LOGIN CREDENTIALS:
echo    Email: admin@norenfashion.in
echo    Password: (Check backend\.env ADMIN_PASSWORD)
echo.
echo    Press Ctrl+C to stop
echo ════════════════════════════════════════════════════════════
echo.

cd ..\email-portal
call npm run dev

pause
