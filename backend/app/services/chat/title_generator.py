"""AI-powered chat session title generation.

Generates concise, descriptive titles from the first message exchange.
Uses the LiteLLM Router (synapse-utility alias) for model selection —
this alias maps to Gemini Flash Lite (primary) or gemma4 (fallback),
both of which are fast, low-cost, and confirmed available.
"""

import structlog
from typing import Optional

logger = structlog.get_logger(__name__)

_TITLE_PROMPT = """\
Generate a short, descriptive title (3-6 words) for this chat conversation.

User message: {message}
{response_line}

Rules:
- Be concise and specific (max {max_length} characters)
- Capture the main topic or question
- Use title case
- No quotes or punctuation at the end
- Examples: "Photosynthesis Process", "React Hooks Tutorial", "Essay Writing Tips"

Title:"""


async def generate_session_title(
    first_message: str,
    first_response: Optional[str] = None,
    max_length: int = 60,
) -> str:
    """
    Generate a concise, descriptive title for a chat session.

    Uses the LiteLLM Router with the `synapse-utility` alias, which
    maps to Gemini Flash Lite (primary) → gemma4:31b-cloud (fallback).

    Args:
        first_message: The user's first message in the session.
        first_response: Optional AI response for more context.
        max_length: Maximum title length in characters.

    Returns:
        Generated title string, or a truncated copy of the user message on error.
    """
    try:
        from app.core.ai.providers.litellm_router import get_llm_router

        response_line = (
            f"AI response summary: {first_response[:200]}" if first_response else ""
        )
        prompt = _TITLE_PROMPT.format(
            message=first_message[:500],
            response_line=response_line,
            max_length=max_length,
        )

        result = await get_llm_router().acompletion(
            model="synapse-utility",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=30,
        )

        title = (result.choices[0].message.content or "").strip()
        model_used = getattr(result, "model", "synapse-utility")

        # Sanitise
        title = title.strip("\"'").replace("\n", " ").strip()
        if len(title) > max_length:
            title = title[: max_length - 3] + "..."

        if len(title) < 3 or len(title.split()) > 10:
            raise ValueError(f"Title looks invalid: {title!r}")

        logger.info(
            "session_title_generated",
            title=title,
            model=model_used,
            message_preview=first_message[:50],
        )
        return title

    except Exception as e:
        logger.warning("session_title_generation_failed", error=str(e)[:150])
        # Fallback: truncated user message
        fallback = first_message[: max_length - 3].strip()
        if len(first_message) > max_length - 3:
            fallback += "..."
        return fallback


async def maybe_generate_title(
    session_id: int,
    first_message: str,
    first_response: str,
    db_session,
) -> Optional[str]:
    """
    Generate and update session title if this is the first exchange.

    Only updates when the current title looks auto-generated
    (starts with "Chat", "New", is empty, or contains "Untitled").

    Args:
        session_id: Chat session ID.
        first_message: User's first message.
        first_response: AI's first response.
        db_session: Async SQLAlchemy session.

    Returns:
        Generated title if updated, None if skipped or failed.
    """
    try:
        from sqlalchemy import select
        from app.modules.chat.interface import ChatSession

        result = await db_session.execute(
            select(ChatSession).where(ChatSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            return None

        current_title = session.title or ""

        # Gate: only generate when there is no real title yet.
        #   - empty / whitespace-only        → needs title
        #   - default placeholder prefixes   → needs title
        #   - anything else (real title)     → skip
        _PLACEHOLDER_PREFIXES = ("Chat ", "New ", "Untitled")
        if current_title.strip():
            # Non-empty title — check if it's just a placeholder
            needs_title = (
                any(
                    current_title == p or current_title.startswith(p)
                    for p in _PLACEHOLDER_PREFIXES
                )
                or "Untitled" in current_title
            )
        else:
            # No title at all
            needs_title = True

        if not needs_title:
            logger.debug(
                "skipping_title_generation",
                reason="custom_title_exists",
                title=current_title,
            )
            return None

        new_title = await generate_session_title(first_message, first_response)

        session.title = new_title
        await db_session.commit()

        logger.info(
            "session_title_updated", session_id=session_id, new_title=new_title
        )
        return new_title

    except Exception as e:
        logger.warning(
            "maybe_generate_title_failed", session_id=session_id, error=str(e)[:150]
        )
        return None
