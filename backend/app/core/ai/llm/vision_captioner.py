"""
VisionCaptioner — LLM-generated image captions for RAG surrounding_context.

Called by embed_image_task (Celery, sync context) immediately after image load,
before NomicVisionEmbedder encoding. Produces a factual 2-3 sentence description
of the image content that becomes the primary surrounding_context field in Qdrant.

Why this matters:
  - User-provided captions describe intent ("question about my DB") not content.
  - Filenames are often cryptic ("IMG_4021.heic").
  - LLM-generated captions describe what is *actually visible* — labels, diagrams,
    text, structure — producing correct Cross-Encoder matches at retrieval time.

Model choice: gemini-2.5-flash via direct litellm.completion() (sync).
  - Native vision: Gemini Flash accepts base64-encoded images in messages.
  - Fast: 2-4s for a captioning call, well within the ingestion task budget.
  - Reliable: Gemini Flash is the most stable vision model in the Synapse stack.
  - Sync-compatible: litellm.completion() works in Celery workers without asyncio.
  - NOT via LiteLLM Router: the Router is async-only (acompletion). Celery tasks
    are sync; spawning a new event loop for a single captioning call adds overhead
    and is fragile. Direct litellm call is the correct pattern here.

Failure contract:
  The caller (embed_image_task) wraps the call in try-except. If captioning fails
  for any reason (network, API quota, malformed image), the exception propagates
  to the caller which falls back to user caption or filename. The image is still
  indexed — with a weaker surrounding_context. Never blocks ingestion.
"""

import base64
import io
import structlog
from typing import Optional

logger = structlog.get_logger(__name__)

# Captioning prompt — structured to produce complete, retrieval-optimised descriptions.
# Key constraints:
#   1. Three complete sentences — forces full output even for simple images
#   2. Summarise text, don't transcribe — prevents poem/slide content flooding the caption
#   3. Focus on concepts, not aesthetic — aligns with cross-encoder matching needs
_CAPTION_PROMPT = (
    "You are a retrieval-optimised image captioning system for a study assistant. "
    "Describe this image in exactly 3 complete sentences. "
    "Sentence 1: State the image type and its overall subject "
    "(e.g. 'This is a hand-drawn diagram of the water cycle.'). "
    "Sentence 2: Describe the key visual elements — structure, labels, sections, or "
    "if the image contains text, summarise its topic and main message in your own words "
    "(do NOT transcribe or quote the text verbatim). "
    "Sentence 3: State the primary concept or subject-matter domain this image belongs to "
    "(e.g. 'The primary concept is cellular respiration in biology.'). "
    "Rules: Be specific and factual. Never speculate. No markdown, no bullet points, "
    "no preamble. Output only the 3 sentences."
)

# gemini-2.5-flash: primary vision model — native vision, fast (2-4s).
# This is intentionally NOT the Router alias — we need sync completion here.
_CAPTION_MODEL_PRIMARY = "gemini/gemini-2.5-flash"

# Fallback chain — tried in order when the primary returns 503/429.
# gemini-2.5-flash-lite: lighter variant, more available under load.
# gemini-1.5-flash: most stable Gemini vision model, rarely 503s.
# ollama/qwen3-vl:235b-cloud: cloud-routed via local Ollama endpoint —
#   zero separate API key, uses the same localhost:11434 base URL.
#   235B model gives high-quality captions comparable to Gemini Flash.
_CAPTION_MODEL_FALLBACKS = [
    "gemini/gemini-2.5-flash-lite",
    "gemini/gemini-1.5-flash",
    "ollama/qwen3-vl:235b-cloud",   # cloud-backed via Ollama, no extra key
]

# Ollama base URL — override via OLLAMA_BASE_URL env var if needed
_OLLAMA_BASE_URL = "http://localhost:11434"

# Kept for backward compat — callers that logged this value
_CAPTION_MODEL = _CAPTION_MODEL_PRIMARY

# Hard timeout for captioning. Ingestion task has a 300s soft limit.
# 20s budget leaves plenty of headroom for the NomicVisionEmbedder pass (~5s)
# and Qdrant upsert (~2s). Cloud-backed Ollama models are fast — same budget.
_CAPTION_TIMEOUT = 20


class VisionCaptioner:
    """
    Generates factual image captions via gemini-2.5-flash for RAG ingestion.

    Designed for synchronous Celery worker context. Thread-safe: stateless,
    all state is in the litellm call itself.

    Usage:
        captioner = VisionCaptioner()
        caption = captioner.generate_caption(pil_image)
        # Returns a string like:
        # "A network topology diagram showing three PostgreSQL nodes connected
        #  by bidirectional replication arrows. Labels indicate primary,
        #  replica-1, and replica-2 roles. A legend shows latency values."
    """

    def __init__(self) -> None:
        import os
        self._api_key = os.environ.get("GEMINI_API_KEY", "")
        if not self._api_key:
            logger.warning(
                "vision_captioner_no_api_key",
                message="GEMINI_API_KEY not set — captioning will fall back to filename",
            )

    def generate_caption(self, image: "PIL.Image.Image") -> str:  # type: ignore[name-defined]
        """
        Generate a factual caption for a PIL Image.

        Tries the primary model first. On ServiceUnavailableError or
        RateLimitError (503/429), falls back through _CAPTION_MODEL_FALLBACKS
        automatically. Only raises if ALL models fail — which allows the
        caller's three-tier fallback to use the user caption or filename.

        Args:
            image: PIL Image in any mode (RGB conversion done internally).

        Returns:
            Caption string (3 sentences). Never empty on success.

        Raises:
            Exception: All models failed. Caller handles fallback.
        """
        if not self._api_key:
            raise ValueError("GEMINI_API_KEY not configured")

        encoded = self._encode_image(image, max_side=1536)

        models_to_try = [_CAPTION_MODEL_PRIMARY] + _CAPTION_MODEL_FALLBACKS
        last_error: Exception = RuntimeError("No models attempted")

        for model in models_to_try:
            try:
                caption = self._call_model(model, encoded)
                if model != _CAPTION_MODEL_PRIMARY:
                    logger.info(
                        "vision_caption_fallback_succeeded",
                        primary=_CAPTION_MODEL_PRIMARY,
                        fallback=model,
                        caption_length=len(caption),
                    )
                return caption

            except Exception as e:
                err_str = str(e).lower()
                # Only fall through on availability / rate-limit / network errors.
                # Connection errors cover Ollama not running.
                retryable = (
                    "503" in err_str
                    or "429" in err_str
                    or "unavailable" in err_str
                    or "rate" in err_str
                    or "quota" in err_str
                    or "overloaded" in err_str
                    or "connection" in err_str
                    or "refused" in err_str
                    or "timeout" in err_str
                )
                if retryable:
                    logger.warning(
                        "vision_caption_model_unavailable",
                        model=model,
                        error=str(e)[:120],
                        next_model=models_to_try[models_to_try.index(model) + 1]
                        if model != models_to_try[-1]
                        else "none — giving up",
                    )
                    last_error = e
                    continue  # Try next model
                else:
                    # Auth errors, malformed images, etc. — don't retry
                    raise

        raise last_error

    def _call_model(self, model: str, encoded_image: str) -> str:
        """
        Send a single captioning request to the specified model.

        Handles both cloud (Gemini) and local (Ollama) models transparently:
        - Gemini models: pass api_key, standard base URL
        - Ollama models: pass api_base=localhost:11434, no api_key needed

        Args:
            model: LiteLLM model string (e.g. 'gemini/gemini-2.5-flash',
                   'ollama/qwen3-vl:4b').
            encoded_image: Base64-encoded JPEG string.

        Returns:
            Stripped caption text.

        Raises:
            Exception: Any litellm/API error. Caller decides whether to retry.
        """
        import litellm
        import os

        is_ollama = model.startswith("ollama/")
        base_url = os.environ.get("OLLAMA_BASE_URL", _OLLAMA_BASE_URL) if is_ollama else None
        timeout = _CAPTION_TIMEOUT

        kwargs = dict(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{encoded_image}",
                            },
                        },
                        {
                            "type": "text",
                            "text": _CAPTION_PROMPT,
                        },
                    ],
                }
            ],
            max_tokens=400,
            temperature=0.1,
            timeout=timeout,
        )

        if is_ollama:
            kwargs["api_base"] = base_url
        else:
            kwargs["api_key"] = self._api_key

        response = litellm.completion(**kwargs)

        caption = (response.choices[0].message.content or "").strip()
        if not caption:
            raise ValueError(f"Model {model} returned empty caption")

        logger.info(
            "vision_caption_generated",
            model=model,
            caption_length=len(caption),
            caption_preview=caption[:80],
        )
        return caption

    def _encode_image(self, image: "PIL.Image.Image", max_side: int = 1024) -> str:  # type: ignore[name-defined]
        """
        Resize image to max_side px on the longest axis, encode as base64 JPEG.

        Resizing is done in-memory — the source file on disk is not touched.
        """
        # Ensure RGB (no alpha channel for JPEG encoding)
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Resize if needed — preserve aspect ratio
        w, h = image.size
        if max(w, h) > max_side:
            scale = max_side / max(w, h)
            new_size = (int(w * scale), int(h * scale))
            from PIL import Image as PILImage
            image = image.resize(new_size, PILImage.LANCZOS)

        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=85)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")


# =============================================================================
# Singleton accessor
# =============================================================================

_captioner: Optional[VisionCaptioner] = None


def get_vision_captioner() -> VisionCaptioner:
    """
    Get the module-level VisionCaptioner singleton.

    Lazy-initialized on first call. Thread-safe for Celery prefork workers
    because each worker process has its own memory space.

    Returns:
        VisionCaptioner instance.
    """
    global _captioner
    if _captioner is None:
        _captioner = VisionCaptioner()
        logger.info("vision_captioner_initialized", model=_CAPTION_MODEL)
    return _captioner
