"""
Alembic environment configuration for SYNAPSE.

CRITICAL NOTES:
- App uses asyncpg (async driver)
- Alembic uses psycopg2 (sync driver)
- All tables go in developer_schema
- URL is converted from asyncpg to psycopg2 automatically

REPLICA-FIRST DDL ORDERING:
- Set ALEMBIC_TARGET=replica to run migrations against the Logical Replica first.
- This prevents replication stream crashes caused by the replica receiving WAL
  records for columns that don't exist on its schema yet.
- Always use `make migrate-safe` instead of running `alembic upgrade head` directly.
  It enforces the correct sequence: Replica first, then Primary.
"""

import os
import sys
from pathlib import Path
from logging.config import fileConfig

from sqlalchemy import create_engine, pool, text
from alembic import context

# Add parent directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
from app.db.base import Base
from app.models import *  # noqa: F403, F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_target_url() -> str:
    """
    Return the database URL for the migration target.

    When ALEMBIC_TARGET=replica, connects to ANALYTICS_DATABASE_URL (Logical Replica).
    Otherwise connects to DATABASE_URL (Primary).

    Raises RuntimeError in production if ANALYTICS_DATABASE_URL is unset when
    ALEMBIC_TARGET=replica — fail loudly at migration time, not silently.
    """
    target = os.getenv("ALEMBIC_TARGET", "primary")
    if target == "replica":
        url = os.environ.get("ANALYTICS_DATABASE_URL", "")
        if not url:
            raise RuntimeError(
                "ALEMBIC_TARGET=replica requires ANALYTICS_DATABASE_URL to be set.\n"
                "Set it to the Logical Replica connection string and retry."
            )
        return url
    return settings.DATABASE_URL


# Indexes managed outside Alembic (ParadeDB BM25, DiskANN, partial indexes)
# These are created by app/sql/indexes/create_hybrid_indexes.sql
EXTERNAL_INDEXES = {
    "notes_bm25_idx",
    "notes_embedding_diskann_idx",
    "notes_user_id_idx",
    "flashcards_bm25_idx",
    "flashcards_embedding_diskann_idx",
    "flashcards_deck_id_idx",
}


def include_object(object, name, type_, reflected, compare_to):
    """
    Exclude alembic_version table and externally-managed indexes from autogenerate.

    This prevents Alembic from:
    - Trying to drop its own version table
    - Generating migrations for indexes managed by create_hybrid_indexes.sql
    """
    if type_ == "table" and name == "alembic_version":
        return False
    # Skip indexes managed by external SQL scripts
    if type_ == "index" and name in EXTERNAL_INDEXES:
        return False
    return True


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    Generates SQL scripts without database connection.
    """
    # get_target_url() selects Primary or Replica based on ALEMBIC_TARGET env var.
    sync_url = get_target_url().replace("+asyncpg", "+psycopg2")

    context.configure(
        url=sync_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table_schema=settings.DATABASE_SCHEMA,
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.
    Executes migrations against live database.
    """
    # get_target_url() selects Primary or Replica based on ALEMBIC_TARGET env var.
    sync_url = get_target_url().replace("+asyncpg", "+psycopg2")

    # Create synchronous engine
    connectable = create_engine(
        sync_url,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Create schema if it doesn't exist (outside transaction)
        connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {settings.DATABASE_SCHEMA}"))
        connection.commit()

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            version_table_schema=settings.DATABASE_SCHEMA,
            compare_type=True,
            compare_server_default=True,
            include_object=include_object,
        )

        with context.begin_transaction():
            # Set search_path INSIDE transaction for proper schema targeting
            connection.execute(text(f"SET search_path TO {settings.DATABASE_SCHEMA}, public"))
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
