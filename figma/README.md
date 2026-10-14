# Reticolo per Figma (beta sperimentale)

Lo stesso pannello e lo stesso motore di Reticolo per Illustrator, Photoshop e InDesign, dentro Figma.
Questo plugin non è stato ancora provato in Figma da un utente: è testato con un'API Figma simulata e con il pannello nel browser.
Segnala ogni problema aprendo una issue.

## Installazione (Figma desktop)

1. Scarica il repository (**Code > Download ZIP**) e estrai lo zip.
2. In Figma: **Plugins > Development > Import plugin from manifest...**
3. Scegli `figma/manifest.json` nella cartella estratta.
4. Apri un file di design e lancia **Plugins > Development > Reticolo**.

Se Figma rifiuta l'`id` del manifest, crea un plugin vuoto da **Plugins > Development > New plugin**, copia l'id che ti assegna e incollalo in `figma/manifest.json`. Libreria e impostazioni sono legate a quell'id: cambiandolo, ripartono vuote (esporta prima la libreria).

Il plugin funziona solo in locale, senza accesso alla rete (`networkAccess: none`).

## Come funziona

- **Frame = artboard.** La tendina elenca i frame e i componenti in cima alla pagina (anche dentro le sezioni). "Frame attivo" è quello della selezione.
- **Disegna come:**
  - *Linee, celle piene, linee + celle*: la griglia è un SVG importato nel frame, in un livello che si chiama come il campo "Livello" delle impostazioni (predefinito `Reticolo`). Occhio e lucchetto in alto agiscono su questo livello, **Cancella** lo rimuove.
  - *Layout grid di Figma*: colonne, griglie modulari e baseline semplici diventano **layout grid nativi** del frame (si vedono e si modificano nel pannello Layout grid di Figma). Cancella toglie solo quelli aggiunti da Reticolo. Le altre griglie (rapporti tra colonne, composizioni, punti) restano linee, perché Figma non permette ai plugin di creare guide.
- **Griglia dentro un oggetto:** nella tendina trovi "Oggetto selezionato" e gli oggetti chiusi del frame attivo (rettangoli, ellissi, poligoni, stelle, tracciati chiusi, frame annidati, componenti). Nei frame e nei componenti la griglia sta dentro l'oggetto e ne segue il ritaglio; nelle forme viene ritagliata con una copia dell'oggetto usata come maschera. Hanno nome `RTC:o:<id>` e non vengono toccate dalle operazioni sul frame.
- **Layout web responsivi** (famiglia Comp > Web): bento, masonry, card auto-fit, holy grail... Con "Tutti i frame", un frame desktop, uno tablet e uno mobile ricevono ciascuno la propria versione.
- **Libreria:** salvata nell'archivio locale del plugin (`figma.clientStorage`), quindi separata da quella delle app Adobe. Per spostare le griglie da un'app all'altra usa **Esporta tutto** e **Importa** (file `.json`, stesso formato).
- Le funzioni per la stampa su pagine affiancate (alterna pagine sinistra/destra) non compaiono in Figma.

## Limiti noti

- Le griglie sono SVG importati: dopo la generazione si possono spostare e modificare, ma non si rigenerano da sole se ridimensioni il frame (per questo i vincoli sono impostati su "Scala"). Rigenera con **Genera griglia** o con l'anteprima live.
- Le griglie dentro oggetti non funzionano dentro le istanze di componenti (Figma non permette di aggiungere nodi alle istanze).
- Il pannello è largo 340 px; la sua altezza si regola con l'angolo della finestra del plugin.
- Figma 'Dev Mode' e FigJam non sono supportati.

## Sviluppo

- `figma/code.js`: sandbox del plugin (legge i frame, disegna). Nessuna geometria qui: sta in `js/engine.js`.
- `figma/ui.html`: **file generato** da `index.html`, `css/` e `js/`. Dopo ogni modifica al pannello esegui `node tools/build-figma.js` (`npm run build:figma`). Il test lo controlla.
- `figma/manifest.json`: manifest del plugin.
- `npm test` esegue anche i test di `code.js` con un'API Figma simulata.
