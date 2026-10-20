// Textes de l'interface, en six langues. Le français sert de repli pour toute clé absente.
// Une clé inconnue est affichée telle quelle : c'est visible en test, sans casser l'appel.
(function () {
  "use strict";

  const TEXTES = {
    fr: {
      reunions_bouton: "Réunions", reunions_titre: "Réunions planifiées", reunions_a_venir: "À venir", reunion_nouvelle: "Planifier une réunion", reunion_titre_champ: "Titre", reunion_date_champ: "Date et heure", reunion_duree_champ: "Durée", reunion_planifier: "Planifier", reunion_vide: "Aucune réunion à venir.", reunion_rejoindre: "Rejoindre", reunion_calendrier: "Ajouter au calendrier", reunion_creee: "Réunion planifiée.", reunion_erreur: "Impossible d'enregistrer la réunion. Vérifiez le titre et la date.", reunion_serveur: "Service des réunions indisponible pour l'instant.", reunion_retour: "Retour",
      partager: "Partager", partage_texte: "Rejoins mon appel « {salle} » sur Appel traduit.", ouvrir_texte: "Cette salle est aussi dans l'application.", ouvrir_appli: "Ouvrir dans l'application", telecharger_appli: "Télécharger l'application",
      maj_dispo: "Une nouvelle version est disponible.", maj_maintenant: "Mettre à jour", maj_plus_tard: "Plus tard", maj_verifier: "Vérifier les mises à jour", maj_a_jour: "Vous avez la dernière version.", maj_erreur: "Impossible de vérifier pour l'instant.", maj_aucune: "Aucune version publiée pour l'instant.",
      reglage_theme: "Thème", theme_nuit: "Nuit", theme_aurore: "Aurore", theme_ocean: "Océan", theme_emeraude: "Émeraude", theme_clair: "Clair",
      titre: "Appel traduit", sous_titre: "Parlez votre langue, tout le monde comprend.",
      champ_nom: "Votre nom", ex_nom: "Ex. Awa", champ_langue: "Votre langue", champ_voix: "Voix de lecture",
      champ_salle: "Nom de la salle", ex_salle: "Ex. reunion-famille", champ_mdp: "Mot de passe de l'appel",
      consent_html: "J'accepte que ma voix soit reconnue par mon appareil, et que le texte soit traduit par un service tiers, pour cet appel uniquement. <a href=\"confidentialite.html\" target=\"_blank\" rel=\"noopener\">Voir la politique de confidentialité</a>.",
      rejoindre: "Rejoindre l'appel", conseil: "Un casque évite que la traduction ne soit captée par votre micro.",
      reglages: "Réglages", langue_interface: "Langue de l'interface", vitesse: "Vitesse de lecture",
      volume: "Volume de la traduction", taille: "Taille des sous-titres", taille_petite: "Petite",
      taille_normale: "Normale", taille_grande: "Grande", masquer: "Masquer les sous-titres",
      en_direct: "En direct", participants: "Participants", compteur_un: "{n} participant", compteur_plusieurs: "{n} participants",
      ma_langue: "Ma langue", changer_langue: "Changer ma langue", micro: "Micro", reactiver: "Réactiver",
      camera: "Caméra", quitter: "Quitter", messages: "Messages traduits", commandes: "Commandes de l'appel",
      outils: "Outils de l'appel", copier_lien: "Copier le lien", qr: "QR code", reecouter: "Réécouter",
      historique: "Historique", telecharger: "Télécharger", historique_vide: "Aucun message pour l'instant.",
      qr_indisponible: "Le QR code ne peut pas être affiché sans connexion.",
      lien_copie: "Lien copié.", lien_manuel: "Copiez ce lien : ", moi: "Moi", participant: "Participant",
      traduction_indisponible: "(traduction indisponible)", voix_native: "Voix du téléphone", voix_defaut: "Voix par défaut",
      st_nom_salle: "Renseignez votre nom et la salle.", st_mdp: "Saisissez le mot de passe de l'appel.",
      st_consent: "Acceptez le traitement de votre voix pour rejoindre l'appel.",
      st_pas_reco: "La reconnaissance vocale n'est pas disponible sur cet appareil. Utilisez Chrome ou Edge.",
      st_micro_refuse: "Le micro est refusé. Autorisez-le dans les réglages de l'appareil.",
      st_connexion: "Connexion...", st_serveur: "Impossible de joindre le serveur. Vérifiez votre connexion.",
      st_mdp_faux: "Mot de passe incorrect.", st_trop: "Trop de tentatives. Réessayez dans quelques minutes.",
      st_erreur_serveur: "Erreur de connexion au serveur.",
      st_echec: "Connexion impossible. Vérifiez votre réseau et réessayez.",
      st_parlez: "Parlez : les autres entendront votre message dans leur langue.",
      st_non_envoye: "Message non envoyé. Vérifiez votre connexion.",
      st_quota: "Quota de traduction atteint pour aujourd'hui : les messages ne sont plus traduits.",
      st_rejoint: "{nom} a rejoint l'appel.", st_quitte: "{nom} a quitté l'appel.",
      st_instable: "Connexion instable : reconnexion en cours...", st_reconnecte: "Reconnecté.",
      st_langue: "Votre langue est maintenant : {langue}.", st_micro_on: "Micro activé.",
      st_micro_off: "Micro coupé : les autres ne vous entendent plus.",
      st_reco_arret: "La reconnaissance vocale s'est arrêtée.", st_fin: "Appel terminé.",
      st_camera_on: "Caméra activée.", st_camera_off: "Caméra coupée.", st_camera_err: "La caméra n'est pas accessible.",
    },
    en: {
      reunions_bouton: "Meetings", reunions_titre: "Scheduled meetings", reunions_a_venir: "Upcoming", reunion_nouvelle: "Schedule a meeting", reunion_titre_champ: "Title", reunion_date_champ: "Date and time", reunion_duree_champ: "Duration", reunion_planifier: "Schedule", reunion_vide: "No upcoming meetings.", reunion_rejoindre: "Join", reunion_calendrier: "Add to calendar", reunion_creee: "Meeting scheduled.", reunion_erreur: "Could not save the meeting. Check the title and date.", reunion_serveur: "Meetings service unavailable right now.", reunion_retour: "Back",
      partager: "Share", partage_texte: "Join my call “{salle}” on Appel traduit.", ouvrir_texte: "This room is also in the app.", ouvrir_appli: "Open in the app", telecharger_appli: "Download the app",
      maj_dispo: "A new version is available.", maj_maintenant: "Update now", maj_plus_tard: "Later", maj_verifier: "Check for updates", maj_a_jour: "You have the latest version.", maj_erreur: "Unable to check right now.", maj_aucune: "No version published yet.",
      reglage_theme: "Theme", theme_nuit: "Night", theme_aurore: "Aurora", theme_ocean: "Ocean", theme_emeraude: "Emerald", theme_clair: "Light",
      titre: "Translated Call", sous_titre: "Speak your language, everyone understands.",
      champ_nom: "Your name", ex_nom: "E.g. Awa", champ_langue: "Your language", champ_voix: "Playback voice",
      champ_salle: "Room name", ex_salle: "E.g. family-meeting", champ_mdp: "Call password",
      consent_html: "I agree that my voice is recognised by my device, and that the text is translated by a third-party service, for this call only. <a href=\"confidentialite.html\" target=\"_blank\" rel=\"noopener\">Read the privacy policy (in French)</a>.",
      rejoindre: "Join the call", conseil: "A headset stops the translation from being picked up by your mic.",
      reglages: "Settings", langue_interface: "Interface language", vitesse: "Reading speed",
      volume: "Translation volume", taille: "Subtitle size", taille_petite: "Small", taille_normale: "Normal",
      taille_grande: "Large", masquer: "Hide subtitles",
      en_direct: "Live", participants: "Participants", compteur_un: "{n} participant", compteur_plusieurs: "{n} participants",
      ma_langue: "My language", changer_langue: "Change my language", micro: "Mic", reactiver: "Unmute",
      camera: "Camera", quitter: "Leave", messages: "Translated messages", commandes: "Call controls",
      outils: "Call tools", copier_lien: "Copy link", qr: "QR code", reecouter: "Replay",
      historique: "History", telecharger: "Download", historique_vide: "No messages yet.",
      qr_indisponible: "The QR code cannot be shown without a connection.",
      lien_copie: "Link copied.", lien_manuel: "Copy this link: ", moi: "Me", participant: "Participant",
      traduction_indisponible: "(translation unavailable)", voix_native: "Phone voice", voix_defaut: "Default voice",
      st_nom_salle: "Enter your name and the room name.", st_mdp: "Enter the call password.",
      st_consent: "Accept the processing of your voice to join the call.",
      st_pas_reco: "Speech recognition is not available on this device. Use Chrome or Edge.",
      st_micro_refuse: "The microphone is blocked. Allow it in your device settings.",
      st_connexion: "Connecting...", st_serveur: "Cannot reach the server. Check your connection.",
      st_mdp_faux: "Wrong password.", st_trop: "Too many attempts. Try again in a few minutes.",
      st_erreur_serveur: "Server connection error.",
      st_echec: "Could not connect. Check your network and try again.",
      st_parlez: "Speak: others will hear your message in their language.",
      st_non_envoye: "Message not sent. Check your connection.",
      st_quota: "Daily translation limit reached: messages are no longer translated.",
      st_rejoint: "{nom} joined the call.", st_quitte: "{nom} left the call.",
      st_instable: "Unstable connection: reconnecting...", st_reconnecte: "Reconnected.",
      st_langue: "Your language is now: {langue}.", st_micro_on: "Mic on.",
      st_micro_off: "Mic muted: others can no longer hear you.",
      st_reco_arret: "Speech recognition stopped.", st_fin: "Call ended.",
      st_camera_on: "Camera on.", st_camera_off: "Camera off.", st_camera_err: "The camera is not available.",
    },
    es: {
      reunions_bouton: "Reuniones", reunions_titre: "Reuniones programadas", reunions_a_venir: "Próximas", reunion_nouvelle: "Programar una reunión", reunion_titre_champ: "Título", reunion_date_champ: "Fecha y hora", reunion_duree_champ: "Duración", reunion_planifier: "Programar", reunion_vide: "No hay reuniones próximas.", reunion_rejoindre: "Unirse", reunion_calendrier: "Añadir al calendario", reunion_creee: "Reunión programada.", reunion_erreur: "No se pudo guardar la reunión. Revisa el título y la fecha.", reunion_serveur: "Servicio de reuniones no disponible ahora.", reunion_retour: "Volver",
      partager: "Compartir", partage_texte: "Únete a mi llamada «{salle}» en Appel traduit.", ouvrir_texte: "Esta sala también está en la aplicación.", ouvrir_appli: "Abrir en la aplicación", telecharger_appli: "Descargar la aplicación",
      maj_dispo: "Hay una nueva versión disponible.", maj_maintenant: "Actualizar ahora", maj_plus_tard: "Más tarde", maj_verifier: "Buscar actualizaciones", maj_a_jour: "Tienes la última versión.", maj_erreur: "No se puede comprobar ahora.", maj_aucune: "Aún no hay versión publicada.",
      reglage_theme: "Tema", theme_nuit: "Noche", theme_aurore: "Aurora", theme_ocean: "Océano", theme_emeraude: "Esmeralda", theme_clair: "Claro",
      titre: "Llamada traducida", sous_titre: "Habla tu idioma, todos lo entienden.",
      champ_nom: "Tu nombre", ex_nom: "Ej. Awa", champ_langue: "Tu idioma", champ_voix: "Voz de lectura",
      champ_salle: "Nombre de la sala", ex_salle: "Ej. reunion-familia", champ_mdp: "Contraseña de la llamada",
      consent_html: "Acepto que mi voz sea reconocida por mi dispositivo y que el texto sea traducido por un servicio externo, solo para esta llamada. <a href=\"confidentialite.html\" target=\"_blank\" rel=\"noopener\">Ver la política de privacidad (en francés)</a>.",
      rejoindre: "Unirse a la llamada", conseil: "Unos auriculares evitan que la traducción sea captada por tu micro.",
      reglages: "Ajustes", langue_interface: "Idioma de la interfaz", vitesse: "Velocidad de lectura",
      volume: "Volumen de la traducción", taille: "Tamaño de los subtítulos", taille_petite: "Pequeño",
      taille_normale: "Normal", taille_grande: "Grande", masquer: "Ocultar subtítulos",
      en_direct: "En vivo", participants: "Participantes", compteur_un: "{n} participante", compteur_plusieurs: "{n} participantes",
      ma_langue: "Mi idioma", changer_langue: "Cambiar mi idioma", micro: "Micro", reactiver: "Reactivar",
      camera: "Cámara", quitter: "Salir", messages: "Mensajes traducidos", commandes: "Controles de la llamada",
      outils: "Herramientas de la llamada", copier_lien: "Copiar enlace", qr: "Código QR", reecouter: "Repetir",
      historique: "Historial", telecharger: "Descargar", historique_vide: "Todavía no hay mensajes.",
      qr_indisponible: "El código QR no se puede mostrar sin conexión.",
      lien_copie: "Enlace copiado.", lien_manuel: "Copia este enlace: ", moi: "Yo", participant: "Participante",
      traduction_indisponible: "(traducción no disponible)", voix_native: "Voz del teléfono", voix_defaut: "Voz por defecto",
      st_nom_salle: "Escribe tu nombre y el nombre de la sala.", st_mdp: "Escribe la contraseña de la llamada.",
      st_consent: "Acepta el tratamiento de tu voz para unirte a la llamada.",
      st_pas_reco: "El reconocimiento de voz no está disponible en este dispositivo. Usa Chrome o Edge.",
      st_micro_refuse: "El micrófono está bloqueado. Permítelo en los ajustes del dispositivo.",
      st_connexion: "Conectando...", st_serveur: "No se puede contactar con el servidor. Revisa tu conexión.",
      st_mdp_faux: "Contraseña incorrecta.", st_trop: "Demasiados intentos. Inténtalo de nuevo en unos minutos.",
      st_erreur_serveur: "Error de conexión con el servidor.",
      st_echec: "No se pudo conectar. Revisa tu red e inténtalo de nuevo.",
      st_parlez: "Habla: los demás oirán tu mensaje en su idioma.",
      st_non_envoye: "Mensaje no enviado. Revisa tu conexión.",
      st_quota: "Se alcanzó el límite diario de traducción: los mensajes ya no se traducen.",
      st_rejoint: "{nom} se unió a la llamada.", st_quitte: "{nom} salió de la llamada.",
      st_instable: "Conexión inestable: reconectando...", st_reconnecte: "Reconectado.",
      st_langue: "Tu idioma ahora es: {langue}.", st_micro_on: "Micro activado.",
      st_micro_off: "Micro silenciado: los demás ya no te oyen.",
      st_reco_arret: "El reconocimiento de voz se detuvo.", st_fin: "Llamada terminada.",
      st_camera_on: "Cámara activada.", st_camera_off: "Cámara desactivada.", st_camera_err: "La cámara no está disponible.",
    },
    pt: {
      reunions_bouton: "Reuniões", reunions_titre: "Reuniões agendadas", reunions_a_venir: "Próximas", reunion_nouvelle: "Agendar uma reunião", reunion_titre_champ: "Título", reunion_date_champ: "Data e hora", reunion_duree_champ: "Duração", reunion_planifier: "Agendar", reunion_vide: "Nenhuma reunião próxima.", reunion_rejoindre: "Entrar", reunion_calendrier: "Adicionar ao calendário", reunion_creee: "Reunião agendada.", reunion_erreur: "Não foi possível guardar a reunião. Verifique o título e a data.", reunion_serveur: "Serviço de reuniões indisponível agora.", reunion_retour: "Voltar",
      partager: "Compartilhar", partage_texte: "Entre na minha chamada «{salle}» no Appel traduit.", ouvrir_texte: "Esta sala também está no aplicativo.", ouvrir_appli: "Abrir no aplicativo", telecharger_appli: "Baixar o aplicativo",
      maj_dispo: "Há uma nova versão disponível.", maj_maintenant: "Atualizar agora", maj_plus_tard: "Mais tarde", maj_verifier: "Verificar atualizações", maj_a_jour: "Você está com a versão mais recente.", maj_erreur: "Não é possível verificar agora.", maj_aucune: "Nenhuma versão publicada ainda.",
      reglage_theme: "Tema", theme_nuit: "Noite", theme_aurore: "Aurora", theme_ocean: "Oceano", theme_emeraude: "Esmeralda", theme_clair: "Claro",
      titre: "Chamada traduzida", sous_titre: "Fale a sua língua, todos entendem.",
      champ_nom: "Seu nome", ex_nom: "Ex. Awa", champ_langue: "Seu idioma", champ_voix: "Voz de leitura",
      champ_salle: "Nome da sala", ex_salle: "Ex. reuniao-familia", champ_mdp: "Senha da chamada",
      consent_html: "Aceito que a minha voz seja reconhecida pelo meu dispositivo e que o texto seja traduzido por um serviço externo, apenas para esta chamada. <a href=\"confidentialite.html\" target=\"_blank\" rel=\"noopener\">Ver a política de privacidade (em francês)</a>.",
      rejoindre: "Entrar na chamada", conseil: "Um headset evita que a tradução seja captada pelo microfone.",
      reglages: "Configurações", langue_interface: "Idioma da interface", vitesse: "Velocidade de leitura",
      volume: "Volume da tradução", taille: "Tamanho das legendas", taille_petite: "Pequena",
      taille_normale: "Normal", taille_grande: "Grande", masquer: "Ocultar legendas",
      en_direct: "Ao vivo", participants: "Participantes", compteur_un: "{n} participante", compteur_plusieurs: "{n} participantes",
      ma_langue: "Meu idioma", changer_langue: "Mudar meu idioma", micro: "Microfone", reactiver: "Reativar",
      camera: "Câmera", quitter: "Sair", messages: "Mensagens traduzidas", commandes: "Controles da chamada",
      outils: "Ferramentas da chamada", copier_lien: "Copiar link", qr: "Código QR", reecouter: "Repetir",
      historique: "Histórico", telecharger: "Baixar", historique_vide: "Nenhuma mensagem ainda.",
      qr_indisponible: "O código QR não pode ser exibido sem conexão.",
      lien_copie: "Link copiado.", lien_manuel: "Copie este link: ", moi: "Eu", participant: "Participante",
      traduction_indisponible: "(tradução indisponível)", voix_native: "Voz do telefone", voix_defaut: "Voz padrão",
      st_nom_salle: "Informe seu nome e o nome da sala.", st_mdp: "Digite a senha da chamada.",
      st_consent: "Aceite o tratamento da sua voz para entrar na chamada.",
      st_pas_reco: "O reconhecimento de voz não está disponível neste dispositivo. Use o Chrome ou o Edge.",
      st_micro_refuse: "O microfone está bloqueado. Permita-o nas configurações do dispositivo.",
      st_connexion: "Conectando...", st_serveur: "Não foi possível contactar o servidor. Verifique sua conexão.",
      st_mdp_faux: "Senha incorreta.", st_trop: "Muitas tentativas. Tente novamente em alguns minutos.",
      st_erreur_serveur: "Erro de conexão com o servidor.",
      st_echec: "Não foi possível conectar. Verifique sua rede e tente novamente.",
      st_parlez: "Fale: os outros ouvirão sua mensagem no idioma deles.",
      st_non_envoye: "Mensagem não enviada. Verifique sua conexão.",
      st_quota: "Limite diário de tradução atingido: as mensagens não são mais traduzidas.",
      st_rejoint: "{nom} entrou na chamada.", st_quitte: "{nom} saiu da chamada.",
      st_instable: "Conexão instável: reconectando...", st_reconnecte: "Reconectado.",
      st_langue: "Seu idioma agora é: {langue}.", st_micro_on: "Microfone ativado.",
      st_micro_off: "Microfone desligado: os outros não ouvem mais você.",
      st_reco_arret: "O reconhecimento de voz parou.", st_fin: "Chamada encerrada.",
      st_camera_on: "Câmera ativada.", st_camera_off: "Câmera desligada.", st_camera_err: "A câmera não está disponível.",
    },
    de: {
      reunions_bouton: "Besprechungen", reunions_titre: "Geplante Besprechungen", reunions_a_venir: "Demnächst", reunion_nouvelle: "Besprechung planen", reunion_titre_champ: "Titel", reunion_date_champ: "Datum und Uhrzeit", reunion_duree_champ: "Dauer", reunion_planifier: "Planen", reunion_vide: "Keine bevorstehenden Besprechungen.", reunion_rejoindre: "Beitreten", reunion_calendrier: "Zum Kalender hinzufügen", reunion_creee: "Besprechung geplant.", reunion_erreur: "Besprechung konnte nicht gespeichert werden. Prüfe Titel und Datum.", reunion_serveur: "Besprechungsdienst derzeit nicht verfügbar.", reunion_retour: "Zurück",
      partager: "Teilen", partage_texte: "Tritt meinem Anruf „{salle}“ bei Appel traduit bei.", ouvrir_texte: "Dieser Raum ist auch in der App.", ouvrir_appli: "In der App öffnen", telecharger_appli: "App herunterladen",
      maj_dispo: "Eine neue Version ist verfügbar.", maj_maintenant: "Jetzt aktualisieren", maj_plus_tard: "Später", maj_verifier: "Auf Updates prüfen", maj_a_jour: "Du hast die neueste Version.", maj_erreur: "Prüfung im Moment nicht möglich.", maj_aucune: "Noch keine Version veröffentlicht.",
      reglage_theme: "Design", theme_nuit: "Nacht", theme_aurore: "Aurora", theme_ocean: "Ozean", theme_emeraude: "Smaragd", theme_clair: "Hell",
      titre: "Übersetzter Anruf", sous_titre: "Sprich deine Sprache, alle verstehen dich.",
      champ_nom: "Dein Name", ex_nom: "Z. B. Awa", champ_langue: "Deine Sprache", champ_voix: "Wiedergabestimme",
      champ_salle: "Raumname", ex_salle: "Z. B. familientreffen", champ_mdp: "Anrufpasswort",
      consent_html: "Ich stimme zu, dass meine Stimme von meinem Gerät erkannt und der Text für diesen Anruf von einem Drittanbieter übersetzt wird. <a href=\"confidentialite.html\" target=\"_blank\" rel=\"noopener\">Datenschutzerklärung lesen (auf Französisch)</a>.",
      rejoindre: "Anruf beitreten", conseil: "Ein Headset verhindert, dass die Übersetzung vom Mikrofon aufgenommen wird.",
      reglages: "Einstellungen", langue_interface: "Oberflächensprache", vitesse: "Lesegeschwindigkeit",
      volume: "Lautstärke der Übersetzung", taille: "Untertitelgröße", taille_petite: "Klein",
      taille_normale: "Normal", taille_grande: "Groß", masquer: "Untertitel ausblenden",
      en_direct: "Live", participants: "Teilnehmer", compteur_un: "{n} Teilnehmer", compteur_plusieurs: "{n} Teilnehmer",
      ma_langue: "Meine Sprache", changer_langue: "Meine Sprache ändern", micro: "Mikro", reactiver: "Aktivieren",
      camera: "Kamera", quitter: "Verlassen", messages: "Übersetzte Nachrichten", commandes: "Anrufsteuerung",
      outils: "Anruf-Werkzeuge", copier_lien: "Link kopieren", qr: "QR-Code", reecouter: "Wiederholen",
      historique: "Verlauf", telecharger: "Herunterladen", historique_vide: "Noch keine Nachrichten.",
      qr_indisponible: "Der QR-Code kann ohne Verbindung nicht angezeigt werden.",
      lien_copie: "Link kopiert.", lien_manuel: "Diesen Link kopieren: ", moi: "Ich", participant: "Teilnehmer",
      traduction_indisponible: "(Übersetzung nicht verfügbar)", voix_native: "Telefonstimme", voix_defaut: "Standardstimme",
      st_nom_salle: "Gib deinen Namen und den Raumnamen ein.", st_mdp: "Gib das Anrufpasswort ein.",
      st_consent: "Stimme der Verarbeitung deiner Stimme zu, um beizutreten.",
      st_pas_reco: "Spracherkennung ist auf diesem Gerät nicht verfügbar. Nutze Chrome oder Edge.",
      st_micro_refuse: "Das Mikrofon ist blockiert. Erlaube es in den Geräteeinstellungen.",
      st_connexion: "Verbindung wird hergestellt...", st_serveur: "Der Server ist nicht erreichbar. Prüfe deine Verbindung.",
      st_mdp_faux: "Falsches Passwort.", st_trop: "Zu viele Versuche. Versuche es in ein paar Minuten erneut.",
      st_erreur_serveur: "Serververbindungsfehler.",
      st_echec: "Verbindung fehlgeschlagen. Prüfe dein Netzwerk und versuche es erneut.",
      st_parlez: "Sprich: Die anderen hören deine Nachricht in ihrer Sprache.",
      st_non_envoye: "Nachricht nicht gesendet. Prüfe deine Verbindung.",
      st_quota: "Tageslimit der Übersetzung erreicht: Nachrichten werden nicht mehr übersetzt.",
      st_rejoint: "{nom} ist dem Anruf beigetreten.", st_quitte: "{nom} hat den Anruf verlassen.",
      st_instable: "Instabile Verbindung: Verbindung wird wiederhergestellt...", st_reconnecte: "Wieder verbunden.",
      st_langue: "Deine Sprache ist jetzt: {langue}.", st_micro_on: "Mikro an.",
      st_micro_off: "Mikro stumm: Die anderen hören dich nicht mehr.",
      st_reco_arret: "Die Spracherkennung wurde beendet.", st_fin: "Anruf beendet.",
      st_camera_on: "Kamera an.", st_camera_off: "Kamera aus.", st_camera_err: "Die Kamera ist nicht verfügbar.",
    },
    ar: {
      reunions_bouton: "الاجتماعات", reunions_titre: "الاجتماعات المجدولة", reunions_a_venir: "القادمة", reunion_nouvelle: "جدولة اجتماع", reunion_titre_champ: "العنوان", reunion_date_champ: "التاريخ والوقت", reunion_duree_champ: "المدة", reunion_planifier: "جدولة", reunion_vide: "لا توجد اجتماعات قادمة.", reunion_rejoindre: "انضمام", reunion_calendrier: "إضافة إلى التقويم", reunion_creee: "تمت جدولة الاجتماع.", reunion_erreur: "تعذّر حفظ الاجتماع. تحقق من العنوان والتاريخ.", reunion_serveur: "خدمة الاجتماعات غير متاحة حاليًا.", reunion_retour: "رجوع",
      partager: "مشاركة", partage_texte: "انضم إلى مكالمتي «{salle}» في Appel traduit.", ouvrir_texte: "هذه الغرفة موجودة أيضًا في التطبيق.", ouvrir_appli: "فتح في التطبيق", telecharger_appli: "تنزيل التطبيق",
      maj_dispo: "يتوفر إصدار جديد.", maj_maintenant: "تحديث الآن", maj_plus_tard: "لاحقًا", maj_verifier: "التحقق من التحديثات", maj_a_jour: "أنت تستخدم أحدث إصدار.", maj_erreur: "تعذّر التحقق الآن.", maj_aucune: "لم يُنشر أي إصدار بعد.",
      reglage_theme: "المظهر", theme_nuit: "ليلي", theme_aurore: "شفق", theme_ocean: "محيط", theme_emeraude: "زمردي", theme_clair: "فاتح",
      titre: "مكالمة مترجمة", sous_titre: "تكلم لغتك، والجميع يفهم.",
      champ_nom: "اسمك", ex_nom: "مثال: أمينة", champ_langue: "لغتك", champ_voix: "صوت القراءة",
      champ_salle: "اسم الغرفة", ex_salle: "مثال: اجتماع-العائلة", champ_mdp: "كلمة مرور المكالمة",
      consent_html: "أوافق على أن يتعرف جهازي على صوتي، وأن يُترجم النص بواسطة خدمة خارجية، لهذه المكالمة فقط. <a href=\"confidentialite.html\" target=\"_blank\" rel=\"noopener\">سياسة الخصوصية (بالفرنسية)</a>.",
      rejoindre: "الانضمام إلى المكالمة", conseil: "سماعة الرأس تمنع التقاط الترجمة بواسطة الميكروفون.",
      reglages: "الإعدادات", langue_interface: "لغة الواجهة", vitesse: "سرعة القراءة",
      volume: "مستوى صوت الترجمة", taille: "حجم الترجمة المكتوبة", taille_petite: "صغير",
      taille_normale: "عادي", taille_grande: "كبير", masquer: "إخفاء الترجمة المكتوبة",
      en_direct: "مباشر", participants: "المشاركون", compteur_un: "مشارك واحد", compteur_plusieurs: "{n} مشاركين",
      ma_langue: "لغتي", changer_langue: "تغيير لغتي", micro: "الميكروفون", reactiver: "تشغيل",
      camera: "الكاميرا", quitter: "مغادرة", messages: "الرسائل المترجمة", commandes: "عناصر التحكم في المكالمة",
      outils: "أدوات المكالمة", copier_lien: "نسخ الرابط", qr: "رمز QR", reecouter: "إعادة الاستماع",
      historique: "السجل", telecharger: "تنزيل", historique_vide: "لا توجد رسائل بعد.",
      qr_indisponible: "لا يمكن عرض رمز QR بدون اتصال.",
      lien_copie: "تم نسخ الرابط.", lien_manuel: "انسخ هذا الرابط: ", moi: "أنا", participant: "مشارك",
      traduction_indisponible: "(الترجمة غير متاحة)", voix_native: "صوت الهاتف", voix_defaut: "الصوت الافتراضي",
      st_nom_salle: "أدخل اسمك واسم الغرفة.", st_mdp: "أدخل كلمة مرور المكالمة.",
      st_consent: "وافق على معالجة صوتك للانضمام إلى المكالمة.",
      st_pas_reco: "التعرف على الصوت غير متاح على هذا الجهاز. استخدم Chrome أو Edge.",
      st_micro_refuse: "الميكروفون محجوب. اسمح به من إعدادات الجهاز.",
      st_connexion: "جارٍ الاتصال...", st_serveur: "تعذر الوصول إلى الخادم. تحقق من اتصالك.",
      st_mdp_faux: "كلمة المرور غير صحيحة.", st_trop: "محاولات كثيرة. أعد المحاولة بعد دقائق.",
      st_erreur_serveur: "خطأ في الاتصال بالخادم.",
      st_echec: "تعذّر الاتصال. تحقق من شبكتك وأعد المحاولة.",
      st_parlez: "تكلم: سيسمع الآخرون رسالتك بلغتهم.",
      st_non_envoye: "لم تُرسل الرسالة. تحقق من اتصالك.",
      st_quota: "تم بلوغ حد الترجمة اليومي: لم تعد الرسائل تُترجم.",
      st_rejoint: "انضم {nom} إلى المكالمة.", st_quitte: "غادر {nom} المكالمة.",
      st_instable: "اتصال غير مستقر: جارٍ إعادة الاتصال...", st_reconnecte: "تمت إعادة الاتصال.",
      st_langue: "لغتك الآن: {langue}.", st_micro_on: "الميكروفون مفعّل.",
      st_micro_off: "الميكروفون مكتوم: لم يعد الآخرون يسمعونك.",
      st_reco_arret: "توقّف التعرف على الصوت.", st_fin: "انتهت المكالمة.",
      st_camera_on: "الكاميرا مفعّلة.", st_camera_off: "الكاميرا متوقفة.", st_camera_err: "الكاميرا غير متاحة.",
    },
  };

  const NOMS = { fr: "Français", en: "English", es: "Español", pt: "Português", de: "Deutsch", ar: "العربية" };
  const RTL = ["ar"];
  let courante = "fr";
  let auChangement = () => {};

  function codeInitial(preferee) {
    if (preferee && TEXTES[preferee]) return preferee;
    const navigateur = ((navigator.language || "fr") + "").slice(0, 2).toLowerCase();
    return TEXTES[navigateur] ? navigateur : "fr";
  }

  function t(cle, parametres) {
    const texte = (TEXTES[courante] && TEXTES[courante][cle]) || TEXTES.fr[cle] || cle;
    if (!parametres) return texte;
    return texte.replace(/\{(\w+)\}/g, (_, nom) => (parametres[nom] !== undefined ? parametres[nom] : ""));
  }

  // Applique les textes aux éléments marqués dans le HTML.
  function appliquer() {
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    document.documentElement.lang = courante;
    document.documentElement.dir = RTL.includes(courante) ? "rtl" : "ltr";
    document.title = t("titre");
  }

  function choisir(code) {
    if (!TEXTES[code]) return;
    courante = code;
    appliquer();
    auChangement(code);
  }

  function actuelle() { return courante; }

  // Liste des langues d'interface, nommées dans leur propre langue.
  function langues() {
    return Object.keys(TEXTES).map((code) => ({ code, nom: NOMS[code] }));
  }

  window.I18N = {
    t, appliquer, choisir, actuelle, langues, codeInitial,
    surChangement(fonction) { auChangement = fonction; },
  };
})();
