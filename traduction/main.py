import asyncio
import sys

from config import LANGUE_CIBLE
from pipeline import traiter

if __name__ == "__main__":
    fichier = sys.argv[1] if len(sys.argv) > 1 else "exemple.wav"
    resultat = asyncio.run(traiter(fichier, LANGUE_CIBLE))
    for cle, valeur in resultat.items():
        print(f"{cle} : {valeur}")
