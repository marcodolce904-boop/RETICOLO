# Pubblicazione su Figma Community

Pubblicare Reticolo nella Community di Figma è l'unico modo per avere **installazione con un clic** ("Install" nella pagina del plugin): Figma non permette di installare un plugin in sviluppo in modo automatico. La pubblicazione la fa il proprietario dell'account Figma, perché richiede il suo accesso e la revisione di Figma.

## Prima di pubblicare
1. In Figma desktop: **Plugins > Development > New plugin**, crea un plugin vuoto, copia l'**id** che ti assegna e incollalo in `figma/manifest.json` (campo `id`). Rigenera lo zip o rilancia `install-figma-windows.bat`.
2. Prova il plugin come descritto in `figma/README.md`. Meglio non pubblicare prima di averlo visto funzionare in un file vero.
3. La licenza di Reticolo (`LICENSE`) vieta ad altri di ripubblicarlo: la pubblicazione ufficiale dal tuo account è permessa. Se pubblichi, valuta di aggiungere il link al repository nella descrizione.

## Pubblicazione
**Plugins > Development > Manage plugins in development > (menu ... di Reticolo) > Publish**, poi compila:

- **Icon:** `figma/publish/icon-128.png` (128 x 128; c'è anche `icon-640.png`).
- **Cover art:** `figma/publish/cover-1920x960.png` (controlla la misura richiesta nella finestra di pubblicazione: se è diversa, dimmelo e la rigenero).
- **Name:** Reticolo
- **Tagline:** Layout grids for Figma: native layout grids, responsive bento, golden spiral.
- **Description:** vedi sotto.
- **Tags:** grid, layout grid, bento, responsive, golden ratio, columns, baseline, design tools
- **Category / audience:** design tools, free.
- **Network access:** none (il plugin lavora in locale).

### Description (English)
Reticolo generates precise layout grids on your frames in one click.

Columns, modular grids and baselines come out as native Figma layout grids, so you can keep editing them in the Layout grid panel. Beyond that, Reticolo draws composition systems (golden spiral, dynamic symmetry, Van de Graaf canon, rabatment), responsive web layouts and logo and icon constructions as a layer inside the frame.

Highlights
- Responsive bento: type the size of every block and it reflows at 12, 8 and 4 columns, with editable breakpoints (Material, Tailwind, Bootstrap)
- Masonry, holy grail, dashboard, hero with cards, auto-fit cards
- Golden spiral that is always a true circle, in any frame size
- Logo lockups in exact X units, icon keylines, circle lattices, vesica piscis, Android adaptive icon
- Grids inside any closed shape or frame
- A library to save, tag, export and import your own grids as JSON
- English and Italian interface, light and dark theme

Reticolo is free to use and an experimental beta: tested with a simulated Figma API before its first real run, so please report what breaks.
The same engine also powers Reticolo for Illustrator, Photoshop and InDesign. Not affiliated with Adobe or Figma.
