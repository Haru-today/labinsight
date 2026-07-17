@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "APP_DIR=%SCRIPT_DIR%LabInsight"

if not exist "%APP_DIR%" set "APP_DIR=%SCRIPT_DIR%"

cd /d "%APP_DIR%"

where node >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:8000"
  node server.js
) else (
  start "" "index.html"
)
