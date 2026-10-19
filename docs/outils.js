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

  // Mots d'hésitation : une phrase qui n'est que cela ne vaut pas d'être traduite.
  const HESITATIONS = new Set(["euh", "heu", "hum", "hmm", "mm", "mmm", "uh", "um", "ah", "oh", "eh"]);
  const DELAI_DOUBLON_MS = 4000;

  // Vrai si la phrase reconnue mérite d'être envoyée : assez longue, avec du contenu réel.
  function texteUtile(texte) {
    const propre = String(texte || "").trim();
    if (propre.length < 2) return false;
    if (!/[\p{L}\p{N}]/u.test(propre)) return false;
    const mots = propre.toLowerCase().split(/\s+/).map((m) => m.replace(/[^\p{L}\p{N}]/gu, ""));
    return mots.some((m) => m && !HESITATIONS.has(m));
  }

  // Un micro capte parfois la même phrase deux fois (écho des haut-parleurs, reprise).
  function estDoublon(texte, precedent, maintenant) {
    if (!precedent) return false;
    return precedent.texte === texte && maintenant - precedent.heure < DELAI_DOUBLON_MS;
  }

  // Requête vers un service de secours compatible LibreTranslate (adresse fournie dans config.js).
  function requeteSecours(adresse, texte, de, vers) {
    return {
      url: adresse,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: texte, source: de, target: vers, format: "text" }),
      },
    };
  }

  // Lien d'invitation : ouvre l'application avec le nom de la salle déjà renseigné.
  // Le mot de passe n'est jamais dans le lien.
  function lienInvitation(base, salle) {
    const sansParametres = String(base).split(/[?#]/)[0];
    const nom = encodeURIComponent(String(salle || "").trim()).replace(/%20/g, "+");
    return `${sansParametres}?salle=${nom}`;
  }

  // Historique exportable : une ligne par message, sans aucune donnée technique.
  function historiqueTexte(messages) {
    return messages
      .map((m) => `[${m.heure}] ${m.auteur} : ${m.texte}`)
      .join("\n");
  }

  // Réglages de lecture : valeurs ramenées dans des limites raisonnables, défauts si absentes.
  const DEFAUTS_REGLAGES = { vitesse: 1, volume: 1, taille: "normale", masquer: false, interface: "fr" };
  const TAILLES = ["petite", "normale", "grande"];

  function normaliserReglages(brut) {
    const r = brut && typeof brut === "object" ? brut : {};
    const nombre = (v, min, max, defaut) => {
      const x = Number(v);
      return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : defaut;
    };
    return {
      vitesse: nombre(r.vitesse, 0.6, 1.5, DEFAUTS_REGLAGES.vitesse),
      volume: nombre(r.volume, 0, 1, DEFAUTS_REGLAGES.volume),
      taille: TAILLES.includes(r.taille) ? r.taille : DEFAUTS_REGLAGES.taille,
      masquer: r.masquer === true,
      interface: typeof r.interface === "string" && /^[a-z]{2}$/.test(r.interface) ? r.interface : DEFAUTS_REGLAGES.interface,
    };
  }

  window.Outils = {
    decouper, codeMyMemory, paireMyMemory, cleCache, memoriser, lireCache, lireMessage,
    texteUtile, estDoublon, requeteSecours, lienInvitation, historiqueTexte, normaliserReglages,
    DEFAUTS_REGLAGES, TAILLE_CACHE,
  };
})();
