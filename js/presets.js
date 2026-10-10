/*
 * Reticolo - preset inclusi (sola lettura). Stesso formato delle griglie salvate in libreria.
 * Notazione nei nomi: (colonne / gutter / margine). Il nome può essere una stringa o { it, en }.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RTC_PRESETS = factory();
})(this, function () {
  "use strict";

  function m(t, r, b, l) {
    if (r === undefined) { r = t; b = t; l = t; }
    return { t: t, r: r, b: b, l: l, linked: t === r && r === b && b === l };
  }
  function cols(count, gutter, margin, extra) {
    var p = { count: count, gutter: gutter, maxWidth: 0, margins: m(0, margin, 0, margin) };
    for (var k in extra || {}) p[k] = extra[k];
    return p;
  }

  var list = [
    // ---------------------------------------------------------------- Web
    { cat: "web", name: "Tailwind (12 / 32 / 16)", grid: { type: "columns", unit: "px", columns: cols(12, 32, 16) } },
    { cat: "web", name: "Material 3 (12 / 24 / 24)", grid: { type: "columns", unit: "px", columns: cols(12, 24, 24) } },
    { cat: "web", name: "Bootstrap 5 (12 / 24 / max 1296)", grid: { type: "columns", unit: "px", columns: cols(12, 24, 12, { maxWidth: 1296 }) } },
    { cat: "web", name: "960 Grid System (12 / 20)", grid: { type: "columns", unit: "px", columns: cols(12, 20, 0, { maxWidth: 940 }) } },
    { cat: "web", name: "Desktop 1440 (12 / 24 / 80)", grid: { type: "columns", unit: "px", columns: cols(12, 24, 80) } },
    { cat: "web", name: "Landing 16 col (16 / 16 / 64)", grid: { type: "columns", unit: "px", columns: cols(16, 16, 64) } },
    { cat: "web", name: { it: "Editoriale asimmetrica 2 : 1 : 1", en: "Asymmetric editorial 2 : 1 : 1" }, grid: { type: "columns", unit: "px", columns: cols(3, 32, 80, { ratios: "2 1 1" }) } },
    { cat: "web", name: { it: "Colonne Fibonacci 1 1 2 3 5", en: "Fibonacci columns 1 1 2 3 5" }, grid: { type: "columns", unit: "px", columns: cols(5, 16, 48, { ratios: "1 1 2 3 5" }) } },
    // ---------------------------------------------------------------- Mobile
    { cat: "mobile", name: "iPhone (4 / 16 / 16)", grid: { type: "columns", unit: "px", columns: cols(4, 16, 16) } },
    { cat: "mobile", name: "Android (4 / 16 / 16)", grid: { type: "columns", unit: "px", columns: cols(4, 16, 16) } },
    { cat: "mobile", name: "iPad (8 / 16 / 24)", grid: { type: "columns", unit: "px", columns: cols(8, 16, 24) } },
    { cat: "mobile", name: "Tablet landscape (12 / 24 / 32)", grid: { type: "columns", unit: "px", columns: cols(12, 24, 32) } },
    // ---------------------------------------------------------------- Stampa
    { cat: "print", name: "Magazine 6 col (5 mm)", grid: { type: "columns", unit: "mm", columns: { count: 6, gutter: 5, maxWidth: 0, margins: m(15, 15, 20, 15) } } },
    { cat: "print", name: "Newspaper 6 col (4 mm)", grid: { type: "columns", unit: "mm", columns: cols(6, 4, 10, { margins: m(10) }) } },
    { cat: "print", name: "Poster 12 col (5 mm)", grid: { type: "columns", unit: "mm", columns: cols(12, 5, 20, { margins: m(20) }) } },
    { cat: "print", name: { it: "Libro 1 col (margini classici)", en: "Book 1 col (classic margins)" }, grid: { type: "columns", unit: "mm", columns: { count: 1, gutter: 0, maxWidth: 0, margins: m(20, 25, 30, 18) } } },
    { cat: "print", name: "Swiss A4 4 x 6 (Muller-Brockmann)", grid: { type: "modular", unit: "mm", modular: { cols: 4, rows: 6, gx: 5, gy: 5, sizing: "fit", margins: m(15, 15, 20, 15) } } },
    { cat: "print", name: { it: "Brochure 3 ante (A4 orizz.)", en: "Tri-fold brochure (A4 landscape)" }, grid: { type: "columns", unit: "mm", columns: cols(3, 10, 5, { margins: m(5) }) } },
    { cat: "print", name: { it: "Rivista A4 12 col + baseline 12 pt", en: "A4 magazine 12 col + 12 pt baseline" }, grid: { type: "columns", unit: "mm", columns: { count: 12, gutter: 4, maxWidth: 0, ratios: "", lead: 4.2333, margins: m(15, 15, 20, 15) } } },
    { cat: "print", name: { it: "Libro A5 modulare su baseline", en: "A5 book, modules on baseline" }, grid: { type: "modular", unit: "mm", modular: { cols: 2, rows: 6, gx: 5, gy: 4.2333, sizing: "fit", lead: 4.2333, margins: m(18, 15, 25, 20) } } },
    { cat: "print", name: { it: "Biglietto da visita 85 x 55", en: "Business card 85 x 55" }, grid: { type: "modular", unit: "mm", modular: { cols: 2, rows: 3, gx: 3, gy: 3, sizing: "fit", margins: m(5) } } },
    { cat: "print", name: { it: "Canone Van de Graaf", en: "Van de Graaf canon" }, grid: { type: "comp", unit: "mm", comp: { family: "classic", variant: "canon" } } },
    // ---------------------------------------------------------------- Bento / modulare
    { cat: "bento", name: "Bento 4 x 4", grid: { type: "modular", unit: "px", modular: { cols: 4, rows: 4, gx: 16, gy: 16, sizing: "fit", margins: m(24) } } },
    { cat: "bento", name: "Bento 6 x 4", grid: { type: "modular", unit: "px", modular: { cols: 6, rows: 4, gx: 16, gy: 16, sizing: "fit", margins: m(24) } } },
    { cat: "bento", name: "Bento 3 x 3", grid: { type: "modular", unit: "px", modular: { cols: 3, rows: 3, gx: 24, gy: 24, sizing: "fit", margins: m(32) } } },
    { cat: "bento", name: "Social 1080 (3 x 3 / 12)", grid: { type: "modular", unit: "px", modular: { cols: 3, rows: 3, gx: 12, gy: 12, sizing: "fit", margins: m(48) } } },
    { cat: "bento", name: { it: "Moduli 8 x 8 (gutter 8)", en: "Modules 8 x 8 (gutter 8)" }, grid: { type: "modular", unit: "px", modular: { cols: 8, rows: 8, gx: 8, gy: 8, sizing: "fit", margins: m(32) } } },
    // ---------------------------------------------------------------- Baseline
    { cat: "baseline", name: "Baseline 4 px", grid: { type: "baseline", unit: "px", baseline: { dir: "h", spacing: 4, boldEvery: 4, offset: 0, margins: m(0) } } },
    { cat: "baseline", name: "Figma 8 pt (baseline)", grid: { type: "baseline", unit: "px", baseline: { dir: "h", spacing: 8, boldEvery: 0, offset: 0, margins: m(0) } } },
    { cat: "baseline", name: { it: "Quadretti 8 px", en: "Square grid 8 px" }, grid: { type: "baseline", unit: "px", baseline: { dir: "both", spacing: 8, boldEvery: 8, offset: 0, margins: m(0) } } },
    { cat: "baseline", name: { it: "Baseline 12 pt (testo 9/12)", en: "Baseline 12 pt (9/12 text)" }, grid: { type: "baseline", unit: "pt", baseline: { dir: "h", spacing: 12, boldEvery: 0, offset: 0, margins: m(0) } } },
    { cat: "baseline", name: "Dot grid 5 mm (bullet journal)", grid: { type: "baseline", unit: "mm", baseline: { dir: "dots", spacing: 5, boldEvery: 0, offset: 0, margins: m(10) } } },
    { cat: "baseline", name: "Dot grid 24 px", grid: { type: "baseline", unit: "px", baseline: { dir: "dots", spacing: 24, boldEvery: 4, offset: 0, margins: m(0) } } },
    { cat: "baseline", name: "Baseline 16 px", grid: { type: "baseline", unit: "px", baseline: { dir: "h", spacing: 16, boldEvery: 0, offset: 0, margins: m(0) } } },
    // ---------------------------------------------------------------- Composizione
    { cat: "comp", name: { it: "Spirale aurea", en: "Golden spiral" }, grid: { type: "comp", unit: "px", comp: { family: "classic", variant: "spiral" } } },
    { cat: "comp", name: { it: "Regola dei terzi", en: "Rule of thirds" }, grid: { type: "comp", unit: "px", comp: { family: "classic", variant: "thirds" } } },
    { cat: "comp", name: { it: "Griglia Phi", en: "Phi grid" }, grid: { type: "comp", unit: "px", comp: { family: "classic", variant: "phi" } } },
    { cat: "comp", name: { it: "Simmetria dinamica (armatura 14)", en: "Dynamic symmetry (14-line armature)" }, grid: { type: "comp", unit: "px", comp: { family: "symmetry", variant: "armature" } } },
    { cat: "comp", name: { it: "Isometrica 40 px", en: "Isometric 40 px" }, grid: { type: "comp", unit: "px", comp: { family: "geom", variant: "isometric", spacing: 40 } } },
    // ---------------------------------------------------------------- Studio (logo, icone, illustrazione)
    { cat: "studio", name: { it: "Logo: cerchi aurei", en: "Logo: golden circles" }, grid: { type: "comp", unit: "px", comp: { family: "studio", variant: "goldenCircles" } } },
    { cat: "studio", name: { it: "Icona 24: keyline", en: "Icon 24: keylines" }, grid: { type: "comp", unit: "px", comp: { family: "studio", variant: "keylines" } } },
    { cat: "studio", name: { it: "Prospettiva a 2 punti", en: "2-point perspective" }, grid: { type: "comp", unit: "px", comp: { family: "studio", variant: "persp2", count: 16 } } },
    { cat: "studio", name: { it: "Prospettiva a 3 punti", en: "3-point perspective" }, grid: { type: "comp", unit: "px", comp: { family: "studio", variant: "persp3", count: 16 } } },
    // ---------------------------------------------------------------- Social (zone sicure)
    { cat: "social", name: { it: "Instagram Story: zone sicure", en: "Instagram Story: safe zones" }, grid: { type: "comp", unit: "px", comp: { family: "social", variant: "igStory" } } },
    { cat: "social", name: { it: "Instagram Reel: zone sicure", en: "Instagram Reel: safe zones" }, grid: { type: "comp", unit: "px", comp: { family: "social", variant: "igReel" } } },
    { cat: "social", name: { it: "TikTok: zone sicure", en: "TikTok: safe zones" }, grid: { type: "comp", unit: "px", comp: { family: "social", variant: "tiktok" } } },
    { cat: "social", name: { it: "Post IG 4:5 con ritaglio profilo 3:4", en: "IG 4:5 post with 3:4 profile crop" }, grid: { type: "comp", unit: "px", comp: { family: "social", variant: "igProfile" } } },
    { cat: "social", name: { it: "Miniatura YouTube", en: "YouTube thumbnail" }, grid: { type: "comp", unit: "px", comp: { family: "social", variant: "ytThumb" } } },
    { cat: "social", name: { it: "Banner YouTube: area sicura", en: "YouTube banner: safe area" }, grid: { type: "comp", unit: "px", comp: { family: "social", variant: "ytBanner" } } }
  ];

  list.forEach(function (p, i) {
    p.id = "builtin:" + i;
    p.builtin = true;
    p.tags = [p.cat];
  });

  return { CATEGORIES: ["web", "mobile", "print", "bento", "baseline", "comp", "studio", "social"], list: list };
});
