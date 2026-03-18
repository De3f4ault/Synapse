"""DMS 005: Add permissions and sharing tables

Creates the permission & sharing schema:
  - document_permissions: object-level ACL (user → document → view/change)
  - share_links: anonymous access via unique slug

Revision ID: d6f0a4b57c12
Revises: c5e9f3a46b01
Create Date: 2026-03-15
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "d6f0a4b57c12"
down_revision = "c5e9f3a46b01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ---------------------------------------------------------------
    # 1. document_permissions — object-level ACL
    # ---------------------------------------------------------------
    op.create_table(
        "document_permissions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("group_id", sa.Integer(), nullable=True),
        sa.Column("permission", sa.String(20), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["document_id"], ["documents.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.UniqueConstraint(
            "document_id", "user_id", "permission",
            name="uq_doc_user_perm",
        ),
    )
    op.create_index(
        "ix_doc_perms_document", "document_permissions", ["document_id"]
    )
    op.create_index(
        "ix_doc_perms_user", "document_permissions", ["user_id"]
    )
    op.create_index(
        "ix_doc_perms_group", "document_permissions", ["group_id"]
    )

    # ---------------------------------------------------------------
    # 2. share_links — anonymous access via slug
    # ---------------------------------------------------------------
    op.create_table(
        "share_links",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(64), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column(
            "expiration", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column(
            "file_version", sa.String(10), server_default="archive"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["document_id"], ["documents.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["created_by"], ["users.id"], ondelete="SET NULL"
        ),
        sa.UniqueConstraint("slug", name="uq_share_links_slug"),
    )
    op.create_index(
        "ix_share_links_document", "share_links", ["document_id"]
    )
    op.create_index("ix_share_links_slug", "share_links", ["slug"])
    op.create_index(
        "ix_share_links_expiration", "share_links", ["expiration"]
    )


def downgrade() -> None:
    op.drop_index("ix_share_links_expiration", table_name="share_links")
    op.drop_index("ix_share_links_slug", table_name="share_links")
    op.drop_index("ix_share_links_document", table_name="share_links")
    op.drop_table("share_links")
    op.drop_index("ix_doc_perms_group", table_name="document_permissions")
    op.drop_index("ix_doc_perms_user", table_name="document_permissions")
    op.drop_index("ix_doc_perms_document", table_name="document_permissions")
    op.drop_table("document_permissions")
