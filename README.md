# Appel traduit

Appels où chaque participant parle dans sa langue. Les autres entendent la traduction dans
leur langue, avec la voix de lecture qu'ils ont choisie, et peuvent lire des sous-titres.

Tout tourne dans le navigateur. Il n'y a pas de serveur Python à lancer ni à entretenir. Seul
le service qui délivre les jetons d'appel tourne sur Cloudflare Workers (gratuit).

- `docs/` : le site (publié avec GitHub Pages), installable comme application
- `jetons/` : le service qui délivre les jetons LiveKit après vérification du mot de passe
- `resources/` : icône et écran de démarrage de l'application Android
- `tests/` : tests automatiques
- `archive/python/` : ancienne version serveur, conservée pour référence

## Utiliser l'application

Ouvrez le site dans Chrome ou Edge sur ordinateur ou Android, puis choisissez *Installer
l'application*. Sur iPhone, ouvrez-le dans Safari, puis *Partager > Sur l'écran d'accueil*.

Sur Android, l'APK est construit automatiquement (voir plus bas).

## Mise en place

1. Créer un compte Cloudflare (gratuit) et un projet LiveKit Cloud (gratuit).
2. Déployer le service : `cd jetons && npx wrangler deploy`
3. Enregistrer les secrets, un par un, avec `npx wrangler secret put NOM` :
   `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `MOT_DE_PASSE_APPEL`.
4. Enregistrer `ORIGINE_AUTORISEE`, séparées par des virgules, avec les adresses qui peuvent
   appeler le service : `https://grace-shop.github.io,https://localhost,capacitor://localhost`
   (le site, le test local et l'application Android).
5. Mettre l'adresse obtenue dans `docs/config.js` (`TOKEN_URL`).
6. Dans GitHub : Settings > Pages > Deploy from a branch > la branche, dossier `/docs`.
7. Recommandé : dans le tableau de bord Cloudflare, ajouter une règle de limitation de débit
   sur le chemin `/token` (par exemple 10 requêtes par minute et par adresse IP). Le service
   limite déjà les mots de passe erronés, mais cette règle est la vraie protection contre les
   attaques, car le cache du service est propre à chaque centre de données.

Le service de jetons accepte une requête `POST /token` au format JSON
(`identite`, `salle`, `langue`, `motdepasse`) et répond `{ token, url }`.

## Fonctions de l'appel

- **Langue de l'interface** : français, anglais, espagnol, portugais, allemand, arabe (droite à gauche). Choisie automatiquement d'après le navigateur, puis mémorisée sur l'appareil. Les textes sont dans `docs/i18n.js`.
- **Lien d'invitation** : « Copier le lien » ouvre l'application avec le nom de la salle déjà rempli. Le mot de passe n'est jamais dans le lien. Un QR code peut aussi être affiché (bibliothèque `qrcode-generator` chargée depuis cdnjs, version 1.4.4).
- **Réglages de lecture** : vitesse, volume de la traduction, taille des sous-titres, masquage. Mémorisés sur l'appareil seulement.
- **Réécouter** : relit la dernière traduction.
- **Télécharger** : exporte la conversation affichée dans un fichier texte, créé sur l'appareil. Rien n'est envoyé ni stocké sur un serveur.
- **Caméra** : vidéo optionnelle, visible par les autres participants. Désactivée par défaut.
- **Participant qui parle** : son nom est mis en avant dans la liste.

## Traduction de secours (facultatif)

Si MyMemory est saturé ou indisponible, l'application peut utiliser un second service compatible
LibreTranslate. Renseignez son adresse complète (qui se termine par `/translate`) dans
`docs/config.js`, dans `TRADUCTION_SECOURS`. Laissez vide pour ne rien utiliser.

## Ce que fait l'application pour éviter les traductions inutiles

- Les hésitations seules (« euh », « hum ») et les phrases vides ne sont pas envoyées.
- Une même phrase captée deux fois en quelques secondes (écho des haut-parleurs) n'est envoyée qu'une fois.
- Les traductions déjà faites sont mises en cache, pour ne pas consommer le quota inutilement.

## Vérifier le code

    node tests/test_worker.mjs     # service de jetons
    node tests/test_outils.mjs     # fonctions du navigateur

## Application Android (APK)

L'APK est construit automatiquement par GitHub Actions (gratuit) :

1. Onglet **Actions** du dépôt > **Construire l'APK Android** > **Run workflow**.
2. Une fois l'exécution terminée, téléchargez **appel-traduit-apk** dans la section *Artifacts*.
3. Sur le téléphone, ouvrez le fichier et autorisez l'installation depuis une source inconnue.

Le site de `docs/` est copié dans l'application (Capacitor). Les modules natifs de
reconnaissance vocale et de lecture sont utilisés automatiquement. L'icône et l'écran de
démarrage viennent de `resources/`.

## Vérification manuelle

Les tests ne couvrent pas l'audio. À faire après chaque déploiement :

1. Deux personnes, deux langues différentes, dans la même salle (Chrome sur ordinateur).
2. Chacune parle : l'autre entend la traduction dans sa langue, avec la voix choisie.
3. Les sous-titres apparaissent dans la langue de chacun.
4. Mauvais mot de passe : refus. Case de consentement décochée : refus.
5. Sur Android : le micro demande bien l'autorisation, et l'application reste utilisable.

## Limites connues

- La reconnaissance vocale fonctionne sur Chrome et Edge. Safari est partiel, Firefox ne la gère pas.
- La voix de lecture est celle du système de l'auditeur. Elle varie selon l'appareil.
- Chrome envoie l'audio de la reconnaissance aux serveurs de Google. Le consentement le mentionne.
- Le son original n'est entendu que des personnes qui parlent la même langue.
- Une application iOS native n'est pas prévue, car elle exige un compte Apple Developer (99 $ par an).

## Confidentialité

La voix est reconnue par l'appareil ou le navigateur. Le texte est envoyé à MyMemory pour la
traduction, et à LiveKit pour la transmission de l'appel. Rien n'est enregistré. La politique
complète est dans `docs/confidentialite.html`. Ses champs entre crochets (responsable, adresse,
durée de conservation, transferts hors UE) doivent être complétés et relus avant toute utilisation
avec de vrais participants.

## Feuille de route

- [x] Transport temps réel (LiveKit)
- [x] Choix de la voix par utilisateur
- [x] Mot de passe d'appel et consentement
- [x] Sous-titres
- [x] Version sans Python (navigateur)
- [x] Application Android (APK)
- [x] Reconnexion et changement de langue en cours d'appel
- [x] Traduction de secours si MyMemory est indisponible (facultatif)
- [x] Filtre des bruits, hésitations et doublons
