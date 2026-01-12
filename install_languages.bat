@echo off
echo ========================================================
echo   Nyaya Sahayak - Language Pack Installer
echo ========================================================

:: Check for permissions
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"

if '%errorlevel%' NEQ '0' (
    echo.
    echo Requesting administrative privileges...
    echo Please click "Yes" on the Windows prompt to continue.
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    CD /D "%~dp0"
    
    echo.
    echo [1/3] Installing Bengali (bn-IN)...
    powershell -Command "Install-Language -Language bn-IN"
    
    echo.
    echo [2/3] Installing Telugu (te-IN)...
    powershell -Command "Install-Language -Language te-IN"
    
    echo.
    echo [3/3] Installing Marathi (mr-IN)...
    powershell -Command "Install-Language -Language mr-IN"
    
    echo.
    echo ========================================================
    echo   Installation Complete!
    echo   Please RESTART your browser/computer for changes to apply.
    echo ========================================================
    pause
