"""Context assembly for RAG responses."""

import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


async def build_rag_context(
    query: str,
    retrieved_chunks: List[Dict],
    user_context: Dict,
    max_tokens: int = 8000,
) -> str:
    """
    Build final context string for AI model consumption.

    Assembles RAG context in a format optimized for AI:
    1. User learning context (weak areas, progress)
    2. Retrieved chunks (ranked by relevance)
    3. Structured formatting for clarity

    Manages token budget:
    - User context: ~500 tokens
    - Retrieved chunks: ~6000-7000 tokens
    - Formatting/buffer: ~500 tokens

    Args:
        query: Original user query
        retrieved_chunks: Results from SYNAPSE bridge
        user_context: User's learning context
        max_tokens: Maximum tokens for context

    Returns:
        str: Formatted context string

    Example output:
        ```
        USER LEARNING CONTEXT:
        ========================
        Weak Areas: photosynthesis, mitochondria
        Recent Activity: Reviewed 5 flashcards on photosynthesis
        Learning Style: Visual learner, prefers examples

        RETRIEVED INFORMATION:
        =====================
        1. [Source: Note "Photosynthesis Overview"] (Relevance: 0.92)
           Photosynthesis is the process by which plants...

        2. [Source: Document "Biology Textbook Ch. 4"] (Relevance: 0.88)
           In the chloroplast, light reactions occur...

        YOUR QUERY:
        ===========
        How do plants make food?

        Please use the above context to provide a comprehensive answer
        focused on the user's weak areas. Use examples when possible.
        ```
    """
    logger.debug(f"Building RAG context with {len(retrieved_chunks)} chunks")

    try:
        context_parts = []
        current_tokens = 0

        # Part 1: User Learning Context
        logger.debug("Adding user learning context...")
        user_context_str = _format_user_context(user_context)
        context_parts.append(user_context_str)
        current_tokens += _estimate_tokens(user_context_str)

        # Part 2: Retrieved Chunks
        logger.debug(f"Adding {len(retrieved_chunks)} retrieved chunks...")
        chunks_str, chunks_tokens = _format_retrieved_chunks(
            retrieved_chunks,
            max_tokens - current_tokens - 500,  # Reserve 500 for formatting
        )
        context_parts.append(chunks_str)
        current_tokens += chunks_tokens

        # Part 3: Query and Instructions
        logger.debug("Adding query and instructions...")
        query_str = _format_query(query)
        context_parts.append(query_str)

        instructions = _format_instructions()
        context_parts.append(instructions)

        # Combine all parts
        final_context = "\n".join(context_parts)

        logger.info(f"✅ Built RAG context (~{current_tokens} tokens)")
        return final_context

    except Exception as e:
        logger.error(f"❌ Context building failed: {str(e)}")
        # Return minimal context on error
        return f"Query: {query}\n\nPlease answer the above question."


def _format_user_context(user_context: Dict) -> str:
    """Format user learning context section."""
    if not user_context:
        return ""

    parts = ["USER LEARNING CONTEXT:", "=" * 30]

    # Weak areas
    weak_areas = user_context.get("analytics", {}).get("weak_topics", [])
    if weak_areas:
        parts.append(f"📍 Weak Areas: {', '.join(weak_areas[:5])}")

    # Recent activity
    recent_activity = user_context.get("analytics", {}).get("recent_activity", [])
    if recent_activity:
        activity_count = len(recent_activity)
        activity_types = ", ".join(set(a.get("type", "activity") for a in recent_activity[:3]))
        parts.append(f"📊 Recent Activity: {activity_count} items ({activity_types})")

    # Learning style
    preferences = user_context.get("preferences", {})
    if preferences:
        learning_style = preferences.get("learning_style", "")
        if learning_style:
            parts.append(f"🎓 Learning Style: {learning_style}")

    # Performance metrics
    analytics = user_context.get("analytics", {})
    if analytics:
        accuracy = analytics.get("overall_accuracy")
        if accuracy:
            parts.append(f"✅ Overall Accuracy: {accuracy:.1%}")

    parts.append("")  # Blank line
    return "\n".join(parts)


def _format_retrieved_chunks(
    chunks: List[Dict],
    max_tokens: int,
) -> tuple[str, int]:
    """
    Format retrieved chunks with token budget management.

    Args:
        chunks: Retrieved chunks
        max_tokens: Maximum tokens allowed

    Returns:
        Tuple of (formatted_string, token_count)
    """
    parts = ["RETRIEVED INFORMATION:", "=" * 30]

    current_tokens = 50  # Header overhead
    chunk_num = 1

    for chunk in chunks:
        if current_tokens > max_tokens:
            parts.append(f"\n... ({len(chunks) - chunk_num + 1} more results available)")
            break

        # Format chunk with metadata
        text = chunk.get("text", "")
        score = chunk.get("score", 0)
        metadata = chunk.get("metadata", {})

        # Truncate text if needed
        chunk_tokens = _estimate_tokens(text)
        if current_tokens + chunk_tokens > max_tokens:
            # Truncate to fit
            max_text_len = int(len(text) * (max_tokens - current_tokens) / chunk_tokens)
            text = text[:max_text_len] + "..."
            chunk_tokens = _estimate_tokens(text)

        # Format with source
        source_type = metadata.get("source_type", "Content")
        title = metadata.get("title", "Untitled")

        chunk_str = (
            f"\n{chunk_num}. [{source_type}: {title}] (Relevance: {score:.2f})\n"
            f"   {text}\n"
        )

        parts.append(chunk_str)
        current_tokens += chunk_tokens + 100  # +100 for formatting
        chunk_num += 1

    parts.append("")  # Blank line
    return "\n".join(parts), current_tokens


def _format_query(query: str) -> str:
    """Format the user's query section."""
    return f"QUERY:\n{'=' * 30}\n{query}\n"


def _format_instructions() -> str:
    """Format instructions for the AI."""
    return (
        "INSTRUCTIONS:\n"
        "=" * 30 + "\n"
        "1. Use the above context to answer the query\n"
        "2. Focus on the user's weak areas when relevant\n"
        "3. Provide clear explanations and examples\n"
        "4. Cite sources where helpful\n"
        "5. Suggest related topics for deeper learning\n"
    )


def _estimate_tokens(text: str) -> int:
    """
    Estimate token count (rough approximation).

    Rule of thumb:
    - 1 token ≈ 4 characters
    - 1 token ≈ 0.75 words

    Args:
        text: Text to count

    Returns:
        int: Estimated token count
    """
    if not text:
        return 0

    # Average of char-based and word-based estimation
    char_tokens = len(text) / 4
    word_tokens = len(text.split()) / 0.75

    return int((char_tokens + word_tokens) / 2)
