# Traduction d'appel

Application d'appel où chaque participant parle dans sa langue. Les autres entendent la
traduction dans leur langue, avec la voix de synthèse qu'ils ont choisie, et peuvent lire
des sous-titres.

Le système est composé de trois parties :

- `serveur.py` : serveur web (FastAPI). Il sert la page d'appel, délivre les jetons LiveKit
  après vérification du mot de passe, et liste les voix disponibles.
- `agent.py` : agent LiveKit. Il écoute chaque participant, transcrit (Whisper), traduit
  (MyMemory), synthétise (edge-tts), publie les traductions audio et les sous-titres.
- `web/index.html` : page d'appel, installable comme application sur téléphone et ordinateur.

## Utiliser l'application en ligne

L'application est hébergée sur un serveur. Chacun l'ouvre avec un lien (HTTPS), sur téléphone
ou ordinateur, et peut l'installer comme application (« Ajouter à l'écran d'accueil »).
Rien à installer ni à lancer de son côté.

## Déploiement gratuit sur Oracle Cloud

Ce qui est nécessaire, et gratuit tant que l'on reste dans les limites :

1. **Serveur Oracle Cloud « Always Free »** : une instance Ubuntu, forme Ampere A1 (ARM),
   2 cœurs et 12 Go de RAM. Ouvrez les ports 22 (SSH), 80 et 443 dans la liste de sécurité du réseau.
2. **Nom de domaine gratuit** sur DuckDNS (https://www.duckdns.org) : créez un sous-domaine
   qui pointe vers l'adresse IP publique du serveur.
3. **Projet LiveKit Cloud** (https://cloud.livekit.io, plan gratuit) : notez `LIVEKIT_URL`,
   `LIVEKIT_API_KEY` et `LIVEKIT_API_SECRET`.

Puis, connecté en SSH au serveur :

    wget https://raw.githubusercontent.com/grace-shop/traduction/<branche>/deploy/installer.sh
    bash installer.sh <branche> <votre-domaine.duckdns.org>

Le premier passage crée le fichier `~/traduction/.env` et s'arrête. Renseignez-le
(`LIVEKIT_*`, `MOT_DE_PASSE_APPEL`), puis relancez la même commande.

Le script installe Docker, ouvre les ports 80 et 443, construit l'application et lance deux
conteneurs : l'application et Caddy, qui obtient le certificat HTTPS automatiquement.
Les conteneurs redémarrent seuls après une coupure.

Commandes utiles sur le serveur :

    cd ~/traduction
    sudo docker compose -f deploy/docker-compose.yml logs -f        # journaux
    sudo docker compose -f deploy/docker-compose.yml restart appel  # redémarrer l'application

Points à savoir :

- Oracle demande une carte bancaire pour vérifier l'identité, sans facturer tant que l'on reste
  dans les limites gratuites. Vérifiez les conditions avant de vous inscrire.
- Le premier démarrage télécharge le modèle Whisper, il peut prendre plusieurs minutes.
- Sur ce serveur, Whisper `small` peut être lent : si le délai de traduction est trop long,
  passez à `MODELE_WHISPER=base` dans `.env`.
- Les instances ARM sont parfois indisponibles dans certaines régions : essayez une autre
  région ou réessayez plus tard.

## Vérifier la logique sans serveur

    python -m unittest discover -s tests -v

Les tests couvrent la validation des langues et des voix, la vérification du mot de passe,
les noms de pistes et le format des sous-titres. Ils n'ont pas besoin de LiveKit ni de Whisper.

## Vérification manuelle après déploiement

Les tests ne couvrent pas l'audio. À faire après chaque déploiement :

1. Deux personnes, deux langues différentes, dans la même salle.
2. Chacune parle : l'autre entend la traduction dans sa langue, avec la voix choisie.
3. Les sous-titres apparaissent dans la langue de chacun.
4. Mauvais mot de passe : refus. Case de consentement décochée : refus.
5. Sur téléphone : le micro demande bien l'autorisation (HTTPS).

## Confidentialité

La voix et le texte transcrit sont envoyés à des services tiers : Whisper (exécuté sur le serveur),
MyMemory (traduction) et Microsoft via edge-tts (synthèse vocale). La page demande le
consentement des participants avant de rejoindre un appel. Vérifiez que cet usage est
conforme à votre cadre légal (RGPD notamment).

## Feuille de route

- [x] Transport temps réel (LiveKit)
- [x] Choix de la voix par utilisateur
- [x] Mot de passe d'appel
- [x] Sous-titres
- [x] Consentement des participants
- [x] HTTPS (Caddy)
- [x] Installation sur serveur (Oracle Cloud)
- [ ] Détection d'activité vocale (Silero VAD)
- [ ] Traduction de secours (DeepL ou autre) si MyMemory est indisponible
- [ ] Applications natives téléphone et ordinateur (aujourd'hui : application web installable)
- [ ] Reconnexion automatique après une coupure réseau

## Version navigateur (sans Python, sans serveur à entretenir)

Cette version tourne entièrement dans le navigateur. Seul le service de jetons, écrit en
JavaScript, tourne sur Cloudflare Workers (gratuit).

- `docs/` : le site (à publier avec GitHub Pages)
- `jetons/` : le service qui délivre les jetons LiveKit, après vérification du mot de passe
- `tests/test_worker.mjs` : tests du service de jetons, à lancer avec `node tests/test_worker.mjs`

Mise en place :

1. Créer un compte Cloudflare (gratuit) et un projet LiveKit Cloud (gratuit).
2. Déployer le service : `cd jetons && npx wrangler deploy`
3. Enregistrer les secrets, un par un, avec `npx wrangler secret put NOM` :
   `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `MOT_DE_PASSE_APPEL`,
   et `ORIGINE_AUTORISEE` (l'adresse du site GitHub Pages, par exemple `https://votre-nom.github.io`).
4. Mettre l'adresse obtenue dans `docs/config.js` (`TOKEN_URL`).
5. Dans GitHub : Settings > Pages > Deploy from a branch > la branche, dossier `/docs`.

Limites connues :

- La reconnaissance vocale fonctionne sur Chrome et Edge. Safari est partiel, Firefox ne la gère pas.
- La voix de lecture est celle du système de l'auditeur. Elle varie selon l'appareil.
- Chrome envoie l'audio de la reconnaissance aux serveurs de Google : à mentionner dans le consentement.
- Le son original n'est entendu que des personnes qui parlent la même langue.

## Application Android (APK)

L'APK est construit automatiquement par GitHub Actions (gratuit) :

1. Onglet **Actions** du dépôt > **Construire l'APK Android** > **Run workflow**.
2. Une fois l'exécution terminée, télécharge **appel-traduit-apk** dans la section *Artifacts*.
3. Sur le téléphone, ouvre le fichier et autorise l'installation depuis une source inconnue.

Le site de `docs/` est copié dans l'application (Capacitor). Les modules natifs de reconnaissance
vocale et de lecture sont utilisés automatiquement dans l'application.

## Installer sur téléphone ou ordinateur sans APK

- **Android ou ordinateur** : ouvrez le site dans Chrome ou Edge, puis choisissez *Installer l'application*.
- **iPhone** : ouvrez le site dans Safari, puis *Partager > Sur l'écran d'accueil*. La reconnaissance
  vocale sur iPhone n'a pas été vérifiée.
- **Application iOS native** : non prévue, car elle exige un compte Apple Developer (99 $ par an).

## Interface

- Fond 3D léger (WebGL), désactivé si l'utilisateur demande moins d'animations ou si le téléphone ne le supporte pas.
- Le cercle central réagit à votre voix : vous voyez que le micro fonctionne.
- Les sous-titres affichent votre texte et celui des autres, dans votre langue.
- Résolution adaptée à l'écran (jusqu'à 2x) : rendu net sur les écrans haute densité, sans textures lourdes.
