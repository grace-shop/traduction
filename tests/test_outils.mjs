// Test des fonctions pures du navigateur. Lancer avec : node tests/test_outils.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const contexte = { window: {} };
vm.createContext(contexte);
vm.runInContext(readFileSync(new URL("../docs/outils.js", import.meta.url), "utf8"), contexte);
vm.runInContext(readFileSync(new URL("../docs/langues.js", import.meta.url), "utf8"), contexte);
const O = contexte.window.Outils;
// Les objets créés dans le contexte isolé ont un autre prototype : on compare en JSON.
const json = (v) => JSON.parse(JSON.stringify(v));
const L = contexte.window.LANGUES;
let groupes = 0;

// Découpage : jamais plus long que la taille, pas de mot coupé en deux si possible, rien de perdu.
{
  assert.deepEqual(json(O.decouper("court", 450)), ["court"]);
  const longs = ("mot ".repeat(300)).trim();
  const morceaux = O.decouper(longs, 100);
  assert.ok(morceaux.every((m) => m.length <= 100));
  assert.equal(morceaux.join(" "), longs);
  assert.deepEqual(json(O.decouper("   ", 10)), []);
  groupes++;
}

// Codes MyMemory : le chinois a son code régional, les autres langues passent telles quelles.
{
  assert.equal(O.codeMyMemory("zh"), "zh-CN");
  assert.equal(O.codeMyMemory("fr"), "fr");
  assert.equal(O.paireMyMemory("fr", "zh"), "fr|zh-CN");
  groupes++;
}

// Cache : une traduction déjà faite est retrouvée, et le cache reste borné.
{
  O.memoriser(O.cleCache("Bonjour", "fr", "en"), "Hello");
  assert.equal(O.lireCache(O.cleCache("Bonjour", "fr", "en")), "Hello");
  assert.equal(O.lireCache(O.cleCache("Bonjour", "fr", "de")), undefined);
  for (let i = 0; i < O.TAILLE_CACHE + 5; i++) O.memoriser("k" + i, "v" + i);
  assert.equal(O.lireCache("k0"), undefined);
  assert.equal(O.lireCache("k" + (O.TAILLE_CACHE + 4)), "v" + (O.TAILLE_CACHE + 4));
  groupes++;
}

// Messages reçus : seuls les messages bien formés sont acceptés.
{
  assert.deepEqual(json(O.lireMessage('{"langue":"fr","texte":"salut"}')), { langue: "fr", texte: "salut" });
  assert.equal(O.lireMessage("pas du json"), null);
  assert.equal(O.lireMessage('{"langue":"fr"}'), null);
  assert.equal(O.lireMessage('{"langue":3,"texte":"x"}'), null);
  groupes++;
}

// Filtre : bruits et hésitations ignorés, phrases utiles conservées.
{
  assert.equal(O.texteUtile(""), false);
  assert.equal(O.texteUtile("a"), false);
  assert.equal(O.texteUtile("..."), false);
  assert.equal(O.texteUtile("euh"), false);
  assert.equal(O.texteUtile("euh hum"), false);
  assert.equal(O.texteUtile("euh bonjour"), true);
  assert.equal(O.texteUtile("Bonjour à tous"), true);
  groupes++;
}

// Doublons : même phrase dans la fenêtre de quelques secondes seulement.
{
  const precedent = { texte: "Bonjour", heure: 1000 };
  assert.equal(O.estDoublon("Bonjour", precedent, 2000), true);
  assert.equal(O.estDoublon("Bonjour", precedent, 9000), false);
  assert.equal(O.estDoublon("Au revoir", precedent, 2000), false);
  assert.equal(O.estDoublon("Bonjour", null, 2000), false);
  groupes++;
}

// Secours : requête POST au format LibreTranslate.
{
  const r = O.requeteSecours("https://exemple.test/translate", "Bonjour", "fr", "en");
  assert.equal(r.url, "https://exemple.test/translate");
  assert.equal(r.options.method, "POST");
  assert.deepEqual(JSON.parse(r.options.body), { q: "Bonjour", source: "fr", target: "en", format: "text" });
  groupes++;
}

// Lien d'invitation : nom de salle prérenseigné, jamais de mot de passe.
{
  assert.equal(O.lienInvitation("https://exemple.test/app/index.html?x=1#haut", " reunion famille "),
    "https://exemple.test/app/index.html?salle=reunion+famille");
  groupes++;
}

// Export de l'historique : une ligne par message.
{
  const texte = O.historiqueTexte([
    { heure: "10:01", auteur: "Awa", texte: "Bonjour" },
    { heure: "10:02", auteur: "Kenji", texte: "Hello" },
  ]);
  assert.equal(texte, "[10:01] Awa : Bonjour\n[10:02] Kenji : Hello");
  assert.equal(O.historiqueTexte([]), "");
  groupes++;
}

// Réglages : valeurs bornées, défauts pour tout ce qui manque ou est invalide.
{
  assert.deepEqual(json(O.normaliserReglages(null)), json(O.DEFAUTS_REGLAGES));
  const r = O.normaliserReglages({ vitesse: 9, volume: -2, taille: "énorme", masquer: "oui", interface: "EN" });
  assert.equal(r.vitesse, 1.5);
  assert.equal(r.volume, 0);
  assert.equal(r.taille, "normale");
  assert.equal(r.masquer, false);
  assert.equal(r.interface, "fr");
  assert.equal(O.normaliserReglages({ vitesse: "0.8", taille: "grande", masquer: true, interface: "de" }).vitesse, 0.8);
  groupes++;
}

// Langues : codes uniques, codes BCP 47 cohérents avec le code court.
{
  const codes = L.map((l) => l.code);
  assert.equal(new Set(codes).size, codes.length, "codes en double");
  for (const l of L) {
    const prefixe = l.code === "no" ? "nb" : l.code; // le norvégien est « nb-NO » pour le navigateur
    assert.ok(l.bcp47.toLowerCase().startsWith(prefixe === "zh" ? "zh" : prefixe), `${l.code} / ${l.bcp47}`);
    assert.ok(l.nom.length > 0);
  }
  groupes++;
}

console.log(`OK : ${groupes} groupes de tests des fonctions du navigateur passent`);
