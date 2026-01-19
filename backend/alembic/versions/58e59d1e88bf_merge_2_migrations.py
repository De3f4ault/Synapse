"""merge_2_migrations

Revision ID: 58e59d1e88bf
Revises: journal_favorites_001
Create Date: 2026-01-17 20:58:57.989272+00:00

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "58e59d1e88bf"
down_revision = ("journal_favorites_001", "39f0f822ec93")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
