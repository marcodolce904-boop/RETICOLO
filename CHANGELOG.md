# Changelog

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
