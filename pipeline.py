import edge_tts
from deep_translator import MyMemoryTranslator
from faster_whisper import WhisperModel

from config import MODELE_WHISPER, VOIX

_stt = None

NOMS_LANGUES = {
    "fr": "french",
    "en": "english",
    "es": "spanish",
    "de": "german",
    "it": "italian",
    "pt": "portuguese",
    "ar": "arabic",
    "zh": "chinese simplified",
}


def _modele():
    global _stt
    if _stt is None:
        _stt = WhisperModel(MODELE_WHISPER, compute_type="int8")
    return _stt


def transcrire(chemin_audio: str) -> tuple[str, str]:
    segments, info = _modele().transcribe(chemin_audio)
    texte = " ".join(s.text.strip() for s in segments)
    return texte, info.language


def traduire(texte: str, source: str, cible: str) -> str:
    if source == cible or not texte.strip():
        return texte
    src = NOMS_LANGUES.get(source, source)
    tgt = NOMS_LANGUES.get(cible, cible)
    return MyMemoryTranslator(source=src, target=tgt).translate(texte)


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
