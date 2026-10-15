@echo off
title Push Whiteboard to GitHub
echo ================================================================
echo       PUSHING AI DIGITAL WHITEBOARD TO GITHUB
echo ================================================================
echo.
echo Target Repository: https://github.com/ejazaq444u/ai-digital-whiteboard.git
echo.

set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"

git push -u origin main

echo.
echo ================================================================
if %ERRORLEVEL% equ 0 (
    echo SUCCESS! Your code is now uploaded to your GitHub repository!
) else (
    echo.
    echo If authentication failed, you can push using a GitHub Personal Access Token:
    echo 1. Go to: https://github.com/settings/tokens
    echo 2. Click "Generate new token (classic)" -> check "repo" -> Generate.
    echo 3. Run: git remote set-url origin https://YOUR_TOKEN@github.com/ejazaq444u/ai-digital-whiteboard.git
    echo 4. Then double-click this file again!
)
echo ================================================================
pause
