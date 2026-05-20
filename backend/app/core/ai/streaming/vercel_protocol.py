"""
Vercel AI SDK — UI Message Stream Protocol (v1) Formatter.

Converts the Synapse orchestrator's internal chunk format into the Vercel AI SDK
UI Message Stream Protocol, which uses Server-Sent Events (SSE) with typed JSON
payloads. This enables the frontend to use `useChat` from `@ai-sdk/react` to
consume the stream directly.

Protocol Reference:
    https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol#data-stream-protocol

The protocol uses SSE format:
    data: {"type":"<part-type>", ...}\n\n

Part Types Implemented:
    - start             → Message start with metadata
    - text-start/delta/end → Streamed text content
    - reasoning-start/delta/end → Thinking/reasoning content
    - tool-input-start  → Tool call initiation
    - tool-input-available → Tool call args ready
    - tool-output-available → Tool execution result
    - source-url        → Grounding source citation
    - data-*            → Custom data parts (title updates, routing info, etc.)
    - data-mention-status → { injected, resolution_failures, budget_overflows }
    - error             → Error notification
    - start-step        → Step boundary (for multi-turn tool loops)
    - finish-step       → Step completion
    - finish            → Message completion
    - [DONE]            → Stream termination
"""

import json
import uuid
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, List, Optional


# ── RAG tool names whose results yield inline citations ───────────────────────
_RAG_TOOL_NAMES = {"search_notes", "search_flashcards", "analyze_document"}

_MODULE_MAP = {
    "search_notes": ("notes", "📝 Notes"),
    "search_flashcards": ("flashcards", "🃏 Flashcards"),
    "analyze_document": ("documents", "📄 Documents"),
}


def _extract_rag_citations(tool_name: str, tool_result: dict) -> List[dict]:
    """
    Extract normalised citations from a RAG tool result.

    Each citation matches the numbered context the LLM sees, so ``citations[0]``
    corresponds to ``[1]`` in the model's output.

    Returns an empty list for non-RAG tools or empty results.
    """
    if tool_name not in _RAG_TOOL_NAMES:
        return []

    data = tool_result.get("data", {})
    module, module_label = _MODULE_MAP.get(tool_name, ("unknown", "📎 Source"))

    citations: List[dict] = []

    if tool_name == "search_notes":
        for idx, r in enumerate(data.get("results", []), start=1):
            title = r.get("title", "Untitled")
            citations.append({
                "id": str(idx),
                "title": title,
                "label": f"{module_label} · {title}",
                "module": module,
                "excerpt": r.get("snippet") or r.get("full_content", "")[:300],
            })

    elif tool_name == "search_flashcards":
        for idx, card in enumerate(data.get("cards", []), start=1):
            deck = card.get("deck_name", "Flashcards")
            front = card.get("front", "")
            back = card.get("back", "")
            citations.append({
                "id": str(idx),
                "title": f"{deck}: {front[:60]}",
                "label": f"{module_label} · {deck}",
                "module": module,
                "excerpt": f"Q: {front}\nA: {back}",
            })

    elif tool_name == "analyze_document":
        for idx, passage in enumerate(data.get("relevant_passages", []), start=1):
            page = passage.get("page")
            page_label = f" (p.{page})" if page else ""
            text = passage.get("text", "")[:300]
            citations.append({
                "id": str(idx),
                "title": f"Document{page_label}",
                "label": f"{module_label}{page_label}",
                "module": module,
                "excerpt": text,
            })

    return citations


def _sse(payload: dict) -> str:
    """Format a dict as a single SSE data line."""
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _sse_done() -> str:
    """Emit the stream termination marker."""
    return "data: [DONE]\n\n"


import re as _re

# Languages that get extracted from text and re-emitted as SDK data parts
_INTERCEPTED_FENCE_LANGUAGES = {"mermaid", "synapse-flashcards", "synapse-quiz"}


class CodeFenceInterceptor:
    """
    Watches the accumulating text stream and intercepts special code fences,
    re-emitting them as typed SDK data parts instead of raw text.

    Intercepted languages → data part:
        mermaid              → data-mermaid   { diagram: str }
        synapse-flashcards   → data-artifact  { artifact_type: 'flashcard_set', payload: ... }
        synapse-quiz         → data-artifact  { artifact_type: 'quiz', payload: ... }

    Everything else flows through as normal text-delta events.
    """

    # Matches a COMPLETE code fence: ```language\n...content...\n```
    _COMPLETE_FENCE = _re.compile(
        r"```(mermaid|synapse-flashcards|synapse-quiz)\n([\s\S]*?)```",
        _re.MULTILINE,
    )

    def __init__(self):
        self._pending = ""  # Accumulated but not-yet-emitted text

    def feed(self, token: str) -> list[dict]:
        """
        Feed a new text token. Returns a list of SSE payloads to emit.

        Each payload is one of:
          {"_type": "text", "delta": str}          → becomes text-delta
          {"_type": "data-mermaid", "data": {...}} → becomes data-mermaid part
          {"_type": "data-artifact", "data": {...}} → becomes data-artifact part
        """
        self._pending += token
        return self._flush(complete=False)

    def flush(self) -> list[dict]:
        """Flush all remaining buffered text at stream end."""
        return self._flush(complete=True)

    def _flush(self, complete: bool) -> list[dict]:
        results: list[dict] = []
        buf = self._pending

        while True:
            match = self._COMPLETE_FENCE.search(buf)
            if not match:
                break

            # Emit text before the fence
            before = buf[: match.start()]
            if before:
                results.append({"_type": "text", "delta": before})

            lang = match.group(1)
            content = match.group(2).strip()
            results.append(self._build_data_part(lang, content))

            buf = buf[match.end():]

        # If complete (stream ended), emit every remaining character as text.
        # If still streaming, hold back only enough chars to detect a fence opening.
        if complete:
            if buf:
                results.append({"_type": "text", "delta": buf})
            self._pending = ""
        else:
            # We only need to hold back up to the longest possible fence opener:
            # "```synapse-flashcards\n" = 22 chars — anything before that is safe to emit.
            _LOOKAHEAD = 24

            last_fence_start = buf.rfind("```")
            if last_fence_start != -1:
                # There's a potential fence start — hold back from that point onward
                safe_prefix = buf[:last_fence_start]
                self._pending = buf[last_fence_start:]
            else:
                # No fence start at all — safe to emit all but the last _LOOKAHEAD chars
                # (in case the next token completes "```")
                safe_cutoff = max(0, len(buf) - _LOOKAHEAD)
                safe_prefix = buf[:safe_cutoff]
                self._pending = buf[safe_cutoff:]

            if safe_prefix:
                results.append({"_type": "text", "delta": safe_prefix})

        return results

    @staticmethod
    def _build_data_part(lang: str, content: str) -> dict:
        artifact_id = f"artifact_{uuid.uuid4().hex[:12]}"

        if lang == "mermaid":
            # Sanitize: AI models often inject <br/> into mermaid labels
            # Replace with space — newlines inside labels break the parser
            clean_content = _re.sub(r"<br\s*/?>", " ", content)
            clean_content = _re.sub(r"</?[a-zA-Z][a-zA-Z0-9]*[^>]*>", "", clean_content)
            clean_content = _re.sub(r" {2,}", " ", clean_content)  # collapse spaces
            return {
                "_type": "data-mermaid",
                "data": {"id": artifact_id, "diagram": clean_content},
            }

        if lang == "synapse-flashcards":
            try:
                payload = json.loads(content)
            except json.JSONDecodeError:
                payload = {"raw": content}
            return {
                "_type": "data-artifact",
                "data": {
                    "id": artifact_id,
                    "artifact_type": "flashcard_set",
                    "title": payload.get("title", "Flashcards") if isinstance(payload, dict) else "Flashcards",
                    "payload": payload,
                    "state": "ready",
                },
            }

        if lang == "synapse-quiz":
            try:
                payload = json.loads(content)
            except json.JSONDecodeError:
                payload = {"raw": content}
            return {
                "_type": "data-artifact",
                "data": {
                    "id": artifact_id,
                    "artifact_type": "quiz",
                    "title": payload.get("title", "Quiz") if isinstance(payload, dict) else "Quiz",
                    "payload": payload,
                    "state": "ready",
                },
            }

        # Fallback — shouldn't happen given _INTERCEPTED_FENCE_LANGUAGES
        return {"_type": "text", "delta": f"```{lang}\n{content}\n```"}


@dataclass
class StreamAccumulator:
    """
    Accumulates content during a streaming session for post-stream persistence.

    This mirrors the existing `StreamResult` from
    `app.api.websockets.core.streaming` but is used by the SSE path.
    """

    content: str = ""
    thinking: str = ""
    model_used: str = ""
    total_tokens: int = 0
    tool_calls: list = field(default_factory=list)
    grounding_sources: Optional[dict] = None
    agent_used: str = "tutor"
    success: bool = True

    @property
    def final_content(self) -> str:
        """Content for DB persistence.

        Always stores thinking wrapped in ``<think>`` tags so that the frontend
        can re-hydrate it as a native ``reasoning`` part when messages are
        loaded from the database (see ``seedPartsFromContent`` in useSynapseChat).
        If thinking is present it is prepended before the regular text.
        """
        parts: list[str] = []
        if self.thinking:
            parts.append(f"<think>\n{self.thinking}\n</think>")
        if self.content:
            parts.append(self.content)
        return "\n".join(parts)

    @property
    def estimated_tokens(self) -> int:
        """Token count, falling back to character-based estimate."""
        return self.total_tokens or max(1, len(self.final_content) // 4)



def create_vercel_sse_generator(
    orchestrator_stream: AsyncIterator[dict],
    *,
    message_id: Optional[str] = None,
) -> tuple:
    """
    Create a Vercel SSE generator and its accumulator.

    Returns a tuple of (sse_generator, accumulator) so the caller can
    both stream the response AND read accumulated content after the stream.

    Usage:
        generator, accumulator = create_vercel_sse_generator(orchestrator_stream)
        response = StreamingResponse(generator, ...)
        # After response is consumed, accumulator.content has the full text
    """
    accumulator = StreamAccumulator()
    msg_id = message_id or f"msg_{uuid.uuid4().hex}"
    text_part_id = f"text_{uuid.uuid4().hex[:16]}"
    reasoning_part_id = f"reasoning_{uuid.uuid4().hex[:16]}"

    async def _generate():
        text_started = False
        reasoning_started = False
        interceptor = CodeFenceInterceptor()

        def _dispatch_interceptor_results(results: list[dict]):
            """Convert interceptor output to SSE strings."""
            nonlocal text_started
            events = []
            for result in results:
                rtype = result["_type"]
                if rtype == "text":
                    delta = result["delta"]
                    if not delta:
                        continue
                    if not text_started:
                        events.append(_sse({"type": "text-start", "id": text_part_id}))
                        text_started = True
                    events.append(_sse({"type": "text-delta", "id": text_part_id, "delta": delta}))
                elif rtype == "data-mermaid":
                    events.append(_sse({"type": "data-mermaid", "id": result["data"].get("id"), "data": result["data"]}))
                elif rtype == "data-artifact":
                    events.append(_sse({"type": "data-artifact", "id": result["data"].get("id"), "data": result["data"]}))
            return events

        yield _sse({"type": "start", "messageId": msg_id})
        yield _sse({"type": "start-step"})

        async for chunk in orchestrator_stream:
            chunk_type = chunk.get("type")

            if chunk_type == "token":
                text = chunk.get("text", "")
                if not text:
                    continue
                accumulator.content += text
                # Route through interceptor — intercepts mermaid/quiz/flashcard fences
                for event in _dispatch_interceptor_results(interceptor.feed(text)):
                    yield event

            elif chunk_type == "thinking":
                text = chunk.get("text", "")
                if not text:
                    continue
                accumulator.thinking += text
                if not reasoning_started:
                    yield _sse({"type": "reasoning-start", "id": reasoning_part_id})
                    reasoning_started = True
                yield _sse({"type": "reasoning-delta", "id": reasoning_part_id, "delta": text})

            elif chunk_type == "thinking_complete":
                # Backend-measured thinking duration — emit as a data part so the
                # frontend can display "Thought for Xs" with an accurate value.
                duration = chunk.get("duration_seconds", 0)
                yield _sse({"type": "data-thinking-duration", "transient": False, "data": {"seconds": duration}})

            elif chunk_type == "tool_call":
                tool_call_id = chunk.get("id", f"call_{uuid.uuid4().hex[:24]}")
                tool_name = chunk.get("name", "unknown")
                tool_args = chunk.get("args", {})
                yield _sse({"type": "tool-input-start", "toolCallId": tool_call_id, "toolName": tool_name})
                yield _sse({"type": "tool-input-available", "toolCallId": tool_call_id, "toolName": tool_name, "input": tool_args})

            elif chunk_type == "tool_result":
                tool_name = chunk.get("name", "unknown")
                tool_result = chunk.get("result", {})
                tool_call_id = chunk.get("id", f"call_{uuid.uuid4().hex[:24]}")
                result_type = chunk.get("result_type", "text")
                accumulator.tool_calls.append({"name": tool_name, "result": tool_result, "result_type": result_type})
                yield _sse({"type": "tool-output-available", "toolCallId": tool_call_id, "output": tool_result})

                # ── Emit result type as a data part for frontend rendering ─
                yield _sse({
                    "type": "data-tool-metadata",
                    "transient": True,
                    "data": {
                        "toolCallId": tool_call_id,
                        "toolName": tool_name,
                        "resultType": result_type,
                    },
                })

                # ── Emit RAG citations as a data part ─────────────────────
                citations = _extract_rag_citations(tool_name, tool_result)
                if citations:
                    yield _sse({
                        "type": "data-citations",
                        "data": citations,
                    })

            elif chunk_type == "routing":
                accumulator.agent_used = chunk.get("agent", "tutor")
                accumulator.model_used = chunk.get("model", "")
                yield _sse({"type": "data-routing", "transient": True, "data": {
                    "agent": chunk.get("agent"),
                    "mode": chunk.get("mode"),
                    "model": chunk.get("model"),
                    "confidence": chunk.get("confidence"),
                    "thinking_ui": chunk.get("thinking_ui"),
                }})

            elif chunk_type == "warning":
                yield _sse({"type": "data-warning", "transient": True, "data": {"message": chunk.get("message", "")}})

            elif chunk_type == "model_upgraded":
                yield _sse({"type": "data-model-upgrade", "transient": True, "data": {
                    "original_model": chunk.get("original_model"),
                    "upgraded_to": chunk.get("upgraded_to"),
                    "reason": chunk.get("reason"),
                }})

            elif chunk_type == "fallback":
                yield _sse({"type": "data-fallback", "transient": True, "data": {
                    "original_model": chunk.get("original_model"),
                    "fallback_model": chunk.get("fallback_model"),
                    "reason": chunk.get("reason"),
                }})

            elif chunk_type == "artifact":
                artifact_type = chunk.get("artifact_type", "code")
                artifact_id = chunk.get("id", f"artifact_{uuid.uuid4().hex[:12]}")
                yield _sse({
                    "type": "data-artifact",
                    "id": artifact_id,
                    "data": {
                        "id": artifact_id,
                        "artifact_type": artifact_type,
                        "title": chunk.get("title", ""),
                        "language": chunk.get("language"),
                        "content": chunk.get("content"),
                        "payload": chunk.get("payload"),
                        "db_id": chunk.get("db_id"),
                        "state": chunk.get("state", "ready"),
                    },
                })

            elif chunk_type == "complete":
                accumulator.total_tokens = chunk.get("total_tokens", 0)
                accumulator.model_used = chunk.get("model", accumulator.model_used)
                accumulator.grounding_sources = chunk.get("grounding_sources")
                grounding = chunk.get("grounding_sources")
                if grounding and isinstance(grounding, dict):
                    for source in grounding.get("sources", []):
                        url = source.get("url", "")
                        if url:
                            yield _sse({"type": "source-url", "sourceId": url, "url": url, "title": source.get("title", url)})

            elif chunk_type == "error":
                accumulator.success = False
                yield _sse({"type": "error", "errorText": chunk.get("message", "An unknown error occurred")})

        # Flush interceptor — emit any text still held back (partial fence that never completed)
        for event in _dispatch_interceptor_results(interceptor.flush()):
            yield event

        # Close open blocks
        if reasoning_started:
            yield _sse({"type": "reasoning-end", "id": reasoning_part_id})
        if text_started:
            yield _sse({"type": "text-end", "id": text_part_id})

        yield _sse({"type": "finish-step"})
        yield _sse({"type": "finish"})
        yield _sse_done()

    return _generate(), accumulator


# ── Response headers for Vercel AI SDK ───────────────────────────────────
VERCEL_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
    "x-vercel-ai-ui-message-stream": "v1",
}
