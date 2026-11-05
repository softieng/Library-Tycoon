@echo off
setlocal
cd /d "%~dp0"
node "%~dp0restore_local.cjs"
set "code=%errorlevel%"
pause
exit /b %code%
