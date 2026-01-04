@echo off
title Eye Clinic Pro - Server
echo.
echo ========================================
echo   Eye Clinic Pro - Starting Server...
echo ========================================
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

:: Start server
echo Starting Eye Clinic Server...
echo.
echo Access the app at: http://localhost:3001
echo.
node sync-server.cjs

pause
