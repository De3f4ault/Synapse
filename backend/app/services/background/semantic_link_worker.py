"""
Semantic Link Worker — Nightly Graph Enrichment

Celery periodic task that:
1. Scans entities with embeddings
2. Finds semantically similar cross-type pairs using pgvector
3. Creates/updates SEMANTIC links with strength = cosine similarity
4. Decays existing semantic links (strength × 0.95)
5. Prunes links with strength < 0.3

Uses synchronous DB access (SessionLocal) to match Celery's prefork model.
"""

import structlog
from typing import Dict, Any

from sqlalchemy import text

from app.services.background.celery_app import celery_app

logger = structlog.get_logger(__name__)

# ============================================================
# Configuration
# ============================================================

# Minimum cosine similarity to create a SEMANTIC link
MIN_SIMILARITY = 0.70

# Maximum neighbors to link per entity
MAX_NEIGHBORS_PER_ENTITY = 5

# Decay multiplier applied to existing SEMANTIC links each nightly run
DECAY_FACTOR = 0.95

# Minimum strength before a SEMANTIC link is pruned
PRUNE_THRESHOLD = 0.30

# Batch size for scanning entities
SCAN_BATCH_SIZE = 100


# ============================================================
# Main nightly task
# ============================================================


@celery_app.task(
    bind=True,
    name="graph.semantic_link_scan",
    queue="default",
    time_limit=3600,  # 1 hour max
    soft_time_limit=3300,  # Warn at 55 min
    acks_late=True,
)
def semantic_link_scan_task(self) -> Dict[str, Any]:
    """
    Nightly semantic scan: discover, decay, and prune SEMANTIC links.

    Flow:
      1. Decay all existing SEMANTIC links by DECAY_FACTOR
      2. Prune links that dropped below PRUNE_THRESHOLD
      3. For each user, find cross-type semantic neighbors and upsert links
    """
    from app.db.session import SessionLocal

    stats = {
        "decayed": 0,
        "pruned": 0,
        "links_created": 0,
        "users_scanned": 0,
        "errors": 0,
    }

    logger.info("semantic_link_scan_start")

    try:
        with SessionLocal() as db:
            # ========================================================
            # Step 1: Decay all existing SEMANTIC links
            # ========================================================
            result = db.execute(
                text("""
                UPDATE links
                SET strength = strength * :decay_factor,
                    updated_at = NOW()
                WHERE link_type = 'SEMANTIC'
            """),
                {"decay_factor": DECAY_FACTOR},
            )
            stats["decayed"] = result.rowcount
            db.commit()

            logger.info("semantic_decay_complete", decayed=stats["decayed"])

            # ========================================================
            # Step 2: Prune weak links
            # ========================================================
            result = db.execute(
                text("""
                DELETE FROM links
                WHERE link_type = 'SEMANTIC'
                  AND strength < :threshold
            """),
                {"threshold": PRUNE_THRESHOLD},
            )
            stats["pruned"] = result.rowcount
            db.commit()

            logger.info("semantic_prune_complete", pruned=stats["pruned"])

            # ========================================================
            # Step 3: Discover new semantic neighbors per user
            # ========================================================
            users = db.execute(
                text("""
                SELECT DISTINCT user_id FROM (
                    SELECT user_id FROM notes
                    WHERE embedding IS NOT NULL AND deleted_at IS NULL
                    UNION
                    SELECT d.user_id FROM flashcards f
                    JOIN decks d ON d.id = f.deck_id
                    WHERE f.content_embedding IS NOT NULL
                      AND f.deleted_at IS NULL AND d.deleted_at IS NULL
                ) AS embedded_users
            """)
            )
            user_ids = [row[0] for row in users.fetchall()]

            for user_id in user_ids:
                try:
                    created = _scan_user_semantic_links(db, user_id)
                    stats["links_created"] += created
                    stats["users_scanned"] += 1
                except Exception as e:
                    stats["errors"] += 1
                    logger.error(
                        "semantic_scan_user_error",
                        user_id=user_id,
                        error=str(e),
                    )
                    db.rollback()

    except Exception as e:
        stats["errors"] += 1
        logger.error("semantic_link_scan_error", error=str(e), exc_info=True)

    logger.info("semantic_link_scan_complete", **stats)
    return stats


def _scan_user_semantic_links(db, user_id: int) -> int:
    """
    For a single user, find cross-type semantic neighbors and upsert links.

    Strategy: Use notes as anchor points (they tend to be more comprehensive),
    then find similar flashcards. Also link similar notes to each other.

    Returns number of links created/updated.
    """
    links_created = 0

    # ---------------------------------------------------------------
    # A. Note → Flashcard links: for each note, find similar flashcards
    # ---------------------------------------------------------------
    note_rows = db.execute(
        text("""
        SELECT n.id, n.embedding
        FROM notes n
        WHERE n.user_id = :user_id
          AND n.embedding IS NOT NULL
          AND n.deleted_at IS NULL
        ORDER BY n.id
        LIMIT :batch_limit
    """),
        {"user_id": user_id, "batch_limit": SCAN_BATCH_SIZE},
    ).fetchall()

    for note_row in note_rows:
        note_id = note_row[0]
        # note_row[1] is the raw embedding from pgvector

        # Find similar flashcards using cosine distance
        neighbors = db.execute(
            text("""
            SELECT
                f.id AS flashcard_id,
                1.0 - (f.content_embedding <=> n.embedding) AS similarity
            FROM flashcards f
            JOIN decks d ON d.id = f.deck_id
            CROSS JOIN (
                SELECT embedding FROM notes WHERE id = :note_id
            ) n
            WHERE d.user_id = :user_id
              AND f.content_embedding IS NOT NULL
              AND f.deleted_at IS NULL
              AND d.deleted_at IS NULL
              AND 1.0 - (f.content_embedding <=> n.embedding) >= :min_sim
            ORDER BY f.content_embedding <=> n.embedding
            LIMIT :max_neighbors
        """),
            {
                "note_id": note_id,
                "user_id": user_id,
                "min_sim": MIN_SIMILARITY,
                "max_neighbors": MAX_NEIGHBORS_PER_ENTITY,
            },
        ).fetchall()

        for neighbor in neighbors:
            flashcard_id = neighbor[0]
            similarity = float(neighbor[1])

            links_created += _upsert_semantic_link(
                db,
                user_id,
                source_type="NOTE",
                source_id=note_id,
                target_type="FLASHCARD",
                target_id=flashcard_id,
                strength=similarity,
            )

    # ---------------------------------------------------------------
    # B. Note → Note links: find similar notes
    # ---------------------------------------------------------------
    if len(note_rows) > 1:
        similar_notes = db.execute(
            text("""
            SELECT
                n1.id AS source_id,
                n2.id AS target_id,
                1.0 - (n1.embedding <=> n2.embedding) AS similarity
            FROM notes n1
            JOIN notes n2 ON n1.id < n2.id  -- avoid duplicates + self-joins
            WHERE n1.user_id = :user_id
              AND n2.user_id = :user_id
              AND n1.embedding IS NOT NULL
              AND n2.embedding IS NOT NULL
              AND n1.deleted_at IS NULL
              AND n2.deleted_at IS NULL
              AND 1.0 - (n1.embedding <=> n2.embedding) >= :min_sim
            ORDER BY n1.embedding <=> n2.embedding
            LIMIT :max_links
        """),
            {
                "user_id": user_id,
                "min_sim": MIN_SIMILARITY,
                "max_links": SCAN_BATCH_SIZE,
            },
        ).fetchall()

        for row in similar_notes:
            links_created += _upsert_semantic_link(
                db,
                user_id,
                source_type="NOTE",
                source_id=row[0],
                target_type="NOTE",
                target_id=row[1],
                strength=float(row[2]),
            )

    db.commit()
    return links_created


def _upsert_semantic_link(
    db,
    user_id: int,
    source_type: str,
    source_id: int,
    target_type: str,
    target_id: int,
    strength: float,
) -> int:
    """
    Upsert a SEMANTIC link. Uses ON CONFLICT to update strength
    if the new similarity is higher than the existing (decayed) value.

    Returns 1 if a link was created/updated, 0 otherwise.
    """
    result = db.execute(
        text("""
        INSERT INTO links (
            user_id, source_type, source_id,
            target_type, target_id, link_type,
            strength, label, link_metadata,
            created_at, updated_at
        )
        VALUES (
            :user_id, :source_type, :source_id,
            :target_type, :target_id, 'SEMANTIC',
            :strength, 'semantically similar', '{}'::jsonb,
            NOW(), NOW()
        )
        ON CONFLICT ON CONSTRAINT uq_link_edge
        DO UPDATE SET
            strength = GREATEST(links.strength, EXCLUDED.strength),
            updated_at = NOW()
        WHERE EXCLUDED.strength > links.strength
    """),
        {
            "user_id": user_id,
            "source_type": source_type,
            "source_id": source_id,
            "target_type": target_type,
            "target_id": target_id,
            "strength": strength,
        },
    )
    return result.rowcount


# ============================================================
# On-demand refresh (rate-limited, called from API)
# ============================================================


@celery_app.task(
    bind=True,
    name="graph.semantic_refresh_user",
    queue="default",
    time_limit=120,
    soft_time_limit=100,
    rate_limit="1/h",  # Max 1 call per hour per worker
    acks_late=True,
)
def semantic_refresh_user_task(self, user_id: int) -> Dict[str, Any]:
    """
    On-demand semantic refresh for a specific user.

    Rate-limited to 1 per hour to prevent database overload.
    Triggered from the API when user requests a graph refresh.
    """
    from app.db.session import SessionLocal

    logger.info("semantic_refresh_user_start", user_id=user_id)

    try:
        with SessionLocal() as db:
            created = _scan_user_semantic_links(db, user_id)

        logger.info(
            "semantic_refresh_user_complete",
            user_id=user_id,
            links_created=created,
        )
        return {"status": "success", "user_id": user_id, "links_created": created}

    except Exception as e:
        logger.error(
            "semantic_refresh_user_error",
            user_id=user_id,
            error=str(e),
            exc_info=True,
        )
        return {"status": "error", "user_id": user_id, "error": str(e)}
