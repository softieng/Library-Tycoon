@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo Node.js is required to verify the patch and backup. Nothing changed.
 pause
 exit /b 1
)
node "%~dp0apply_local.cjs" %*
set "code=%errorlevel%"
pause
exit /b %code%
