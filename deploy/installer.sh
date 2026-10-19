#!/bin/bash
# Installation sur un serveur Ubuntu (Oracle Cloud, ARM64 ou AMD64).
# Usage : bash installer.sh BRANCHE DOMAINE
# Exemple : bash installer.sh securite-sous-titres-tests appel-traduit.duckdns.org
set -euo pipefail

BRANCHE="${1:?Indiquez la branche, par exemple main}"
DOMAINE="${2:?Indiquez le domaine, par exemple appel-traduit.duckdns.org}"
DOSSIER="$HOME/traduction"

echo "==> Installation de Docker"
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 git iptables-persistent
sudo usermod -aG docker "$USER" || true

echo "==> Ouverture des ports 80 et 443 (pare-feu de l'image Oracle)"
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

echo "==> Récupération de l'application"
if [ -d "$DOSSIER/.git" ]; then
  git -C "$DOSSIER" fetch origin "$BRANCHE"
  git -C "$DOSSIER" checkout "$BRANCHE"
  git -C "$DOSSIER" reset --hard "origin/$BRANCHE"
else
  git clone --branch "$BRANCHE" https://github.com/grace-shop/traduction "$DOSSIER"
fi
cd "$DOSSIER"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Fichier .env créé. Renseignez-le puis relancez ce script :"
  echo "    nano $DOSSIER/.env"
  exit 1
fi

# Le domaine doit figurer dans .env pour Caddy.
if grep -q '^DOMAINE=' .env; then
  sed -i "s|^DOMAINE=.*|DOMAINE=$DOMAINE|" .env
else
  echo "DOMAINE=$DOMAINE" >> .env
fi

echo "==> Lancement (la première fois, la construction prend plusieurs minutes)"
sudo docker compose -f deploy/docker-compose.yml --env-file .env up -d --build
echo "==> Terminé. Adresse : https://$DOMAINE"
echo "    Journaux : sudo docker compose -f deploy/docker-compose.yml logs -f"
