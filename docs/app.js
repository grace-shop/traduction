// Appel traduit : logique de l'appel.
// Chacun parle dans sa langue. Le texte reconnu est envoyé aux autres via LiveKit ; chacun le
// reçoit dans sa langue, traduit et lu à voix haute si nécessaire.
const { Room, RoomEvent, createLocalAudioTrack } = LivekitClient;

const encodeur = new TextEncoder();
const decodeur = new TextDecoder();
const SUJET_TEXTE = "texte";
const SUJET_LANGUE = "langue";
const LONGUEUR_MAX_TRADUCTION = 450; // MyMemory accepte des requêtes d'environ 500 caractères
const MAX_BULLES = 6;

const $ = (id) => document.getElementById(id);
const corps = document.body;

let room = null;
let micro = null;
let maLangue = null;       // code court, par exemple "fr"
let maLangueBcp = null;    // étiquette, par exemple "fr-FR"
let monIdentite = null;
let micActif = true;
let analyseur = null;
let contexteAudio = null;
let fileLecture = [];
let enLecture = false;
let quotaAtteint = false;
const langues = new Map(); // identité -> code de langue, pour chaque participant distant

// ---------- Affichage ----------

function etat(texte) { $("statut").textContent = texte; }
function etatAppel(texte) { $("etat").textContent = texte; }
function allerVers(phase) { corps.dataset.phase = phase; }
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
    option.textContent = Plateforme.natif() ? "Voix du téléphone" : "Voix par défaut";
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

// Liste des participants : moi et les autres, avec leur langue.
function rafraichirParticipants() {
  const liste = $("participants");
  liste.innerHTML = "";
  const ajouter = (nom, code, moi) => {
    const pastille = document.createElement("li");
    pastille.className = "chip" + (moi ? " moi" : "");
    pastille.textContent = `${nom} · ${trouverLangue(code)?.nom || code}`;
    liste.appendChild(pastille);
  };
  if (monIdentite) ajouter(monIdentite, maLangue, true);
  if (room) {
    room.remoteParticipants.forEach((p) => ajouter(p.identity, langues.get(p.identity) || "?", false));
  }
  $("compteur").textContent = `${liste.children.length} participant${liste.children.length > 1 ? "s" : ""}`;
}

function ajouterBulle(auteur, texte, moi) {
  const conteneur = $("sous-titres");
  const bulle = document.createElement("div");
  bulle.className = "bulle" + (moi ? " moi" : "");
  const nom = document.createElement("span");
  nom.className = "auteur";
  nom.textContent = auteur;
  bulle.appendChild(nom);
  bulle.appendChild(document.createTextNode(texte));
  conteneur.appendChild(bulle);
  while (conteneur.children.length > MAX_BULLES) conteneur.removeChild(conteneur.firstChild);
  conteneur.scrollTop = conteneur.scrollHeight;
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

async function traduire(texte, de, vers) {
  const cle = Outils.cleCache(texte, de, vers);
  const dejaFait = Outils.lireCache(cle);
  if (dejaFait) return dejaFait;

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
  const traduit = resultats.join(" ");
  Outils.memoriser(cle, traduit);
  return traduit;
}

// Les traductions sont lues les unes après les autres, jamais en même temps.
function lireEnFile(texte) {
  fileLecture.push(texte);
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
  const texte = fileLecture.shift();
  Plateforme.parler(texte, maLangueBcp, $("voix").value, lireSuivante);
}

// ---------- Messages ----------

function envoyerTexte(texte) {
  if (!room) return;
  const charge = encodeur.encode(JSON.stringify({ langue: maLangue, auteur: monIdentite, texte }));
  room.localParticipant.publishData(charge, { reliable: true, topic: SUJET_TEXTE })
    .catch(() => etatAppel("Message non envoyé. Vérifiez votre connexion."));
  ajouterBulle(monIdentite, texte, true);
}

function recevoirTexte(donnees, participant) {
  const message = Outils.lireMessage(decodeur.decode(donnees));
  if (!message) return;
  const auteur = participant ? participant.identity : "Participant";
  if (message.langue === maLangue) {
    ajouterBulle(auteur, message.texte, false);
    return;
  }
  traduire(message.texte, message.langue, maLangue)
    .then((traduit) => {
      ajouterBulle(auteur, traduit, false);
      lireEnFile(traduit);
    })
    .catch((erreur) => {
      if (erreur.message === "quota") {
        if (!quotaAtteint) etatAppel("Quota de traduction atteint pour aujourd'hui : les messages ne sont plus traduits.");
        quotaAtteint = true;
      }
      ajouterBulle(auteur, `${message.texte} (traduction indisponible)`, false);
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

// ---------- Appel ----------

async function rejoindre() {
  const nom = $("nom").value.trim();
  const salle = $("salle").value.trim();
  const motdepasse = $("motdepasse").value;
  if (!nom || !salle) { etat("Renseignez votre nom et la salle."); return; }
  if (!motdepasse) { etat("Saisissez le mot de passe de l'appel."); return; }
  if (!$("consentement").checked) {
    etat("Acceptez le traitement de votre voix pour rejoindre l'appel.");
    return;
  }
  if (!Plateforme.disponible()) {
    etat("La reconnaissance vocale n'est pas disponible sur cet appareil. Utilisez Chrome ou Edge.");
    return;
  }

  $("rejoindre").disabled = true;
  etat("Connexion...");

  const permission = await Plateforme.demanderPermissions();
  if (!permission) {
    etat("Le micro est refusé. Autorisez-le dans les réglages de l'appareil.");
    $("rejoindre").disabled = false;
    return;
  }

  maLangue = $("langue").value;
  maLangueBcp = trouverLangue(maLangue).bcp47;
  monIdentite = nom;
  quotaAtteint = false;

  // Le mot de passe part dans le corps de la requête, jamais dans l'adresse.
  let reponse;
  try {
    reponse = await fetch(window.CONFIG.TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identite: nom, salle, langue: maLangue, motdepasse }),
    });
  } catch {
    etat("Impossible de joindre le serveur. Vérifiez votre connexion.");
    $("rejoindre").disabled = false;
    return;
  }
  if (reponse.status === 401) { etat("Mot de passe incorrect."); $("rejoindre").disabled = false; return; }
  if (reponse.status === 429) { etat("Trop de tentatives. Réessayez dans quelques minutes."); $("rejoindre").disabled = false; return; }
  if (!reponse.ok) { etat("Erreur de connexion au serveur."); $("rejoindre").disabled = false; return; }
  const { token, url } = await reponse.json();

  room = new Room();
  room.on(RoomEvent.TrackSubscribed, (piste, publication, participant) => {
    if (piste.kind !== "audio") return;
    memoriserLangue(participant);
    appliquerAudio();
  });
  room.on(RoomEvent.TrackUnsubscribed, () => appliquerAudio());
  room.on(RoomEvent.ParticipantConnected, (participant) => {
    memoriserLangue(participant);
    rafraichirParticipants();
    etatAppel(`${participant.identity} a rejoint l'appel.`);
  });
  room.on(RoomEvent.ParticipantDisconnected, (participant) => {
    langues.delete(participant.identity);
    rafraichirParticipants();
    etatAppel(`${participant.identity} a quitté l'appel.`);
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
  room.on(RoomEvent.Reconnecting, () => etatAppel("Connexion instable : reconnexion en cours..."));
  room.on(RoomEvent.Reconnected, () => etatAppel("Reconnecté."));
  room.on(RoomEvent.Disconnected, () => nettoyer("Appel terminé."));

  try {
    await room.connect(url, token);
    micro = await createLocalAudioTrack();
    await room.localParticipant.publishTrack(micro);
  } catch {
    nettoyer("Connexion impossible. Vérifiez votre réseau et réessayez.");
    return;
  }

  langues.set(monIdentite, maLangue);
  room.remoteParticipants.forEach((p) => memoriserLangue(p));
  suivreNiveau(micro);
  $("nom-salle").textContent = salle;
  $("motdepasse").value = "";
  $("langue-appel").value = maLangue;
  micActif = true;
  $("micro").setAttribute("aria-pressed", "false");
  $("micro-libelle").textContent = "Micro";
  $("zone-orbe").classList.remove("muet");
  allerVers("appel");
  etatAppel("Parlez : les autres entendront votre message dans leur langue.");
  rafraichirParticipants();
  appliquerAudio();

  Plateforme.demarrerEcoute(maLangueBcp, envoyerTexte).catch(() => {
    etatAppel("La reconnaissance vocale s'est arrêtée.");
  });
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
  if (micActif) Plateforme.demarrerEcoute(maLangueBcp, envoyerTexte);
  appliquerAudio();
  rafraichirParticipants();
  etatAppel(`Votre langue est maintenant : ${trouverLangue(nouvelle).nom}.`);
}

function basculerMicro() {
  if (!micro) return;
  micActif = !micActif;
  if (micActif) {
    micro.unmute();
    if (!enLecture) Plateforme.reprendreEcoute();
  } else {
    micro.mute();
    Plateforme.suspendreEcoute();
  }
  $("micro").setAttribute("aria-pressed", String(!micActif));
  $("micro-libelle").textContent = micActif ? "Micro" : "Réactiver";
  $("zone-orbe").classList.toggle("muet", !micActif);
  etatAppel(micActif ? "Micro activé." : "Micro coupé : les autres ne vous entendent plus.");
}

function nettoyer(message) {
  Plateforme.arreterEcoute();
  Plateforme.arreterLecture();
  fileLecture = [];
  enLecture = false;
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

remplirLangues();
remplirSelectLangues($("langue-appel"), "fr");
if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = remplirVoix;
$("langue").addEventListener("change", remplirVoix);
$("langue-appel").addEventListener("change", (e) => changerLangue(e.target.value));
$("rejoindre").addEventListener("click", rejoindre);
$("quitter").addEventListener("click", quitter);
$("micro").addEventListener("click", basculerMicro);
