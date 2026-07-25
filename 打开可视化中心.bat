@echo off
cd /d "%~dp0"
title AI Skills Visual Center
set "VISUAL_CENTER_FROM_BAT=1"
set "PYTHONUNBUFFERED=1"
set "PYTHONIOENCODING=utf-8"

echo.
echo   AI Skills Visual Center
echo   --------------------------------
echo   Starting local server...
echo   Keep this window open.
echo   Stop: Ctrl+C
echo.

where py >nul 2>&1
if %ERRORLEVEL%==0 (
  py -3 -u "%~dp0scripts\start_visual_center.py"
  goto :after
)

where python >nul 2>&1
if %ERRORLEVEL%==0 (
  python -u "%~dp0scripts\start_visual_center.py"
  goto :after
)

echo   [ERROR] Python not found.
echo   Install Python 3 and check "Add python.exe to PATH".
echo   https://www.python.org/downloads/
echo.
pause
exit /b 1

:after
if errorlevel 1 (
  echo.
  echo   Start failed. See messages above.
  echo.
  pause
)