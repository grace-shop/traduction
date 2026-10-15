import edge_tts
from deep_translator import GoogleTranslator
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


def traduire(texte: str, source: str, cible: str) -> str:
    if source == cible:
        return texte
    return GoogleTranslator(source=source, target=cible).translate(texte)


async def synthetiser(texte: str, voix: str, sortie: str) -> str:
    await edge_tts.Communicate(texte, voix).save(sortie)
    return sortie


async def traiter(chemin_audio: str, langue_cible: str, voix: str | None = None) -> dict:
    texte, langue_source = transcrire(chemin_audio)
    traduit = traduire(texte, langue_source, langue_cible)
    audio = await synthetiser(traduit, voix or VOIX[langue_cible], "sortie.mp3")
    return {
        "original": texte,
        "langue_source": langue_source,
        "traduction": traduit,
        "audio": audio,
    }
