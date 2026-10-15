import json
import re
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from livekit import api

from config import LANGUES, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL

app = FastAPI()


@app.get("/token")
def token(
    identite: str = Query(..., min_length=1),
    salle: str = Query(..., min_length=1),
    langue: str = Query("fr"),
):
    if not (LIVEKIT_URL and LIVEKIT_API_KEY and LIVEKIT_API_SECRET):
        raise HTTPException(500, "Configuration LiveKit manquante dans .env")
    if not re.fullmatch(r"[a-z]{2,3}", langue) or langue not in LANGUES:
        raise HTTPException(400, "Langue non prise en charge")

    # La langue est portée par les métadonnées du participant : l'agent s'en sert
    # pour savoir vers quelle langue traduire sa parole.
    metadonnees = json.dumps({"langue": langue})

    jeton = (
        api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(identite)
        .with_name(identite)
        .with_metadata(metadonnees)
        .with_grants(api.VideoGrants(room_join=True, room=salle))
        .to_jwt()
    )
    return {"token": jeton, "url": LIVEKIT_URL}


app.mount(
    "/",
    StaticFiles(directory=Path(__file__).parent / "web", html=True),
    name="web",
)
