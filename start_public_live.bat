@echo off
title AI Digital Whiteboard - Live Online Classroom
echo ================================================================
echo        AI DIGITAL WHITEBOARD - LIVE ONLINE CLASSROOM
echo ================================================================
echo.
echo Starting the AI Digital Whiteboard server on port 5000...
echo.

REM Check if server build exists
if not exist "%~dp0server\dist\index.js" (
    echo Building project for first time...
    call npm run build
)

REM Start server in a background window
start "Whiteboard Server" /B node "%~dp0server\dist\index.js"

echo Waiting for server to initialize...
timeout /t 3 /nobreak > nul

echo.
echo ================================================================
echo Creating Free Public Live Tunnel (No account needed)...
echo ================================================================
echo.
echo Your students can access the whiteboard from anywhere in the world!
echo Keep this window open while teaching.
echo.

:tunnel_loop
echo Connecting to live tunnel...
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=20 -o ServerAliveCountMax=5 -R 80:localhost:5000 nokey@localhost.run

echo Tunnel disconnected. Reconnecting in 5 seconds (Press Ctrl+C to stop)...
timeout /t 5 /nobreak > nul
goto tunnel_loop
