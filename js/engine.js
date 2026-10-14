/*
 * Reticolo - motore geometrico.
 * Calcola le primitive di una griglia in coordinate locali dell'artboard
 * (origine in alto a sinistra, y verso il basso, unità native dell'host:
 * punti per Illustrator/InDesign, pixel per Photoshop).
 *
 * Primitive:
 *   { t: "L", a: [x1, y1, x2, y2], b: 0|1 }      linea (b = linea in grassetto)
 *   { t: "R", a: [x, y, w, h] }                    cella / modulo
 *   { t: "P", p: [[x, y], ...], c: true|false }    polilinea (c = chiusa)
 *   { t: "B", p: [[ax, ay, lx, ly, rx, ry], ...], c: true|false }
 *                                                  tracciato Bezier (ancora, maniglia in, maniglia out)
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RTC_ENGINE = factory();
})(this, function () {
  "use strict";

  var PHI = (1 + Math.sqrt(5)) / 2;
  var KAPPA = 0.5522847498;
  var EPS = 1e-6;

  // ---------------------------------------------------------------- modello

  function margins(t, r, b, l) {
    return { t: t, r: r, b: b, l: l, linked: t === r && r === b && b === l };
  }

  function defaults() {
    return {
      type: "columns",
      unit: "px",
      columns: { count: 12, gutter: 24, maxWidth: 0, ratios: "", lead: 0, margins: margins(0, 24, 0, 24) },
      modular: { cols: 4, rows: 4, gx: 16, gy: 16, sizing: "fit", mw: 120, mh: 120, lead: 0, margins: margins(24, 24, 24, 24) },
      baseline: { dir: "h", spacing: 8, boldEvery: 0, offset: 0, margins: margins(0, 0, 0, 0) },
      comp: { family: "classic", variant: "thirds", spacing: 40, count: 12, flipH: false, flipV: false, x: 0, clear: 1, sym: 4, ww: 10, wh: 2, gap: 1, items: "6x4 3x2 3x2 6x2 4x2/4/2 4x2/4/2 4x2/8/4 6x2/4/4 6x2/4/4", wgap: 16, wrow: 0, wmin: 240, wrows: 3, margins: margins(0, 0, 0, 0) }
    };
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function merge(base, over) {
    if (!over || typeof over !== "object") return base;
    Object.keys(over).forEach(function (k) {
      var v = over[k];
      if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object") merge(base[k], v);
      else if (v !== undefined) base[k] = v;
    });
    return base;
  }

  /** Completa un oggetto griglia (anche parziale) con i valori predefiniti. */
  function normalize(grid) {
    return merge(defaults(), clone(grid || {}));
  }

  /** Fattore di conversione da unità griglia a unità native dell'host. */
  function unitFactor(unit, ctx) {
    var app = (ctx && ctx.app) || "ILST";
    var res = (ctx && ctx.res) || 72;
    if (app === "PHXS") {
      if (unit === "mm") return res / 25.4;
      if (unit === "pt") return res / 72;
      return 1;
    }
    if (unit === "mm") return 72 / 25.4;
    return 1; // px e pt coincidono in Illustrator e InDesign
  }

  // ---------------------------------------------------------------- utilità

  function r3(n) { return Math.round(n * 1000) / 1000; }

  function L(x1, y1, x2, y2, bold) {
    var p = { t: "L", a: [r3(x1), r3(y1), r3(x2), r3(y2)] };
    if (bold) p.b = 1;
    return p;
  }

  function R(x, y, w, h) { return { t: "R", a: [r3(x), r3(y), r3(w), r3(h)] }; }

  /** Clipping Liang-Barsky di un segmento in un rettangolo. */
  function clipSeg(x1, y1, x2, y2, rc) {
    var dx = x2 - x1, dy = y2 - y1, t0 = 0, t1 = 1;
    var p = [-dx, dx, -dy, dy];
    var q = [x1 - rc.x, rc.x + rc.w - x1, y1 - rc.y, rc.y + rc.h - y1];
    for (var i = 0; i < 4; i++) {
      if (Math.abs(p[i]) < EPS) {
        if (q[i] < -EPS) return null;
      } else {
        var t = q[i] / p[i];
        if (p[i] < 0) { if (t > t1) return null; if (t > t0) t0 = t; }
        else { if (t < t0) return null; if (t < t1) t1 = t; }
      }
    }
    if (t1 - t0 < EPS) return null;
    return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
  }

  function inside(x, y, rc) {
    return x >= rc.x - EPS && x <= rc.x + rc.w + EPS && y >= rc.y - EPS && y <= rc.y + rc.h + EPS;
  }

  /** Clippa una polilinea: restituisce le parti visibili come nuove polilinee. */
  function clipPolyline(pts, closed, rc) {
    var src = pts.slice();
    if (closed) src.push(pts[0]);
    var allIn = src.every(function (p) { return inside(p[0], p[1], rc); });
    if (allIn) return [{ t: "P", p: pts.map(function (p) { return [r3(p[0]), r3(p[1])]; }), c: !!closed }];
    var runs = [], cur = null;
    for (var i = 0; i < src.length - 1; i++) {
      var s = clipSeg(src[i][0], src[i][1], src[i + 1][0], src[i + 1][1], rc);
      if (!s) { if (cur) { runs.push(cur); cur = null; } continue; }
      var a = [s[0], s[1]], b = [s[2], s[3]];
      if (cur) {
        var last = cur[cur.length - 1];
        if (Math.abs(last[0] - a[0]) < 1e-4 && Math.abs(last[1] - a[1]) < 1e-4) cur.push(b);
        else { runs.push(cur); cur = [a, b]; }
      } else cur = [a, b];
      if (!inside(src[i + 1][0], src[i + 1][1], rc)) { runs.push(cur); cur = null; }
    }
    if (cur) runs.push(cur);
    return runs.filter(function (r) { return r.length > 1; }).map(function (r) {
      return { t: "P", p: r.map(function (p) { return [r3(p[0]), r3(p[1])]; }), c: false };
    });
  }

  /** Converte un tracciato Bezier in punti (per host o clipping che non gestiscono curve). */
  function flattenBezier(prim, steps) {
    steps = steps || 16;
    var pts = prim.p, out = [[pts[0][0], pts[0][1]]];
    var n = prim.c ? pts.length : pts.length - 1;
    for (var i = 0; i < n; i++) {
      var A = pts[i], B = pts[(i + 1) % pts.length];
      var p0x = A[0], p0y = A[1], p1x = A[4], p1y = A[5], p2x = B[2], p2y = B[3], p3x = B[0], p3y = B[1];
      for (var s = 1; s <= steps; s++) {
        var t = s / steps, u = 1 - t;
        out.push([
          u * u * u * p0x + 3 * u * u * t * p1x + 3 * u * t * t * p2x + t * t * t * p3x,
          u * u * u * p0y + 3 * u * u * t * p1y + 3 * u * t * t * p2y + t * t * t * p3y
        ]);
      }
    }
    if (prim.c) out.pop();
    return out;
  }

  function circleBezier(cx, cy, r) {
    var k = r * KAPPA;
    return {
      t: "B", c: true, p: [
        [cx, cy - r, cx - k, cy - r, cx + k, cy - r],
        [cx + r, cy, cx + r, cy - k, cx + r, cy + k],
        [cx, cy + r, cx + k, cy + r, cx - k, cy + r],
        [cx - r, cy, cx - r, cy + k, cx - r, cy - k]
      ].map(function (q) { return q.map(r3); })
    };
  }

  /** Semiretta dal punto (px,py) in direzione (dx,dy) fino al bordo del rettangolo. */
  function ray(px, py, dx, dy, rc) {
    var len = (rc.w + rc.h) * 4;
    var n = Math.sqrt(dx * dx + dy * dy) || 1;
    return clipSeg(px, py, px + dx / n * len, py + dy / n * len, rc);
  }

  // ---------------------------------------------------------------- frame

  function frameOf(ab, m, f) {
    var x = m.l * f, y = m.t * f;
    var w = ab.w - (m.l + m.r) * f, h = ab.h - (m.t + m.b) * f;
    return { x: x, y: y, w: w, h: h };
  }

  function frameLines(rc) {
    return [
      L(rc.x, rc.y, rc.x + rc.w, rc.y), L(rc.x + rc.w, rc.y, rc.x + rc.w, rc.y + rc.h),
      L(rc.x, rc.y + rc.h, rc.x + rc.w, rc.y + rc.h), L(rc.x, rc.y, rc.x, rc.y + rc.h)
    ];
  }

  function hasMargins(m) { return (m.t || m.r || m.b || m.l) ? true : false; }

  // ---------------------------------------------------------------- tipi

  var MAX_CELLS = 5000;
  var MAX_DOTS = 10000;

  /** Interpreta "2 1 1" / "2:1:1" / "1,1,2,3,5" come rapporti positivi; [] se vuoto o non valido. */
  function parseRatios(str) {
    if (typeof str !== "string" || !str.trim()) return [];
    var out = str.trim().split(/[\s:;,\/]+/).map(function (x) { return parseFloat(x.replace(",", ".")); });
    return out.every(function (x) { return isFinite(x) && x > 0; }) && out.length <= 64 ? out : [];
  }

  /** Linee di baseline (interlinea lead) sovrapposte al frame: usate da colonne e modulare. */
  function leadLines(fr, lead) {
    var out = [];
    if (!(lead > 0.01)) return out;
    if (fr.h / lead > 3000) return null;
    for (var y = fr.y + lead; y < fr.y + fr.h - EPS; y += lead) out.push(L(fr.x, y, fr.x + fr.w, y));
    return out;
  }

  function buildColumns(p, ab, f) {
    var fr = frameOf(ab, p.margins, f);
    var g = p.gutter * f, ratios = parseRatios(p.ratios);
    var n = ratios.length || Math.max(1, Math.round(p.count));
    if (p.maxWidth > 0 && p.maxWidth * f < fr.w) {
      var mw = p.maxWidth * f;
      fr.x += (fr.w - mw) / 2;
      fr.w = mw;
    }
    var avail = fr.w - g * (n - 1);
    if (avail <= 0 || fr.h <= 0) return { error: "tooNarrow" };
    if (!ratios.length) for (var k = 0; k < n; k++) ratios.push(1);
    var sum = ratios.reduce(function (a, b) { return a + b; }, 0);
    var prims = [], x = fr.x, widths = [];
    for (var i = 0; i < n; i++) {
      var w = avail * ratios[i] / sum;
      prims.push(R(x, fr.y, w, fr.h));
      widths.push(w / f);
      x += w + g;
    }
    var bl = leadLines(fr, (p.lead || 0) * f);
    if (bl === null) return { error: "tooDense" };
    return { prims: prims.concat(bl), frame: fr, info: { colW: widths[0], widths: widths, uneven: !!parseRatios(p.ratios).length } };
  }

  function buildModular(p, ab, f) {
    var fr = frameOf(ab, p.margins, f);
    var gx = p.gx * f, gy = p.gy * f, cols, rows, cw, rh, ox = fr.x, oy = fr.y;
    var lead = (p.lead || 0) * f;
    if (p.sizing === "fixed") {
      cw = p.mw * f; rh = p.mh * f;
      if (cw <= 0 || rh <= 0) return { error: "tooNarrow" };
      cols = Math.floor((fr.w + gx) / (cw + gx));
      rows = Math.floor((fr.h + gy) / (rh + gy));
      if (cols * rows > MAX_CELLS) return { error: "tooDense" };
      ox += (fr.w - (cols * cw + (cols - 1) * gx)) / 2;
      oy += (fr.h - (rows * rh + (rows - 1) * gy)) / 2;
    } else {
      cols = Math.max(1, Math.round(p.cols));
      rows = Math.max(1, Math.round(p.rows));
      if (cols * rows > MAX_CELLS) return { error: "tooDense" };
      cw = (fr.w - gx * (cols - 1)) / cols;
      if (lead > 0.01) {
        // righe agganciate alla baseline: gutter verticale e altezza modulo multipli dell'interlinea
        gy = Math.max(lead, Math.round(gy / lead) * lead);
        rh = Math.floor((fr.h - gy * (rows - 1)) / rows / lead) * lead;
      } else rh = (fr.h - gy * (rows - 1)) / rows;
    }
    if (cols < 1 || rows < 1 || cw <= 0 || rh <= 0) return { error: "tooNarrow" };
    var prims = [];
    for (var r = 0; r < rows; r++)
      for (var c = 0; c < cols; c++) prims.push(R(ox + c * (cw + gx), oy + r * (rh + gy), cw, rh));
    var bl = leadLines(fr, lead);
    if (bl === null) return { error: "tooDense" };
    return { prims: prims.concat(bl), frame: fr, info: { colW: cw / f, rowH: rh / f, cols: cols, rows: rows } };
  }

  function buildBaseline(p, ab, f) {
    var fr = frameOf(ab, p.margins, f);
    var s = p.spacing * f, off = (p.offset || 0) * f, every = Math.max(0, Math.round(p.boldEvery || 0));
    if (s <= 0.01 || fr.w <= 0 || fr.h <= 0) return { error: "tooNarrow" };
    var prims = [], i, j, pos, count = 0;
    if (p.dir === "dots") {
      // griglia a punti (dot grid): piccoli cerchi agli incroci
      // ogni punto e' un piccolo quadrato (4 vertici): a queste dimensioni con il contorno appare come un punto
      var nx = Math.floor((fr.w - off) / s + EPS) + 1, ny = Math.floor((fr.h - off) / s + EPS) + 1;
      if (nx * ny > MAX_DOTS) return { error: "tooDense" };
      var rad = Math.max(0.25, s * 0.03);
      for (j = 0; j < ny; j++)
        for (i = 0; i < nx; i++) {
          var cx = fr.x + off + i * s, cy = fr.y + off + j * s;
          var d = every > 0 && i % every === 0 && j % every === 0 ? rad * 2 : rad;
          prims.push({ t: "P", c: true, p: [[r3(cx - d), r3(cy - d)], [r3(cx + d), r3(cy - d)], [r3(cx + d), r3(cy + d)], [r3(cx - d), r3(cy + d)]] });
        }
      return { prims: prims, frame: fr, info: { lines: nx * ny } };
    }
    if (p.dir === "h" || p.dir === "both") {
      for (i = 0, pos = fr.y + off; pos <= fr.y + fr.h + EPS; i++, pos = fr.y + off + i * s) {
        prims.push(L(fr.x, pos, fr.x + fr.w, pos, every > 0 && i % every === 0));
        if (++count > MAX_CELLS) return { error: "tooDense" };
      }
    }
    if (p.dir === "v" || p.dir === "both") {
      for (i = 0, pos = fr.x + off; pos <= fr.x + fr.w + EPS; i++, pos = fr.x + off + i * s) {
        prims.push(L(pos, fr.y, pos, fr.y + fr.h, every > 0 && i % every === 0));
        if (++count > MAX_CELLS) return { error: "tooDense" };
      }
    }
    return { prims: prims, frame: fr, info: { lines: count } };
  }

  // ---- composizione

  /** Mappa coordinate locali del frame applicando i flip. */
  function mapper(fr, flipH, flipV) {
    return function (x, y) {
      return [fr.x + (flipH ? fr.w - x : x), fr.y + (flipV ? fr.h - y : y)];
    };
  }

  function seg(mp, x1, y1, x2, y2, bold) {
    var a = mp(x1, y1), b = mp(x2, y2);
    return L(a[0], a[1], b[0], b[1], bold);
  }

  function raySeg(mp, local, px, py, dx, dy) {
    var s = ray(px, py, dx, dy, local);
    return s ? seg(mp, s[0], s[1], s[2], s[3]) : null;
  }

  /** Suddivisione aurea ricorsiva (quadrati + spirale) in un rettangolo locale W x H. */
  function goldenSubdivision(W, H, withSpiral, steps) {
    var land = W >= H;
    // si costruisce in un rettangolo aureo orizzontale PHI x 1 (spirale circolare), poi si adatta al frame:
    // il blocco aureo piu' grande che entra nel frame, con lo stesso orientamento, centrato
    var long = Math.min(land ? W : H, (land ? H : W) * PHI), sc = long / PHI;
    var ox = (W - (land ? long : sc)) / 2, oy = (H - (land ? sc : long)) / 2;
    function T(x, y) { var X = x * sc, Y = y * sc; return land ? [ox + X, oy + Y] : [ox + Y, oy + X]; }
    var lines = [], pts = [];
    var x = 0, y = 0, w = PHI, h = 1;
    for (var k = 0; k < steps; k++) {
      var side = k % 4, s, p0, p1, c;
      if (side === 0) { s = h; p0 = [x, y + s]; p1 = [x + s, y]; c = [x + s, y + s]; lines.push([x + s, y, x + s, y + h]); x += s; w -= s; }
      else if (side === 1) { s = w; p0 = [x, y]; p1 = [x + s, y + s]; c = [x, y + s]; lines.push([x, y + s, x + w, y + s]); y += s; h -= s; }
      else if (side === 2) { s = h; var qx = x + w - s; p0 = [x + w, y]; p1 = [qx, y + s]; c = [qx, y]; lines.push([qx, y, qx, y + h]); w -= s; }
      else { s = w; var qy = y + h - s; p0 = [x + s, y + h]; p1 = [x, qy]; c = [x + s, qy]; lines.push([x, qy, x + w, qy]); h -= s; }
      var c1 = [p0[0] + KAPPA * (p1[0] - c[0]), p0[1] + KAPPA * (p1[1] - c[1])];
      var c2 = [p1[0] + KAPPA * (p0[0] - c[0]), p1[1] + KAPPA * (p0[1] - c[1])];
      if (k === 0) pts.push({ a: p0, l: p0, r: c1 });
      else pts[pts.length - 1].r = c1;
      pts.push({ a: p1, l: c2, r: p1 });
    }
    var out = { lines: lines.map(function (l) { var a = T(l[0], l[1]), b = T(l[2], l[3]); return [a[0], a[1], b[0], b[1]]; }) };
    if (withSpiral) {
      out.spiral = pts.map(function (q) {
        var a = T(q.a[0], q.a[1]), l = T(q.l[0], q.l[1]), r = T(q.r[0], q.r[1]);
        return [a[0], a[1], l[0], l[1], r[0], r[1]];
      });
    }
    return out;
  }

  /** Famiglia di rette parallele con angolo deg e passo s, clippate al frame. */
  function family(fr, deg, s) {
    var th = deg * Math.PI / 180, dx = Math.cos(th), dy = Math.sin(th);
    var nx = -dy, ny = dx;
    var cx = fr.x + fr.w / 2, cy = fr.y + fr.h / 2;
    var half = Math.sqrt(fr.w * fr.w + fr.h * fr.h) / 2 + s;
    var out = [], n = Math.ceil(half / s);
    for (var i = -n; i <= n; i++) {
      var px = cx + nx * i * s, py = cy + ny * i * s;
      var c = clipSeg(px - dx * half, py - dy * half, px + dx * half, py + dy * half, fr);
      if (c) out.push(L(c[0], c[1], c[2], c[3]));
    }
    return out;
  }

  /**
   * Esagoni a punta in alto, s = distanza tra lati opposti.
   * Una polilinea per riga (zig-zag superiore + lati verticali ripercorsi), cosi' l'host
   * crea poche decine di tracciati invece di migliaia di segmenti. Il lato inferiore di una
   * riga coincide con il lato superiore della riga successiva.
   */
  function hexGrid(fr, s) {
    var r = s / Math.sqrt(3), vstep = 1.5 * r, out = [];
    var cx0 = fr.x + fr.w / 2, cy0 = fr.y + fr.h / 2;
    var cols = Math.ceil(fr.w / s / 2) + 2, rows = Math.ceil(fr.h / vstep / 2) + 2;
    for (var j = -rows; j <= rows; j++) {
      var cy = cy0 + j * vstep, shift = Math.abs(j) % 2 ? s / 2 : 0, pts = [];
      for (var i = -cols; i <= cols; i++) {
        var cx = cx0 + i * s + shift;
        if (i === -cols) pts.push([cx - s / 2, cy + r / 2]);
        pts.push([cx - s / 2, cy - r / 2], [cx, cy - r], [cx + s / 2, cy - r / 2], [cx + s / 2, cy + r / 2]);
      }
      if (cy - r > fr.y + fr.h || cy + r / 2 < fr.y) continue;
      out = out.concat(clipPolyline(pts, false, fr));
    }
    return out;
  }

  // ---- Logo: lockup costruiti in unita' X
  // X e' l'unita' di misura del logo (altezza di una lettera, larghezza di un elemento...): ogni distanza e'
  // un multiplo di X. Con x = 0 l'unita' si adatta al riquadro; con x > 0 e' esatta (in px, mm o pt).

  /** Quadrato di lato 1X piu' vicino al logo, al centro di ogni lato dello spazio libero. */
  function edgeSquares(c, iw, ih) {
    return [
      [c - 1, c + ih / 2 - 0.5], [c + iw, c + ih / 2 - 0.5],
      [c + iw / 2 - 0.5, c - 1], [c + iw / 2 - 0.5, c + ih]
    ];
  }

  function logoLayout(v, p) {
    var c = Math.max(1, +p.clear || 1), S = Math.max(0.5, +p.sym || 4), ww = Math.max(1, +p.ww || 10);
    var wh = Math.max(0.5, +p.wh || 2), gap = Math.max(0, p.gap === undefined ? 1 : +p.gap);
    var lay = { c: c, rects: [], lines: [], squares: [], bold: [] }, iw, ih, sym, word, k;
    var withX = v === "logoTopX" || v === "logoLeftX" || v === "typelogo";

    if (v === "logoTop" || v === "logoTopX") {
      iw = Math.max(S, ww); ih = S + gap + wh;
      sym = { x: c + (iw - S) / 2, y: c, w: S, h: S };
      word = { x: c + (iw - ww) / 2, y: c + S + gap, w: ww, h: wh };
      lay.rects.push(sym, word);
      lay.lines.push([c + iw / 2, c, c + iw / 2, c + ih]);
      if (withX && gap >= 1) lay.squares.push([c + iw / 2 - 0.5, c + S + (gap - 1) / 2]);
    } else if (v === "logoLeft" || v === "logoLeftX") {
      iw = S + gap + ww; ih = Math.max(S, wh);
      sym = { x: c, y: c + (ih - S) / 2, w: S, h: S };
      word = { x: c + S + gap, y: c + (ih - wh) / 2, w: ww, h: wh };
      lay.rects.push(sym, word);
      lay.lines.push([c, c + ih / 2, c + iw, c + ih / 2]);
      if (withX && gap >= 1) lay.squares.push([c + S + (gap - 1) / 2, c + ih / 2 - 0.5]);
    } else if (v === "logoTagline") {
      // tagline alta circa un terzo del logotipo (regola pratica, non uno standard)
      var th = wh / 3, tg = 0.5, group = wh + tg + th;
      iw = S + gap + ww; ih = Math.max(S, group);
      sym = { x: c, y: c + (ih - S) / 2, w: S, h: S };
      var wy = c + (ih - group) / 2;
      word = { x: c + S + gap, y: wy, w: ww, h: wh };
      lay.rects.push(sym, word, { x: word.x, y: wy + wh + tg, w: ww, h: th });
    } else {
      // typelogo: solo logotipo, con linea di base, altezza della x (circa 70% delle maiuscole) e maiuscole
      iw = ww; ih = wh;
      word = { x: c, y: c, w: ww, h: wh };
      lay.rects.push(word);
      lay.bold.push([c, c + wh, c + ww, c + wh]);
      lay.lines.push([c, c + wh * 0.3, c + ww, c + wh * 0.3]);
    }
    if (withX) edgeSquares(c, iw, ih).forEach(function (q) { lay.squares.push(q); });
    lay.iw = iw; lay.ih = ih; lay.tw = 2 * c + iw; lay.th = 2 * c + ih;
    return lay;
  }

  function buildLogo(v, fr, p, f, mp) {
    var lay = logoLayout(v, p), W = fr.w, H = fr.h, X = p.x > 0 ? p.x * f : Math.min(W / lay.tw, H / lay.th);
    if (X <= 0.01 || lay.tw * X > W + EPS || lay.th * X > H + EPS) return { error: "tooNarrow" };
    var ox = (W - lay.tw * X) / 2, oy = (H - lay.th * X) / 2, c = lay.c, out = [];
    function pt(x, y) { return mp(ox + x * X, oy + y * X); }
    function rect(x, y, w, h) {
      var a = pt(x, y), b = pt(x + w, y + h);
      return R(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    }
    function line(a, bold) { var m = pt(a[0], a[1]), n = pt(a[2], a[3]); return L2(m, n, bold); }
    function L2(m, n, bold) { return L(m[0], m[1], n[0], n[1], bold); }
    out.push(rect(0, 0, lay.tw, lay.th));                 // confine dello spazio libero
    out.push(rect(c, c, lay.iw, lay.ih));                 // area del logo
    lay.rects.forEach(function (r) { out.push(rect(r.x, r.y, r.w, r.h)); });
    lay.lines.forEach(function (a) { out.push(line(a, false)); });
    lay.bold.forEach(function (a) { out.push(line(a, true)); });
    lay.squares.forEach(function (q) { out.push(rect(q[0], q[1], 1, 1)); });
    return { prims: out, x: X / f };
  }

  /**
   * Reticolo di cerchi sovrapposti di raggio uguale al passo (centri su reticolo triangolare o quadrato).
   * I cerchi interi restano curve Bezier; quelli che escono dal riquadro vengono ritagliati.
   */
  function circleLattice(fr, s, tri) {
    var dy = tri ? s * Math.sqrt(3) / 2 : s, r = s, out = [], i, j;
    var nx = Math.ceil(fr.w / s / 2) + 2, ny = Math.ceil(fr.h / dy / 2) + 2;
    if ((2 * nx + 1) * (2 * ny + 1) > 20000) return null;
    var cx0 = fr.x + fr.w / 2, cy0 = fr.y + fr.h / 2;
    for (j = -ny; j <= ny; j++) {
      for (i = -nx; i <= nx; i++) {
        var cx = cx0 + i * s + (tri && Math.abs(j) % 2 ? s / 2 : 0), cy = cy0 + j * dy;
        if (cx + r < fr.x - EPS || cx - r > fr.x + fr.w + EPS || cy + r < fr.y - EPS || cy - r > fr.y + fr.h + EPS) continue;
        var circ = circleBezier(cx, cy, r);
        if (cx - r >= fr.x - EPS && cx + r <= fr.x + fr.w + EPS && cy - r >= fr.y - EPS && cy + r <= fr.y + fr.h + EPS) out.push(circ);
        else out = out.concat(clipPolyline(flattenBezier(circ, 12), true, fr));
        if (out.length > 6000) return null;
      }
    }
    return out;
  }

  /**
   * Linee tipografiche tipiche, in frazioni dell'altezza totale (ascendente in alto, discendente in basso):
   * ascendente, maiuscole, altezza della x, linea di base, discendente. Sono proporzioni medie dei caratteri
   * latini: vanno adattate al carattere reale.
   */
  var TYPE_LINES = [0, 0.06, 0.26, 0.78, 1];

  function buildTypeLines(fr, mp) {
    return TYPE_LINES.map(function (t, i) {
      var a = mp(0, t * fr.h), b = mp(fr.w, t * fr.h);
      return L(a[0], a[1], b[0], b[1], i === 3);
    });
  }


  // ---------------------------------------------------------------- layout web responsive

  // Classi di larghezza come le window size classes di Material 3: compact < 600, medium < 840, expanded.
  var BP_MEDIUM = 600, BP_EXPANDED = 840, BENTO_COLS = { expanded: 12, medium: 8, compact: 4 };
  var MAX_BENTO_ITEMS = 60, MAX_BENTO_SPAN = 12;

  function widthClass(w) { return w >= BP_EXPANDED ? "expanded" : w >= BP_MEDIUM ? "medium" : "compact"; }

  /**
   * Blocchi del bento: "6x4" = 6 colonne x 4 righe (su 12 colonne); "6x4/4/2" aggiunge le larghezze
   * esatte su tablet (8 colonne) e su mobile (4 colonne). Restituisce null se il testo non è valido.
   */
  function parseBento(str) {
    if (typeof str !== "string" || !str.trim()) return [];
    var toks = str.trim().split(/[\s,;]+/), out = [];
    if (toks.length > MAX_BENTO_ITEMS) return null;
    for (var i = 0; i < toks.length; i++) {
      var m = /^(\d+)[x×*](\d+)(?:\/(\d+))?(?:\/(\d+))?$/i.exec(toks[i]);
      if (!m) return null;
      var it = { w: parseInt(m[1], 10), h: parseInt(m[2], 10), t: m[3] ? parseInt(m[3], 10) : 0, m: m[4] ? parseInt(m[4], 10) : 0 };
      if (it.w < 1 || it.h < 1 || it.w > MAX_BENTO_SPAN || it.h > MAX_BENTO_SPAN) return null;
      out.push(it);
    }
    return out;
  }

  /** Larghezza in colonne di un blocco per la classe corrente: esatta se indicata, altrimenti in proporzione. */
  function bentoSpan(it, cls) {
    var cols = BENTO_COLS[cls], w;
    if (cls === "medium" && it.t) w = it.t;
    else if (cls === "compact" && it.m) w = it.m;
    else w = Math.round(it.w * cols / BENTO_COLS.expanded);
    return Math.max(1, Math.min(cols, w));
  }

  /** Impacchetta i blocchi nell'ordine, come grid-auto-flow: dense (ogni blocco nel primo posto libero). */
  function packBento(items, cls) {
    var cols = BENTO_COLS[cls], occ = [], rows = 0, placed = [];
    function free(r, c, w, h) {
      for (var y = r; y < r + h; y++) for (var x = c; x < c + w; x++) if (occ[y] && occ[y][x]) return false;
      return true;
    }
    items.forEach(function (it) {
      var w = bentoSpan(it, cls), h = it.h, r = 0, c, done = false;
      while (!done) {
        for (c = 0; c + w <= cols; c++) {
          if (free(r, c, w, h)) { done = true; break; }
        }
        if (!done) r++;
      }
      for (var y = r; y < r + h; y++) {
        occ[y] = occ[y] || [];
        for (var x = c; x < c + w; x++) occ[y][x] = 1;
      }
      rows = Math.max(rows, r + h);
      placed.push({ c: c, r: r, w: w, h: h });
    });
    return { cols: cols, rows: rows, items: placed };
  }

  /** Celle uguali in una griglia c x r dentro il riquadro dato. */
  function evenCells(x, y, w, h, c, r, g) {
    var cw = (w - (c - 1) * g) / c, rh = (h - (r - 1) * g) / r, out = [];
    for (var j = 0; j < r; j++) for (var i = 0; i < c; i++) out.push([x + i * (cw + g), y + j * (rh + g), cw, rh]);
    return out;
  }

  /** Layout web: restituisce rettangoli [x, y, w, h] nel riquadro locale W x H. */
  function webRects(v, p, abw, W, H, g) {
    var cls = widthClass(abw), out = [];
    if (v === "bento") {
      var items = parseBento(p.items);
      if (items === null) return { error: "badItems" };
      if (!items.length) return { error: "badItems" };
      var pk = packBento(items, cls);
      var cw = (W - (pk.cols - 1) * g) / pk.cols;
      if (cw <= 0) return { error: "tooNarrow" };
      var rh = p.wrow > 0 ? p.wrow : (H - (pk.rows - 1) * g) / pk.rows;
      if (rh <= 0) return { error: "tooNarrow" };
      pk.items.forEach(function (b) {
        var r = [b.c * (cw + g), b.r * (rh + g), b.w * cw + (b.w - 1) * g, b.h * rh + (b.h - 1) * g];
        if (r[1] + r[3] <= H + EPS) out.push(r); // con altezza fissa i blocchi che escono dal riquadro non si disegnano
      });
      return { rects: out };
    }
    if (v === "autoFit") {
      var minW = Math.max(1, p.wmin), c = Math.max(1, Math.min(24, Math.floor((W + g) / (minW + g)))), rows = Math.max(1, Math.round(p.wrows));
      if (c * rows > MAX_CELLS) return { error: "tooDense" };
      var rowH = p.wrow > 0 ? p.wrow : (H - (rows - 1) * g) / rows;
      if (rowH <= 0) return { error: "tooNarrow" };
      var all = evenCells(0, 0, W, rowH * rows + (rows - 1) * g, c, rows, g);
      return { rects: all.filter(function (r) { return r[1] + r[3] <= H + EPS; }) };
    }
    if (v === "holyGrail") {
      var hd = H / 10, ft = H / 12, sbw = W / 6, mid = H - hd - ft - 2 * g;
      if (cls === "expanded") out = [[0, 0, W, hd], [0, hd + g, sbw, mid], [sbw + g, hd + g, W - 2 * sbw - 2 * g, mid], [W - sbw, hd + g, sbw, mid], [0, H - ft, W, ft]];
      else if (cls === "medium") {
        var asd = H / 8, mm = mid - asd - g, nw = W / 4;
        out = [[0, 0, W, hd], [0, hd + g, nw, mm], [nw + g, hd + g, W - nw - g, mm], [0, hd + g + mm + g, W, asd], [0, H - ft, W, ft]];
      } else {
        var strip = H / 14, as2 = H / 9, mc = H - hd - ft - strip - as2 - 4 * g;
        out = [[0, 0, W, hd], [0, hd + g, W, strip], [0, hd + strip + 2 * g, W, mc], [0, hd + strip + mc + 3 * g, W, as2], [0, H - ft, W, ft]];
      }
      return { rects: out };
    }
    if (v === "heroCards") {
      var hero = H * 0.42, cc = cls === "expanded" ? 4 : cls === "medium" ? 2 : 1, cr = Math.ceil(4 / cc);
      out = [[0, 0, W, hero]];
      evenCells(0, hero + g, W, H - hero - g, cc, cr, g).slice(0, 4).forEach(function (r) { out.push(r); });
      return { rects: out };
    }
    if (v === "split") {
      if (cls === "compact") return { rects: [[0, 0, W, H * 0.6 - g / 2], [0, H * 0.6 + g / 2, W, H * 0.4 - g / 2]] };
      var lw = (W - g) * 7 / 12;
      return { rects: [[0, 0, lw, H], [lw + g, 0, W - lw - g, H]] };
    }
    if (v === "dashboard") {
      var sw = cls === "expanded" ? W / 7 : cls === "medium" ? W / 14 : 0, x0 = sw ? sw + g : 0, cwid = W - x0, top = H / 12;
      if (sw) out.push([0, 0, sw, H]);
      out.push([x0, 0, cwid, top]);
      var kc = cls === "compact" ? 2 : 4, kr = cls === "compact" ? 2 : 1, kh = cls === "compact" ? H / 5 : H / 7;
      evenCells(x0, top + g, cwid, kh, kc, kr, g).forEach(function (r) { out.push(r); });
      var y1 = top + g + kh + g, rest = H - y1;
      if (cls === "compact") out.push([x0, y1, cwid, rest * 0.5 - g / 2], [x0, y1 + rest * 0.5 + g / 2, cwid, rest * 0.5 - g / 2]);
      else {
        var cwl = (cwid - g) * 2 / 3;
        out.push([x0, y1, cwl, rest * 0.5 - g / 2], [x0 + cwl + g, y1, cwid - cwl - g, rest * 0.5 - g / 2], [x0, y1 + rest * 0.5 + g / 2, cwid, rest * 0.5 - g / 2]);
      }
      return { rects: out };
    }
    return { error: "unknownType" };
  }

  function buildComp(p, ab, f) {
    var fr = frameOf(ab, p.margins, f);
    if (fr.w <= 0 || fr.h <= 0) return { error: "tooNarrow" };
    var W = fr.w, H = fr.h, mp = mapper(fr, p.flipH, p.flipV);
    var local = { x: 0, y: 0, w: W, h: H };
    var prims = [], i, s, v = p.variant, logoX;
    function push(x) { if (x) prims.push(x); }
    function vline(u) { push(seg(mp, u * W, 0, u * W, H)); }
    function hline(u) { push(seg(mp, 0, u * H, W, u * H)); }
    function D1() { push(seg(mp, 0, 0, W, H)); }
    function D2() { push(seg(mp, W, 0, 0, H)); }
    function recip1() { push(raySeg(mp, local, W, 0, -H, W)); push(raySeg(mp, local, 0, H, H, -W)); }
    function recip2() { push(raySeg(mp, local, 0, 0, H, W)); push(raySeg(mp, local, W, H, -H, -W)); }

    switch (v) {
      // ---- Classic
      case "thirds": vline(1 / 3); vline(2 / 3); hline(1 / 3); hline(2 / 3); break;
      case "phi": vline(1 / (PHI + 1)); vline(PHI / (PHI + 1)); hline(1 / (PHI + 1)); hline(PHI / (PHI + 1)); break;
      case "spiral":
      case "goldenRects": {
        var gs = goldenSubdivision(W, H, v === "spiral", 10);
        gs.lines.forEach(function (l) { push(seg(mp, l[0], l[1], l[2], l[3])); });
        if (gs.spiral) {
          prims.push({
            t: "B", c: false, p: gs.spiral.map(function (q) {
              var a = mp(q[0], q[1]), l = mp(q[2], q[3]), r = mp(q[4], q[5]);
              return [a[0], a[1], l[0], l[1], r[0], r[1]].map(r3);
            })
          });
        }
        break;
      }
      case "diagonal":
        D1(); D2();
        push(raySeg(mp, local, 0, 0, 1, 1)); push(raySeg(mp, local, W, 0, -1, 1));
        push(raySeg(mp, local, 0, H, 1, -1)); push(raySeg(mp, local, W, H, -1, -1));
        break;
      case "cross": vline(0.5); hline(0.5); break;
      case "quadrants": vline(0.25); vline(0.5); vline(0.75); hline(0.25); hline(0.5); hline(0.75); break;
      case "canon": {
        // Canone di Van de Graaf: blocco di testo a 1/9 (margine interno 1/9, esterno 2/9, sopra 1/9, sotto 2/9)
        D1(); D2();
        var a = mp(W / 9, H / 9), b = mp(W * 7 / 9, H * 7 / 9);
        prims.push(R(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])));
        push(seg(mp, W / 9, H / 9, W * 7 / 9, H * 7 / 9));
        break;
      }
      // ---- Symmetry (simmetria dinamica)
      case "harmonic": D1(); D2(); recip1(); recip2(); break;
      case "baroque": D2(); recip2(); break;
      case "sinister": D1(); recip1(); break;
      case "armature":
        D1(); D2();
        push(seg(mp, W / 2, 0, W, H / 2)); push(seg(mp, W, H / 2, W / 2, H));
        push(seg(mp, W / 2, H, 0, H / 2)); push(seg(mp, 0, H / 2, W / 2, 0));
        push(seg(mp, 0, 0, W, H / 2)); push(seg(mp, 0, 0, W / 2, H));
        push(seg(mp, W, 0, 0, H / 2)); push(seg(mp, W, 0, W / 2, H));
        push(seg(mp, 0, H, W / 2, 0)); push(seg(mp, 0, H, W, H / 2));
        push(seg(mp, W, H, 0, H / 2)); push(seg(mp, W, H, W / 2, 0));
        break;
      case "root2": case "root3": case "root4": case "root5": {
        var n = parseInt(v.slice(4), 10);
        for (i = 1; i < n; i++) { if (W >= H) vline(i / n); else hline(i / n); }
        D1(); D2(); recip1(); recip2();
        break;
      }
      // ---- Rabatment
      case "rabatment":
      case "rabatDiag":
        if (W >= H) {
          push(seg(mp, H, 0, H, H)); push(seg(mp, W - H, 0, W - H, H));
          if (v === "rabatDiag") { push(seg(mp, 0, 0, H, H)); push(seg(mp, H, 0, 0, H)); push(seg(mp, W - H, 0, W, H)); push(seg(mp, W, 0, W - H, H)); }
        } else {
          push(seg(mp, 0, W, W, W)); push(seg(mp, 0, H - W, W, H - W));
          if (v === "rabatDiag") { push(seg(mp, 0, 0, W, W)); push(seg(mp, W, 0, 0, W)); push(seg(mp, 0, H - W, W, H)); push(seg(mp, W, H - W, 0, H)); }
        }
        break;
      // ---- Geometriche
      case "isometric":
        s = Math.max(1, p.spacing * f);
        prims = prims.concat(family(fr, 90, s), family(fr, 30, s), family(fr, 150, s));
        break;
      case "triangular":
        s = Math.max(1, p.spacing * f);
        prims = prims.concat(family(fr, 0, s), family(fr, 60, s), family(fr, 120, s));
        break;
      case "hexagonal":
        s = Math.max(2, p.spacing * f);
        prims = prims.concat(hexGrid(fr, s));
        break;
      case "pentagon": {
        var cx = fr.x + W / 2, cy = fr.y + H / 2, rad = Math.min(W, H) / 2;
        var pv = [];
        for (i = 0; i < 5; i++) {
          var ang = -Math.PI / 2 + i * 2 * Math.PI / 5;
          pv.push([r3(cx + rad * Math.cos(ang)), r3(cy + rad * Math.sin(ang) * (p.flipV ? -1 : 1))]);
        }
        prims.push({ t: "P", c: true, p: pv });
        prims.push({ t: "P", c: true, p: [pv[0], pv[2], pv[4], pv[1], pv[3]] });
        prims.push(circleBezier(cx, cy, rad));
        break;
      }
      case "radial": {
        var n2 = Math.max(2, Math.round(p.count));
        var rcx = fr.x + W / 2, rcy = fr.y + H / 2;
        for (i = 0; i < n2; i++) {
          var a2 = -Math.PI / 2 + i * 2 * Math.PI / n2;
          var rs = ray(rcx, rcy, Math.cos(a2), Math.sin(a2), fr);
          if (rs) prims.push(L(rs[0], rs[1], rs[2], rs[3]));
        }
        break;
      }
      case "concentric": {
        s = Math.max(2, p.spacing * f);
        var ccx = fr.x + W / 2, ccy = fr.y + H / 2, maxR = Math.sqrt(W * W + H * H) / 2;
        for (var rr = s; rr <= maxR + EPS; rr += s) {
          var circ = circleBezier(ccx, ccy, rr);
          if (rr <= Math.min(W, H) / 2 + EPS) prims.push(circ);
          else prims = prims.concat(clipPolyline(flattenBezier(circ, 24), true, fr));
          if (prims.length > 4000) return { error: "tooDense" };
        }
        break;
      }
      case "symmetry":
        vline(0.5); hline(0.5); D1(); D2();
        prims.push(circleBezier(fr.x + W / 2, fr.y + H / 2, Math.min(W, H) / 2));
        break;
      // ---- Studio: loghi, icone, prospettiva
      case "goldenCircles": {
        var gcx = fr.x + W / 2, gcy = fr.y + H / 2, R0 = Math.min(W, H) / 2;
        vline(0.5); hline(0.5);
        for (i = 0; i < 7; i++) prims.push(circleBezier(gcx, gcy, R0 / Math.pow(PHI, i)));
        // cerchi aurei tangenti in alto: la sequenza tipica per costruire curve di marchi
        var top = fr.y + (H - 2 * R0) / 2;
        for (i = 1; i < 5; i++) { var rr2 = R0 / Math.pow(PHI, i); prims.push(circleBezier(gcx, top + rr2, rr2)); }
        break;
      }
      case "keylines": {
        // keyline icone stile Material su 24 unita': area utile 20, cerchio 20, quadrato 18, rettangoli 16 x 20
        var S = Math.min(W, H), kx = fr.x + (W - S) / 2, ky = fr.y + (H - S) / 2, u = S / 24;
        for (i = 0; i <= 24; i++) {
          prims.push(L(kx + i * u, ky, kx + i * u, ky + S));
          prims.push(L(kx, ky + i * u, kx + S, ky + i * u));
        }
        var box = function (w, h) {
          var x0 = kx + (S - w * u) / 2, y0 = ky + (S - h * u) / 2;
          return { t: "P", c: true, p: [[x0, y0], [x0 + w * u, y0], [x0 + w * u, y0 + h * u], [x0, y0 + h * u]].map(function (q) { return [r3(q[0]), r3(q[1])]; }) };
        };
        prims.push(box(20, 20), box(18, 18), box(16, 20), box(20, 16));
        prims.push(circleBezier(kx + S / 2, ky + S / 2, 10 * u));
        prims.push(L(kx + 2 * u, ky + 2 * u, kx + 22 * u, ky + 22 * u, 1), L(kx + 22 * u, ky + 2 * u, kx + 2 * u, ky + 22 * u, 1));
        prims.push(L(kx + S / 2, ky, kx + S / 2, ky + S, 1), L(kx, ky + S / 2, kx + S, ky + S / 2, 1));
        break;
      }
      case "persp1": case "persp2": case "persp3": {
        var nr = Math.max(4, Math.round(p.count));
        var hz = p.flipV ? H * 0.65 : H * 0.35;
        var fan = function (vx, vy, a1, a2) {
          for (var q = 0; q <= nr; q++) {
            var a = a1 + (a2 - a1) * q / nr;
            var sg = clipSeg(fr.x + vx, fr.y + vy, fr.x + vx + Math.cos(a) * (W + H) * 6, fr.y + vy + Math.sin(a) * (W + H) * 6, fr);
            if (sg) prims.push(L(sg[0], sg[1], sg[2], sg[3]));
          }
        };
        var ang = function (vx, vy, x, y) { return Math.atan2(y - vy, x - vx); };
        push(seg(mp, 0, hz, W, hz, true));
        if (v === "persp1") {
          var vpx = p.flipH ? W * 0.35 : W / 2;
          for (var q1 = 0; q1 < nr; q1++) {
            var a0 = Math.PI * 2 * q1 / nr;
            var s1 = clipSeg(fr.x + vpx, fr.y + hz, fr.x + vpx + Math.cos(a0) * (W + H) * 6, fr.y + hz + Math.sin(a0) * (W + H) * 6, fr);
            if (s1) prims.push(L(s1[0], s1[1], s1[2], s1[3]));
          }
        } else {
          var vy2 = hz;
          fan(0, vy2, ang(0, vy2, W, 0), ang(0, vy2, W, H));
          fan(W, vy2, ang(W, vy2, 0, H), ang(W, vy2, 0, 0) + Math.PI * 2);
          if (v === "persp3") {
            var v3y = p.flipV ? -H * 1.6 : H * 2.6;
            fan(W / 2, v3y, ang(W / 2, v3y, 0, p.flipV ? H : 0), ang(W / 2, v3y, W, p.flipV ? H : 0));
          } else push(seg(mp, W / 2, 0, W / 2, H));
        }
        break;
      }
      // ---- Social: zone di sicurezza (valori indicativi, in proporzione al formato di riferimento)
      case "igStory": case "igReel": case "tiktok": case "ytThumb": case "igProfile": case "ytBanner": {
        var band = function (x, y, w, h) { if (w > 0.5 && h > 0.5) prims.push(R(fr.x + x, fr.y + y, w, h)); };
        if (v === "igStory") { band(0, 0, W, H * 250 / 1920); band(0, H - H * 250 / 1920, W, H * 250 / 1920); }
        else if (v === "igReel") {
          var rt = H * 220 / 1920, rb = H * 420 / 1920;
          band(0, 0, W, rt); band(0, H - rb, W, rb); band(W - W * 120 / 1080, rt, W * 120 / 1080, H - rt - rb);
        } else if (v === "tiktok") {
          var tt = H * 160 / 1920, tb = H * 480 / 1920;
          band(0, 0, W, tt); band(0, H - tb, W, tb);
          band(W - W * 140 / 1080, tt, W * 140 / 1080, H - tt - tb); band(0, tt, W * 60 / 1080, H - tt - tb);
        } else if (v === "ytThumb") {
          band(W - W * 216 / 1280, H - H * 80 / 720, W * 200 / 1280, H * 64 / 720);
        } else if (v === "igProfile") {
          if (W / H > 0.75) { var cw2 = H * 0.75; band(0, 0, (W - cw2) / 2, H); band(W - (W - cw2) / 2, 0, (W - cw2) / 2, H); }
          else { var ch2 = W * 4 / 3; band(0, 0, W, (H - ch2) / 2); band(0, H - (H - ch2) / 2, W, (H - ch2) / 2); }
        } else {
          // banner YouTube 2560 x 1440: fascia desktop 2560 x 423, area sicura 1546 x 423
          var dh = H * 423 / 1440, sw2 = W * 1546 / 2560;
          push(seg(mp, 0, (H - dh) / 2, W, (H - dh) / 2)); push(seg(mp, 0, (H + dh) / 2, W, (H + dh) / 2));
          prims.push(R(fr.x + (W - sw2) / 2, fr.y + (H - dh) / 2, sw2, dh));
        }
        break;
      }
      case "logoTop": case "logoTopX": case "logoLeft": case "logoLeftX": case "logoTagline": case "typelogo": {
        var lg = buildLogo(v, { x: 0, y: 0, w: W, h: H }, p, f, mp);
        if (lg.error) return lg;
        prims = lg.prims; logoX = lg.x;
        break;
      }
      case "spread": {
        // doppia pagina: due blocchi di testo speculari, margini a nonni (interno 1/9, esterno 2/9, sopra 1/9, sotto 2/9)
        var pw = W / 2, nw = pw / 9, nh = H / 9;
        var blockL = function (x, y, w, h) {
          var a = mp(x, y), b = mp(x + w, y + h);
          return R(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
        };
        push(seg(mp, pw, 0, pw, H, true));
        push(seg(mp, 0, 0, pw, H)); push(seg(mp, pw, 0, 0, H));
        push(seg(mp, pw, 0, W, H)); push(seg(mp, W, 0, pw, H));
        prims.push(blockL(2 * nw, nh, pw - 3 * nw, H - 3 * nh), blockL(pw + nw, nh, pw - 3 * nw, H - 3 * nh));
        break;
      }
      case "gutenberg":
        // quattro aree (primaria, forte, debole, terminale) e gravita' di lettura dall'alto a sinistra al basso a destra
        vline(0.5); hline(0.5); push(seg(mp, 0, 0, W, H, true));
        break;
      case "zPattern": {
        var zp = [[0.08, 0.1], [0.92, 0.1], [0.08, 0.9], [0.92, 0.9]].map(function (q) {
          var m = mp(q[0] * W, q[1] * H); return [r3(m[0]), r3(m[1])];
        });
        prims.push({ t: "P", c: false, p: zp });
        break;
      }
      case "fPattern":
        // due barre orizzontali (la seconda piu' corta) e la scansione verticale lungo il lato sinistro
        push(seg(mp, W * 0.08, H * 0.12, W * 0.92, H * 0.12));
        push(seg(mp, W * 0.08, H * 0.38, W * 0.62, H * 0.38));
        push(seg(mp, W * 0.08, H * 0.12, W * 0.08, H * 0.92, true));
        break;
      case "listDetail": case "supportingPane": case "appShell": {
        var g = W / 80, pr = function (x, y, w, h) {
          var a = mp(x, y), b = mp(x + w, y + h);
          return R(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
        };
        if (v === "listDetail") prims.push(pr(0, 0, W / 3 - g / 2, H), pr(W / 3 + g / 2, 0, 2 * W / 3 - g / 2, H));
        else if (v === "supportingPane") prims.push(pr(0, 0, 2 * W / 3 - g / 2, H), pr(2 * W / 3 + g / 2, 0, W / 3 - g / 2, H));
        else {
          // proporzioni di un'interfaccia a 1440 x 900: barra laterale 240 (1/6), barra superiore 64 (1/14)
          var sb = W / 6, tb = H / 14;
          prims.push(pr(0, 0, sb, H), pr(sb + g, 0, W - sb - g, tb), pr(sb + g, tb + g, W - sb - g, H - tb - g));
        }
        break;
      }
      case "bento": case "autoFit": case "holyGrail": case "heroCards": case "split": case "dashboard": {
        var wr = webRects(v, p, ab.w, W, H, Math.max(0, p.wgap) * f);
        if (wr.error) return { error: wr.error };
        wr.rects.forEach(function (q) {
          var a = mp(q[0], q[1]), b = mp(q[0] + q[2], q[1] + q[3]);
          prims.push(R(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])));
        });
        break;
      }
      case "vesica": {
        var vr = Math.min(W / 3, H / 2), vcx = fr.x + W / 2, vcy = fr.y + H / 2, hh = vr * Math.sqrt(3) / 2;
        prims.push(circleBezier(vcx - vr / 2, vcy, vr), circleBezier(vcx + vr / 2, vcy, vr));
        push(seg(mp, W / 2 - 1.5 * vr, H / 2, W / 2 + 1.5 * vr, H / 2));
        push(seg(mp, W / 2, H / 2 - vr, W / 2, H / 2 + vr));
        // i due triangoli equilateri dentro la vesica
        [-1, 1].forEach(function (sgn) {
          prims.push({ t: "P", c: true, p: [[vcx - vr / 2, vcy], [vcx + vr / 2, vcy], [vcx, vcy + sgn * hh]].map(function (q) { return [r3(q[0]), r3(q[1])]; }) });
        });
        break;
      }
      case "circlesTri": case "circlesSquare": {
        var lat = circleLattice(fr, Math.max(4, p.spacing * f), v === "circlesTri");
        if (!lat) return { error: "tooDense" };
        prims = lat;
        break;
      }
      case "androidIcon": {
        // tela 108, finestra visibile 72, zona sicura (cerchio) 66: valori da fonti non ufficiali, verificare
        var S = Math.min(W, H), au = S / 108, ax = (W - S) / 2, ay = (H - S) / 2;
        var sq = function (inset) {
          var a = mp(ax + inset * au, ay + inset * au), b = mp(ax + S - inset * au, ay + S - inset * au);
          return R(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
        };
        prims.push(sq(0), sq(18), circleBezier(fr.x + W / 2, fr.y + H / 2, 33 * au));
        push(seg(mp, ax + S / 2, ay, ax + S / 2, ay + S)); push(seg(mp, ax, ay + S / 2, ax + S, ay + S / 2));
        break;
      }
      case "typeLines":
        prims = buildTypeLines({ x: 0, y: 0, w: W, h: H }, mp);
        break;
      default:
        return { error: "unknownVariant" };
    }
    if (prims.length > 6000) return { error: "tooDense" };
    if (hasMargins(p.margins)) prims = frameLines(fr).concat(prims);
    return { prims: prims, frame: fr, info: { lines: prims.length, x: logoX } };
  }

  /**
   * Costruisce la griglia per un artboard.
   * @param grid  oggetto griglia (anche parziale)
   * @param ab    { w, h } dimensioni artboard in unità native
   * @param ctx   { app: "ILST"|"PHXS"|"IDSN", res: dpi (solo Photoshop) }
   */
  /** Specchia le primitive in orizzontale dentro un riquadro largo W (pagine sinistre di un libro). */
  function mirrorX(prims, W) {
    return prims.map(function (p) {
      var q = {}, k;
      for (k in p) q[k] = p[k];
      if (p.t === "L") q.a = [W - p.a[0], p.a[1], W - p.a[2], p.a[3]];
      else if (p.t === "R") q.a = [W - p.a[0] - p.a[2], p.a[1], p.a[2], p.a[3]];
      else q.p = p.p.map(function (pt) {
        // [x, y] per le polilinee; [x, y, xSin, ySin, xDes, yDes] per le Bezier (ancora e maniglie)
        var c = pt.slice();
        for (var i = 0; i < c.length; i += 2) c[i] = W - c[i];
        return c;
      });
      return q;
    });
  }

  function build(grid, ab, ctx) {
    var g = normalize(grid);
    var f = unitFactor(g.unit, ctx);
    var p = g[g.type];
    if (!p) return { error: "unknownType", prims: [] };
    var out;
    if (g.type === "columns") out = buildColumns(p, ab, f);
    else if (g.type === "modular") out = buildModular(p, ab, f);
    else if (g.type === "baseline") out = buildBaseline(p, ab, f);
    else out = buildComp(p, ab, f);
    if (!out.error && pointCount(out.prims) > MAX_POINTS) out = { error: "tooDense" };
    if (out.error) out.prims = [];
    return out;
  }

  var MAX_POINTS = 60000;

  /** Numero di vertici che l'host dovra' creare: protegge le app da griglie che le bloccherebbero. */
  function pointCount(prims) {
    var n = 0;
    for (var i = 0; i < prims.length; i++) {
      var p = prims[i];
      n += p.t === "L" ? 2 : p.t === "R" ? 4 : p.t === "B" ? p.p.length * 3 : p.p.length;
    }
    return n;
  }

  /** Separa le primitive ortogonali (diventano guide) da quelle oblique/curve. */
  function toGuides(prims) {
    var vx = {}, hy = {}, rest = [];
    prims.forEach(function (p) {
      if (p.t === "R") {
        vx[r3(p.a[0])] = 1; vx[r3(p.a[0] + p.a[2])] = 1;
        hy[r3(p.a[1])] = 1; hy[r3(p.a[1] + p.a[3])] = 1;
      } else if (p.t === "L" && Math.abs(p.a[0] - p.a[2]) < 1e-3) vx[r3(p.a[0])] = 1;
      else if (p.t === "L" && Math.abs(p.a[1] - p.a[3]) < 1e-3) hy[r3(p.a[1])] = 1;
      else rest.push(p);
    });
    function nums(o) { return Object.keys(o).map(Number).sort(function (a, b) { return a - b; }); }
    return { v: nums(vx), h: nums(hy), rest: rest };
  }

  /** Sostituisce i tracciati Bezier con polilinee (per Photoshop). */
  function flattenAll(prims, steps) {
    return prims.map(function (p) {
      return p.t === "B" ? { t: "P", c: p.c, p: flattenBezier(p, steps).map(function (q) { return [r3(q[0]), r3(q[1])]; }) } : p;
    });
  }

  var VARIANTS = {
    classic: ["thirds", "phi", "spiral", "diagonal", "cross", "quadrants", "canon", "spread"],
    symmetry: ["harmonic", "baroque", "sinister", "armature", "root2", "root3", "root4", "root5"],
    rabat: ["rabatment", "rabatDiag", "goldenRects"],
    geom: ["isometric", "triangular", "hexagonal", "pentagon", "radial", "concentric", "symmetry"],
    studio: ["goldenCircles", "keylines", "vesica", "circlesTri", "circlesSquare", "androidIcon", "persp1", "persp2", "persp3"],
    layout: ["gutenberg", "zPattern", "fPattern", "listDetail", "supportingPane", "appShell"],
    web: ["bento", "autoFit", "holyGrail", "heroCards", "split", "dashboard"],
    social: ["igStory", "igReel", "tiktok", "igProfile", "ytThumb", "ytBanner"],
    logo: ["logoTop", "logoTopX", "logoLeft", "logoLeftX", "typelogo", "logoTagline", "typeLines"]
  };
  var USES_SPACING = { isometric: 1, triangular: 1, hexagonal: 1, concentric: 1, circlesTri: 1, circlesSquare: 1 };
  var USES_WEB = { bento: 1, autoFit: 1, holyGrail: 1, heroCards: 1, split: 1, dashboard: 1 };
  var USES_ITEMS = { bento: 1 };
  var USES_MIN = { autoFit: 1 };
  var USES_COUNT = { radial: 1, persp1: 1, persp2: 1, persp3: 1 };
  var USES_LOGO = { logoTop: 1, logoTopX: 1, logoLeft: 1, logoLeftX: 1, typelogo: 1, logoTagline: 1 };

  return {
    PHI: PHI,
    VARIANTS: VARIANTS,
    USES_SPACING: USES_SPACING,
    USES_COUNT: USES_COUNT,
    USES_WEB: USES_WEB,
    USES_ITEMS: USES_ITEMS,
    USES_MIN: USES_MIN,
    widthClass: widthClass,
    parseBento: parseBento,
    packBento: packBento,
    USES_LOGO: USES_LOGO,
    defaults: defaults,
    normalize: normalize,
    unitFactor: unitFactor,
    build: build, mirrorX: mirrorX,
    toGuides: toGuides,
    flattenAll: flattenAll,
    flattenBezier: flattenBezier,
    clipSeg: clipSeg,
    clipPolyline: clipPolyline
  };
});
