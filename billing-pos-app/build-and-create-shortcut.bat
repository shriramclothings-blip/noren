@echo off
cd /d "%~dp0"
set "NODE_OPTIONS=--max-old-space-size=12288 --max-semi-space-size=256"
echo Building Electron app...
call npm run electron:build
if errorlevel 1 (
  echo.
  echo Build failed. Please check the error above.
  pause
  exit /b 1
)
echo.
echo Build completed successfully.
pause

