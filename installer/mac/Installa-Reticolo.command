#!/bin/bash
# Reticolo - installer per macOS: scegli Illustrator, Photoshop, InDesign e Figma, e fa tutto da solo.
# Doppio clic per avviarlo. Se macOS lo blocca: tasto destro > Apri, oppure:
#   xattr -dr com.apple.quarantine "$(dirname "$0")"
cd "$(dirname "$0")" || exit 1
HERE="$(pwd)"
PAY="$HERE/payload"
VERSION_LABEL="Reticolo"

if [ ! -d "$PAY/adobe" ]; then
  osascript -e 'display dialog "Non trovo la cartella payload accanto a questo file. Estrai tutto lo zip e riprova." buttons {"OK"} default button 1 with icon stop' >/dev/null
  exit 1
fi

CHOICE=$(osascript <<'APPLESCRIPT'
set opts to {"Illustrator", "Photoshop", "InDesign", "Figma"}
set picked to choose from list opts with title "Reticolo" with prompt "Scegli dove installare Reticolo (selezione multipla con Cmd o Maiusc):" default items opts with multiple selections allowed
if picked is false then return "CANCEL"
set AppleScript's text item delimiters to ","
return picked as text
APPLESCRIPT
)

if [ -z "$CHOICE" ] || [ "$CHOICE" = "CANCEL" ]; then
  echo "Installazione annullata."
  exit 0
fi

has() { case ",$CHOICE," in *",$1,"*) return 0;; *) return 1;; esac; }
AI=0; PS=0; ID=0; FIG=0
has Illustrator && AI=1
has Photoshop && PS=1
has InDesign && ID=1
has Figma && FIG=1

LOG=""
if [ $((AI + PS + ID)) -gt 0 ]; then
  EXT="$HOME/Library/Application Support/Adobe/CEP/extensions/com.reticolo.grid"
  rm -rf "$EXT"
  mkdir -p "$EXT"
  cp -R "$PAY/adobe/." "$EXT/"
  mkdir -p "$EXT/CSXS"
  cp "$PAY/manifests/m_${AI}${PS}${ID}.xml" "$EXT/CSXS/manifest.xml"
  # le estensioni non firmate richiedono PlayerDebugMode (CEP 9-13)
  for v in 9 10 11 12 13; do
    defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1
  done
  killall cfprefsd >/dev/null 2>&1
  LOG="$LOG\nAdobe: estensione installata in\n$EXT"
fi

if [ $FIG -eq 1 ]; then
  FDIR="$HOME/Library/Application Support/Reticolo/figma-plugin"
  mkdir -p "$FDIR"
  cp "$PAY/figma/manifest.json" "$PAY/figma/code.js" "$PAY/figma/ui.html" "$FDIR/"
  printf "%s" "$FDIR/manifest.json" | pbcopy
  LOG="$LOG\nFigma: plugin copiato in\n$FDIR"
fi

echo -e "Fatto.$LOG"

MSG="Installazione completata."
if [ $((AI + PS + ID)) -gt 0 ]; then
  MSG="$MSG\n\nChiudi e riapri le app Adobe, poi apri il pannello da Finestra > Estensioni > Reticolo (Photoshop: Estensioni (legacy))."
fi
if [ $FIG -eq 1 ]; then
  MSG="$MSG

FIGMA, da fare UNA volta sola. Il percorso del manifest e' negli appunti.
Nell'app Figma per desktop, con un file Design aperto:
1. Menu Figma (icona in alto a sinistra) > Plugins > Development > Import plugin from manifest...
2. Nella finestra premi Cmd+Maiusc+G, incolla con Cmd+V, premi Invio e poi Apri
3. Avvia da Plugins > Development > Reticolo

Reticolo non e' nel menu normale dei plugin: sta solo sotto Plugins > Development."
  open -a Figma >/dev/null 2>&1 || open "figma://" >/dev/null 2>&1
fi
osascript -e "display dialog \"$(printf "%b" "$MSG" | sed 's/"/\\"/g')\" buttons {\"OK\"} default button 1 with title \"Reticolo\"" >/dev/null 2>&1
