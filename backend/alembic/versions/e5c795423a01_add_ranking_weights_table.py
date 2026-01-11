"""add_ranking_weights_table

Revision ID: e5c795423a01
Revises: 76bb90004bed
Create Date: 2026-01-10 18:22:00.000000+00:00

Phase 3B.1 - Adaptive Ranking

This table stores temporary, decaying ranking weights that bias retrieval
without modifying core entities. Completely isolated and disposable.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e5c795423a01"
down_revision = "76bb90004bed"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create ranking_weights table for Phase 3B.1 adaptive ranking."""
    op.create_table(
        "ranking_weights",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        # Entity identification
        sa.Column("entity_id", sa.String(), nullable=False, index=True),
        sa.Column("entity_type", sa.String(50), nullable=False),  # chunk | note | concept
        sa.Column("surface", sa.String(50), nullable=False),  # chat | cmdk | dashboard
        # Weight value
        sa.Column("weight_multiplier", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("reason", sa.String(100), nullable=False),  # evidence_trusted, clicked, etc.
        # Lifecycle
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        # Audit trail - links back to the signal that created this weight
        sa.Column(
            "source_log_id",
            sa.Integer(),
            sa.ForeignKey("intelligence_adaptation_log.id"),
            nullable=True,
        ),
        # Unique constraint: one weight per entity/type/surface/reason combo
        sa.UniqueConstraint(
            "entity_id", "entity_type", "surface", "reason", name="uq_ranking_weight_entity"
        ),
    )

    # Index for efficient lookup during retrieval
    op.create_index(
        "ix_ranking_weights_lookup",
        "ranking_weights",
        ["entity_id", "entity_type", "surface"],
    )

    # Index for cleanup of expired weights
    op.create_index(
        "ix_ranking_weights_expires",
        "ranking_weights",
        ["expires_at"],
    )


def downgrade() -> None:
    """Drop ranking_weights table."""
    op.drop_index("ix_ranking_weights_expires", table_name="ranking_weights")
    op.drop_index("ix_ranking_weights_lookup", table_name="ranking_weights")
    op.drop_table("ranking_weights")
