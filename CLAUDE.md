# Reticolo - note per lo sviluppo

Estensione CEP (pannello HTML + ExtendScript) per Illustrator, Photoshop e InDesign che genera griglie.

## Regole

- Tutta la geometria sta in `js/engine.js` (JS puro, testato in Node). Gli host (`host/*.jsx`) disegnano soltanto le primitive `L` (linea), `R` (cella), `P` (polilinea), `B` (Bezier).
- `host/*.jsx` sono ExtendScript **ES3**: niente `let`/`const`, arrow function, `Array.prototype.forEach/map/filter/indexOf`, `JSON` nativo. Usare `Reticolo.parse` e `Reticolo.stringify` di `host/common.jsx`.
- Nuove griglie: aggiungere la variante in `buildComp` (o un nuovo builder) e in `VARIANTS`, i nomi in `js/i18n.js` (IT e EN), eventualmente un preset in `js/presets.js`. Il test "ogni variante di composizione produce primitive dentro l'artboard" le copre automaticamente.
- Target: il pannello invia a `draw`/`clear` elementi `{ i }` (artboard/pagina) oppure `{ obj }` (oggetto chiuso). `info` restituisce anche `layerName`, `objects` e `selection`. Le griglie negli oggetti hanno nome/etichetta `RTC:o:<id>` (Photoshop: livelli `<nome> [<id>]`) e non vanno toccate dalle operazioni sugli artboard.
- Ogni griglia deve restare sotto i limiti `MAX_CELLS`, `MAX_DOTS`, `MAX_POINTS` (altrimenti `tooDense`): le app Adobe si bloccano con decine di migliaia di oggetti.
- Testi visibili in italiano e inglese, senza trattini lunghi.
- Licenza: Reticolo Free Use License (`LICENSE`). Uso gratuito anche professionale, niente redistribuzione o vendita. Non è open source.

## Comandi

- `npm test`: motore, libreria e script host su DOM simulato (Node 22+).
- Aprire `index.html` nel browser: modalità anteprima con artboard simulati.
- Debug nell'app: `http://localhost:8088` (Illustrator), `8089` (Photoshop), `8090` (InDesign).
