"""merge_question_embeddings

Revision ID: 39f0f822ec93
Revises: 00370989f385, add_question_embeddings
Create Date: 2026-01-16 08:49:42.720498+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '39f0f822ec93'
down_revision = ('00370989f385', 'add_question_embeddings')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
