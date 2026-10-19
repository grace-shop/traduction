import json
from pathlib import Path

import edge_tts
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from livekit import api

from config import (
    LANGUES,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
    LIVEKIT_URL,
    MOT_DE_PASSE_APPEL,
)
from logique import langue_valide, verifier_motdepasse, voix_valide

app = FastAPI()


def _verifier_langue(langue: str) -> None:
    if not langue_valide(langue, LANGUES):
        raise HTTPException(400, "Langue non prise en charge")


@app.get("/voix")
async def voix(langue: str = Query(..., min_length=2, max_length=3)):
    """Liste les voix de synthèse disponibles pour une langue, féminines en premier.

    Cette liste ne contient rien de sensible : elle reste accessible sans mot de passe.
    """
    _verifier_langue(langue)
    toutes = await edge_tts.list_voices()
    candidates = [v for v in toutes if v["Locale"].split("-")[0].lower() == langue]
    candidates.sort(key=lambda v: v["Gender"] != "Female")
    return [
        {"voix": v["ShortName"], "genre": v["Gender"], "nom": v["FriendlyName"]}
        for v in candidates
    ]


@app.get("/token")
def token(
    identite: str = Query(..., min_length=1, max_length=64),
    salle: str = Query(..., min_length=1, max_length=64),
    langue: str = Query("fr"),
    voix: str | None = Query(None, max_length=64),
    motdepasse: str | None = Query(None, max_length=256),
):
    if not (LIVEKIT_URL and LIVEKIT_API_KEY and LIVEKIT_API_SECRET):
        raise HTTPException(500, "Configuration LiveKit manquante dans .env")
    if not MOT_DE_PASSE_APPEL:
        raise HTTPException(500, "MOT_DE_PASSE_APPEL manquant dans .env")
    if not verifier_motdepasse(MOT_DE_PASSE_APPEL, motdepasse):
        raise HTTPException(401, "Mot de passe incorrect")

    _verifier_langue(langue)
    if voix is not None and not voix_valide(voix, langue):
        raise HTTPException(400, "Voix non prise en charge pour cette langue")

    # La langue et la voix sont portées par les métadonnées du participant : l'agent
    # s'en sert pour savoir quoi produire pour chaque auditeur.
    metadonnees = {"langue": langue}
    if voix:
        metadonnees["voix"] = voix

    jeton = (
        api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(identite)
        .with_name(identite)
        .with_metadata(json.dumps(metadonnees))
        .with_grants(api.VideoGrants(room_join=True, room=salle))
        .to_jwt()
    )
    return {"token": jeton, "url": LIVEKIT_URL}


app.mount(
    "/",
    StaticFiles(directory=Path(__file__).parent / "web", html=True),
    name="web",
)
