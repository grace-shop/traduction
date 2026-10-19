// Service de jetons (version à jour : CORS et requête de vérification OPTIONS).
// Délivre un jeton LiveKit signé, après vérification du mot de passe d'appel.
// Déployé sur Cloudflare Workers (gratuit). Aucun audio ni texte ne passe par ce code.

const enc = new TextEncoder();

function base64url(octets) {
  let texte = "";
  for (const b of octets) texte += String.fromCharCode(b);
  return btoa(texte).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlTexte(texte) {
  return base64url(enc.encode(texte));
}

async function signer(secret, message) {
  const cle = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cle, enc.encode(message));
  return base64url(new Uint8Array(signature));
}

// Jeton d'accès LiveKit (JWT HS256) : permet de rejoindre une salle, avec la langue en métadonnées.
export async function creerJeton({ apiKey, apiSecret, identite, salle, metadonnees, maintenant }) {
  const entete = base64urlTexte(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const charge = base64urlTexte(JSON.stringify({
    iss: apiKey,
    sub: identite,
    name: identite,
    nbf: maintenant - 10,
    exp: maintenant + 3600,
    metadata: JSON.stringify(metadonnees),
    video: { roomJoin: true, room: salle },
  }));
  const message = `${entete}.${charge}`;
  return `${message}.${await signer(apiSecret, message)}`;
}

// Comparaison en temps constant, pour ne pas révéler le mot de passe par le temps de réponse.
function egalite(a, b) {
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// ORIGINE_AUTORISEE : liste séparée par des virgules, par exemple
// https://grace-shop.github.io,https://localhost,capacitor://localhost
// (https://localhost est l'origine de l'application Android, capacitor://localhost celle d'iOS).
function origineAutorisee(origineDemandee, env) {
  const autorisees = (env.ORIGINE_AUTORISEE || "").split(",").map((o) => o.trim()).filter(Boolean);
  if (autorisees.includes(origineDemandee)) return origineDemandee;
  return autorisees[0] || "null";
}

function reponse(corps, statut, origine) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origine,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Freinage des tentatives : après 8 mots de passe faux depuis une même adresse, refus pendant 15 minutes.
// Le cache de Cloudflare est local à chaque datacenter : c'est un frein, pas une garantie.
// La vraie protection est la règle de limitation de débit à configurer dans Cloudflare (voir README).
const ECHECS_MAX = 8;
const DUREE_BLOCAGE_S = 900;

async function echecsDepuis(ip) {
  if (typeof caches === "undefined" || !caches.default) return 0;
  const reponseCache = await caches.default.match(new Request("https://limite.interne/" + encodeURIComponent(ip)));
  return reponseCache ? Number(await reponseCache.text()) : 0;
}

async function enregistrerEchec(ip, compte) {
  if (typeof caches === "undefined" || !caches.default) return;
  await caches.default.put(
    new Request("https://limite.interne/" + encodeURIComponent(ip)),
    new Response(String(compte), { headers: { "Cache-Control": `max-age=${DUREE_BLOCAGE_S}` } })
  );
}

export default {
  async fetch(request, env, ctx, maintenant = Math.floor(Date.now() / 1000)) {
    const origine = origineAutorisee(request.headers.get("Origin") || "", env);
    if (request.method === "OPTIONS") return reponse({}, 204, origine);

    const url = new URL(request.url);
    if (url.pathname !== "/token" || request.method !== "POST") {
      return reponse({ erreur: "Introuvable" }, 404, origine);
    }

    if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET || !env.MOT_DE_PASSE_APPEL) {
      return reponse({ erreur: "Configuration manquante" }, 500, origine);
    }

    let corps;
    try { corps = await request.json(); } catch { return reponse({ erreur: "Requête invalide" }, 400, origine); }
    const identite = String(corps.identite || "").trim();
    const salle = String(corps.salle || "").trim();
    const langue = String(corps.langue || "");
    const motdepasse = String(corps.motdepasse || "");

    const ip = request.headers.get("CF-Connecting-IP") || "inconnue";
    if ((await echecsDepuis(ip)) >= ECHECS_MAX) {
      return reponse({ erreur: "Trop de tentatives. Réessayez dans quelques minutes." }, 429, origine);
    }

    if (!egalite(env.MOT_DE_PASSE_APPEL, motdepasse)) {
      await enregistrerEchec(ip, (await echecsDepuis(ip)) + 1);
      return reponse({ erreur: "Mot de passe incorrect" }, 401, origine);
    }
    if (!identite || identite.length > 64 || !salle || salle.length > 64) {
      return reponse({ erreur: "Nom ou salle invalide" }, 400, origine);
    }
    if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(langue)) {
      return reponse({ erreur: "Langue invalide" }, 400, origine);
    }

    const token = await creerJeton({
      apiKey: env.LIVEKIT_API_KEY,
      apiSecret: env.LIVEKIT_API_SECRET,
      identite,
      salle,
      metadonnees: { langue },
      maintenant,
    });
    return reponse({ token, url: env.LIVEKIT_URL }, 200, origine);
  },
};
