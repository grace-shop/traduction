import edge_tts
import langcodes
from deep_translator import MyMemoryTranslator
from faster_whisper import WhisperModel

from config import MODELE_WHISPER

_stt = None
_voix = None

# Cas où le nom anglais de la langue ne correspond pas au nom attendu par MyMemory.
CORRESPONDANCES = {
    "zh": "chinese simplified",
    "no": "norwegian bokmål",
    "nb": "norwegian bokmål",
    "nn": "norwegian nynorsk",
    "sr": "serbian cyrillic",
    "jw": "javanese",
}


def _modele():
    global _stt
    if _stt is None:
        _stt = WhisperModel(MODELE_WHISPER, compute_type="int8")
    return _stt


def nom_mymemory(code: str) -> str:
    if code in CORRESPONDANCES:
        return CORRESPONDANCES[code]
    return langcodes.Language.get(code).display_name("en").lower()


async def voix_pour(code: str) -> str | None:
    """Choisit une voix Microsoft pour la langue, en privilégiant une voix féminine."""
    global _voix
    if _voix is None:
        _voix = await edge_tts.list_voices()
    candidates = [v for v in _voix if v["Locale"].split("-")[0].lower() == code]
    if not candidates:
        return None
    feminines = [v for v in candidates if v["Gender"] == "Female"]
    return (feminines or candidates)[0]["ShortName"]


def transcrire(chemin_audio: str) -> tuple[str, str]:
    segments, info = _modele().transcribe(chemin_audio)
    texte = " ".join(s.text.strip() for s in segments)
    return texte, info.language


def traduire(texte: str, source: str, cible: str) -> str:
    if source == cible or not texte.strip():
        return texte
    return MyMemoryTranslator(
        source=nom_mymemory(source),
        target=nom_mymemory(cible),
    ).translate(texte)


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
    voix = voix or await voix_pour(langue_cible)
    audio = await synthetiser(traduit, voix, "sortie.mp3")
    return {
        "original": texte,
        "langue_source": langue_source,
        "traduction": traduit,
        "audio": audio,
    }
