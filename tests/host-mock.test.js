// Esegue gli script ExtendScript contro un DOM finto (Proxy) per intercettare errori a runtime.
// Non sostituisce la prova nell'app vera: verifica che il codice giri e che crei gli oggetti attesi.
var test = require("node:test");
var assert = require("node:assert/strict");
var vm = require("node:vm");
var fs = require("node:fs");
var path = require("node:path");
var E = require("../js/engine.js");

var HOST = path.join(__dirname, "..", "host");

/** Oggetto "qualsiasi": ogni proprieta' e' un altro oggetto qualsiasi, chiamabile e costruibile. */
function any(name, log) {
  var store = {};
  var fn = function () {};
  return new Proxy(fn, {
    get: function (t, k) {
      if (k === Symbol.toPrimitive) return function () { return 0; };
      if (k === "toString") return function () { return name; };
      if (k in store) return store[k];
      if (k === "length") return 0;
      return (store[k] = any(name + "." + String(k), log));
    },
    set: function (t, k, v) { store[k] = v; return true; },
    apply: function () { if (log) log.push(name + "()"); return any(name + "()", log); },
    construct: function () { return any("new " + name, log); }
  });
}

function collection(make) {
  var arr = [];
  arr.add = function () { var o = make(); arr.push(o); return o; };
  return arr;
}

function run(file, globals) {
  var ctx = vm.createContext(globals);
  vm.runInContext(fs.readFileSync(path.join(HOST, "common.jsx"), "utf8"), ctx, { filename: "common.jsx" });
  vm.runInContext(fs.readFileSync(path.join(HOST, file), "utf8"), ctx, { filename: file });
  return ctx;
}

function payloadFor(grid, abs, app, mode) {
  return {
    layer: "Reticolo", mode: mode, style: { stroke: "#00B8D9", fill: "#00B8D9", sw: 1, fa: 12, bold: 2 }, lock: false,
    targets: abs.map(function (ab) {
      var out = E.build(grid, ab, { app: app, res: 72 }), prims = out.prims, guides = null;
      if (mode === "guides") { var g = E.toGuides(prims); guides = { v: g.v, h: g.h }; prims = g.rest; }
      if (app === "PHXS") prims = E.flattenAll(prims, 12);
      return { i: ab.i, prims: prims, guides: guides, native: null };
    })
  };
}

var GRIDS = [
  { type: "columns" },
  { type: "modular" },
  { type: "baseline", baseline: { boldEvery: 4 } },
  { type: "comp", comp: { variant: "spiral" } },
  { type: "comp", comp: { variant: "pentagon" } },
  { type: "comp", comp: { variant: "harmonic" } }
];
var MODES = ["stroke", "fill", "both", "guides"];

// ------------------------------------------------------------------ Illustrator

function illustratorDOM() {
  var created = { paths: 0, guides: 0, removed: 0 };
  function pathItem() {
    var pts = [];
    return {
      name: "", guides: false, geometricBounds: [10, -10, 20, -20],
      setEntirePath: function (a) { pts = a.map(function () { return { leftDirection: null, rightDirection: null, pointType: null }; }); this.pathPoints = pts; created.paths++; },
      remove: function () {}
    };
  }
  function container() {
    var c = { pageItems: [] };
    c.pathItems = collection(pathItem);
    var addPath = c.pathItems.add;
    c.pathItems.add = function () { var p = addPath(); c.pageItems.push(p); return p; };
    c.pathItems.rectangle = function () { var p = pathItem(); p.setEntirePath([0, 0, 0, 0]); c.pageItems.push(p); return p; };
    c.groupItems = collection(function () {
      var g = container();
      g.geometricBounds = [100, -100, 200, -200];
      g.remove = function () { var k = c.pageItems.indexOf(g); if (k >= 0) c.pageItems.splice(k, 1); created.removed++; };
      c.pageItems.push(g);
      return g;
    });
    return c;
  }
  var layers = collection(function () { var l = container(); l.layers = []; l.remove = function () {}; return l; });
  var d = {
    name: "t.ai", documentColorSpace: "RGB", layers: layers,
    artboards: [{ name: "A", artboardRect: [0, 0, 1440, -900] }, { name: "B", artboardRect: [1500, 0, 1890, -844] }]
  };
  d.artboards.getActiveArtboardIndex = function () { return 1; };
  var globals = {
    app: { documents: { length: 1 }, activeDocument: d, redraw: function () {}, coordinateSystem: "ARTBOARD" },
    CoordinateSystem: { DOCUMENTCOORDINATESYSTEM: "DOCUMENT" },
    DocumentColorSpace: { CMYK: "CMYK", RGB: "RGB" },
    PointType: { SMOOTH: "smooth" },
    RGBColor: function () {}, CMYKColor: function () {}
  };
  return { globals: globals, created: created };
}

test("Illustrator: info, draw in ogni modalita', clear, layer", function () {
  var m = illustratorDOM();
  var R = run("illustrator.jsx", m.globals).Reticolo;
  var info = JSON.parse(R.info());
  assert.equal(info.artboards.length, 2);
  assert.equal(info.artboards[1].w, 390);
  assert.equal(info.active, 1);
  var abs = info.artboards;
  GRIDS.forEach(function (g) {
    MODES.forEach(function (mode) {
      var res = JSON.parse(R.draw(JSON.stringify(payloadFor(g, abs, "ILST", mode))));
      assert.equal(res.error, undefined, g.type + "/" + mode + ": " + res.error);
    });
  });
  assert.ok(m.created.paths > 100);
  assert.ok(m.created.removed > 0, "ridisegnare rimuove la griglia precedente dell'artboard");
  assert.equal(m.globals.app.coordinateSystem, "ARTBOARD", "il sistema di coordinate viene ripristinato");
  assert.equal(JSON.parse(R.clear(JSON.stringify({ layer: "Reticolo", targets: [{ i: 0 }, { i: 1 }] }))).error, undefined);
  assert.equal(JSON.parse(R.setLayer(JSON.stringify({ layer: "Reticolo", visible: false }))).visible, false);
  assert.equal(JSON.parse(R.layerState(JSON.stringify({ layer: "Reticolo" }))).exists, true);
});

// ------------------------------------------------------------------ InDesign

function indesignDOM() {
  var created = { items: 0, guides: 0, native: 0 };
  function item() { created.items++; return { paths: [{}], transparencySettings: { blendingSettings: {} }, remove: function () {} }; }
  function page(i) {
    var g = [];
    g.add = function () { created.guides++; var x = { remove: function () {} }; g.push(x); return x; };
    g.everyItem = function () { return { getElements: function () { return g.slice(); } }; };
    var labels = {};
    var p = {
      insertLabel: function (k, v) { labels[k] = v; }, extractLabel: function (k) { return labels[k] || ""; },
      isValid: true, name: String(i + 1), documentOffset: i, bounds: [0, i * 620, 842, i * 620 + 595],
      rectangles: { add: item }, graphicLines: { add: item }, polygons: { add: item }, guides: g,
      pageItems: { everyItem: function () { return { getElements: function () { return []; } }; } }
    };
    var margins = { top: 36, bottom: 36, left: 36, right: 36, columnCount: 1, columnGutter: 12 };
    Object.defineProperty(p, "marginPreferences", {
      get: function () {
        var o = {};
        Object.keys(margins).forEach(function (k) { o[k] = margins[k]; });
        Object.defineProperty(o, "properties", { set: function (v) { created.native++; Object.keys(v).forEach(function (k) { margins[k] = v[k]; }); } });
        return o;
      }
    });
    p.margins = margins;
    return p;
  }
  var pages = [page(0), page(1)];
  pages.everyItem = function () { return { getElements: function () { return pages; } }; };
  var layerObj = { isValid: true, locked: false, visible: true, id: 7 };
  var d = {
    name: "t.indd", pages: pages, viewPreferences: {}, zeroPoint: [0, 0],
    layers: { itemByName: function () { return layerObj; }, add: function () { return layerObj; } },
    colors: { itemByName: function () { return { isValid: false }; }, add: function () { return {}; } }
  };
  var app = {
    documents: { length: 1 }, activeDocument: d, activeWindow: { activePage: pages[1] }, scriptPreferences: { measurementUnit: "mm" },
    doScript: function (fn) { fn(); }
  };
  var globals = {
    app: app,
    MeasurementUnits: { POINTS: "pt" }, RulerOrigin: { SPREAD_ORIGIN: "spread" },
    ColorModel: { PROCESS: "process" }, ColorSpace: { RGB: "rgb" },
    PathType: { OPEN_PATH: "open", CLOSED_PATH: "closed" },
    HorizontalOrVertical: { VERTICAL: "v", HORIZONTAL: "h" },
    ScriptLanguage: { JAVASCRIPT: "js" }, UndoModes: { ENTIRE_SCRIPT: "entire" }
  };
  return { globals: globals, created: created };
}

test("InDesign: info, draw in ogni modalita', colonne native, clear", function () {
  var m = indesignDOM();
  var R = run("indesign.jsx", m.globals).Reticolo;
  var info = JSON.parse(R.info());
  assert.equal(info.artboards.length, 2);
  assert.equal(info.artboards[0].w, 595);
  assert.equal(info.active, 1);
  GRIDS.forEach(function (g) {
    MODES.forEach(function (mode) {
      var res = JSON.parse(R.draw(JSON.stringify(payloadFor(g, info.artboards, "IDSN", mode))));
      assert.equal(res.error, undefined, g.type + "/" + mode + ": " + res.error);
    });
  });
  var p = payloadFor({ type: "columns" }, info.artboards, "IDSN", "guides");
  p.targets.forEach(function (t) { t.native = { count: 6, gutter: 12, t: 36, r: 36, b: 36, l: 36 }; t.prims = []; t.guides = null; });
  assert.equal(JSON.parse(R.draw(JSON.stringify(p))).error, undefined);
  assert.equal(m.created.native, 2);
  var pg = m.globals.app.activeDocument.pages[0];
  assert.equal(pg.margins.columnCount, 6);
  assert.equal(JSON.parse(R.clear(JSON.stringify({ layer: "Reticolo", targets: [{ i: 0 }] }))).error, undefined);
  assert.equal(pg.margins.columnCount, 1, "Cancella ripristina le colonne originali");
  assert.equal(pg.margins.top, 36);
  assert.equal(m.globals.app.scriptPreferences.measurementUnit, "mm", "unita' di scripting ripristinate");
  assert.ok(m.created.items > 100 && m.created.guides > 10);
  assert.equal(JSON.parse(R.clear(JSON.stringify({ layer: "Reticolo", targets: [{ i: 0 }, { i: 1 }] }))).error, undefined);
});

// ------------------------------------------------------------------ Photoshop

function photoshopDOM(withArtboards) {
  var created = { subpaths: 0, layers: 0, guides: 0, resize: 0 };
  function unit(v) { return { as: function () { return v; } }; }
  function layerSet(name, id) {
    var s = { name: name, id: id, visible: true, allLocked: false, typename: "LayerSet", remove: function () {}, move: function () {} };
    s.layerSets = [];
    s.parent = null;
    return s;
  }
  var abSets = withArtboards ? [layerSet("Desktop", 11), layerSet("Mobile", 12)] : [];
  var topSets = abSets.slice();
  topSets.add = function () { created.layers++; var s = layerSet("", 99); topSets.push(s); return s; };
  var guides = [];
  function guide(dir, u) {
    var g = { direction: dir, coordinate: u, remove: function () { guides.splice(guides.indexOf(g), 1); } };
    return g;
  }
  guides.add = function (dir, u) { created.guides++; guides.push(guide(dir, u)); };
  guides.push(guide("v", { as: function () { return 333.3; } })); // guida messa a mano dall'utente
  var d = {
    name: "t.psd", width: unit(1440), height: unit(900), resolution: 300,
    layerSets: topSets, guides: guides,
    artLayers: { add: function () { created.layers++; return { move: function () {} }; } },
    pathItems: { add: function (n, subs) { created.subpaths += subs.length; return { select: function () {}, remove: function () {}, makeSelection: function () {} }; } },
    selection: { fill: function () {}, deselect: function () {} },
    xmpMetadata: { rawData: "" },
    activeLayer: { name: "x", move: function () {}, parent: { typename: "Document" } },
    resizeImage: function () { created.resize++; },
    suspendHistory: function (n, code) { vm.runInContext(code, ctxRef.ctx); }
  };
  var ctxRef = {};
  var RECTS = { 11: [0, 0, 1440, 900], 12: [1600, 0, 1990, 844] };
  var globals = {
    app: { documents: { length: 1 }, activeDocument: d, preferences: { rulerUnits: "cm" } },
    Units: { PIXELS: "px" }, Direction: { VERTICAL: "v", HORIZONTAL: "h" },
    ResampleMethod: { NONE: "none" }, PointKind: { CORNERPOINT: "corner" }, ShapeOperation: { SHAPEADD: "add" },
    SelectionType: { REPLACE: "replace" }, ElementPlacement: { INSIDE: "inside", PLACEATBEGINNING: "begin" }, DialogModes: { NO: "no" },
    PathPointInfo: function () {}, SubPathInfo: function () {}, SolidColor: function () { this.rgb = {}; },
    XMPMeta: (function () {
      function X(raw) { this.props = raw ? JSON.parse(raw) : {}; }
      X.registerNamespace = function () {};
      X.prototype.getProperty = function (ns, k) { return this.props[k] === undefined ? undefined : { value: this.props[k] }; };
      X.prototype.setProperty = function (ns, k, v) { this.props[k] = v; };
      X.prototype.serialize = function () { return JSON.stringify(this.props); };
      return X;
    })(),
    UnitValue: function (v) { this.as = function () { return v; }; },
    ActionDescriptor: function () { return any("ActionDescriptor"); },
    ActionReference: function () {
      var id = null;
      return { putIdentifier: function (a, b) { id = b; }, putClass: function () {}, get id() { return id; } };
    },
    charIDToTypeID: function (s) { return s; }, stringIDToTypeID: function (s) { return s; },
    executeAction: function () { d.activeLayer = { name: "fill", move: function () {}, opacity: 100 }; },
    executeActionGet: function (ref) {
      var r = RECTS[ref.id];
      return {
        hasKey: function () { return !!r; },
        getBoolean: function () { return !!r; },
        getObjectValue: function () {
          return { getObjectValue: function () { return { getDouble: function (k) { return { left: r[0], top: r[1], right: r[2], bottom: r[3] }[k]; } }; } };
        }
      };
    }
  };
  return { globals: globals, created: created, ctxRef: ctxRef };
}

[false, true].forEach(function (withAB) {
  test("Photoshop " + (withAB ? "con artboard" : "tela singola") + ": info, draw, clear", function () {
    var m = photoshopDOM(withAB);
    var ctx = run("photoshop.jsx", m.globals);
    m.ctxRef.ctx = ctx;
    var R = ctx.Reticolo;
    var info = JSON.parse(R.info());
    assert.equal(info.artboards.length, withAB ? 2 : 1);
    if (!withAB) assert.equal(info.artboards[0].i, -1);
    else assert.equal(info.artboards[1].w, 390);
    GRIDS.forEach(function (g) {
      MODES.forEach(function (mode) {
        var res = JSON.parse(R.draw(JSON.stringify(payloadFor(g, info.artboards, "PHXS", mode))));
        assert.equal(res.error, undefined, g.type + "/" + mode + ": " + res.error);
      });
    });
    assert.ok(m.created.subpaths > 100);
    assert.ok(m.created.guides > 0);
    assert.equal(m.created.resize % 2, 0, "la risoluzione deve essere sempre ripristinata");
    assert.equal(m.globals.app.preferences.rulerUnits, "cm", "le unita' del righello devono essere ripristinate");
    assert.equal(JSON.parse(R.clear(JSON.stringify({ layer: "Reticolo", targets: info.artboards.map(function (a) { return { i: a.i }; }) }))).error, undefined);
    var left = m.globals.app.activeDocument.guides;
    assert.equal(left.length, 1, "restano solo le guide dell'utente");
    assert.equal(left[0].coordinate.as("px"), 333.3);
  });
});

// ------------------------------------------------------------------ griglie dentro oggetti chiusi

function objectPayload(app, objects, mode) {
  return {
    layer: "Reticolo", mode: mode || "stroke", style: { stroke: "#00B8D9", fill: "#00B8D9", sw: 1, fa: 12, bold: 2 }, lock: false,
    targets: objects.map(function (o) {
      var out = E.build({ type: "modular", modular: { cols: 3, rows: 2 } }, { w: o.w, h: o.h }, { app: app, res: 72 });
      var prims = app === "PHXS" ? E.flattenAll(out.prims, 12) : out.prims;
      return { obj: o.id, prims: prims, guides: null, native: null };
    })
  };
}

test("Illustrator: oggetti chiusi del livello attivo, griglia ritagliata sulla forma", function () {
  var m = illustratorDOM(), d = m.globals.app.activeDocument, masks = [];
  function shape(uuid, type, b) {
    return {
      typename: type, closed: true, guides: false, clipping: false, name: "", uuid: uuid, geometricBounds: b,
      pathPoints: { length: 4 }, pathItems: [{ clipping: false }],
      duplicate: function () { var dup = { typename: type, clipping: false, pathItems: [{ clipping: false }] }; masks.push(dup); return dup; }
    };
  }
  var rect = shape("U1", "PathItem", [100, -100, 500, -400]);
  var compound = shape("U2", "CompoundPathItem", [600, -100, 800, -300]);
  var open = shape("U3", "PathItem", [0, 0, 10, -10]); open.closed = false;
  var userLayer = { name: "Disegni", pageItems: [rect, compound, open] };
  d.activeLayer = userLayer;
  d.selection = [open, rect];
  d.getPageItemFromUuid = function (id) { return { U1: rect, U2: compound, U3: open }[id]; };
  m.globals.ElementPlacement = { PLACEATBEGINNING: "begin" };
  var R = run("illustrator.jsx", m.globals).Reticolo;

  var info = JSON.parse(R.info());
  assert.equal(info.layerName, "Disegni");
  assert.deepEqual(info.objects.map(function (o) { return o.id; }), ["U1", "U2"], "solo i tracciati chiusi");
  assert.equal(info.selection.id, "U1", "il primo oggetto chiuso della selezione");
  assert.equal(info.objects[0].w, 400);
  assert.equal(info.objects[0].h, 300);

  var res = JSON.parse(R.draw(JSON.stringify(objectPayload("ILST", info.objects))));
  assert.equal(res.error, undefined);
  var grid = d.layers[0].pageItems.filter(function (g) { return g.name === "RTC:o:U1"; })[0];
  assert.ok(grid, "gruppo della griglia nel livello Reticolo");
  assert.equal(grid.clipped, true, "maschera di ritaglio attiva");
  assert.equal(masks[0].clipping, true);
  assert.equal(masks[1].pathItems[0].clipping, true, "tracciato composto come maschera");
  assert.equal(d.activeLayer, userLayer, "il livello attivo dell'utente non cambia");

  var missing = JSON.parse(R.draw(JSON.stringify(objectPayload("ILST", [{ id: "U3", w: 10, h: 10 }]))));
  assert.equal(missing.error, "objectGone");
  assert.equal(JSON.parse(R.clear(JSON.stringify({ layer: "Reticolo", targets: [{ obj: "U1" }] }))).error, undefined);
  assert.equal(d.layers[0].pageItems.filter(function (g) { return g.name === "RTC:o:U1"; }).length, 0);
  assert.equal(d.layers[0].pageItems.filter(function (g) { return g.name === "RTC:o:U2"; }).length, 1, "le altre griglie restano");
});

test("Photoshop: livelli del gruppo attivo, griglia agganciata con maschera di ritaglio", function () {
  var m = photoshopDOM(false), d = m.globals.app.activeDocument, made = [];
  function unit(v) { return { as: function () { return v; } }; }
  var shapeLayer = { typename: "ArtLayer", id: 55, name: "Forma 1", isBackgroundLayer: false, bounds: [unit(100), unit(50), unit(500), unit(350)], parent: d };
  var bg = { typename: "ArtLayer", id: 1, name: "Sfondo", isBackgroundLayer: true, bounds: [unit(0), unit(0), unit(1440), unit(900)], parent: d };
  d.layers = [shapeLayer, bg];
  d.activeLayer = shapeLayer;
  m.globals.ElementPlacement.PLACEBEFORE = "before";
  m.globals.executeAction = function () {
    var l = { name: "", opacity: 100, grouped: false, move: function (t, where) { l.movedTo = [t, where]; } };
    made.push(l);
    d.activeLayer = l;
  };
  var ctx = run("photoshop.jsx", m.globals);
  m.ctxRef.ctx = ctx;
  var R = ctx.Reticolo;
  d.activeLayer = shapeLayer;

  var info = JSON.parse(R.info());
  assert.deepEqual(info.objects.map(function (o) { return o.id; }), ["55"], "lo sfondo non e' un oggetto");
  assert.equal(info.selection.id, "55");
  assert.equal(info.objects[0].w, 400);

  var p = objectPayload("PHXS", info.objects, "both");
  var res = JSON.parse(R.draw(JSON.stringify(p)));
  assert.equal(res.error, undefined);
  assert.equal(made.length, 2, "celle + linee");
  made.forEach(function (l) {
    assert.equal(l.name, "Reticolo [55]");
    assert.equal(l.grouped, true, "maschera di ritaglio sul livello sotto");
    assert.equal(l.movedTo[1], "before");
  });
  assert.equal(made[0].movedTo[0], shapeLayer, "le celle stanno subito sopra l'oggetto");
  assert.equal(made[1].movedTo[0], made[0], "le linee sopra le celle");
});

test("InDesign: oggetti del livello attivo, forme non rettangolari con Incolla dentro", function () {
  var m = indesignDOM(), app = m.globals.app, d = app.activeDocument, calls = [];
  var page = d.pages[0];
  function item(kind, id, b, extra) {
    var it = {
      constructor: { name: kind }, id: id, label: "", name: "", parentPage: page, geometricBounds: b,
      rotationAngle: 0, shearAngle: 0, paths: [{ pathType: "closed" }],
      topLeftCornerOption: "none", topRightCornerOption: "none", bottomLeftCornerOption: "none", bottomRightCornerOption: "none",
      duplicate: function () {
        var f = { isValid: true, label: "", graphics: { everyItem: function () { return { remove: function () {} }; } }, remove: function () { f.isValid = false; } };
        f.pageItems = f.graphics;
        calls.push("duplicate");
        return f;
      }
    };
    for (var k in extra || {}) it[k] = extra[k];
    return it;
  }
  var oval = item("Oval", 77, [100, 50, 300, 250]);
  var rect = item("Rectangle", 78, [400, 50, 500, 300]);
  var line = item("GraphicLine", 79, [0, 0, 10, 10]);
  var userLayer = { name: "Grafica", id: 3, allPageItems: [oval, rect, line] };
  app.activeWindow.activeLayer = userLayer;
  app.selection = [rect];
  d.allPageItems = [oval, rect, line];
  page.groups = { add: function (items) { calls.push("group:" + items.length); return { isValid: true, label: "" }; } };
  app.select = function () { calls.push("select"); };
  app.cut = function () { calls.push("cut"); };
  app.pasteInto = function () { calls.push("pasteInto"); };
  m.globals.NothingEnum = { NOTHING: "nothing" };
  m.globals.CornerOptions = { NONE: "none" };
  m.globals.PathType.CLOSED_PATH = "closed";
  var R = run("indesign.jsx", m.globals).Reticolo;

  var info = JSON.parse(R.info());
  assert.equal(info.layerName, "Grafica");
  assert.deepEqual(info.objects.map(function (o) { return o.kind; }), ["oval", "rectangle"], "le linee non sono oggetti chiusi");
  assert.equal(info.selection.id, "78");
  assert.equal(info.objects[0].w, 200);

  var res = JSON.parse(R.draw(JSON.stringify(objectPayload("IDSN", [info.objects[0]]))));
  assert.equal(res.error, undefined);
  assert.ok(calls.indexOf("pasteInto") > 0, "l'ellisse riceve la griglia con Incolla dentro");
  calls.length = 0;
  res = JSON.parse(R.draw(JSON.stringify(objectPayload("IDSN", [info.objects[1]]))));
  assert.equal(res.error, undefined);
  assert.equal(calls.indexOf("pasteInto"), -1, "il rettangolo dritto non serve ritagliarlo");
  assert.equal(app.activeWindow.activeLayer, userLayer, "il livello attivo dell'utente non cambia");
  assert.equal(JSON.parse(R.clear(JSON.stringify({ layer: "Reticolo", targets: [{ obj: "77" }] }))).error, undefined);
});
