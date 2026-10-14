/*
 * Reticolo - disegno in Illustrator.
 * Coordinate dal pannello: locali all'artboard, origine in alto a sinistra, y verso il basso, in punti.
 * Ogni artboard ha un gruppo "RTC:<indice>" nel livello della griglia; le guide sono tracciati
 * con .guides = true e nome "RTC:...". Cancella rimuove solo gli oggetti "RTC" che cadono nell'artboard.
 * Griglie dentro un oggetto chiuso: gruppo "RTC:o:<uuid>" con maschera di ritaglio sulla forma dell'oggetto.
 */
(function () {
  function doc() { return app.documents.length ? app.activeDocument : null; }

  function findLayer(d, name) {
    for (var i = 0; i < d.layers.length; i++) if (d.layers[i].name === name) return d.layers[i];
    return null;
  }

  function getLayer(d, name) {
    var l = findLayer(d, name);
    if (!l) {
      l = d.layers.add();
      l.name = name;
    }
    l.locked = false;
    l.visible = true;
    return l;
  }

  function color(d, hex) {
    var rgb = Reticolo.hex(hex), c;
    if (d.documentColorSpace === DocumentColorSpace.CMYK) {
      var k = Reticolo.cmyk(rgb);
      c = new CMYKColor();
      c.cyan = k.c; c.magenta = k.m; c.yellow = k.y; c.black = k.k;
    } else {
      c = new RGBColor();
      c.red = rgb.r; c.green = rgb.g; c.blue = rgb.b;
    }
    return c;
  }

  function tag(i) { return "RTC:" + i; }

  /** Tutte le coordinate in sistema documento, qualunque cosa abbia lasciato attivo un altro script. */
  function withDocCoords(fn) {
    var old = app.coordinateSystem;
    app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
    try { return fn(); } finally { app.coordinateSystem = old; }
  }

  /**
   * Rimuove gli oggetti di Reticolo che cadono nell'artboard i, riconoscendoli dalla posizione
   * e non dall'indice: se l'utente elimina o riordina gli artboard le griglie restano coerenti.
   */
  function removeTagged(d, layer, i) {
    var r = d.artboards[i].artboardRect, eps = 0.5;
    for (var k = layer.pageItems.length - 1; k >= 0; k--) {
      try {
        var it = layer.pageItems[k];
        var nm = String(it.name);
        if (nm.substr(0, 3) !== "RTC" || nm.substr(0, 6) === "RTC:o:") continue;
        var b = it.geometricBounds, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
        if (cx >= r[0] - eps && cx <= r[2] + eps && cy <= r[1] + eps && cy >= r[3] - eps) it.remove();
      } catch (e) { /* gia' rimosso col gruppo */ }
    }
  }

  // ---------------------------------------------------------------- oggetti chiusi

  function isClosed(it) {
    try {
      if (String(it.name).substr(0, 3) === "RTC") return false;
      if (it.typename === "CompoundPathItem") return it.pathItems.length > 0;
      if (it.typename === "PathItem") return it.closed && !it.guides && !it.clipping && it.pathPoints.length > 2;
    } catch (e) { /* oggetto non leggibile */ }
    return false;
  }

  function objId(it) {
    try { if (it.uuid) return String(it.uuid); } catch (e) { /* Illustrator senza uuid */ }
    return null;
  }

  function describe(it) {
    var b = it.geometricBounds;
    return {
      id: objId(it), name: String(it.name || ""), kind: it.typename === "CompoundPathItem" ? "compound" : "path",
      w: b[2] - b[0], h: b[1] - b[3]
    };
  }

  /** Oggetti chiusi del livello attivo, anche dentro gruppi (non nelle maschere di ritaglio). */
  function collect(container, out) {
    for (var i = 0; i < container.pageItems.length && out.length < 300; i++) {
      var it = container.pageItems[i];
      if (it.typename === "GroupItem" && !it.clipped && String(it.name).substr(0, 3) !== "RTC") collect(it, out);
      else if (isClosed(it) && objId(it)) out.push(describe(it));
    }
  }

  function findObject(d, id) {
    try { var it = d.getPageItemFromUuid(id); if (it && isClosed(it)) return it; } catch (e) { /* non trovato */ }
    return null;
  }

  function removeNamed(layer, name) {
    for (var k = layer.pageItems.length - 1; k >= 0; k--) {
      try { if (layer.pageItems[k].name === name) layer.pageItems[k].remove(); } catch (e) { /* gia' rimosso */ }
    }
  }

  Reticolo.info = function () {
    var d = doc();
    if (!d) return Reticolo.ok({ app: "ILST", doc: false });
    return withDocCoords(function () {
      var abs = [];
      for (var i = 0; i < d.artboards.length; i++) {
        var r = d.artboards[i].artboardRect;
        abs.push({ i: i, name: d.artboards[i].name, w: r[2] - r[0], h: r[1] - r[3] });
      }
      var objects = [], selection = null, layerName = "";
      try {
        layerName = d.activeLayer.name;
        collect(d.activeLayer, objects);
      } catch (e) { /* nessun livello attivo */ }
      try {
        var sel = d.selection;
        for (var s = 0; s < sel.length; s++) if (isClosed(sel[s]) && objId(sel[s])) { selection = describe(sel[s]); break; }
      } catch (e2) { /* selezione non leggibile (es. testo) */ }
      return Reticolo.ok({
        app: "ILST", doc: true, name: d.name, res: 72, active: d.artboards.getActiveArtboardIndex(), artboards: abs,
        layerName: layerName, objects: objects, selection: selection
      });
    });
  };

  Reticolo.draw = function (json) {
    try {
      var p = Reticolo.parse(json), d = doc();
      if (!d) return Reticolo.err("No document");
      return withDocCoords(function () { return drawIn(d, p); });
    } catch (e) { return Reticolo.err(e); }
  };

  function drawIn(d, p) {
    var prevActive = null;
    try { prevActive = d.activeLayer; } catch (e0) { /* nessun livello attivo */ }
    var layer = getLayer(d, p.layer), st = p.style, mode = p.mode;
    var strokeC = color(d, st.stroke), fillC = color(d, st.fill);
    var fillCells = mode === "fill" || mode === "both", strokeCells = mode === "stroke" || mode === "both";
    var asGuides = mode === "guides";

    var style = function (item, bold) {
      item.filled = false;
      item.stroked = true;
      item.strokeColor = strokeC;
      item.strokeWidth = st.sw * (bold ? st.bold : 1);
      if (asGuides) item.guides = true;
    };

    var missing = 0;
    for (var ti = 0; ti < p.targets.length; ti++) {
      var t = p.targets[ti], obj = null, ox, oy, abW, abH, name;
      if (t.obj) {
        obj = findObject(d, t.obj);
        if (!obj) { missing++; continue; }
        name = "RTC:o:" + t.obj;
        removeNamed(layer, name);
        var gb = obj.geometricBounds;
        ox = gb[0]; oy = gb[1]; abW = gb[2] - gb[0]; abH = gb[1] - gb[3];
      } else {
        removeTagged(d, layer, t.i);
        var rect = d.artboards[t.i].artboardRect;
        ox = rect[0]; oy = rect[1]; abW = rect[2] - rect[0]; abH = rect[1] - rect[3];
        name = tag(t.i);
      }
      var grp = layer.groupItems.add();
      grp.name = name;

      for (var k = 0; k < t.prims.length; k++) {
        var pr = t.prims[k], it, j;
        if (pr.t === "R") {
          if (fillCells) {
            it = grp.pathItems.rectangle(oy - pr.a[1], ox + pr.a[0], pr.a[2], pr.a[3]);
            it.stroked = false; it.filled = true; it.fillColor = fillC; it.opacity = st.fa;
          }
          if (strokeCells || asGuides) {
            it = grp.pathItems.rectangle(oy - pr.a[1], ox + pr.a[0], pr.a[2], pr.a[3]);
            style(it, false);
          }
        } else if (pr.t === "L") {
          it = grp.pathItems.add();
          it.setEntirePath([[ox + pr.a[0], oy - pr.a[1]], [ox + pr.a[2], oy - pr.a[3]]]);
          style(it, pr.b);
        } else if (pr.t === "P") {
          var pts = [];
          for (j = 0; j < pr.p.length; j++) pts.push([ox + pr.p[j][0], oy - pr.p[j][1]]);
          it = grp.pathItems.add();
          it.setEntirePath(pts);
          it.closed = !!pr.c;
          style(it, false);
        } else if (pr.t === "B") {
          var anchors = [];
          for (j = 0; j < pr.p.length; j++) anchors.push([ox + pr.p[j][0], oy - pr.p[j][1]]);
          it = grp.pathItems.add();
          it.setEntirePath(anchors);
          for (j = 0; j < pr.p.length; j++) {
            var q = pr.p[j], pp = it.pathPoints[j];
            pp.leftDirection = [ox + q[2], oy - q[3]];
            pp.rightDirection = [ox + q[4], oy - q[5]];
            pp.pointType = PointType.SMOOTH;
          }
          it.closed = !!pr.c;
          style(it, false);
        }
      }

      // guide native: linee a tutta altezza/larghezza dell'artboard
      if (t.guides) {
        var gl;
        for (j = 0; j < t.guides.v.length; j++) {
          gl = layer.pathItems.add();
          gl.setEntirePath([[ox + t.guides.v[j], oy], [ox + t.guides.v[j], oy - abH]]);
          gl.guides = true; gl.name = name;
        }
        for (j = 0; j < t.guides.h.length; j++) {
          gl = layer.pathItems.add();
          gl.setEntirePath([[ox, oy - t.guides.h[j]], [ox + abW, oy - t.guides.h[j]]]);
          gl.guides = true; gl.name = name;
        }
      }
      if (grp.pageItems.length === 0) { grp.remove(); continue; }
      // dentro un oggetto: maschera di ritaglio con una copia della sua forma (le guide non si ritagliano)
      if (obj && !asGuides) {
        try {
          var mask = obj.duplicate(grp, ElementPlacement.PLACEATBEGINNING);
          if (mask.typename === "CompoundPathItem") mask.pathItems[0].clipping = true;
          else mask.clipping = true;
          grp.clipped = true;
        } catch (eMask) { /* forma non ritagliabile: resta la griglia sul riquadro */ }
      }
    }
    // il livello attivo resta quello dell'utente, cosi' l'elenco oggetti del pannello non cambia
    try { if (prevActive && prevActive !== layer) d.activeLayer = prevActive; } catch (e1) { /* livello bloccato */ }
    layer.locked = !!p.lock;
    app.redraw();
    if (missing) return Reticolo.ok({ ok: true, count: p.targets.length - missing, error: "objectGone" });
    return Reticolo.ok({ ok: true, count: p.targets.length });
  }

  Reticolo.clear = function (json) {
    try {
      var p = Reticolo.parse(json), d = doc();
      if (!d) return Reticolo.ok();
      var layer = findLayer(d, p.layer);
      if (!layer) return Reticolo.ok();
      var wasLocked = layer.locked, wasVisible = layer.visible;
      layer.locked = false;
      layer.visible = true;
      withDocCoords(function () {
        for (var i = 0; i < p.targets.length; i++) {
          var tg = p.targets[i];
          if (tg.obj) removeNamed(layer, "RTC:o:" + tg.obj);
          else if (tg.i < d.artboards.length) removeTagged(d, layer, tg.i);
        }
      });
      if (layer.pageItems.length === 0 && layer.layers.length === 0) layer.remove();
      else { layer.visible = wasVisible; layer.locked = wasLocked; }
      app.redraw();
      return Reticolo.ok();
    } catch (e) { return Reticolo.err(e); }
  };

  Reticolo.layerState = function (json) {
    try {
      var p = Reticolo.parse(json), d = doc();
      var layer = d ? findLayer(d, p.layer) : null;
      if (!layer) return Reticolo.ok({ exists: false, visible: true, locked: false });
      return Reticolo.ok({ exists: true, visible: layer.visible, locked: layer.locked });
    } catch (e) { return Reticolo.err(e); }
  };

  Reticolo.setLayer = function (json) {
    try {
      var p = Reticolo.parse(json), d = doc();
      var layer = d ? findLayer(d, p.layer) : null;
      if (!layer) return Reticolo.ok({ visible: true, locked: false });
      if (p.rename && !findLayer(d, p.rename)) layer.name = p.rename;
      if (p.visible !== undefined) layer.visible = p.visible;
      if (p.locked !== undefined) layer.locked = p.locked;
      app.redraw();
      return Reticolo.ok({ visible: layer.visible, locked: layer.locked });
    } catch (e) { return Reticolo.err(e); }
  };
})();
