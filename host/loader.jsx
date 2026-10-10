/* Reticolo - caricato dal manifest all'avvio: carica le utilita' comuni e lo script dell'app corrente. */
(function () {
  try {
    var dir = File($.fileName).parent;
    var name = BridgeTalk.appName;
    var file = name === "photoshop" ? "photoshop" : name === "indesign" ? "indesign" : "illustrator";
    $.evalFile(File(dir + "/common.jsx"));
    $.evalFile(File(dir + "/" + file + ".jsx"));
  } catch (e) {
    // il pannello ricarica gli script con il percorso dell'estensione se qui fallisce
  }
})();
