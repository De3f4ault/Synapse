"""Nomic Embed Vision v1.5 — image embedding model.

Official implementation per https://huggingface.co/nomic-ai/nomic-embed-vision-v1.5

Uses AutoImageProcessor + AutoModel from transformers (NOT SentenceTransformer).
SentenceTransformer cannot load this model correctly — it creates a wrong
mean-pooling wrapper instead of the actual vision encoder.

The model produces 768D vectors via CLS-token extraction + L2 normalisation,
in the SAME latent space as nomic-embed-text-v1.5.  A text query prefixed with
"search_query:" will retrieve image vectors and vice-versa without any separate
cross-modal index.

Sprint 1: handles user-uploaded images only.
Sprint 3: PDF page/diagram extraction pipeline will also use this.
"""

from typing import List, Optional
import numpy as np
import structlog

from app.core.ai.rag.config.model_config import ModelConfig

logger = structlog.get_logger(__name__)

_MODEL_ID = "nomic-ai/nomic-embed-vision-v1.5"
_EMBEDDING_DIM = 768


class NomicVisionEmbedder:
    """
    nomic-embed-vision-v1.5 image embedding model.

    Canonical usage (from official model card):
        processor = AutoImageProcessor.from_pretrained(model_id)
        model     = AutoModel.from_pretrained(model_id, trust_remote_code=True)
        inputs    = processor(image, return_tensors="pt")
        emb       = model(**inputs).last_hidden_state
        vec       = F.normalize(emb[:, 0], p=2, dim=1)  # CLS token

    Features:
    - 768D — same space as nomic-embed-text-v1.5
    - trust_remote_code=True required (custom NomicBERT architecture)
    - Input: PIL Image objects (any mode; RGB conversion done internally)
    - CLS-token pooling (NOT mean pooling)
    - L2 normalised output

    Performance (CPU, i5-8365U):
    - Single image: ~200-500ms (ViT forward pass)
    - Batch (4):    ~700-1200ms (~175-300ms per image)
    """

    def __init__(self, config: Optional[ModelConfig] = None):
        """
        Initialise nomic-embed-vision-v1.5 using the transformers AutoModel API.

        Args:
            config: ModelConfig for device, cache_dir, offline_mode settings.
        """
        if config is None:
            from app.core.ai.rag.config.model_config import get_model_config
            config = get_model_config()

        self.config = config
        self._embedding_dim = _EMBEDDING_DIM

        logger.info(
            "loading_vision_embedding_model",
            model=_MODEL_ID,
            device=config.embedding_device,
        )

        # Deferred imports — torch takes ~12s to import.
        import torch
        import torch.nn.functional as F
        from transformers import AutoImageProcessor, AutoModel

        self._torch = torch
        self._F = F

        cache_dir = config.model_cache_dir

        self._processor = AutoImageProcessor.from_pretrained(
            _MODEL_ID,
            cache_dir=cache_dir,
            local_files_only=config.offline_mode,
        )
        self._model = AutoModel.from_pretrained(
            _MODEL_ID,
            trust_remote_code=True,   # Required for NomicBERT vision architecture
            cache_dir=cache_dir,
            local_files_only=config.offline_mode,
        )
        self._model.eval()

        # Move to configured device
        self._device = config.embedding_device
        self._model = self._model.to(self._device)

        if self._device == "cpu":
            torch.set_num_threads(config.num_threads)

        logger.info(
            "vision_embedding_model_loaded",
            model=_MODEL_ID,
            dim=_EMBEDDING_DIM,
            device=self._device,
        )

    def encode(
        self,
        images: list,  # List[PIL.Image.Image]
        normalize: bool = True,
        batch_size: Optional[int] = None,
    ) -> np.ndarray:
        """
        Encode PIL Image(s) to 768D embeddings.

        Implementation follows the official model card exactly:
          inputs  = processor(image, return_tensors="pt")
          emb     = model(**inputs).last_hidden_state
          vec     = F.normalize(emb[:, 0], p=2, dim=1)   # CLS token

        Args:
            images:     List of PIL Image objects (any mode — converted to RGB).
            normalize:  L2-normalise the output (default True, matches Nomic docs).
            batch_size: Images per forward pass. None = all at once.

        Returns:
            numpy array of shape (len(images), 768), dtype float32.
        """
        import torch

        if not images:
            return np.zeros((0, _EMBEDDING_DIM), dtype=np.float32)

        bs = batch_size or len(images)
        all_embeddings = []

        for i in range(0, len(images), bs):
            batch = images[i : i + bs]

            # Convert to RGB — processor expects RGB regardless of source mode
            batch_rgb = [
                img.convert("RGB") if img.mode != "RGB" else img
                for img in batch
            ]

            inputs = self._processor(images=batch_rgb, return_tensors="pt")
            inputs = {k: v.to(self._device) for k, v in inputs.items()}

            with torch.no_grad():
                outputs = self._model(**inputs)
                # CLS token (index 0) — this is the image embedding per model card
                cls_embeddings = outputs.last_hidden_state[:, 0, :]

                if normalize:
                    cls_embeddings = self._F.normalize(cls_embeddings, p=2, dim=1)

            all_embeddings.append(cls_embeddings.cpu().float().numpy())

        result = np.concatenate(all_embeddings, axis=0)

        logger.debug(
            "vision_embeddings_encoded",
            count=len(images),
            dim=result.shape[1],
            normalized=normalize,
        )

        return result

    @property
    def embedding_dim(self) -> int:
        return self._embedding_dim

    @property
    def model_name(self) -> str:
        return _MODEL_ID


# Process-wide singleton
_vision_embedder: Optional[NomicVisionEmbedder] = None


def get_vision_embedder() -> NomicVisionEmbedder:
    """
    Return the process-wide NomicVisionEmbedder singleton.

    Thread-safe via Python's GIL — only one thread constructs the singleton.
    Model is ~370MB; construction is deferred until the first image is uploaded.
    """
    global _vision_embedder
    if _vision_embedder is None:
        logger.info("vision_embedder_singleton_init", reason="first_access")
        _vision_embedder = NomicVisionEmbedder()
    return _vision_embedder
