FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

# Précharge le modèle Whisper pour éviter son téléchargement à chaque démarrage.
# Remplace "small" par la valeur de MODELE_WHISPER dans config.py.
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('small', compute_type='int8')"

COPY . .

CMD ["python", "agent.py", "start"]
