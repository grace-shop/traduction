// Fonctions pures de l'application (sans accès au réseau ni au DOM) : testées dans tests/.
(function () {
  "use strict";

  const TAILLE_CACHE = 200;
  const cache = new Map();

  // Découpe un texte en morceaux de taille maximale, sans couper un mot si possible.
  function decouper(texte, taille) {
    const morceaux = [];
    let reste = String(texte || "").trim();
    while (reste.length > taille) {
      let coupe = reste.lastIndexOf(" ", taille);
      if (coupe <= 0) coupe = taille;
      morceaux.push(reste.slice(0, coupe));
      reste = reste.slice(coupe).trim();
    }
    if (reste) morceaux.push(reste);
    return morceaux;
  }

  // MyMemory attend le chinois sous la forme zh-CN.
  function codeMyMemory(code) {
    return code === "zh" ? "zh-CN" : code;
  }

  function paireMyMemory(de, vers) {
    return `${codeMyMemory(de)}|${codeMyMemory(vers)}`;
  }

  function cleCache(texte, de, vers) {
    return `${de}|${vers}|${texte}`;
  }

  // Cache borné : au-delà de la taille, on oublie la plus ancienne traduction.
  function memoriser(cle, valeur) {
    if (cache.size >= TAILLE_CACHE) cache.delete(cache.keys().next().value);
    cache.set(cle, valeur);
  }

  function lireCache(cle) {
    return cache.get(cle);
  }

  // Message de traduction : texte original et langue. Retourne null si le message est mal formé.
  function lireMessage(brut) {
    try {
      const m = JSON.parse(brut);
      if (!m || typeof m.texte !== "string" || typeof m.langue !== "string") return null;
      return m;
    } catch {
      return null;
    }
  }

  window.Outils = { decouper, codeMyMemory, paireMyMemory, cleCache, memoriser, lireCache, lireMessage, TAILLE_CACHE };
})();
