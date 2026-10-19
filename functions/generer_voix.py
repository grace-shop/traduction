"""Génère functions/voix-data.js à partir de la liste des voix edge-tts.

À lancer une seule fois sur ton ordinateur (il faut avoir installé edge-tts) :
    pip install edge-tts
    python generer_voix.py

Le fichier généré doit ensuite être déployé avec le projet Cloudflare.
"""

import asyncio
import json
from pathlib import Path

import edge_tts

SORTIE = Path(__file__).parent / "functions" / "voix-data.js"


async def main() -> None:
    toutes = await edge_tts.list_voices()
    par_langue: dict[str, list[dict]] = {}

    for v in toutes:
        code = v["Locale"].split("-")[0].lower()
        par_langue.setdefault(code, []).append({
            "voix": v["ShortName"],
            "genre": v["Gender"],
            "nom": v["FriendlyName"],
        })

    # Voix féminines en premier, comme dans serveur.py.
    for liste in par_langue.values():
        liste.sort(key=lambda x: x["genre"] != "Female")

    SORTIE.parent.mkdir(exist_ok=True)
    SORTIE.write_text(
        "export const VOIX = " + json.dumps(par_langue, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
    print(f"{len(par_langue)} langues écrites dans {SORTIE}")


if __name__ == "__main__":
    asyncio.run(main())
