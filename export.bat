@echo off
setlocal enabledelayedexpansion

:: Get the current folder name dynamically
for %%I in (.) do set "FolderName=%%~nxI"
set "ZipFile=%FolderName%_export.zip"

echo ===================================================
echo   Project Exporter: Zipping %FolderName%
echo ===================================================
echo.
echo Destination: %ZipFile%
echo Excluding build folders, node_modules, cache files, and local settings...
echo.

:: Delete existing zip file if it exists so we start fresh
if exist "%ZipFile%" (
    echo Existing "%ZipFile%" found, deleting it first...
    del "%ZipFile%"
)

:: Run tar.exe to create the zip file with exclusions.
:: Using a single command line to avoid line-continuation parsing issues.
tar -a -c -f "%ZipFile%" --exclude="node_modules" --exclude=".git" --exclude="build" --exclude=".gradle" --exclude="Pods" --exclude=".bundle" --exclude=".cxx" --exclude=".kotlin" --exclude=".settings" --exclude=".idea" --exclude="local.properties" --exclude="*.zip" *

if %ERRORLEVEL% equ 0 (
    echo.
    echo ===================================================
    echo   SUCCESS: Project successfully exported!
    echo   File: %ZipFile%
    echo ===================================================
) else (
    echo.
    echo ===================================================
    echo   ERROR: Export failed with error code %ERRORLEVEL%.
    echo ===================================================
)

pause
