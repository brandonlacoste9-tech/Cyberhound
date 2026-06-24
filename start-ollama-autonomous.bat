@echo off
:: One-click launcher for CyberHound with Ollama (double-click me)
:: Supports parameters: -Model qwen2.5:14b   -Mode task-runner   -Test

setlocal
cd /d "%~dp0"

echo Starting CyberHound Ollama Autonomous Launcher...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-ollama-autonomous.ps1" %*

echo.
pause
endlocal