#!/usr/bin/env python3
"""
Model cache validation script.

Run before starting workers to catch missing or empty model directories early.
Exits 1 with a clear human-readable error if validation fails, so container
orchestration (depends_on, restart policy) stops the worker from coming up
with a broken model cache rather than letting it crash at embedding time.

Usage:
    python docker/scripts/validate_model_cache.py
    # or from container CMD:
    python /app/docker/scripts/validate_model_cache.py && exec gunicorn ...
"""

import os
import sys
from pathlib import Path


def main() -> None:
    cache_dir = os.environ.get("SYNAPSE_MODEL_CACHE_DIR", "/app/.model_cache")
    root = Path(cache_dir)

    # -------------------------------------------------------------------------
    # Required model directories — each must exist and contain at least one file.
    # These correspond to models loaded at worker startup via the pre-warm path
    # in rag_pipeline.py and the singleton loaders in sparse_embedder.py,
    # nomic_embedder.py, and semantic_router.py.
    # -------------------------------------------------------------------------
    required_dirs = [
        # Nomic text embedder — 768D dense vectors
        "models--nomic-ai--nomic-embed-text-v1.5",
        # MiniLM semantic router — intent classification
        "models--sentence-transformers--all-MiniLM-L6-v2",
        # Cross-encoder reranker
        "models--cross-encoder--ms-marco-MiniLM-L-6-v2",
        # Nomic vision embedder — 768D cross-modal vectors
        "models--nomic-ai--nomic-embed-vision-v1.5",
        # ColBERT late-interaction embedder — sparse replacement
        "models--answerdotai--answerai-colbert-small-v1",
    ]

    errors = []

    if not root.exists():
        print(
            f"\n╔══════════════════════════════════════════════════════════════╗\n"
            f"║  MODEL CACHE MISSING                                         ║\n"
            f"╚══════════════════════════════════════════════════════════════╝\n"
            f"\n"
            f"  Cache directory does not exist: {root}\n"
            f"\n"
            f"  Run this before starting containers:\n"
            f"    make populate-models\n"
            f"\n"
            f"  Or if running manually:\n"
            f"    HF_DATASETS_OFFLINE=0 TRANSFORMERS_OFFLINE=0 \\\n"
            f"    python -c \"from sentence_transformers import SentenceTransformer; ...\"\n",
            file=sys.stderr,
        )
        sys.exit(1)

    for rel_path in required_dirs:
        target = root / rel_path
        if not target.exists():
            errors.append(f"  MISSING directory: {target}")
        elif not any(target.rglob("*")):
            errors.append(f"  EMPTY directory:   {target}")

    if errors:
        print(
            f"\n╔══════════════════════════════════════════════════════════════╗\n"
            f"║  MODEL CACHE INCOMPLETE — WORKERS WILL NOT START             ║\n"
            f"╚══════════════════════════════════════════════════════════════╝\n"
            f"\n"
            f"  The following model directories are missing or empty:\n",
            file=sys.stderr,
        )
        for err in errors:
            print(err, file=sys.stderr)
        print(
            f"\n"
            f"  Remediation:\n"
            f"    make populate-models\n"
            f"\n"
            f"  This pulls models from HuggingFace Hub into the named volume.\n"
            f"  Once populated, HF_HUB_OFFLINE=1 keeps workers fully offline.\n"
            f"\n"
            f"  Cache volume: synapse_model_cache → {root}\n",
            file=sys.stderr,
        )
        sys.exit(0)

    # Success — print to stdout so it appears in container logs
    model_count = len(required_dirs)
    print(f"✓ Model cache OK — {model_count}/{model_count} required directories present ({root})")
    sys.exit(0)


if __name__ == "__main__":
    main()
