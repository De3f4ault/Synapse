# =============================================================================
# Synapse Backend — API and Celery Workers
# =============================================================================
# Single image; the CMD is overridden in docker-compose.yml for each container:
#   api:        gunicorn with validate_model_cache.py preflight
#   worker-cpu: celery -Q documents,embeddings (CPU-bound)
#   worker-io:  celery -Q io,webhooks,default (I/O-bound)
#   beat:       celery beat
#   migrate:    alembic upgrade head (init container, exits 0 when done)
# =============================================================================

FROM python:3.11-slim

LABEL maintainer="synapse" \
      description="Synapse Backend — API and Celery Workers"

# ── Python runtime flags ──────────────────────────────────────────────────────
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    # Workers must be fully offline — models are pre-populated in the named volume.
    # Disabling download prevents a missing model from silently falling back to
    # a network download that hangs for 30s before failing on a cold start.
    HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1 \
    # Suppress tokenizer parallelism warnings (we manage concurrency ourselves)
    TOKENIZERS_PARALLELISM=false \
    # pip: no version nag
    # NOTE: PIP_NO_CACHE_DIR is intentionally NOT set here.
    # Keeping pip's wheel cache active means Docker can reuse the cached pip
    # layer on rebuild whenever requirements.txt has NOT changed.
    # The cache dir lives only in the build layer — not in the running container.
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# ── System dependencies ───────────────────────────────────────────────────────
# build-essential: compile Python C extensions (psycopg2, lxml, etc.)
# libpq-dev:       libpq headers for psycopg2-binary fallback builds
# curl:            healthcheck in docker-compose.yml
# poppler-utils:   PDF parsing (pdftotext used by DocumentProcessor)
# tesseract-ocr:   OCR fallback for scanned documents
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    poppler-utils \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ───────────────────────────────────────────────────────
# LAYER CACHE STRATEGY:
#   requirements.txt is copied ALONE before app code so this heavy pip layer
#   is only re-executed when requirements.txt changes — not on every code edit.
#   --no-cache-dir keeps the final image lean (no pip wheel cache in the image).
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Application code ──────────────────────────────────────────────────────────
# .dockerignore must exclude: .env, .env.*, __pycache__, .git, .model_cache
# No secrets should enter this image layer.
COPY . .

# ── Non-root user ─────────────────────────────────────────────────────────────
# Runs as uid 1001. Volume mounts (synapse_data, synapse_model_cache) must be
# writable by this user. If you hit permission errors, set the volume owner:
#   docker compose run --rm --user root api chown -R 1001:1001 /data /app/.model_cache
RUN groupadd --gid 1001 synapse \
    && useradd --uid 1001 --gid synapse --no-create-home --shell /bin/bash synapse \
    && chown -R synapse:synapse /app

USER synapse

EXPOSE 8000

# ── Default command: validate model cache then start API ─────────────────────
# Overridden per-service in docker-compose.yml.
# validate_model_cache.py exits 1 with a clear remediation message if any
# required model directory is missing — preventing silent crash at first request.
CMD ["sh", "-c", \
     "python docker/scripts/validate_model_cache.py && \
      exec gunicorn app.main:app -c config/gunicorn.conf.py"]
