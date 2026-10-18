import json
import re
from pathlib import Path

import edge_tts
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from livekit import api

from config import LANGUES, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL

app = FastAPI()

# Voix Microsoft neurales, par exemple fr-FR-DeniseNeural.
MOTIF_VOIX = re.compile(r"[a-z]{2,3}-[A-Za-z0-9]{2,}-[A-Za-z0-9]+Neural")


def _langue_valide(langue: str) -> None:
    if not re.fullmatch(r"[a-z]{2,3}", langue) or langue not in LANGUES:
        raise HTTPException(400, "Langue non prise en charge")


@app.get("/voix")
async def voix(langue: str = Query(..., min_length=2, max_length=3)):
    """Liste les voix de synthèse disponibles pour une langue, féminines en premier."""
    _langue_valide(langue)
    toutes = await edge_tts.list_voices()
    candidates = [v for v in toutes if v["Locale"].split("-")[0].lower() == langue]
    candidates.sort(key=lambda v: v["Gender"] != "Female")
    return [
        {"voix": v["ShortName"], "genre": v["Gender"], "nom": v["FriendlyName"]}
        for v in candidates
    ]


@app.get("/token")
def token(
    identite: str = Query(..., min_length=1),
    salle: str = Query(..., min_length=1),
    langue: str = Query("fr"),
    voix: str | None = Query(None),
):
    if not (LIVEKIT_URL and LIVEKIT_API_KEY and LIVEKIT_API_SECRET):
        raise HTTPException(500, "Configuration LiveKit manquante dans .env")
    _langue_valide(langue)
    if voix is not None:
        if not MOTIF_VOIX.fullmatch(voix) or not voix.startswith(langue + "-"):
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
