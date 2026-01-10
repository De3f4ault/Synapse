"""Add ocr_performed column to documents

Revision ID: add_ocr_performed
Revises: add_synapse_tasks
Create Date: 2025-12-19

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_ocr_performed"
down_revision: Union[str, None] = "add_synapse_tasks"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add ocr_performed column to documents table."""
    op.add_column(
        "documents",
        sa.Column("ocr_performed", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    """Remove ocr_performed column."""
    op.drop_column("documents", "ocr_performed")
