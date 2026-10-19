"""Tests de la logique pure. Lancer avec : python -m unittest discover -s tests -v"""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from logique import (  # noqa: E402
    SUJET_SOUS_TITRES,
    langue_valide,
    metadonnees_participant,
    nom_piste,
    sous_titre,
    verifier_motdepasse,
    voix_valide,
)

LANGUES = ["fr", "en", "zh", "de"]


class TestLangue(unittest.TestCase):
    def test_langue_autorisee(self):
        self.assertTrue(langue_valide("fr", LANGUES))

    def test_langue_inconnue(self):
        self.assertFalse(langue_valide("xx", LANGUES))

    def test_format_invalide(self):
        self.assertFalse(langue_valide("FR", LANGUES))
        self.assertFalse(langue_valide("fr/../../etc", LANGUES))
        self.assertFalse(langue_valide("", LANGUES))


class TestVoix(unittest.TestCase):
    def test_voix_de_la_bonne_langue(self):
        self.assertTrue(voix_valide("fr-FR-DeniseNeural", "fr"))
        self.assertTrue(voix_valide("zh-CN-XiaoxiaoNeural", "zh"))

    def test_voix_d_une_autre_langue(self):
        self.assertFalse(voix_valide("en-US-AriaNeural", "fr"))

    def test_voix_non_neurale_ou_malformee(self):
        self.assertFalse(voix_valide("fr-FR-Denise", "fr"))
        self.assertFalse(voix_valide("fr-FR-DeniseNeural; rm -rf /", "fr"))
        self.assertFalse(voix_valide("", "fr"))


class TestMotDePasse(unittest.TestCase):
    def test_bon_mot_de_passe(self):
        self.assertTrue(verifier_motdepasse("secret-long-123", "secret-long-123"))

    def test_mauvais_mot_de_passe(self):
        self.assertFalse(verifier_motdepasse("secret-long-123", "secret-long-124"))

    def test_absence_de_mot_de_passe_fourni(self):
        self.assertFalse(verifier_motdepasse("secret-long-123", None))
        self.assertFalse(verifier_motdepasse("secret-long-123", ""))

    def test_mot_de_passe_serveur_vide_n_ouvre_rien(self):
        # Si le serveur n'a pas de mot de passe configuré, personne ne doit entrer.
        self.assertFalse(verifier_motdepasse("", ""))
        self.assertFalse(verifier_motdepasse("", "n'importe quoi"))


class TestNomPiste(unittest.TestCase):
    def test_nom_piste(self):
        self.assertEqual(
            nom_piste("fr", "fr-FR-DeniseNeural"),
            "traduction-fr-fr-FR-DeniseNeural",
        )

    def test_deux_voix_donnent_deux_pistes(self):
        self.assertNotEqual(
            nom_piste("fr", "fr-FR-DeniseNeural"),
            nom_piste("fr", "fr-FR-HenriNeural"),
        )


class TestMetadonnees(unittest.TestCase):
    def test_metadonnees_valides(self):
        self.assertEqual(metadonnees_participant('{"langue": "fr"}'), {"langue": "fr"})

    def test_metadonnees_vides_ou_absentes(self):
        self.assertEqual(metadonnees_participant(None), {})
        self.assertEqual(metadonnees_participant(""), {})

    def test_metadonnees_malformees(self):
        self.assertEqual(metadonnees_participant("{pas du json"), {})

    def test_metadonnees_pas_un_objet(self):
        self.assertEqual(metadonnees_participant("[1, 2]"), {})
        self.assertEqual(metadonnees_participant('"fr"'), {})


class TestSousTitre(unittest.TestCase):
    def test_contenu_du_sous_titre(self):
        brut = sous_titre("Ami", "fr", "Bonjour", {"en": "Hello"})
        donnees = json.loads(brut.decode("utf-8"))
        self.assertEqual(donnees["auteur"], "Ami")
        self.assertEqual(donnees["langue_source"], "fr")
        self.assertEqual(donnees["original"], "Bonjour")
        self.assertEqual(donnees["traductions"], {"en": "Hello"})

    def test_accents_conserves(self):
        brut = sous_titre("Ami", "fr", "Où êtes-vous ?", {})
        self.assertIn("Où êtes-vous ?".encode("utf-8"), brut)

    def test_sujet_stable(self):
        self.assertEqual(SUJET_SOUS_TITRES, "sous-titres")


if __name__ == "__main__":
    unittest.main()
