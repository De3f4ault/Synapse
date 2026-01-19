"""Add question_learning_states table

Revision ID: add_question_learning_states
Revises: 9a6fe7b8092f
Create Date: 2026-01-16 08:10:00.000000

Phase Q1: Quiz Deep Integration - Per-question SM-2 scheduling
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "add_question_learning_states"
down_revision = "9a6fe7b8092f"  # After notifications table
branch_labels = None
depends_on = None


def upgrade():
    """Create question_learning_states table for per-question SM-2 scheduling."""
    op.create_table(
        "question_learning_states",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        # SM-2 Core Fields
        sa.Column(
            "ease_factor", sa.Numeric(precision=3, scale=2), nullable=False, server_default="2.50"
        ),
        sa.Column("interval", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("repetitions", sa.Integer(), nullable=False, server_default="0"),
        # Scheduling
        sa.Column("next_review", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_reviewed_at", sa.DateTime(timezone=True), nullable=True),
        # Learning State
        sa.Column("learning_state", sa.String(20), nullable=False, server_default="new"),
        # Performance Statistics
        sa.Column("times_reviewed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("times_correct", sa.Integer(), nullable=False, server_default="0"),
        # Last quality score
        sa.Column("last_quality", sa.Integer(), nullable=True),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        # Primary Key
        sa.PrimaryKeyConstraint("id"),
        # Foreign Keys
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["quiz_questions.id"], ondelete="CASCADE"),
        # Unique constraint
        sa.UniqueConstraint("user_id", "question_id", name="uq_user_question"),
        schema="developer_schema",
    )

    # Create indexes for efficient queries
    op.create_index(
        "idx_qls_user_due",
        "question_learning_states",
        ["user_id", "next_review"],
        schema="developer_schema",
    )
    op.create_index(
        "idx_qls_question", "question_learning_states", ["question_id"], schema="developer_schema"
    )
    op.create_index(
        "idx_qls_user_id", "question_learning_states", ["user_id"], schema="developer_schema"
    )


def downgrade():
    """Drop question_learning_states table."""
    op.drop_index(
        "idx_qls_user_id", table_name="question_learning_states", schema="developer_schema"
    )
    op.drop_index(
        "idx_qls_question", table_name="question_learning_states", schema="developer_schema"
    )
    op.drop_index(
        "idx_qls_user_due", table_name="question_learning_states", schema="developer_schema"
    )
    op.drop_table("question_learning_states", schema="developer_schema")
