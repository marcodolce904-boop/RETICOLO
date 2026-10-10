var test = require("node:test");
var assert = require("node:assert/strict");
var L = require("../js/library.js");
var E = require("../js/engine.js");

function memStore() {
  var data = null;
  return { read: function () { return data; }, write: function (t) { data = t; return true; }, raw: function () { return data; } };
}

test("salva, ricarica e mantiene solo i parametri del tipo attivo", function () {
  var s = memStore();
  var lib = new L.Library(s).load();
  var g = E.normalize({ type: "modular", modular: { cols: 6 } });
  var e = lib.add("Bento 6", g, ["web"]);
  assert.deepEqual(Object.keys(e.grid).sort(), ["modular", "type", "unit"]);
  var lib2 = new L.Library(s).load();
  assert.equal(lib2.grids.length, 1);
  assert.equal(lib2.grids[0].grid.modular.cols, 6);
  assert.deepEqual(lib2.grids[0].tags, ["web"]);
});

test("import accetta file libreria, array e griglia singola", function () {
  var lib = new L.Library(memStore()).load();
  assert.equal(lib.importText(L.serialize([{ id: "a1", name: "A", grid: { type: "columns", unit: "px", columns: { count: 4 } } }])).count, 1);
  assert.equal(lib.importText(JSON.stringify([{ name: "B", grid: { type: "baseline", unit: "pt", baseline: { spacing: 12 } } }])).count, 1);
  assert.equal(lib.importText(JSON.stringify({ type: "comp", unit: "px", comp: { variant: "spiral" } })).count, 1);
  assert.equal(lib.grids.length, 3);
});

test("re-import dello stesso id aggiorna invece di duplicare", function () {
  var lib = new L.Library(memStore()).load();
  var file = L.serialize([{ id: "same", name: "Uno", grid: { type: "columns", unit: "px", columns: { count: 4 } } }]);
  lib.importText(file);
  lib.importText(file.replace("Uno", "Due"));
  assert.equal(lib.grids.length, 1);
  assert.equal(lib.grids[0].name, "Due");
});

test("import scarta dati non validi o pericolosi", function () {
  var lib = new L.Library(memStore()).load();
  var r = lib.importText(JSON.stringify([
    { name: "no type", grid: { unit: "px" } },
    { name: "bad type", grid: { type: "evil", evil: {} } },
    { id: "builtin:3", name: "<img onerror=x>", grid: { type: "columns", unit: "furlong", columns: { count: 3, hack: { deep: 1 }, label: "x".repeat(500) } } }
  ]));
  assert.equal(r.count, 1);
  var g = lib.grids[0];
  assert.notEqual(g.id, "builtin:3");
  assert.equal(g.grid.unit, "px");
  assert.equal(g.grid.columns.hack, undefined);
  assert.equal(g.grid.columns.label, undefined);
  assert.equal(lib.importText("{ non json").error, "json");
});

test("duplica, preferita, rinomina, elimina", function () {
  var lib = new L.Library(memStore()).load();
  var e = lib.add("X", E.normalize({}), []);
  var c = lib.duplicate(e.id, "copia");
  assert.equal(c.name, "X (copia)");
  lib.update(e.id, { fav: true, name: "Y" });
  assert.equal(lib.get(e.id).fav, true);
  assert.equal(lib.get(e.id).name, "Y");
  lib.remove(e.id);
  assert.equal(lib.grids.length, 1);
});

test("file libreria danneggiato: viene salvato un backup e non si perde nulla", function () {
  var backups = [];
  var s = memStore();
  s.write("{ \"grids\": [ rotto");
  s.backup = function (t) { backups.push(t); };
  var lib = new L.Library(s).load();
  assert.equal(lib.recovered, true);
  assert.equal(backups.length, 1);
  assert.ok(backups[0].indexOf("rotto") > 0);
});

test("due app aperte insieme: un salvataggio non cancella quello dell'altra", function () {
  var s = memStore();
  var illustrator = new L.Library(s).load();
  var photoshop = new L.Library(s).load();
  illustrator.add("Da Illustrator", E.normalize({}), []);
  photoshop.add("Da Photoshop", E.normalize({ type: "baseline" }), []);
  var names = new L.Library(s).load().grids.map(function (g) { return g.name; }).sort();
  assert.deepEqual(names, ["Da Illustrator", "Da Photoshop"]);
});
