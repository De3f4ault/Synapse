"""merge_document_folders

Revision ID: 9be2be9e1b5d
Revises: add_chat_threads_001, document_folders_001
Create Date: 2026-01-22 05:36:35.019241+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9be2be9e1b5d'
down_revision = ('add_chat_threads_001', 'document_folders_001')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
