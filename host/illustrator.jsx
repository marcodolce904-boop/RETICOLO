/*
 * Reticolo - disegno in Illustrator.
 * Coordinate dal pannello: locali all'artboard, origine in alto a sinistra, y verso il basso, in punti.
 * Ogni artboard ha un gruppo "RTC:<indice>" nel livello della griglia; le guide sono tracciati
 * con .guides = true e nome "RTC:...". Cancella rimuove solo gli oggetti "RTC" che cadono nell'artboard.
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
        if (String(it.name).substr(0, 3) !== "RTC") continue;
        var b = it.geometricBounds, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
        if (cx >= r[0] - eps && cx <= r[2] + eps && cy <= r[1] + eps && cy >= r[3] - eps) it.remove();
      } catch (e) { /* gia' rimosso col gruppo */ }
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
      return Reticolo.ok({ app: "ILST", doc: true, name: d.name, res: 72, active: d.artboards.getActiveArtboardIndex(), artboards: abs });
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

    for (var ti = 0; ti < p.targets.length; ti++) {
      var t = p.targets[ti];
      removeTagged(d, layer, t.i);
      var rect = d.artboards[t.i].artboardRect, ox = rect[0], oy = rect[1];
      var abW = rect[2] - rect[0], abH = rect[1] - rect[3];
      var grp = layer.groupItems.add();
      grp.name = tag(t.i);

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
          gl.guides = true; gl.name = tag(t.i);
        }
        for (j = 0; j < t.guides.h.length; j++) {
          gl = layer.pathItems.add();
          gl.setEntirePath([[ox, oy - t.guides.h[j]], [ox + abW, oy - t.guides.h[j]]]);
          gl.guides = true; gl.name = tag(t.i);
        }
      }
      if (grp.pageItems.length === 0) grp.remove();
    }
    layer.locked = !!p.lock;
    app.redraw();
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
        for (var i = 0; i < p.targets.length; i++) removeTagged(d, layer, p.targets[i]);
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
