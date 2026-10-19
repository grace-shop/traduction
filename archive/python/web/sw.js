// Service worker minimal : il rend l'application installable.
// Aucune mise en cache : l'appel exige toujours une connexion réseau.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
