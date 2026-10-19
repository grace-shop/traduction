#!/bin/bash
# Lance l'agent de traduction et le serveur web dans le même conteneur.
# Si l'un des deux s'arrête, le conteneur s'arrête aussi (la plateforme le relance).
set -e

python agent.py start &
uvicorn serveur:app --host 0.0.0.0 --port "${PORT:-8000}" &

wait -n
exit $?
