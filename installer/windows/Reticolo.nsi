; Reticolo - installer per Windows (NSIS). Si costruisce con: node tools/build-installers.js
; Installa per l'utente corrente, senza permessi di amministratore.
Unicode true
!ifndef VERSION
  !define VERSION "2.0.0"
!endif
!define APP "Reticolo"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Reticolo"

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "Sections.nsh"
!include "FileFunc.nsh"

Name "${APP} ${VERSION}"
OutFile "..\..\dist\Reticolo-Setup-${VERSION}.exe"
InstallDir "$APPDATA\Reticolo"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "Reticolo ${VERSION} beta"

VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "Reticolo"
VIAddVersionKey "FileDescription" "Installer di Reticolo: Illustrator, Photoshop, InDesign e Figma"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "Marco Dolce"

!define MUI_ICON "reticolo.ico"
!define MUI_UNICON "reticolo.ico"
!define MUI_ABORTWARNING
!define MUI_COMPONENTSPAGE_SMALLDESC

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\..\LICENSE"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Italian"
!insertmacro MUI_LANGUAGE "English"

LangString NAME_AI ${LANG_ITALIAN} "Adobe Illustrator"
LangString NAME_AI ${LANG_ENGLISH} "Adobe Illustrator"
LangString NAME_PS ${LANG_ITALIAN} "Adobe Photoshop"
LangString NAME_PS ${LANG_ENGLISH} "Adobe Photoshop"
LangString NAME_ID ${LANG_ITALIAN} "Adobe InDesign"
LangString NAME_ID ${LANG_ENGLISH} "Adobe InDesign"
LangString NAME_FIG ${LANG_ITALIAN} "Plugin per Figma"
LangString NAME_FIG ${LANG_ENGLISH} "Figma plugin"
LangString DESC_AI ${LANG_ITALIAN} "Pannello Reticolo in Illustrator (CC 2018 o successivo). Finestra > Estensioni > Reticolo."
LangString DESC_AI ${LANG_ENGLISH} "Reticolo panel in Illustrator (CC 2018 or later). Window > Extensions > Reticolo."
LangString DESC_PS ${LANG_ITALIAN} "Pannello Reticolo in Photoshop (2021 o successivo). Finestra > Estensioni (legacy) > Reticolo."
LangString DESC_PS ${LANG_ENGLISH} "Reticolo panel in Photoshop (2021 or later). Window > Extensions (legacy) > Reticolo."
LangString DESC_ID ${LANG_ITALIAN} "Pannello Reticolo in InDesign (2021 o successivo). Finestra > Estensioni > Reticolo."
LangString DESC_ID ${LANG_ENGLISH} "Reticolo panel in InDesign (2021 or later). Window > Extensions > Reticolo."
LangString DESC_FIG ${LANG_ITALIAN} "Copia il plugin in una cartella fissa e prepara l'importazione in Figma (un solo passaggio, la prima volta)."
LangString DESC_FIG ${LANG_ENGLISH} "Copies the plugin to a fixed folder and prepares the import in Figma (one step, the first time)."
LangString MSG_FIGMA ${LANG_ITALIAN} "Plugin Figma copiato. Il percorso del manifest e' negli appunti.$\r$\n$\r$\nIn Figma (app desktop, file Design aperto), solo la prima volta:$\r$\n1. Plugins > Development > Import plugin from manifest...$\r$\n2. Incolla con Ctrl+V e premi Invio$\r$\n3. Avvia: Plugins > Development > Reticolo"
LangString MSG_FIGMA ${LANG_ENGLISH} "Figma plugin copied. The manifest path is on your clipboard.$\r$\n$\r$\nIn Figma (desktop app, a Design file open), the first time only:$\r$\n1. Plugins > Development > Import plugin from manifest...$\r$\n2. Paste with Ctrl+V and press Enter$\r$\n3. Run: Plugins > Development > Reticolo"
LangString MSG_ADOBE ${LANG_ITALIAN} "Chiudi e riapri le app Adobe, poi apri il pannello da Finestra > Estensioni > Reticolo (Photoshop: Estensioni (legacy))."
LangString MSG_ADOBE ${LANG_ENGLISH} "Close and reopen the Adobe apps, then open the panel from Window > Extensions > Reticolo (Photoshop: Extensions (legacy))."

Var EXT
Var FLAGS
Var FA
Var FP
Var FI

Section "$(NAME_AI)" SecAI
SectionEnd

Section "$(NAME_PS)" SecPS
SectionEnd

Section "$(NAME_ID)" SecID
SectionEnd

Section "$(NAME_FIG)" SecFig
  SetOutPath "$INSTDIR\figma-plugin"
  File "..\stage\figma\manifest.json"
  File "..\stage\figma\code.js"
  File "..\stage\figma\ui.html"
  ; percorso del manifest negli appunti, senza a capo finale
  FileOpen $0 "$INSTDIR\figma-plugin\percorso.txt" w
  FileWrite $0 "$INSTDIR\figma-plugin\manifest.json"
  FileClose $0
  nsExec::Exec 'cmd /c clip < "$INSTDIR\figma-plugin\percorso.txt"'
  Pop $0
  Delete "$INSTDIR\figma-plugin\percorso.txt"
SectionEnd

; Estensione Adobe: una sola cartella per tutte le app scelte, con un manifest che elenca soltanto quelle
Section "-Adobe" SecAdobe
  StrCpy $FA "0"
  StrCpy $FP "0"
  StrCpy $FI "0"
  SectionGetFlags ${SecAI} $0
  IntOp $0 $0 & ${SF_SELECTED}
  ${If} $0 != 0
    StrCpy $FA "1"
  ${EndIf}
  SectionGetFlags ${SecPS} $0
  IntOp $0 $0 & ${SF_SELECTED}
  ${If} $0 != 0
    StrCpy $FP "1"
  ${EndIf}
  SectionGetFlags ${SecID} $0
  IntOp $0 $0 & ${SF_SELECTED}
  ${If} $0 != 0
    StrCpy $FI "1"
  ${EndIf}
  StrCpy $FLAGS "$FA$FP$FI"

  ${If} $FLAGS != "000"
    StrCpy $EXT "$APPDATA\Adobe\CEP\extensions\com.reticolo.grid"
    RMDir /r "$EXT"
    SetOutPath "$EXT"
    File /r "..\stage\adobe\*.*"
    SetOutPath "$EXT\CSXS"
    ${If} $FLAGS == "100"
      File "/oname=manifest.xml" "..\stage\manifests\m_100.xml"
    ${ElseIf} $FLAGS == "010"
      File "/oname=manifest.xml" "..\stage\manifests\m_010.xml"
    ${ElseIf} $FLAGS == "001"
      File "/oname=manifest.xml" "..\stage\manifests\m_001.xml"
    ${ElseIf} $FLAGS == "110"
      File "/oname=manifest.xml" "..\stage\manifests\m_110.xml"
    ${ElseIf} $FLAGS == "101"
      File "/oname=manifest.xml" "..\stage\manifests\m_101.xml"
    ${ElseIf} $FLAGS == "011"
      File "/oname=manifest.xml" "..\stage\manifests\m_011.xml"
    ${Else}
      File "/oname=manifest.xml" "..\stage\manifests\m_111.xml"
    ${EndIf}
    ; le estensioni non firmate richiedono PlayerDebugMode (CEP 9-13 = CC 2019 - 2026)
    WriteRegStr HKCU "Software\Adobe\CSXS.9" "PlayerDebugMode" "1"
    WriteRegStr HKCU "Software\Adobe\CSXS.10" "PlayerDebugMode" "1"
    WriteRegStr HKCU "Software\Adobe\CSXS.11" "PlayerDebugMode" "1"
    WriteRegStr HKCU "Software\Adobe\CSXS.12" "PlayerDebugMode" "1"
    WriteRegStr HKCU "Software\Adobe\CSXS.13" "PlayerDebugMode" "1"
  ${EndIf}
SectionEnd

; Disinstallatore e voce in "App e funzionalita'"
Section "-Uninstall entry" SecUn
  SetOutPath "$INSTDIR"
  WriteUninstaller "$INSTDIR\Disinstalla-Reticolo.exe"
  WriteRegStr HKCU "${UNKEY}" "DisplayName" "Reticolo"
  WriteRegStr HKCU "${UNKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNKEY}" "Publisher" "Marco Dolce"
  WriteRegStr HKCU "${UNKEY}" "DisplayIcon" "$INSTDIR\Disinstalla-Reticolo.exe"
  WriteRegStr HKCU "${UNKEY}" "UninstallString" '"$INSTDIR\Disinstalla-Reticolo.exe"'
  WriteRegDWORD HKCU "${UNKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNKEY}" "NoRepair" 1
SectionEnd

; Contiene $R2 (cerca) la stringa $R1? Risultato 1 o 0 in cima allo stack. StrCmp non distingue maiuscole.
Function StrHas
  Exch $R1
  Exch
  Exch $R2
  Push $R3
  Push $R4
  Push $R5
  StrLen $R3 $R1
  StrCpy $R4 0
  loop:
    StrCpy $R5 $R2 $R3 $R4
    StrCmp $R5 $R1 yes
    StrCmp $R5 "" no
    IntOp $R4 $R4 + 1
    Goto loop
  yes:
    StrCpy $R1 "1"
    Goto out
  no:
    StrCpy $R1 "0"
  out:
  Pop $R5
  Pop $R4
  Pop $R3
  Pop $R2
  Exch $R1
FunctionEnd

; Installazione da riga di comando: Reticolo-Setup.exe /S /COMPONENTS=illustrator,photoshop,indesign,figma
Function .onInit
  ${GetParameters} $R0
  ${GetOptions} $R0 "/COMPONENTS=" $R1
  ${IfNot} ${Errors}
    !insertmacro UnselectSection ${SecAI}
    !insertmacro UnselectSection ${SecPS}
    !insertmacro UnselectSection ${SecID}
    !insertmacro UnselectSection ${SecFig}
    Push $R1
    Push "illustrator"
    Call StrHas
    Pop $R2
    ${If} $R2 == "1"
      !insertmacro SelectSection ${SecAI}
    ${EndIf}
    Push $R1
    Push "photoshop"
    Call StrHas
    Pop $R2
    ${If} $R2 == "1"
      !insertmacro SelectSection ${SecPS}
    ${EndIf}
    Push $R1
    Push "indesign"
    Call StrHas
    Pop $R2
    ${If} $R2 == "1"
      !insertmacro SelectSection ${SecID}
    ${EndIf}
    Push $R1
    Push "figma"
    Call StrHas
    Pop $R2
    ${If} $R2 == "1"
      !insertmacro SelectSection ${SecFig}
    ${EndIf}
  ${EndIf}
FunctionEnd

Function .onInstSuccess
  IfSilent done
  ${If} $FLAGS != "000"
    MessageBox MB_OK|MB_ICONINFORMATION "$(MSG_ADOBE)"
  ${EndIf}
  SectionGetFlags ${SecFig} $0
  IntOp $0 $0 & ${SF_SELECTED}
  ${If} $0 != 0
    ExecShell "open" "figma://"
    MessageBox MB_OK|MB_ICONINFORMATION "$(MSG_FIGMA)"
  ${EndIf}
  done:
FunctionEnd

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecAI} "$(DESC_AI)"
  !insertmacro MUI_DESCRIPTION_TEXT ${SecPS} "$(DESC_PS)"
  !insertmacro MUI_DESCRIPTION_TEXT ${SecID} "$(DESC_ID)"
  !insertmacro MUI_DESCRIPTION_TEXT ${SecFig} "$(DESC_FIG)"
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; ---------------------------------------------------------------- disinstallazione
Section "Uninstall"
  RMDir /r "$APPDATA\Adobe\CEP\extensions\com.reticolo.grid"
  RMDir /r "$INSTDIR\figma-plugin"
  Delete "$INSTDIR\Disinstalla-Reticolo.exe"
  ; libreria e impostazioni ($INSTDIR\library.json, settings.json) restano: sono le griglie dell'utente
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "${UNKEY}"
  IfSilent +2
  MessageBox MB_OK "Reticolo e' stato rimosso. La libreria di griglie in $INSTDIR e' stata conservata."
SectionEnd
