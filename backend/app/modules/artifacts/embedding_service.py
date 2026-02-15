"""
Artifacts Module — Embedding Service.

Provides embedding generation and semantic search for artifacts.
Uses existing AllMiniLMEmbedder (384-dim) for consistency with other modules.
"""

from typing import Optional, List, Tuple
from uuid import UUID
import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai.embeddings.boundary import get_embedder

logger = structlog.get_logger(__name__)


def generate_artifact_embedding(
    title: str,
    content: str,
    artifact_type: str,
    language: Optional[str] = None,
) -> List[float]:
    """
    Generate embedding for an artifact.

    Combines title, type, language, and content excerpt for rich semantic representation.

    Args:
        title: Artifact title
        content: Artifact content (will be truncated)
        artifact_type: MIME type of artifact
        language: Programming language (if applicable)

    Returns:
        List of embedding floats (384 dimensions)
    """
    parts = [
        f"Title: {title}",
        f"Type: {artifact_type}",
    ]

    if language:
        parts.append(f"Language: {language}")

    # Truncate content to first ~1000 chars for embedding
    content_preview = content[:1000] if content else ""
    parts.append(f"Content: {content_preview}")

    embedding_text = "\n".join(parts)

    # Generate embedding
    embedder = get_embedder()
    embedding = embedder.encode(embedding_text, normalize=True)

    # Convert to list (handle batched vs single)
    if embedding.ndim > 1:
        return embedding[0].tolist()
    return embedding.tolist()


async def embed_artifact(
    db: AsyncSession,
    artifact_id: UUID,
    title: str,
    content: str,
    artifact_type: str,
    language: Optional[str] = None,
) -> None:
    """
    Generate and store embedding for an artifact.

    Args:
        db: Database session
        artifact_id: ID of the artifact to embed
        title: Artifact title
        content: Artifact content
        artifact_type: MIME type
        language: Programming language
    """
    try:
        embedding = generate_artifact_embedding(
            title=title,
            content=content,
            artifact_type=artifact_type,
            language=language,
        )

        # Format embedding for PostgreSQL vector type
        embedding_str = "[" + ",".join(map(str, embedding)) + "]"

        # Update the artifact with embedding
        await db.execute(
            text("""
                UPDATE developer_schema.artifacts 
                SET embedding = CAST(:embedding AS vector(384))
                WHERE id = :artifact_id
            """),
            {"embedding": embedding_str, "artifact_id": str(artifact_id)},
        )

        logger.debug("artifact_embedding_generated", artifact_id=str(artifact_id))

    except Exception as e:
        # Don't fail artifact creation if embedding fails
        logger.warning(
            "artifact_embedding_failed", artifact_id=str(artifact_id), error=str(e)[:100]
        )


async def search_artifacts(
    db: AsyncSession,
    user_id: int,
    query: str,
    limit: int = 20,
    min_similarity: float = 0.3,
) -> List[Tuple[UUID, str, str, float]]:
    """
    Semantic search across user's artifacts.

    Args:
        db: Database session
        user_id: User ID to filter artifacts
        query: Search query text
        limit: Maximum results
        min_similarity: Minimum similarity threshold (0-1)

    Returns:
        List of (artifact_id, title, type, similarity_score)
    """
    # Generate query embedding
    embedder = get_embedder()
    query_embedding = embedder.encode(query, normalize=True)
    if query_embedding.ndim > 1:
        query_embedding = query_embedding[0]

    embedding_str = "[" + ",".join(map(str, query_embedding.tolist())) + "]"

    result = await db.execute(
        text("""
            SELECT 
                id,
                title,
                type,
                1.0 - (embedding <=> CAST(:embedding AS vector(384))) as similarity
            FROM developer_schema.artifacts
            WHERE user_id = :user_id
              AND embedding IS NOT NULL
              AND 1.0 - (embedding <=> CAST(:embedding AS vector(384))) >= :min_sim
            ORDER BY embedding <=> CAST(:embedding AS vector(384))
            LIMIT :limit
        """),
        {
            "embedding": embedding_str,
            "user_id": user_id,
            "min_sim": min_similarity,
            "limit": limit,
        },
    )

    return [(row.id, row.title, row.type, row.similarity) for row in result.fetchall()]


async def find_similar_artifacts(
    db: AsyncSession,
    artifact_id: UUID,
    user_id: int,
    limit: int = 10,
    min_similarity: float = 0.5,
) -> List[Tuple[UUID, str, str, float]]:
    """
    Find artifacts similar to a given artifact.

    Args:
        db: Database session
        artifact_id: Source artifact ID
        user_id: User ID to filter artifacts
        limit: Maximum results
        min_similarity: Minimum similarity threshold

    Returns:
        List of (artifact_id, title, type, similarity_score)
    """
    # First get the artifact's embedding
    result = await db.execute(
        text("""
            SELECT embedding 
            FROM developer_schema.artifacts 
            WHERE id = :artifact_id AND user_id = :user_id
        """),
        {"artifact_id": str(artifact_id), "user_id": user_id},
    )
    row = result.fetchone()

    if not row or not row.embedding:
        logger.debug("artifact_has_no_embedding", artifact_id=str(artifact_id))
        return []

    # Format embedding for query
    embedding_str = str(row.embedding)

    # Find similar artifacts (excluding self)
    result = await db.execute(
        text("""
            SELECT 
                id,
                title,
                type,
                1.0 - (embedding <=> CAST(:embedding AS vector(384))) as similarity
            FROM developer_schema.artifacts
            WHERE user_id = :user_id
              AND id != :artifact_id
              AND embedding IS NOT NULL
              AND 1.0 - (embedding <=> CAST(:embedding AS vector(384))) >= :min_sim
            ORDER BY embedding <=> CAST(:embedding AS vector(384))
            LIMIT :limit
        """),
        {
            "embedding": embedding_str,
            "artifact_id": str(artifact_id),
            "user_id": user_id,
            "min_sim": min_similarity,
            "limit": limit,
        },
    )

    return [(row.id, row.title, row.type, row.similarity) for row in result.fetchall()]
