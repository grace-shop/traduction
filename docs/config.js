// Adresse du service qui délivre les jetons (voir jetons/ et le README).
// À remplacer par l'adresse de votre déploiement Cloudflare Worker.
window.CONFIG = {
  TOKEN_URL: "https://appel-traduit-jetons.seigneurtakougnadi70.workers.dev/token",
  // Service de secours facultatif, compatible LibreTranslate (adresse complète /translate).
  // Laisser vide pour ne pas l'utiliser. Il sert si MyMemory est saturé ou indisponible.
  TRADUCTION_SECOURS: "",
  // Mot de passe commun de tous les appels. Il est envoyé automatiquement : personne ne le saisit.
  MOT_DE_PASSE: "appel2026",
  // Où récupérer la dernière APK (toujours la version la plus récente).
  APK_URL: "https://github.com/grace-shop/traduction/releases/download/apk-latest/appel-traduit.apk",
};
