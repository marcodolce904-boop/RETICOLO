# Changelog

## 2.0.1 (beta sperimentale)

- **Installer unico** per Windows (`.exe`, NSIS) e macOS (`.zip` con `.command`): si scelgono Illustrator, Photoshop, InDesign e Figma con selezione multipla. Il manifest dell'estensione Adobe elenca solo le app scelte. Installazione silenziosa con `/COMPONENTS=`. Disinstallatore che conserva la libreria.
- `tools/build-installers.js` costruisce gli installer in `dist/`. Dettagli e limiti (non firmati, macOS non provato su un Mac) in `installer/README.md`.

## 2.0.0 (beta sperimentale)

- **Plugin per Figma.** Stesso pannello e stesso motore delle app Adobe, nella cartella `figma/` (importa `figma/manifest.json` da Figma desktop). Istruzioni e limiti in `figma/README.md`.
- I frame sono gli artboard. Le griglie sono SVG in un livello `Reticolo` del frame, con occhio, lucchetto e Cancella come nelle altre app.
- Modalità **Layout grid di Figma**: colonne, griglie modulari e baseline semplici diventano layout grid nativi del frame; le altre griglie restano linee (Figma non permette di creare guide).
- Griglie dentro oggetti chiusi: dentro i frame e i componenti, ritagliate con una maschera nelle forme.
- Libreria e impostazioni nell'archivio locale del plugin; importazione ed esportazione `.json` compatibili con le app Adobe.
- `tools/build-figma.js` genera `figma/ui.html` dal pannello; un test controlla che sia aggiornato.
- Novità interne: ponte messaggi nel pannello (`js/host.js`), test di `figma/code.js` con un'API Figma simulata.

## 1.6.0 (beta sperimentale)

- Layout Web con **variabili modificabili**: soglie tablet e desktop (menu Material 3, Tailwind, Bootstrap o numeri liberi), colonne desktop, tablet e mobile del bento, gutter, altezza riga.
- Proporzioni interne modificabili: header, footer e sidebar dell'holy grail, hero e numero di card, pannello sinistro dello schermo diviso, sidebar, barra superiore e numero di KPI della dashboard.
- Nuovo layout **Masonry**: scrivi l'altezza di ogni blocco, ogni blocco va nella colonna più bassa (4 / 3 / 2 colonne secondo la larghezza).
- Larghezze del bento fino a 24 colonne. Misure impossibili danno un errore chiaro.
- 2 nuovi preset (81 in totale).

## 1.5.0 (beta sperimentale)

- **Spirale aurea e rettangoli aurei**: il blocco aureo è sempre il più grande possibile dentro la pagina, con lo stesso orientamento, centrato. La spirale è un vero cerchio su qualsiasi formato (prima si schiacciava a ellisse su Story, A4 e altri).
- Nuova famiglia **Web** in Comp, che si adatta alla larghezza dell'artboard (sotto 600 mobile, sotto 840 tablet, da 840 desktop).
- **Bento responsivo**: scrivi le misure di ogni blocco (`6x4 3x2 ...`, colonne x righe) e i blocchi si dispongono da soli a 12, 8 e 4 colonne, con larghezze esatte opzionali per tablet e mobile (`4x2/4/2`). Gutter e altezza riga modificabili.
- Altri layout web: card auto-fit con larghezza minima, holy grail, hero + card, schermo diviso 7/5, dashboard.
- 6 nuovi preset (79 in totale), categoria Web.
- `docs/layout-research.md`: nuova sezione con ricerca, regole del bento e limiti.

## 1.4.2 (beta sperimentale)

- Corretto lo specchio delle pagine sinistre sulle curve: le maniglie delle Bezier non venivano specchiate, quindi la spirale aurea si deformava. Ora si specchia l'intero blocco (ancore e maniglie).

## 1.4.1 (beta sperimentale)

- Interruttore **Alterna pagine sinistra / destra** (sopra "Genera griglia"): le griglie sono disegnate per la pagina destra e sulle pagine sinistre vengono specchiate. Vale per tutte le griglie, quindi anche per il canone di Van de Graaf e per i margini interno/esterno.
- InDesign usa il lato reale della pagina (pagine affiancate), le pagine singole non vengono specchiate. Con le colonne native i margini destro e sinistro si scambiano. Illustrator e Photoshop usano la numerazione: 1 destra, 2 sinistra.

## 1.4.0 (beta sperimentale)

- Nuova famiglia **Layout** in Comp: diagramma di Gutenberg, lettura a Z, lettura a F, lista + dettaglio (1/3 + 2/3), pannello di supporto (2/3 + 1/3), app shell.
- **Doppia pagina** (famiglia Classiche): due blocchi del canone di Van de Graaf specchiati, con dorso in grassetto.
- Studio: **vesica piscis** con triangoli equilateri, reticoli di cerchi (triangolare e quadrato, passo regolabile), **icona Android adaptive** (108 / 72 / 66).
- 16 nuovi preset (73 in totale): pieghe per stampa (bifold, trifold a Z, lettera a C 97/100/100, gate fold 1/2/1, 4 ante), doppia pagina, layout di lettura e interfaccia, nuove griglie Studio. Nuova categoria Layout.
- `docs/layout-research.md`: ricerca, cosa è stato aggiunto, cosa è stato escluso e perché, con le fonti.

## 1.3.0 (beta sperimentale)

- Nuova famiglia **Logo** in Comp: logo in alto, logo a sinistra (anche con le distanze in X), typelogo, logo con tagline, linee tipografiche.
- Tutte le distanze sono multipli di **X**: con X = 0 il lockup si adatta al riquadro, con X > 0 sono esatte (misura la tua lettera e scrivila nel campo). Spazio libero, simbolo, distanza e logotipo sono modificabili.
- 8 nuovi preset (57 in totale), categoria Logo.
- `docs/logo-layouts.md`: come funzionano i layout, cosa è standard e cosa è regola pratica, con le fonti.

## 1.2.0 (beta sperimentale)

- **Griglie dentro gli oggetti chiusi.** Nella tendina compaiono "Oggetto selezionato" e gli oggetti chiusi del livello attivo; la griglia viene costruita sul riquadro dell'oggetto e ritagliata sulla sua forma.
  - Illustrator: tracciati chiusi e tracciati composti, gruppo con maschera di ritaglio.
  - Photoshop: livelli del gruppo attivo, griglia agganciata con maschera di ritaglio.
  - InDesign: rettangoli, ellissi, poligoni chiusi e cornici di testo; forme non rettangolari con Incolla dentro.
- Generare o cancellare la griglia di un artboard non tocca le griglie dentro gli oggetti, e viceversa.
- Il livello attivo dell'utente resta lo stesso dopo la generazione (Illustrator, InDesign).

## 1.1.0 (beta sperimentale)

- Colonne asimmetriche con rapporti (`2 1 1`, Fibonacci `1 1 2 3 5`).
- Baseline sovrapposta a colonne e modulare, con moduli e gutter agganciati all'interlinea.
- Griglia a punti (dot grid).
- Nuove famiglie di composizione: **Studio** (cerchi aurei, keyline icone, prospettiva a 1, 2 e 3 punti) e **Social** (zone sicure IG Story, IG Reel, TikTok, ritaglio profilo IG 3:4, miniatura e banner YouTube).
- 17 nuovi preset (49 in totale).
- Libreria: backup automatico se il file è danneggiato, rilettura del file prima di ogni salvataggio (più app aperte insieme).
- Limiti di densità: le griglie che bloccherebbero l'app mostrano un avviso.
- Illustrator: coordinate documento forzate, griglie riconosciute per posizione.
- Photoshop: le guide create vengono annotate nei metadati, le guide manuali non vengono toccate.
- InDesign: nessuna modifica al documento all'apertura del pannello, ripristino di margini e colonne native.
- Correzioni: clic sulle etichette dei campi, rinomina del livello, cambio tema chiaro/scuro.

## 1.0.0

- Prima versione: colonne, modulare, baseline e 25 griglie di composizione per Illustrator, Photoshop e InDesign.
- Libreria di griglie con import/export JSON, 32 preset, interfaccia IT/EN, installer per Windows.
