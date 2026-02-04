"""Add document_folders table and folder_id to documents.

Phase 0: Documents Folder Tree

Revision ID: document_folders_001
Revises: 9a6fe7b8092f
Create Date: 2026-01-22 08:30:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "document_folders_001"
down_revision = "9a6fe7b8092f"  # add_notifications_table
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create document_folders table
    op.create_table(
        "document_folders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("rank", sa.String(length=64), nullable=False, server_default="a0"),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("settings", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["parent_id"], ["document_folders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "parent_id", "name", name="uq_folder_name_per_parent"),
    )

    # Create indexes for document_folders
    op.create_index(
        "ix_document_folders_parent", "document_folders", ["user_id", "parent_id"], unique=False
    )
    op.create_index("ix_document_folders_user_id", "document_folders", ["user_id"], unique=False)
    op.create_index(
        op.f("ix_document_folders_parent_id"), "document_folders", ["parent_id"], unique=False
    )

    # Add new columns to documents table
    op.add_column("documents", sa.Column("folder_id", sa.Integer(), nullable=True))
    op.add_column(
        "documents",
        sa.Column("source_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "documents", sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default="false")
    )
    op.add_column(
        "documents", sa.Column("is_archived", sa.Boolean(), nullable=False, server_default="false")
    )

    # Create foreign key and index for folder_id
    op.create_foreign_key(
        "fk_documents_folder_id",
        "documents",
        "document_folders",
        ["folder_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_documents_folder_id", "documents", ["folder_id"], unique=False)

    # Migrate file_metadata from JSON to JSONB if not already done
    # This is safe to run even if already JSONB
    op.execute("""
        ALTER TABLE documents 
        ALTER COLUMN file_metadata TYPE jsonb 
        USING file_metadata::jsonb
    """)


def downgrade() -> None:
    # Remove foreign key and index
    op.drop_constraint("fk_documents_folder_id", "documents", type_="foreignkey")
    op.drop_index("ix_documents_folder_id", table_name="documents")

    # Remove columns from documents
    op.drop_column("documents", "is_archived")
    op.drop_column("documents", "is_pinned")
    op.drop_column("documents", "source_metadata")
    op.drop_column("documents", "folder_id")

    # Drop document_folders table
    op.drop_index("ix_document_folders_parent", table_name="document_folders")
    op.drop_index("ix_document_folders_user_id", table_name="document_folders")
    op.drop_index(op.f("ix_document_folders_parent_id"), table_name="document_folders")
    op.drop_table("document_folders")
