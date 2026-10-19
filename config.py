import os
from dotenv import load_dotenv

load_dotenv()

LANGUE_CIBLE = os.getenv("LANGUE_CIBLE", "fr")
MODELE_WHISPER = os.getenv("MODELE_WHISPER", "small")

LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")

# Mot de passe demandé à chaque participant pour rejoindre un appel.
# Obligatoire : sans lui, le serveur refuse de délivrer des jetons.
MOT_DE_PASSE_APPEL = os.getenv("MOT_DE_PASSE_APPEL", "")

# Langues reconnues par Whisper (codes ISO), proposées dans l'application.
LANGUES = (
    "af am ar as az ba be bg bn bo br bs ca cs cy da de el en es et eu fa fi fo fr "
    "gl gu ha haw he hi hr ht hu hy id is it ja jw ka kk km kn ko la lb ln lo lt lv "
    "mg mi mk ml mn mr ms mt my ne nl nn no oc pa pl ps pt ro ru sa sd si sk sl sn "
    "so sq sr su sv sw ta te tg th tk tl tr tt uk ur uz vi yi yo yue zh"
).split()
