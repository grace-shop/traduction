# Traduction d'appel

Application d'appel qui transcrit, traduit et restitue la parole de l'interlocuteur
avec la voix choisie.

## Installation

    python -m venv .venv
    source .venv/bin/activate        # Windows : .venv\Scripts\activate
    pip install -r requirements.txt
    cp .env.example .env

## Utilisation

    python main.py chemin/vers/audio.wav

## Feuille de route

- [ ] Transport temps réel (LiveKit)
- [ ] Détection d'activité vocale (Silero VAD)
- [ ] Choix de la voix par utilisateur
