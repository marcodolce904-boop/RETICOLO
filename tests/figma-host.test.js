// Esegue figma/code.js contro un'API Figma finta e controlla i messaggi, i nodi creati e i layout grid.
var test = require("node:test");
var assert = require("node:assert/strict");
var fs = require("node:fs");
var path = require("node:path");
var vm = require("node:vm");
var cp = require("node:child_process");

var CODE = fs.readFileSync(path.join(__dirname, "..", "figma", "code.js"), "utf8");
var STYLE = { stroke: "#00B8D9", fill: "#00B8D9", sw: 1, fa: 12, bold: 2 };

function makeNode(type, props) {
  var n = {
    type: type, name: type, children: type === "FRAME" || type === "GROUP" || type === "COMPONENT" || type === "SECTION" || type === "INSTANCE" ? [] : undefined,
    parent: null, width: 100, height: 100, x: 0, y: 0, visible: true, locked: false, removed: false, fills: [], layoutGrids: [],
    relativeTransform: [[1, 0, 0], [0, 1, 0]], _data: {}, id: "n" + (makeNode.seq = (makeNode.seq || 0) + 1),
    getPluginData: function (k) { return this._data[k] || ""; },
    setPluginData: function (k, v) { this._data[k] = v; },
    appendChild: function (c) {
      if (c.parent && c.parent.children) c.parent.children.splice(c.parent.children.indexOf(c), 1);
      c.parent = this; this.children.push(c);
    },
    remove: function () {
      if (this.parent && this.parent.children) this.parent.children.splice(this.parent.children.indexOf(this), 1);
      this.removed = true;
    },
    clone: function () {
      var c = makeNode(this.type, { width: this.width, height: this.height });
      c.name = this.name + " copy";
      this.parent.appendChild(c);
      return c;
    }
  };
  for (var k in props || {}) n[k] = props[k];
  return n;
}

function setup() {
  var page = { type: "PAGE", children: [], selection: [] }, posted = [], handlers = {}, saved = {};
  var all = {};
  function reg(n) { all[n.id] = n; return n; }
  var figma = {
    showUI: function (html, opts) { figma._ui = opts; },
    ui: { postMessage: function (m) { posted.push(m); }, onmessage: null },
    clientStorage: {
      getAsync: function () { return Promise.resolve(saved.value); },
      setAsync: function (k, v) { saved.value = JSON.parse(JSON.stringify(v)); return Promise.resolve(); }
    },
    currentPage: page, root: { name: "Demo" },
    on: function (ev, fn) { handlers[ev] = fn; },
    notify: function () {},
    createNodeFromSvg: function (svg) { var n = reg(makeNode("FRAME", { svg: svg })); n.width = 100; n.height = 100; return n; },
    group: function (nodes, parent) {
      var g = reg(makeNode("GROUP"));
      parent.appendChild(g);
      nodes.forEach(function (c) { g.appendChild(c); });
      return g;
    },
    getNodeByIdAsync: function (id) { return Promise.resolve(all[id] || null); }
  };
  var ctx = vm.createContext({ figma: figma, __html__: "<html>", Promise: Promise, JSON: JSON, Infinity: Infinity, Math: Math });
  vm.runInContext(CODE, ctx);
  function frame(name, w, h) {
    var f = reg(makeNode("FRAME", { name: name, width: w, height: h }));
    f.parent = page; page.children.push(f);
    return f;
  }
  function call(fn, payload) {
    var id = (call.id = (call.id || 0) + 1);
    figma.ui.onmessage({ type: "call", id: id, fn: fn, payload: payload });
    return new Promise(function (resolve) {
      (function wait() {
        var r = posted.filter(function (m) { return m.type === "result" && m.id === id; })[0];
        if (r) resolve(plain(r.value)); else setImmediate(wait);
      })();
    });
  }
  return { figma: figma, page: page, posted: posted, frame: frame, call: call, handlers: handlers, saved: saved, reg: reg };
}

// l'oggetto creato nel contesto vm ha un altro prototipo: per confrontarlo si passa da JSON
function plain(x) { return x === undefined ? x : JSON.parse(JSON.stringify(x)); }

function payload(targets, extra) {
  var p = { layer: "Reticolo", mode: "stroke", style: STYLE, lock: false, targets: targets };
  for (var k in extra || {}) p[k] = extra[k];
  return p;
}

test("il pannello è un'iframe con i colori del tema di Figma", function () {
  var s = setup();
  assert.equal(s.figma._ui.themeColors, true);
});

test("ready: il codice risponde con l'archivio salvato, e i salvataggi si accumulano", async function () {
  var s = setup();
  s.figma.ui.onmessage({ type: "ready" });
  await new Promise(function (r) { setImmediate(r); });
  assert.deepEqual(plain(s.posted.filter(function (m) { return m.type === "init"; })[0].store), {});
  s.figma.ui.onmessage({ type: "store", path: "reticolo/library.json", data: "{}" });
  await new Promise(function (r) { setTimeout(r, 5); });
  s.figma.ui.onmessage({ type: "store", path: "reticolo/settings.json", data: "{\"a\":1}" });
  await new Promise(function (r) { setTimeout(r, 5); });
  assert.deepEqual(s.saved.value, { "reticolo/library.json": "{}", "reticolo/settings.json": "{\"a\":1}" });
});

test("info: senza frame doc è false; con frame elenca artboard, attivo, oggetti e selezione", async function () {
  var s = setup();
  assert.deepEqual(await s.call("info"), { app: "FIGMA", doc: false });
  var a = s.frame("Desktop", 1440, 900), b = s.frame("Mobile", 390, 844);
  var rect = s.reg(makeNode("RECTANGLE", { name: "Hero", width: 600, height: 300 })), text = s.reg(makeNode("TEXT")), card = s.reg(makeNode("FRAME", { name: "Card" }));
  b.appendChild(rect); b.appendChild(card); b.appendChild(text);
  s.page.selection = [rect];
  var info = await s.call("info");
  assert.equal(info.app, "FIGMA");
  assert.deepEqual(info.artboards.map(function (x) { return [x.i, x.name, x.w, x.h]; }), [[0, "Desktop", 1440, 900], [1, "Mobile", 390, 844]]);
  assert.equal(info.active, 1, "il frame della selezione è quello attivo");
  assert.equal(info.layerName, "Mobile");
  assert.deepEqual(info.objects.map(function (o) { return o.name; }), ["Hero", "Card"], "solo oggetti chiusi, niente testi");
  assert.equal(info.selection.name, "Hero");
  assert.equal(info.selection.kind, "rectangle");
  assert.equal(a.children.length, 0);
});

test("info: le sezioni contengono frame e i nodi di Reticolo non sono oggetti", async function () {
  var s = setup();
  var sec = s.reg(makeNode("SECTION", { name: "Sezione" })), f = s.reg(makeNode("FRAME", { name: "In sezione", width: 500, height: 400 }));
  sec.parent = s.page; s.page.children.push(sec); sec.appendChild(f);
  var ours = s.reg(makeNode("RECTANGLE")); ours.setPluginData("rtc", "1"); f.appendChild(ours);
  var info = await s.call("info");
  assert.equal(info.artboards.length, 1);
  assert.equal(info.artboards[0].name, "In sezione");
  assert.equal(info.objects.length, 0);
});

test("draw: griglia come SVG nel livello, ridisegnarla sostituisce, clear la toglie", async function () {
  var s = setup(), f = s.frame("Desktop", 1440, 900);
  var prims = [{ t: "L", a: [10, 0, 10, 900] }, { t: "L", a: [20, 0, 20, 900], b: 1 }, { t: "P", p: [[0, 0], [5, 5]] }, { t: "R", a: [0, 0, 50, 50] }];
  var res = await s.call("draw", payload([{ i: 0, prims: prims }]));
  assert.deepEqual(res, { ok: true, count: 1 });
  assert.equal(f.children.length, 1);
  var n = f.children[0];
  assert.equal(n.name, "Reticolo");
  assert.equal(n.getPluginData("rtc"), "1");
  assert.match(n.svg, /viewBox="0 0 1440 900"/);
  assert.match(n.svg, /<path d="M10 0L10 900M?[^"]*"[^>]*stroke="#00B8D9" stroke-width="1"/, "linee sottili in una sola path");
  assert.match(n.svg, /stroke-width="2"/, "la linea forte ha lo spessore moltiplicato");
  assert.match(n.svg, /<rect x="0" y="0" width="50" height="50"\/>/);
  await s.call("draw", payload([{ i: 0, prims: prims }]));
  assert.equal(f.children.length, 1, "nessun livello doppio");
  var userNode = s.reg(makeNode("RECTANGLE")); f.appendChild(userNode);
  await s.call("clear", { layer: "Reticolo", targets: [{ i: 0 }] });
  assert.deepEqual(f.children.length === 1 && f.children[0] === userNode, true, "Cancella toglie solo ciò che ha creato Reticolo");
});

test("draw: modi celle piene e molte celle in un solo tracciato", async function () {
  var s = setup(), f = s.frame("F", 800, 600);
  await s.call("draw", payload([{ i: 0, prims: [{ t: "R", a: [0, 0, 10, 10] }] }], { mode: "fill" }));
  assert.match(f.children[0].svg, /fill="#00B8D9" fill-opacity="0.12" stroke="none"/);
  var many = [];
  for (var i = 0; i < 500; i++) many.push({ t: "R", a: [i, 0, 1, 1] });
  await s.call("draw", payload([{ i: 0, prims: many }], { mode: "both" }));
  assert.equal((f.children[0].svg.match(/<rect/g) || []).length, 0);
  assert.match(f.children[0].svg, /<path d="M0 0h1v1h-1Z/);
});

test("layout grid nativi: si aggiungono a quelli dell'utente e Cancella li toglie soltanto", async function () {
  var s = setup(), f = s.frame("Desktop", 1440, 900);
  var mine = { pattern: "ROWS", alignment: "MIN", count: 4, gutterSize: 10, sectionSize: 50, offset: 0, visible: true, color: { r: 1, g: 0, b: 0, a: 0.1 } };
  f.layoutGrids = [mine];
  var specs = [
    { pattern: "COLUMNS", alignment: "STRETCH", count: 12, gutterSize: 24, offset: 80, a: 0.1 },
    { pattern: "ROWS", alignment: "MIN", count: Infinity, gutterSize: 23, sectionSize: 1, offset: 0, a: 0.6 }
  ];
  await s.call("draw", payload([{ i: 0, prims: [], native: { figma: specs } }], { mode: "guides" }));
  assert.equal(f.layoutGrids.length, 3);
  var cols = f.layoutGrids[1];
  assert.equal(cols.pattern, "COLUMNS");
  assert.equal(cols.count, 12);
  assert.equal(cols.offset, 80);
  assert.equal("sectionSize" in cols, false, "con STRETCH la dimensione della sezione si ignora");
  assert.deepEqual(plain(cols.color), { r: 0, g: 184 / 255, b: 217 / 255, a: 0.1 });
  assert.equal(f.layoutGrids[2].count, Infinity);
  assert.equal(f.children.length, 0, "nessun livello di linee se la griglia è tutta nativa");
  // ridisegnando non si accumulano
  await s.call("draw", payload([{ i: 0, prims: [], native: { figma: specs } }], { mode: "guides" }));
  assert.equal(f.layoutGrids.length, 3);
  await s.call("clear", { layer: "Reticolo", targets: [{ i: 0 }] });
  assert.deepEqual(f.layoutGrids.length === 1 && f.layoutGrids[0] === mine, true);
});

test("griglia in un oggetto: frame = dentro l'oggetto; forma = gruppo con maschera; Cancella la toglie", async function () {
  var s = setup(), f = s.frame("Desktop", 1440, 900);
  var card = s.reg(makeNode("FRAME", { name: "Card", width: 300, height: 200 })), shape = s.reg(makeNode("ELLIPSE", { name: "Badge", width: 120, height: 120 }));
  f.appendChild(card); f.appendChild(shape);
  var prims = [{ t: "L", a: [0, 0, 100, 100] }];
  await s.call("draw", payload([{ obj: card.id, prims: prims }, { obj: shape.id, prims: prims }]));
  assert.equal(card.children.length, 1);
  assert.equal(card.children[0].name, "RTC:o:" + card.id);
  var group = f.children.filter(function (c) { return c.type === "GROUP"; })[0];
  assert.ok(group, "gruppo con maschera");
  assert.equal(group.name, "RTC:o:" + shape.id);
  assert.equal(group.children[0].isMask, true, "la maschera è sotto le linee");
  assert.equal(group.children.length, 2);
  // le operazioni sull'artboard non toccano le griglie degli oggetti
  await s.call("draw", payload([{ i: 0, prims: prims }]));
  await s.call("clear", { layer: "Reticolo", targets: [{ i: 0 }] });
  assert.equal(card.children.length, 1);
  assert.ok(f.children.indexOf(group) >= 0);
  await s.call("clear", { layer: "Reticolo", targets: [{ obj: card.id }, { obj: shape.id }] });
  assert.equal(card.children.length, 0);
  assert.equal(f.children.indexOf(group), -1);
});

test("layerState e setLayer: visibilità, blocco e rinomina del livello", async function () {
  var s = setup(), f = s.frame("A", 400, 300), g = s.frame("B", 400, 300);
  assert.deepEqual(await s.call("layerState", { layer: "Reticolo" }), { exists: false, visible: true, locked: false });
  await s.call("draw", payload([{ i: 0, prims: [{ t: "L", a: [0, 0, 1, 1] }] }, { i: 1, prims: [{ t: "L", a: [0, 0, 1, 1] }] }]));
  var r = await s.call("setLayer", { layer: "Reticolo", visible: false, locked: true });
  assert.deepEqual(r, { ok: true, visible: false, locked: true });
  assert.equal(f.children[0].visible, false);
  var r2 = await s.call("setLayer", { layer: "Reticolo", rename: "Griglia" });
  assert.equal(f.children[0].name, "Griglia");
  assert.equal(g.children[0].name, "Griglia");
  assert.equal(r2.ok, true);
});

test("errori: chiamata sconosciuta e bersaglio sparito", async function () {
  var s = setup();
  s.frame("A", 100, 100);
  assert.match((await s.call("boh", {})).error, /unknown call/);
  assert.deepEqual(await s.call("draw", payload([{ i: 7, prims: [] }])), { error: "target" });
  assert.deepEqual(await s.call("draw", payload([{ obj: "nope", prims: [] }])), { error: "target" });
});

test("selezione e cambio pagina avvisano il pannello", function () {
  var s = setup();
  s.handlers.selectionchange();
  s.handlers.currentpagechange();
  assert.equal(s.posted.filter(function (m) { return m.type === "event" && m.name === "documentAfterActivate"; }).length, 2);
});

test("il manifest è valido e figma/ui.html è aggiornato", function () {
  var m = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "figma", "manifest.json"), "utf8"));
  assert.equal(m.main, "code.js");
  assert.equal(m.ui, "ui.html");
  assert.deepEqual(m.editorType, ["figma"]);
  assert.equal(m.documentAccess, "dynamic-page");
  assert.deepEqual(m.networkAccess.allowedDomains, ["none"]);
  var r = cp.spawnSync(process.execPath, [path.join(__dirname, "..", "tools", "build-figma.js"), "--check"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});
