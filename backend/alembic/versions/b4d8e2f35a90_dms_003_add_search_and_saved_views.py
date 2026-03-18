"""dms_003_add_search_and_saved_views

DMS Phase 4: Search Engine + Saved Views.

Creates:
- search_vector generated tsvector column on documents (weighted A/B/C)
- GIN index on search_vector for full-text search
- Composite indexes for filter performance
- saved_views table
- saved_view_filter_rules table

Revision ID: b4d8e2f35a90
Revises: a3c7f1d24e89
Create Date: 2026-03-15 15:00:00.000000+00:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "b4d8e2f35a90"
down_revision = "a3c7f1d24e89"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Add search_vector generated column to documents
    #
    # Weights:
    #   A (highest) = filename — searching by filename should strongly match
    #   B           = notes   — user-written annotations are intentional
    #   C (lowest)  = content_text — full document text, broad matches
    #
    # GENERATED ALWAYS AS ... STORED auto-updates when source columns change.
    # Requires PostgreSQL 12+.
    # ------------------------------------------------------------------
    op.execute("""
        ALTER TABLE documents ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
            setweight(to_tsvector('english', coalesce(filename, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(notes, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(content_text, '')), 'C')
        ) STORED
    """)

    # ------------------------------------------------------------------
    # 2. GIN index for full-text search
    # ------------------------------------------------------------------
    op.execute(
        "CREATE INDEX idx_documents_search_vector "
        "ON documents USING GIN (search_vector)"
    )

    # ------------------------------------------------------------------
    # 3. Composite indexes for metadata filter performance
    # ------------------------------------------------------------------
    op.execute(
        "CREATE INDEX idx_documents_user_correspondent "
        "ON documents (user_id, correspondent_id) "
        "WHERE deleted_at IS NULL"
    )
    op.execute(
        "CREATE INDEX idx_documents_user_type "
        "ON documents (user_id, document_type_id) "
        "WHERE deleted_at IS NULL"
    )
    op.execute(
        "CREATE INDEX idx_documents_user_created "
        "ON documents (user_id, created_date)"
    )

    # ------------------------------------------------------------------
    # 4. Create saved_views table
    # ------------------------------------------------------------------
    op.create_table(
        "saved_views",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("sort_field", sa.String(length=50), server_default="created_at", nullable=False),
        sa.Column("sort_reverse", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("show_on_dashboard", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("show_in_sidebar", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("page_size", sa.Integer(), server_default="25", nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_saved_views_user_id", "saved_views", ["user_id"])

    # ------------------------------------------------------------------
    # 5. Create saved_view_filter_rules table
    # ------------------------------------------------------------------
    op.create_table(
        "saved_view_filter_rules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("saved_view_id", sa.Integer(), nullable=False),
        sa.Column("rule_type", sa.Integer(), nullable=False),
        sa.Column("value", sa.String(length=256), nullable=True),
        sa.ForeignKeyConstraint(
            ["saved_view_id"], ["saved_views.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_svfr_saved_view_id", "saved_view_filter_rules", ["saved_view_id"]
    )


def downgrade() -> None:
    # Drop saved_view_filter_rules
    op.drop_index("ix_svfr_saved_view_id", table_name="saved_view_filter_rules")
    op.drop_table("saved_view_filter_rules")

    # Drop saved_views
    op.drop_index("ix_saved_views_user_id", table_name="saved_views")
    op.drop_table("saved_views")

    # Drop composite indexes
    op.execute("DROP INDEX IF EXISTS idx_documents_user_created")
    op.execute("DROP INDEX IF EXISTS idx_documents_user_type")
    op.execute("DROP INDEX IF EXISTS idx_documents_user_correspondent")

    # Drop GIN index
    op.execute("DROP INDEX IF EXISTS idx_documents_search_vector")

    # Drop search_vector column
    op.drop_column("documents", "search_vector")
