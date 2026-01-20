"""AI-powered chat session title generation.

Generates concise, descriptive titles from the first message exchange
using the Cognitive Router for model selection.
"""

import structlog
from typing import Optional

from app.core.ai.contracts.task import AITask
from app.core.ai.router import router
from app.core.ai.runtime.request import AIRequest
from app.core.ai.providers.factory import get_provider


logger = structlog.get_logger(__name__)


async def generate_session_title(
    first_message: str,
    first_response: Optional[str] = None,
    max_length: int = 60,
) -> str:
    """
    Generate a concise, descriptive title for a chat session.

    Uses the Cognitive Router to select the best model for summarization.

    Args:
        first_message: The user's first message in the session
        first_response: Optional AI response for more context
        max_length: Maximum title length

    Returns:
        Generated title string (falls back to truncated message on error)
    """
    try:
        # Route to the best model for summarization (fast, low-cost)
        decision = router.route(AITask.SUMMARIZATION)
        provider = get_provider(decision.provider)

        # Build prompt
        context = f"User message: {first_message[:500]}"
        if first_response:
            context += f"\n\nAI response: {first_response[:300]}"

        prompt = f"""Generate a short, descriptive title (3-6 words) for this chat conversation.

{context}

Rules:
- Be concise and specific (max {max_length} characters)
- Capture the main topic or question
- Use title case
- No quotes or punctuation at the end
- Examples: "Photosynthesis Process", "React Hooks Tutorial", "Essay Writing Tips"

Title:"""

        # Create AIRequest
        request = AIRequest(
            task=AITask.SUMMARIZATION,
            prompt=prompt,
            temperature=0.3,
            max_tokens=30,
        )
        request.bind_model(router.get_model_for_decision(decision))

        # Generate title
        response = await provider.generate(request)

        if not response.success:
            raise ValueError(f"Generation failed: {response.error}")

        title = response.content.strip()

        # Clean up
        title = title.strip("\"'")
        title = title.replace("\n", " ")

        # Enforce max length
        if len(title) > max_length:
            title = title[: max_length - 3] + "..."

        # Validate we got something reasonable
        if len(title) < 3 or len(title.split()) > 10:
            raise ValueError("Generated title seems invalid")

        logger.info(
            "session_title_generated",
            title=title,
            model=decision.model_id,
            provider=decision.provider,
            message_preview=first_message[:50],
        )
        return title

    except Exception as e:
        logger.warning("session_title_generation_failed", error=str(e)[:100])
        # Fallback: use first message as title
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

    Call this after the first AI response to auto-generate a meaningful title.
    Only updates if current title looks auto-generated (starts with "Chat" or "New").

    Args:
        session_id: Chat session ID
        first_message: User's first message
        first_response: AI's first response
        db_session: Database session

    Returns:
        Generated title if updated, None if skipped
    """
    try:
        from sqlalchemy import select
        from app.models.chat_session import ChatSession

        # Check if session needs title generation
        result = await db_session.execute(select(ChatSession).where(ChatSession.id == session_id))
        session = result.scalar_one_or_none()

        if not session:
            return None

        # Skip if user already set a custom title
        current_title = session.title or ""
        if not (
            current_title.startswith("Chat ")
            or current_title.startswith("New ")
            or current_title == ""
            or "Untitled" in current_title
        ):
            logger.debug(
                "skipping_title_generation", reason="custom_title_exists", title=current_title
            )
            return None

        # Generate new title
        new_title = await generate_session_title(first_message, first_response)

        # Update session
        session.title = new_title
        await db_session.commit()

        logger.info("session_title_updated", session_id=session_id, new_title=new_title)
        return new_title

    except Exception as e:
        logger.warning("maybe_generate_title_failed", session_id=session_id, error=str(e)[:100])
        return None
