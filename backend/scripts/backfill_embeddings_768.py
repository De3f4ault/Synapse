#!/usr/bin/env python3
"""
Backfill Embeddings — 384d → 768d Migration

Re-embeds all pgvector entities after the dimension migration.
Uses the boundary embedder (Nomic 768d) directly, no Celery needed.

Usage:
    cd backend
    PYTHONPATH=. python scripts/backfill_embeddings_768.py

Expected runtime: ~2 minutes for ~1200 rows on CPU.
"""

import sys
import time
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.core.config import settings
from app.core.ai.embeddings.boundary import (
    get_embedder,
    EMBEDDING_DIM,
    EMBEDDING_VERSION,
    EmbeddingStatus,
)

import structlog

logger = structlog.get_logger(__name__)


def get_sync_url() -> str:
    """Convert async DATABASE_URL to sync."""
    url = str(settings.DATABASE_URL)
    return url.replace("+asyncpg", "")


def embed_text(embedder, text_content: str) -> list[float]:
    """Embed a single text, return list of floats."""
    if not text_content or not text_content.strip():
        return []
    truncated = text_content[:8000]
    result = embedder.encode([truncated], normalize=True)
    if result.ndim > 1:
        result = result[0]
    return result.tolist()


def backfill_notes(engine, embedder) -> int:
    """Re-embed all notes."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id, title, content
            FROM developer_schema.notes
            WHERE deleted_at IS NULL
            ORDER BY id
        """)).fetchall()

        count = 0
        for row in rows:
            content_str = row.title or ""
            if row.content:
                # Content is JSONB — extract text if possible
                if isinstance(row.content, dict):
                    content_str += "\n\n" + str(row.content)
                else:
                    content_str += "\n\n" + str(row.content)

            embedding = embed_text(embedder, content_str)
            if not embedding:
                continue

            embedding_str = f"[{','.join(map(str, embedding))}]"
            conn.execute(
                text(f"""
                    UPDATE developer_schema.notes
                    SET embedding = CAST(:embedding AS vector({EMBEDDING_DIM})),
                        embedding_model = :model,
                        embedding_status = :status
                    WHERE id = :id
                """),
                {
                    "embedding": embedding_str,
                    "model": EMBEDDING_VERSION,
                    "status": EmbeddingStatus.READY.value,
                    "id": row.id,
                },
            )
            count += 1

        conn.commit()
        return count


def backfill_flashcards(engine, embedder) -> int:
    """Re-embed all flashcards."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id, front_text, back_text
            FROM developer_schema.flashcards
            WHERE deleted_at IS NULL
            ORDER BY id
        """)).fetchall()

        count = 0
        for row in rows:
            content = f"{row.front_text or ''}\n\n{row.back_text or ''}"
            embedding = embed_text(embedder, content)
            if not embedding:
                continue

            embedding_str = f"[{','.join(map(str, embedding))}]"
            conn.execute(
                text(f"""
                    UPDATE developer_schema.flashcards
                    SET content_embedding = CAST(:embedding AS vector({EMBEDDING_DIM})),
                        embedding_model = :model,
                        embedding_status = :status
                    WHERE id = :id
                """),
                {
                    "embedding": embedding_str,
                    "model": EMBEDDING_VERSION,
                    "status": EmbeddingStatus.READY.value,
                    "id": row.id,
                },
            )
            count += 1

        conn.commit()
        return count


def backfill_chat_messages(engine, embedder) -> int:
    """Re-embed chat messages (assistant messages with content)."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT cm.id, cm.content, cm.role,
                   cs.title as session_title
            FROM developer_schema.chat_messages cm
            JOIN developer_schema.chat_sessions cs ON cs.id = cm.session_id
            WHERE LOWER(cm.role) = 'assistant'
            ORDER BY cm.id
        """)).fetchall()

        count = 0
        for row in rows:
            parts = []
            if row.session_title:
                parts.append(f"Session: {row.session_title}")
            parts.append(row.content or "")
            content = "\n".join(parts)

            embedding = embed_text(embedder, content)
            if not embedding:
                continue

            embedding_str = f"[{','.join(map(str, embedding))}]"
            conn.execute(
                text(f"""
                    UPDATE developer_schema.chat_messages
                    SET embedding = CAST(:embedding AS vector({EMBEDDING_DIM}))
                    WHERE id = :id
                """),
                {"embedding": embedding_str, "id": row.id},
            )
            count += 1

        conn.commit()
        return count


def backfill_quiz_questions(engine, embedder) -> int:
    """Re-embed quiz questions."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id, question_text
            FROM developer_schema.quiz_questions
            ORDER BY id
        """)).fetchall()

        count = 0
        for row in rows:
            embedding = embed_text(embedder, row.question_text)
            if not embedding:
                continue

            embedding_str = f"[{','.join(map(str, embedding))}]"
            conn.execute(
                text(f"""
                    UPDATE developer_schema.quiz_questions
                    SET prompt_embedding = CAST(:embedding AS vector({EMBEDDING_DIM})),
                        embedding_model = :model,
                        embedding_status = :status
                    WHERE id = :id
                """),
                {
                    "embedding": embedding_str,
                    "model": EMBEDDING_VERSION,
                    "status": EmbeddingStatus.READY.value,
                    "id": row.id,
                },
            )
            count += 1

        conn.commit()
        return count


def verify_dimensions(engine) -> dict:
    """Verify all embeddings are now 768d."""
    results = {}
    queries = {
        "notes": "SELECT COUNT(*) as total, COUNT(embedding) as embedded FROM developer_schema.notes WHERE deleted_at IS NULL",
        "flashcards": "SELECT COUNT(*) as total, COUNT(content_embedding) as embedded FROM developer_schema.flashcards WHERE deleted_at IS NULL",
        "chat_messages": "SELECT COUNT(*) as total, COUNT(embedding) as embedded FROM developer_schema.chat_messages WHERE LOWER(role) = 'assistant'",
        "quiz_questions": "SELECT COUNT(*) as total, COUNT(prompt_embedding) as embedded FROM developer_schema.quiz_questions",
    }

    dim_queries = {
        "notes": "SELECT vector_dims(embedding) FROM developer_schema.notes WHERE embedding IS NOT NULL LIMIT 1",
        "flashcards": "SELECT vector_dims(content_embedding) FROM developer_schema.flashcards WHERE content_embedding IS NOT NULL LIMIT 1",
        "chat_messages": "SELECT vector_dims(embedding) FROM developer_schema.chat_messages WHERE embedding IS NOT NULL LIMIT 1",
        "quiz_questions": "SELECT vector_dims(prompt_embedding) FROM developer_schema.quiz_questions WHERE prompt_embedding IS NOT NULL LIMIT 1",
    }

    with engine.connect() as conn:
        for entity, query in queries.items():
            row = conn.execute(text(query)).fetchone()
            dim_row = conn.execute(text(dim_queries[entity])).fetchone()
            dim = dim_row[0] if dim_row else None
            results[entity] = {
                "total": row.total,
                "embedded": row.embedded,
                "dimension": dim,
            }

    return results


def main():
    print("=" * 60)
    print("Synapse pgvector Embedding Backfill (384d → 768d)")
    print("=" * 60)
    print(f"Model: {EMBEDDING_VERSION}")
    print(f"Target dimension: {EMBEDDING_DIM}")
    print()

    # Initialize
    sync_url = get_sync_url()
    engine = create_engine(sync_url)
    embedder = get_embedder()

    # Test embedder output
    test = embedder.encode(["test"], normalize=True)
    actual_dim = test.shape[-1]
    print(f"Embedder output dimension: {actual_dim}")
    assert actual_dim == EMBEDDING_DIM, f"Dimension mismatch! Expected {EMBEDDING_DIM}, got {actual_dim}"
    print("✅ Embedder dimension verified\n")

    total_start = time.time()

    # Backfill each entity type
    entities = [
        ("Notes", backfill_notes),
        ("Flashcards", backfill_flashcards),
        ("Chat Messages", backfill_chat_messages),
        ("Quiz Questions", backfill_quiz_questions),
    ]

    total_embedded = 0
    for name, fn in entities:
        start = time.time()
        count = fn(engine, embedder)
        elapsed = time.time() - start
        total_embedded += count
        print(f"  {name}: {count} embedded in {elapsed:.1f}s")

    total_elapsed = time.time() - total_start
    print(f"\n{'=' * 60}")
    print(f"Total: {total_embedded} rows in {total_elapsed:.1f}s")
    print(f"{'=' * 60}\n")

    # Verify
    print("Verification:")
    results = verify_dimensions(engine)
    all_ok = True
    for entity, info in results.items():
        dim = info["dimension"]
        status = "✅" if dim == EMBEDDING_DIM else ("⚠️  NULL" if dim is None else f"❌ {dim}d")
        print(f"  {entity}: {info['embedded']}/{info['total']} embedded, dim={status}")
        if dim is not None and dim != EMBEDDING_DIM:
            all_ok = False

    print()
    if all_ok:
        print("✅ All embeddings are 768d. Migration complete.")
    else:
        print("❌ Some dimensions are incorrect. Check the output above.")

    engine.dispose()
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
