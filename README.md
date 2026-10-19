# Traduction d'appel

Application d'appel où chaque participant parle dans sa langue. Les autres entendent la
traduction dans leur langue, avec la voix de synthèse qu'ils ont choisie, et peuvent lire
des sous-titres.

Le système est composé de trois parties :

- `serveur.py` : serveur web (FastAPI). Il sert la page d'appel, délivre les jetons LiveKit
  après vérification du mot de passe, et liste les voix disponibles.
- `agent.py` : agent LiveKit. Il écoute chaque participant, transcrit (Whisper), traduit
  (MyMemory), synthétise (edge-tts), publie les traductions audio et les sous-titres.
- `web/index.html` : page d'appel, utilisable sur ordinateur et sur téléphone via le navigateur.

## Installation

    python -m venv .venv
    source .venv/bin/activate        # Windows : .venv\Scripts\activate
    pip install -r requirements.txt
    cp .env.example .env

Renseignez `.env` : identifiants LiveKit et `MOT_DE_PASSE_APPEL` (obligatoire, le serveur
refuse de délivrer des jetons sans lui).

## Lancer l'application en local

Dans deux terminaux :

    python agent.py dev
    uvicorn serveur:app --host 127.0.0.1 --port 8000

Puis ouvrez `http://localhost:8000` dans deux onglets, choisissez une langue et une voix
différentes dans chacun, saisissez le même nom de salle et le mot de passe.

## Mise en production (HTTPS)

Le micro du navigateur n'est accessible qu'en HTTPS (ou sur `localhost`). Le dossier
`deploy/` contient une configuration Caddy qui obtient automatiquement un certificat.

Prérequis : un nom de domaine pointant vers votre serveur, et les ports 80 et 443 ouverts.

    DOMAINE=appel.votre-domaine.fr caddy run --config deploy/Caddyfile
    uvicorn serveur:app --host 127.0.0.1 --port 8000
    python agent.py start

Les trois commandes doivent tourner en continu (par exemple avec systemd ou un gestionnaire
de processus).

## Utilisation en ligne de commande

    python main.py chemin/vers/audio.wav

Traite un fichier audio unique et écrit la traduction dans `sortie.mp3`.

## Tests

    python -m unittest discover -s tests -v

Les tests couvrent la validation des langues et des voix, la vérification du mot de passe,
les noms de pistes et le format des sous-titres. Ils n'ont pas besoin de LiveKit ni de Whisper.

## Vérification manuelle avant un appel réel

Les tests ne couvrent pas l'audio. À faire avant de s'en servir :

1. Deux personnes, deux langues différentes, dans la même salle.
2. Chacune parle : l'autre entend la traduction dans sa langue, avec la voix choisie.
3. Les sous-titres apparaissent dans la langue de chacun.
4. Mauvais mot de passe : refus. Case de consentement décochée : refus.
5. Sur téléphone : le micro demande bien l'autorisation (HTTPS).

## Confidentialité

La voix et le texte transcrit sont envoyés à des services tiers : Whisper (exécuté localement),
MyMemory (traduction) et Microsoft via edge-tts (synthèse vocale). La page demande le
consentement des participants avant de rejoindre un appel. Vérifiez que cet usage est
conforme à votre cadre légal (RGPD notamment).

## Feuille de route

- [x] Transport temps réel (LiveKit)
- [x] Choix de la voix par utilisateur
- [x] Mot de passe d'appel
- [x] Sous-titres
- [x] Consentement des participants
- [x] Configuration HTTPS (Caddy)
- [ ] Détection d'activité vocale (Silero VAD)
- [ ] Traduction de secours (DeepL ou autre) si MyMemory est indisponible
- [ ] Applications natives téléphone et ordinateur (aujourd'hui : page web)
- [ ] Reconnexion automatique après une coupure réseau
