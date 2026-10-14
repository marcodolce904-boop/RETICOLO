/*
 * Reticolo per Figma: codice del plugin (sandbox).
 * La geometria è nel pannello (ui.html, stesso motore js/engine.js delle app Adobe): qui si leggono i
 * frame e si disegnano le primitive. Il pannello chiama info / draw / clear / layerState / setLayer
 * con messaggi, come negli script host di Illustrator, Photoshop e InDesign.
 *
 * Disegno: ogni griglia è un SVG importato nel frame (createNodeFromSvg), in un livello che si chiama come
 * il livello scelto nel pannello (predefinito "Reticolo"). Le griglie dentro un oggetto si chiamano
 * "RTC:o:<id>". Nei frame, i layout grid nativi aggiunti da Reticolo si riconoscono dal pluginData.
 */
"use strict";

var MARK = "rtc";           // pluginData che marca i nodi creati da Reticolo
var GRIDS = "rtc-grids";    // pluginData del frame: layout grid aggiunti da Reticolo (JSON)
var STORE_KEY = "rtc-store";
var MAX_OBJECTS = 300;
var MERGE_RECTS_OVER = 400; // oltre questa soglia le celle diventano un solo tracciato
var CONTAINERS = { FRAME: 1, COMPONENT: 1, INSTANCE: 1 };
var SHAPES = { RECTANGLE: 1, ELLIPSE: 1, POLYGON: 1, STAR: 1, VECTOR: 1, BOOLEAN_OPERATION: 1 };

figma.showUI(__html__, { width: 340, height: 780, themeColors: true });

// ---------------------------------------------------------------- archivio (libreria e impostazioni)

var store = null;

function loadStore() {
  if (store) return Promise.resolve(store);
  return figma.clientStorage.getAsync(STORE_KEY).then(function (v) {
    store = v && typeof v === "object" ? v : {};
    return store;
  }, function () { store = {}; return store; });
}

// ---------------------------------------------------------------- frame e oggetti

function isFrameLike(n) { return n.type === "FRAME" || n.type === "COMPONENT"; }

/** "Artboard" di Figma: frame e componenti in cima alla pagina, anche dentro le sezioni. */
function artboards() {
  var out = [];
  figma.currentPage.children.forEach(function (n) {
    if (isFrameLike(n)) out.push(n);
    else if (n.type === "SECTION") n.children.forEach(function (c) { if (isFrameLike(c)) out.push(c); });
  });
  return out;
}

function isOurs(n) {
  try { return n.getPluginData(MARK) === "1"; } catch (e) { return false; }
}

function isClosed(n) {
  if (n.type === "VECTOR") {
    try { return n.vectorNetwork.regions.length > 0; } catch (e) { return false; }
  }
  return !!(CONTAINERS[n.type] || SHAPES[n.type]);
}

function kindOf(n) {
  if (n.type === "RECTANGLE") return "rectangle";
  if (n.type === "ELLIPSE") return "oval";
  if (n.type === "POLYGON" || n.type === "STAR") return "polygon";
  if (n.type === "BOOLEAN_OPERATION") return "compound";
  if (CONTAINERS[n.type]) return "frame";
  return "path";
}

function describe(n) { return { id: n.id, name: n.name || "", kind: kindOf(n), w: n.width, h: n.height }; }

function artboardOf(node, list) {
  for (var n = node; n && n.type !== "PAGE" && n.type !== "DOCUMENT"; n = n.parent) {
    var i = list.indexOf(n);
    if (i >= 0) return i;
  }
  return -1;
}

/** Oggetti chiusi dentro il frame attivo, senza i nodi creati da Reticolo. */
function objectsIn(frame) {
  var out = [], stack = frame.children ? frame.children.slice().reverse() : [];
  while (stack.length && out.length < MAX_OBJECTS) {
    var n = stack.pop();
    if (isOurs(n) || n.visible === false) continue;
    if (isClosed(n)) out.push(n);
    if (n.children && n.type !== "INSTANCE") for (var k = n.children.length - 1; k >= 0; k--) stack.push(n.children[k]);
  }
  return out;
}

function info() {
  var list = artboards();
  if (!list.length) return { app: "FIGMA", doc: false };
  var sel = figma.currentPage.selection, active = 0, selection = null, i;
  for (i = 0; i < sel.length; i++) {
    var a = artboardOf(sel[i], list);
    if (a >= 0) { active = a; break; }
  }
  for (i = 0; i < sel.length; i++) {
    if (list.indexOf(sel[i]) < 0 && isClosed(sel[i]) && !isOurs(sel[i])) { selection = describe(sel[i]); break; }
  }
  var frame = list[active];
  return {
    app: "FIGMA", doc: true, name: figma.root.name, res: 72, active: active,
    artboards: list.map(function (n, k) { return { i: k, name: n.name, w: n.width, h: n.height }; }),
    layerName: frame.name,
    objects: objectsIn(frame).map(describe),
    selection: selection
  };
}

// ---------------------------------------------------------------- SVG

function r2(n) { return Math.round(n * 100) / 100; }

function hexToRgb(hex) {
  var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  var v = m ? parseInt(m[1], 16) : 0x00b8d9;
  return { r: ((v >> 16) & 255) / 255, g: ((v >> 8) & 255) / 255, b: (v & 255) / 255 };
}

function bezierPath(p) {
  var s = "M" + r2(p.p[0][0]) + " " + r2(p.p[0][1]), n = p.c ? p.p.length : p.p.length - 1;
  for (var k = 0; k < n; k++) {
    var a = p.p[k], b = p.p[(k + 1) % p.p.length];
    s += "C" + r2(a[4]) + " " + r2(a[5]) + " " + r2(b[2]) + " " + r2(b[3]) + " " + r2(b[0]) + " " + r2(b[1]);
  }
  return s + (p.c ? "Z" : "");
}

function rectPath(a) {
  return "M" + r2(a[0]) + " " + r2(a[1]) + "h" + r2(a[2]) + "v" + r2(a[3]) + "h" + r2(-a[2]) + "Z";
}

/** Primitive del motore (L, R, P, B) in un SVG w x h: una path per le linee, una per quelle forti, celle a parte. */
function buildSvg(prims, w, h, style, mode) {
  var fillCells = mode === "fill" || mode === "both";
  var strokeCells = mode !== "fill";
  var rects = prims.filter(function (p) { return p.t === "R"; });
  var merge = rects.length > MERGE_RECTS_OVER;
  var thin = "", bold = "", cells = "", cellPath = "";
  prims.forEach(function (p) {
    if (p.t === "L") {
      var seg = "M" + r2(p.a[0]) + " " + r2(p.a[1]) + "L" + r2(p.a[2]) + " " + r2(p.a[3]);
      if (p.b) bold += seg; else thin += seg;
    } else if (p.t === "P") {
      thin += "M" + p.p.map(function (q) { return r2(q[0]) + " " + r2(q[1]); }).join("L") + (p.c ? "Z" : "");
    } else if (p.t === "B") {
      thin += bezierPath(p);
    } else if (p.t === "R") {
      if (merge) cellPath += rectPath(p.a);
      else cells += '<rect x="' + r2(p.a[0]) + '" y="' + r2(p.a[1]) + '" width="' + r2(p.a[2]) + '" height="' + r2(p.a[3]) + '"/>';
    }
  });
  var sw = style.sw > 0 ? style.sw : 1, boldW = sw * (style.bold > 0 ? style.bold : 2);
  var fillAttr = fillCells ? ' fill="' + style.fill + '" fill-opacity="' + r2((style.fa > 0 ? style.fa : 12) / 100) + '"' : ' fill="none"';
  var strokeAttr = strokeCells ? ' stroke="' + style.stroke + '" stroke-width="' + sw + '"' : ' stroke="none"';
  var out = '<svg xmlns="http://www.w3.org/2000/svg" width="' + r2(w) + '" height="' + r2(h) + '" viewBox="0 0 ' + r2(w) + " " + r2(h) + '" fill="none">';
  if (cells) out += "<g" + fillAttr + strokeAttr + ">" + cells + "</g>";
  if (cellPath) out += '<path d="' + cellPath + '"' + fillAttr + strokeAttr + "/>";
  if (thin) out += '<path d="' + thin + '" fill="none" stroke="' + style.stroke + '" stroke-width="' + sw + '"/>';
  if (bold) out += '<path d="' + bold + '" fill="none" stroke="' + style.stroke + '" stroke-width="' + boldW + '"/>';
  return out + "</svg>";
}

// ---------------------------------------------------------------- layout grid nativi

function countOf(g) { return g.count === "Infinity" ? Infinity : g.count; }

function sameGrid(a, b) {
  return a.pattern === b.pattern && a.alignment === b.alignment && countOf(a) === countOf(b) &&
    Math.abs((a.gutterSize || 0) - (b.gutterSize || 0)) < 0.01 &&
    Math.abs((a.sectionSize || 0) - (b.sectionSize || 0)) < 0.01 &&
    Math.abs((a.offset || 0) - (b.offset || 0)) < 0.01;
}

function toLayoutGrid(spec, style) {
  var c = hexToRgb(style.stroke), g = {
    pattern: spec.pattern, visible: true, color: { r: c.r, g: c.g, b: c.b, a: spec.a > 0 ? spec.a : 0.1 }
  };
  if (spec.pattern === "GRID") { g.sectionSize = spec.sectionSize; return g; }
  g.alignment = spec.alignment;
  g.count = spec.count;
  g.gutterSize = spec.gutterSize;
  if (spec.alignment !== "STRETCH") g.sectionSize = spec.sectionSize;
  if (spec.alignment !== "CENTER") g.offset = spec.offset;
  return g;
}

function readOurGrids(frame) {
  try { return JSON.parse(frame.getPluginData(GRIDS) || "[]"); } catch (e) { return []; }
}

/** Toglie dal frame i layout grid aggiunti da Reticolo, lasciando quelli dell'utente. */
function removeOurGrids(frame) {
  var ours = readOurGrids(frame);
  if (!ours.length || !("layoutGrids" in frame)) return;
  var keep = frame.layoutGrids.filter(function (g) {
    return !ours.some(function (o) { return sameGrid(g, o); });
  });
  frame.layoutGrids = keep;
  frame.setPluginData(GRIDS, "");
}

function addOurGrids(frame, specs, style) {
  removeOurGrids(frame);
  var grids = specs.map(function (s) { return toLayoutGrid(s, style); });
  frame.layoutGrids = frame.layoutGrids.concat(grids);
  frame.setPluginData(GRIDS, JSON.stringify(grids.map(function (g) {
    return { pattern: g.pattern, alignment: g.alignment, count: g.count === Infinity ? "Infinity" : g.count, gutterSize: g.gutterSize, sectionSize: g.sectionSize, offset: g.offset };
  })));
}

// ---------------------------------------------------------------- disegno

function removeNamed(parent, name) {
  if (!parent || !parent.children) return;
  parent.children.slice().forEach(function (c) {
    if (c.name === name && isOurs(c)) c.remove();
  });
}

function objectName(id) { return "RTC:o:" + id; }

function place(svg, name, parent, lock) {
  var node = figma.createNodeFromSvg(svg);
  node.name = name;
  node.setPluginData(MARK, "1");
  node.fills = [];
  node.clipsContent = false;
  parent.appendChild(node);
  node.x = 0;
  node.y = 0;
  try { node.layoutPositioning = "ABSOLUTE"; } catch (e) { /* il contenitore non ha auto layout */ }
  try { node.constraints = { horizontal: "SCALE", vertical: "SCALE" }; } catch (e2) { /* non supportato */ }
  node.locked = !!lock;
  return node;
}

function drawArtboard(frame, t, p) {
  removeNamed(frame, p.layer);
  removeOurGrids(frame);
  if (t.native && t.native.figma && t.native.figma.length) addOurGrids(frame, t.native.figma, p.style);
  if (t.prims && t.prims.length) place(buildSvg(t.prims, frame.width, frame.height, p.style, p.mode), p.layer, frame, p.lock);
}

function drawObject(obj, t, p) {
  var name = objectName(obj.id), svg = buildSvg(t.prims || [], obj.width, obj.height, p.style, p.mode);
  if (CONTAINERS[obj.type]) {
    // frame, componenti, istanze: la griglia sta dentro l'oggetto e ne segue il ritaglio
    removeNamed(obj, name);
    place(svg, name, obj, p.lock);
    return;
  }
  // forme: griglia ritagliata da una copia dell'oggetto usata come maschera
  var parent = obj.parent;
  removeNamed(parent, name);
  var mask = obj.clone();
  mask.setPluginData(MARK, "1");
  mask.name = name + ":mask";
  mask.isMask = true;
  var node = figma.createNodeFromSvg(svg);
  node.name = name + ":lines";
  node.setPluginData(MARK, "1");
  node.fills = [];
  node.clipsContent = false;
  parent.appendChild(node);
  node.relativeTransform = obj.relativeTransform;
  var group = figma.group([mask, node], parent);
  group.name = name;
  group.setPluginData(MARK, "1");
  group.locked = !!p.lock;
}

async function resolveTarget(t) {
  if (t.obj) return figma.getNodeByIdAsync(t.obj);
  return artboards()[t.i] || null;
}

async function draw(p) {
  var count = 0;
  for (var k = 0; k < p.targets.length; k++) {
    var t = p.targets[k], node = await resolveTarget(t);
    if (!node || node.removed) continue;
    if (t.obj) drawObject(node, t, p); else drawArtboard(node, t, p);
    count++;
  }
  if (!count) return { error: "target" };
  return { ok: true, count: count };
}

async function clear(p) {
  for (var k = 0; k < p.targets.length; k++) {
    var t = p.targets[k], node = await resolveTarget(t);
    if (!node || node.removed) continue;
    if (t.obj) removeNamed(CONTAINERS[node.type] ? node : node.parent, objectName(node.id));
    else { removeNamed(node, p.layer); removeOurGrids(node); }
  }
  return { ok: true };
}

function layerNodes(name) {
  var out = [];
  artboards().forEach(function (f) {
    f.children.forEach(function (c) { if (c.name === name && isOurs(c)) out.push(c); });
  });
  return out;
}

function layerState(p) {
  var nodes = layerNodes(p.layer);
  return {
    exists: nodes.length > 0,
    visible: !nodes.length || nodes.some(function (n) { return n.visible; }),
    locked: nodes.length > 0 && nodes.every(function (n) { return n.locked; })
  };
}

function setLayer(p) {
  var nodes = layerNodes(p.layer);
  nodes.forEach(function (n) {
    if (p.visible !== undefined) n.visible = !!p.visible;
    if (p.locked !== undefined) n.locked = !!p.locked;
    if (p.rename) n.name = p.rename;
  });
  var st = layerState({ layer: p.rename || p.layer });
  return { ok: true, visible: st.visible, locked: st.locked };
}

var HANDLERS = { info: info, draw: draw, clear: clear, layerState: layerState, setLayer: setLayer };

// ---------------------------------------------------------------- messaggi con il pannello

figma.ui.onmessage = function (msg) {
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "ready") {
    loadStore().then(function (s) { figma.ui.postMessage({ type: "init", store: s }); });
  } else if (msg.type === "store") {
    loadStore().then(function (s) {
      s[msg.path] = msg.data;
      return figma.clientStorage.setAsync(STORE_KEY, s);
    }).catch(function () { figma.notify("Reticolo: impossibile salvare la libreria", { error: true }); });
  } else if (msg.type === "call") {
    var fn = HANDLERS[msg.fn];
    Promise.resolve().then(function () {
      if (!fn) return { error: "unknown call: " + msg.fn };
      return fn(msg.payload || {});
    }).then(function (value) {
      figma.ui.postMessage({ type: "result", id: msg.id, value: value });
    }, function (err) {
      figma.ui.postMessage({ type: "result", id: msg.id, value: { error: String(err && err.message ? err.message : err) } });
    });
  }
};

function notifyChange() { figma.ui.postMessage({ type: "event", name: "documentAfterActivate" }); }
figma.on("selectionchange", notifyChange);
figma.on("currentpagechange", notifyChange);
