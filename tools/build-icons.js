// Rigenera js/icons.js dalle SVG di @phosphor-icons/core.
// Uso: npm i @phosphor-icons/core@2 && node tools/build-icons.js node_modules/@phosphor-icons/core/assets
var fs = require("fs");
var path = require("path");

var assets = process.argv[2];
if (!assets) { console.error("Passa la cartella assets di @phosphor-icons/core"); process.exit(1); }

var REGULAR = ["eye", "eye-slash", "lock-simple", "lock-simple-open", "books", "gear-six",
  "arrows-clockwise", "minus", "plus", "link-simple", "link-simple-break", "floppy-disk", "star",
  "trash", "copy", "pencil-simple", "export", "download-simple", "magnifying-glass", "arrow-left",
  "x", "check", "flip-horizontal", "flip-vertical", "folder-open", "translate", "warning-circle",
  "grid-four"];
var FILL = ["star"];

function inner(file) {
  return fs.readFileSync(file, "utf8").replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
}

var out = {};
REGULAR.forEach(function (n) { out[n] = inner(path.join(assets, "regular", n + ".svg")); });
FILL.forEach(function (n) { out[n + "-fill"] = inner(path.join(assets, "fill", n + "-fill.svg")); });

var body = Object.keys(out).map(function (k) { return "    " + JSON.stringify(k) + ": " + JSON.stringify(out[k]); }).join(",\n");
var src = "/* Phosphor Icons (MIT) - https://phosphoricons.com - generato da tools/build-icons.js */\n" +
  "(function (root) {\n  var ICONS = {\n" + body + "\n  };\n" +
  "  root.RTC_ICONS = ICONS;\n" +
  "  root.rtcIcon = function (name, cls) {\n" +
  "    return '<svg class=\"ico ' + (cls || '') + '\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\">' + (ICONS[name] || '') + '</svg>';\n" +
  "  };\n})(this);\n";

fs.writeFileSync(path.join(__dirname, "..", "js", "icons.js"), src);
console.log("icons.js: " + Object.keys(out).length + " icone");
