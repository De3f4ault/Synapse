"""Chat message embedding utilities.

Provides functions to generate embeddings for chat messages.
Used for:
1. Live embedding on message creation
2. Backfill of existing messages
"""

from typing import Optional, List
import structlog

from app.core.ai.embeddings.boundary import get_embedder

logger = structlog.get_logger(__name__)


def generate_chat_embedding(
    content: str,
    parent_content: Optional[str] = None,
    session_title: Optional[str] = None,
    is_assistant: bool = True,
) -> List[float]:
    """
    Generate embedding for a chat message.

    Uses Q+A pair embedding strategy for assistant messages:
    - Session title provides contextual prior
    - User question (parent) provides intent
    - Assistant answer provides meaning

    Args:
        content: The message content
        parent_content: Parent message content (user question for assistant messages)
        session_title: Session title for context
        is_assistant: Whether this is an assistant message

    Returns:
        List of embedding floats (384 dimensions)
    """
    parts = []

    # Add session title as contextual prior
    if session_title:
        parts.append(f"Session: {session_title}")

    # For assistant messages: include parent question for full Q+A context
    if is_assistant and parent_content:
        parts.append(f"Q: {parent_content}")
        parts.append(f"A: {content}")
    else:
        parts.append(content)

    embedding_text = "\n".join(parts)

    # Generate embedding
    embedder = get_embedder()
    embedding = embedder.encode(embedding_text, normalize=True)

    # Convert to list (handle batched vs single)
    if embedding.ndim > 1:
        return embedding[0].tolist()
    return embedding.tolist()


async def embed_assistant_message(
    db_session,
    message_id: int,
    content: str,
    parent_content: Optional[str] = None,
    session_title: Optional[str] = None,
) -> None:
    """
    Generate and store embedding for an assistant message.

    Call this after creating an assistant message to enable
    hybrid search on chat history.

    Args:
        db_session: Database session
        message_id: ID of the message to embed
        content: Message content
        parent_content: Parent (user question) content
        session_title: Session title for context
    """
    try:
        from sqlalchemy import text

        embedding = generate_chat_embedding(
            content=content,
            parent_content=parent_content,
            session_title=session_title,
            is_assistant=True,
        )

        dim = len(embedding)

        # Format embedding for PostgreSQL vector type
        embedding_str = "[" + ",".join(map(str, embedding)) + "]"

        # Update the message with embedding
        await db_session.execute(
            text(f"""
                UPDATE developer_schema.chat_messages 
                SET embedding = CAST(:embedding AS vector({dim}))
                WHERE id = :message_id
            """),
            {"embedding": embedding_str, "message_id": message_id},
        )

        logger.debug("chat_embedding_generated", message_id=message_id)

    except Exception as e:
        # Don't fail message creation if embedding fails
        logger.warning("chat_embedding_failed", message_id=message_id, error=str(e)[:100])
