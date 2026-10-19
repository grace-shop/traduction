// Appel traduit, version navigateur.
// Chaque personne parle dans sa langue : la reconnaissance vocale tourne dans son navigateur,
// le texte est envoyé aux autres via LiveKit, puis chacun le reçoit dans sa langue
// (traduit et lu à voix haute si besoin).
const { Room, RoomEvent, createLocalAudioTrack } = LivekitClient;

const encodeur = new TextEncoder();
const decodeur = new TextDecoder();
const SUJET_TEXTE = "texte";
const LONGUEUR_MAX_TRADUCTION = 450; // MyMemory accepte des requêtes d'environ 500 caractères

let room = null;
let enAppel = false;
let maLangue = null;        // code court, par exemple "fr"
let maLangueBcp = null;     // étiquette navigateur, par exemple "fr-FR"
let monIdentite = null;
let reconnaissance = null;
let paroleEnCours = 0;      // nombre de phrases traduites en cours de lecture

const $ = (id) => document.getElementById(id);
const statut = (texte) => { $("statut").textContent = texte; };
const trouverLangue = (code) => window.LANGUES.find((l) => l.code === code);

// ---------- Langues et voix ----------

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

function voixDisponibles(lang) {
  const prefixe = lang.slice(0, 2).toLowerCase();
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(prefixe));
}

function remplirVoix() {
  const select = $("voix");
  select.innerHTML = "";
  const langue = trouverLangue($("langue").value);
  const voix = voixDisponibles(langue.bcp47);
  if (!voix.length) {
    const option = document.createElement("option");
    option.textContent = "Voix par défaut du navigateur";
    option.value = "";
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

function voixChoisie(lang) {
  const nom = $("voix").value;
  const voix = speechSynthesis.getVoices();
  return voix.find((v) => v.name === nom) || voixDisponibles(lang)[0] || null;
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

function codeMyMemory(code) {
  return code === "zh" ? "zh-CN" : code;
}

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

// ---------- Lecture à voix haute ----------

function relancerReconnaissance() {
  if (!enAppel || !reconnaissance || paroleEnCours > 0) return;
  try { reconnaissance.start(); } catch { /* déjà démarrée */ }
}

function lire(texte, lang) {
  if (!("speechSynthesis" in window)) return;
  paroleEnCours += 1;
  // Pendant que l'on parle, on coupe la reconnaissance pour ne pas réentendre la traduction.
  if (reconnaissance) { try { reconnaissance.stop(); } catch { /* déjà arrêtée */ } }
  const phrase = new SpeechSynthesisUtterance(texte);
  phrase.lang = lang;
  const voix = voixChoisie(lang);
  if (voix) phrase.voice = voix;
  const fin = () => { paroleEnCours = Math.max(0, paroleEnCours - 1); setTimeout(relancerReconnaissance, 300); };
  phrase.onend = fin;
  phrase.onerror = fin;
  speechSynthesis.speak(phrase);
}

// ---------- Reconnaissance vocale (ce que je dis) ----------

function demarrerReconnaissance() {
  const RV = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!RV) {
    statut("La reconnaissance vocale n'est pas disponible dans ce navigateur. Utilisez Chrome ou Edge.");
    return;
  }
  reconnaissance = new RV();
  reconnaissance.lang = maLangueBcp;
  reconnaissance.continuous = true;
  reconnaissance.interimResults = false;
  reconnaissance.onresult = (evenement) => {
    for (let i = evenement.resultIndex; i < evenement.results.length; i++) {
      const resultat = evenement.results[i];
      if (!resultat.isFinal) continue;
      const texte = resultat[0].transcript.trim();
      if (texte) envoyerTexte(texte);
    }
  };
  reconnaissance.onend = () => { setTimeout(relancerReconnaissance, 300); };
  reconnaissance.onerror = (evenement) => {
    if (evenement.error === "not-allowed") statut("Le micro est refusé. Autorisez-le dans le navigateur.");
  };
  relancerReconnaissance();
}

function envoyerTexte(texte) {
  const charge = encodeur.encode(JSON.stringify({ langue: maLangue, auteur: monIdentite, texte }));
  room.localParticipant.publishData(charge, { reliable: true, topic: SUJET_TEXTE })
    .catch(() => statut("Message non envoyé. Vérifiez votre connexion."));
  afficherSousTitre(monIdentite, texte);
}

// ---------- Réception ----------

function recevoirTexte(donnees, participant) {
  let message;
  try { message = JSON.parse(decodeur.decode(donnees)); } catch { return; }
  const auteur = participant ? participant.identity : message.auteur;
  if (message.langue === maLangue) {
    afficherSousTitre(auteur, message.texte);
    return;
  }
  traduire(message.texte, message.langue, maLangue)
    .then((traduit) => {
      afficherSousTitre(auteur, traduit);
      lire(traduit, maLangueBcp);
    })
    .catch(() => afficherSousTitre(auteur, `${message.texte} (traduction indisponible)`));
}

function afficherSousTitre(auteur, texte) {
  const conteneur = $("sous-titres");
  const ligne = document.createElement("p");
  const nom = document.createElement("span");
  nom.className = "auteur";
  nom.textContent = auteur + " : ";
  ligne.appendChild(nom);
  ligne.appendChild(document.createTextNode(texte));
  conteneur.appendChild(ligne);
  while (conteneur.children.length > 4) conteneur.removeChild(conteneur.firstChild);
}

// ---------- Appel ----------

function metadonneesDuParticipant(participant) {
  try { return JSON.parse(participant.metadata || "{}"); } catch { return {}; }
}

async function rejoindre() {
  const nom = $("nom").value.trim();
  const salle = $("salle").value.trim();
  const motdepasse = $("motdepasse").value;
  if (!nom || !salle) { statut("Renseignez votre nom et la salle."); return; }
  if (!motdepasse) { statut("Saisissez le mot de passe de l'appel."); return; }
  if (!$("consentement").checked) {
    statut("Vous devez accepter le traitement de votre voix pour rejoindre l'appel.");
    return;
  }
  maLangue = $("langue").value;
  maLangueBcp = trouverLangue(maLangue).bcp47;
  monIdentite = nom;

  statut("Connexion...");
  const reponse = await fetch(
    `${window.CONFIG.TOKEN_URL}?identite=${encodeURIComponent(nom)}&salle=${encodeURIComponent(salle)}` +
    `&langue=${encodeURIComponent(maLangue)}&motdepasse=${encodeURIComponent(motdepasse)}`
  );
  if (reponse.status === 401) { statut("Mot de passe incorrect."); return; }
  if (!reponse.ok) { statut("Erreur : " + (await reponse.text())); return; }
  const { token, url } = await reponse.json();

  room = new Room();

  // Je n'entends le son original que des personnes qui parlent ma langue.
  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    if (track.kind !== "audio") return;
    if (metadonneesDuParticipant(participant).langue === maLangue) {
      $("audio").appendChild(track.attach());
    }
  });
  room.on(RoomEvent.TrackUnsubscribed, (track) => {
    track.detach().forEach((el) => el.remove());
  });
  room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
    if (topic === SUJET_TEXTE) recevoirTexte(payload, participant);
  });
  room.on(RoomEvent.Disconnected, () => {
    arreterTout();
    statut("Appel terminé.");
  });

  await room.connect(url, token);
  const micro = await createLocalAudioTrack();
  await room.localParticipant.publishTrack(micro);

  enAppel = true;
  $("rejoindre").disabled = true;
  $("quitter").disabled = false;
  $("langue").disabled = true;
  $("voix").disabled = true;
  $("motdepasse").value = "";
  statut(`Connecté à « ${salle} » en ${maLangue}. Parlez : les autres entendront votre message dans leur langue.`);
  demarrerReconnaissance();
}

function arreterTout() {
  enAppel = false;
  if (reconnaissance) { try { reconnaissance.stop(); } catch { /* déjà arrêtée */ } }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  paroleEnCours = 0;
  $("audio").innerHTML = "";
  $("sous-titres").innerHTML = "";
  $("rejoindre").disabled = false;
  $("quitter").disabled = true;
  $("langue").disabled = false;
  $("voix").disabled = false;
}

function quitter() {
  if (room) room.disconnect();
}

// ---------- Démarrage ----------

remplirLangues();
if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = remplirVoix;
}
$("langue").addEventListener("change", remplirVoix);
$("rejoindre").addEventListener("click", rejoindre);
$("quitter").addEventListener("click", quitter);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
