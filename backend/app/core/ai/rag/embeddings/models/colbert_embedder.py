"""
AnswerAIColBERTEmbedder — Late-interaction multivector encoder.

Loads answerdotai/answerai-colbert-small-v1 via native transformers + safetensors.
No additional packages required beyond what is already installed.

Architecture:
  BERT-small (12L, 384D hidden) + linear projection head (384 → 96D, no bias).
  The projection key in the safetensors file is `linear.weight` [96, 384].

Forward pass per token:
  token_emb = bert_hidden_state[token_i]           # (384,)
  colbert_emb = linear.weight @ token_emb           # (96,)
  colbert_emb = L2_normalize(colbert_emb)           # unit norm

encode_documents() returns List[List[List[float]]] — one matrix per chunk,
each matrix shape (num_tokens, 96).

encode_query() returns List[List[float]] — single (num_tokens, 96) matrix.

The singleton is process-local — each Celery worker child loads once.

Model download:
    Run `make download-models` (sets HF_HUB_OFFLINE=0 for the script only)
    to populate .model_cache/ before enabling ColBERT retrieval.
"""

from __future__ import annotations

import structlog
import os
from typing import List, Optional

import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, BertModel

logger = structlog.get_logger(__name__)


class AnswerAIColBERTEmbedder:
    """
    ColBERT late-interaction embedder — native transformers loader.

    Avoids ragatouille, pylate, and colbert-ai.  Uses:
    - transformers.BertModel  (BERT backbone, prefix key 'bert.*')
    - safetensors             (loads 'linear.weight' for projection)
    - torch.nn.functional     (L2 normalisation)

    Attributes:
        bert: BertModel instance.
        linear_weight: Projection tensor of shape [96, 384].
        tokenizer: BERT tokenizer.
        device: torch.device.
        max_seq_length: Hard truncation limit (299).
    """

    def __init__(self) -> None:
        from app.core.ai.rag.config.model_config import get_model_config
        from safetensors import safe_open

        config = get_model_config()
        model_name = config.colbert_model_name   # answerdotai/answerai-colbert-small-v1
        cache_dir = config.model_cache_dir
        device_str = config.colbert_device       # "cpu"
        self.max_seq_length = config.colbert_max_seq_length  # 299
        self._dim = config.colbert_dim           # 96

        logger.info(
            "colbert_embedder_loading",
            model=model_name,
            device=device_str,
            offline=config.offline_mode,
        )

        self.device = torch.device(device_str)

        # ── 1. Tokenizer ────────────────────────────────────────────────────────
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_name,
            cache_dir=cache_dir,
            local_files_only=config.offline_mode,
        )

        # ── 2. BERT backbone ─────────────────────────────────────────────────────
        # Load only the BERT weights from the safetensors file.
        # BertModel.from_pretrained() will pick up 'bert.*' keys and ignore 'linear.*'
        # (which has no match in BertModel's state dict and triggers a warning, but works).
        self.bert = BertModel.from_pretrained(
            model_name,
            cache_dir=cache_dir,
            local_files_only=config.offline_mode,
            ignore_mismatched_sizes=True,
        )
        self.bert.eval()
        self.bert.to(self.device)

        # ── 3. ColBERT projection head ───────────────────────────────────────────
        # Extract the single linear.weight tensor [96, 384] from the safetensors file.
        safetensors_path = self._find_safetensors(model_name, cache_dir)
        with safe_open(safetensors_path, framework="pt", device=device_str) as f:
            self.linear_weight = f.get_tensor("linear.weight")  # [96, 384]

        logger.info(
            "colbert_embedder_ready",
            model=model_name,
            projection=list(self.linear_weight.shape),
            max_seq_length=self.max_seq_length,
            dim=self._dim,
        )

    # ── Public interface ─────────────────────────────────────────────────────────

    def encode_documents(self, texts: List[str]) -> List[List[List[float]]]:
        """
        Encode document chunks into per-token 96D ColBERT matrices.

        Args:
            texts: List of chunk strings.

        Returns:
            List of matrices, one per text, each (num_tokens, 96) as Python lists.
        """
        return [self._encode_single(t) for t in texts]

    def encode_query(self, query: str) -> List[List[float]]:
        """
        Encode a query string into a per-token 96D ColBERT matrix.

        Args:
            query: User query string.

        Returns:
            Matrix (num_tokens, 96) as a Python list.
        """
        return self._encode_single(query)

    # ── Internal ─────────────────────────────────────────────────────────────────

    def _encode_single(self, text: str) -> List[List[float]]:
        """
        Encode one string → (num_tokens, 96) token matrix.

        Steps:
        1. Tokenize with truncation to max_seq_length.
        2. Forward through BERT → last_hidden_state (seq_len, 384).
        3. Apply linear projection: last_hidden_state @ linear_weight.T → (seq_len, 96).
        4. L2-normalise each token vector.
        5. Return as nested Python list (Qdrant-serialisable).
        """
        enc = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=self.max_seq_length,
            padding=False,
        ).to(self.device)

        with torch.no_grad():
            out = self.bert(**enc)
            hidden = out.last_hidden_state.squeeze(0)  # (seq_len, 384)

            # Apply projection: [seq_len, 384] @ [384, 96] → [seq_len, 96]
            projected = F.linear(hidden, self.linear_weight)  # [seq_len, 96]

            # L2-normalise per token
            normed = F.normalize(projected, p=2, dim=-1)       # [seq_len, 96]

        return normed.cpu().tolist()

    @staticmethod
    def _find_safetensors(model_name: str, cache_dir: str) -> str:
        """
        Locate the model.safetensors file in the HuggingFace cache layout.

        HF cache path:  {cache_dir}/models--{org}--{name}/snapshots/{sha}/model.safetensors
        """
        # Normalise: "answerdotai/answerai-colbert-small-v1" → "models--answerdotai--answerai-colbert-small-v1"
        slug = "models--" + model_name.replace("/", "--")
        snapshots_dir = os.path.join(cache_dir, slug, "snapshots")

        if not os.path.isdir(snapshots_dir):
            raise FileNotFoundError(
                f"Model snapshot not found at {snapshots_dir}. "
                "Run `make download-models` to cache the model."
            )

        # Take the most recent snapshot (there should only be one)
        sha_dirs = [
            d for d in os.listdir(snapshots_dir)
            if os.path.isdir(os.path.join(snapshots_dir, d))
        ]
        if not sha_dirs:
            raise FileNotFoundError(f"No snapshots found in {snapshots_dir}")

        sha = sorted(sha_dirs)[-1]  # latest by lexicographic order (sha1 hashes)
        candidate = os.path.join(snapshots_dir, sha, "model.safetensors")

        if not os.path.isfile(candidate):
            raise FileNotFoundError(f"model.safetensors not found at {candidate}")

        return candidate


# ── Process-local singleton ───────────────────────────────────────────────────

_colbert_embedder: Optional[AnswerAIColBERTEmbedder] = None


def get_colbert_embedder() -> AnswerAIColBERTEmbedder:
    """Return the process-local ColBERT embedder singleton, creating it if needed."""
    global _colbert_embedder
    if _colbert_embedder is None:
        _colbert_embedder = AnswerAIColBERTEmbedder()
    return _colbert_embedder
