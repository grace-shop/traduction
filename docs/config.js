// Adresse du service qui délivre les jetons (voir jetons/ et le README).
// À remplacer par l'adresse de votre déploiement Cloudflare Worker.
window.CONFIG = {
  TOKEN_URL: "https://appel-traduit-jetons.VOTRE-COMPTE.workers.dev/token",
  // Service de secours facultatif, compatible LibreTranslate (adresse complète /translate).
  // Laisser vide pour ne pas l'utiliser. Il sert si MyMemory est saturé ou indisponible.
  TRADUCTION_SECOURS: "",
};
