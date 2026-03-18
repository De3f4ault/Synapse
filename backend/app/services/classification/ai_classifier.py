"""
AI Document Classifier using Gemini zero-shot.

Classifies documents against user-defined correspondents, document types,
and tags without any training data. Replaces Paperless-ngx's scikit-learn
MLPClassifier with instant, zero-shot classification.

Sourced from Paperless-ngx: documents/classifier.py (547 lines).
Synapse advantage: No training step, works immediately on any domain.
"""

import json
import logging
from typing import Optional

logger = logging.getLogger("synapse.classifier")


class AIDocumentClassifier:
    """
    Zero-shot document classification using Gemini.

    Unlike Paperless's scikit-learn MLPClassifier (requires training data
    and periodic retraining via Celery Beat), this works immediately on
    any domain without training.

    Uses the document's text to classify against the user's defined
    correspondents, document types, and tags.

    Paperless equivalent: classifier.py DocumentClassifier (547 lines).
    """

    def _get_suggestion_text(self, text: str, max_length: int = 5000) -> str:
        """
        Crop text for classification prompt.

        Uses 80% from start + 20% from end (Paperless pattern).
        Preserves both opening context (headers, letterheads) and
        closing context (signatures, footers).

        Paperless reference: models.py Document.suggestion_content property.
        """
        if not text:
            return ""
        if len(text) <= max_length:
            return text
        head = int(max_length * 0.8)
        tail = max_length - head
        return text[:head] + "\n...\n" + text[-tail:]

    def _build_classification_prompt(
        self,
        text: str,
        correspondents: list[dict],
        doc_types: list[dict],
        tags: list[dict],
    ) -> str:
        """
        Build the zero-shot classification prompt.

        The prompt instructs Gemini to classify the document against
        user-defined categories and return structured JSON.
        """
        corr_names = [c["name"] for c in correspondents] if correspondents else []
        type_names = [t["name"] for t in doc_types] if doc_types else []
        tag_names = [t["name"] for t in tags] if tags else []

        return f"""You are a document classification assistant. Analyze the document content below and classify it.

AVAILABLE CATEGORIES:

Correspondents (sender/receiver of the document): {json.dumps(corr_names) if corr_names else "None defined"}
Document Types (kind of document): {json.dumps(type_names) if type_names else "None defined"}
Tags (labels to apply): {json.dumps(tag_names) if tag_names else "None defined"}

RULES:
- Only use names from the lists above. Do NOT invent new categories.
- For correspondent and document_type: pick the SINGLE best match, or null if none fits.
- For tags: pick ALL that apply (can be multiple), or empty list if none fits.
- Base your classification on the document content, not assumptions.

DOCUMENT CONTENT:
{text}

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{{"correspondent": "name or null", "document_type": "name or null", "tags": ["tag1", "tag2"]}}"""

    def _parse_result(
        self,
        raw_text: str,
        correspondents: list[dict],
        doc_types: list[dict],
        tags: list[dict],
    ) -> dict:
        """
        Parse the AI response into structured classification results.

        Resolves names back to IDs and validates against available categories.
        """
        result = {
            "correspondent_id": None,
            "document_type_id": None,
            "tag_ids": [],
            "raw_response": raw_text,
        }

        try:
            # Strip markdown code fences if present
            cleaned = raw_text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()

            data = json.loads(cleaned)
        except (json.JSONDecodeError, IndexError) as e:
            logger.warning("Failed to parse AI classification response: %s", e)
            return result

        # Resolve correspondent name → ID
        corr_name = data.get("correspondent")
        if corr_name and corr_name != "null":
            corr_map = {c["name"].lower(): c["id"] for c in correspondents}
            result["correspondent_id"] = corr_map.get(corr_name.lower())

        # Resolve document type name → ID
        type_name = data.get("document_type")
        if type_name and type_name != "null":
            type_map = {t["name"].lower(): t["id"] for t in doc_types}
            result["document_type_id"] = type_map.get(type_name.lower())

        # Resolve tag names → IDs
        tag_names = data.get("tags", [])
        if tag_names:
            tag_map = {t["name"].lower(): t["id"] for t in tags}
            result["tag_ids"] = [
                tag_map[name.lower()]
                for name in tag_names
                if name.lower() in tag_map
            ]

        return result

    async def classify(
        self,
        document_text: str,
        available_correspondents: list[dict],
        available_document_types: list[dict],
        available_tags: list[dict],
    ) -> dict:
        """
        Classify a document against available categories using Gemini.

        Args:
            document_text: The full text content of the document.
            available_correspondents: [{"id": int, "name": str}, ...]
            available_document_types: [{"id": int, "name": str}, ...]
            available_tags: [{"id": int, "name": str}, ...]

        Returns:
            {
                "correspondent_id": int | None,
                "document_type_id": int | None,
                "tag_ids": [int, ...],
                "raw_response": str,
            }
        """
        # Crop text for classification (Paperless 80% head + 20% tail)
        suggestion_text = self._get_suggestion_text(document_text)

        if not suggestion_text:
            logger.info("No document content to classify")
            return {
                "correspondent_id": None,
                "document_type_id": None,
                "tag_ids": [],
                "raw_response": "",
            }

        prompt = self._build_classification_prompt(
            suggestion_text,
            available_correspondents,
            available_document_types,
            available_tags,
        )

        try:
            from app.core.ai.providers.gemini import GeminiProvider
            from app.core.ai.providers.base import GenerationConfig

            provider = GeminiProvider()
            config = GenerationConfig(temperature=0.1, max_tokens=256)
            response = await provider.generate(prompt, config=config)

            result = self._parse_result(
                response.text,
                available_correspondents,
                available_document_types,
                available_tags,
            )

            logger.info(
                "AI classification: correspondent=%s, type=%s, tags=%s",
                result["correspondent_id"],
                result["document_type_id"],
                result["tag_ids"],
            )

            return result

        except Exception as e:
            logger.error("AI classification failed: %s", e, exc_info=True)
            return {
                "correspondent_id": None,
                "document_type_id": None,
                "tag_ids": [],
                "raw_response": "",
            }

    async def predict_correspondent(self, content: str) -> Optional[int]:
        """Compatibility method for matching engine integration."""
        # This is a simplified path — full classify() is preferred
        return None

    async def predict_document_type(self, content: str) -> Optional[int]:
        """Compatibility method for matching engine integration."""
        return None

    async def predict_tags(self, content: str) -> list[int]:
        """Compatibility method for matching engine integration."""
        return []

    async def predict_storage_path(self, content: str) -> Optional[int]:
        """Compatibility method for matching engine integration."""
        return None
