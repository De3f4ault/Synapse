"""
Learning Signal Extraction — Signal models + LLM-based extraction.

Extracts structured learning signals from agent conversations to close
the mastery feedback loop:

    Conversation → LLMExtractor → LearningSignal[] → Celery task → concept_mastery

The extractor runs inside a Celery task (not in the SSE stream) so the
student's response time is never affected by extraction latency.
"""

from __future__ import annotations

import json
import structlog
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel

logger = structlog.get_logger(__name__)


# ── Signal Models ─────────────────────────────────────────────────────────


class LearningSignal(BaseModel):
    """One atomic learning event extracted from a conversation."""

    signal_type: Literal[
        "concept_introduced",
        "concept_reinforced",
        "gap_detected",
        "mastery_demonstrated",
    ]
    concept: str  # e.g., "PostgreSQL MVCC"
    depth: Literal["surface", "applied", "deep"] = "surface"
    confidence: float = 0.7  # 0.0–1.0, how confident the extraction is
    evidence: str = ""  # The message content that triggered this signal


class LearningSignalExtraction(BaseModel):
    """All signals from one conversation turn."""

    signals: List[LearningSignal]
    session_id: int
    user_id: int
    extracted_at: datetime


# ── Extractor Interface ──────────────────────────────────────────────────


class SignalExtractor(ABC):
    """Base interface for signal extraction strategies."""

    @abstractmethod
    async def extract(
        self, messages: List[Dict[str, Any]]
    ) -> List[LearningSignal]:
        """
        Extract learning signals from a conversation.

        Args:
            messages: List of message dicts (model_dump'd AgentMessage objects,
                      with SystemMessages already filtered out).

        Returns:
            List of validated LearningSignal objects.
        """
        ...


# ── LLM Extractor ────────────────────────────────────────────────────────


class LLMExtractor(SignalExtractor):
    """
    LLM-based signal extraction using gemini-2.5-flash-lite.

    Runs inside Celery (never on the SSE critical path).
    ~300ms, ~500 tokens per extraction.
    """

    SYSTEM_PROMPT = """You are a learning analytics system.
Analyze this conversation and extract learning signals.

Return ONLY valid JSON matching this schema:
{
  "signals": [
    {
      "signal_type": "concept_introduced|concept_reinforced|gap_detected|mastery_demonstrated",
      "concept": "specific concept name (e.g. 'PostgreSQL MVCC', not 'databases')",
      "depth": "surface|applied|deep",
      "confidence": 0.0-1.0,
      "evidence": "brief quote from conversation that supports this signal"
    }
  ]
}

Rules:
- Concepts must be specific and nameable, not vague ("PostgreSQL transactions" not "databases")
- Only extract concepts actually discussed in depth, not mentioned in passing
- gap_detected means the student showed confusion or asked for clarification
- mastery_demonstrated means the student correctly applied or extended a concept
- Ignore meta-conversation ("let us build on this", "thank you", etc.)
- Maximum 5 signals per extraction
- If nothing meaningful was learned, return {"signals": []}
"""

    # Post-LLM validation — catches hallucinated or vague concepts
    NOISE_CONCEPTS = frozenset({
        "this", "that", "it", "topic", "concept", "subject", "thing",
        "stuff", "content", "new chat", "proceed", "untitled", "chat",
    })
    MIN_CONCEPT_LENGTH = 4
    MIN_CONFIDENCE = 0.5

    # Fallback chain — (model_id, suppress_thinking).
    # suppress_thinking=True always — this task never benefits from reasoning.
    # /no_think is an Ollama directive; non-thinking models ignore it harmlessly.
    # This makes the intent explicit: no reasoning phase, on any model, ever.
    EXTRACTION_MODELS: List[tuple] = [
        ("gemini/gemini-2.5-flash-lite", False),    # Gemini has no /no_think directive
        ("ollama/qwen3-next:80b-cloud", True),       # Qwen3 thinking — suppressed via /no_think
        ("ollama/gemma4:31b-cloud", True),           # Thinking-capable — suppressed
    ]

    async def extract(
        self, messages: List[Dict[str, Any]]
    ) -> List[LearningSignal]:
        """Extract signals with automatic model fallback."""
        conversation = self._format_for_extraction(messages)

        if not conversation.strip():
            return []

        last_error: Optional[Exception] = None

        for model, suppress_thinking in self.EXTRACTION_MODELS:
            try:
                signals = await self._try_model(model, conversation, suppress_thinking)
                if signals is not None:
                    return signals
            except Exception as e:
                last_error = e
                logger.warning(
                    "llm_extraction_model_failed",
                    model=model,
                    error=str(e),
                )
                continue  # Try next model

        logger.warning(
            "llm_extraction_all_models_failed",
            models=[m for m, _ in self.EXTRACTION_MODELS],
            last_error=str(last_error),
            fallback="returning empty signals",
        )
        return []  # Graceful degradation — never crash the Celery task

    async def _try_model(
        self, model: str, conversation: str, suppress_thinking: bool = False
    ) -> Optional[List[LearningSignal]]:
        """
        Attempt extraction with a single model.

        Args:
            model: LiteLLM model string (e.g. "ollama/gemma4:31b-cloud")
            conversation: Formatted conversation text
            suppress_thinking: If True, prepends /no_think to the user message.
                               Use for Ollama thinking-capable models (Gemma4,
                               Qwen3) to skip the reasoning phase entirely.

        Returns:
            List of valid signals on success, None on unusable output.
        Raises:
            Exception if the model call fails (triggers fallback to next model).
        """
        import litellm

        user_content = conversation
        if suppress_thinking:
            # Ollama directive — tells the model to skip its thinking phase
            # and produce the response directly. Prevents 15s+ timeouts.
            user_content = f"/no_think\n{conversation}"

        response = await litellm.acompletion(
            model=model,
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            max_tokens=800,
            temperature=0.1,
            response_format={"type": "json_object"},
            timeout=18,  # Per-model ceiling: 3 × 18s = 54s < task soft_time_limit(75s)
        )

        raw = response.choices[0].message.content
        if not raw:
            return None

        # Strip markdown fences — some Ollama models ignore response_format
        # and wrap output in ```json ... ``` blocks despite being asked for raw JSON.
        stripped = raw.strip()
        if stripped.startswith("```"):
            # Remove opening fence (```json or ```) and closing fence (```)
            lines = stripped.split("\n")
            # Drop first line (the fence) and last line if it's a closing fence
            inner = lines[1:]
            if inner and inner[-1].strip() == "```":
                inner = inner[:-1]
            stripped = "\n".join(inner).strip()

        try:
            data = json.loads(stripped)
        except json.JSONDecodeError as e:
            logger.warning(
                "llm_extraction_invalid_json",
                model=model,
                error=str(e),
                raw_preview=raw[:120],
            )
            raise  # Re-raise — triggers fallback to next model
        signals: List[LearningSignal] = []

        for s in data.get("signals", []):
            try:
                signal = LearningSignal(**s)
                if self._is_valid(signal):
                    signals.append(signal)
            except Exception:
                continue

        logger.info(
            "llm_extraction_completed",
            model=model,
            thinking_suppressed=suppress_thinking,
            raw_signals=len(data.get("signals", [])),
            valid_signals=len(signals),
        )

        return signals

    def _format_for_extraction(
        self, messages: List[Dict[str, Any]]
    ) -> str:
        """
        Condense the conversation for extraction.

        Includes tool call queries as explicit signals — they're the
        cleanest indicator of what concept was being addressed.
        """
        lines: List[str] = []

        for msg in messages:
            role = msg.get("role", "")

            if role == "user":
                content = msg.get("content", "")
                lines.append(f"STUDENT: {content[:300]}")

            elif role == "assistant":
                # Include tool queries as explicit signals
                tool_calls = msg.get("tool_calls") or []
                for tc in tool_calls:
                    func_info = tc.get("function", {})
                    args_str = func_info.get("arguments", "{}")
                    try:
                        parsed = json.loads(args_str) if isinstance(args_str, str) else args_str
                        query = parsed.get("query", "")
                        if query:
                            lines.append(f"AGENT SEARCHED: {query}")
                    except Exception:
                        pass

                # Include response but truncated
                content = msg.get("content", "")
                if content:
                    lines.append(f"TUTOR: {content[:500]}")

            elif role == "tool":
                # Tool results hint at what data was found
                content = msg.get("content", "")
                if content and len(content) > 20:
                    lines.append(f"TOOL RESULT: {content[:200]}")

        return "\n".join(lines)

    def _is_valid(self, signal: LearningSignal) -> bool:
        """Post-LLM validation — catches hallucinated or vague concepts."""
        if len(signal.concept) < self.MIN_CONCEPT_LENGTH:
            return False
        if signal.confidence < self.MIN_CONFIDENCE:
            return False
        if signal.concept.lower() in self.NOISE_CONCEPTS:
            return False
        # Reject pure conversational phrases
        lower = signal.concept.lower()
        if lower.startswith(("let us", "build on", "continue", "please", "thank")):
            return False
        return True
