/*
 * Reticolo - disegno in InDesign.
 * Ogni pagina del documento e' un "artboard" (indice = documentOffset).
 * Coordinate dal pannello in punti, locali alla pagina. Le unita' passano per scriptPreferences
 * (nessuna modifica al documento); solo durante il disegno l'origine va allo spread e poi torna com'era.
 * Margini e colonne native sovrascritti vengono salvati in un'etichetta della pagina e ripristinati da Cancella.
 * Gli oggetti creati hanno label "RTC" e stanno nel livello della griglia.
 */
(function () {
  var LABEL = "RTC";

  function doc() { return app.documents.length ? app.activeDocument : null; }

  /** Unita' in punti solo per lo script (preferenza dell'app, non del documento). */
  function withScriptPoints(fn) {
    var sp = app.scriptPreferences, old = sp.measurementUnit;
    sp.measurementUnit = MeasurementUnits.POINTS;
    try { return fn(); } finally { sp.measurementUnit = old; }
  }

  /**
   * Per disegnare serve anche l'origine allo spread: si cambia dentro doScript (un solo passo
   * di Annulla) e si ripristina sempre.
   */
  function withPoints(d, fn) {
    var vp = d.viewPreferences;
    var old = { o: vp.rulerOrigin, z: d.zeroPoint };
    return withScriptPoints(function () {
      vp.rulerOrigin = RulerOrigin.SPREAD_ORIGIN;
      d.zeroPoint = [0, 0];
      try { return fn(); } finally {
        vp.rulerOrigin = old.o;
        d.zeroPoint = old.z;
      }
    });
  }

  var MARGIN_LABEL = "reticolo-margins";

  /** Salva una volta sola margini e colonne originali della pagina, prima di sovrascriverli. */
  function backupMargins(page) {
    if (page.extractLabel(MARGIN_LABEL)) return;
    var m = page.marginPreferences;
    page.insertLabel(MARGIN_LABEL, Reticolo.stringify({ top: m.top, bottom: m.bottom, left: m.left, right: m.right, columnCount: m.columnCount, columnGutter: m.columnGutter }));
  }

  function restoreMargins(page) {
    var saved = page.extractLabel(MARGIN_LABEL);
    if (!saved) return;
    try { page.marginPreferences.properties = Reticolo.parse(saved); } catch (e) { /* valori non piu' validi */ }
    page.insertLabel(MARGIN_LABEL, "");
  }

  function findLayer(d, name) {
    var l = d.layers.itemByName(name);
    return l.isValid ? l : null;
  }

  function getLayer(d, name) {
    var l = findLayer(d, name);
    if (!l) l = d.layers.add({ name: name });
    l.locked = false;
    l.visible = true;
    return l;
  }

  function swatch(d, name, hex) {
    var rgb = Reticolo.hex(hex), c = d.colors.itemByName(name);
    var value = [rgb.r, rgb.g, rgb.b];
    if (!c.isValid) c = d.colors.add({ name: name, model: ColorModel.PROCESS, space: ColorSpace.RGB, colorValue: value });
    else { c.space = ColorSpace.RGB; c.colorValue = value; }
    return c;
  }

  function clearPage(page, layer) {
    var items = page.pageItems.everyItem().getElements(), i;
    for (i = items.length - 1; i >= 0; i--) {
      try { if (items[i].label === LABEL && items[i].itemLayer.id === layer.id) items[i].remove(); } catch (e) { /* oggetto non valido */ }
    }
    var guides = page.guides.everyItem().getElements();
    for (i = guides.length - 1; i >= 0; i--) {
      try { if (guides[i].label === LABEL) guides[i].remove(); } catch (e2) { /* guida non valida */ }
    }
  }

  function pageOrigin(page) {
    var b = page.bounds; // [y1, x1, y2, x2]
    return { x: b[1], y: b[0], w: b[3] - b[1], h: b[2] - b[0] };
  }

  Reticolo.info = function () {
    var d = doc();
    if (!d) return Reticolo.ok({ app: "IDSN", doc: false });
    return withScriptPoints(function () {
      var list = [], pages = d.pages.everyItem().getElements(), active = 0;
      for (var i = 0; i < pages.length; i++) {
        var o = pageOrigin(pages[i]);
        list.push({ i: pages[i].documentOffset, name: "Pag. " + pages[i].name, w: o.w, h: o.h });
      }
      try { active = app.activeWindow.activePage.documentOffset; } catch (e) { /* nessuna finestra layout */ }
      return Reticolo.ok({ app: "IDSN", doc: true, name: d.name, res: 72, active: active, artboards: list });
    });
  };

  Reticolo._idDraw = function () {
    var d = app.activeDocument, p = Reticolo._id, st = p.style, mode = p.mode;
    withPoints(d, function () {
      var layer = getLayer(d, p.layer);
      var strokeC = swatch(d, "Reticolo linee", st.stroke), fillC = swatch(d, "Reticolo celle", st.fill);
      var fillCells = mode === "fill" || mode === "both", strokeCells = mode === "stroke" || mode === "both";

      function styleStroke(it, bold) {
        it.strokeColor = strokeC;
        it.strokeWeight = st.sw * (bold ? st.bold : 1);
        it.fillColor = "None";
        it.label = LABEL;
        if (mode === "guides") it.nonprinting = true;
      }

      for (var ti = 0; ti < p.targets.length; ti++) {
        var t = p.targets[ti], page = d.pages[t.i];
        if (!page.isValid) continue;
        clearPage(page, layer);
        var o = pageOrigin(page), k, j, pr, it, pts;

        if (t.native) {
          var n = t.native;
          backupMargins(page);
          page.marginPreferences.properties = { top: n.t, bottom: n.b, left: n.l, right: n.r, columnCount: n.count, columnGutter: n.gutter };
        } else restoreMargins(page);

        for (k = 0; k < t.prims.length; k++) {
          pr = t.prims[k];
          if (pr.t === "R") {
            var gb = [o.y + pr.a[1], o.x + pr.a[0], o.y + pr.a[1] + pr.a[3], o.x + pr.a[0] + pr.a[2]];
            if (fillCells) {
              it = page.rectangles.add(layer, undefined, undefined, { geometricBounds: gb });
              it.fillColor = fillC;
              it.strokeWeight = 0;
              it.strokeColor = "None";
              it.transparencySettings.blendingSettings.opacity = st.fa;
              it.label = LABEL;
            }
            if (strokeCells) {
              it = page.rectangles.add(layer, undefined, undefined, { geometricBounds: gb });
              styleStroke(it, false);
            }
          } else if (pr.t === "L") {
            it = page.graphicLines.add(layer);
            it.paths[0].entirePath = [[o.x + pr.a[0], o.y + pr.a[1]], [o.x + pr.a[2], o.y + pr.a[3]]];
            styleStroke(it, pr.b);
          } else if (pr.t === "P" || pr.t === "B") {
            pts = [];
            for (j = 0; j < pr.p.length; j++) {
              var q = pr.p[j];
              if (pr.t === "P") pts.push([o.x + q[0], o.y + q[1]]);
              else pts.push([[o.x + q[2], o.y + q[3]], [o.x + q[0], o.y + q[1]], [o.x + q[4], o.y + q[5]]]);
            }
            it = page.polygons.add(layer);
            it.paths[0].entirePath = pts;
            it.paths[0].pathType = pr.c ? PathType.CLOSED_PATH : PathType.OPEN_PATH;
            styleStroke(it, false);
          }
        }

        if (t.guides) {
          var gd;
          for (j = 0; j < t.guides.v.length; j++) {
            gd = page.guides.add(layer, { orientation: HorizontalOrVertical.VERTICAL, location: o.x + t.guides.v[j], fitToPage: true });
            gd.label = LABEL;
          }
          for (j = 0; j < t.guides.h.length; j++) {
            gd = page.guides.add(layer, { orientation: HorizontalOrVertical.HORIZONTAL, location: o.y + t.guides.h[j], fitToPage: true });
            gd.label = LABEL;
          }
        }
      }
      layer.locked = !!p.lock;
    });
  };

  Reticolo.draw = function (json) {
    try {
      if (!doc()) return Reticolo.err("No document");
      Reticolo._id = Reticolo.parse(json);
      app.doScript(Reticolo._idDraw, ScriptLanguage.JAVASCRIPT, undefined, UndoModes.ENTIRE_SCRIPT, "Reticolo");
      return Reticolo.ok({ ok: true, count: Reticolo._id.targets.length });
    } catch (e) { return Reticolo.err(e); }
  };

  Reticolo._idClear = function () {
    var d = app.activeDocument, p = Reticolo._id, layer = findLayer(d, p.layer);
    if (!layer) return;
    var wasLocked = layer.locked;
    layer.locked = false;
    for (var i = 0; i < p.targets.length; i++) {
      var page = d.pages[p.targets[i]];
      if (page.isValid) { clearPage(page, layer); restoreMargins(page); }
    }
    layer.locked = wasLocked;
  };

  Reticolo.clear = function (json) {
    try {
      if (!doc()) return Reticolo.ok();
      Reticolo._id = Reticolo.parse(json);
      app.doScript(Reticolo._idClear, ScriptLanguage.JAVASCRIPT, undefined, UndoModes.ENTIRE_SCRIPT, "Reticolo - Cancella");
      return Reticolo.ok();
    } catch (e) { return Reticolo.err(e); }
  };

  Reticolo.layerState = function (json) {
    try {
      var p = Reticolo.parse(json), d = doc(), l = d ? findLayer(d, p.layer) : null;
      if (!l) return Reticolo.ok({ exists: false, visible: true, locked: false });
      return Reticolo.ok({ exists: true, visible: l.visible, locked: l.locked });
    } catch (e) { return Reticolo.err(e); }
  };

  Reticolo.setLayer = function (json) {
    try {
      var p = Reticolo.parse(json), d = doc(), l = d ? findLayer(d, p.layer) : null;
      if (!l) return Reticolo.ok({ visible: true, locked: false });
      if (p.rename && !d.layers.itemByName(p.rename).isValid) l.name = p.rename;
      if (p.visible !== undefined) l.visible = p.visible;
      if (p.locked !== undefined) l.locked = p.locked;
      return Reticolo.ok({ visible: l.visible, locked: l.locked });
    } catch (e) { return Reticolo.err(e); }
  };
})();
