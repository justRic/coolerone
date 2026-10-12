@echo off
where node >nul 2>&1
if errorlevel 1 (
  echo Install Node.js from https://nodejs.org then run serve.cmd again
  pause
  exit /b 1
)
echo Starting MK8 Web with romfs proxy...
node "%~dp0serve.mjs" %1
pause
