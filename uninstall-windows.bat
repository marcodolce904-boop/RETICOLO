@echo off
set "DEST=%APPDATA%\Adobe\CEP\extensions\com.reticolo.grid"
if exist "%DEST%" rmdir /s /q "%DEST%"
echo Reticolo rimosso. La libreria resta in %APPDATA%\Reticolo\library.json
pause
