// Appel traduit : logique de l'appel.
// Chacun parle dans sa langue. Le texte reconnu est envoyé aux autres via LiveKit ; chacun le
// reçoit dans sa langue, traduit et lu à voix haute si nécessaire.
const { Room, RoomEvent, createLocalAudioTrack, createLocalVideoTrack } = LivekitClient;

const encodeur = new TextEncoder();
const decodeur = new TextDecoder();
const SUJET_TEXTE = "texte";
const SUJET_LANGUE = "langue";
const LONGUEUR_MAX_TRADUCTION = 450; // MyMemory accepte des requêtes d'environ 500 caractères
const MAX_BULLES = 6;
const URL_QR = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";

const $ = (id) => document.getElementById(id);
const corps = document.body;
const t = (cle, parametres) => I18N.t(cle, parametres);

let room = null;
let micro = null;
let camera = null;          // piste vidéo locale, si la caméra est activée
let maLangue = null;        // code court, par exemple "fr"
let maLangueBcp = null;     // étiquette, par exemple "fr-FR"
let monIdentite = null;
let salleCourante = "";
let micActif = false;
let analyseur = null;
let contexteAudio = null;
let fileLecture = [];
let enLecture = false;
let quotaAtteint = false;
let dernierEnvoi = null;    // dernier message envoyé, pour écarter les doublons
let dernierTexte = null;    // dernière traduction lue à voix haute, pour « Réécouter »
let historique = [];        // messages affichés pendant l'appel, pour l'export
let parlent = new Set();    // identités qui parlent en ce moment
let signatureParlent = "";
let reglages = Outils.normaliserReglages({});
const langues = new Map();  // identité -> code de langue, pour chaque participant distant

// ---------- Réglages ----------

function lireReglages() {
  try {
    const brut = JSON.parse(localStorage.getItem("reglages") || "{}");
    reglages = Outils.normaliserReglages(brut);
    reglages.interface = brut && typeof brut.interface === "string" ? brut.interface : null;
    reglages.theme = brut && THEMES.includes(brut.theme) ? brut.theme : "ocean";
  } catch {
    reglages = Outils.normaliserReglages({});
    reglages.theme = "ocean";
  }
}

function sauverReglages() {
  try { localStorage.setItem("reglages", JSON.stringify(reglages)); } catch { /* stockage indisponible */ }
}

function appliquerReglages() {
  $("vitesse").value = reglages.vitesse;
  $("volume").value = reglages.volume;
  $("taille").value = reglages.taille;
  $("masquer").checked = reglages.masquer;
  corps.classList.toggle("sous-titres-masques", reglages.masquer);
  corps.classList.remove("taille-petite", "taille-normale", "taille-grande");
  corps.classList.add(`taille-${reglages.taille}`);
  const theme = THEMES.includes(reglages.theme) ? reglages.theme : "ocean";
  $("theme").value = theme;
  document.documentElement.dataset.theme = theme;
  document.dispatchEvent(new Event("themechange"));
}

// Thèmes : chacun redéfinit les couleurs dans style.css.
const THEMES = ["nuit", "aurore", "ocean", "emeraude", "clair"];

// ---------- Affichage ----------

function etat(texte) { $("statut").textContent = texte; }
function etatAppel(texte) { $("etat").textContent = texte; }
function allerVers(phase) {
  corps.dataset.phase = phase;
  // Au passage en appel, le focus va sur le micro : utile au clavier et au lecteur d'écran.
  if (phase === "appel") $("micro").focus({ preventScroll: true });
}
function trouverLangue(code) { return window.LANGUES.find((l) => l.code === code); }

function remplirSelectLangues(select, valeur) {
  select.innerHTML = "";
  window.LANGUES.forEach(({ code, nom }) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = nom;
    select.appendChild(option);
  });
  select.value = valeur;
}

function remplirInterface() {
  const select = $("langue-interface");
  select.innerHTML = "";
  I18N.langues().forEach(({ code, nom }) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = nom;
    select.appendChild(option);
  });
  select.value = I18N.actuelle();
}

function remplirLangues() {
  remplirSelectLangues($("langue"), "fr");
  remplirVoix();
}

function remplirVoix() {
  const select = $("voix");
  select.innerHTML = "";
  const langue = trouverLangue($("langue").value);
  const voix = Plateforme.voixes(langue.bcp47);
  if (!voix.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = Plateforme.natif() ? t("voix_native") : t("voix_defaut");
    select.appendChild(option);
    return;
  }
  voix.forEach((v) => {
    const option = document.createElement("option");
    option.value = v.name;
    option.textContent = `${v.name} (${v.lang})`;
    select.appendChild(option);
  });
}

// Liste des participants : moi et les autres, avec leur langue. Celui qui parle est mis en avant.
function rafraichirParticipants() {
  const liste = $("participants");
  liste.innerHTML = "";
  const ajouter = (nom, code, moi) => {
    const pastille = document.createElement("li");
    pastille.className = "chip" + (moi ? " moi" : "") + (parlent.has(nom) ? " parle" : "");
    pastille.textContent = `${nom} · ${trouverLangue(code)?.nom || code}`;
    liste.appendChild(pastille);
  };
  if (monIdentite) ajouter(monIdentite, maLangue, true);
  if (room) {
    room.remoteParticipants.forEach((p) => ajouter(p.identity, langues.get(p.identity) || "?", false));
  }
  const n = liste.children.length;
  $("compteur").textContent = t(n > 1 ? "compteur_plusieurs" : "compteur_un", { n });
}

// Une bulle : le nom, la traduction, et le texte original en retrait quand il est différent.
function ajouterBulle(auteur, texte, moi, original = null) {
  const conteneur = $("sous-titres");
  const bulle = document.createElement("div");
  bulle.className = "bulle" + (moi ? " moi" : "");
  const nom = document.createElement("span");
  nom.className = "auteur";
  nom.textContent = auteur;
  bulle.appendChild(nom);
  bulle.appendChild(document.createTextNode(texte));
  if (original && original !== texte) {
    const source = document.createElement("span");
    source.className = "original";
    source.textContent = original;
    bulle.appendChild(source);
  }
  conteneur.appendChild(bulle);
  while (conteneur.children.length > MAX_BULLES) conteneur.removeChild(conteneur.firstChild);
  conteneur.scrollTop = conteneur.scrollHeight;
  historique.push({ heure: new Date().toTimeString().slice(0, 5), auteur, texte });
  return bulle;
}

// Vidéos : une tuile par flux (la mienne en miroir, celles des autres telles quelles).
function ajouterTuile(id, qui, element, moi) {
  const tuile = document.createElement("div");
  tuile.className = "video-tuile" + (moi ? " moi" : "");
  tuile.dataset.id = id;
  tuile.dataset.qui = qui;
  element.setAttribute("playsinline", "");
  element.autoplay = true;
  if (moi) element.muted = true;
  tuile.appendChild(element);
  const etiquette = document.createElement("span");
  etiquette.className = "nom";
  etiquette.textContent = moi ? t("moi") : qui;
  tuile.appendChild(etiquette);
  $("videos").appendChild(tuile);
}

function retirerTuile(id) {
  document.querySelectorAll(".video-tuile").forEach((tuile) => {
    if (tuile.dataset.id === id) tuile.remove();
  });
}

function retirerTuilesDe(qui) {
  document.querySelectorAll(".video-tuile").forEach((tuile) => {
    if (tuile.dataset.qui === qui) tuile.remove();
  });
}

// Le cercle suit le niveau de ma voix : retour visuel que le micro fonctionne.
function suivreNiveau(piste) {
  try {
    contexteAudio = new (window.AudioContext || window.webkitAudioContext)();
    const source = contexteAudio.createMediaStreamSource(new MediaStream([piste.mediaStreamTrack]));
    analyseur = contexteAudio.createAnalyser();
    analyseur.fftSize = 256;
    source.connect(analyseur);
    const donnees = new Uint8Array(analyseur.fftSize);
    const zone = $("zone-orbe");
    const tick = () => {
      if (!analyseur) return;
      analyseur.getByteTimeDomainData(donnees);
      let somme = 0;
      for (const v of donnees) { const x = (v - 128) / 128; somme += x * x; }
      const niveau = Math.min(1, Math.sqrt(somme / donnees.length) * 4);
      zone.style.setProperty("--niveau", niveau.toFixed(3));
      requestAnimationFrame(tick);
    };
    tick();
  } catch {
    // Pas d'analyse audio disponible : le cercle reste statique.
  }
}

// ---------- Traduction ----------

async function traduireMyMemory(texte, de, vers) {
  const resultats = [];
  for (const morceau of Outils.decouper(texte, LONGUEUR_MAX_TRADUCTION)) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(morceau)}` +
      `&langpair=${encodeURIComponent(Outils.paireMyMemory(de, vers))}`;
    const reponse = await fetch(url);
    if (!reponse.ok) throw new Error("indisponible");
    const donnees = await reponse.json();
    if (donnees.responseStatus !== 200) {
      const detail = String(donnees.responseDetails || "");
      if (/QUOTA|LIMIT/i.test(detail)) throw new Error("quota");
      throw new Error("refusee");
    }
    resultats.push(donnees.responseData.translatedText);
  }
  return resultats.join(" ");
}

// Service de secours (LibreTranslate ou compatible), utilisé si MyMemory échoue.
async function traduireSecours(texte, de, vers, adresse) {
  const resultats = [];
  for (const morceau of Outils.decouper(texte, LONGUEUR_MAX_TRADUCTION)) {
    const requete = Outils.requeteSecours(adresse, morceau, de, vers);
    const reponse = await fetch(requete.url, requete.options);
    if (!reponse.ok) throw new Error("secours indisponible");
    const donnees = await reponse.json();
    if (!donnees || typeof donnees.translatedText !== "string") throw new Error("secours refusé");
    resultats.push(donnees.translatedText);
  }
  return resultats.join(" ");
}

// Traduction par notre service (Cloudflare) : meilleure qualité. Si elle échoue, on passe au service direct.
async function traduireServeur(texte, de, vers) {
  const adresse = window.CONFIG && window.CONFIG.TRADUCTION_URL;
  if (!adresse) throw new Error("absent");
  const reponse = await fetch(adresse, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texte, de, vers }),
  });
  if (!reponse.ok) throw new Error("serveur");
  const donnees = await reponse.json();
  if (!donnees.traduit) throw new Error("vide");
  return donnees.traduit;
}

async function traduire(texte, de, vers) {
  const cle = Outils.cleCache(texte, de, vers);
  const dejaFait = Outils.lireCache(cle);
  if (dejaFait) return dejaFait;

  try {
    const serveur = await traduireServeur(texte, de, vers);
    Outils.memoriser(cle, serveur);
    return serveur;
  } catch { /* on passe au service direct */ }

  let traduit;
  try {
    traduit = await traduireMyMemory(texte, de, vers);
  } catch (erreur) {
    const secours = window.CONFIG && window.CONFIG.TRADUCTION_SECOURS;
    if (!secours) throw erreur;
    try {
      traduit = await traduireSecours(texte, de, vers, secours);
    } catch {
      throw erreur; // on garde l'erreur d'origine (quota, par exemple) pour le message affiché
    }
  }
  Outils.memoriser(cle, traduit);
  return traduit;
}

// Les traductions sont lues les unes après les autres, jamais en même temps.
// La bulle correspondante s'allume pendant que la voix IA la lit.
function lireEnFile(texte, bulle = null) {
  // Trop de traductions en attente : on garde les deux plus récentes, pour ne pas faire attendre.
  while (fileLecture.length >= 2) fileLecture.shift();
  fileLecture.push({ texte, bulle });
  if (!enLecture) lireSuivante();
}

function lireSuivante() {
  if (!fileLecture.length) {
    enLecture = false;
    if (room && micActif) Plateforme.reprendreEcoute();
    return;
  }
  enLecture = true;
  Plateforme.suspendreEcoute();
  const { texte, bulle } = fileLecture.shift();
  if (bulle) bulle.classList.add("lecture");
  const fin = () => {
    if (bulle) bulle.classList.remove("lecture");
    lireSuivante();
  };
  Plateforme.parler(texte, maLangueBcp, $("voix").value, fin, reglages);
}

// ---------- Messages ----------

function envoyerTexte(texte) {
  if (!room) return;
  const maintenant = Date.now();
  // Bruits et hésitations ignorés ; une même phrase captée deux fois n'est envoyée qu'une fois.
  if (!Outils.texteUtile(texte)) return;
  if (Outils.estDoublon(texte, dernierEnvoi, maintenant)) return;
  dernierEnvoi = { texte, heure: maintenant };
  const charge = encodeur.encode(JSON.stringify({ langue: maLangue, auteur: monIdentite, texte }));
  room.localParticipant.publishData(charge, { reliable: true, topic: SUJET_TEXTE })
    .catch(() => etatAppel(t("st_non_envoye")));
  ajouterBulle(monIdentite, texte, true);
}

function recevoirTexte(donnees, participant) {
  const message = Outils.lireMessage(decodeur.decode(donnees));
  if (!message) return;
  const auteur = participant ? participant.identity : t("participant");
  if (message.langue === maLangue) {
    ajouterBulle(auteur, message.texte, false);
    return;
  }
  traduire(message.texte, message.langue, maLangue)
    .then((traduit) => {
      const bulle = ajouterBulle(auteur, traduit, false, message.texte);
      dernierTexte = traduit;
      lireEnFile(traduit, bulle);
    })
    .catch((erreur) => {
      if (erreur.message === "quota") {
        if (!quotaAtteint) etatAppel(t("st_quota"));
        quotaAtteint = true;
      }
      ajouterBulle(auteur, `${message.texte} ${t("traduction_indisponible")}`, false);
    });
}

// Je n'entends le son original que des personnes qui parlent ma langue.
function appliquerAudio() {
  const conteneur = $("audio");
  conteneur.innerHTML = "";
  if (!room) return;
  room.remoteParticipants.forEach((p) => {
    if (langues.get(p.identity) !== maLangue) return;
    for (const publication of p.audioTrackPublications.values()) {
      if (publication.track) conteneur.appendChild(publication.track.attach());
    }
  });
}

function memoriserLangue(participant) {
  if (langues.has(participant.identity)) return;
  try {
    const meta = JSON.parse(participant.metadata || "{}");
    if (meta.langue) langues.set(participant.identity, meta.langue);
  } catch { /* métadonnées absentes : la langue sera connue au premier message */ }
}

// ---------- Outils de l'appel ----------

async function copierLien() {
  const lien = Outils.lienInvitation(adresseWeb(), salleCourante);
  try {
    await navigator.clipboard.writeText(lien);
    etatAppel(t("lien_copie"));
  } catch {
    etatAppel(t("lien_manuel") + lien);
  }
}

function chargerQr() {
  if (window.qrcode) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = URL_QR;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("qr"));
    document.head.appendChild(script);
  });
}

async function afficherQr() {
  const zone = $("qr");
  const bouton = $("afficher-qr");
  if (!zone.hidden) {
    zone.hidden = true;
    bouton.setAttribute("aria-expanded", "false");
    return;
  }
  try {
    await chargerQr();
    const qr = window.qrcode(0, "M");
    qr.addData(Outils.lienInvitation(location.href, salleCourante));
    qr.make();
    zone.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0 });
    zone.hidden = false;
    bouton.setAttribute("aria-expanded", "true");
  } catch {
    etatAppel(t("qr_indisponible"));
  }
}

function reecouter() {
  if (dernierTexte) lireEnFile(dernierTexte);
}

function telechargerHistorique() {
  if (!historique.length) { etatAppel(t("historique_vide")); return; }
  const contenu = Outils.historiqueTexte(historique);
  const url = URL.createObjectURL(new Blob([contenu], { type: "text/plain;charset=utf-8" }));
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `appel-${salleCourante.replace(/[^\p{L}\p{N}]+/gu, "-") || "conversation"}.txt`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function basculerCamera() {
  if (!room) return;
  const bouton = $("camera");
  if (camera) {
    try { await room.localParticipant.unpublishTrack(camera); } catch { /* déjà retirée */ }
    camera.stop();
    camera = null;
    retirerTuile("moi-video");
    bouton.setAttribute("aria-pressed", "false");
    $("camera-libelle").textContent = t("camera");
    etatAppel(t("st_camera_off"));
    return;
  }
  try {
    camera = await createLocalVideoTrack();
    await room.localParticipant.publishTrack(camera);
    ajouterTuile("moi-video", monIdentite, camera.attach(), true);
    bouton.setAttribute("aria-pressed", "true");
    $("camera-libelle").textContent = t("camera");
    etatAppel(t("st_camera_on"));
  } catch {
    camera = null;
    etatAppel(t("st_camera_err"));
  }
}

// ---------- Appel ----------

async function rejoindre() {
  const nom = $("nom").value.trim();
  const salle = $("salle").value.trim();
  const motdepasse = window.CONFIG.MOT_DE_PASSE;
  if (!nom || !salle) { etat(t("st_nom_salle")); return; }
  if (!$("consentement").checked) {
    etat(t("st_consent"));
    return;
  }
  if (!Plateforme.disponible()) {
    etat(t("st_pas_reco"));
    return;
  }

  $("rejoindre").disabled = true;
  etat(t("st_connexion"));

  const permission = await Plateforme.demanderPermissions();
  if (!permission) {
    etat(t("st_micro_refuse"));
    $("rejoindre").disabled = false;
    return;
  }

  maLangue = $("langue").value;
  maLangueBcp = trouverLangue(maLangue).bcp47;
  monIdentite = nom;
  salleCourante = salle;
  quotaAtteint = false;
  historique = [];
  dernierTexte = null;

  // Le mot de passe part dans le corps de la requête, jamais dans l'adresse.
  let reponse;
  try {
    reponse = await fetch(window.CONFIG.TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identite: nom, salle, langue: maLangue, motdepasse }),
    });
  } catch {
    etat(t("st_serveur"));
    $("rejoindre").disabled = false;
    return;
  }
  if (reponse.status === 401) { etat(t("st_mdp_faux")); $("rejoindre").disabled = false; return; }
  if (reponse.status === 429) { etat(t("st_trop")); $("rejoindre").disabled = false; return; }
  if (!reponse.ok) { etat(t("st_erreur_serveur")); $("rejoindre").disabled = false; return; }
  const { token, url } = await reponse.json();

  room = new Room();
  room.on(RoomEvent.TrackSubscribed, (piste, publication, participant) => {
    if (piste.kind === "video") {
      ajouterTuile(publication.trackSid, participant.identity, piste.attach(), false);
      return;
    }
    if (piste.kind !== "audio") return;
    memoriserLangue(participant);
    appliquerAudio();
  });
  room.on(RoomEvent.TrackUnsubscribed, (piste, publication, participant) => {
    if (piste.kind === "video") {
      piste.detach().forEach((element) => element.remove());
      retirerTuile(publication.trackSid);
    }
    appliquerAudio();
  });
  room.on(RoomEvent.ParticipantConnected, (participant) => {
    memoriserLangue(participant);
    rafraichirParticipants();
    etatAppel(t("st_rejoint", { nom: participant.identity }));
  });
  room.on(RoomEvent.ParticipantDisconnected, (participant) => {
    langues.delete(participant.identity);
    parlent.delete(participant.identity);
    retirerTuilesDe(participant.identity);
    rafraichirParticipants();
    etatAppel(t("st_quitte", { nom: participant.identity }));
  });
  room.on(RoomEvent.ActiveSpeakersChanged, (orateurs) => {
    parlent = new Set(orateurs.map((o) => o.identity));
    // On ne redessine la liste que si la liste des orateurs a réellement changé.
    const signature = [...parlent].sort().join("|");
    if (signature !== signatureParlent) {
      signatureParlent = signature;
      rafraichirParticipants();
    }
  });
  room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
    if (topic === SUJET_TEXTE) {
      recevoirTexte(payload, participant);
    } else if (topic === SUJET_LANGUE && participant) {
      const message = Outils.lireMessage(decodeur.decode(payload));
      if (message) {
        langues.set(participant.identity, message.langue);
        appliquerAudio();
        rafraichirParticipants();
      }
    }
  });
  room.on(RoomEvent.Reconnecting, () => etatAppel(t("st_instable")));
  room.on(RoomEvent.Reconnected, () => etatAppel(t("st_reconnecte")));
  room.on(RoomEvent.Disconnected, () => nettoyer(t("st_fin")));

  try {
    await room.connect(url, token);
    micro = await createLocalAudioTrack();
    await room.localParticipant.publishTrack(micro);
  } catch {
    nettoyer(t("st_echec"));
    return;
  }

  langues.set(monIdentite, maLangue);
  room.remoteParticipants.forEach((p) => memoriserLangue(p));
  suivreNiveau(micro);
  $("nom-salle").textContent = salle;
  $("langue-appel").value = maLangue;
  micActif = false;
  micro.mute();
  $("micro").setAttribute("aria-pressed", "false");
  $("micro-libelle").textContent = t("micro_parler");
  $("zone-orbe").classList.add("muet");
  allerVers("appel");
  etatAppel(t("st_parlez"));
  rafraichirParticipants();
  appliquerAudio();
}

// Écoute ma voix et envoie chaque phrase. Une erreur bloquante est signalée à l'écran.
function demarrerMicroTexte() {
  return Plateforme.demarrerEcoute(maLangueBcp, envoyerTexte, (erreur) => {
    etatAppel(`${t("st_reco_arret")} (${erreur})`);
  }).catch(() => etatAppel(t("st_reco_arret")));
}

// Changer de langue pendant l'appel : les autres en sont informés.
function changerLangue(nouvelle) {
  if (!room || nouvelle === maLangue) return;
  maLangue = nouvelle;
  maLangueBcp = trouverLangue(nouvelle).bcp47;
  langues.set(monIdentite, nouvelle);
  const charge = encodeur.encode(JSON.stringify({ langue: nouvelle }));
  room.localParticipant.publishData(charge, { reliable: true, topic: SUJET_LANGUE }).catch(() => {});
  Plateforme.arreterEcoute();
  if (micActif) demarrerMicroTexte();
  appliquerAudio();
  rafraichirParticipants();
  etatAppel(t("st_langue", { langue: trouverLangue(nouvelle).nom }));
}

// Tour de parole : on appuie pour parler, on appuie à nouveau pour terminer.
// Le micro n'écoute que pendant ce tour, donc il n'entend ni les haut-parleurs ni les autres.
function basculerMicro() {
  if (!micro) return;
  micActif = !micActif;
  if (micActif) {
    micro.unmute();
    if (!enLecture) demarrerMicroTexte();
  } else {
    micro.mute();
    Plateforme.suspendreEcoute();
  }
  $("micro").setAttribute("aria-pressed", String(micActif));
  $("micro-libelle").textContent = micActif ? t("micro_terminer") : t("micro_parler");
  $("zone-orbe").classList.toggle("muet", !micActif);
  etatAppel(micActif ? t("st_micro_on") : t("st_micro_off"));
}

function nettoyer(message) {
  Plateforme.arreterEcoute();
  Plateforme.arreterLecture();
  fileLecture = [];
  enLecture = false;
  dernierEnvoi = null;
  parlent = new Set();
  signatureParlent = "";
  if (camera) { camera.stop(); camera = null; }
  $("camera").setAttribute("aria-pressed", "false");
  $("camera-libelle").textContent = t("camera");
  $("videos").innerHTML = "";
  $("qr").hidden = true;
  $("afficher-qr").setAttribute("aria-expanded", "false");
  if (contexteAudio) { contexteAudio.close().catch(() => {}); contexteAudio = null; }
  analyseur = null;
  langues.clear();
  $("zone-orbe").style.removeProperty("--niveau");
  $("audio").innerHTML = "";
  $("sous-titres").innerHTML = "";
  $("participants").innerHTML = "";
  if (room) { room.removeAllListeners(); room = null; }
  micro = null;
  $("rejoindre").disabled = false;
  allerVers("accueil");
  etat(message);
}

function quitter() {
  if (room) room.disconnect();
  else nettoyer("");
}

// ---------- Démarrage ----------

lireReglages();
I18N.choisir(I18N.codeInitial(reglages.interface));
I18N.surChangement(() => {
  remplirVoix();
  rafraichirParticipants();
});
remplirInterface();
appliquerReglages();

remplirLangues();
remplirSelectLangues($("langue-appel"), "fr");
const salleDuLien = new URLSearchParams(location.search).get("salle");
if (salleDuLien) $("salle").value = salleDuLien.slice(0, 64);

// Invitation ouverte depuis l'application installée : la salle du lien est reprise dans le champ.
function appliquerLienEntrant(lien) {
  try {
    const salle = new URL(lien).searchParams.get("salle");
    if (salle) $("salle").value = salle.slice(0, 64);
  } catch { /* lien invalide : on ignore */ }
}
(function ecouterLiensEntrants() {
  const appli = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (!appli) return;
  appli.getLaunchUrl().then((r) => { if (r && r.url) appliquerLienEntrant(r.url); }).catch(() => {});
  appli.addListener("appUrlOpen", (e) => { if (e && e.url) appliquerLienEntrant(e.url); });
})();

if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = remplirVoix;
$("langue").addEventListener("change", remplirVoix);
$("langue-appel").addEventListener("change", (e) => changerLangue(e.target.value));
$("langue-interface").addEventListener("change", (e) => {
  I18N.choisir(e.target.value);
  reglages.interface = e.target.value;
  sauverReglages();
  remplirInterface();
});
$("rejoindre").addEventListener("click", rejoindre);
$("quitter").addEventListener("click", quitter);
$("micro").addEventListener("click", basculerMicro);
$("camera").addEventListener("click", basculerCamera);
$("copier-lien").addEventListener("click", copierLien);
$("afficher-qr").addEventListener("click", afficherQr);
$("reecouter").addEventListener("click", reecouter);
$("telecharger").addEventListener("click", telechargerHistorique);

$("vitesse").addEventListener("input", (e) => { reglages.vitesse = Number(e.target.value); sauverReglages(); });
$("volume").addEventListener("input", (e) => { reglages.volume = Number(e.target.value); sauverReglages(); });
$("taille").addEventListener("change", (e) => { reglages.taille = e.target.value; sauverReglages(); appliquerReglages(); });
$("masquer").addEventListener("change", (e) => { reglages.masquer = e.target.checked; sauverReglages(); appliquerReglages(); });
$("theme").addEventListener("change", (e) => { reglages.theme = e.target.value; sauverReglages(); appliquerReglages(); });

// ---------- Partage et ouverture depuis un lien ----------

// Adresse du site à partager. Dans l'application, on partage l'adresse du site (pas le fichier local).
function adresseWeb() {
  return (window.Plateforme && Plateforme.natif()) ? "https://grace-shop.github.io/traduction/" : location.href.split("?")[0];
}

async function partager(salleChoisie) {
  const salle = typeof salleChoisie === "string" ? salleChoisie : (salleCourante || $("salle").value.trim());
  const lien = Outils.lienInvitation(adresseWeb(), salle);
  const texte = t("partage_texte", { salle: salle || t("titre") });
  const afficher = document.body.dataset.phase === "appel" ? etatAppel : etat;
  try {
    if (navigator.share) {
      await navigator.share({ title: t("titre"), text: texte, url: lien });
      return;
    }
    await navigator.clipboard.writeText(`${texte} ${lien}`);
    afficher(t("lien_copie"));
  } catch {
    // Partage annulé par l'utilisateur, ou indisponible : rien à faire.
  }
}
$("partager").addEventListener("click", partager);
$("partager-accueil").addEventListener("click", partager);

// Sur Android, une invitation ouverte dans le navigateur propose d'ouvrir la salle dans l'application.
// Le lien intent ouvre l'application si elle est installée, sinon revient à cette page.
function proposerOuverture() {
  if (window.Plateforme && Plateforme.natif()) return;
  if (!/Android/i.test(navigator.userAgent)) return;
  const url = new URL(location.href);
  const salle = url.searchParams.get("salle");
  const chemin = location.pathname.replace(/\/index\.html$/, "/");
  const cible = `${location.host}${chemin}${salle ? "?salle=" + encodeURIComponent(salle) : ""}`;
  $("ouvrir-app").href = `intent://${cible}#Intent;scheme=https;package=fr.appeltraduit.app;` +
    `S.browser_fallback_url=${encodeURIComponent(location.href)};end`;
  $("ouvrir-fermer").addEventListener("click", () => {
    $("ouvrir-banniere").hidden = true;
    try { sessionStorage.setItem("ouverture-fermee", "1"); } catch { /* */ }
  });
  if (sessionStorage.getItem("ouverture-fermee")) return;
  $("ouvrir-banniere").hidden = false;
  // Une seule tentative automatique par session, pour éviter les boucles si l'application n'est pas installée.
  if (salle && !sessionStorage.getItem("ouverture-tentee")) {
    sessionStorage.setItem("ouverture-tentee", "1");
    setTimeout(() => { location.href = $("ouvrir-app").href; }, 400);
  }
}
proposerOuverture();

// ---------- Réunions planifiées ----------

const URL_REUNIONS = () => window.CONFIG.TOKEN_URL.replace(/\/token$/, "");

// Appel au service des réunions. Le mot de passe commun est envoyé automatiquement.
async function appelReunions(chemin, corps = {}) {
  const reponse = await fetch(URL_REUNIONS() + chemin, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...corps, motdepasse: window.CONFIG.MOT_DE_PASSE }),
  });
  if (!reponse.ok) throw new Error("reunions");
  return reponse.json();
}

function dateLisible(ms) {
  return new Date(ms).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function echappeIcs(texte) {
  return String(texte).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Fichier .ics : s'ouvre dans le calendrier du téléphone ou de l'ordinateur.
function telechargerIcs(reunion) {
  const format = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lien = Outils.lienInvitation(adresseWeb(), reunion.salle);
  const description = `${t("partage_texte", { salle: reunion.salle })} ${lien}`;
  const contenu = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Appel traduit//FR", "BEGIN:VEVENT",
    `UID:${reunion.id}@appel-traduit`, `DTSTAMP:${format(Date.now())}`,
    `DTSTART:${format(reunion.debut)}`, `DTEND:${format(reunion.fin)}`,
    `SUMMARY:${echappeIcs(reunion.titre)}`, `DESCRIPTION:${echappeIcs(description)}`,
    `URL:${lien}`, "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const fichier = new Blob([contenu], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(fichier);
  a.download = "reunion-appel-traduit.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function afficherReunions(reunions) {
  const liste = $("liste-reunions");
  liste.textContent = "";
  if (!reunions.length) {
    const vide = document.createElement("li");
    vide.className = "reunion-vide";
    vide.textContent = t("reunion_vide");
    liste.appendChild(vide);
    return;
  }
  reunions.forEach((r) => {
    const item = document.createElement("li");
    item.className = "reunion";
    const info = document.createElement("div");
    info.className = "reunion-info";
    const titre = document.createElement("strong");
    titre.textContent = r.titre;
    const date = document.createElement("span");
    date.textContent = dateLisible(r.debut);
    info.append(titre, date);
    const actions = document.createElement("div");
    actions.className = "reunion-actions";
    const bouton = (texte, action, secondaire) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "bouton petit" + (secondaire ? " secondaire" : "");
      b.textContent = texte;
      b.addEventListener("click", action);
      return b;
    };
    actions.append(
      bouton(t("reunion_rejoindre"), () => {
        $("salle").value = r.salle;
        allerVers("accueil");
        $("nom").focus();
      }),
      bouton(t("partager"), () => partager(r.salle), true),
      bouton(t("reunion_calendrier"), () => telechargerIcs(r), true),
    );
    item.append(info, actions);
    liste.appendChild(item);
  });
}

async function chargerReunions() {
  try {
    const donnees = await appelReunions("/reunions/liste");
    afficherReunions(donnees.reunions || []);
  } catch {
    $("reunion-statut").textContent = t("reunion_serveur");
  }
}

function salleDepuisTitre(titre) {
  const base = titre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "reunion";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

$("ouvrir-reunions").addEventListener("click", () => {
  allerVers("reunions");
  $("reunion-statut").textContent = "";
  const maintenant = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  $("reunion-date").min = maintenant.toISOString().slice(0, 16);
  chargerReunions();
});
$("reunions-retour").addEventListener("click", () => allerVers("accueil"));

$("formulaire-reunion").addEventListener("submit", async (e) => {
  e.preventDefault();
  const titre = $("reunion-titre").value.trim();
  const debut = new Date($("reunion-date").value).getTime();
  const salle = $("reunion-salle").value.trim() || salleDepuisTitre(titre);
  $("reunion-salle").value = salle;
  $("reunion-statut").textContent = "…";
  try {
    await appelReunions("/reunions/creer", {
      titre, debut, salle, duree: Number($("reunion-duree").value),
    });
    $("reunion-statut").textContent = t("reunion_creee");
    $("formulaire-reunion").reset();
    $("reunion-salle").value = "";
    chargerReunions();
  } catch {
    $("reunion-statut").textContent = t("reunion_erreur");
  }
});
