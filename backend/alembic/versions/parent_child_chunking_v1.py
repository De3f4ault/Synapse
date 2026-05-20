"""
Add parent_chunk_id and is_parent to document_chunks.

Sprint 2 Item 3 — Parent-Child Chunking schema migration.

Adds two columns to document_chunks:
  - parent_chunk_id: nullable FK to document_chunks.id (self-referential)
                     Points from a 512-token child to its 2048-token parent.
                     SET NULL on delete so orphaned children survive parent removal.
  - is_parent:       boolean, server default false. True only for synthetic
                     2048-token parent windows written by the ingestion pipeline.

Backward compatible:
  - All existing rows get is_parent=False and parent_chunk_id=NULL automatically.
  - All existing queries remain valid — the columns are simply unused for old data.
  - No existing indexes are touched.

Rollback:
  - Drops the FK constraint + index first, then removes both columns.
  - Data-safe: rollback removes columns but does not cascade-delete any rows.
"""

from alembic import op
import sqlalchemy as sa

revision = "parent_child_chunking_v1"
down_revision = "note_chunks_hnsw_v1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_parent first (no dependency)
    op.add_column(
        "document_chunks",
        sa.Column(
            "is_parent",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    # Add parent_chunk_id with self-referential FK
    op.add_column(
        "document_chunks",
        sa.Column(
            "parent_chunk_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_document_chunks_parent_chunk_id",
        "document_chunks",       # source table
        "document_chunks",       # referent table (self)
        ["parent_chunk_id"],     # local columns
        ["id"],                  # remote columns
        ondelete="SET NULL",
    )

    op.create_index(
        "ix_document_chunks_parent_chunk_id",
        "document_chunks",
        ["parent_chunk_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_document_chunks_parent_chunk_id", table_name="document_chunks")
    op.drop_constraint(
        "fk_document_chunks_parent_chunk_id",
        "document_chunks",
        type_="foreignkey",
    )
    op.drop_column("document_chunks", "parent_chunk_id")
    op.drop_column("document_chunks", "is_parent")
