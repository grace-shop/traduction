// Mises à jour : à l'ouverture (et au retour dans l'application), on compare l'identifiant
// de cette version à celui de la dernière version publiée. Si elles diffèrent, un bandeau
// propose de mettre à jour. Sur téléphone, le bouton ouvre la nouvelle APK ; sur le web,
// la page se recharge avec la nouvelle version.
(function () {
  "use strict";

  const API = "https://api.github.com/repos/grace-shop/traduction/releases/tags/apk-latest";
  const local = (window.BUILD_ID || "dev");
  const t = (cle) => (window.I18N ? window.I18N.t(cle) : cle);
  const natif = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  const $ = (id) => document.getElementById(id);
  let distant = null;

  // Renvoie l'identifiant de la dernière version publiée, ou null.
  async function versionDistante() {
    const reponse = await fetch(API, { cache: "no-store", headers: { Accept: "application/vnd.github+json" } });
    if (!reponse.ok) throw new Error("api");
    const donnees = await reponse.json();
    const trouve = /Build:\s*([0-9a-f]{40})/i.exec(donnees.body || "");
    return trouve ? trouve[1] : null;
  }

  function afficherBandeau(identifiant) {
    // Une même version n'est proposée qu'une fois par session, pour ne pas harceler.
    try { if (sessionStorage.getItem("maj-vue") === identifiant) return; } catch { /* */ }
    $("maj-texte").textContent = t("maj_dispo");
    $("maj").hidden = false;
    try { sessionStorage.setItem("maj-vue", identifiant); } catch { /* */ }
  }

  // Vérifie en silence (au démarrage). Avec manuel = true, dit aussi le résultat.
  async function verifier(manuel) {
    if (local === "dev" && !manuel) return; // version de développement : pas de comparaison
    try {
      const identifiant = await versionDistante();
      distant = identifiant;
      if (!identifiant) {
        if (manuel) $("maj-statut").textContent = t("maj_aucune");
        return;
      }
      if (identifiant === local) {
        if (manuel) $("maj-statut").textContent = t("maj_a_jour");
        return;
      }
      if (manuel) $("maj-statut").textContent = "";
      afficherBandeau(identifiant);
    } catch {
      if (manuel) $("maj-statut").textContent = t("maj_erreur");
    }
  }

  function mettreAJour() {
    if (natif()) {
      // Ouvre le téléchargement de la dernière APK ; Android demande ensuite la confirmation d'installation.
      window.open(window.CONFIG.APK_URL, "_blank");
    } else {
      // Le web : on recharge avec un paramètre nouveau pour éviter l'ancienne copie en cache.
      const url = new URL(location.href);
      url.searchParams.set("maj", String(Date.now()));
      location.replace(url.toString());
    }
  }

  $("maj-maintenant").addEventListener("click", mettreAJour);
  $("maj-plus-tard").addEventListener("click", () => { $("maj").hidden = true; });
  $("verifier-maj").addEventListener("click", () => {
    $("maj-statut").textContent = "…";
    verifier(true);
  });

  // Au démarrage, puis à chaque retour dans l'application ou sur l'onglet.
  setTimeout(() => verifier(false), 2500);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") verifier(false);
  });
  window.Miseajour = { verifier, distant: () => distant };
})();
