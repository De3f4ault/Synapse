"""Gemini Embedding API embedder.

Uses Google's gemini-embedding-001 model via the google-genai SDK.
Offloads embedding computation to Google's cloud GPUs — no local model needed.

Key advantages over local models:
  - No local GPU/CPU bottleneck (embeddings computed on Google TPUs)
  - Higher quality (MTEB ~68-70 at 768d vs ~65 for Nomic, ~63 for MiniLM)
  - Zero local RAM footprint (no 550MB model to load)
  - Matryoshka dimensionality (supports 768/1536/3072)

Trade-offs:
  - Requires internet connectivity
  - ~100-200ms latency per API call (vs ~29ms local)
  - API rate limits apply (free tier: 1,500 req/min)
"""

from typing import List, Optional, Union
import numpy as np
import structlog
import time

logger = structlog.get_logger(__name__)

# Gemini task types for optimal embedding quality
_TASK_DOCUMENT = "RETRIEVAL_DOCUMENT"
_TASK_QUERY = "RETRIEVAL_QUERY"

# Batch limits for Gemini embedding API
_MAX_BATCH_SIZE = 100  # API limit per call


class GeminiEmbedder:
    """
    Google Gemini Embedding API wrapper.

    Uses gemini-embedding-001 with configurable dimensionality.
    Supports task-type prefixing (RETRIEVAL_DOCUMENT vs RETRIEVAL_QUERY)
    for optimal asymmetric search performance.

    Performance:
    - API latency: ~100-200ms per batch (up to 100 texts)
    - 30,000 chunks: ~5-10 minutes (vs 7+ hours on CPU with Nomic)
    - Quality: MTEB ~68-70 at 768d
    """

    def __init__(
        self,
        model_name: str = "gemini-embedding-001",
        embedding_dim: int = 768,
        api_key: Optional[str] = None,
    ):
        """
        Initialize Gemini embedding client.

        Args:
            model_name: Gemini embedding model name
            embedding_dim: Output dimensionality (768, 1536, or 3072)
            api_key: Optional API key (defaults to settings.GEMINI_API_KEY)
        """
        from google import genai
        from app.core.config import settings

        self._api_key = api_key or settings.GEMINI_API_KEY
        self._client = genai.Client(api_key=self._api_key)
        self._model_name = model_name
        self._embedding_dim = embedding_dim

        logger.info(
            "gemini_embedder_initialized",
            model=model_name,
            dim=embedding_dim,
        )

    def encode(
        self,
        texts: Union[str, List[str]],
        batch_size: Optional[int] = None,
        normalize: Optional[bool] = None,
        show_progress: bool = False,
        prefix: Optional[str] = None,
        task_type: Optional[str] = None,
    ) -> np.ndarray:
        """
        Encode text(s) to embeddings via Gemini API.

        By default uses RETRIEVAL_DOCUMENT task type (optimized for indexing).
        Use encode_query() for search-time encoding.

        Args:
            texts: Single text or list of texts
            batch_size: Batch size per API call (max 100)
            normalize: Not used (Gemini returns normalized vectors)
            show_progress: Print progress for large batches
            prefix: Not used (Gemini uses task_type instead)
            task_type: Override task type (default: RETRIEVAL_DOCUMENT)

        Returns:
            numpy array of embeddings
        """
        from google.genai import types

        if isinstance(texts, str):
            texts = [texts]

        if batch_size is None:
            batch_size = min(len(texts), _MAX_BATCH_SIZE)
        else:
            batch_size = min(batch_size, _MAX_BATCH_SIZE)

        t_type = task_type or _TASK_DOCUMENT

        all_embeddings = []
        total_batches = (len(texts) + batch_size - 1) // batch_size

        for batch_idx in range(0, len(texts), batch_size):
            batch_texts = texts[batch_idx:batch_idx + batch_size]
            batch_num = batch_idx // batch_size + 1

            # Rate limiting: free tier = 100 req/min → 0.7s between calls
            if batch_num > 1:
                time.sleep(0.7)

            # Retry with exponential backoff (handles 429 RESOURCE_EXHAUSTED)
            max_retries = 3
            for attempt in range(max_retries + 1):
                try:
                    result = self._client.models.embed_content(
                        model=self._model_name,
                        contents=batch_texts,
                        config=types.EmbedContentConfig(
                            task_type=t_type,
                            output_dimensionality=self._embedding_dim,
                        ),
                    )

                    # Extract embedding vectors
                    batch_embeddings = [e.values for e in result.embeddings]
                    all_embeddings.extend(batch_embeddings)

                    if show_progress:
                        print(
                            f"   Batch {batch_num}/{total_batches} "
                            f"({len(all_embeddings)}/{len(texts)} texts)",
                            end="\r",
                        )
                    break  # Success — exit retry loop

                except Exception as e:
                    error_str = str(e)
                    if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                        # Rate limited — back off and retry
                        wait = 20 * (attempt + 1)  # 20s, 40s, 60s
                        logger.warning(
                            "gemini_rate_limited",
                            batch=batch_num,
                            attempt=attempt + 1,
                            wait_seconds=wait,
                        )
                        if show_progress:
                            print(
                                f"\n   ⏳ Rate limited — waiting {wait}s "
                                f"(attempt {attempt + 1}/{max_retries})..."
                            )
                        time.sleep(wait)
                        if attempt == max_retries:
                            logger.error("gemini_embed_max_retries", batch=batch_num)
                            raise
                    else:
                        logger.error(
                            "gemini_embed_batch_failed",
                            batch=batch_num,
                            error=error_str,
                        )
                        raise

        if show_progress:
            print()  # newline after \r

        return np.array(all_embeddings)

    def encode_query(
        self,
        query: str,
        normalize: bool = True,
    ) -> np.ndarray:
        """
        Encode a search query with RETRIEVAL_QUERY task type.

        Args:
            query: Search query text

        Returns:
            Query embedding as numpy array
        """
        return self.encode(
            [query],
            task_type=_TASK_QUERY,
        )[0]

    def get_query_embedding(self, query: str) -> np.ndarray:
        """Backward-compatible alias for encode_query."""
        return self.encode_query(query)

    @property
    def embedding_dim(self) -> int:
        """Get embedding dimensionality."""
        return self._embedding_dim

    @property
    def model_name(self) -> str:
        """Get model name."""
        return self._model_name
