@echo off
cd /d "%~dp0"
where py >nul 2>&1
if %ERRORLEVEL%==0 (
  py -3 -u "%~dp0scripts\stop_visual_center.py"
) else (
  python -u "%~dp0scripts\stop_visual_center.py"
)
echo.
pause