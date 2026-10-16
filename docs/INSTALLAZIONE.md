# Installazione di Reticolo

Reticolo funziona in **Illustrator, Photoshop, InDesign** (estensione) e in **Figma** (plugin). Per installarlo c'è un solo programma: l'installer. English version below.

## 1. Scarica l'installer

Nella cartella [`downloads/`](../downloads/) del repository:

| Sistema | File |
|---|---|
| Windows | `Reticolo-Setup-2.0.2.exe` (se il browser lo blocca: `Reticolo-Setup-2.0.2-windows.zip`, estrailo e dentro c'è l'`.exe`) |
| macOS | `Reticolo-Mac-2.0.2.zip` |

Su GitHub apri il file e premi **Download raw file**.

## 2. Windows

1. Doppio clic su `Reticolo-Setup-2.0.2.exe`.
2. Se compare **"Windows ha protetto il PC"** (l'installer non è firmato): premi **Ulteriori informazioni**, poi **Esegui comunque**.
3. Scegli la lingua, accetta la licenza e premi **Avanti**.
4. Nella pagina dei componenti **spunta le caselle che ti servono**: Adobe Illustrator, Adobe Photoshop, Adobe InDesign, Plugin per Figma. Puoi sceglierne quante vuoi.
5. Premi **Installa** e attendi la fine. Compaiono uno o due messaggi con i passi successivi (qui sotto).

Per installare senza finestre: `Reticolo-Setup-2.0.2.exe /S /COMPONENTS=illustrator,photoshop,indesign,figma`.

## 3. macOS

1. Estrai `Reticolo-Mac-2.0.2.zip` (doppio clic). Non spostare `Installa-Reticolo.command` fuori dalla cartella: la cartella `payload` deve restargli accanto.
2. **Tasto destro** su `Installa-Reticolo.command`, poi **Apri**, poi **Apri** di nuovo (macOS avvisa perché lo script non è firmato).
3. Nella finestra scegli le app (tieni premuto **Cmd** per sceglierne più di una) e premi **OK**.
4. Compare un messaggio con i passi successivi (qui sotto).

## 4. Dopo l'installazione: Illustrator, Photoshop, InDesign

1. **Chiudi del tutto** l'app Adobe e riaprila.
2. Apri il pannello:
   - Illustrator e InDesign: menu **Finestra > Estensioni > Reticolo**
   - Photoshop: menu **Finestra > Estensioni (legacy) > Reticolo**
3. Apri un documento e usa il pulsante **Genera griglia**.

Se il pannello non compare, controlla di aver spuntato quell'app nell'installer e che la versione sia supportata (Illustrator CC 2018+, Photoshop 2021+, InDesign 2021+).

## 5. Dopo l'installazione: Figma (da fare una volta sola)

L'installer copia il plugin in una cartella fissa e mette il percorso negli appunti. Figma però non permette ai programmi di importare un plugin in sviluppo: l'importazione la fai tu, **una sola volta**.

Ti serve: l'**app Figma per desktop** (nel browser non funziona) e **un file Design aperto** (non FigJam).

1. In Figma apri il menu principale (l'**icona di Figma in alto a sinistra**).
2. Vai su **Plugins > Development > Import plugin from manifest...**
   Scorciatoia: premi **Ctrl+/** (Cmd+/ su Mac), scrivi `Import plugin from manifest` e premi Invio.
3. Si apre la finestra per scegliere un file. **Incolla il percorso con Ctrl+V** (Cmd+V su Mac) e premi Invio.
   - Windows: `C:\Users\<tuo nome>\AppData\Roaming\Reticolo\figma-plugin\manifest.json`
   - Mac: premi **Cmd+Maiusc+G**, incolla il percorso e premi Invio, poi **Apri**. Il percorso è `~/Library/Application Support/Reticolo/figma-plugin/manifest.json`
   - Se gli appunti sono vuoti, scrivilo a mano come sopra.
4. Figma conferma l'importazione. Per avviare Reticolo: **Plugins > Development > Reticolo** (oppure **Ctrl+/** e scrivi `Reticolo`).
5. Nel pannello: crea un frame (tasto **F** e trascina), scegli **Comp > Web > Responsive bento** e premi **Genera griglia**.

Dalla seconda volta Reticolo è già nel menu **Plugins > Development**: non devi importarlo di nuovo. Per aggiornarlo basta rilanciare l'installer.

**Se in Figma non trovi Reticolo:** non appare nel menu normale dei plugin, ma solo sotto **Plugins > Development**, e solo dopo l'importazione (punto 3). Se Figma dà un errore sull'`id`, crea un plugin vuoto con **Plugins > Development > New plugin**, copia l'id che ti assegna e incollalo in `manifest.json`. Se il pannello resta vuoto, apri **Plugins > Development > Open console** e leggi l'errore.

## 6. Disinstallare

- Windows: **Impostazioni > App > Reticolo > Disinstalla**. La libreria di griglie (`%APPDATA%\Reticolo\library.json`) resta.
- Figma: **Plugins > Development > Manage plugins in development**, menu **...** di Reticolo, **Remove**.
- Mac: elimina la cartella `~/Library/Application Support/Adobe/CEP/extensions/com.reticolo.grid` e `~/Library/Application Support/Reticolo/figma-plugin`.

---

# Installing Reticolo (English)

Reticolo works in **Illustrator, Photoshop, InDesign** (extension) and **Figma** (plugin), installed by a single program.

1. **Download** from the [`downloads/`](../downloads/) folder: `Reticolo-Setup-2.0.2.exe` (Windows; or the `-windows.zip` if your browser blocks `.exe`) or `Reticolo-Mac-2.0.2.zip` (macOS).
2. **Windows:** double-click the `.exe`. If "Windows protected your PC" appears (the installer is not signed), click **More info > Run anyway**. Tick the apps you want (Illustrator, Photoshop, InDesign, Figma plugin) and click **Install**.
   **macOS:** unzip, right-click `Installa-Reticolo.command` > **Open** > **Open**, choose the apps (hold **Cmd** to pick several).
3. **Adobe apps:** quit and reopen the app, then open **Window > Extensions > Reticolo** (Photoshop: **Extensions (legacy)**).
4. **Figma, once only** (desktop app, a Design file open):
   1. Main menu (Figma icon, top left) > **Plugins > Development > Import plugin from manifest...** (shortcut: **Ctrl/Cmd+/**, type `Import plugin from manifest`).
   2. In the file dialog paste the path from the clipboard (**Ctrl/Cmd+V**) and press Enter. Windows: `%APPDATA%\Reticolo\figma-plugin\manifest.json`. Mac: press **Cmd+Shift+G**, paste, Enter, then **Open**.
   3. Run it from **Plugins > Development > Reticolo**.
   Reticolo is not in the regular Plugins list: it only appears under **Plugins > Development** after the import. From then on it stays there.
5. **Uninstall:** Windows Settings > Apps > Reticolo (your grid library is kept); in Figma, **Manage plugins in development > Remove**.
