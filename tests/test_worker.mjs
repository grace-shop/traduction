// Test du service de jetons. Lancer avec : node tests/test_worker.mjs
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import worker from "../jetons/worker.mjs";

const env = {
  LIVEKIT_URL: "wss://projet.livekit.cloud",
  LIVEKIT_API_KEY: "APIcle123",
  LIVEKIT_API_SECRET: "secret-de-test-tres-long-0123456789",
  MOT_DE_PASSE_APPEL: "mot-de-passe-test",
  ORIGINE_AUTORISEE: "https://exemple.github.io,https://localhost,capacitor://localhost",
};
const maintenant = 1800000000;

function appel(query, origine = "https://exemple.github.io") {
  return worker.fetch(new Request("https://jetons.test/token?" + query, { headers: { Origin: origine } }), env, {}, maintenant);
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

const bon = "identite=Ami&salle=reunion&langue=fr&motdepasse=mot-de-passe-test";

// 1. Un jeton valide est délivré, signé avec le secret, et contient les bons droits.
{
  const r = await appel(bon);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), "https://exemple.github.io");
  const { token, url } = await r.json();
  assert.equal(url, env.LIVEKIT_URL);
  const d = decoder(token);
  assert.equal(d.entete.alg, "HS256");
  assert.equal(d.signatureValide, true, "la signature doit être vérifiable avec le secret");
  assert.equal(d.charge.iss, "APIcle123");
  assert.equal(d.charge.sub, "Ami");
  assert.deepEqual(d.charge.video, { roomJoin: true, room: "reunion" });
  assert.deepEqual(JSON.parse(d.charge.metadata), { langue: "fr" });
  assert.equal(d.charge.exp, maintenant + 3600);
}

// 1bis. L'application Android (origine https://localhost) est acceptée, une origine inconnue ne l'est pas.
{
  const ok = await appel(bon, "https://localhost");
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("Access-Control-Allow-Origin"), "https://localhost");
  const inconnue = await appel(bon, "https://malveillant.example");
  assert.notEqual(inconnue.headers.get("Access-Control-Allow-Origin"), "https://malveillant.example");
}

// 2. Mauvais mot de passe : refus.
{
  const r = await appel(bon.replace("mot-de-passe-test", "faux"));
  assert.equal(r.status, 401);
}

// 3. Pas de mot de passe : refus.
{
  const r = await appel("identite=Ami&salle=reunion&langue=fr");
  assert.equal(r.status, 401);
}

// 4. Langue invalide ou données trop longues : refus.
{
  assert.equal((await appel(bon.replace("langue=fr", "langue=../x"))).status, 400);
  assert.equal((await appel(bon.replace("identite=Ami", "identite=" + "a".repeat(65)))).status, 400);
}

// 5. Mauvaise route : 404.
{
  const r = await worker.fetch(new Request("https://jetons.test/autre"), env, {}, maintenant);
  assert.equal(r.status, 404);
}

// 6. Configuration incomplète : erreur explicite, aucun jeton.
{
  const r = await worker.fetch(new Request("https://jetons.test/token?" + bon), { ...env, LIVEKIT_API_SECRET: "" }, {}, maintenant);
  assert.equal(r.status, 500);
}

console.log("OK : groupes de tests du service de jetons passent");
