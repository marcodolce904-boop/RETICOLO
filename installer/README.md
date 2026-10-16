# Installer di Reticolo

> Guida passo passo per l'utente: [`docs/INSTALLAZIONE.md`](../docs/INSTALLAZIONE.md).

Un solo installer per scegliere dove mettere Reticolo: **Illustrator, Photoshop, InDesign e Figma**, anche tutti insieme.

| Sistema | File | Cosa fa |
|---|---|---|
| Windows | `Reticolo-Setup-<versione>.exe` | Finestra con le caselle da spuntare (italiano e inglese). Installa per l'utente corrente, senza permessi di amministratore. Aggiunge la voce in *App e funzionalità* e un disinstallatore che conserva la libreria di griglie. |
| macOS | `Reticolo-Mac-<versione>.zip` | Estrai e doppio clic su `Installa-Reticolo.command`: una finestra di macOS chiede quali app, con selezione multipla. |

**Adobe.** Una sola estensione per tutte le app: il programma scrive un `manifest.xml` che elenca soltanto le app scelte (per esempio solo Photoshop) e attiva `PlayerDebugMode`, necessario per le estensioni non firmate.

**Figma.** Figma non permette a nessun programma di importare un plugin in sviluppo: l'installer copia il plugin in una cartella fissa, mette il percorso del manifest negli appunti e apre Figma. Resta un passaggio, la prima volta: *Plugins > Development > Import plugin from manifest...*, incolla e Invio. Per l'installazione con un clic serve la Figma Community (vedi `figma/publish/`).

## Installazione silenziosa (Windows)
```
Reticolo-Setup-2.0.2.exe /S /COMPONENTS=illustrator,photoshop,indesign,figma
```
Senza `/COMPONENTS` si installa tutto.

## Come si costruiscono
```
node tools/build-installers.js
```
Prepara `installer/stage/` e scrive in `dist/` l'`.exe` (serve `makensis`: `apt install nsis`, oppure NSIS per Windows) e lo `.zip` per macOS (serve `zip`). `dist/` non è nel repository: i file finiti vanno caricati nelle Releases di GitHub.

## Cosa è stato provato
- Windows: l'`.exe` è stato eseguito in modo silenzioso con Wine (Linux), con diverse combinazioni di componenti: i file finiscono nelle cartelle giuste, il manifest elenca solo le app scelte, il registro è scritto e il disinstallatore rimuove tutto lasciando la libreria. La finestra con le caselle e il testo dei messaggi **non sono stati visti** su un Windows vero.
- macOS: lo script è stato provato su Linux con comandi `osascript`, `defaults`, `pbcopy` e `open` simulati. Non è stato eseguito su un Mac.
- Nessuno dei due è firmato. Windows SmartScreen e macOS Gatekeeper mostreranno un avviso ("autore sconosciuto"): su Windows *Ulteriori informazioni > Esegui comunque*, su Mac tasto destro > Apri.
