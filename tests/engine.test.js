// node --test tests/
var test = require("node:test");
var assert = require("node:assert/strict");
var E = require("../js/engine.js");

var AB = { w: 1440, h: 900 };
var AI = { app: "ILST" };

function near(a, b, eps) { return Math.abs(a - b) < (eps || 1e-2); }

function within(p, ab) {
  var pts = [];
  if (p.t === "L") pts = [[p.a[0], p.a[1]], [p.a[2], p.a[3]]];
  else if (p.t === "R") pts = [[p.a[0], p.a[1]], [p.a[0] + p.a[2], p.a[1] + p.a[3]]];
  else pts = p.p.map(function (q) { return [q[0], q[1]]; });
  return pts.every(function (q) { return q[0] >= -0.01 && q[1] >= -0.01 && q[0] <= ab.w + 0.01 && q[1] <= ab.h + 0.01; });
}

test("colonne: 12 colonne con gutter e margini riempiono il frame", function () {
  var out = E.build({ type: "columns", columns: { count: 12, gutter: 24, margins: { t: 0, r: 80, b: 0, l: 80 } } }, AB, AI);
  assert.equal(out.prims.length, 12);
  var first = out.prims[0].a, last = out.prims[11].a;
  assert.ok(near(first[0], 80));
  assert.ok(near(last[0] + last[2], 1440 - 80));
  assert.ok(near(out.info.colW, (1280 - 24 * 11) / 12));
});

test("colonne: maxWidth centra il contenitore (960 grid)", function () {
  var out = E.build({ type: "columns", columns: { count: 12, gutter: 20, maxWidth: 940, margins: { t: 0, r: 0, b: 0, l: 0 } } }, AB, AI);
  assert.ok(near(out.prims[0].a[0], 250));
  assert.ok(near(out.info.colW, 60));
});

test("colonne: errore se il gutter non lascia spazio", function () {
  var out = E.build({ type: "columns", columns: { count: 40, gutter: 50 } }, AB, AI);
  assert.equal(out.error, "tooNarrow");
  assert.deepEqual(out.prims, []);
});

test("mm vengono convertiti in punti (Illustrator) e pixel (Photoshop)", function () {
  assert.ok(near(E.unitFactor("mm", { app: "ILST" }), 2.83465));
  assert.ok(near(E.unitFactor("mm", { app: "PHXS", res: 300 }), 11.811));
  assert.equal(E.unitFactor("px", { app: "PHXS", res: 300 }), 1);
});

test("modulare fit: righe x colonne celle", function () {
  var out = E.build({ type: "modular", modular: { cols: 6, rows: 4, gx: 10, gy: 10 } }, AB, AI);
  assert.equal(out.prims.length, 24);
});

test("modulare fixed: moduli centrati di dimensione fissa", function () {
  var out = E.build({ type: "modular", modular: { sizing: "fixed", mw: 100, mh: 100, gx: 20, gy: 20, margins: { t: 0, r: 0, b: 0, l: 0 } } }, { w: 420, h: 200 }, AI);
  assert.equal(out.info.cols, 3);
  assert.equal(out.info.rows, 1);
  assert.ok(near(out.prims[0].a[0], 40));
  assert.ok(near(out.prims[0].a[1], 50));
});

test("baseline: linee ogni N e grassetto ogni k", function () {
  var out = E.build({ type: "baseline", baseline: { dir: "h", spacing: 100, boldEvery: 3 } }, { w: 500, h: 900 }, AI);
  assert.equal(out.prims.length, 10);
  assert.equal(out.prims[0].b, 1);
  assert.equal(out.prims[1].b, undefined);
  assert.equal(out.prims[3].b, 1);
});

test("baseline troppo densa restituisce errore", function () {
  var out = E.build({ type: "baseline", baseline: { dir: "both", spacing: 0.1 } }, AB, AI);
  assert.equal(out.error, "tooDense");
});

test("ogni variante di composizione produce primitive dentro l'artboard", function () {
  Object.keys(E.VARIANTS).forEach(function (fam) {
    E.VARIANTS[fam].forEach(function (v) {
      [AB, { w: 600, h: 1000 }].forEach(function (ab) {
        [false, true].forEach(function (flip) {
          var out = E.build({ type: "comp", comp: { family: fam, variant: v, flipH: flip, flipV: flip } }, ab, AI);
          assert.equal(out.error, undefined, v);
          assert.ok(out.prims.length > 0, v);
          out.prims.forEach(function (p) { assert.ok(within(p, ab), v + " fuori artboard: " + JSON.stringify(p).slice(0, 120)); });
        });
      });
    });
  });
});

test("spirale aurea: tracciato Bezier continuo che parte da un angolo", function () {
  var out = E.build({ type: "comp", comp: { variant: "spiral" } }, { w: 1618.034, h: 1000 }, AI);
  var sp = out.prims.filter(function (p) { return p.t === "B"; })[0];
  assert.ok(sp);
  assert.equal(sp.p.length, 11);
  assert.ok(near(sp.p[0][0], 0) && near(sp.p[0][1], 1000));
  assert.ok(near(sp.p[1][0], 1000) && near(sp.p[1][1], 0));
});

test("terzi: linee a 1/3 e 2/3", function () {
  var out = E.build({ type: "comp", comp: { variant: "thirds" } }, { w: 900, h: 600 }, AI);
  var xs = out.prims.filter(function (p) { return p.a[0] === p.a[2]; }).map(function (p) { return p.a[0]; });
  assert.deepEqual(xs, [300, 600]);
});

test("reciproche della diagonale sono perpendicolari", function () {
  var out = E.build({ type: "comp", comp: { variant: "sinister" } }, { w: 1000, h: 600 }, AI);
  var d = out.prims[0].a, r = out.prims[1].a;
  var dot = (d[2] - d[0]) * (r[2] - r[0]) + (d[3] - d[1]) * (r[3] - r[1]);
  assert.ok(Math.abs(dot) < 1);
});

test("toGuides estrae verticali/orizzontali uniche e lascia le oblique", function () {
  var out = E.build({ type: "modular", modular: { cols: 2, rows: 2, gx: 0, gy: 0, margins: { t: 0, r: 0, b: 0, l: 0 } } }, { w: 100, h: 100 }, AI);
  var g = E.toGuides(out.prims);
  assert.deepEqual(g.v, [0, 50, 100]);
  assert.deepEqual(g.h, [0, 50, 100]);
  var c = E.build({ type: "comp", comp: { variant: "harmonic" } }, { w: 100, h: 50 }, AI);
  assert.equal(E.toGuides(c.prims).rest.length, 6);
});

test("clipPolyline spezza le parti fuori dal rettangolo", function () {
  var parts = E.clipPolyline([[-10, 5], [5, 5], [20, 5], [20, 20], [5, 20]], false, { x: 0, y: 0, w: 10, h: 10 });
  assert.equal(parts.length, 1);
  assert.deepEqual(parts[0].p, [[0, 5], [5, 5], [10, 5]]);
});

test("normalize completa griglie parziali (file di libreria vecchi)", function () {
  var g = E.normalize({ type: "baseline", baseline: { spacing: 12 } });
  assert.equal(g.baseline.spacing, 12);
  assert.equal(g.baseline.dir, "h");
  assert.equal(g.columns.count, 12);
});

test("colonne asimmetriche: rapporti 2 1 1 e Fibonacci", function () {
  var out = E.build({ type: "columns", columns: { ratios: "2 1 1", gutter: 20, margins: { t: 0, r: 0, b: 0, l: 0 } } }, { w: 440, h: 100 }, AI);
  assert.equal(out.prims.length, 3);
  assert.ok(near(out.prims[0].a[2], 200) && near(out.prims[1].a[2], 100) && near(out.prims[2].a[2], 100));
  assert.equal(E.build({ type: "columns", columns: { ratios: "1:1:2:3:5" } }, AB, AI).prims.length, 5);
  // rapporti non validi: si torna al numero di colonne
  assert.equal(E.build({ type: "columns", columns: { count: 6, ratios: "2 x 1" } }, AB, AI).prims.length, 6);
});

test("baseline sovrapposta: moduli e gutter agganciati all'interlinea", function () {
  var out = E.build({ type: "modular", modular: { cols: 2, rows: 3, gx: 10, gy: 10, lead: 12, margins: { t: 0, r: 0, b: 0, l: 0 } } }, { w: 400, h: 400 }, AI);
  var cells = out.prims.filter(function (p) { return p.t === "R"; });
  var lines = out.prims.filter(function (p) { return p.t === "L"; });
  assert.equal(cells.length, 6);
  assert.equal(cells[0].a[3] % 12, 0, "altezza modulo multipla dell'interlinea");
  assert.equal((cells[2].a[1] - cells[0].a[1] - cells[0].a[3]) % 12, 0, "gutter multiplo dell'interlinea");
  assert.ok(lines.length > 30);
  assert.ok(E.build({ type: "columns", columns: { lead: 12 } }, AB, AI).prims.length > 12);
});

test("dot grid: un punto per incrocio, punti grandi ogni N", function () {
  var out = E.build({ type: "baseline", baseline: { dir: "dots", spacing: 100, boldEvery: 2 } }, { w: 400, h: 200 }, AI);
  assert.equal(out.prims.length, 15);
  assert.ok(out.prims.every(function (p) { return p.t === "P" && p.c; }));
});

test("protezione: griglie enormi restituiscono tooDense invece di bloccare l'app", function () {
  assert.equal(E.build({ type: "modular", modular: { sizing: "fixed", mw: 1, mh: 1, gx: 0, gy: 0 } }, AB, AI).error, "tooDense");
  assert.equal(E.build({ type: "modular", modular: { cols: 100, rows: 100, gx: 0, gy: 0 } }, AB, AI).error, "tooDense");
  assert.equal(E.build({ type: "comp", comp: { variant: "hexagonal", spacing: 1 } }, AB, AI).error, "tooDense");
  assert.equal(E.build({ type: "baseline", baseline: { dir: "dots", spacing: 2 } }, AB, AI).error, "tooDense");
  assert.equal(E.build({ type: "baseline", baseline: { dir: "dots", spacing: 16 } }, { w: 1080, h: 1920 }, AI).error, undefined);
});

test("zone social: fasce nelle proporzioni del formato di riferimento", function () {
  var st = E.build({ type: "comp", comp: { variant: "igStory" } }, { w: 1080, h: 1920 }, AI).prims;
  assert.equal(st.length, 2);
  assert.ok(near(st[0].a[3], 250) && near(st[1].a[1], 1670));
  var pr = E.build({ type: "comp", comp: { variant: "igProfile" } }, { w: 1080, h: 1350 }, AI).prims;
  assert.ok(near(pr[0].a[2], (1080 - 1012.5) / 2));
});

test("prospettiva: i raggi partono dai punti di fuga sull'orizzonte", function () {
  var out = E.build({ type: "comp", comp: { variant: "persp1", count: 16 } }, { w: 1000, h: 600 }, AI);
  assert.equal(out.prims.length, 17);
  var rays = out.prims.slice(1);
  assert.ok(rays.every(function (p) { return near(p.a[0], 500) && near(p.a[1], 210); }));
});

// ---------------------------------------------------------------- layout logo (unita' X)

function logoOf(variant, extra, ab) {
  var comp = { family: "logo", variant: variant };
  Object.keys(extra || {}).forEach(function (k) { comp[k] = extra[k]; });
  return E.build({ type: "comp", comp: comp }, ab || { w: 800, h: 500 }, AI);
}

test("logo a sinistra: con X esatto ogni distanza e' un multiplo di X", function () {
  var out = logoOf("logoLeftX", { x: 20 });
  var outer = out.prims[0].a, inner = out.prims[1].a, sym = out.prims[2].a, word = out.prims[3].a;
  assert.deepEqual([outer[2], outer[3]], [340, 120], "(2 + 4 + 1 + 10) x (2 + 4) unita'");
  assert.deepEqual([outer[0], outer[1]], [230, 190], "centrato nel riquadro");
  assert.deepEqual([inner[0] - outer[0], inner[1] - outer[1]], [20, 20], "spazio libero 1X");
  assert.deepEqual([sym[2], sym[3]], [80, 80], "simbolo 4X");
  assert.equal(word[0] - (sym[0] + sym[2]), 20, "distanza simbolo-logotipo 1X");
  assert.deepEqual([word[2], word[3]], [200, 40], "logotipo 10X x 2X");
  assert.equal(word[1] + word[3] / 2, sym[1] + sym[3] / 2, "centrati sullo stesso asse");
  var squares = out.prims.filter(function (p) { return p.t === "R" && p.a[2] === 20 && p.a[3] === 20; });
  assert.equal(squares.length, 5, "quattro lati + la distanza simbolo-logotipo");
});

test("logo in alto: simbolo e logotipo centrati sullo stesso asse verticale", function () {
  var out = logoOf("logoTop", { x: 10, sym: 4, ww: 12, wh: 2, gap: 1.5 });
  var sym = out.prims[2].a, word = out.prims[3].a;
  assert.equal(sym[0] + sym[2] / 2, word[0] + word[2] / 2);
  assert.equal(word[1] - (sym[1] + sym[3]), 15, "distanza 1,5X");
});

test("spazio libero 1,5X e riflessione orizzontale", function () {
  var a = logoOf("logoLeft", { x: 20, clear: 1.5 });
  assert.equal(a.prims[1].a[0] - a.prims[0].a[0], 30);
  var left = logoOf("logoLeft", { x: 20 }), right = logoOf("logoLeft", { x: 20, flipH: true });
  assert.ok(left.prims[2].a[0] < left.prims[3].a[0], "normale: simbolo a sinistra");
  assert.ok(right.prims[2].a[0] > right.prims[3].a[0], "riflesso: simbolo a destra");
});

test("X automatico: il lockup riempie il riquadro e non lo supera", function () {
  [{ w: 800, h: 500 }, { w: 300, h: 900 }, { w: 120, h: 120 }].forEach(function (ab) {
    ["logoTop", "logoLeftX", "typelogo", "logoTagline"].forEach(function (v) {
      var out = logoOf(v, {}, ab), o = out.prims[0].a;
      assert.ok(o[0] >= -0.01 && o[1] >= -0.01 && o[0] + o[2] <= ab.w + 0.01 && o[1] + o[3] <= ab.h + 0.01, v);
      assert.ok(near(o[2], ab.w, 0.05) || near(o[3], ab.h, 0.05), v + " tocca almeno due lati");
    });
  });
  assert.ok(logoOf("logoLeftX").info.x > 0, "l'X usato viene restituito");
});

test("X troppo grande per il riquadro: errore invece di uscire dai bordi", function () {
  assert.equal(logoOf("logoLeftX", { x: 60 }).error, "tooNarrow");
});

test("typelogo: linea di base e altezza della x dentro il logotipo", function () {
  var out = logoOf("typelogo", { x: 20, ww: 10, wh: 2 });
  var word = out.prims[2].a;
  var bold = out.prims.filter(function (p) { return p.b; })[0].a;
  assert.equal(bold[1], word[1] + word[3], "linea di base sul bordo inferiore");
  var xh = out.prims.filter(function (p) { return p.t === "L" && !p.b && p.a[1] === p.a[3] && p.a[1] > word[1] && p.a[1] < word[1] + word[3]; })[0];
  assert.ok(near(word[1] + word[3] - xh.a[1], word[3] * 0.7, 0.01), "x-height al 70% delle maiuscole");
});

test("type (linee): cinque linee, la linea di base e' in grassetto", function () {
  var out = logoOf("typeLines", {}, { w: 600, h: 400 });
  assert.equal(out.prims.length, 5);
  assert.equal(out.prims.filter(function (p) { return p.b; }).length, 1);
  assert.deepEqual(out.prims.map(function (p) { return p.a[1]; }), [0, 24, 104, 312, 400]);
});

// ---- layout di lettura e interfacce, doppia pagina, cerchi
function comp(family, variant, ab, extra) {
  var c = { family: family, variant: variant };
  for (var k in extra || {}) c[k] = extra[k];
  return E.build({ type: "comp", comp: c }, ab || { w: 900, h: 600 }, AI);
}

test("doppia pagina: blocchi del canone con margini 2/9 e 1/9, dorso in grassetto", function () {
  var out = comp("classic", "spread");
  var rects = out.prims.filter(function (p) { return p.t === "R"; });
  assert.equal(rects.length, 2);
  var l = rects[0].a, r = rects[1].a;
  assert.ok(near(l[0], 100) && near(l[2], 300), "pagina sinistra: esterno 2/9, interno 1/9");
  assert.ok(near(r[0], 500) && near(r[0] + r[2], 800), "pagina destra speculare");
  assert.ok(near(l[1], 600 / 9) && near(600 - (l[1] + l[3]), 600 * 2 / 9), "alto H/9, basso 2H/9");
  var spine = out.prims.filter(function (p) { return p.t === "L" && p.b; })[0];
  assert.ok(spine && near(spine.a[0], 450) && near(spine.a[2], 450));
});

test("Gutenberg: croce centrale e diagonale forte in alto a sinistra", function () {
  var out = comp("layout", "gutenberg");
  assert.equal(out.prims.length, 3);
  var d = out.prims.filter(function (p) { return p.b; })[0];
  assert.deepEqual(d.a, [0, 0, 900, 600]);
});

test("lettura a Z: un solo tracciato aperto a 4 punti", function () {
  var out = comp("layout", "zPattern");
  assert.equal(out.prims.length, 1);
  assert.equal(out.prims[0].p.length, 4);
  assert.ok(near(out.prims[0].p[0][1], out.prims[0].p[1][1]) && near(out.prims[0].p[2][1], out.prims[0].p[3][1]));
});

test("lettura a F: due barre e gambo forte a sinistra", function () {
  var out = comp("layout", "fPattern");
  var bars = out.prims.filter(function (p) { return !p.b; });
  assert.equal(bars.length, 2);
  assert.ok(bars[0].a[2] - bars[0].a[0] > bars[1].a[2] - bars[1].a[0], "la seconda barra è più corta");
  assert.ok(out.prims.some(function (p) { return p.b && near(p.a[0], p.a[2]); }));
});

test("lista + dettaglio e pannello di supporto: 1/3 e 2/3 con gutter", function () {
  var ld = comp("layout", "listDetail").prims, sp = comp("layout", "supportingPane").prims;
  assert.ok(near(ld[0].a[2] / (ld[0].a[2] + ld[1].a[2]), 1 / 3, 0.005));
  assert.ok(near(sp[0].a[2] / (sp[0].a[2] + sp[1].a[2]), 2 / 3, 0.005));
  assert.ok(ld[1].a[0] > ld[0].a[0] + ld[0].a[2], "c'è un gutter");
});

test("app shell: barra laterale W/6 e barra superiore H/14", function () {
  var r = comp("layout", "appShell").prims.filter(function (p) { return p.t === "R"; });
  assert.equal(r.length, 3);
  assert.ok(near(r[0].a[2], 150) && near(r[1].a[3], 600 / 14));
});

test("vesica piscis: due cerchi con i centri a distanza r, due triangoli equilateri", function () {
  var out = comp("studio", "vesica");
  assert.equal(out.prims.filter(function (p) { return p.t === "B"; }).length, 2);
  var tris = out.prims.filter(function (p) { return p.t === "P"; });
  assert.equal(tris.length, 2);
  var a = tris[0].p;
  var side = Math.sqrt(Math.pow(a[1][0] - a[0][0], 2) + Math.pow(a[1][1] - a[0][1], 2));
  var s2 = Math.sqrt(Math.pow(a[2][0] - a[0][0], 2) + Math.pow(a[2][1] - a[0][1], 2));
  assert.ok(near(side, s2, 0.01), "triangolo equilatero");
  assert.ok(near(side, 300), "lato = raggio");
});

test("reticoli di cerchi: niente fuori dal riquadro, tooDense a passo minuscolo", function () {
  ["circlesTri", "circlesSquare"].forEach(function (v) {
    var out = comp("studio", v, { w: 900, h: 600 }, { spacing: 80 });
    assert.equal(out.error, undefined, v);
    out.prims.forEach(function (p) { assert.ok(within(p, { w: 900, h: 600 }), v); });
    assert.equal(comp("studio", v, { w: 900, h: 600 }, { spacing: 1 }).error, "tooDense", v);
  });
});

test("icona Android adaptive: canvas 108, area sicura 72, cerchio 66 (in unità del riquadro)", function () {
  var out = comp("studio", "androidIcon", { w: 540, h: 540 });
  var rects = out.prims.filter(function (p) { return p.t === "R"; });
  assert.ok(near(rects[1].a[0], 90) && near(rects[1].a[2], 360), "inset 18/108");
  var circle = out.prims.filter(function (p) { return p.t === "B"; })[0];
  var xs = circle.p.map(function (q) { return q[0]; });
  assert.ok(near(Math.max.apply(null, xs) - Math.min.apply(null, xs), 330, 0.5), "diametro 66/108");
});

test("pieghe: il preset lettera a C ha ante 97 / 100 / 100", function () {
  var P = require("../js/presets.js");
  var pr = P.list.filter(function (p) { return p.grid.columns && p.grid.columns.ratios === "97 100 100"; })[0];
  assert.ok(pr);
  var out = E.build(pr.grid, { w: 297, h: 210 }, AI);
  var w = out.prims.map(function (q) { return q.a[2]; });
  assert.deepEqual(w.map(Math.round), [97, 100, 100]);
});

test("tutti i preset si costruiscono su formati diversi", function () {
  var P = require("../js/presets.js");
  [[595, 842], [1080, 1920], [1440, 900]].forEach(function (s) {
    P.list.forEach(function (p) {
      var out = E.build(JSON.parse(JSON.stringify(p.grid)), { w: s[0], h: s[1] }, AI);
      assert.equal(out.error, undefined, JSON.stringify(p.name));
      assert.ok(out.prims.length > 0, JSON.stringify(p.name));
    });
  });
});

test("mirrorX: specchia linee, rettangoli e tracciati; due volte restituisce l'originale", function () {
  var prims = [{ t: "L", a: [10, 0, 30, 50], b: 1 }, { t: "R", a: [100, 5, 300, 400] }, { t: "P", p: [[72, 60], [828, 60]] }, { t: "B", p: [[0, 0], [10, 20]] }];
  var m = E.mirrorX(prims, 900);
  assert.deepEqual(m[0].a, [890, 0, 870, 50]);
  assert.equal(m[0].b, 1, "mantiene lo stile");
  assert.deepEqual(m[1].a, [500, 5, 300, 400]);
  assert.deepEqual(m[2].p, [[828, 60], [72, 60]]);
  assert.deepEqual(E.mirrorX(m, 900), prims);
  assert.equal(prims[0].a[0], 10, "non modifica l'originale");
});

test("canone Van de Graaf specchiato = blocco della pagina sinistra (esterno a sinistra 2/9)", function () {
  var out = E.build({ type: "comp", comp: { family: "classic", variant: "canon" } }, { w: 900, h: 600 }, AI);
  var r = out.prims.filter(function (p) { return p.t === "R"; })[0];
  var m = E.mirrorX([r], 900)[0].a;
  assert.ok(near(m[0] + m[2], 900 - r.a[0]));
});

test("mirrorX: nelle Bezier si specchiano anche le maniglie (spirale aurea intera)", function () {
  var ab = { w: 1440, h: 900 };
  var out = E.build({ type: "comp", comp: { family: "classic", variant: "spiral" } }, ab, AI);
  var m = E.mirrorX(out.prims, ab.w);
  var s0 = out.prims.filter(function (p) { return p.t === "B"; })[0], s1 = m.filter(function (p) { return p.t === "B"; })[0];
  s0.p.forEach(function (pt, i) {
    for (var k = 0; k < 6; k += 2) assert.ok(near(s1.p[i][k], ab.w - pt[k]), "punto " + i + " campo " + k);
    for (k = 1; k < 6; k += 2) assert.ok(near(s1.p[i][k], pt[k]));
  });
  m.forEach(function (p) { assert.ok(within(p, ab)); });
});

// ---- layout web responsive
function webComp(variant, w, h, extra) {
  var c = { family: "web", variant: variant, wgap: 0, margins: { t: 0, r: 0, b: 0, l: 0 } };
  for (var k in extra || {}) c[k] = extra[k];
  return E.build({ type: "comp", comp: c }, { w: w, h: h || 800 }, AI);
}
function rectsOf(out) { return out.prims.filter(function (p) { return p.t === "R"; }).map(function (p) { return p.a; }); }
function overlaps(a, b) { return a[0] < b[0] + b[2] - 0.01 && b[0] < a[0] + a[2] - 0.01 && a[1] < b[1] + b[3] - 0.01 && b[1] < a[1] + a[3] - 0.01; }

test("classi di larghezza: 600 e 840 come le window size classes", function () {
  assert.equal(E.widthClass(599), "compact");
  assert.equal(E.widthClass(600), "medium");
  assert.equal(E.widthClass(839), "medium");
  assert.equal(E.widthClass(840), "expanded");
});

test("bento: le colonne seguono la larghezza (12 / 8 / 4) e i blocchi non si sovrappongono né lasciano buchi", function () {
  [[1440, 12], [700, 8], [390, 4]].forEach(function (c) {
    var out = webComp("bento", c[0]);
    assert.equal(out.error, undefined);
    var r = rectsOf(out);
    assert.equal(r.length, 9);
    r.forEach(function (a, i) {
      assert.ok(a[0] >= -0.01 && a[0] + a[2] <= c[0] + 0.01, "dentro in larghezza");
      r.forEach(function (b, j) { if (i < j) assert.ok(!overlaps(a, b), "sovrapposti " + i + "," + j + " a " + c[0]); });
    });
    var area = r.reduce(function (s, a) { return s + a[2] * a[3]; }, 0);
    assert.ok(near(area, c[0] * 800, 1), "nessun buco con il bento predefinito a " + c[1] + " colonne: " + area);
  });
});

test("bento: misure dei blocchi in colonne e righe, con override per tablet e mobile", function () {
  var out = webComp("bento", 1200, 1000, { items: "6x4 6x4", wrow: 100 });
  var r = rectsOf(out);
  assert.ok(near(r[0][2], 600) && near(r[0][3], 400) && near(r[1][0], 600));
  var tab = rectsOf(webComp("bento", 700, 1000, { items: "6x2/8 6x2", wrow: 100 }));
  assert.ok(near(tab[0][2], 700), "6x2/8: a tablet occupa tutte le 8 colonne");
  var mob = rectsOf(webComp("bento", 390, 1000, { items: "6x2/4/1 6x2/4/3 6x2", wrow: 100 }));
  assert.ok(near(mob[0][2], 390 / 4) && near(mob[1][2], 390 * 3 / 4) && near(mob[2][2], 390 / 2), "override mobile e scala 6 -> 2");
});

test("bento: altezza riga 0 riempie il riquadro, valore fisso lascia fuori ciò che non entra", function () {
  var fit = rectsOf(webComp("bento", 1440, 800));
  assert.ok(near(Math.max.apply(null, fit.map(function (a) { return a[1] + a[3]; })), 800));
  var fixed = rectsOf(webComp("bento", 1440, 300, { wrow: 100 }));
  assert.ok(fixed.length < 9 && fixed.every(function (a) { return a[1] + a[3] <= 300.01; }));
});

test("bento: gutter tra i blocchi e testo non valido", function () {
  var r = rectsOf(webComp("bento", 1210, 800, { items: "6x4 6x4", wgap: 10 }));
  assert.ok(near(r[1][0] - (r[0][0] + r[0][2]), 10));
  assert.equal(webComp("bento", 1440, 800, { items: "6x4 pippo" }).error, "badItems");
  assert.equal(webComp("bento", 1440, 800, { items: "25x1" }).error, "badItems");
});

test("card auto-fit: il numero di colonne dipende dalla larghezza e dalla minima", function () {
  assert.equal(rectsOf(webComp("autoFit", 1440, 600, { wmin: 240, wrows: 1 })).length, 6);
  assert.equal(rectsOf(webComp("autoFit", 600, 600, { wmin: 240, wrows: 1 })).length, 2);
  assert.equal(rectsOf(webComp("autoFit", 200, 600, { wmin: 240, wrows: 2 })).length, 2);
});

test("layout web: ogni variante resta nell'artboard e non sovrappone i blocchi a nessuna classe", function () {
  E.VARIANTS.web.forEach(function (v) {
    [1440, 700, 390].forEach(function (w) {
      var r = rectsOf(webComp(v, w, 900));
      assert.ok(r.length >= 2, v + " " + w);
      r.forEach(function (a, i) {
        assert.ok(a[0] >= -0.01 && a[1] >= -0.01 && a[0] + a[2] <= w + 0.01 && a[1] + a[3] <= 900.01, v + " fuori a " + w);
        r.forEach(function (b, j) { if (i < j) assert.ok(!overlaps(a, b), v + " sovrapposti a " + w + ": " + i + "," + j); });
      });
    });
  });
});

test("spirale e rettangoli aurei: blocco aureo il più grande possibile, centrato, cerchi veri su qualsiasi formato", function () {
  [[1440, 900], [600, 1000], [1080, 1920], [900, 900], [595, 842]].forEach(function (s) {
    var ab = { w: s[0], h: s[1] };
    var out = E.build({ type: "comp", comp: { family: "classic", variant: "spiral" } }, ab, AI);
    var land = ab.w >= ab.h, long = Math.min(land ? ab.w : ab.h, (land ? ab.h : ab.w) * 1.6180339887), short = long / 1.6180339887;
    var bw = land ? long : short, bh = land ? short : long;
    var xs = [], ys = [];
    out.prims.filter(function (p) { return p.t === "L"; }).forEach(function (p) { xs.push(p.a[0], p.a[2]); ys.push(p.a[1], p.a[3]); });
    // il primo quadrato ha lato = lato corto: il primo taglio dista 'short' dal bordo del blocco
    var sp = out.prims.filter(function (p) { return p.t === "B"; })[0];
    var allX = sp.p.map(function (q) { return q[0]; }), allY = sp.p.map(function (q) { return q[1]; });
    assert.ok(Math.min.apply(null, allX) >= (ab.w - bw) / 2 - 0.01 && Math.max.apply(null, allX) <= (ab.w + bw) / 2 + 0.01, s + " blocco in x");
    assert.ok(Math.min.apply(null, allY) >= (ab.h - bh) / 2 - 0.01 && Math.max.apply(null, allY) <= (ab.h + bh) / 2 + 0.01, s + " blocco in y");
    out.prims.forEach(function (p) { assert.ok(within(p, ab), s + " dentro l'artboard"); });
    // primo arco: da (x0, y0+short) a (x0+short, y0): quarto di cerchio con raggio = lato corto
    var a = sp.p[0], b = sp.p[1];
    assert.ok(near(Math.abs(b[0] - a[0]), short, 0.05) && near(Math.abs(b[1] - a[1]), short, 0.05), s + " primo arco circolare");
  });
});

test("breakpoint personalizzati: Tailwind 768 / 1024", function () {
  assert.equal(E.widthClass(700, 768, 1024), "compact");
  assert.equal(E.widthClass(768, 768, 1024), "medium");
  assert.equal(E.widthClass(1024, 768, 1024), "expanded");
  assert.equal(E.widthClass(700), "medium", "senza soglie valgono 600 / 840");
  var r = rectsOf(webComp("bento", 800, 800, { bpM: 768, bpE: 1024, items: "12x1" }));
  assert.ok(near(r[0][2], 800), "a 800 con soglie 768/1024 è tablet: 12 su 12 occupa tutta la riga");
  assert.equal(rectsOf(webComp("bento", 800, 800, { bpM: 768, bpE: 1024, items: "6x1 6x1" })).length, 2);
});

test("bento: colonne per classe personalizzate (16 / 6 / 2)", function () {
  var wide = rectsOf(webComp("bento", 1600, 800, { colsE: 16, items: "4x1 4x1 4x1 4x1", wrow: 100 }));
  assert.ok(near(wide[0][2], 400) && near(wide[3][0], 1200), "4 blocchi da 4 su 16");
  var cols = E.bentoCols({ colsE: 12, colsM: 20, colsC: 9 });
  assert.deepEqual(cols, { expanded: 12, medium: 12, compact: 9 }, "medium e compact non superano la classe sopra");
  var mob = rectsOf(webComp("bento", 400, 800, { colsC: 2, items: "12x1 6x1 6x1", wrow: 100 }));
  assert.ok(near(mob[0][2], 400) && near(mob[1][2], 200) && near(mob[2][0], 200), "mobile a 2 colonne");
});

test("masonry: ogni blocco nella colonna più bassa, colonne diverse per classe", function () {
  var r = rectsOf(webComp("masonry", 1200, 1000, { mitems: "2 1 1 1", mcols: 2, wrow: 100 }));
  assert.equal(r.length, 4);
  assert.ok(near(r[0][0], 0) && near(r[1][0], 600) && near(r[2][0], 600) && near(r[3][0], 0), "il blocco va nella colonna più bassa, a parità nella prima");
  assert.ok(near(r[3][1], 200), "il quarto sta sotto il primo");
  assert.ok(near(r[0][3], 200) && near(r[1][3], 100) && near(r[2][1], 100));
  assert.equal(new Set(rectsOf(webComp("masonry", 1440, 900)).map(function (a) { return a[0].toFixed(1); })).size, 4);
  assert.equal(new Set(rectsOf(webComp("masonry", 700, 900)).map(function (a) { return a[0].toFixed(1); })).size, 3);
  assert.equal(new Set(rectsOf(webComp("masonry", 390, 900)).map(function (a) { return a[0].toFixed(1); })).size, 2);
  assert.equal(webComp("masonry", 1440, 900, { mitems: "3 abc" }).error, "badItems");
});

test("proporzioni interne dei layout web modificabili", function () {
  var hg = rectsOf(webComp("holyGrail", 1440, 1000, { whead: 20, wfoot: 10, wside: 25 }));
  assert.ok(near(hg[0][3], 200) && near(hg[4][3], 100) && near(hg[1][2], 360), "header 20%, footer 10%, sidebar 25%");
  var hero = rectsOf(webComp("heroCards", 1440, 1000, { whero: 60, wcards: 3 }));
  assert.equal(hero.length, 4);
  assert.ok(near(hero[0][3], 600));
  var sp = rectsOf(webComp("split", 1200, 600, { wsplit: 5 }));
  assert.ok(near(sp[0][2], 500));
  var db = rectsOf(webComp("dashboard", 1440, 900, { wnav: 20, wtop: 10, wkpi: 3 }));
  assert.ok(near(db[0][2], 288) && near(db[1][3], 90));
  assert.equal(db.length, 1 + 1 + 3 + 3);
});

test("misure impossibili nei layout web danno un errore e non rettangoli rovesciati", function () {
  assert.equal(webComp("holyGrail", 1440, 800, { whead: 50, wfoot: 50 }).error, "tooNarrow");
  assert.equal(webComp("bento", 100, 800, { wgap: 50 }).error, "tooNarrow");
});

test("ogni layout web ha i suoi campi nel pannello", function () {
  E.VARIANTS.web.forEach(function (v) { assert.ok(E.WEB_FIELDS[v] && E.WEB_FIELDS[v].indexOf("wgap") >= 0, v); });
});
