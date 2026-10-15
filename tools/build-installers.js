#!/usr/bin/env node
/*
 * Prepara e costruisce gli installer di Reticolo (Adobe + Figma) in dist/:
 *   - Windows: Reticolo-Setup-<versione>.exe (NSIS, con scelta dei componenti), se makensis e' installato
 *   - macOS:   Reticolo-Mac-<versione>.zip (script .command con scelta multipla)
 * Uso: node tools/build-installers.js [--stage-only]
 */
var fs = require("fs");
var path = require("path");
var cp = require("child_process");

var ROOT = path.join(__dirname, "..");
var VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;
var STAGE = path.join(ROOT, "installer", "stage");
var DIST = path.join(ROOT, "dist");

function rm(p) { fs.rmSync(p, { recursive: true, force: true }); }
function mkdir(p) { fs.mkdirSync(p, { recursive: true }); }
function copyDir(src, dst) {
  mkdir(dst);
  fs.readdirSync(src, { withFileTypes: true }).forEach(function (e) {
    var s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  });
}

/** manifest.xml con i soli host scelti: ai = Illustrator, ps = Photoshop, id = InDesign. */
function manifestFor(ai, ps, id) {
  var xml = fs.readFileSync(path.join(ROOT, "CSXS", "manifest.xml"), "utf8");
  var hosts = [];
  if (ai) hosts.push('      <Host Name="ILST" Version="[22.0,99.9]"/>');
  if (ps) hosts.push('      <Host Name="PHXS" Version="[22.0,99.9]"/>', '      <Host Name="PHSP" Version="[22.0,99.9]"/>');
  if (id) hosts.push('      <Host Name="IDSN" Version="[16.0,99.9]"/>');
  return xml.replace(/(<HostList>)[\s\S]*?(<\/HostList>)/, "$1\n" + hosts.join("\n") + "\n    $2");
}

function stage() {
  rm(STAGE);
  var adobe = path.join(STAGE, "adobe");
  mkdir(adobe);
  ["index.html", "LICENSE"].forEach(function (f) { fs.copyFileSync(path.join(ROOT, f), path.join(adobe, f)); });
  ["css", "js", "host"].forEach(function (d) { copyDir(path.join(ROOT, d), path.join(adobe, d)); });
  // sette manifest, uno per ogni combinazione di app: m_<AI><PS><ID>.xml (1 = inclusa)
  var man = path.join(STAGE, "manifests");
  mkdir(man);
  for (var n = 1; n < 8; n++) {
    var ai = (n & 4) ? 1 : 0, ps = (n & 2) ? 1 : 0, id = (n & 1) ? 1 : 0;
    fs.writeFileSync(path.join(man, "m_" + ai + ps + id + ".xml"), manifestFor(ai, ps, id));
  }
  var fig = path.join(STAGE, "figma");
  mkdir(fig);
  ["manifest.json", "code.js", "ui.html"].forEach(function (f) { fs.copyFileSync(path.join(ROOT, "figma", f), path.join(fig, f)); });
  console.log("stage pronto: " + path.relative(ROOT, STAGE));
}

function winInstaller() {
  var r = cp.spawnSync("makensis", ["-V2", "-DVERSION=" + VERSION, path.join(ROOT, "installer", "windows", "Reticolo.nsi")], { encoding: "utf8" });
  if (r.error) { console.log("makensis non trovato: salto l'installer Windows (apt install nsis)"); return; }
  process.stdout.write(r.stdout || ""); process.stderr.write(r.stderr || "");
  if (r.status !== 0) process.exit(r.status);
  console.log("scritto dist/Reticolo-Setup-" + VERSION + ".exe");
}

function macZip() {
  mkdir(DIST);
  var dir = path.join(STAGE, "mac", "Reticolo-Mac");
  rm(path.join(STAGE, "mac"));
  mkdir(dir);
  copyDir(path.join(STAGE, "adobe"), path.join(dir, "payload", "adobe"));
  copyDir(path.join(STAGE, "manifests"), path.join(dir, "payload", "manifests"));
  copyDir(path.join(STAGE, "figma"), path.join(dir, "payload", "figma"));
  fs.copyFileSync(path.join(ROOT, "installer", "mac", "Installa-Reticolo.command"), path.join(dir, "Installa-Reticolo.command"));
  fs.copyFileSync(path.join(ROOT, "installer", "mac", "LEGGIMI.txt"), path.join(dir, "LEGGIMI.txt"));
  fs.chmodSync(path.join(dir, "Installa-Reticolo.command"), 493);
  var out = path.join(DIST, "Reticolo-Mac-" + VERSION + ".zip");
  rm(out);
  // zip -X conserva il bit di esecuzione dello script
  var z = cp.spawnSync("zip", ["-qrX", out, "Reticolo-Mac"], { cwd: path.join(STAGE, "mac"), encoding: "utf8" });
  if (z.error || z.status !== 0) { console.log("zip non disponibile: salto il pacchetto macOS"); return; }
  console.log("scritto dist/Reticolo-Mac-" + VERSION + ".zip");
}

stage();
if (process.argv.indexOf("--stage-only") < 0) { mkdir(DIST); winInstaller(); macZip(); }
