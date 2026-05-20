"""
SYNAPSE Agent Message Types — Typed containers for the agentic pipeline.

These Pydantic models are the single source of truth for messages flowing
through the agent system. They handle three boundaries:

    DB → Agent:    from_db_row()   — Reconstruct typed messages from chat_messages rows
    Agent → LLM:   to_litellm()    — Serialize to OpenAI-compatible dicts for LiteLLM
    Agent → DB:    to_db_row()     — Serialize to dict matching ChatMessage columns

The DB stores tool_calls as `function_calls: {"calls": [...]}` for historical
reasons. The from_db_row()/to_db_row() methods handle this mapping transparently.
"""

from __future__ import annotations

import json
from typing import Any, Literal

from pydantic import BaseModel, Field


class SystemMessage(BaseModel):
    role: Literal["system"] = "system"
    content: str

    def to_litellm(self) -> dict[str, Any]:
        return {"role": self.role, "content": self.content}


class HumanMessage(BaseModel):
    role: Literal["user"] = "user"
    content: str

    def to_litellm(self) -> dict[str, Any]:
        return {"role": self.role, "content": self.content}

    @classmethod
    def from_db_row(cls, row: dict[str, Any]) -> HumanMessage:
        """Reconstruct from a chat_messages DB row."""
        return cls(content=row.get("content", ""))


class AIMessage(BaseModel):
    role: Literal["assistant"] = "assistant"
    content: str
    tool_calls: list[dict[str, Any]] | None = None

    # SYNAPSE-specific metadata — stamped during execute_stream()
    grounding_sources: list[dict[str, Any]] | None = None
    tokens: int | None = None
    model_used: str | None = None
    iteration: int | None = None
    confidence: float | None = None

    def to_litellm(self) -> dict[str, Any]:
        """Serialize to OpenAI-compatible dict for LiteLLM.

        Only includes fields the LLM API understands.  SYNAPSE metadata
        (tokens, model_used, etc.) are intentionally excluded — they are
        for persistence and observability, not for the model context.
        """
        d: dict[str, Any] = {"role": self.role, "content": self.content or ""}
        if self.tool_calls:
            d["tool_calls"] = self.tool_calls
        return d

    @classmethod
    def from_db_row(cls, row: dict[str, Any]) -> AIMessage:
        """Reconstruct from a chat_messages DB row.

        Handles the DB schema's field name mismatches:
        - DB ``function_calls`` (JSON ``{"calls": [...]}`` ) → ``tool_calls``
        - DB ``grounding_sources`` (JSON ``{"sources": [...]}`` ) → ``grounding_sources``
        """
        # --- tool_calls ---
        tool_calls = None
        fc = row.get("function_calls")
        if fc:
            if isinstance(fc, str):
                try:
                    fc = json.loads(fc)
                except (json.JSONDecodeError, TypeError):
                    fc = None
            if isinstance(fc, dict):
                tool_calls = fc.get("calls")

        # --- grounding_sources ---
        grounding = None
        gs = row.get("grounding_sources")
        if gs:
            if isinstance(gs, str):
                try:
                    gs = json.loads(gs)
                except (json.JSONDecodeError, TypeError):
                    gs = None
            if isinstance(gs, dict):
                grounding = gs.get("sources")
            elif isinstance(gs, list):
                grounding = gs

        return cls(
            content=row.get("content", ""),
            tool_calls=tool_calls,
            model_used=row.get("model_used"),
            tokens=row.get("tokens"),
            grounding_sources=grounding,
        )

    def to_db_row(self) -> dict[str, Any]:
        """Serialize to a dict matching ChatMessage column names.

        Caller uses this to construct or update a ChatMessage ORM instance:
            ``ChatMessage(**ai_msg.to_db_row(), session_id=sid, role=role)``
        """
        row: dict[str, Any] = {
            "content": self.content,
            "tokens": self.tokens or max(1, len(self.content) // 4),
            "model_used": self.model_used,
        }

        # DB wraps tool_calls in {"calls": [...]}
        if self.tool_calls:
            row["function_calls"] = {"calls": self.tool_calls}
        else:
            row["function_calls"] = None

        # DB wraps grounding in {"sources": [...]}
        if self.grounding_sources:
            row["grounding_sources"] = {"sources": self.grounding_sources}
        else:
            row["grounding_sources"] = None

        return row


class ToolMessage(BaseModel):
    role: Literal["tool"] = "tool"
    content: str
    tool_call_id: str

    # SYNAPSE-specific — stamped by _execute_tool in base_agent
    tool_name: str | None = None
    execution_ms: int | None = None
    result_type: str | None = None  # "notes", "flashcards", "documents", "error"

    def to_litellm(self) -> dict[str, Any]:
        """Serialize to OpenAI-compatible dict for LiteLLM.

        Only includes the three fields the API requires.
        """
        return {
            "role": self.role,
            "content": self.content,
            "tool_call_id": self.tool_call_id,
        }


# Union type for all message variants
AgentMessage = SystemMessage | HumanMessage | AIMessage | ToolMessage


def message_from_db_row(row: dict[str, Any]) -> AgentMessage:
    """Dispatch factory: reconstruct the right message type from a DB row.

    Expects ``row["role"]`` to be one of "user", "assistant", "system", "tool".
    """
    role = row.get("role", "")
    # Handle SQLAlchemy enum values
    if hasattr(role, "value"):
        role = role.value

    if role == "user":
        return HumanMessage.from_db_row(row)
    elif role == "assistant":
        return AIMessage.from_db_row(row)
    elif role == "system":
        return SystemMessage(content=row.get("content", ""))
    else:
        # Fallback — shouldn't happen with proper data
        return HumanMessage(content=row.get("content", ""))
