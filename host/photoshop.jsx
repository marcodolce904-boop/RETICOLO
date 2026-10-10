/*
 * Reticolo - disegno in Photoshop.
 * Coordinate dal pannello in pixel, locali all'artboard (o alla tela se il documento non ha artboard).
 * Le linee diventano quadrilateri sottili raccolti in un unico tracciato, poi un livello di riempimento
 * con maschera vettoriale (nitido a qualsiasi zoom). Se non riesce, ripiega su un livello raster.
 * Tutto in un solo passo di cronologia (suspendHistory).
 */
(function () {
  function cTID(s) { return charIDToTypeID(s); }
  function sTID(s) { return stringIDToTypeID(s); }
  function doc() { return app.documents.length ? app.activeDocument : null; }

  function withPixels(fn) {
    var old = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;
    try { return fn(); } finally { app.preferences.rulerUnits = old; }
  }

  // ---------------------------------------------------------------- artboard

  function abRect(id) {
    try {
      var ref = new ActionReference();
      ref.putIdentifier(sTID("layer"), id);
      var desc = executeActionGet(ref);
      if (!desc.hasKey(sTID("artboardEnabled")) || !desc.getBoolean(sTID("artboardEnabled"))) return null;
      var r = desc.getObjectValue(sTID("artboard")).getObjectValue(sTID("artboardRect"));
      return [r.getDouble(sTID("left")), r.getDouble(sTID("top")), r.getDouble(sTID("right")), r.getDouble(sTID("bottom"))];
    } catch (e) { return null; }
  }

  /** Artboard di primo livello; se non ce ne sono, la tela intera con indice -1. */
  function artboards(d) {
    var out = [];
    for (var i = 0; i < d.layerSets.length; i++) {
      var ls = d.layerSets[i], id;
      try { id = ls.id; } catch (e) { id = undefined; }
      if (id === undefined) continue;
      var r = abRect(id);
      if (r) out.push({ i: out.length, id: id, set: ls, name: ls.name, x: r[0], y: r[1], w: r[2] - r[0], h: r[3] - r[1] });
    }
    if (!out.length) out.push({ i: -1, id: null, set: null, name: "Canvas", x: 0, y: 0, w: d.width.as("px"), h: d.height.as("px") });
    return out;
  }

  function byIndex(abs, i) {
    for (var k = 0; k < abs.length; k++) if (abs[k].i === i) return abs[k];
    return null;
  }

  function activeIndex(d, abs) {
    try {
      var l = d.activeLayer;
      while (l.parent && l.parent.typename !== "Document") l = l.parent;
      var lid = l.id;
      for (var k = 0; k < abs.length; k++) if (abs[k].id !== null && abs[k].id === lid) return abs[k].i;
    } catch (e) { /* nessun livello attivo */ }
    return abs[0].i;
  }

  // ---------------------------------------------------------------- livelli griglia

  function gridSets(container, name) {
    var out = [];
    try {
      for (var i = 0; i < container.layerSets.length; i++) if (container.layerSets[i].name === name) out.push(container.layerSets[i]);
    } catch (e) { /* contenitore senza gruppi */ }
    return out;
  }

  function allGridSets(d, name) {
    var out = gridSets(d, name), abs = artboards(d);
    for (var i = 0; i < abs.length; i++) if (abs[i].set) out = out.concat(gridSets(abs[i].set, name));
    return out;
  }

  function removeGrid(d, ab, name) {
    var sets = gridSets(ab.set || d, name);
    for (var i = sets.length - 1; i >= 0; i--) { sets[i].allLocked = false; sets[i].remove(); }
  }

  // ---------------------------------------------------------------- guide (registrate nei metadati XMP)
  // Le guide di Photoshop non hanno livello ne' nome: Reticolo annota le posizioni che crea nei metadati
  // del documento e rimuove solo quelle, lasciando intatte le guide messe a mano.

  var XMP_NS = "http://ns.reticolo.app/1.0/";

  function xmpOpen(d) {
    try {
      if (typeof XMPMeta === "undefined") ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
      XMPMeta.registerNamespace(XMP_NS, "rtc:");
      return new XMPMeta(d.xmpMetadata.rawData);
    } catch (e) { return null; }
  }

  function guideMap(d) {
    var x = xmpOpen(d);
    if (!x) return null;
    var prop = x.getProperty(XMP_NS, "guides");
    var map = {};
    try { if (prop && prop.value) map = Reticolo.parse(String(prop.value)); } catch (e) { map = {}; }
    return { xmp: x, data: map };
  }

  function guideSave(d, g) {
    try {
      g.xmp.setProperty(XMP_NS, "guides", Reticolo.stringify(g.data));
      d.xmpMetadata.rawData = g.xmp.serialize();
    } catch (e) { /* metadati non scrivibili: le guide restano non tracciate */ }
  }

  function abKey(ab) { return ab.id === null ? "canvas" : "ab" + ab.id; }

  function near(list, v) {
    for (var i = 0; i < list.length; i++) if (Math.abs(list[i] - v) < 0.26) return true;
    return false;
  }

  /** Rimuove dall'artboard solo le guide create da Reticolo. */
  function removeOurGuides(d, ab, g) {
    if (!g) return;
    var rec = g.data[abKey(ab)];
    if (!rec) return;
    for (var k = d.guides.length - 1; k >= 0; k--) {
      var gd = d.guides[k], pos = gd.coordinate.as("px");
      if (near(gd.direction === Direction.VERTICAL ? rec.v : rec.h, pos)) gd.remove();
    }
    delete g.data[abKey(ab)];
  }

  // ---------------------------------------------------------------- geometria tracciati

  function subPath(pts) {
    var arr = [];
    for (var i = 0; i < pts.length; i++) {
      var pp = new PathPointInfo();
      pp.kind = PointKind.CORNERPOINT;
      pp.anchor = pts[i];
      pp.leftDirection = pts[i];
      pp.rightDirection = pts[i];
      arr.push(pp);
    }
    var sp = new SubPathInfo();
    sp.operation = ShapeOperation.SHAPEADD;
    sp.closed = true;
    sp.entireSubPath = arr;
    return sp;
  }

  function quad(ox, oy, s, w) {
    var x1 = ox + s[0], y1 = oy + s[1], x2 = ox + s[2], y2 = oy + s[3];
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) return null;
    var nx = -dy / len * w / 2, ny = dx / len * w / 2;
    return subPath([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]]);
  }

  function solid(rgb) {
    var c = new SolidColor();
    c.rgb.red = rgb.r; c.rgb.green = rgb.g; c.rgb.blue = rgb.b;
    return c;
  }

  /** Crea un livello colore a tinta unita mascherato dai sottotracciati. */
  function shapeLayer(d, subs, rgb) {
    var pi = d.pathItems.add("Reticolo tmp", subs), layer;
    try {
      pi.select();
      var desc = new ActionDescriptor(), ref = new ActionReference();
      ref.putClass(sTID("contentLayer"));
      desc.putReference(cTID("null"), ref);
      var lay = new ActionDescriptor(), type = new ActionDescriptor(), col = new ActionDescriptor();
      col.putDouble(cTID("Rd  "), rgb.r);
      col.putDouble(cTID("Grn "), rgb.g);
      col.putDouble(cTID("Bl  "), rgb.b);
      type.putObject(cTID("Clr "), cTID("RGBC"), col);
      lay.putObject(cTID("Type"), sTID("solidColorLayer"), type);
      desc.putObject(cTID("Usng"), sTID("contentLayer"), lay);
      executeAction(cTID("Mk  "), desc, DialogModes.NO);
      layer = d.activeLayer;
    } catch (e) {
      // ripiego raster: selezione dal tracciato e riempimento
      pi.makeSelection(0, true, SelectionType.REPLACE);
      layer = d.artLayers.add();
      d.selection.fill(solid(rgb));
      d.selection.deselect();
    }
    try { pi.remove(); } catch (e2) { /* tracciato gia' consumato */ }
    return layer;
  }

  function moveInto(layer, target) {
    try { layer.move(target, ElementPlacement.INSIDE); return; } catch (e) { /* versioni vecchie */ }
    try { layer.move(target, ElementPlacement.PLACEATBEGINNING); } catch (e2) { /* resta dov'e' */ }
  }

  // ---------------------------------------------------------------- API

  Reticolo.info = function () {
    var d = doc();
    if (!d) return Reticolo.ok({ app: "PHXS", doc: false });
    return withPixels(function () {
      var abs = artboards(d), list = [];
      for (var i = 0; i < abs.length; i++) list.push({ i: abs[i].i, name: abs[i].name, w: abs[i].w, h: abs[i].h });
      return Reticolo.ok({ app: "PHXS", doc: true, name: d.name, res: d.resolution, active: activeIndex(d, abs), artboards: list });
    });
  };

  Reticolo._psDraw = function () {
    var d = app.activeDocument, p = Reticolo._ps, st = p.style, mode = p.mode;
    var strokeRGB = Reticolo.hex(st.stroke), fillRGB = Reticolo.hex(st.fill);
    var fillCells = mode === "fill" || mode === "both", strokeCells = mode === "stroke" || mode === "both" || mode === "guides";
    var res = d.resolution, changedRes = false;
    // le coordinate dei tracciati sono in punti: a 72 ppi coincidono con i pixel
    if (Math.abs(res - 72) > 0.001) { d.resizeImage(null, null, 72, ResampleMethod.NONE); changedRes = true; }
    try {
      var abs = artboards(d), gm = guideMap(d);
      for (var ti = 0; ti < p.targets.length; ti++) {
        var t = p.targets[ti], ab = byIndex(abs, t.i);
        if (!ab) continue;
        removeGrid(d, ab, p.layer);
        removeOurGuides(d, ab, gm);

        var strokes = [], cells = [], k, j, segs, q;
        for (k = 0; k < t.prims.length; k++) {
          var pr = t.prims[k];
          if (pr.t === "R" && fillCells) {
            cells.push(subPath([[ab.x + pr.a[0], ab.y + pr.a[1]], [ab.x + pr.a[0] + pr.a[2], ab.y + pr.a[1]],
              [ab.x + pr.a[0] + pr.a[2], ab.y + pr.a[1] + pr.a[3]], [ab.x + pr.a[0], ab.y + pr.a[1] + pr.a[3]]]));
          }
          if (pr.t === "R" && !strokeCells) continue;
          segs = Reticolo.segments(pr);
          for (j = 0; j < segs.length; j++) {
            q = quad(ab.x, ab.y, segs[j], st.sw * (segs[j][4] ? st.bold : 1));
            if (q) strokes.push(q);
          }
        }

        if (t.guides) {
          var rv = [], rh = [];
          for (j = 0; j < t.guides.v.length; j++) { d.guides.add(Direction.VERTICAL, new UnitValue(ab.x + t.guides.v[j], "px")); rv.push(ab.x + t.guides.v[j]); }
          for (j = 0; j < t.guides.h.length; j++) { d.guides.add(Direction.HORIZONTAL, new UnitValue(ab.y + t.guides.h[j], "px")); rh.push(ab.y + t.guides.h[j]); }
          if (gm) gm.data[abKey(ab)] = { v: rv, h: rh };
        }
        if (!strokes.length && !cells.length) continue;

        var grp = d.layerSets.add();
        grp.name = p.layer;
        moveInto(grp, ab.set || d);
        if (!ab.set) { try { grp.move(d, ElementPlacement.PLACEATBEGINNING); } catch (e0) { /* gia' in cima */ } }
        if (cells.length) {
          var lc = shapeLayer(d, cells, fillRGB);
          lc.name = "Celle";
          lc.opacity = st.fa;
          moveInto(lc, grp);
        }
        if (strokes.length) {
          var ls = shapeLayer(d, strokes, strokeRGB);
          ls.name = "Linee";
          moveInto(ls, grp);
        }
        grp.allLocked = !!p.lock;
      }
      if (gm) guideSave(d, gm);
    } finally {
      if (changedRes) d.resizeImage(null, null, res, ResampleMethod.NONE);
    }
  };

  Reticolo.draw = function (json) {
    try {
      var d = doc();
      if (!d) return Reticolo.err("No document");
      Reticolo._ps = Reticolo.parse(json);
      withPixels(function () { d.suspendHistory("Reticolo", "Reticolo._psDraw()"); });
      return Reticolo.ok({ ok: true, count: Reticolo._ps.targets.length });
    } catch (e) { return Reticolo.err(e); }
  };

  Reticolo._psClear = function () {
    var d = app.activeDocument, p = Reticolo._ps, abs = artboards(d), gm = guideMap(d);
    for (var i = 0; i < p.targets.length; i++) {
      var ab = byIndex(abs, p.targets[i]);
      if (!ab) continue;
      removeGrid(d, ab, p.layer);
      removeOurGuides(d, ab, gm);
    }
    if (gm) guideSave(d, gm);
  };

  Reticolo.clear = function (json) {
    try {
      var d = doc();
      if (!d) return Reticolo.ok();
      Reticolo._ps = Reticolo.parse(json);
      withPixels(function () { d.suspendHistory("Reticolo - Cancella", "Reticolo._psClear()"); });
      return Reticolo.ok();
    } catch (e) { return Reticolo.err(e); }
  };

  Reticolo.layerState = function (json) {
    try {
      var p = Reticolo.parse(json), d = doc();
      if (!d) return Reticolo.ok({ exists: false, visible: true, locked: false });
      var sets = withPixels(function () { return allGridSets(d, p.layer); });
      if (!sets.length) return Reticolo.ok({ exists: false, visible: true, locked: false });
      return Reticolo.ok({ exists: true, visible: sets[0].visible, locked: sets[0].allLocked });
    } catch (e) { return Reticolo.err(e); }
  };

  Reticolo.setLayer = function (json) {
    try {
      var p = Reticolo.parse(json), d = doc();
      if (!d) return Reticolo.ok({ visible: true, locked: false });
      var sets = withPixels(function () { return allGridSets(d, p.layer); });
      for (var i = 0; i < sets.length; i++) {
        if (p.rename) sets[i].name = p.rename;
        if (p.visible !== undefined) sets[i].visible = p.visible;
        if (p.locked !== undefined) sets[i].allLocked = p.locked;
      }
      return Reticolo.ok({ visible: sets.length ? sets[0].visible : true, locked: sets.length ? sets[0].allLocked : false });
    } catch (e) { return Reticolo.err(e); }
  };
})();
