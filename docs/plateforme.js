// Couche d'accès aux fonctions du téléphone ou du navigateur.
// Dans l'application installée (Android/iOS), la reconnaissance et la lecture passent
// par les modules natifs de Capacitor. Dans le navigateur, par les API web.
(function () {
  "use strict";

  const natif = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const module = (nom) => (window.Capacitor && window.Capacitor.Plugins ? window.Capacitor.Plugins[nom] : undefined);
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

  let ecoute = false;     // la reconnaissance doit tourner
  let suspendue = false;  // mise en pause pendant que je lis une traduction
  let reconnaissanceWeb = null;

  // ----- Reconnaissance vocale : ce que dit la personne -----

  async function demanderPermissions() {
    if (natif()) {
      const sr = module("SpeechRecognition");
      if (!sr) return false;
      const p = await sr.requestPermissions();
      return Object.values(p || {}).includes("granted");
    }
    return true; // le navigateur demande l'accès au micro lui-même
  }

  function disponible() {
    if (natif()) return !!module("SpeechRecognition");
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  // Démarre l'écoute. onTexte reçoit chaque phrase terminée.
  function demarrerEcoute(bcp47, onTexte) {
    ecoute = true;
    suspendue = false;
    if (natif()) return boucleNative(bcp47, onTexte);
    const RV = window.SpeechRecognition || window.webkitSpeechRecognition;
    reconnaissanceWeb = new RV();
    reconnaissanceWeb.lang = bcp47;
    reconnaissanceWeb.continuous = true;
    reconnaissanceWeb.interimResults = false;
    reconnaissanceWeb.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (!e.results[i].isFinal) continue;
        const texte = e.results[i][0].transcript.trim();
        if (texte) onTexte(texte);
      }
    };
    reconnaissanceWeb.onend = () => { setTimeout(relancerWeb, 300); };
    reconnaissanceWeb.onerror = () => {};
    relancerWeb();
    return Promise.resolve();
  }

  function relancerWeb() {
    if (!ecoute || suspendue || !reconnaissanceWeb) return;
    try { reconnaissanceWeb.start(); } catch { /* déjà en cours */ }
  }

  // Sur mobile natif, chaque appel à start() écoute une phrase, puis rend le résultat.
  async function boucleNative(bcp47, onTexte) {
    const sr = module("SpeechRecognition");
    while (ecoute) {
      if (suspendue) { await attendre(200); continue; }
      try {
        const r = await sr.start({ language: bcp47, maxResults: 1, partialResults: false, popup: false });
        const texte = ((r && r.matches) || [])[0];
        if (texte && texte.trim() && !suspendue) onTexte(texte.trim());
      } catch {
        await attendre(500);
      }
    }
  }

  function arreterEcoute() {
    ecoute = false;
    if (reconnaissanceWeb) { try { reconnaissanceWeb.stop(); } catch { /* déjà arrêtée */ } }
    if (natif() && module("SpeechRecognition")) module("SpeechRecognition").stop().catch(() => {});
  }

  // Pendant qu'une traduction est lue, on n'écoute pas, pour ne pas réentendre la lecture.
  function suspendreEcoute() {
    suspendue = true;
    if (reconnaissanceWeb) { try { reconnaissanceWeb.stop(); } catch { /* */ } }
    if (natif() && module("SpeechRecognition")) module("SpeechRecognition").stop().catch(() => {});
  }

  function reprendreEcoute() {
    suspendue = false;
    relancerWeb();
  }

  // ----- Lecture à voix haute : la traduction -----

  function voixes(bcp47) {
    if (natif() || !("speechSynthesis" in window)) return [];
    const prefixe = bcp47.slice(0, 2).toLowerCase();
    return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(prefixe));
  }

  // Lit un texte. onFin est appelé quand la lecture est terminée.
  // reglages : { vitesse, volume } choisis par l'auditeur.
  function parler(texte, bcp47, nomVoix, onFin, reglages) {
    const vitesse = (reglages && reglages.vitesse) || 1;
    const volume = reglages && Number.isFinite(reglages.volume) ? reglages.volume : 1;
    if (natif()) {
      const tts = module("TextToSpeech");
      if (!tts) { onFin(); return; }
      const debut = Date.now();
      const duree = Math.max(1500, (texte.length * 80) / vitesse); // filet de sécurité si la lecture rend la main trop tôt
      tts.speak({ text: texte, lang: bcp47, rate: vitesse, pitch: 1.0, volume, category: "playback" })
        .catch(() => {})
        .finally(() => setTimeout(onFin, Math.max(0, duree - (Date.now() - debut))));
      return;
    }
    if (!("speechSynthesis" in window)) { onFin(); return; }
    const phrase = new SpeechSynthesisUtterance(texte);
    phrase.lang = bcp47;
    phrase.rate = vitesse;
    phrase.volume = volume;
    const voix = speechSynthesis.getVoices().find((v) => v.name === nomVoix) || voixes(bcp47)[0];
    if (voix) phrase.voice = voix;
    phrase.onend = onFin;
    phrase.onerror = onFin;
    speechSynthesis.speak(phrase);
  }

  function arreterLecture() {
    if (natif() && module("TextToSpeech")) module("TextToSpeech").stop().catch(() => {});
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }

  window.Plateforme = {
    natif,
    disponible,
    demanderPermissions,
    demarrerEcoute,
    arreterEcoute,
    suspendreEcoute,
    reprendreEcoute,
    voixes,
    parler,
    arreterLecture,
  };
})();
