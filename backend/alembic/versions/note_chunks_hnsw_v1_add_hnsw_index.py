"""Add HNSW index on note_chunks.embedding for fast ANN search.

Revision ID: note_chunks_hnsw_v1
Revises: merge_chunks_deck_001
Create Date: 2026-05-06 00:00:00.000000

This migration is intentionally separate from note_chunks_v1.

When to run:
  Apply this migration ONLY after note_chunks contains > 1000 rows (enough for
  HNSW to be beneficial — below that a sequential scan is faster).

HNSW parameters:
  m=16               — connections per layer. 16 is the pgvector default.
  ef_construction=64 — build-time recall tradeoff. Increase to 128 for
                       higher recall at the cost of longer build time.

Query-time ef_search:
  SET hnsw.ef_search = 100;  -- in ContentHydrator session before queries

Note on CREATE INDEX CONCURRENTLY:
  Cannot run inside a transaction block. We obtain the raw DBAPI connection
  from op.get_bind().connection and set isolation_level = 0 (AUTOCOMMIT)
  for the duration of the DDL statement only.
"""

from alembic import op

# revision identifiers
revision = "note_chunks_hnsw_v1"
down_revision = "merge_chunks_deck_001"
branch_labels = None
depends_on = None

_SCHEMA = "developer_schema"


def _autocommit_execute(sql: str) -> None:
    """Execute a DDL statement outside any transaction (AUTOCOMMIT mode).

    Uses sync_engine directly because op.get_bind() returns an async-wrapped
    Connection in this SQLAlchemy version. sync_engine.raw_connection() gives
    us the actual psycopg2 connection we can set isolation_level on.
    """
    from app.db.session import sync_engine

    raw_conn = sync_engine.raw_connection()
    old_isolation = raw_conn.isolation_level
    raw_conn.set_isolation_level(0)  # psycopg2: 0 = AUTOCOMMIT
    try:
        cursor = raw_conn.cursor()
        cursor.execute(sql)
        cursor.close()
    finally:
        raw_conn.set_isolation_level(old_isolation)
        raw_conn.close()


def upgrade():
    _autocommit_execute(f"""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_note_chunks_embedding_hnsw
            ON {_SCHEMA}.note_chunks
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
    """)


def downgrade():
    _autocommit_execute(
        f"DROP INDEX CONCURRENTLY IF EXISTS {_SCHEMA}.idx_note_chunks_embedding_hnsw"
    )
