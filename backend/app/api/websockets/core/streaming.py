"""
Shared orchestrator streaming utilities.

Encapsulates the common pattern used by every chat handler:
  call orchestrator → broadcast chunks → accumulate response.

This single helper replaces ~200 lines of near-identical streaming
code duplicated across handle_chat_message, handle_regenerate,
handle_thread_message, and handle_branch.
"""

from dataclasses import dataclass, field
from typing import Optional

import structlog

from app.api.websockets.core.channels import channel_manager
from app.core.ai.registry.models import DEFAULT_CHAT_MODEL

logger = structlog.get_logger()


@dataclass
class StreamResult:
    """Accumulated result from a streaming session."""

    content: str = ""
    thinking: str = ""
    model_used: str = DEFAULT_CHAT_MODEL
    total_tokens: int = 0
    tool_calls: list = field(default_factory=list)
    grounding_sources: Optional[dict] = None
    agent_used: str = "tutor"
    success: bool = True

    @property
    def final_content(self) -> str:
        """Content for DB persistence — wraps thinking if no regular content."""
        if self.content:
            return self.content
        if self.thinking:
            return f"<think>\n{self.thinking}\n</think>"
        return ""

    @property
    def estimated_tokens(self) -> int:
        """Token count, falling back to character-based estimate."""
        return self.total_tokens or max(1, len(self.final_content) // 4)


async def stream_and_broadcast(
    *,
    orchestrator,
    message: str,
    user_id: int,
    session_id: int,
    channel: str,
    chat_history: list | None = None,
    context: dict | None = None,
    mode_id: str | None = None,
    model_override: str | None = None,
    extra_data: dict | None = None,
    image_bytes: list[bytes] | None = None,
) -> StreamResult:
    """
    Stream orchestrator output to the client via channel broadcasts.

    Handles all chunk types (token, thinking, tool_call, tool_result,
    complete, error, routing) with a single dispatch loop.

    Args:
        orchestrator: The AI orchestrator instance.
        message: User's prompt text.
        user_id: Authenticated user ID.
        session_id: Chat session ID.
        channel: Channel to broadcast on (e.g. "chat:123").
        chat_history: Optional conversation history.
        context: Optional user context dict.
        mode_id: Optional mode (e.g. "socratic").
        model_override: Optional model key override.
        extra_data: Extra fields merged into every broadcast
                     (e.g. {"thread_id": 5} or {"branch_parent_id": 10}).
        image_bytes: Optional list of raw image bytes for vision models.

    Returns:
        StreamResult with accumulated content, metadata, and success flag.
    """
    result = StreamResult()
    extra = extra_data or {}

    # Build orchestrator kwargs — only include non-None values
    stream_kwargs = dict(
        message=message,
        user_id=user_id,
        session_id=session_id,
        chat_history=chat_history or [],
    )
    if context:
        stream_kwargs["context"] = context
    if mode_id:
        stream_kwargs["mode_id"] = mode_id
    if model_override:
        stream_kwargs["model_override"] = model_override
    if image_bytes:
        stream_kwargs["image_bytes"] = image_bytes

    async for chunk in orchestrator.handle_message_stream(**stream_kwargs):
        chunk_type = chunk.get("type")

        if chunk_type == "routing":
            result.agent_used = chunk.get("agent", "tutor")
            continue

        if chunk_type == "token":
            text = chunk.get("text", "")
            result.content += text
            await channel_manager.broadcast_to_user_channel(
                user_id=user_id,
                channel=channel,
                event="token",
                data={
                    "text": text,
                    "model": chunk.get("model", result.model_used),
                    "streaming": True,
                    **extra,
                },
            )

        elif chunk_type == "thinking":
            text = chunk.get("text", "")
            result.thinking += text
            await channel_manager.broadcast_to_user_channel(
                user_id=user_id,
                channel=channel,
                event="thinking",
                data={
                    "text": text,
                    "model": chunk.get("model", result.model_used),
                    **extra,
                },
            )

        elif chunk_type == "tool_call":
            await channel_manager.broadcast_to_user_channel(
                user_id=user_id,
                channel=channel,
                event="tool_call",
                data={"name": chunk.get("name"), "args": chunk.get("args", {}), **extra},
            )

        elif chunk_type == "tool_result":
            result.tool_calls.append({"name": chunk.get("name"), "result": chunk.get("result")})
            await channel_manager.broadcast_to_user_channel(
                user_id=user_id,
                channel=channel,
                event="tool_result",
                data={"name": chunk.get("name"), "result": chunk.get("result"), **extra},
            )

        elif chunk_type == "complete":
            result.total_tokens = chunk.get("total_tokens", 0)
            result.model_used = chunk.get("model", result.model_used)
            result.grounding_sources = chunk.get("grounding_sources")
            await channel_manager.broadcast_to_user_channel(
                user_id=user_id,
                channel=channel,
                event="complete",
                data={
                    "total_tokens": result.total_tokens,
                    "model_used": result.model_used,
                    "success": chunk.get("success", True),
                    "function_calls": result.tool_calls or None,
                    "grounding_sources": result.grounding_sources,
                    **extra,
                },
            )

        elif chunk_type == "error":
            result.success = False
            await channel_manager.broadcast_to_user_channel(
                user_id=user_id,
                channel=channel,
                event="error",
                data={
                    "code": "generation_error",
                    "message": chunk.get("message", "Unknown error"),
                    **extra,
                },
            )

    return result
