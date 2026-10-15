import time

import edge_tts
from deep_translator import GoogleTranslator
from deep_translator.exceptions import TooManyRequests
from faster_whisper import WhisperModel

from config import MODELE_WHISPER, VOIX

_stt = None


def _modele():
    global _stt
    if _stt is None:
        _stt = WhisperModel(MODELE_WHISPER, compute_type="int8")
    return _stt


def transcrire(chemin_audio: str) -> tuple[str, str]:
    segments, info = _modele().transcribe(chemin_audio)
    texte = " ".join(s.text.strip() for s in segments)
    return texte, info.language


def traduire(texte: str, source: str, cible: str, tentatives: int = 3) -> str:
    if source == cible or not texte.strip():
        return texte
    for essai in range(tentatives):
        try:
            return GoogleTranslator(source=source, target=cible).translate(texte)
        except TooManyRequests:
            time.sleep(2 * (essai + 1))
    raise RuntimeError("Trop de requêtes vers le service de traduction, réessayez plus tard.")


async def synthetiser(texte: str, voix: str, sortie: str) -> str:
    await edge_tts.Communicate(texte, voix).save(sortie)
    return sortie


async def traiter(chemin_audio: str, langue_cible: str, voix: str | None = None) -> dict:
    texte, langue_source = transcrire(chemin_audio)

    if not texte.strip():
        return {
            "original": "",
            "langue_source": langue_source,
            "traduction": "",
            "audio": None,
            "message": "Aucune parole détectée.",
        }

    traduit = traduire(texte, langue_source, langue_cible)
    audio = await synthetiser(traduit, voix or VOIX[langue_cible], "sortie.mp3")
    return {
        "original": texte,
        "langue_source": langue_source,
        "traduction": traduit,
        "audio": audio,
    }