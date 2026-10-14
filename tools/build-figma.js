#!/usr/bin/env node
/*
 * Genera figma/ui.html: il pannello (index.html + css + js) in un solo file, come richiede Figma.
 * Uso: node tools/build-figma.js [--check]   (--check esce con errore se il file non è aggiornato)
 */
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var OUT = path.join(ROOT, "figma", "ui.html");
var SCRIPTS = ["icons", "i18n", "engine", "presets", "library", "host", "main"];

function read(p) { return fs.readFileSync(path.join(ROOT, p), "utf8"); }
function safe(js) { return js.replace(/<\/script/gi, "<\\/script"); }

function build() {
  var html = read("index.html");
  // anteprima da browser: gli artboard simulati non servono in Figma
  html = html.replace(/\s*<!-- Solo nell'anteprima[^>]*-->\s*<div class="stage"[^>]*><\/div>/, "");
  html = html.replace('<link rel="stylesheet" href="css/panel.css">', "<style>\n" + read("css/panel.css") + "\n</style>");
  var first = html.indexOf('<script src="js/icons.js"></script>');
  var last = html.lastIndexOf("</script>") + "</script>".length;
  if (first < 0) throw new Error("tag script non trovati in index.html");
  var code = SCRIPTS.map(function (n) { return "// ---- js/" + n + ".js\n" + safe(read("js/" + n + ".js")); }).join("\n");
  var boot =
    "<script>\n" +
    "// Figma: l'archivio sta in code.js. Il pannello parte quando arriva \"init\" con libreria e impostazioni.\n" +
    "window.RTC_FIGMA = { store: {} };\n" +
    "(function () {\n" +
    "  var booted = false;\n" +
    "  window.addEventListener(\"message\", function (e) {\n" +
    "    var m = e.data && e.data.pluginMessage;\n" +
    "    if (!m || m.type !== \"init\" || booted) return;\n" +
    "    booted = true;\n" +
    "    window.RTC_FIGMA.store = m.store || {};\n" +
    "    rtcBoot.call(window);\n" +
    "  });\n" +
    "})();\n" +
    "function rtcBoot() {\n" + code + "\n}\n" +
    "parent.postMessage({ pluginMessage: { type: \"ready\" } }, \"*\");\n" +
    "</script>";
  return html.slice(0, first) + boot + html.slice(last);
}

var out = build();
if (process.argv.indexOf("--check") >= 0) {
  var cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (cur !== out) { console.error("figma/ui.html non è aggiornato: esegui node tools/build-figma.js"); process.exit(1); }
  console.log("figma/ui.html aggiornato");
} else {
  fs.writeFileSync(OUT, out);
  console.log("scritto " + path.relative(ROOT, OUT) + " (" + Math.round(out.length / 1024) + " KB)");
}
module.exports = { build: build };
