// Test du service de jetons. Lancer avec : node tests/test_worker.mjs
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import worker from "../jetons/worker.mjs";

const env = {
  LIVEKIT_URL: "wss://projet.livekit.cloud",
  LIVEKIT_API_KEY: "APIcle123",
  LIVEKIT_API_SECRET: "secret-de-test-tres-long-0123456789",
  MOT_DE_PASSE_APPEL: "ignore-desormais",
  ORIGINE_AUTORISEE: "https://exemple.github.io,https://localhost,capacitor://localhost",
};
const maintenant = 1800000000;

// Requête POST au format de l'application.
function appel(corps, { origine = "https://exemple.github.io", ip = "10.0.0.1", env: e = env } = {}) {
  const requete = new Request("https://jetons.test/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origine, "CF-Connecting-IP": ip },
    body: JSON.stringify(corps),
  });
  return worker.fetch(requete, e, {}, maintenant);
}

function decoder(jeton) {
  const [entete, charge, signature] = jeton.split(".");
  const b64 = (s) => Buffer.from(s, "base64url");
  return {
    entete: JSON.parse(b64(entete).toString()),
    charge: JSON.parse(b64(charge).toString()),
    signatureValide: createHmac("sha256", env.LIVEKIT_API_SECRET)
      .update(`${entete}.${charge}`).digest("base64url") === signature,
  };
}

const bon = { identite: "Ami", salle: "reunion", langue: "fr", motdepasse: "appel2026" };
let groupes = 0;

// 1. Un jeton valide est délivré, signé, avec les bons droits.
{
  const r = await appel(bon);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), "https://exemple.github.io");
  const { token, url } = await r.json();
  assert.equal(url, env.LIVEKIT_URL);
  const d = decoder(token);
  assert.equal(d.entete.alg, "HS256");
  assert.equal(d.signatureValide, true);
  assert.equal(d.charge.iss, "APIcle123");
  assert.equal(d.charge.sub, "Ami");
  assert.deepEqual(d.charge.video, { roomJoin: true, room: "reunion" });
  assert.deepEqual(JSON.parse(d.charge.metadata), { langue: "fr" });
  assert.equal(d.charge.exp, maintenant + 3600);
  groupes++;
}

// 2. Origines : web, Android et iOS acceptés ; une origine inconnue n'est jamais autorisée.
{
  assert.equal((await appel(bon, { origine: "https://localhost" })).headers.get("Access-Control-Allow-Origin"), "https://localhost");
  assert.equal((await appel(bon, { origine: "capacitor://localhost" })).headers.get("Access-Control-Allow-Origin"), "capacitor://localhost");
  assert.notEqual((await appel(bon, { origine: "https://malveillant.example" })).headers.get("Access-Control-Allow-Origin"), "https://malveillant.example");
  groupes++;
}

// 3. Mauvais mot de passe, puis absence : refus.
{
  assert.equal((await appel({ ...bon, motdepasse: "faux" }, { ip: "10.0.0.2" })).status, 401);
  assert.equal((await appel({ identite: "Ami", salle: "reunion", langue: "fr" }, { ip: "10.0.0.2" })).status, 401);
  groupes++;
}

// 4. Données invalides : refus.
{
  assert.equal((await appel({ ...bon, langue: "../x" })).status, 400);
  assert.equal((await appel({ ...bon, identite: "a".repeat(65) })).status, 400);
  groupes++;
}

// 5. Le mot de passe n'est plus accepté dans l'adresse (journaux du serveur).
{
  const r = await worker.fetch(new Request("https://jetons.test/token?identite=Ami&salle=reunion&langue=fr&motdepasse=appel2026", { method: "GET" }), env, {}, maintenant);
  assert.equal(r.status, 404);
  groupes++;
}

// 6. Configuration incomplète : erreur explicite, aucun jeton.
{
  assert.equal((await appel(bon, { env: { ...env, LIVEKIT_API_SECRET: "" } })).status, 500);
  groupes++;
}

// 7. Corps qui n'est pas du JSON : refus propre.
{
  const r = await worker.fetch(new Request("https://jetons.test/token", { method: "POST", headers: { Origin: "https://exemple.github.io" }, body: "pas du json" }), env, {}, maintenant);
  assert.equal(r.status, 400);
  groupes++;
}

// 8. Requête de vérification du navigateur (OPTIONS) : réponse 204 sans corps, avec l'autorisation.
{
  const r = await worker.fetch(new Request("https://jetons.test/token", { method: "OPTIONS", headers: { Origin: "https://exemple.github.io" } }), env, {}, maintenant);
  assert.equal(r.status, 204);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), "https://exemple.github.io");
  assert.equal(await r.text(), "");
  groupes++;
}

// 9. Valeurs avec espaces parasites (copiées-collées) : le service les ignore.
{
  const avecEspaces = { ...env, LIVEKIT_API_SECRET: "  " + env.LIVEKIT_API_SECRET + "\n", LIVEKIT_API_KEY: " " + env.LIVEKIT_API_KEY + " " };
  const r = await appel({ identite: "awa", salle: "salle", langue: "fr", motdepasse: "appel2026" }, { env: avecEspaces });
  assert.equal(r.status, 200);
  const d = decoder((await r.json()).token);
  assert.equal(d.signatureValide, true);
  assert.equal(d.entete.alg, "HS256");
  groupes++;
}

// 10. Valeurs non énumérables (cas réel de Cloudflare) : elles sont quand même lues.
{
  const cacheEnv = {};
  for (const [cle, valeur] of Object.entries(env)) Object.defineProperty(cacheEnv, cle, { value: valeur, enumerable: false });
  const r = await appel({ identite: "awa", salle: "salle", langue: "fr", motdepasse: "appel2026" }, { env: cacheEnv });
  assert.equal(r.status, 200);
  groupes++;
}

// 11. Traduction côté serveur : Google par défaut, DeepL si la clé est présente.
{
  const reel = globalThis.fetch;
  const appels = [];
  globalThis.fetch = async (adresse, options) => {
    appels.push({ adresse: String(adresse), options });
    if (String(adresse).includes("translate.googleapis.com")) {
      return new Response(JSON.stringify([[["Bonjour", "Hello", null, null, 1]], null, "en"]), { status: 200 });
    }
    return new Response(JSON.stringify({ translations: [{ text: "Hello DeepL" }] }), { status: 200 });
  };
  try {
    const demande = (corps, e = env) => worker.fetch(new Request("https://jetons.test/traduire", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://exemple.github.io" },
      body: JSON.stringify(corps),
    }), e, {}, maintenant);
    let r = await demande({ texte: "Hello", de: "en", vers: "fr" });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).traduit, "Bonjour");
    assert.ok(appels[0].adresse.includes("sl=en") && appels[0].adresse.includes("tl=fr"));
    r = await demande({ texte: "Hello", de: "en", vers: "fr" }, { ...env, DEEPL_CLE: "cle-test" });
    assert.equal((await r.json()).traduit, "Hello DeepL");
    assert.equal(appels[1].options.headers.Authorization, "DeepL-Auth-Key cle-test");
    r = await demande({ texte: "Bonjour", de: "fr", vers: "fr" });
    assert.equal((await r.json()).traduit, "Bonjour");
    r = await demande({ texte: "x", de: "../etc", vers: "fr" });
    assert.equal(r.status, 400);
    r = await demande({ texte: "", de: "en", vers: "fr" });
    assert.equal(r.status, 400);
  } finally {
    globalThis.fetch = reel;
  }
  groupes++;
}

// 12. Réunions planifiées : créer, lister, supprimer, avec le mot de passe commun.
{
  const stock = new Map();
  const kv = {
    async list({ prefix }) { return { keys: [...stock.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) }; },
    async get(cle, type) { const v = stock.get(cle); return v === undefined ? null : JSON.parse(v); },
    async put(cle, valeur) { stock.set(cle, valeur); },
    async delete(cle) { stock.delete(cle); },
  };
  const envR = { ...env, REUNIONS: kv };
  const appelR = (chemin, corps, e = envR) => worker.fetch(new Request("https://jetons.test" + chemin, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://exemple.github.io", "CF-Connecting-IP": "10.0.0.9" },
    body: JSON.stringify(corps),
  }), e, {}, maintenant);

  const debut = (maintenant + 3600) * 1000;
  let r = await appelR("/reunions/creer", { motdepasse: "appel2026", titre: "Point équipe", salle: "point-equipe", debut, duree: 60 });
  assert.equal(r.status, 201);
  const id = (await r.json()).reunion.id;
  assert.equal(stock.size, 1);

  r = await appelR("/reunions/liste", { motdepasse: "appel2026" });
  const liste = (await r.json()).reunions;
  assert.equal(liste.length, 1);
  assert.equal(liste[0].titre, "Point équipe");

  r = await appelR("/reunions/liste", { motdepasse: "mauvais" });
  assert.equal(r.status, 401);
  r = await appelR("/reunions/creer", { motdepasse: "appel2026", titre: "x", salle: "../etc", debut });
  assert.equal(r.status, 400);

  r = await appelR("/reunions/supprimer", { motdepasse: "appel2026", id });
  assert.equal((await r.json()).supprimee, true);
  assert.equal(stock.size, 0);

  const sansStockage = await appelR("/reunions/liste", { motdepasse: "appel2026" }, env);
  assert.equal(sansStockage.status, 500);
  groupes++;
}

console.log(`OK : ${groupes} groupes de tests du service de jetons passent`);
