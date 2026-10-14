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
