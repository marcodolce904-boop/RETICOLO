/*
 * Reticolo - libreria di griglie salvate.
 * Un unico file JSON in %APPDATA%/Reticolo/library.json, condiviso da Illustrator, Photoshop e InDesign.
 *
 * Formato file (anche per import/export):
 * { "format": "reticolo-library", "version": 1, "grids": [ { id, name, grid, tags, fav, created, updated } ] }
 * L'import accetta anche una singola griglia o un array di griglie.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RTC_LIBRARY = factory();
})(this, function () {
  "use strict";

  var FORMAT = "reticolo-library";
  var TYPES = { columns: 1, modular: 1, baseline: 1, comp: 1 };
  var UNITS = { px: 1, mm: 1, pt: 1 };

  function uid() {
    return "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /** Tiene solo i parametri del tipo di griglia attivo (file piu' piccoli e leggibili). */
  function compact(grid) {
    var out = { type: grid.type, unit: grid.unit };
    out[grid.type] = JSON.parse(JSON.stringify(grid[grid.type] || {}));
    return out;
  }

  function isNum(n) { return typeof n === "number" && isFinite(n); }

  /** Valida e ripulisce una griglia proveniente da un file esterno. Restituisce null se non valida. */
  function sanitizeGrid(g) {
    if (!g || typeof g !== "object" || !TYPES[g.type]) return null;
    var p = g[g.type];
    if (!p || typeof p !== "object") return null;
    var clean = {};
    Object.keys(p).forEach(function (k) {
      var v = p[k];
      if (k === "margins" && v && typeof v === "object") {
        clean.margins = {
          t: isNum(v.t) ? v.t : 0, r: isNum(v.r) ? v.r : 0, b: isNum(v.b) ? v.b : 0, l: isNum(v.l) ? v.l : 0,
          linked: !!v.linked
        };
      } else if (isNum(v) || typeof v === "boolean" || (typeof v === "string" && v.length < 40)) clean[k] = v;
    });
    var out = { type: g.type, unit: UNITS[g.unit] ? g.unit : "px" };
    out[g.type] = clean;
    return out;
  }

  function sanitizeEntry(e) {
    if (!e || typeof e !== "object") return null;
    var grid = sanitizeGrid(e.grid || e);
    if (!grid) return null;
    var name = typeof e.name === "string" ? e.name.slice(0, 120).trim() : "";
    var now = Date.now();
    return {
      id: typeof e.id === "string" && /^[\w:-]{1,60}$/.test(e.id) && e.id.indexOf("builtin:") !== 0 ? e.id : uid(),
      name: name || "Griglia",
      grid: grid,
      tags: Array.isArray(e.tags) ? e.tags.filter(function (t) { return typeof t === "string"; }).map(function (t) { return t.slice(0, 30).trim(); }).filter(Boolean).slice(0, 12) : [],
      fav: !!e.fav,
      created: isNum(e.created) ? e.created : now,
      updated: isNum(e.updated) ? e.updated : now
    };
  }

  /** Estrae le griglie da un testo JSON (file libreria, array o griglia singola). */
  function parse(text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { return { error: "json", grids: [] }; }
    var raw = Array.isArray(data) ? data : data && Array.isArray(data.grids) ? data.grids : [data];
    var grids = raw.map(sanitizeEntry).filter(Boolean);
    return { grids: grids };
  }

  function serialize(grids) {
    return JSON.stringify({ format: FORMAT, version: 1, exported: new Date().toISOString(), grids: grids }, null, 2);
  }

  /**
   * store: { read(): string|null, write(text): bool, backup(text): void }
   * Il file e' condiviso da piu' app aperte insieme: ogni modifica rilegge il disco prima di scrivere,
   * cosi' una griglia salvata in Illustrator non viene cancellata da un salvataggio in Photoshop.
   */
  function Library(store) {
    this.store = store;
    this.grids = [];
    this.recovered = false;
  }

  Library.prototype.load = function () {
    var text = this.store.read();
    if (!text) { this.grids = []; return this; }
    var res = parse(text);
    if (res.error) {
      // file illeggibile: lo si mette da parte invece di sovrascriverlo al prossimo salvataggio
      if (this.store.backup) this.store.backup(text);
      this.recovered = true;
    }
    this.grids = res.grids;
    return this;
  };

  /** Rilegge il disco senza perdere le modifiche locali (usato prima di ogni scrittura). */
  Library.prototype.sync = function () {
    var text = this.store.read();
    if (!text) return this;
    var res = parse(text);
    if (!res.error) this.grids = res.grids;
    return this;
  };

  Library.prototype.persist = function () {
    return this.store.write(serialize(this.grids));
  };

  Library.prototype.add = function (name, grid, tags) {
    this.sync();
    var e = sanitizeEntry({ name: name, grid: compact(grid), tags: tags || [] });
    this.grids.unshift(e);
    this.persist();
    return e;
  };

  Library.prototype.get = function (id) {
    for (var i = 0; i < this.grids.length; i++) if (this.grids[i].id === id) return this.grids[i];
    return null;
  };

  Library.prototype.update = function (id, patch) {
    this.sync();
    var e = this.get(id);
    if (!e) return null;
    Object.keys(patch).forEach(function (k) { e[k] = patch[k]; });
    e.updated = Date.now();
    this.persist();
    return e;
  };

  Library.prototype.remove = function (id) {
    this.sync();
    this.grids = this.grids.filter(function (g) { return g.id !== id; });
    this.persist();
  };

  Library.prototype.duplicate = function (id, suffix) {
    this.sync();
    var e = this.get(id);
    if (!e) return null;
    var copy = sanitizeEntry({ name: e.name + " (" + suffix + ")", grid: e.grid, tags: e.tags, fav: false });
    this.grids.splice(this.grids.indexOf(e) + 1, 0, copy);
    this.persist();
    return copy;
  };

  /** Importa griglie: gli id gia' presenti vengono aggiornati, i nuovi aggiunti in testa. */
  Library.prototype.importText = function (text) {
    this.sync();
    var res = parse(text), self = this, added = 0;
    res.grids.forEach(function (g) {
      var existing = self.get(g.id);
      if (existing) { existing.name = g.name; existing.grid = g.grid; existing.tags = g.tags; existing.updated = Date.now(); }
      else self.grids.unshift(g);
      added++;
    });
    if (added) this.persist();
    return { count: added, error: res.error };
  };

  Library.prototype.exportText = function (ids) {
    var list = ids ? this.grids.filter(function (g) { return ids.indexOf(g.id) >= 0; }) : this.grids;
    return serialize(list);
  };

  return { Library: Library, parse: parse, serialize: serialize, compact: compact, sanitizeGrid: sanitizeGrid, FORMAT: FORMAT };
});
