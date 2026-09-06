@echo off
setlocal
title Word Spark - Local Writing Tool
cd /d "%~dp0"

if not exist node_modules (
  echo [First run] Installing dependencies, please wait 1-2 minutes...
  call npm install
  if errorlevel 1 (
    echo [Error] npm install failed. Make sure Node.js is installed.
    pause
    exit /b 1
  )
)

echo.
echo  Word Spark is starting...
echo  Address: http://localhost:5173
echo  The browser will open automatically in a few seconds.
echo  Keep this window open while using. Close it to stop the server.
echo.

start "" /min cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:5173"

call npm run dev

echo.
echo Server stopped.
pause
