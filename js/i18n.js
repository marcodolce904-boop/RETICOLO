/* Reticolo - testi dell'interfaccia (IT / EN). */
(function (root) {
  "use strict";

  var STR = {
    it: {
      "tab.columns": "Colonne", "tab.modular": "Modulare", "tab.baseline": "Baseline", "tab.comp": "Comp",
      "sub.classic": "Classiche", "sub.symmetry": "Simmetria", "sub.rabat": "Rabat", "sub.geom": "Geom",
      "target.all": "Tutti gli artboard", "target.active": "Artboard attivo", "target.allPages": "Tutte le pagine", "target.activePage": "Pagina attiva", "target.canvas": "Tela intera",
      "target.refresh": "Aggiorna elenco artboard",
      "f.columns": "Colonne", "f.gutter": "Gutter", "f.gutterX": "Gutter X", "f.gutterY": "Gutter Y", "f.rows": "Righe",
      "f.maxWidth": "Larghezza max contenitore", "f.maxWidth.help": "0 = tutta la larghezza disponibile",
      "f.margins": "Margini", "f.top": "Sopra", "f.right": "Destra", "f.bottom": "Sotto", "f.left": "Sinistra",
      "f.linkMargins": "Collega i margini",
      "f.sizing": "Dimensione moduli", "f.sizing.fit": "Riempi artboard", "f.sizing.fixed": "Modulo fisso",
      "f.moduleW": "Larghezza modulo", "f.moduleH": "Altezza modulo",
      "f.direction": "Direzione", "f.dir.h": "Orizzontali", "f.dir.v": "Verticali", "f.dir.both": "Entrambe",
      "f.spacing": "Interlinea", "f.boldEvery": "Linea forte ogni", "f.offset": "Prima linea a",
      "f.geomSpacing": "Passo", "f.count": "Raggi", "f.flipH": "Rifletti orizzontale", "f.flipV": "Rifletti verticale",
      "f.ratios": "Rapporti colonne (opzionale)", "f.ratios.help": "Es. 2 1 1 per colonne asimmetriche, 1 1 2 3 5 per Fibonacci. Sostituisce il numero di colonne.",
      "f.lead": "Baseline sovrapposta (interlinea)", "f.lead.help": "0 = spenta. Disegna le linee di base sopra le colonne.",
      "f.leadMod.help": "0 = spenta. Aggancia altezza moduli e gutter verticale all'interlinea e disegna la baseline.",
      "f.dir.dots": "Punti",
      "sub.studio": "Studio", "sub.social": "Social",
      "social.note": "Zone da tenere libere dall'interfaccia dell'app (celle). Valori indicativi in proporzione al formato: le piattaforme li cambiano spesso.",
      "readout.cols": "Colonne {w}",
      "lib.recovered": "Il file della libreria era danneggiato: ne ho salvato una copia nella cartella Reticolo.",
      "f.unit": "Unità",
      "readout.col": "Colonna {w}", "readout.mod": "Modulo {w} x {h} ({c} x {r})", "readout.lines": "{n} linee",
      "err.tooNarrow": "Non c'è spazio: riduci gutter, margini o numero di colonne.",
      "err.tooDense": "Troppi elementi: aumenta passo o dimensioni, oppure riduci righe e colonne.",
      "err.unknownVariant": "Variante sconosciuta.",
      "live": "Anteprima live", "generate": "Genera griglia", "clear": "Cancella",
      "preset": "Preset", "preset.choose": "Scegli un preset", "preset.mine": "Le mie griglie",
      "save.current": "Salva nella libreria", "save.name": "Nome della griglia", "save.tags": "Tag (separati da virgola)", "save.ok": "Salva", "cancel": "Annulla",
      "cat.web": "Web", "cat.mobile": "Mobile", "cat.print": "Stampa", "cat.bento": "Bento / Modulare", "cat.baseline": "Baseline", "cat.comp": "Composizione", "cat.studio": "Studio (logo, icone, prospettiva)", "cat.social": "Social (zone sicure)",
      "top.visible": "Mostra / nascondi griglia", "top.lock": "Blocca / sblocca livello griglia", "top.library": "Libreria", "top.settings": "Impostazioni",
      "lib.title": "Libreria", "lib.search": "Cerca per nome o tag", "lib.import": "Importa", "lib.exportAll": "Esporta tutto",
      "lib.all": "Tutte", "lib.fav": "Preferite", "lib.builtin": "Incluse",
      "lib.apply": "Applica", "lib.rename": "Rinomina", "lib.duplicate": "Duplica", "lib.export": "Esporta", "lib.delete": "Elimina",
      "lib.deleteConfirm": "Eliminare \"{name}\"?", "lib.favToggle": "Preferita",
      "lib.empty.title": "Nessuna griglia salvata",
      "lib.empty.body": "Salva la griglia che stai usando oppure importa un file .json esportato da Reticolo.",
      "lib.noResults": "Nessuna griglia corrisponde alla ricerca.",
      "lib.drop": "Rilascia qui i file .json per importarli",
      "lib.file": "File libreria", "lib.openFolder": "Apri cartella",
      "lib.imported": "{n} griglie importate", "lib.importNone": "Nessuna griglia valida nel file", "lib.exported": "Esportato in {path}",
      "lib.saved": "Salvata in libreria", "lib.applied": "Applicata: {name}", "lib.copy": "copia",
      "set.title": "Impostazioni", "set.language": "Lingua",
      "set.appearance": "Aspetto", "set.renderAs": "Disegna come",
      "set.render.stroke": "Linee (contorni)", "set.render.fill": "Celle piene", "set.render.both": "Linee + celle", "set.render.guides": "Guide native",
      "set.guidesHelp": "Con le guide native i colori qui sotto non si applicano. Le linee oblique diventano tracciati guida (Illustrator) o linee sottili (Photoshop, InDesign).",
      "set.stroke": "Colore linee", "set.fill": "Colore celle", "set.strokeW": "Spessore linea", "set.fillA": "Opacità celle (%)", "set.bold": "Moltiplicatore linea forte",
      "set.output": "Output e livello", "set.layer": "Nome livello", "set.lockAfter": "Blocca il livello dopo la generazione",
      "set.idNative": "InDesign: colonne come margini e colonne native", "set.psGuides": "In Photoshop le guide non hanno un livello: Cancella, e Genera in modalità guide native, rimuovono le guide che cadono nell'artboard (o in tutta la tela).",
      "set.reset": "Ripristina impostazioni", "set.resetConfirm": "Ripristinare tutte le impostazioni? La libreria non viene toccata.",
      "back": "Indietro",
      "noDoc": "Apri un documento per generare la griglia.",
      "done": "Griglia generata su {n} {what}", "cleared": "Griglia rimossa", "what.ab": "artboard", "what.pages": "pagine",
      "hostError": "Errore dall'applicazione: {msg}",
      "demo": "Modalità anteprima: il pannello non è dentro un'app Adobe."
    },
    en: {
      "tab.columns": "Columns", "tab.modular": "Modular", "tab.baseline": "Baseline", "tab.comp": "Comp",
      "sub.classic": "Classic", "sub.symmetry": "Symmetry", "sub.rabat": "Rabat", "sub.geom": "Geom",
      "target.all": "All artboards", "target.active": "Active artboard", "target.allPages": "All pages", "target.activePage": "Active page", "target.canvas": "Whole canvas",
      "target.refresh": "Refresh artboard list",
      "f.columns": "Columns", "f.gutter": "Gutter", "f.gutterX": "Gutter X", "f.gutterY": "Gutter Y", "f.rows": "Rows",
      "f.maxWidth": "Max container width", "f.maxWidth.help": "0 = use the full available width",
      "f.margins": "Margins", "f.top": "Top", "f.right": "Right", "f.bottom": "Bottom", "f.left": "Left",
      "f.linkMargins": "Link margins",
      "f.sizing": "Module sizing", "f.sizing.fit": "Fit artboard", "f.sizing.fixed": "Fixed module",
      "f.moduleW": "Module width", "f.moduleH": "Module height",
      "f.direction": "Direction", "f.dir.h": "Horizontal", "f.dir.v": "Vertical", "f.dir.both": "Both",
      "f.spacing": "Leading", "f.boldEvery": "Strong line every", "f.offset": "First line at",
      "f.geomSpacing": "Spacing", "f.count": "Rays", "f.flipH": "Flip horizontal", "f.flipV": "Flip vertical",
      "f.ratios": "Column ratios (optional)", "f.ratios.help": "E.g. 2 1 1 for asymmetric columns, 1 1 2 3 5 for Fibonacci. Overrides the column count.",
      "f.lead": "Baseline overlay (leading)", "f.lead.help": "0 = off. Draws baselines over the columns.",
      "f.leadMod.help": "0 = off. Snaps module height and vertical gutter to the leading and draws the baseline.",
      "f.dir.dots": "Dots",
      "sub.studio": "Studio", "sub.social": "Social",
      "social.note": "Areas to keep clear of the app's interface (cells). Indicative values, scaled to the format: platforms change them often.",
      "readout.cols": "Columns {w}",
      "lib.recovered": "The library file was damaged: a copy was saved in the Reticolo folder.",
      "f.unit": "Unit",
      "readout.col": "Column {w}", "readout.mod": "Module {w} x {h} ({c} x {r})", "readout.lines": "{n} lines",
      "err.tooNarrow": "Not enough room: reduce gutter, margins or column count.",
      "err.tooDense": "Too many elements: increase spacing or size, or reduce rows and columns.",
      "err.unknownVariant": "Unknown variant.",
      "live": "Live preview", "generate": "Generate grid", "clear": "Clear",
      "preset": "Preset", "preset.choose": "Choose a preset", "preset.mine": "My grids",
      "save.current": "Save to library", "save.name": "Grid name", "save.tags": "Tags (comma separated)", "save.ok": "Save", "cancel": "Cancel",
      "cat.web": "Web", "cat.mobile": "Mobile", "cat.print": "Print", "cat.bento": "Bento / Modular", "cat.baseline": "Baseline", "cat.comp": "Composition", "cat.studio": "Studio (logo, icons, perspective)", "cat.social": "Social (safe zones)",
      "top.visible": "Show / hide grid", "top.lock": "Lock / unlock grid layer", "top.library": "Library", "top.settings": "Settings",
      "lib.title": "Library", "lib.search": "Search by name or tag", "lib.import": "Import", "lib.exportAll": "Export all",
      "lib.all": "All", "lib.fav": "Favorites", "lib.builtin": "Built-in",
      "lib.apply": "Apply", "lib.rename": "Rename", "lib.duplicate": "Duplicate", "lib.export": "Export", "lib.delete": "Delete",
      "lib.deleteConfirm": "Delete \"{name}\"?", "lib.favToggle": "Favorite",
      "lib.empty.title": "No saved grids yet",
      "lib.empty.body": "Save the grid you are using, or import a .json file exported from Reticolo.",
      "lib.noResults": "No grid matches your search.",
      "lib.drop": "Drop .json files here to import them",
      "lib.file": "Library file", "lib.openFolder": "Open folder",
      "lib.imported": "{n} grids imported", "lib.importNone": "No valid grids in the file", "lib.exported": "Exported to {path}",
      "lib.saved": "Saved to library", "lib.applied": "Applied: {name}", "lib.copy": "copy",
      "set.title": "Settings", "set.language": "Language",
      "set.appearance": "Appearance", "set.renderAs": "Render as",
      "set.render.stroke": "Strokes", "set.render.fill": "Filled cells", "set.render.both": "Strokes + cells", "set.render.guides": "Native guides",
      "set.guidesHelp": "Native guides ignore the colors below. Diagonal lines become guide paths (Illustrator) or thin lines (Photoshop, InDesign).",
      "set.stroke": "Stroke color", "set.fill": "Cell color", "set.strokeW": "Stroke width", "set.fillA": "Cell opacity (%)", "set.bold": "Strong line multiplier",
      "set.output": "Output and layer", "set.layer": "Layer name", "set.lockAfter": "Lock the layer after generating",
      "set.idNative": "InDesign: columns as native margins and columns", "set.psGuides": "Photoshop guides have no layer: Clear, and Generate in native guides mode, remove the guides that fall inside the artboard (or the whole canvas).",
      "set.reset": "Reset settings", "set.resetConfirm": "Reset all settings? Your library is not affected.",
      "back": "Back",
      "noDoc": "Open a document to generate a grid.",
      "done": "Grid generated on {n} {what}", "cleared": "Grid removed", "what.ab": "artboards", "what.pages": "pages",
      "hostError": "Application error: {msg}",
      "demo": "Preview mode: the panel is not running inside an Adobe app."
    }
  };

  var VARIANT_NAMES = {
    it: {
      thirds: "Terzi", phi: "Griglia Phi", spiral: "Spirale aurea", diagonal: "Diagonale", cross: "Croce", quadrants: "Quarti", canon: "Canone VdG",
      harmonic: "Armonica", baroque: "Barocca", sinister: "Sinistra", armature: "Armatura", root2: "Radice 2", root3: "Radice 3", root4: "Radice 4", root5: "Radice 5",
      rabatment: "Rabattimento", rabatDiag: "Rabat + diagonali", goldenRects: "Rettangoli aurei",
      isometric: "Isometrica", triangular: "Triangolare", hexagonal: "Esagonale", pentagon: "Pentagono", radial: "Radiale", concentric: "Concentrica", symmetry: "Simmetria",
      goldenCircles: "Cerchi aurei", keylines: "Keyline icone", persp1: "Prospettiva 1 pt", persp2: "Prospettiva 2 pt", persp3: "Prospettiva 3 pt",
      igStory: "IG Story", igReel: "IG Reel", tiktok: "TikTok", igProfile: "IG profilo 3:4", ytThumb: "YT miniatura", ytBanner: "YT banner"
    },
    en: {
      thirds: "Thirds", phi: "Phi grid", spiral: "Golden spiral", diagonal: "Diagonal", cross: "Cross", quadrants: "Quadrants", canon: "VdG canon",
      harmonic: "Harmonic", baroque: "Baroque", sinister: "Sinister", armature: "Armature", root2: "Root 2", root3: "Root 3", root4: "Root 4", root5: "Root 5",
      rabatment: "Rabatment", rabatDiag: "Rabat + diagonals", goldenRects: "Golden rects",
      isometric: "Isometric", triangular: "Triangular", hexagonal: "Hexagonal", pentagon: "Pentagon", radial: "Radial", concentric: "Concentric", symmetry: "Symmetry",
      goldenCircles: "Golden circles", keylines: "Icon keylines", persp1: "1-pt perspective", persp2: "2-pt perspective", persp3: "3-pt perspective",
      igStory: "IG Story", igReel: "IG Reel", tiktok: "TikTok", igProfile: "IG profile 3:4", ytThumb: "YT thumbnail", ytBanner: "YT banner"
    }
  };

  var lang = "it";

  function t(key, vars) {
    var s = (STR[lang] && STR[lang][key]) || STR.en[key] || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] !== undefined ? vars[k] : ""; });
    return s;
  }

  function apply(rootEl) {
    var els = (rootEl || document).querySelectorAll("[data-i18n],[data-i18n-title],[data-i18n-ph]");
    Array.prototype.forEach.call(els, function (el) {
      if (el.hasAttribute("data-i18n")) el.textContent = t(el.getAttribute("data-i18n"));
      if (el.hasAttribute("data-i18n-title")) { el.title = t(el.getAttribute("data-i18n-title")); el.setAttribute("aria-label", el.title); }
      if (el.hasAttribute("data-i18n-ph")) el.placeholder = t(el.getAttribute("data-i18n-ph"));
    });
    document.documentElement.lang = lang;
  }

  root.RTC_I18N = {
    t: t,
    apply: apply,
    variant: function (v) { return (VARIANT_NAMES[lang] || VARIANT_NAMES.en)[v] || v; },
    name: function (n) { return typeof n === "string" ? n : (n && (n[lang] || n.en || n.it)) || ""; },
    get lang() { return lang; },
    set lang(v) { lang = STR[v] ? v : "it"; }
  };
})(this);
