// Remplace la route /token de serveur.py sur Cloudflare Pages.
// Les règles de validation reprennent celles de logique.py.
import { VOIX } from "./voix-data.js";

const MOTIF_LANGUE = /^[a-z]{2,3}$/;
const MOTIF_VOIX = /^[a-z]{2,3}-[A-Za-z0-9]{2,}-[A-Za-z0-9]+Neural$/;

// Variables d'environnement à définir dans le projet Pages :
//   LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET (secret), MOT_DE_PASSE_APPEL (secret)

const json = (corps, statut = 200) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

// Comparaison en temps constant, pour ne pas révéler le mot de passe par le temps de réponse.
function egal(a, b) {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

function base64url(octets) {
  let texte = "";
  for (const o of new Uint8Array(octets)) texte += String.fromCharCode(o);
  return btoa(texte).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const base64urlTexte = (texte) => base64url(new TextEncoder().encode(texte));

async function signerJeton(charge, secret) {
  const entete = base64urlTexte(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const corps = base64urlTexte(JSON.stringify(charge));
  const cle = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cle,
    new TextEncoder().encode(`${entete}.${corps}`)
  );
  return `${entete}.${corps}.${base64url(signature)}`;
}

export async function onRequestGet({ request, env }) {
  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    return json({ detail: "Configuration LiveKit manquante" }, 500);
  }
  if (!env.MOT_DE_PASSE_APPEL) {
    return json({ detail: "MOT_DE_PASSE_APPEL manquant" }, 500);
  }

  const p = new URL(request.url).searchParams;
  const nom = (p.get("identite") || "").trim();
  const salle = (p.get("salle") || "").trim();
  const langue = p.get("langue") || "fr";
  const voix = p.get("voix");
  const motdepasse = p.get("motdepasse") || "";

  if (!nom || nom.length > 64 || !salle || salle.length > 64) {
    return json({ detail: "Identité ou salle invalide" }, 400);
  }
  if (motdepasse.length > 256) return json({ detail: "Mot de passe invalide" }, 400);

  if (!egal(motdepasse, env.MOT_DE_PASSE_APPEL)) {
    return json({ detail: "Mot de passe incorrect" }, 401);
  }

  if (!MOTIF_LANGUE.test(langue) || !VOIX[langue]) {
    return json({ detail: "Langue non prise en charge" }, 400);
  }
  if (voix !== null && !(MOTIF_VOIX.test(voix) && voix.startsWith(`${langue}-`))) {
    return json({ detail: "Voix non prise en charge pour cette langue" }, 400);
  }

  // La langue et la voix voyagent dans les métadonnées : l'agent sait quoi produire pour chacun.
  const metadonnees = { langue };
  if (voix) metadonnees.voix = voix;

  // Identité unique côté LiveKit ; le nom affiché reste celui saisi.
  const identite = `${nom}-${crypto.randomUUID().slice(0, 6)}`;

  const maintenant = Math.floor(Date.now() / 1000);
  const jeton = await signerJeton(
    {
      iss: env.LIVEKIT_API_KEY,
      sub: identite,
      name: nom,
      nbf: maintenant,
      exp: maintenant + 6 * 3600,
      metadata: JSON.stringify(metadonnees),
      video: { roomJoin: true, room: salle },
    },
    env.LIVEKIT_API_SECRET
  );

  return json({ token: jeton, url: env.LIVEKIT_URL });
}
