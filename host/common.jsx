/*
 * Reticolo - utilita' ExtendScript condivise da Illustrator, Photoshop e InDesign.
 * ExtendScript e' ES3: niente JSON nativo (in Illustrator), niente Array.forEach.
 */
var Reticolo = Reticolo || {};

Reticolo.parse = function (s) {
  // il testo arriva sempre dal pannello (JSON.stringify): eval e' sicuro qui
  return eval("(" + s + ")");
};

Reticolo.quote = function (s) {
  s = String(s);
  var out = '"';
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i), code = s.charCodeAt(i);
    if (c === '"' || c === "\\") out += "\\" + c;
    else if (c === "\n") out += "\\n";
    else if (c === "\r") out += "\\r";
    else if (c === "\t") out += "\\t";
    else if (code < 32) out += " ";
    else out += c;
  }
  return out + '"';
};

Reticolo.stringify = function (v) {
  var i, parts, k;
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return isFinite(v) ? String(v) : "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "string") return Reticolo.quote(v);
  if (v instanceof Array) {
    parts = [];
    for (i = 0; i < v.length; i++) parts.push(Reticolo.stringify(v[i]));
    return "[" + parts.join(",") + "]";
  }
  parts = [];
  for (k in v) if (v.hasOwnProperty(k)) parts.push(Reticolo.quote(k) + ":" + Reticolo.stringify(v[k]));
  return "{" + parts.join(",") + "}";
};

Reticolo.ok = function (o) { return Reticolo.stringify(o || { ok: true }); };
Reticolo.err = function (e) { return Reticolo.stringify({ error: String(e) + (e && e.line ? " (line " + e.line + ")" : "") }); };

Reticolo.hex = function (h) {
  h = String(h || "#00B8D9").replace("#", "");
  return { r: parseInt(h.substr(0, 2), 16) || 0, g: parseInt(h.substr(2, 2), 16) || 0, b: parseInt(h.substr(4, 2), 16) || 0 };
};

Reticolo.cmyk = function (rgb) {
  var r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  var k = 1 - Math.max(r, Math.max(g, b));
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  return { c: (1 - r - k) / (1 - k) * 100, m: (1 - g - k) / (1 - k) * 100, y: (1 - b - k) / (1 - k) * 100, k: k * 100 };
};

Reticolo.has = function (arr, v) {
  for (var i = 0; i < arr.length; i++) if (arr[i] === v) return true;
  return false;
};

/** Segmenti di una primitiva (per gli host che disegnano tutto come linee). */
Reticolo.segments = function (p) {
  var out = [], i, n;
  if (p.t === "L") out.push([p.a[0], p.a[1], p.a[2], p.a[3], p.b ? 1 : 0]);
  else if (p.t === "R") {
    var x = p.a[0], y = p.a[1], w = p.a[2], h = p.a[3];
    out.push([x, y, x + w, y, 0], [x + w, y, x + w, y + h, 0], [x + w, y + h, x, y + h, 0], [x, y + h, x, y, 0]);
  } else if (p.t === "P") {
    n = p.c ? p.p.length : p.p.length - 1;
    for (i = 0; i < n; i++) {
      var a = p.p[i], b = p.p[(i + 1) % p.p.length];
      out.push([a[0], a[1], b[0], b[1], 0]);
    }
  }
  return out;
};
