@echo off
title NOREN Email Portal - Stop Frontend
color 0C

echo ============================================
echo    NOREN Email Portal - Stop Frontend
echo ============================================
echo.

echo [STOPPING] Killing Node.js processes (frontend only)...
echo.

REM Kill all Node.js processes
taskkill /F /IM node.exe /T 2>nul

if errorlevel 1 (
    echo [INFO] No Node.js processes were running.
) else (
    echo [SUCCESS] All Node.js processes stopped!
)

echo.
echo ============================================
echo        Frontend Stopped
echo ============================================
echo.
echo Email Portal (Port 5177): STOPPED
echo Backend (Online):          STILL RUNNING
echo.
echo Note: Using online backend at:
echo https://noren-iqk3.onrender.com
echo.
pause