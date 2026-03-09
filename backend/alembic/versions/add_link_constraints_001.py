"""Add unique constraint and check constraint to links table.

Enables idempotent upserts (ON CONFLICT DO UPDATE) for automated
link creation via GraphLinker, and prevents self-referencing links.

Also upgrades indexes to include user_id for scoped traversal queries.

Revision ID: add_link_constraints_001
Revises: add_artifacts_002
Create Date: 2026-02-19
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "add_link_constraints_001"
down_revision = "add_artifacts_002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Remove any existing duplicate rows BEFORE adding the constraint.
    #    Keeps the row with the lowest id (oldest).
    # ------------------------------------------------------------------
    op.execute("""
        DELETE FROM links
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM links
            GROUP BY user_id, source_type, source_id,
                     target_type, target_id, link_type
        )
    """)

    # ------------------------------------------------------------------
    # 2. Remove any self-loops before adding the check constraint.
    # ------------------------------------------------------------------
    op.execute("""
        DELETE FROM links
        WHERE source_type = target_type AND source_id = target_id
    """)

    # ------------------------------------------------------------------
    # 3. Add unique constraint (enables ON CONFLICT DO UPDATE).
    #    This also creates an implicit B-tree index on the columns.
    # ------------------------------------------------------------------
    op.create_unique_constraint(
        "uq_link_edge",
        "links",
        ["user_id", "source_type", "source_id", "target_type", "target_id", "link_type"],
    )

    # ------------------------------------------------------------------
    # 4. Add check constraint (no self-links).
    # ------------------------------------------------------------------
    op.execute("""
        ALTER TABLE links ADD CONSTRAINT ck_link_no_self_loop
        CHECK (NOT (source_type = target_type AND source_id = target_id))
    """)

    # ------------------------------------------------------------------
    # 5. Replace old indexes with user-scoped composite indexes
    #    for faster traversal queries.
    # ------------------------------------------------------------------
    # Drop old narrow indexes (if they exist)
    op.execute("DROP INDEX IF EXISTS ix_links_source")
    op.execute("DROP INDEX IF EXISTS ix_links_target")

    # Create new user-scoped composite indexes
    op.create_index(
        "ix_links_user_source",
        "links",
        ["user_id", "source_type", "source_id"],
    )
    op.create_index(
        "ix_links_user_target",
        "links",
        ["user_id", "target_type", "target_id"],
    )


def downgrade() -> None:
    # Drop new indexes
    op.execute("DROP INDEX IF EXISTS ix_links_user_source")
    op.execute("DROP INDEX IF EXISTS ix_links_user_target")

    # Recreate old indexes
    op.create_index("ix_links_source", "links", ["source_type", "source_id"])
    op.create_index("ix_links_target", "links", ["target_type", "target_id"])

    # Drop constraints
    op.execute("ALTER TABLE links DROP CONSTRAINT IF EXISTS ck_link_no_self_loop")
    op.drop_constraint("uq_link_edge", "links", type_="unique")
