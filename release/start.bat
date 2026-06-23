@echo off
title Eye Clinic Pro - Server

:: Luôn chạy trong thư mục chứa file start.bat (tránh lỗi System32)
cd /d "%~dp0"

echo.
echo ========================================
echo   Eye Clinic Pro - Starting Server...
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Khong tim thay Node.js. Hay cai Node.js truoc: https://nodejs.org
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Cai dat dependencies that bai. Thu chay lai start.bat voi quyen Administrator.
        pause
        exit /b 1
    )
    echo.
)

:: Start server
echo Starting Eye Clinic Server...
echo.
echo Access the app at: http://localhost:3001
echo.
node sync-server.cjs

pause
