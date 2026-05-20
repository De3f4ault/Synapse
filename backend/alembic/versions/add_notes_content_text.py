"""Add content_text to notes and note_versions

Revision ID: add_notes_content_text
Revises: migrate_pgvector_384_to_768
Create Date: 2026-04-13

Adds a plain-text extraction column to notes and note_versions.
This column is populated by the frontend editor at save time (not by the backend).
It feeds: embedding pipeline, BM25 search, RAG context, AI chat.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "add_notes_content_text"
down_revision = "migrate_pgvector_384_to_768"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "notes",
        sa.Column("content_text", sa.Text(), nullable=True),
        schema="developer_schema",
    )
    op.add_column(
        "note_versions",
        sa.Column("content_text", sa.Text(), nullable=True),
        schema="developer_schema",
    )


def downgrade() -> None:
    op.drop_column("notes", "content_text", schema="developer_schema")
    op.drop_column("note_versions", "content_text", schema="developer_schema")
