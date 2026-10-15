import os
from dotenv import load_dotenv

load_dotenv()

LANGUE_CIBLE = os.getenv("LANGUE_CIBLE", "fr")
MODELE_WHISPER = os.getenv("MODELE_WHISPER", "small")

VOIX = {
    "fr": "fr-FR-DeniseNeural",
    "en": "en-US-JennyNeural",
}
