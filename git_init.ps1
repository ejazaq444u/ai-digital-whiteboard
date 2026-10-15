$git = Join-Path $env:LOCALAPPDATA "Programs\Git\cmd\git.exe"

Write-Host "Initializing Git repository..."
& $git init

& $git config user.name "ejazaq444u"
& $git config user.email "ejazaq444u@users.noreply.github.com"

& $git branch -M main

try {
    & $git remote remove origin 2>&1 | Out-Null
} catch {}

& $git remote add origin "https://github.com/ejazaq444u/ai-digital-whiteboard.git"

Write-Host "Staging files..."
& $git add .

Write-Host "Creating initial commit..."
& $git commit -m "Initial commit: AI Digital Whiteboard for Online Math & English Teaching"

Write-Host "Git status:"
& $git status
