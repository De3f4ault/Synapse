"""dms_002_add_classification_tables

DMS Phase 3: Classification, Tagging & Matching Engine.

Creates:
- correspondents table (MatchingModel)
- document_types table (MatchingModel)
- storage_paths table (MatchingModel + path_template)
- document_tags M2M join table

Modifies:
- tags table: add matching fields + is_inbox_tag + parent_id
- documents table: add correspondent_id, document_type_id, storage_path_id FKs

Revision ID: a3c7f1d24e89
Revises: 52433c7870e7
Create Date: 2026-03-15 14:07:00.000000+00:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a3c7f1d24e89"
down_revision = "52433c7870e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Create correspondents table
    # ------------------------------------------------------------------
    op.create_table(
        "correspondents",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("match", sa.String(length=256), nullable=True, server_default=""),
        sa.Column("matching_algorithm", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("is_insensitive", sa.Boolean(), nullable=True, server_default="true"),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_user_correspondent_name"),
    )
    op.create_index("ix_correspondents_user_id", "correspondents", ["user_id"])

    # ------------------------------------------------------------------
    # 2. Create document_types table
    # ------------------------------------------------------------------
    op.create_table(
        "document_types",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("match", sa.String(length=256), nullable=True, server_default=""),
        sa.Column("matching_algorithm", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("is_insensitive", sa.Boolean(), nullable=True, server_default="true"),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_user_document_type_name"),
    )
    op.create_index("ix_document_types_user_id", "document_types", ["user_id"])

    # ------------------------------------------------------------------
    # 3. Create storage_paths table
    # ------------------------------------------------------------------
    op.create_table(
        "storage_paths",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("match", sa.String(length=256), nullable=True, server_default=""),
        sa.Column("matching_algorithm", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("is_insensitive", sa.Boolean(), nullable=True, server_default="true"),
        sa.Column("path_template", sa.String(length=512), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_user_storage_path_name"),
    )
    op.create_index("ix_storage_paths_user_id", "storage_paths", ["user_id"])

    # ------------------------------------------------------------------
    # 4. Evolve tags table: add matching + hierarchy + inbox
    # ------------------------------------------------------------------
    op.add_column("tags", sa.Column("match", sa.String(length=256), nullable=True, server_default=""))
    op.add_column("tags", sa.Column("matching_algorithm", sa.Integer(), nullable=True, server_default="0"))
    op.add_column("tags", sa.Column("is_insensitive", sa.Boolean(), nullable=True, server_default="true"))
    op.add_column("tags", sa.Column("is_inbox_tag", sa.Boolean(), nullable=True, server_default="false"))
    op.add_column("tags", sa.Column("parent_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_tags_parent_id", "tags", "tags", ["parent_id"], ["id"], ondelete="SET NULL")

    # ------------------------------------------------------------------
    # 5. Create document_tags M2M join table
    # ------------------------------------------------------------------
    op.create_table(
        "document_tags",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_id", "tag_id", name="uq_document_tag"),
    )
    op.create_index("ix_document_tags_document_id", "document_tags", ["document_id"])
    op.create_index("ix_document_tags_tag_id", "document_tags", ["tag_id"])

    # ------------------------------------------------------------------
    # 6. Add classification FKs to documents table
    # ------------------------------------------------------------------
    op.add_column("documents", sa.Column("correspondent_id", sa.Integer(), nullable=True))
    op.add_column("documents", sa.Column("document_type_id", sa.Integer(), nullable=True))
    op.add_column("documents", sa.Column("storage_path_id", sa.Integer(), nullable=True))

    op.create_index("ix_documents_correspondent_id", "documents", ["correspondent_id"])
    op.create_index("ix_documents_document_type_id", "documents", ["document_type_id"])
    op.create_index("ix_documents_storage_path_id", "documents", ["storage_path_id"])

    op.create_foreign_key("fk_documents_correspondent_id", "documents", "correspondents", ["correspondent_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_documents_document_type_id", "documents", "document_types", ["document_type_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_documents_storage_path_id", "documents", "storage_paths", ["storage_path_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    # Drop classification FKs from documents
    op.drop_constraint("fk_documents_storage_path_id", "documents", type_="foreignkey")
    op.drop_constraint("fk_documents_document_type_id", "documents", type_="foreignkey")
    op.drop_constraint("fk_documents_correspondent_id", "documents", type_="foreignkey")
    op.drop_index("ix_documents_storage_path_id", table_name="documents")
    op.drop_index("ix_documents_document_type_id", table_name="documents")
    op.drop_index("ix_documents_correspondent_id", table_name="documents")
    op.drop_column("documents", "storage_path_id")
    op.drop_column("documents", "document_type_id")
    op.drop_column("documents", "correspondent_id")

    # Drop document_tags join table
    op.drop_index("ix_document_tags_tag_id", table_name="document_tags")
    op.drop_index("ix_document_tags_document_id", table_name="document_tags")
    op.drop_table("document_tags")

    # Revert tags evolution
    op.drop_constraint("fk_tags_parent_id", "tags", type_="foreignkey")
    op.drop_column("tags", "parent_id")
    op.drop_column("tags", "is_inbox_tag")
    op.drop_column("tags", "is_insensitive")
    op.drop_column("tags", "matching_algorithm")
    op.drop_column("tags", "match")

    # Drop new tables
    op.drop_index("ix_storage_paths_user_id", table_name="storage_paths")
    op.drop_table("storage_paths")
    op.drop_index("ix_document_types_user_id", table_name="document_types")
    op.drop_table("document_types")
    op.drop_index("ix_correspondents_user_id", table_name="correspondents")
    op.drop_table("correspondents")
