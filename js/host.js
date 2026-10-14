/*
 * Reticolo - ponte verso l'applicazione host (CEP) e archiviazione su disco.
 * Fuori da un'app Adobe (browser) usa un host simulato che disegna in un SVG,
 * cosi' il pannello si puo' sviluppare e provare senza Illustrator.
 */
(function (root) {
  "use strict";

  var cep = root.__adobe_cep__;
  var isCEP = !!cep;
  // Plugin Figma: l'HTML del pannello (figma/ui.html) definisce RTC_FIGMA prima di caricare gli script
  var figma = root.RTC_FIGMA || null;
  var isFigma = !!figma && !isCEP;

  function hostEnv() {
    if (isFigma) return { appName: "FIGMA", appSkinInfo: null };
    if (!isCEP) return { appName: "DEMO", appSkinInfo: null };
    try { return JSON.parse(cep.getHostEnvironment()); } catch (e) { return { appName: "ILST" }; }
  }

  function isWindows() {
    return root.navigator && /Win/i.test(root.navigator.platform || "");
  }

  /** Percorso di sistema CEP normalizzato ("userData", "extension"...). */
  function systemPath(kind) {
    if (!isCEP) return "";
    var p = cep.getSystemPath(kind) || "";
    p = p.replace(/^file:\/\//, "");
    if (/^\/[A-Za-z]:/.test(p)) p = p.slice(1);
    try { p = decodeURIComponent(p); } catch (e) { /* gia' decodificato */ }
    return p.replace(/\\/g, "/");
  }

  function jsxString(s) {
    return JSON.stringify(String(s)).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }

  function evalScript(code) {
    return new Promise(function (resolve) {
      cep.evalScript(code, function (res) { resolve(res); });
    });
  }

  /** Chiama Reticolo.<fn>(json) nell'ExtendScript dell'host e restituisce il JSON di ritorno. */
  function call(fn, payload) {
    if (isFigma) return figmaCall(fn, payload);
    if (!isCEP) return Promise.resolve(Mock[fn](payload));
    var code = "(function(){try{if(typeof Reticolo==='undefined'){" + loaderCode() + "}" +
      "return Reticolo." + fn + "(" + jsxString(JSON.stringify(payload || {})) + ");}" +
      "catch(e){return '{\"error\":\"' + (String(e) + (e.line ? ' (line ' + e.line + ')' : '')).replace(/[\"\\\\\\r\\n]/g, ' ') + '\"}';}})()";
    return evalScript(code).then(function (res) {
      if (res === "EvalScript error.") return { error: "EvalScript error" };
      try { return JSON.parse(res); } catch (e) { return { error: String(res) }; }
    });
  }

  function loaderCode() {
    var base = systemPath("extension") + "/host/";
    return "$.evalFile(new File(" + jsxString(base + "common.jsx") + "));" +
      "$.evalFile(new File(" + jsxString(base + hostFile() + ".jsx") + "));";
  }

  function hostFile() {
    var app = hostEnv().appName;
    return app === "PHXS" || app === "PHSP" ? "photoshop" : app === "IDSN" ? "indesign" : "illustrator";
  }

  function on(type, fn) {
    if (isCEP) cep.addEventListener(type, fn);
    else if (isFigma) (figmaListeners[type] = figmaListeners[type] || []).push(fn);
  }

  // ------------------------------------------------------------- Figma (messaggi verso code.js)

  var figmaPending = {}, figmaListeners = {}, figmaSeq = 0;

  function figmaPost(msg) { root.parent.postMessage({ pluginMessage: msg }, "*"); }

  function figmaCall(fn, payload) {
    return new Promise(function (resolve) {
      var id = ++figmaSeq;
      var timer = setTimeout(function () { delete figmaPending[id]; resolve({ error: "timeout" }); }, 60000);
      figmaPending[id] = function (value) { clearTimeout(timer); resolve(value); };
      figmaPost({ type: "call", id: id, fn: fn, payload: payload || {} });
    });
  }

  if (isFigma) {
    root.addEventListener("message", function (e) {
      var m = e.data && e.data.pluginMessage;
      if (!m) return;
      if (m.type === "result" && figmaPending[m.id]) {
        var done = figmaPending[m.id];
        delete figmaPending[m.id];
        done(m.value);
      } else if (m.type === "event") {
        (figmaListeners[m.name] || []).forEach(function (fn) { fn(); });
      }
    });
  }

  // ------------------------------------------------------------- file system

  var fs = {
    read: function (path) {
      if (isFigma) return Object.prototype.hasOwnProperty.call(figma.store, path) ? figma.store[path] : null;
      if (isCEP && root.cep && root.cep.fs) {
        var r = root.cep.fs.readFile(path, root.cep.encoding.UTF8);
        return r.err === 0 ? r.data : null;
      }
      try { return root.localStorage.getItem("rtc:" + path); } catch (e) { return null; }
    },
    write: function (path, data) {
      if (isFigma) {
        // niente localStorage nell'iframe di Figma: l'archivio sta in code.js (clientStorage)
        figma.store[path] = data;
        figmaPost({ type: "store", path: path, data: data });
        return true;
      }
      if (isCEP && root.cep && root.cep.fs) {
        var dir = path.replace(/\/[^/]*$/, "");
        root.cep.fs.makedir(dir);
        return root.cep.fs.writeFile(path, data, root.cep.encoding.UTF8).err === 0;
      }
      try { root.localStorage.setItem("rtc:" + path, data); return true; } catch (e) { return false; }
    },
    openDialog: function (title) {
      if (!(isCEP && root.cep && root.cep.fs)) return null;
      var r = root.cep.fs.showOpenDialogEx(true, false, title, "", ["json"]);
      return r.err === 0 ? r.data : null;
    },
    saveDialog: function (title, name) {
      if (!(isCEP && root.cep && root.cep.fs)) return null;
      var r = root.cep.fs.showSaveDialogEx(title, "", ["json"], name);
      return r.err === 0 && r.data ? (/\.json$/i.test(r.data) ? r.data : r.data + ".json") : null;
    },
    openFolder: function (path) {
      if (!(isCEP && root.cep && root.cep.process)) return;
      if (isWindows()) root.cep.process.createProcess("C:/Windows/explorer.exe", path.replace(/\//g, "\\"));
      else root.cep.process.createProcess("/usr/bin/open", path);
    }
  };

  /** Scarica un file nel browser (modalita' anteprima). */
  function download(name, text) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ------------------------------------------------------------- host simulato

  var Mock = (function () {
    var doc = {
      app: "ILST", name: "Demo.ai", res: 72, active: 0, layerName: "Livello 1",
      artboards: [{ i: 0, name: "Desktop 1440", w: 1440, h: 900 }, { i: 1, name: "Story 1080", w: 1080, h: 1920 }, { i: 2, name: "A4", w: 595.28, h: 841.89 }],
      // oggetti chiusi simulati sul primo artboard
      objects: [
        { id: "rect-hero", name: "Hero", kind: "path", ab: 0, x: 96, y: 120, w: 640, h: 420, shape: "rect" },
        { id: "circle-badge", name: "", kind: "path", ab: 0, x: 860, y: 150, w: 440, h: 440, shape: "ellipse" },
        { id: "card-1", name: "", kind: "compound", ab: 0, x: 96, y: 600, w: 1208, h: 200, shape: "rect" }
      ],
      selected: "rect-hero"
    };
    var drawn = {}, layer = { visible: true, locked: false };
    function stage() { return document.getElementById("stage"); }
    function r2(n) { return Math.round(n * 100) / 100; }
    function primsSVG(d, w, h) {
      var parts = [], st = d.style, sw = st.sw;
      d.prims.forEach(function (p) {
        var bold = p.b ? st.bold : 1;
        if (p.t === "R") {
          var fillCells = d.mode === "fill" || d.mode === "both";
          var strokeCells = d.mode === "stroke" || d.mode === "both";
          parts.push('<rect x="' + r2(p.a[0]) + '" y="' + r2(p.a[1]) + '" width="' + r2(p.a[2]) + '" height="' + r2(p.a[3]) + '" fill="' + (fillCells ? st.fill : "none") + '" fill-opacity="' + st.fa / 100 + '" stroke="' + (strokeCells ? st.stroke : "none") + '" stroke-width="' + sw + '"/>');
        } else if (p.t === "L") {
          parts.push('<line x1="' + r2(p.a[0]) + '" y1="' + r2(p.a[1]) + '" x2="' + r2(p.a[2]) + '" y2="' + r2(p.a[3]) + '" stroke="' + st.stroke + '" stroke-width="' + sw * bold + '"/>');
        } else if (p.t === "P") {
          parts.push('<' + (p.c ? "polygon" : "polyline") + ' points="' + p.p.map(function (q) { return r2(q[0]) + "," + r2(q[1]); }).join(" ") + '" fill="none" stroke="' + st.stroke + '" stroke-width="' + sw + '"/>');
        } else if (p.t === "B") {
          var s = "M" + p.p[0][0] + " " + p.p[0][1], n = p.c ? p.p.length : p.p.length - 1;
          for (var k = 0; k < n; k++) {
            var A = p.p[k], B = p.p[(k + 1) % p.p.length];
            s += " C" + A[4] + " " + A[5] + " " + B[2] + " " + B[3] + " " + B[0] + " " + B[1];
          }
          parts.push('<path d="' + s + (p.c ? "Z" : "") + '" fill="none" stroke="' + st.stroke + '" stroke-width="' + sw + '"/>');
        }
      });
      (d.guides ? d.guides.v : []).forEach(function (x) { parts.push('<line class="guide" x1="' + x + '" y1="0" x2="' + x + '" y2="' + h + '"/>'); });
      (d.guides ? d.guides.h : []).forEach(function (y) { parts.push('<line class="guide" x1="0" y1="' + y + '" x2="' + w + '" y2="' + y + '"/>'); });
      return parts.join("");
    }
    function shapeSVG(o, attrs) {
      return o.shape === "ellipse"
        ? '<ellipse cx="' + (o.x + o.w / 2) + '" cy="' + (o.y + o.h / 2) + '" rx="' + o.w / 2 + '" ry="' + o.h / 2 + '" ' + attrs + "/>"
        : '<rect x="' + o.x + '" y="' + o.y + '" width="' + o.w + '" height="' + o.h + '" rx="' + (o.kind === "compound" ? 24 : 0) + '" ' + attrs + "/>";
    }
    function svgFor(ab) {
      var body = "", defs = "";
      doc.objects.filter(function (o) { return o.ab === ab.i; }).forEach(function (o) {
        body += shapeSVG(o, 'data-obj="' + o.id + '" style="cursor:pointer" fill="#eef1f4" stroke="' + (o.id === doc.selected ? "#1b6ad6" : "#c5ccd3") + '" stroke-width="' + (o.id === doc.selected ? 2 : 1) + '"');
      });
      if (drawn["a:" + ab.i]) body += primsSVG(drawn["a:" + ab.i], ab.w, ab.h);
      doc.objects.filter(function (o) { return o.ab === ab.i && drawn["o:" + o.id]; }).forEach(function (o) {
        var d = drawn["o:" + o.id], clip = "clip-" + o.id;
        defs += '<clipPath id="' + clip + '">' + shapeSVG(o, "") + "</clipPath>";
        body += '<g clip-path="url(#' + clip + ')"><g transform="translate(' + o.x + " " + o.y + ')">' + primsSVG(d, o.w, o.h) + "</g></g>";
      });
      return '<figure class="ab" style="--ar:' + ab.w / ab.h + '"><figcaption>' + ab.name + '</figcaption>' +
        '<svg viewBox="0 0 ' + ab.w + " " + ab.h + '" preserveAspectRatio="xMidYMid meet" style="opacity:' + (layer.visible ? 1 : 0.15) + '">' +
        "<defs>" + defs + '</defs><rect width="' + ab.w + '" height="' + ab.h + '" fill="#fff"/><g vector-effect="non-scaling-stroke">' + body + "</g></svg></figure>";
    }
    function render() {
      var el = stage();
      if (el) el.innerHTML = doc.artboards.map(svgFor).join("");
    }
    function describe(o) { return { id: o.id, name: o.name, kind: o.kind, w: o.w, h: o.h }; }
    function key(t) { return t.obj ? "o:" + t.obj : "a:" + t.i; }
    setTimeout(function () {
      render();
      var el = stage();
      // clic su un oggetto = selezionarlo nell'app
      if (el) el.addEventListener("click", function (e) {
        var hit = e.target.closest ? e.target.closest("[data-obj]") : null;
        if (!hit) return;
        doc.selected = hit.getAttribute("data-obj");
        render();
        window.dispatchEvent(new Event("rtc-mock-change"));
      });
    }, 0);
    return {
      info: function () {
        var sel = doc.objects.filter(function (o) { return o.id === doc.selected; })[0];
        return JSON.parse(JSON.stringify({
          app: doc.app, doc: true, name: doc.name, res: doc.res, active: doc.active, artboards: doc.artboards,
          layerName: doc.layerName, objects: doc.objects.map(describe), selection: sel ? describe(sel) : null
        }));
      },
      // solo anteprima: simula il clic su un oggetto nell'app
      select: function (id) { doc.selected = id; render(); },
      draw: function (p) {
        p.targets.forEach(function (t) { drawn[key(t)] = { prims: t.prims, guides: t.guides, style: p.style, mode: p.mode }; });
        layer.locked = !!p.lock;
        render();
        return { ok: true, count: p.targets.length };
      },
      clear: function (p) { p.targets.forEach(function (t) { delete drawn[key(t)]; }); render(); return { ok: true }; },
      layerState: function () { return { exists: Object.keys(drawn).length > 0, visible: layer.visible, locked: layer.locked }; },
      setLayer: function (p) {
        if (p.visible !== undefined) layer.visible = p.visible;
        if (p.locked !== undefined) layer.locked = p.locked;
        render();
        return { ok: true, visible: layer.visible, locked: layer.locked };
      }
    };
  })();

  root.RTC_MOCK = isCEP || isFigma ? null : Mock;

  root.RTC_HOST = {
    isCEP: isCEP,
    isFigma: isFigma,
    hosted: isCEP || isFigma,
    env: hostEnv,
    systemPath: systemPath,
    call: call,
    on: on,
    fs: fs,
    download: download
  };
})(this);
