"""Logique pure de l'application : validations, noms de pistes, sous-titres.

Ce module n'importe aucune dépendance externe, pour pouvoir être testé
sans installer LiveKit, FastAPI ni Whisper.
"""

import hmac
import json
import re

# Voix Microsoft neurales, par exemple fr-FR-DeniseNeural.
MOTIF_VOIX = re.compile(r"[a-z]{2,3}-[A-Za-z0-9]{2,}-[A-Za-z0-9]+Neural")
MOTIF_LANGUE = re.compile(r"[a-z]{2,3}")

# Sujet des messages de sous-titres envoyés aux participants.
SUJET_SOUS_TITRES = "sous-titres"


def langue_valide(langue: str, langues_autorisees: list[str]) -> bool:
    return bool(MOTIF_LANGUE.fullmatch(langue)) and langue in langues_autorisees


def voix_valide(voix: str, langue: str) -> bool:
    """Une voix est valide si elle est neurale et appartient à la langue demandée."""
    return bool(MOTIF_VOIX.fullmatch(voix)) and voix.startswith(langue + "-")


def verifier_motdepasse(attendu: str, fourni: str | None) -> bool:
    """Compare les mots de passe en temps constant. Un mot de passe vide n'ouvre rien."""
    if not attendu or fourni is None:
        return False
    return hmac.compare_digest(attendu.encode("utf-8"), fourni.encode("utf-8"))


def nom_piste(langue: str, voix: str) -> str:
    """Nom de la piste audio de traduction destinée à une langue et une voix données."""
    return f"traduction-{langue}-{voix}"


def metadonnees_participant(brut: str | None) -> dict:
    """Lit les métadonnées d'un participant sans jamais lever d'exception."""
    try:
        donnees = json.loads(brut or "{}")
    except (json.JSONDecodeError, TypeError):
        return {}
    return donnees if isinstance(donnees, dict) else {}


def sous_titre(identite: str, langue_source: str, original: str,
               traductions: dict[str, str]) -> bytes:
    """Message de sous-titres : texte original et traduction par langue cible."""
    charge = {
        "auteur": identite,
        "langue_source": langue_source,
        "original": original,
        "traductions": traductions,
    }
    return json.dumps(charge, ensure_ascii=False).encode("utf-8")
