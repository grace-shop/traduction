// Appel traduit : logique de l'appel.
// Chacun parle dans sa langue. Le texte reconnu est envoyé aux autres via LiveKit ; chacun le
// reçoit dans sa langue, traduit et lu à voix haute si nécessaire.
const { Room, RoomEvent, createLocalAudioTrack } = LivekitClient;

const encodeur = new TextEncoder();
const decodeur = new TextDecoder();
const SUJET_TEXTE = "texte";
const LONGUEUR_MAX_TRADUCTION = 450; // MyMemory accepte des requêtes d'environ 500 caractères
const MAX_BULLES = 6;

const $ = (id) => document.getElementById(id);
const corps = document.body;

let room = null;
let micro = null;
let maLangue = null;      // code court, par exemple "fr"
let maLangueBcp = null;   // étiquette, par exemple "fr-FR"
let monIdentite = null;
let micActif = true;
let analyseur = null;
let contexteAudio = null;
let fileLecture = [];
let enLecture = false;

// ---------- Affichage ----------

function etat(texte) { $("statut").textContent = texte; }
function etatAppel(texte) { $("etat").textContent = texte; }

function allerVers(phase) { corps.dataset.phase = phase; }

function trouverLangue(code) { return window.LANGUES.find((l) => l.code === code); }

function remplirLangues() {
  const select = $("langue");
  window.LANGUES.forEach(({ code, nom }) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = nom;
    select.appendChild(option);
  });
  select.value = "fr";
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

function decouper(texte, taille) {
  const morceaux = [];
  let reste = texte.trim();
  while (reste.length > taille) {
    let coupe = reste.lastIndexOf(" ", taille);
    if (coupe <= 0) coupe = taille;
    morceaux.push(reste.slice(0, coupe));
    reste = reste.slice(coupe).trim();
  }
  if (reste) morceaux.push(reste);
  return morceaux;
}

function codeMyMemory(code) { return code === "zh" ? "zh-CN" : code; }

async function traduire(texte, de, vers) {
  const paire = `${codeMyMemory(de)}|${codeMyMemory(vers)}`;
  const resultats = [];
  for (const morceau of decouper(texte, LONGUEUR_MAX_TRADUCTION)) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(morceau)}&langpair=${encodeURIComponent(paire)}`;
    const reponse = await fetch(url);
    if (!reponse.ok) throw new Error("Service de traduction indisponible");
    const donnees = await reponse.json();
    if (donnees.responseStatus !== 200) throw new Error(donnees.responseDetails || "Traduction refusée");
    resultats.push(donnees.responseData.translatedText);
  }
  return resultats.join(" ");
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
  let message;
  try { message = JSON.parse(decodeur.decode(donnees)); } catch { return; }
  const auteur = participant ? participant.identity : message.auteur;
  if (message.langue === maLangue) {
    ajouterBulle(auteur, message.texte, false);
    return;
  }
  traduire(message.texte, message.langue, maLangue)
    .then((traduit) => {
      ajouterBulle(auteur, traduit, false);
      lireEnFile(traduit);
    })
    .catch(() => ajouterBulle(auteur, `${message.texte} (traduction indisponible)`, false));
}

function metadonneesDuParticipant(participant) {
  try { return JSON.parse(participant.metadata || "{}"); } catch { return {}; }
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

  const reponse = await fetch(
    `${window.CONFIG.TOKEN_URL}?identite=${encodeURIComponent(nom)}&salle=${encodeURIComponent(salle)}` +
    `&langue=${encodeURIComponent(maLangue)}&motdepasse=${encodeURIComponent(motdepasse)}`
  );
  if (reponse.status === 401) { etat("Mot de passe incorrect."); $("rejoindre").disabled = false; return; }
  if (!reponse.ok) { etat("Erreur : " + (await reponse.text())); $("rejoindre").disabled = false; return; }
  const { token, url } = await reponse.json();

  room = new Room();
  room.on(RoomEvent.TrackSubscribed, (piste, publication, participant) => {
    if (piste.kind !== "audio") return;
    if (metadonneesDuParticipant(participant).langue === maLangue) {
      $("audio").appendChild(piste.attach());
    }
  });
  room.on(RoomEvent.TrackUnsubscribed, (piste) => piste.detach().forEach((el) => el.remove()));
  room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
    if (topic === SUJET_TEXTE) recevoirTexte(payload, participant);
  });
  room.on(RoomEvent.Disconnected, () => nettoyer("Appel terminé."));

  try {
    await room.connect(url, token);
    micro = await createLocalAudioTrack();
    await room.localParticipant.publishTrack(micro);
  } catch {
    nettoyer("Connexion impossible. Vérifiez votre réseau et réessayez.");
    return;
  }

  suivreNiveau(micro);
  $("nom-salle").textContent = salle;
  $("motdepasse").value = "";
  micActif = true;
  $("micro").setAttribute("aria-pressed", "false");
  $("micro-libelle").textContent = "Micro";
  $("zone-orbe").classList.remove("muet");
  allerVers("appel");
  etatAppel("Parlez : les autres entendront votre message dans leur langue.");

  Plateforme.demarrerEcoute(maLangueBcp, envoyerTexte).catch(() => {
    etatAppel("La reconnaissance vocale s'est arrêtée.");
  });
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
  $("zone-orbe").style.removeProperty("--niveau");
  $("audio").innerHTML = "";
  $("sous-titres").innerHTML = "";
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
if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = remplirVoix;
$("langue").addEventListener("change", remplirVoix);
$("rejoindre").addEventListener("click", rejoindre);
$("quitter").addEventListener("click", quitter);
$("micro").addEventListener("click", basculerMicro);
