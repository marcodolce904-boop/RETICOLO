@echo off
setlocal
set "SRC=%~dp0"
set "DEST=%APPDATA%\Adobe\CEP\extensions\com.reticolo.grid"

echo.
echo  Reticolo - installazione per Illustrator, Photoshop e InDesign
echo  Cartella: %DEST%
echo.

if exist "%DEST%" rmdir /s /q "%DEST%"
mkdir "%DEST%"
robocopy "%SRC%." "%DEST%" /E /NFL /NDL /NJH /NJS /XD tests tools figma .git .github node_modules /XF install-windows.bat uninstall-windows.bat package.json *.md .gitignore .gitattributes >nul
if errorlevel 8 (
  echo  ERRORE: copia dei file non riuscita.
  pause
  exit /b 1
)

rem Le estensioni non firmate richiedono PlayerDebugMode (CEP 9-13 = CC 2019 - 2026)
for %%V in (9 10 11 12 13) do reg add "HKCU\Software\Adobe\CSXS.%%V" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul

echo  Fatto.
echo  1. Chiudi e riapri Illustrator, Photoshop o InDesign.
echo  2. Illustrator / InDesign: Finestra ^> Estensioni ^> Reticolo
echo     Photoshop: Finestra ^> Estensioni (legacy) ^> Reticolo
echo.
pause
