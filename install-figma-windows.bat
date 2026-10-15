@echo off
setlocal
rem Reticolo per Figma: copia il plugin in una cartella fissa, ne copia il percorso negli appunti e apre Figma.
rem Funziona dal repository (cartella figma\) e dallo zip del plugin (file nella stessa cartella).
set "SRC=%~dp0"
if exist "%~dp0figma\manifest.json" set "SRC=%~dp0figma\"
set "DEST=%APPDATA%\Reticolo\figma-plugin"

echo.
echo  Reticolo - installazione per Figma
echo  Cartella del plugin: %DEST%
echo.

if not exist "%SRC%manifest.json" (
  echo  ERRORE: non trovo manifest.json accanto a questo file.
  pause
  exit /b 1
)

if not exist "%DEST%" mkdir "%DEST%"
copy /Y "%SRC%manifest.json" "%DEST%\" >nul && copy /Y "%SRC%code.js" "%DEST%\" >nul && copy /Y "%SRC%ui.html" "%DEST%\" >nul
if errorlevel 1 (
  echo  ERRORE: copia dei file non riuscita.
  pause
  exit /b 1
)

rem Percorso del manifest negli appunti, senza a capo finale: nella finestra di Figma basta incollare con Ctrl+V
<nul set /p "=%DEST%\manifest.json" | clip

rem Prova ad aprire Figma per desktop (se non parte, aprilo a mano)
start "" "figma://" >nul 2>&1

echo  Fatto: i file sono copiati e il percorso del manifest e' negli appunti.
echo.
echo  SOLO LA PRIMA VOLTA, in Figma (app desktop, file Design aperto):
echo    1. Plugins ^> Development ^> Import plugin from manifest...
echo    2. Incolla il percorso con Ctrl+V e premi Invio
echo    3. Poi avvia: Plugins ^> Development ^> Reticolo
echo.
echo  Dalla seconda volta Reticolo e' gia' nel menu Plugins ^> Development.
echo  Per aggiornarlo basta rilanciare questo file: Figma usa i nuovi file
echo  al successivo avvio del plugin, senza reimportare.
echo.
pause
