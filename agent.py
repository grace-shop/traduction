import asyncio
import logging
import os
import tempfile
import wave

import av
import numpy as np
from livekit import rtc
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli

from logique import SUJET_SOUS_TITRES, metadonnees_participant, nom_piste, sous_titre
from pipeline import synthetiser, traduire, transcrire, voix_pour

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("agent-traduction")

FREQUENCE = 48000
TAILLE_TRAME = 480
SEUIL_NIVEAU = 400
SILENCE_FIN = 0.7
DUREE_MAX = 12.0
DUREE_MIN = 0.4

# Un agent se reconnaît à son type de participant, et non à son nom.
_TYPE_AGENT = getattr(getattr(rtc, "ParticipantKind", None), "PARTICIPANT_KIND_AGENT", None)


def est_agent(participant) -> bool:
    return _TYPE_AGENT is not None and getattr(participant, "kind", None) == _TYPE_AGENT


def mp3_vers_pcm(chemin: str) -> bytes:
    conteneur = av.open(chemin)
    reechantillonneur = av.AudioResampler(format="s16", layout="mono", rate=FREQUENCE)
    sortie = bytearray()
    for trame in conteneur.decode(audio=0):
        for r in reechantillonneur.resample(trame):
            sortie.extend(r.to_ndarray().tobytes())
    for r in reechantillonneur.resample(None) or []:
        sortie.extend(r.to_ndarray().tobytes())
    conteneur.close()
    return bytes(sortie)


def ecrire_wav(chemin: str, pcm: bytes, frequence: int) -> None:
    with wave.open(chemin, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(frequence)
        w.writeframes(pcm)


async def jouer(pcm: bytes, source: rtc.AudioSource) -> None:
    taille = TAILLE_TRAME * 2
    reste = len(pcm) % taille
    if reste:
        pcm += b"\x00" * (taille - reste)
    for i in range(0, len(pcm), taille):
        trame = rtc.AudioFrame(
            data=pcm[i:i + taille],
            sample_rate=FREQUENCE,
            num_channels=1,
            samples_per_channel=TAILLE_TRAME,
        )
        await source.capture_frame(trame)


class Salle:
    """Connaît les langues et voix des auditeurs et publie une piste par (langue, voix)."""

    def __init__(self, room: rtc.Room):
        self.room = room
        self.pistes: dict[str, rtc.AudioSource] = {}

    async def cibles(self) -> dict[str, tuple[str, str]]:
        """Retourne, pour chaque piste demandée, la langue et la voix de synthèse."""
        cibles: dict[str, tuple[str, str]] = {}
        for participant in self.room.remote_participants.values():
            if est_agent(participant):
                continue
            meta = metadonnees_participant(participant.metadata)
            langue = meta.get("langue")
            if not langue:
                continue
            voix = meta.get("voix") or await voix_pour(langue)
            if not voix:
                log.warning("Aucune voix disponible pour la langue %s", langue)
                continue
            cibles.setdefault(nom_piste(langue, voix), (langue, voix))
        return cibles

    async def source(self, nom: str) -> rtc.AudioSource:
        if nom not in self.pistes:
            source = rtc.AudioSource(FREQUENCE, 1)
            piste = rtc.LocalAudioTrack.create_audio_track(nom, source)
            await self.room.local_participant.publish_track(piste)
            self.pistes[nom] = source
            log.info("Piste publiée : %s", nom)
        return self.pistes[nom]


async def traiter_segment(pcm: bytes, auteur: str, salle: Salle) -> None:
    cibles = await salle.cibles()
    if not cibles:
        return

    with tempfile.TemporaryDirectory() as dossier:
        wav = os.path.join(dossier, "segment.wav")
        ecrire_wav(wav, pcm, FREQUENCE)

        texte, langue_source = await asyncio.to_thread(transcrire, wav)
        if not texte.strip():
            return
        log.info("[%s] %s", langue_source, texte)

        # La traduction ne dépend que de la langue : on la calcule une fois par langue.
        traductions: dict[str, str] = {}
        diffusions = []
        for nom, (langue_cible, voix) in cibles.items():
            if langue_cible == langue_source:
                continue
            try:
                if langue_cible not in traductions:
                    traductions[langue_cible] = await asyncio.to_thread(
                        traduire, texte, langue_source, langue_cible
                    )
                    log.info("[%s] %s", langue_cible, traductions[langue_cible])
                mp3 = os.path.join(dossier, f"{nom}.mp3")
                await synthetiser(traductions[langue_cible], voix, mp3)
                audio = await asyncio.to_thread(mp3_vers_pcm, mp3)
            except Exception as erreur:
                log.warning("Traduction vers %s (%s) ignorée : %s", langue_cible, voix, erreur)
                continue
            diffusions.append((nom, audio))

    # Sous-titres : le texte original et les traductions sont envoyés à tous les participants.
    # Chacun ne retient que la langue qui le concerne.
    try:
        await salle.room.local_participant.publish_data(
            sous_titre(auteur, langue_source, texte, traductions),
            reliable=True,
            topic=SUJET_SOUS_TITRES,
        )
    except Exception as erreur:
        log.warning("Sous-titres non envoyés : %s", erreur)

    taches = []
    for nom, audio in diffusions:
        source = await salle.source(nom)
        taches.append(jouer(audio, source))
    if taches:
        await asyncio.gather(*taches)


async def boucle_traduction(file: asyncio.Queue, salle: Salle) -> None:
    while True:
        pcm, auteur = await file.get()
        try:
            await traiter_segment(pcm, auteur, salle)
        except Exception:
            log.exception("Erreur pendant la traduction d'un segment")


async def ecouter(track: rtc.RemoteAudioTrack, auteur: str, file: asyncio.Queue) -> None:
    flux = rtc.AudioStream(track, sample_rate=FREQUENCE, num_channels=1)
    tampon = bytearray()
    silence = 0.0

    async for evenement in flux:
        trame = evenement.frame
        donnees = bytes(trame.data)
        samples = np.frombuffer(donnees, dtype=np.int16)
        if samples.size == 0:
            continue

        niveau = float(np.sqrt(np.mean(samples.astype(np.float32) ** 2)))
        duree = samples.size / trame.sample_rate

        if niveau > SEUIL_NIVEAU:
            tampon.extend(donnees)
            silence = 0.0
        elif tampon:
            tampon.extend(donnees)
            silence += duree

        total = len(tampon) / (2 * FREQUENCE)
        if tampon and (silence >= SILENCE_FIN or total >= DUREE_MAX):
            if total - silence >= DUREE_MIN:
                await file.put((bytes(tampon), auteur))
            tampon.clear()
            silence = 0.0

    if tampon:
        await file.put((bytes(tampon), auteur))


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    log.info("Agent connecté à la salle %s", ctx.room.name)

    salle = Salle(ctx.room)
    file = asyncio.Queue()
    asyncio.create_task(boucle_traduction(file, salle))

    @ctx.room.on("track_subscribed")
    def sur_piste(track, publication, participant):
        if track.kind != rtc.TrackKind.KIND_AUDIO:
            return
        if est_agent(participant):
            return
        # Le nom affiché (sans le suffixe technique) sert d'auteur dans les sous-titres.
        auteur = participant.name or participant.identity
        asyncio.create_task(ecouter(track, auteur, file))


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
