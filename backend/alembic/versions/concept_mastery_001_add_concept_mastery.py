"""add concept_mastery table for learning loop

Revision ID: concept_mastery_001
Revises: journal_favorites_001
Create Date: 2026-04-23

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "concept_mastery_001"
down_revision: Union[str, None] = "journal_favorites_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create concept_mastery table for the agentic learning loop."""

    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "concept_mastery" not in tables:
        op.create_table(
            "concept_mastery",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("concept", sa.Text(), nullable=False),
            sa.Column("subject_area", sa.Text(), nullable=True),
            sa.Column("mastery_score", sa.Float(), nullable=False, server_default="0.0"),
            sa.Column("exposure_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("source", sa.Text(), nullable=False, server_default="'conversation'"),
            sa.Column("last_exposure", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "first_exposure",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("NOW()"),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("NOW()"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("NOW()"),
            ),
            sa.UniqueConstraint("user_id", "concept", name="uq_concept_mastery_user_concept"),
        )

        # Primary lookup: user's mastery, ordered by score
        op.create_index(
            "ix_concept_mastery_user_score",
            "concept_mastery",
            ["user_id", "mastery_score"],
        )

        # For weak-area queries: find low-mastery concepts per user
        op.create_index(
            "ix_concept_mastery_user_subject",
            "concept_mastery",
            ["user_id", "subject_area"],
        )


def downgrade() -> None:
    """Drop concept_mastery table."""
    op.drop_index("ix_concept_mastery_user_subject", table_name="concept_mastery")
    op.drop_index("ix_concept_mastery_user_score", table_name="concept_mastery")
    op.drop_table("concept_mastery")
