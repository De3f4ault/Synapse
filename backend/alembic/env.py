"""
Alembic environment configuration for SYNAPSE.

CRITICAL NOTES:
- App uses asyncpg (async driver)
- Alembic uses psycopg2 (sync driver)
- All tables go in developer_schema
- URL is converted from asyncpg to psycopg2 automatically
"""

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


def include_object(object, name, type_, reflected, compare_to):
    """
    Exclude alembic_version table from autogenerate detection.

    This prevents Alembic from trying to drop its own version table
    when using version_table_schema with custom schemas.
    """
    if type_ == "table" and name == "alembic_version":
        return False
    return True


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    Generates SQL scripts without database connection.
    """
    # Convert async URL to sync URL for Alembic
    sync_url = settings.DATABASE_URL.replace('+asyncpg', '+psycopg2')

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
    # Convert async URL to sync URL for Alembic
    sync_url = settings.DATABASE_URL.replace('+asyncpg', '+psycopg2')

    # Create synchronous engine
    connectable = create_engine(
        sync_url,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Create schema if it doesn't exist (outside transaction)
        connection.execute(
            text(f"CREATE SCHEMA IF NOT EXISTS {settings.DATABASE_SCHEMA}")
        )
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
            connection.execute(
                text(f"SET search_path TO {settings.DATABASE_SCHEMA}, public")
            )
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
