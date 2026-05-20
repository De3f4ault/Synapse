#!/usr/bin/env python3
"""
fix_qdrant_and_cache.py — One-off provisioning + model pre-download script.

Run this ONCE (or via `make download-models`) to:
1. Delete any existing Qdrant notes collections with the broken v2 schema
   (unnamed vectors), so they get auto-recreated with the correct v4 schema
   (named 'dense' + 'bm25') on the next search.
2. Pre-download all AI models into the shared .model_cache/ directory so the
   server starts in fully-offline mode without network calls.

   Models downloaded:
     • Qdrant/bm25  (fastembed sparse embedder, ~4 MB)

   The Nomic / cross-encoder models are loaded by sentence-transformers and
   are pre-cached by running their respective constructors (they respect
   SYNAPSE_MODEL_MODEL_CACHE_DIR automatically).

Usage:
    cd backend
    python scripts/fix_qdrant_and_cache.py
    # or
    make download-models

Safe to re-run — collection deletion and model caching are both idempotent.
"""

import os
import sys

# ---------------------------------------------------------------------------
# CRITICAL: Override the offline lock BEFORE any app module is imported.
# model_config.py sets HF_HUB_OFFLINE=1 and TRANSFORMERS_OFFLINE=1 at import
# time.  We need network access for this provisioning script, so we flip them
# back to "0" here.  This only affects THIS process — the running server is
# unaffected.
# ---------------------------------------------------------------------------
os.environ["HF_HUB_OFFLINE"] = "0"
os.environ["TRANSFORMERS_OFFLINE"] = "0"
os.environ["HF_DATASETS_OFFLINE"] = "0"
# Tell ModelConfig we are NOT in offline mode so local_files_only=False is used
os.environ["SYNAPSE_MODEL_OFFLINE_MODE"] = "false"

# Make app importable from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BROKEN_COLLECTION_SUFFIX = "_notes"   # target the notes collections specifically


def drop_broken_collections():
    """Delete all user notes collections so they get recreated with v4 schema."""
    print("\n─── Step 1: Drop broken Qdrant collections ───")
    try:
        from qdrant_client import QdrantClient
        from app.core.config import settings

        qdrant_url = getattr(settings, "QDRANT_URL", "http://localhost:6333")
        client = QdrantClient(url=qdrant_url)

        all_collections = client.get_collections().collections
        target = [
            c.name for c in all_collections
            if c.name.endswith(BROKEN_COLLECTION_SUFFIX)
        ]

        if not target:
            print("  ✓ No notes collections found — nothing to drop.")
            return

        for name in target:
            client.delete_collection(name)
            print(f"  ✗ Dropped: {name}")

        print(f"\n  ✓ Dropped {len(target)} collection(s).")
        print("  They will be auto-created with the v4 schema on the next search.\n")

    except Exception as e:
        print(f"  ✗ ERROR: {e}")
        print("  Is Qdrant running? Check QDRANT_URL in your .env")
        sys.exit(1)


def preload_sparse_embedder():
    """Force-download Qdrant/bm25 into the shared .model_cache/ directory."""
    print("─── Step 2: Pre-load sparse embedder (Qdrant/bm25) ───")
    try:
        from fastembed import SparseTextEmbedding
        from app.core.ai.rag.config.model_config import get_model_config

        config = get_model_config()
        cache_dir = config.model_cache_dir
        abs_cache_dir = os.path.abspath(cache_dir)

        print(f"  Cache directory : {abs_cache_dir}")
        print("  Downloading Qdrant/bm25 model (this may take 30–60 s on first run)…")

        model = SparseTextEmbedding(
            model_name="Qdrant/bm25",
            cache_dir=cache_dir,
            local_files_only=False,  # explicit: network allowed during provisioning
        )

        # Smoke test
        result = list(model.query_embed("test query"))
        assert result, "Model returned empty result"
        print(f"  ✓ Model loaded.  Sample sparse vector has {len(result[0].indices)} terms.")
        print(f"  ✓ Cached at: {abs_cache_dir}\n")

    except ImportError:
        print("  ✗ fastembed is not installed. Run: pip install fastembed")
        sys.exit(1)
    except Exception as e:
        print(f"  ✗ ERROR: {e}")
        sys.exit(1)


def verify_schema():
    """Quick verification that the schema generates named vectors."""
    print("─── Step 3: Verify v4 collection schema ───")
    try:
        from app.core.ai.rag.vector_store.qdrant.schema import get_collection_schema
        schema = get_collection_schema()

        assert "vectors_config" in schema, "Missing vectors_config"
        assert "dense" in schema["vectors_config"], "Missing 'dense' named vector"
        assert "sparse_vectors_config" in schema, "Missing sparse_vectors_config"
        assert "bm25" in schema["sparse_vectors_config"], "Missing 'bm25' sparse vector"

        print("  ✓ Schema verified: contains 'dense' + 'bm25' named vectors.")

    except Exception as e:
        print(f"  ✗ Schema verification failed: {e}")
        sys.exit(1)


def preload_colbert_embedder():
    """Download and smoke-test answerdotai/answerai-colbert-small-v1.

    Uses the same native transformers + safetensors loading path as
    colbert_embedder.py — no ragatouille, pylate, or colbert-ai required.

    What gets downloaded into .model_cache/:
        BERT backbone weights  (~134 MB, model.safetensors)
        Tokenizer files        (vocab.txt, tokenizer.json, tokenizer_config.json)
    The linear.weight projection head [96, 384] is in the same safetensors file.
    """
    print("─── Step 4: Pre-load ColBERT embedder (answerdotai/answerai-colbert-small-v1) ───")
    try:
        import torch
        import torch.nn.functional as F
        from transformers import AutoTokenizer, BertModel
        from safetensors import safe_open
        from app.core.ai.rag.config.model_config import get_model_config

        config = get_model_config()
        model_name = config.colbert_model_name   # answerdotai/answerai-colbert-small-v1
        cache_dir  = config.model_cache_dir
        abs_cache  = os.path.abspath(cache_dir)

        print(f"  Model         : {model_name}")
        print(f"  Cache directory: {abs_cache}")
        print("  Downloading tokenizer + BERT weights (~134 MB, first run only)…")

        # Step 4a: tokenizer
        tokenizer = AutoTokenizer.from_pretrained(
            model_name, cache_dir=cache_dir, local_files_only=False
        )
        print("  ✓ Tokenizer cached.")

        # Step 4b: BERT backbone
        bert = BertModel.from_pretrained(
            model_name,
            cache_dir=cache_dir,
            local_files_only=False,
            ignore_mismatched_sizes=True,
        )
        bert.eval()
        print("  ✓ BERT backbone cached.")

        # Step 4c: find safetensors and extract linear.weight
        slug = "models--" + model_name.replace("/", "--")
        snapshots_dir = os.path.join(cache_dir, slug, "snapshots")
        sha = sorted(os.listdir(snapshots_dir))[-1]
        safetensors_path = os.path.join(snapshots_dir, sha, "model.safetensors")

        with safe_open(safetensors_path, framework="pt", device="cpu") as f:
            linear_weight = f.get_tensor("linear.weight")  # [96, 384]

        assert list(linear_weight.shape) == [config.colbert_dim, 384], (
            f"Expected linear.weight shape [{config.colbert_dim}, 384], "
            f"got {list(linear_weight.shape)}"
        )
        print(f"  ✓ Projection head loaded: linear.weight {list(linear_weight.shape)}")

        # Step 4d: smoke test — forward pass
        enc = tokenizer("smoke test", return_tensors="pt", truncation=True,
                        max_length=config.colbert_max_seq_length)
        with torch.no_grad():
            hidden = bert(**enc).last_hidden_state.squeeze(0)   # (seq_len, 384)
            projected = F.linear(hidden, linear_weight)          # (seq_len, 96)
            normed = F.normalize(projected, p=2, dim=-1)         # (seq_len, 96)

        assert normed.shape[1] == config.colbert_dim, (
            f"Expected dim={config.colbert_dim}, got {normed.shape[1]}"
        )
        print(f"  ✓ Forward pass OK. Token matrix shape: {tuple(normed.shape)}  (should be (N, {config.colbert_dim}))")
        print(f"  ✓ Cached at: {abs_cache}\n")

    except ImportError as e:
        print(f"  ✗ Missing dependency: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"  ✗ ERROR: {e}")
        sys.exit(1)



if __name__ == "__main__":
    print("Synapse — Qdrant Provisioning & Embedder Pre-load")
    print("=" * 55)
    print("NOTE: Running in ONLINE mode (network access enabled for this script only)")
    print("=" * 55)

    drop_broken_collections()
    preload_sparse_embedder()
    verify_schema()
    preload_colbert_embedder()

    print("=" * 55)
    print("✓ All done. Restart the backend server.")
    print("")
    print("  The server will now start in offline mode using the cached models.")
    print(f"  Cache directory: {os.path.abspath('.model_cache')}")

