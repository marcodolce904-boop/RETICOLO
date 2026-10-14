/* Reticolo - logica del pannello. */
(function () {
  "use strict";

  var E = window.RTC_ENGINE, P = window.RTC_PRESETS, I = window.RTC_I18N, H = window.RTC_HOST, LIB = window.RTC_LIBRARY;
  var t = I.t;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ico(name, cls) { return window.rtcIcon(name, cls); }
  function fmt(n) { return (Math.round(n * 100) / 100).toString(); }
  function debounce(fn, ms) { var h; return function () { clearTimeout(h); h = setTimeout(fn, ms); }; }

  // ---------------------------------------------------------------- stato e archivio

  var BASE = H.isCEP ? H.systemPath("userData") + "/Reticolo" : "reticolo";
  var SETTINGS_PATH = BASE + "/settings.json";
  var LIBRARY_PATH = BASE + "/library.json";

  function defaultSettings() {
    return {
      lang: "it",
      render: "stroke",
      style: { stroke: "#00B8D9", fill: "#00B8D9", sw: 1, fa: 12, bold: 2 },
      layer: "Reticolo",
      lockAfter: false,
      idNative: true,
      mirrorPages: false,
      live: false,
      target: "all",
      grid: E.defaults()
    };
  }

  function loadSettings() {
    var s = defaultSettings(), text = H.fs.read(SETTINGS_PATH);
    if (text) {
      try {
        var saved = JSON.parse(text);
        Object.keys(s).forEach(function (k) {
          if (saved[k] === undefined) return;
          if (k === "style") Object.keys(s.style).forEach(function (sk) { if (saved.style && saved.style[sk] !== undefined) s.style[sk] = saved.style[sk]; });
          else s[k] = saved[k];
        });
      } catch (e) { /* file corrotto: si riparte dai predefiniti */ }
    }
    s.grid = E.normalize(s.grid);
    return s;
  }

  var S = {
    set: loadSettings(),
    doc: null,
    layer: { visible: true, locked: false },
    view: "main",
    libFilter: "all",
    libQuery: "",
    renaming: null,
    confirming: null,
    presetValue: "",
    busy: false,
    pending: false
  };
  S.grid = S.set.grid;
  I.lang = S.set.lang;

  var lib = new LIB.Library({
    read: function () { return H.fs.read(LIBRARY_PATH); },
    write: function (text) { return H.fs.write(LIBRARY_PATH, text); },
    backup: function (text) { H.fs.write(BASE + "/library-backup-" + Date.now() + ".json", text); }
  }).load();

  var persist = debounce(function () {
    S.set.grid = S.grid;
    H.fs.write(SETTINGS_PATH, JSON.stringify(S.set, null, 2));
  }, 400);

  // ---------------------------------------------------------------- percorsi nell'oggetto griglia

  function resolvePath(path) { return path.replace(/^@/, S.grid.type); }

  function getPath(obj, path) {
    return path.split(".").reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }

  function setPath(obj, path, val) {
    var keys = path.split("."), last = keys.pop();
    var o = keys.reduce(function (acc, k) { return acc[k]; }, obj);
    o[last] = val;
  }

  function currentParams() { return S.grid[S.grid.type]; }

  // ---------------------------------------------------------------- tema

  function applyTheme() {
    var root = document.documentElement;
    var env = H.env();
    if (!H.isCEP || !env.appSkinInfo) { root.classList.add("demo"); return; }
    var c = env.appSkinInfo.panelBackgroundColor.color;
    var lum = (0.299 * c.red + 0.587 * c.green + 0.114 * c.blue) / 255;
    root.classList.toggle("theme-light", lum > 0.55);
    if (lum > 0.55) {
      ["--bg", "--surface", "--surface-2", "--surface-3", "--line", "--line-strong"].forEach(function (k) { root.style.removeProperty(k); });
      return;
    }
    function shade(d) {
      return "rgb(" + [c.red, c.green, c.blue].map(function (v) { return Math.max(0, Math.min(255, Math.round(v + d))); }).join(",") + ")";
    }
    root.style.setProperty("--bg", shade(0));
    root.style.setProperty("--surface", shade(8));
    root.style.setProperty("--surface-2", shade(16));
    root.style.setProperty("--surface-3", shade(26));
    root.style.setProperty("--line", shade(28));
    root.style.setProperty("--line-strong", shade(46));
  }

  // ---------------------------------------------------------------- host

  function ctx() { return { app: S.doc ? S.doc.app : "ILST", res: S.doc ? S.doc.res || 72 : 72 }; }

  function refreshDoc() {
    return H.call("info").then(function (info) {
      S.doc = info && info.doc ? info : null;
      if (S.doc) refreshLayer();
      renderTargets();
      renderMain();
    });
  }

  function refreshLayer() {
    return H.call("layerState", { layer: layerName() }).then(function (st) {
      if (st && !st.error) { S.layer.visible = st.visible !== false; S.layer.locked = !!st.locked; }
      renderLayerButtons();
    });
  }

  function layerName() { return (S.set.layer || "Reticolo").trim() || "Reticolo"; }

  /**
   * Dove disegnare: artboard/pagine ({ i }) oppure un oggetto chiuso ({ obj }).
   * Valori della tendina: "all", "active", "i:<n>", "sel" (oggetto selezionato), "o:<id>".
   */
  function resolveTargets() {
    if (!S.doc) return [];
    var v = S.set.target, abs = S.doc.artboards;
    var asAb = function (a) { return { i: a.i, w: a.w, h: a.h, side: a.side }; };
    var asObj = function (o) { return { obj: o.id, w: o.w, h: o.h }; };
    if (v === "sel") return S.doc.selection ? [asObj(S.doc.selection)] : [];
    if (/^o:/.test(v)) {
      var o = (S.doc.objects || []).filter(function (x) { return "o:" + x.id === v; })[0];
      return o ? [asObj(o)] : [];
    }
    if (v === "active") return abs.filter(function (a) { return a.i === S.doc.active; }).map(asAb);
    if (/^i:-?\d+$/.test(v)) {
      var i = parseInt(v.slice(2), 10), hit = abs.filter(function (a) { return a.i === i; });
      if (hit.length) return hit.map(asAb);
    }
    return abs.map(asAb);
  }

  /**
   * Pagina sinistra di un libro? Le griglie sono disegnate per la pagina destra (recto):
   * sulle sinistre vengono specchiate. InDesign comunica il lato reale ("L", "R", "S" = pagina singola);
   * altrove vale la numerazione: pagina 1 a destra, la 2 a sinistra, e così via.
   */
  function isLeftPage(ab) {
    if (ab.obj || !S.set.mirrorPages) return false;
    var side = ab.side || (S.doc.app === "IDSN" ? "S" : ab.i % 2 === 1 ? "L" : "R");
    return side === "L";
  }

  function isObjectTarget() { return S.set.target === "sel" || /^o:/.test(S.set.target); }

  function buildPayload() {
    var c = ctx(), mode = S.set.render, targets = [], err = null;
    resolveTargets().forEach(function (ab) {
      var out = E.build(S.grid, { w: ab.w, h: ab.h }, c);
      if (out.error) { err = out.error; return; }
      var left = isLeftPage(ab);
      var prims = left ? E.mirrorX(out.prims, ab.w) : out.prims, guides = null, native = null;
      var p = currentParams();
      if (c.app === "IDSN" && !ab.obj && mode === "guides" && S.set.idNative && S.grid.type === "columns" && !(p.maxWidth > 0)) {
        var f = E.unitFactor(S.grid.unit, c);
        native = {
          count: Math.round(p.count), gutter: p.gutter * f,
          t: p.margins.t * f, r: (left ? p.margins.l : p.margins.r) * f, b: p.margins.b * f, l: (left ? p.margins.r : p.margins.l) * f
        };
        prims = [];
      } else if (mode === "guides") {
        var g = E.toGuides(prims);
        guides = { v: g.v, h: g.h };
        prims = g.rest;
      }
      if (c.app === "PHXS") prims = E.flattenAll(prims, 12);
      var tg = { prims: prims, guides: guides, native: native };
      if (ab.obj) tg.obj = ab.obj; else tg.i = ab.i;
      targets.push(tg);
    });
    return {
      error: err,
      payload: { layer: layerName(), mode: mode, style: S.set.style, lock: !!S.set.lockAfter, targets: targets }
    };
  }

  function generate(silent) {
    if (!S.doc) { if (!silent) toast(t("noDoc"), true); return; }
    if (S.busy) { S.pending = S.pending === "explicit" || !silent ? "explicit" : "live"; return; }
    var b = buildPayload();
    if (b.error) { if (!silent) toast(t("err." + b.error), true); return; }
    if (!b.payload.targets.length) {
      if (!silent) toast(t(S.set.target === "sel" ? "err.noSelection" : "err.objectGone"), true);
      return;
    }
    S.busy = true;
    H.call("draw", b.payload).then(function (res) {
      S.busy = false;
      if (res && res.error === "objectGone") toast(t("err.objectGone"), true);
      else if (res && res.error) toast(t("hostError", { msg: res.error }), true);
      else if (!silent) toast(t("done", { n: b.payload.targets.length, what: isObjectTarget() ? t(b.payload.targets.length === 1 ? "what.obj1" : "what.obj") : S.doc.app === "IDSN" ? t("what.pages") : t("what.ab") }));
      S.layer.locked = !!S.set.lockAfter;
      S.layer.visible = true;
      renderLayerButtons();
      if (S.pending) { var explicit = S.pending === "explicit"; S.pending = false; generate(!explicit); }
    });
  }

  var liveGenerate = debounce(function () { if (S.set.live) generate(true); }, 280);

  /** Rinomina il livello griglia esistente invece di lasciarlo orfano. */
  function renameLayer(value) {
    var oldName = layerName(), next = String(value || "").trim() || "Reticolo";
    if (next === oldName) { renderSettings(); return; }
    var apply = function () { S.set.layer = next; persist(); renderSettings(); refreshLayer(); };
    if (!S.doc) { apply(); return; }
    H.call("setLayer", { layer: oldName, rename: next }).then(apply);
  }

  /** Genera dopo aver riletto il documento: l'artboard attivo puo' essere cambiato senza eventi. */
  function generateNow() {
    if (!H.isCEP) { generate(false); return; }
    refreshDoc().then(function () { generate(false); });
  }

  function clearGrid() {
    if (!S.doc) return;
    var targets = resolveTargets().map(function (tg) { return tg.obj ? { obj: tg.obj } : { i: tg.i }; });
    if (!targets.length) { toast(t(S.set.target === "sel" ? "err.noSelection" : "err.objectGone"), true); return; }
    H.call("clear", { layer: layerName(), targets: targets }).then(function (res) {
      if (res && res.error) toast(t("hostError", { msg: res.error }), true);
      else toast(t("cleared"));
    });
  }

  // ---------------------------------------------------------------- miniature

  function refArtboard(grid) {
    if (grid.unit === "mm" || grid.unit === "pt") return { w: 595.28, h: 841.89 };
    return { w: 1440, h: 900 };
  }

  function thumbSVG(grid, ab, cls) {
    var out = E.build(grid, ab, { app: "ILST" });
    var parts = [];
    (out.prims || []).forEach(function (p) {
      if (p.t === "R") parts.push('<rect x="' + p.a[0] + '" y="' + p.a[1] + '" width="' + p.a[2] + '" height="' + p.a[3] + '" fill="currentColor" fill-opacity=".22" stroke="currentColor"/>');
      else if (p.t === "L") parts.push('<line x1="' + p.a[0] + '" y1="' + p.a[1] + '" x2="' + p.a[2] + '" y2="' + p.a[3] + '" stroke="currentColor"' + (p.b ? ' stroke-width="2"' : "") + "/>");
      else {
        var pts = p.t === "B" ? E.flattenBezier(p, 8) : p.p;
        parts.push("<" + (p.c ? "polygon" : "polyline") + ' points="' + pts.map(function (q) { return fmt(q[0]) + "," + fmt(q[1]); }).join(" ") + '" fill="none" stroke="currentColor"/>');
      }
    });
    return '<svg class="' + (cls || "") + '" viewBox="0 0 ' + ab.w + " " + ab.h + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      '<g stroke-width="1" vector-effect="non-scaling-stroke" style="vector-effect:non-scaling-stroke">' + parts.join("").replace(/\/>/g, ' vector-effect="non-scaling-stroke"/>') + "</g></svg>";
  }

  function describe(grid) {
    var g = E.normalize(grid), p = g[g.type], u = g.unit;
    if (g.type === "columns" && String(p.ratios || "").trim()) return "col " + String(p.ratios).trim() + " / " + fmt(p.gutter) + " " + u;
    if (g.type === "columns") return p.count + " col / " + fmt(p.gutter) + " " + u + (p.maxWidth > 0 ? " / max " + fmt(p.maxWidth) : "");
    if (g.type === "modular") return p.sizing === "fixed" ? fmt(p.mw) + " x " + fmt(p.mh) + " " + u : p.cols + " x " + p.rows + " / " + fmt(p.gx) + " " + u;
    if (g.type === "baseline") return (p.dir === "dots" ? "dot grid " : "baseline ") + fmt(p.spacing) + " " + u + (p.dir === "both" ? " (h+v)" : p.dir === "v" ? " (v)" : "");
    return I.variant(p.variant);
  }

  // ---------------------------------------------------------------- rendering: principale

  function renderTargets() {
    var sel = $("#target"), app = S.doc ? S.doc.app : "ILST", opts = [];
    if (!S.doc) {
      sel.innerHTML = '<option value="all">' + esc(t("target.all")) + "</option>";
      return;
    }
    var abs = S.doc.artboards;
    if (app === "PHXS" && abs.length === 1 && abs[0].i === -1) {
      opts.push(["all", t("target.canvas")]);
    } else {
      opts.push(["all", app === "IDSN" ? t("target.allPages") : t("target.all")]);
      opts.push(["active", app === "IDSN" ? t("target.activePage") : t("target.active")]);
      abs.forEach(function (a) { opts.push(["i:" + a.i, a.name]); });
    }
    // oggetti chiusi: la selezione corrente e quelli del livello attivo
    var unit = app === "PHXS" ? "px" : "pt", objOpts = [];
    // gli oggetti senza nome vengono numerati per tipo: "Tracciato 1", "Ellisse 2"...
    var counters = {}, names = {};
    (S.doc.objects || []).forEach(function (o) {
      if (o.name) { names[o.id] = o.name; return; }
      counters[o.kind] = (counters[o.kind] || 0) + 1;
      names[o.id] = t("obj." + o.kind) + " " + counters[o.kind];
    });
    var label = function (o) {
      var name = names[o.id] || o.name || t("obj." + o.kind);
      return name + " (" + Math.round(o.w) + " x " + Math.round(o.h) + " " + unit + (o.page ? ", " + t("obj.page") + " " + o.page : "") + ")";
    };
    objOpts.push(["sel", t("target.selection") + (S.doc.selection ? ": " + label(S.doc.selection) : " (" + t("target.noSelection") + ")")]);
    (S.doc.objects || []).forEach(function (o) { objOpts.push(["o:" + o.id, label(o)]); });
    var all = opts.concat(objOpts);
    if (!all.some(function (o) { return o[0] === S.set.target; })) S.set.target = "all";
    var optHTML = function (o) {
      return '<option value="' + esc(o[0]) + '"' + (o[0] === S.set.target ? " selected" : "") + ">" + esc(o[1]) + "</option>";
    };
    var groupLabel = S.doc.layerName ? t("target.layerObjects", { name: S.doc.layerName }) : t("target.objects");
    sel.innerHTML = '<optgroup label="' + esc(app === "IDSN" ? t("target.pagesGroup") : t("target.abGroup")) + '">' + opts.map(optHTML).join("") + "</optgroup>" +
      '<optgroup label="' + esc(groupLabel) + '">' + objOpts.map(optHTML).join("") +
      (objOpts.length === 1 ? '<option disabled>' + esc(t("target.noObjects")) + "</option>" : "") + "</optgroup>";
  }

  function renderPresets() {
    var html = '<option value="">' + esc(t("preset.choose")) + "</option>";
    P.CATEGORIES.forEach(function (cat) {
      html += '<optgroup label="' + esc(t("cat." + cat)) + '">' + P.list.filter(function (p) { return p.cat === cat; }).map(function (p) {
        return '<option value="b:' + p.id + '">' + esc(I.name(p.name)) + "</option>";
      }).join("") + "</optgroup>";
    });
    if (lib.grids.length) {
      html += '<optgroup label="' + esc(t("preset.mine")) + '">' + lib.grids.map(function (g) {
        return '<option value="u:' + esc(g.id) + '">' + esc(g.name) + "</option>";
      }).join("") + "</optgroup>";
    }
    var sel = $("#preset");
    sel.innerHTML = html;
    sel.value = S.presetValue;
    if (sel.value !== S.presetValue) { S.presetValue = ""; sel.value = ""; }
  }

  var variantsKey = "";
  function renderVariants() {
    var p = S.grid.comp, fam = p.family, ab = { w: 300, h: 200 };
    var key = [I.lang, fam, p.variant, p.flipH, p.flipV].join("|");
    if (key === variantsKey) return;
    variantsKey = key;
    $("#variants").innerHTML = E.VARIANTS[fam].map(function (v) {
      var g = { type: "comp", unit: "px", comp: { family: fam, variant: v, spacing: 22, count: 12, flipH: p.flipH, flipV: p.flipV } };
      return '<button class="variant" type="button" data-variant="' + v + '" aria-pressed="' + (p.variant === v) + '">' +
        thumbSVG(g, ab) + "<span>" + esc(I.variant(v)) + "</span></button>";
    }).join("");
  }

  function readout() {
    var el = $("#readout");
    if (!S.doc) { el.textContent = ""; el.classList.remove("err"); return; }
    var ab = resolveTargets()[0];
    if (!ab) {
      el.classList.toggle("err", isObjectTarget());
      el.textContent = isObjectTarget() ? t(S.set.target === "sel" ? "err.noSelection" : "err.objectGone") : "";
      return;
    }
    var out = E.build(S.grid, { w: ab.w, h: ab.h }, ctx()), u = S.grid.unit;
    el.classList.toggle("err", !!out.error);
    if (out.error) { el.textContent = t("err." + out.error); return; }
    var i = out.info || {};
    if (S.grid.type === "columns" && i.uneven) el.textContent = t("readout.cols", { w: i.widths.map(fmt).join(" / ") + " " + u });
    else if (S.grid.type === "columns") el.textContent = t("readout.col", { w: fmt(i.colW) + " " + u });
    else if (S.grid.type === "modular") el.textContent = t("readout.mod", { w: fmt(i.colW), h: fmt(i.rowH) + " " + u, c: i.cols, r: i.rows });
    else if (i.x !== undefined) el.textContent = t("readout.x", { x: fmt(i.x) + " " + u, n: i.lines });
    else el.textContent = t("readout.lines", { n: i.lines });
  }

  function renderLayerButtons() {
    var v = $("#btnVisible"), l = $("#btnLock");
    v.innerHTML = ico(S.layer.visible ? "eye" : "eye-slash");
    v.setAttribute("aria-pressed", String(!S.layer.visible));
    l.innerHTML = ico(S.layer.locked ? "lock-simple" : "lock-simple-open");
    l.setAttribute("aria-pressed", String(S.layer.locked));
    v.disabled = l.disabled = !S.doc;
  }

  function renderMain(skipEl) {
    var type = S.grid.type, p = currentParams();
    $$(".tab").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.tab === type)); });
    $$("[data-pane]").forEach(function (s) { s.hidden = s.dataset.pane !== type; });

    $$("[data-bind]").forEach(function (inp) {
      if (inp === skipEl) return;
      var v = getPath(S.grid, resolvePath(inp.dataset.bind));
      if (inp.hasAttribute("data-text")) { inp.value = v || ""; return; }
      inp.value = v === undefined ? "" : fmt(v);
      inp.closest(".num").classList.remove("invalid");
    });
    $$("[data-seg]").forEach(function (seg) {
      var v = getPath(S.grid, seg.dataset.seg);
      $$("button", seg).forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.val === v)); });
    });
    $$("[data-show]").forEach(function (el) {
      var rule = el.dataset.show, ok;
      if (rule === "comp.spacing") ok = !!E.USES_SPACING[S.grid.comp.variant];
      else if (rule === "comp.logo") ok = !!E.USES_LOGO[S.grid.comp.variant];
      else if (rule === "comp.web") ok = !!E.USES_WEB[S.grid.comp.variant];
      else if (rule === "comp.items") ok = !!E.USES_ITEMS[S.grid.comp.variant];
      else if (rule === "comp.min") ok = !!E.USES_MIN[S.grid.comp.variant];
      else if (rule === "comp.count") ok = !!E.USES_COUNT[S.grid.comp.variant];
      else { var kv = rule.split("="); ok = String(getPath(S.grid, kv[0])) === kv[1]; }
      el.hidden = !ok;
    });
    $$("[data-toggle]").forEach(function (b) { b.setAttribute("aria-pressed", String(!!getPath(S.grid, b.dataset.toggle))); });
    $$("[data-unit]").forEach(function (s) { s.textContent = S.grid.unit; });
    var hasRatios = !!String(S.grid.columns.ratios || "").trim();
    $$("[data-bind='columns.count']").forEach(function (inp) { inp.closest(".field").classList.toggle("muted", hasRatios); });

    var link = $("#btnLink");
    link.setAttribute("aria-pressed", String(!!p.margins.linked));
    link.innerHTML = ico(p.margins.linked ? "link-simple" : "link-simple-break");

    if (type === "comp") {
      $$(".subtab").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.family === S.grid.comp.family)); });
      renderVariants();
    }

    $("#live").checked = !!S.set.live;
    $("#noDoc").hidden = !!S.doc;
    $("#btnGenerate").disabled = $("#btnClear").disabled = !S.doc;
    readout();
  }

  // ---------------------------------------------------------------- modifiche alla griglia

  function onGridChange(skipEl) {
    S.presetValue = "";
    $("#preset").value = "";
    renderMain(skipEl);
    persist();
    liveGenerate();
  }

  function parseNum(inp) {
    var v = parseFloat(String(inp.value).replace(",", "."));
    if (!isFinite(v)) return null;
    if (inp.hasAttribute("data-int")) v = Math.round(v);
    var min = inp.dataset.min !== undefined ? parseFloat(inp.dataset.min) : -Infinity;
    var max = inp.dataset.max !== undefined ? parseFloat(inp.dataset.max) : Infinity;
    return Math.min(max, Math.max(min, v));
  }

  function commitInput(inp, fromTyping) {
    if (inp.hasAttribute("data-text")) {
      setPath(S.grid, resolvePath(inp.dataset.bind), inp.value);
      onGridChange(fromTyping ? inp : null);
      return;
    }
    var v = parseNum(inp), box = inp.closest(".num");
    if (v === null) { box.classList.add("invalid"); return; }
    box.classList.remove("invalid");
    var path = resolvePath(inp.dataset.bind);
    if (inp.hasAttribute("data-margin") && currentParams().margins.linked) {
      var m = currentParams().margins;
      m.t = m.r = m.b = m.l = v;
    } else setPath(S.grid, path, v);
    onGridChange(fromTyping ? inp : null);
  }

  function stepInput(inp, dir, ev) {
    var cur = parseNum(inp) || 0;
    var inc = ev && ev.shiftKey ? 10 : ev && ev.altKey && !inp.hasAttribute("data-int") ? 0.1 : 1;
    inp.value = fmt(cur + dir * inc);
    commitInput(inp, false);
  }

  function applyGrid(grid) {
    S.grid = E.normalize(grid);
    renderMain();
    persist();
    liveGenerate();
  }

  // ---------------------------------------------------------------- viste

  function show(view) {
    S.view = view;
    $("#viewMain").hidden = view !== "main";
    $("#viewLibrary").hidden = view !== "library";
    $("#viewSettings").hidden = view !== "settings";
    $("#btnSettings").setAttribute("aria-pressed", String(view === "settings"));
    if (view === "library") renderLibrary();
    if (view === "settings") renderSettings();
    if (view === "main") renderMain();
  }

  // ---------------------------------------------------------------- libreria

  var CHIPS = [["all", "lib.all"], ["fav", "lib.fav"], ["columns", "tab.columns"], ["modular", "tab.modular"], ["baseline", "tab.baseline"], ["comp", "tab.comp"], ["builtin", "lib.builtin"]];

  function libEntries() {
    var f = S.libFilter, q = S.libQuery.trim().toLowerCase();
    var list = f === "builtin" ? P.list.map(function (p) { return { id: p.id, name: I.name(p.name), grid: p.grid, tags: [t("cat." + p.cat)], builtin: true }; }) : lib.grids;
    return list.filter(function (e) {
      if (f === "fav" && !e.fav) return false;
      if (["columns", "modular", "baseline", "comp"].indexOf(f) >= 0 && e.grid.type !== f) return false;
      if (!q) return true;
      return (e.name + " " + (e.tags || []).join(" ") + " " + describe(e.grid)).toLowerCase().indexOf(q) >= 0;
    });
  }

  function cardHTML(e, i) {
    var g = E.normalize(e.grid), ab = refArtboard(g), id = esc(e.id);
    var name = S.renaming === e.id
      ? '<input class="input rename-input" data-rename="' + id + '" value="' + esc(e.name) + '" maxlength="120" aria-label="' + esc(t("lib.rename")) + '">'
      : '<div class="name" title="' + esc(e.name) + '">' + esc(e.name) + "</div>";
    var ops;
    if (S.confirming === e.id) {
      ops = '<div class="confirm"><span>' + esc(t("lib.deleteConfirm", { name: e.name })) + "</span>" +
        '<button class="btn small" type="button" data-op="cancelDelete" data-id="' + id + '">' + esc(t("cancel")) + "</button>" +
        '<button class="btn small danger" type="button" data-op="doDelete" data-id="' + id + '">' + esc(t("lib.delete")) + "</button></div>";
    } else if (e.builtin) {
      ops = '<div class="ops"><button class="btn small primary" type="button" data-op="apply" data-id="' + id + '">' + esc(t("lib.apply")) + "</button>" +
        '<button class="icon-btn" type="button" data-op="duplicate" data-id="' + id + '" title="' + esc(t("save.current")) + '">' + ico("copy") + "</button></div>";
    } else {
      ops = '<div class="ops"><button class="btn small primary" type="button" data-op="apply" data-id="' + id + '">' + esc(t("lib.apply")) + "</button>" +
        '<button class="icon-btn fav" type="button" data-op="fav" data-id="' + id + '" aria-pressed="' + !!e.fav + '" title="' + esc(t("lib.favToggle")) + '">' + ico(e.fav ? "star-fill" : "star") + "</button>" +
        '<button class="icon-btn" type="button" data-op="rename" data-id="' + id + '" title="' + esc(t("lib.rename")) + '">' + ico("pencil-simple") + "</button>" +
        '<button class="icon-btn" type="button" data-op="duplicate" data-id="' + id + '" title="' + esc(t("lib.duplicate")) + '">' + ico("copy") + "</button>" +
        '<button class="icon-btn" type="button" data-op="export" data-id="' + id + '" title="' + esc(t("lib.export")) + '">' + ico("export") + "</button>" +
        '<button class="icon-btn" type="button" data-op="delete" data-id="' + id + '" title="' + esc(t("lib.delete")) + '">' + ico("trash") + "</button></div>";
    }
    var tags = (e.tags || []).length ? '<div class="tags">' + e.tags.map(function (x) { return '<span class="tag">' + esc(x) + "</span>"; }).join("") + "</div>" : "";
    return '<article class="card" style="--i:' + Math.min(i, 12) + '">' + thumbSVG(g, ab, "thumb") +
      '<div class="body">' + name + '<div class="meta">' + esc(describe(g)) + "</div>" + tags + ops + "</div></article>";
  }

  function renderLibrary() {
    $("#libChips").innerHTML = CHIPS.map(function (c) {
      return '<button class="chip" type="button" data-chip="' + c[0] + '" aria-pressed="' + (S.libFilter === c[0]) + '">' + esc(t(c[1])) + "</button>";
    }).join("");
    $("#libCount").textContent = String(lib.grids.length);
    var list = libEntries(), el = $("#libList");
    if (!list.length) {
      var empty = !S.libQuery && (S.libFilter === "all" || S.libFilter === "fav");
      el.innerHTML = '<div class="empty">' + ico(empty ? "books" : "magnifying-glass") +
        "<strong>" + esc(empty ? t("lib.empty.title") : t("lib.noResults")) + "</strong>" +
        (empty ? "<p>" + esc(t("lib.empty.body")) + '</p><button class="btn small" type="button" data-chip="builtin">' + esc(t("lib.builtin")) + "</button>" : "") + "</div>";
    } else {
      el.innerHTML = list.map(cardHTML).join("");
    }
    $("#libPath").textContent = H.isCEP ? LIBRARY_PATH : "localStorage (anteprima)";
    var r = $("[data-rename]");
    if (r) { r.focus(); r.select(); }
  }

  function findEntry(id) {
    if (id.indexOf("builtin:") === 0) {
      var p = P.list.filter(function (x) { return x.id === id; })[0];
      return p ? { id: p.id, name: I.name(p.name), grid: p.grid, tags: [p.cat], builtin: true } : null;
    }
    return lib.get(id);
  }

  function libOp(op, id) {
    var e = findEntry(id);
    if (!e) return;
    if (op === "apply") {
      applyGrid(e.grid);
      S.presetValue = (e.builtin ? "b:" : "u:") + e.id;
      show("main");
      renderPresets();
      toast(t("lib.applied", { name: e.name }));
      return;
    }
    if (op === "fav") lib.update(id, { fav: !e.fav });
    else if (op === "rename") S.renaming = id;
    else if (op === "duplicate") {
      if (e.builtin) { lib.add(e.name, E.normalize(e.grid), e.tags); toast(t("lib.saved")); }
      else lib.duplicate(id, t("lib.copy"));
    } else if (op === "export") exportGrids([id], e.name);
    else if (op === "delete") S.confirming = id;
    else if (op === "cancelDelete") S.confirming = null;
    else if (op === "doDelete") { lib.remove(id); S.confirming = null; }
    renderLibrary();
    renderPresets();
  }

  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "griglie"; }

  function exportGrids(ids, name) {
    var text = lib.exportText(ids), file = "reticolo-" + slug(name || "libreria") + ".json";
    if (!H.isCEP) { H.download(file, text); return; }
    var path = H.fs.saveDialog(t("lib.export"), file);
    if (!path) return;
    if (H.fs.write(path, text)) toast(t("lib.exported", { path: path }));
    else toast(t("hostError", { msg: path }), true);
  }

  function importTexts(texts) {
    var total = 0;
    texts.forEach(function (txt) { total += lib.importText(txt).count; });
    if (total) toast(t("lib.imported", { n: total }));
    else toast(t("lib.importNone"), true);
    S.libFilter = "all";
    renderLibrary();
    renderPresets();
  }

  function importFiles(files) {
    var list = Array.prototype.slice.call(files || []).filter(function (f) { return /\.json$/i.test(f.name) || f.type === "application/json"; });
    if (!list.length) { toast(t("lib.importNone"), true); return; }
    Promise.all(list.map(function (f) {
      return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(String(r.result)); }; r.onerror = function () { res(""); }; r.readAsText(f); });
    })).then(importTexts);
  }

  function openSaveForm(form, nameInput) {
    form.hidden = false;
    var preset = $("#preset");
    var label = preset.value ? preset.options[preset.selectedIndex].text : describe(S.grid);
    nameInput.value = label;
    nameInput.focus();
    nameInput.select();
  }

  function saveCurrent(nameInput, tagsInput, form) {
    var name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    var tags = tagsInput.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var e = lib.add(name, S.grid, tags);
    form.hidden = true;
    tagsInput.value = "";
    S.presetValue = "u:" + e.id;
    renderPresets();
    if (S.view === "library") { S.libFilter = "all"; renderLibrary(); }
    toast(t("lib.saved"));
  }

  // ---------------------------------------------------------------- impostazioni

  function renderSettings() {
    $("#mirrorPages").checked = !!S.set.mirrorPages;
    $$("[data-setting]").forEach(function (el) {
      var v = getPath(S.set, el.dataset.setting);
      if (el.type === "checkbox") el.checked = !!v;
      else el.value = el.type === "color" ? String(v).toLowerCase() : v;
    });
    $$("[data-setting-hex]").forEach(function (el) { el.value = getPath(S.set, el.dataset.settingHex); });
    $$("[data-setting-seg]").forEach(function (seg) {
      var v = getPath(S.set, seg.dataset.settingSeg);
      $$("button", seg).forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.val === v)); });
    });
    $("#guidesHelp").hidden = S.set.render !== "guides";
  }

  function settingChanged(redrawSettings) {
    persist();
    if (redrawSettings) renderSettings();
    liveGenerate();
  }

  function setLang(lang) {
    I.lang = lang;
    S.set.lang = lang;
    I.apply();
    renderTargets();
    renderPresets();
    renderMain();
    if (S.view === "library") renderLibrary();
    renderSettings();
    persist();
  }

  // ---------------------------------------------------------------- toast

  var toastTimer;
  function toast(msg, isErr) {
    var el = $("#toast");
    el.textContent = msg;
    el.classList.toggle("err", !!isErr);
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, isErr ? 4500 : 2200);
  }

  // ---------------------------------------------------------------- eventi

  function bind() {
    // barra
    $("#btnLibrary").addEventListener("click", function () { show(S.view === "library" ? "main" : "library"); });
    $("#btnSettings").addEventListener("click", function () { show(S.view === "settings" ? "main" : "settings"); });
    $$("[data-back]").forEach(function (b) { b.addEventListener("click", function () { show("main"); }); });
    $("#btnVisible").addEventListener("click", function () {
      H.call("setLayer", { layer: layerName(), visible: !S.layer.visible }).then(function (r) {
        if (r && !r.error) { S.layer.visible = r.visible; S.layer.locked = r.locked; renderLayerButtons(); }
      });
    });
    $("#btnLock").addEventListener("click", function () {
      H.call("setLayer", { layer: layerName(), locked: !S.layer.locked }).then(function (r) {
        if (r && !r.error) { S.layer.visible = r.visible; S.layer.locked = r.locked; renderLayerButtons(); }
      });
    });

    // tab e target
    $$(".tab").forEach(function (b) {
      b.addEventListener("click", function () { S.grid.type = b.dataset.tab; onGridChange(); });
    });
    $$(".subtab").forEach(function (b) {
      b.addEventListener("click", function () {
        var fam = b.dataset.family, c = S.grid.comp;
        if (c.family === fam) return;
        c.family = fam;
        c.variant = E.VARIANTS[fam][0];
        onGridChange();
      });
    });
    $("#variants").addEventListener("click", function (e) {
      var b = e.target.closest("[data-variant]");
      if (!b) return;
      S.grid.comp.variant = b.dataset.variant;
      onGridChange();
    });
    $("#target").addEventListener("change", function (e) { S.set.target = e.target.value; persist(); readout(); liveGenerate(); });
    $("#btnRefresh").addEventListener("click", function () { refreshDoc(); });

    // campi numerici
    var main = $("#viewMain");
    main.addEventListener("input", function (e) { if (e.target.dataset.bind) commitInput(e.target, true); });
    main.addEventListener("change", function (e) { if (e.target.dataset.bind) renderMain(); });
    main.addEventListener("keydown", function (e) {
      if (!e.target.dataset.bind) return;
      if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !e.target.hasAttribute("data-text")) { e.preventDefault(); stepInput(e.target, e.key === "ArrowUp" ? 1 : -1, e); }
      if (e.key === "Enter") { e.target.blur(); generateNow(); }
    });
    main.addEventListener("click", function (e) {
      var st = e.target.closest(".step");
      if (st) { e.preventDefault(); stepInput($("input", st.parentNode), parseInt(st.dataset.step, 10), e); return; }
      var sb = e.target.closest("[data-seg] button");
      if (sb) { setPath(S.grid, sb.parentNode.dataset.seg, sb.dataset.val); onGridChange(); return; }
      var tg = e.target.closest("[data-toggle]");
      if (tg) { var path = tg.dataset.toggle; setPath(S.grid, path, !getPath(S.grid, path)); onGridChange(); }
    });
    $("#btnLink").addEventListener("click", function (e) {
      e.preventDefault();
      var m = currentParams().margins;
      m.linked = !m.linked;
      if (m.linked) m.r = m.b = m.l = m.t;
      onGridChange();
    });

    // azioni
    $("#mirrorPages").addEventListener("change", function (e) { S.set.mirrorPages = e.target.checked; persist(); liveGenerate(); });
    $("#live").addEventListener("change", function (e) { S.set.live = e.target.checked; persist(); if (S.set.live) generate(true); });
    $("#btnGenerate").addEventListener("click", generateNow);
    $("#btnClear").addEventListener("click", clearGrid);
    $("#preset").addEventListener("change", function (e) {
      var v = e.target.value;
      if (!v) return;
      var entry = findEntry(v.slice(2));
      if (!entry) return;
      S.presetValue = v;
      applyGrid(entry.grid);
      e.target.value = v;
    });
    $("#btnSave").addEventListener("click", function () {
      var f = $("#saveForm");
      if (!f.hidden) { f.hidden = true; return; }
      openSaveForm(f, $("#saveName"));
    });
    $("#saveCancel").addEventListener("click", function () { $("#saveForm").hidden = true; });
    $("#saveForm").addEventListener("submit", function (e) { e.preventDefault(); saveCurrent($("#saveName"), $("#saveTags"), $("#saveForm")); });

    // libreria
    var lv = $("#viewLibrary");
    $("#libSearch").addEventListener("input", function (e) { S.libQuery = e.target.value; renderLibrary(); });
    lv.addEventListener("click", function (e) {
      var chip = e.target.closest("[data-chip]");
      if (chip) { S.libFilter = chip.dataset.chip; S.confirming = S.renaming = null; renderLibrary(); return; }
      var op = e.target.closest("[data-op]");
      if (op) libOp(op.dataset.op, op.dataset.id);
    });
    function commitRename(id, value) {
      if (S.renaming !== id) return;
      var v = String(value).trim();
      if (v) lib.update(id, { name: v });
      S.renaming = null;
      setTimeout(function () { renderLibrary(); renderPresets(); }, 0);
    }
    lv.addEventListener("keydown", function (e) {
      var r = e.target.dataset && e.target.dataset.rename;
      if (!r) return;
      if (e.key === "Enter") commitRename(r, e.target.value);
      if (e.key === "Escape") { S.renaming = null; renderLibrary(); }
    });
    lv.addEventListener("focusout", function (e) {
      var r = e.target.dataset && e.target.dataset.rename;
      if (r) commitRename(r, e.target.value);
    });
    $("#libSave").addEventListener("click", function () { openSaveForm($("#libSaveForm"), $("#libSaveName")); });
    $("#libSaveCancel").addEventListener("click", function () { $("#libSaveForm").hidden = true; });
    $("#libSaveForm").addEventListener("submit", function (e) { e.preventDefault(); saveCurrent($("#libSaveName"), $("#libSaveTags"), $("#libSaveForm")); });
    $("#libImport").addEventListener("click", function () {
      if (!H.isCEP) { $("#fileInput").click(); return; }
      var paths = H.fs.openDialog(t("lib.import"));
      if (paths && paths.length) importTexts(paths.map(function (p) { return H.fs.read(p) || ""; }));
    });
    $("#fileInput").addEventListener("change", function (e) { importFiles(e.target.files); e.target.value = ""; });
    $("#libExportAll").addEventListener("click", function () { exportGrids(null, "libreria"); });
    $("#libOpenFolder").addEventListener("click", function () { H.fs.openFolder(BASE); });
    var dragDepth = 0;
    lv.addEventListener("dragenter", function (e) { e.preventDefault(); dragDepth++; $("#dropzone").hidden = false; });
    lv.addEventListener("dragover", function (e) { e.preventDefault(); });
    lv.addEventListener("dragleave", function () { if (--dragDepth <= 0) { dragDepth = 0; $("#dropzone").hidden = true; } });
    lv.addEventListener("drop", function (e) { e.preventDefault(); dragDepth = 0; $("#dropzone").hidden = true; importFiles(e.dataTransfer.files); });

    // impostazioni
    var sv = $("#viewSettings");
    sv.addEventListener("input", function (e) {
      var el = e.target;
      if (el.dataset.setting) {
        var path = el.dataset.setting, v;
        if (el.type === "checkbox") v = el.checked;
        else if (el.hasAttribute("data-num")) { v = parseNum(el); if (v === null) return; }
        else v = el.value;
        if (el.type === "color") v = v.toUpperCase();
        setPath(S.set, path, v);
        if (el.type === "color") $('[data-setting-hex="' + path + '"]').value = v;
        if (path === "render") $("#guidesHelp").hidden = v !== "guides";
        if (path === "layer") return; // si applica alla conferma (change), non a ogni tasto
        settingChanged(false);
      } else if (el.dataset.settingHex) {
        var hex = el.value.trim();
        if (!/^#?[0-9a-f]{6}$/i.test(hex)) return;
        hex = ("#" + hex.replace("#", "")).toUpperCase();
        setPath(S.set, el.dataset.settingHex, hex);
        $('[data-setting="' + el.dataset.settingHex + '"]').value = hex.toLowerCase();
        settingChanged(false);
      }
    });
    sv.addEventListener("change", function (e) {
      if (e.target.dataset.setting === "layer") { renameLayer(e.target.value); return; }
      if (e.target.dataset.setting) renderSettings();
    });
    sv.addEventListener("click", function (e) {
      var b = e.target.closest("[data-setting-seg] button");
      if (b && b.parentNode.dataset.settingSeg === "lang") setLang(b.dataset.val);
    });
    var resetArmed = null;
    $("#btnReset").addEventListener("click", function (e) {
      var btn = e.currentTarget;
      if (!resetArmed) {
        btn.textContent = t("set.resetConfirm");
        resetArmed = setTimeout(function () { resetArmed = null; btn.textContent = t("set.reset"); }, 4000);
        return;
      }
      clearTimeout(resetArmed);
      resetArmed = null;
      var lang = S.set.lang;
      S.set = defaultSettings();
      S.set.lang = lang;
      S.grid = S.set.grid;
      btn.textContent = t("set.reset");
      persist();
      renderSettings();
      renderTargets();
      toast(t("set.reset"));
    });

    // host
    H.on("documentAfterActivate", function () { refreshDoc(); });
    H.on("documentAfterDeactivate", function () { setTimeout(refreshDoc, 150); });
    H.on("com.adobe.csxs.events.ThemeColorChanged", applyTheme);
    window.addEventListener("rtc-mock-change", function () { refreshDoc(); });
    window.addEventListener("focus", function () {
      if (!H.isCEP) return;
      refreshDoc();
      lib.sync();
      renderPresets();
      if (S.view === "library" && !S.renaming) renderLibrary();
    });
  }

  // ---------------------------------------------------------------- avvio

  function init() {
    applyTheme();
    $$("[data-icon]").forEach(function (el) {
      var html = ico(el.dataset.icon);
      if (el.children.length || el.textContent.trim()) el.insertAdjacentHTML("afterbegin", html);
      else el.innerHTML = html;
    });
    I.apply();
    bind();
    renderPresets();
    renderTargets();
    renderMain();
    renderLayerButtons();
    if (!H.isCEP) document.title = "Reticolo - " + t("demo");
    if (lib.recovered) toast(t("lib.recovered"), true);
    refreshDoc();
  }

  init();
})();
