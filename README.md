# Reticolo

![status](https://img.shields.io/badge/status-experimental%20beta-orange) ![version](https://img.shields.io/badge/version-1.1.0--beta-blue) ![apps](https://img.shields.io/badge/Illustrator%20%C2%B7%20Photoshop%20%C2%B7%20InDesign-grey)

**Layout grids for Adobe Illustrator, Photoshop and InDesign, in one panel.**

Reticolo builds precise grids on your artboards and pages in a click: columns, modular grids, baselines and classic composition systems such as the golden spiral, dynamic symmetry and rabatment. It also covers practical tools like icon keylines, perspective guides and social media safe zones. Every grid can be saved to a personal library, tagged, and shared as a simple JSON file. The same library works in all three apps.

It is built for graphic designers, editorial and print designers, UI and web designers, illustrators and content creators who set up grids every day and want them exact, repeatable and fast.

> **Experimental beta.** Reticolo is under active development and has been tested on a limited number of setups. Features, file formats and behaviour may change between versions, and some combinations of app version and document may not work as expected. Save your work before generating grids on important files, and please report any problem by opening an issue.

**Highlights**

- Column, modular, baseline and dot grids, with margins, gutters and units in px, mm or pt
- Asymmetric and Fibonacci column ratios, modules snapped to the baseline
- 30 composition grids: rule of thirds, phi grid, golden spiral, dynamic symmetry, root rectangles, Van de Graaf canon, isometric and hexagonal grids, perspective with 1, 2 and 3 vanishing points, logo golden circles, icon keylines
- Safe zones for Instagram Story and Reel, TikTok and YouTube
- Output as strokes, filled cells or native guides, on a dedicated layer, with one-step undo in Photoshop and InDesign
- Grid library with search, tags, favorites, import and export, plus 49 built-in presets
- Interface in English and Italian, follows the light or dark theme of the app

---

> **Beta sperimentale.** Reticolo è in sviluppo attivo ed è stato provato su un numero limitato di configurazioni. Funzioni, formati dei file e comportamento possono cambiare tra una versione e l'altra. Salva il lavoro prima di generare griglie su file importanti e segnala ogni problema aprendo una issue.

Generatore di griglie per **Illustrator, Photoshop e InDesign**. È un unico pannello (estensione CEP) con lo stesso codice nelle tre app:
colonne, griglie modulari, baseline e griglie di composizione (spirale aurea, simmetria dinamica, rabattimento, isometrica…),
più una **libreria** di griglie da salvare, importare ed esportare.

## Installazione su Windows

1. Scarica il plugin: su GitHub **Code > Download ZIP**, poi estrai lo zip (oppure `git clone` del repository).
2. Nella cartella estratta, doppio clic su **`install-windows.bat`**.
   - Copia l'estensione in `%APPDATA%\Adobe\CEP\extensions\com.reticolo.grid`.
   - Attiva `PlayerDebugMode` (necessario per le estensioni non firmate) nel registro utente, per CEP 9-13.
3. Chiudi e riapri l'app, poi apri il pannello:
   - **Illustrator / InDesign**: Finestra > Estensioni > Reticolo
   - **Photoshop**: Finestra > Estensioni (legacy) > Reticolo

**Aggiornare:** scarica la nuova versione e rilancia `install-windows.bat`. Sostituisce la versione installata; libreria e impostazioni restano.

Per rimuoverlo usa `uninstall-windows.bat` (la libreria resta salvata). Le novità di ogni versione sono in `CHANGELOG.md`.

> Tutti i diritti riservati (vedi `LICENSE`): il codice è consultabile, ma non può essere copiato, redistribuito o venduto senza autorizzazione.

Versioni supportate: Illustrator CC 2018+, Photoshop 2021+, InDesign 2021+.

## Uso

| Tab | Cosa fa |
|---|---|
| **Colonne** | N colonne, gutter, margini, larghezza massima del contenitore (es. 960 Grid, Bootstrap). **Rapporti** per colonne asimmetriche (`2 1 1`) o Fibonacci (`1 1 2 3 5`). **Baseline sovrapposta** |
| **Modulare** | Colonne x righe con gutter X/Y, oppure moduli di dimensione fissa centrati. Con l'**interlinea**, altezza dei moduli e gutter si agganciano alla baseline (griglia editoriale classica) |
| **Baseline** | Linee orizzontali, verticali, a quadretti o a **punti** (dot grid), con linea forte ogni N e offset della prima linea |
| **Comp** | *Classiche*: terzi, griglia Phi, spirale aurea, metodo diagonale, croce, quarti, canone Van de Graaf. *Simmetria*: armonica, barocca, sinistra, armatura 14 linee, rettangoli radice 2-5. *Rabat*: rabattimento, rabattimento + diagonali, rettangoli aurei. *Geom*: isometrica, triangolare, esagonale, pentagono, radiale, concentrica, simmetria. *Studio*: cerchi aurei per loghi, keyline icone (griglia 24), prospettiva a 1, 2 e 3 punti. *Social*: zone sicure di IG Story, IG Reel e TikTok, miniatura e banner YouTube, ritaglio 3:4 del profilo Instagram |

- **Target**: tutti gli artboard/pagine, quello attivo o uno specifico. In Photoshop sono supportati gli artboard. Se il documento non ne ha, la griglia copre tutta la tela.
- **Unità**: px, mm o pt per ogni griglia. In Photoshop mm e pt usano la risoluzione del documento.
- **Anteprima live**: rigenera la griglia a ogni modifica.
- **Frecce su/giù** nei campi numerici: ±1 (Maiusc ±10, Alt ±0,1). **Invio** genera la griglia.
- **Occhio / lucchetto** in alto: mostra/nascondi e blocca/sblocca il livello della griglia.

### Come viene disegnata (Impostazioni > Disegna come)

| Modalità | Illustrator | Photoshop | InDesign |
|---|---|---|---|
| Linee | tracciati con contorno | livello forma vettoriale | linee e rettangoli |
| Celle piene | rettangoli con opacità | livello forma con opacità | rettangoli con trasparenza |
| Guide native | guide (anche diagonali e curve) | guide + linee sottili per le oblique | guide di pagina; con l'opzione attiva, **margini e colonne nativi** della pagina |

Tutto finisce in un livello dedicato (`Reticolo`, nome modificabile: cambiandolo, il livello esistente viene rinominato). **Cancella** rimuove solo ciò che ha creato Reticolo:
in Photoshop le guide create vengono annotate nei metadati del documento, quindi le tue guide manuali non vengono toccate;
in InDesign margini e colonne native vengono ripristinati come erano.
Le griglie molto dense (milioni di elementi) vengono bloccate con un avviso invece di mandare in crash l'app.
In Photoshop e InDesign ogni generazione è **un solo passo di Annulla**.

## Libreria

- Salva la griglia corrente con l'icona del dischetto (accanto ai preset) o da **Libreria > Salva nella libreria**, con nome e tag.
- Cerca per nome, tag o parametri; filtra per tipo o preferite. Puoi applicare, rinominare, duplicare, esportare ed eliminare.
- **Importa** file `.json` (anche più di uno, o trascinandoli sul pannello). **Esporta tutto** crea un file da condividere o da tenere come backup.
- 49 **preset inclusi** (Web, Mobile, Stampa, Bento, Baseline, Composizione, Studio, Social), consultabili dal menu Preset o dal filtro "Incluse".

La libreria è **un solo file condiviso dalle tre app**: `%APPDATA%\Reticolo\library.json`. Le impostazioni sono in `settings.json` nella stessa cartella.
Ogni salvataggio rilegge il file, quindi puoi tenere aperte più app insieme senza perdere griglie. Se il file risulta danneggiato, ne viene salvata una copia (`library-backup-*.json`) invece di sovrascriverlo.

Formato del file (lo stesso per import ed export):

```json
{
  "format": "reticolo-library",
  "version": 1,
  "grids": [
    {
      "id": "g1",
      "name": "Rivista 6 col",
      "tags": ["stampa"],
      "fav": false,
      "grid": {
        "type": "columns",
        "unit": "mm",
        "columns": { "count": 6, "gutter": 5, "maxWidth": 0, "margins": { "t": 15, "r": 15, "b": 20, "l": 15 } }
      }
    }
  ]
}
```

`type` può essere `columns`, `modular`, `baseline` o `comp`. I parametri mancanti prendono i valori predefiniti, e i file non validi vengono scartati all'import.

## Sviluppo

```
.
  CSXS/manifest.xml     estensione CEP (ILST, PHXS, IDSN)
  index.html, css/      pannello
  js/engine.js          geometria di tutte le griglie (JS puro, testato in Node)
  js/presets.js         preset inclusi
  js/library.js         libreria: salvataggio, import/export, validazione
  js/host.js            ponte verso l'app + host simulato per il browser
  js/main.js            interfaccia
  host/*.jsx            disegno in Illustrator / Photoshop / InDesign (ExtendScript ES3)
  tests/                test (motore, libreria, script host su DOM simulato)
```

- `npm test` esegue i test (Node 22+). Su GitHub partono da soli a ogni push (`.github/workflows/test.yml`).
- `CLAUDE.md` riassume le regole del codice (ES3 negli script host, limiti di densità, testi IT/EN).
- Aprendo `index.html` nel browser il pannello gira in **modalità anteprima**, con tre artboard simulati.
- Debug dentro l'app: con l'app aperta vai su `http://localhost:8088` (Illustrator), `8089` (Photoshop) o `8090` (InDesign) in Chrome.
- Le icone sono [Phosphor](https://phosphoricons.com) (MIT). Per rigenerarle usa `node tools/build-icons.js <cartella assets>`.
