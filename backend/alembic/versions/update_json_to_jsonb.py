"""update json columns to jsonb

Revision ID: update_json_to_jsonb
Revises: 052d2385be9e
Create Date: 2025-12-01 14:00:00.000000

IMPORTANT: This migration converts all JSON columns to JSONB for consistency
and to prevent type coercion errors in PostgreSQL functions.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'update_json_to_jsonb'
down_revision = '052d2385be9e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Convert all JSON columns to JSONB.

    This fixes the type coercion errors between json and jsonb types
    that were causing PostgreSQL function failures.
    """

    # Set search path
    op.execute("SET search_path TO developer_schema, public")

    # Users table
    op.alter_column('users', 'preferences',
                    existing_type=sa.JSON(),
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    existing_nullable=True,
                    postgresql_using='preferences::jsonb')

    # Decks table
    op.alter_column('decks', 'ai_metadata',
                    existing_type=sa.JSON(),
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    existing_nullable=True,
                    postgresql_using='ai_metadata::jsonb')

    # Documents table
    op.alter_column('documents', 'file_metadata',
                    existing_type=sa.JSON(),
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    existing_nullable=True,
                    postgresql_using='file_metadata::jsonb')

    # Quizzes table
    op.alter_column('quizzes', 'source_ids',
                    existing_type=sa.JSON(),
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    existing_nullable=True,
                    postgresql_using='source_ids::jsonb')

    # Quiz questions table
    op.alter_column('quiz_questions', 'options',
                    existing_type=sa.JSON(),
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    existing_nullable=True,
                    postgresql_using='options::jsonb')

    # Quiz attempts table
    op.alter_column('quiz_attempts', 'answers',
                    existing_type=sa.JSON(),
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    existing_nullable=False,
                    postgresql_using='answers::jsonb')

    # Study sessions table
    op.alter_column('study_sessions', 'modules_used',
                    existing_type=sa.JSON(),
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    existing_nullable=False,
                    postgresql_using='modules_used::jsonb')

    op.alter_column('study_sessions', 'performance_data',
                    existing_type=sa.JSON(),
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    existing_nullable=True,
                    postgresql_using='performance_data::jsonb')

    # Chat sessions table
    op.alter_column('chat_sessions', 'context_modules',
                    existing_type=sa.JSON(),
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    existing_nullable=True,
                    postgresql_using='context_modules::jsonb')

    # Chat messages table (CRITICAL - these were causing the errors)
    op.alter_column('chat_messages', 'function_calls',
                    existing_type=sa.JSON(),
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    existing_nullable=True,
                    postgresql_using='function_calls::jsonb')

    op.alter_column('chat_messages', 'grounding_sources',
                    existing_type=sa.JSON(),
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    existing_nullable=True,
                    postgresql_using='grounding_sources::jsonb')

    # Document chunks table
    op.alter_column('document_chunks', 'chunk_metadata',
                    existing_type=sa.JSON(),
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    existing_nullable=True,
                    postgresql_using='chunk_metadata::jsonb')

    # Webhook events table
    op.alter_column('webhook_events', 'payload',
                    existing_type=sa.JSON(),
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    existing_nullable=False,
                    postgresql_using='payload::jsonb')


def downgrade() -> None:
    """
    Revert JSONB columns back to JSON.

    WARNING: This may cause the original type coercion errors to return.
    Only use this if you need to rollback for compatibility reasons.
    """

    # Set search path
    op.execute("SET search_path TO developer_schema, public")

    # Users table
    op.alter_column('users', 'preferences',
                    existing_type=postgresql.JSONB(astext_type=sa.Text()),
                    type_=sa.JSON(),
                    existing_nullable=True,
                    postgresql_using='preferences::json')

    # Decks table
    op.alter_column('decks', 'ai_metadata',
                    existing_type=postgresql.JSONB(astext_type=sa.Text()),
                    type_=sa.JSON(),
                    existing_nullable=True,
                    postgresql_using='ai_metadata::json')

    # Documents table
    op.alter_column('documents', 'file_metadata',
                    existing_type=postgresql.JSONB(astext_type=sa.Text()),
                    type_=sa.JSON(),
                    existing_nullable=True,
                    postgresql_using='file_metadata::json')

    # Quizzes table
    op.alter_column('quizzes', 'source_ids',
                    existing_type=postgresql.JSONB(astext_type=sa.Text()),
                    type_=sa.JSON(),
                    existing_nullable=True,
                    postgresql_using='source_ids::json')

    # Quiz questions table
    op.alter_column('quiz_questions', 'options',
                    existing_type=postgresql.JSONB(astext_type=sa.Text()),
                    type_=sa.JSON(),
                    existing_nullable=True,
                    postgresql_using='options::json')

    # Quiz attempts table
    op.alter_column('quiz_attempts', 'answers',
                    existing_type=postgresql.JSONB(astext_type=sa.Text()),
                    type_=sa.JSON(),
                    existing_nullable=False,
                    postgresql_using='answers::json')

    # Study sessions table
    op.alter_column('study_sessions', 'modules_used',
                    existing_type=postgresql.JSONB(astext_type=sa.Text()),
                    type_=sa.JSON(),
                    existing_nullable=False,
                    postgresql_using='modules_used::json')

    op.alter_column('study_sessions', 'performance_data',
                    existing_type=postgresql.JSONB(astext_type=sa.Text()),
                    type_=sa.JSON(),
                    existing_nullable=True,
                    postgresql_using='performance_data::json')

    # Chat sessions table
    op.alter_column('chat_sessions', 'context_modules',
                    existing_type=postgresql.JSONB(astext_type=sa.Text()),
                    type_=sa.JSON(),
                    existing_nullable=True,
                    postgresql_using='context_modules::json')

    # Chat messages table
    op.alter_column('chat_messages', 'function_calls',
                    existing_type=postgresql.JSONB(astext_type=sa.Text()),
                    type_=sa.JSON(),
                    existing_nullable=True,
                    postgresql_using='function_calls::json')

    op.alter_column('chat_messages', 'grounding_sources',
                    existing_type=postgresql.JSONB(astext_type=sa.Text()),
                    type_=sa.JSON(),
                    existing_nullable=True,
                    postgresql_using='grounding_sources::json')

    # Document chunks table
    op.alter_column('document_chunks', 'chunk_metadata',
                    existing_type=postgresql.JSONB(astext_type=sa.Text()),
                    type_=sa.JSON(),
                    existing_nullable=True,
                    postgresql_using='chunk_metadata::json')

    # Webhook events table
    op.alter_column('webhook_events', 'payload',
                    existing_type=postgresql.JSONB(astext_type=sa.Text()),
                    type_=sa.JSON(),
                    existing_nullable=False,
                    postgresql_using='payload::json')
