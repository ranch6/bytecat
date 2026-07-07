@echo off
rem BYTECAT launcher for Windows — double-click me.
cd /d "%~dp0"

where pythonw >nul 2>nul && (start "" pythonw bytecat.py & exit /b 0)
where python  >nul 2>nul && (start "" python  bytecat.py & exit /b 0)
where py      >nul 2>nul && (start "" py -3   bytecat.py & exit /b 0)

echo BYTECAT needs Python 3. Get it from https://www.python.org/downloads/
echo (tick "Add python.exe to PATH" during install), then double-click me again.
pause
